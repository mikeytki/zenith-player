import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { usePlayerStore, GestureType } from '../store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';

// 平滑系数
const LERP_FACTOR = 0.15;
// 动作冷却时间 (毫秒)，防止误触连点
const ACTION_COOLDOWN = 800;
// 手势确认帧数 - 需要连续检测到相同手势才触发
const GESTURE_CONFIRM_FRAMES = 3;
// 置信度阈值
const CONFIDENCE_THRESHOLD = 0.5;

// 滑动检测参数
const SWIPE_THRESHOLD = 0.15; // 滑动距离阈值（归一化坐标）
const SWIPE_TIME_WINDOW = 500; // 滑动时间窗口（毫秒）

interface PositionRecord {
  x: number;
  y: number;
  timestamp: number;
}

const HandDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 1. 获取输入模式和 Setter (用于识别逻辑)
  const { 
    inputMode, 
    setGesture, 
    setCursorPosition, 
    setCameraStatus, 
    setInputMode 
  } = usePlayerStore(useShallow(state => ({
    inputMode: state.inputMode,
    setGesture: state.setGesture,
    setCursorPosition: state.setCursorPosition,
    setCameraStatus: state.setCameraStatus,
    setInputMode: state.setInputMode,
  })));

  // 2. 获取播放控制动作 (用于执行逻辑)
  const {
    play,
    pause,
    nextSong,
    prevSong,
    increaseVolume,
    decreaseVolume
  } = usePlayerStore(useShallow(state => ({
    play: state.play,
    pause: state.pause,
    nextSong: state.nextSong,
    prevSong: state.prevSong,
    increaseVolume: state.increaseVolume,
    decreaseVolume: state.decreaseVolume
  })));

  // Refs
  const lastCursorRef = useRef({ x: 0, y: 0 });
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastActionTimeRef = useRef<number>(0);

  // 手势确认机制
  const gestureHistoryRef = useRef<GestureType[]>([]);
  const confirmedGestureRef = useRef<GestureType>('NONE');

  // 滑动检测：位置历史记录
  const positionHistoryRef = useRef<PositionRecord[]>([]);
  const lastSwipeTimeRef = useRef<number>(0);

  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // 检测滑动手势
  const detectSwipe = (currentX: number, currentY: number): GestureType => {
    const now = Date.now();
    
    // 添加当前位置到历史
    positionHistoryRef.current.push({ x: currentX, y: currentY, timestamp: now });
    
    // 移除时间窗口之外的记录（保持 500ms 内的轨迹）
    while (
      positionHistoryRef.current.length > 0 &&
      now - positionHistoryRef.current[0].timestamp > SWIPE_TIME_WINDOW
    ) {
      positionHistoryRef.current.shift();
    }
    
    // 需要足够的历史记录才能检测滑动
    if (positionHistoryRef.current.length < 3) {
      return 'NONE';
    }
    
    // 检查冷却时间
    if (now - lastSwipeTimeRef.current < ACTION_COOLDOWN) {
      return 'NONE';
    }
    
    // 获取最早一帧作为比较基准
    const startRecord = positionHistoryRef.current[0];

    if (!startRecord) {
      return 'NONE';
    }
    
    const deltaX = currentX - startRecord.x;
    const deltaY = currentY - startRecord.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // 判断是水平滑动还是垂直滑动
    if (absDeltaX > SWIPE_THRESHOLD && absDeltaX > absDeltaY * 1.5) {
      // 水平滑动（注意：摄像头是镜像的，所以方向相反）
      lastSwipeTimeRef.current = now;
      positionHistoryRef.current = []; // 清空历史，防止连续触发
      return deltaX > 0 ? 'SWIPE_LEFT' : 'SWIPE_RIGHT'; // 镜像反转
    } else if (absDeltaY > SWIPE_THRESHOLD && absDeltaY > absDeltaX * 1.5) {
      // 垂直滑动
      lastSwipeTimeRef.current = now;
      positionHistoryRef.current = [];
      return deltaY > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP';
    }
    
    return 'NONE';
  };

  // === 核心逻辑：执行手势命令 ===
  const executeGestureAction = (gesture: GestureType) => {
    if (inputMode !== 'HAND') return;

    const now = Date.now();
    // 检查冷却时间
    if (now - lastActionTimeRef.current < ACTION_COOLDOWN) return;

    if (gesture === 'OPEN') {
      console.log("🖐️ Gesture Trigger: PLAY");
      play();
      lastActionTimeRef.current = now;
    }
    else if (gesture === 'FIST') {
      console.log("✊ Gesture Trigger: PAUSE");
      pause();
      lastActionTimeRef.current = now;
    }
    else if (gesture === 'SWIPE_LEFT') {
      console.log("👈 Gesture Trigger: PREV SONG");
      prevSong(0);
      lastActionTimeRef.current = now;
    }
    else if (gesture === 'SWIPE_RIGHT') {
      console.log("👉 Gesture Trigger: NEXT SONG");
      nextSong();
      lastActionTimeRef.current = now;
    }
    else if (gesture === 'SWIPE_UP') {
      console.log("👆 Gesture Trigger: VOLUME UP");
      increaseVolume(0.15);
      lastActionTimeRef.current = now;
    }
    else if (gesture === 'SWIPE_DOWN') {
      console.log("👇 Gesture Trigger: VOLUME DOWN");
      decreaseVolume(0.15);
      lastActionTimeRef.current = now;
    }
  };

  // === MediaPipe 初始化 ===
  useEffect(() => {
    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        recognizerRef.current = recognizer;
        setIsModelLoaded(true);
        console.log("✅ MediaPipe Model Loaded");
      } catch (error) {
        console.error("MediaPipe load error:", error);
      }
    };
    initModel();
  }, []);

  useEffect(() => {
    if (!isModelLoaded || inputMode !== 'HAND') {
        if (inputMode !== 'HAND' && videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        return;
    }

    const enableCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setCameraStatus(true);
            predictWebcam();
          };
        }
      } catch (err) {
        console.error("Camera denied:", err);
        setCameraStatus(false);
        setInputMode('MOUSE');
      }
    };

    enableCam();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isModelLoaded, inputMode, setCameraStatus, setInputMode]);

  const predictWebcam = () => {
    if (!videoRef.current || !recognizerRef.current || inputMode !== 'HAND') return;

    const nowInMs = Date.now();
    if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        const results = recognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const mediapipeGesture = results.gestures.length > 0 ? results.gestures[0][0].categoryName : '';
          const confidence = results.gestures.length > 0 ? results.gestures[0][0].score : 0;

          // 获取手掌中心位置（用于滑动检测）
          // 使用手腕(0)和中指根部(9)的中点作为手掌中心
          const wrist = landmarks[0];
          const middleBase = landmarks[9];
          const palmCenterX = (wrist.x + middleBase.x) / 2;
          const palmCenterY = (wrist.y + middleBase.y) / 2;

          // 获取食指位置（用于光标）
          const indexTip = landmarks[8];

          let myGesture: GestureType = 'NONE';

          // 首先检测滑动手势（优先级最高）
          const swipeGesture = detectSwipe(palmCenterX, palmCenterY);
          if (swipeGesture !== 'NONE') {
            myGesture = swipeGesture;
            // 滑动手势立即执行
            setGesture(myGesture);
            executeGestureAction(myGesture);
            // 重置静态手势历史
            gestureHistoryRef.current = [];
            confirmedGestureRef.current = 'NONE';
          } else if (confidence > CONFIDENCE_THRESHOLD) {
            // 只有高置信度时才检测静态手势
            if (mediapipeGesture === 'Open_Palm') {
              myGesture = 'OPEN';
            } else if (mediapipeGesture === 'Closed_Fist') {
              myGesture = 'FIST';
            } else if (mediapipeGesture === 'Victory' || mediapipeGesture === 'Pointing_Up') {
              myGesture = 'POINT';
            }

            // 静态手势确认机制：需要连续多帧检测到相同手势
            if (myGesture !== 'NONE' && myGesture !== 'POINT') {
              gestureHistoryRef.current.push(myGesture);
              if (gestureHistoryRef.current.length > GESTURE_CONFIRM_FRAMES) {
                gestureHistoryRef.current.shift();
              }

              // 检查最近的帧是否都是同一个手势
              if (gestureHistoryRef.current.length === GESTURE_CONFIRM_FRAMES) {
                const allSame = gestureHistoryRef.current.every(g => g === myGesture);
                if (allSame && confirmedGestureRef.current !== myGesture) {
                  confirmedGestureRef.current = myGesture;
                  setGesture(myGesture);
                  // 直接执行动作
                  executeGestureAction(myGesture);
                  // 执行后重置，防止重复触发
                  gestureHistoryRef.current = [];
                  confirmedGestureRef.current = 'NONE';
                }
              }
            } else if (myGesture === 'POINT') {
              // POINT 立即更新（用于光标控制）
              setGesture(myGesture);
            } else {
              // NONE 时不立即清空历史，保持一定容错
              // 只更新显示状态
              setGesture('NONE');
            }
          } else {
            // 低置信度时不清空历史，保持容错性
            // 这样即使中间有几帧置信度低，也不会打断手势确认
          }

          // 更新光标位置
          const rawX = indexTip.x;
          const rawY = indexTip.y;
          const mirroredX = 1 - rawX;
          const targetX = (mirroredX * 2) - 1;
          const targetY = -(rawY * 2) + 1;

          const smoothX = lastCursorRef.current.x + (targetX - lastCursorRef.current.x) * LERP_FACTOR;
          const smoothY = lastCursorRef.current.y + (targetY - lastCursorRef.current.y) * LERP_FACTOR;

          lastCursorRef.current = { x: smoothX, y: smoothY };
          setCursorPosition(smoothX, smoothY);
        } else {
          setGesture('NONE');
          gestureHistoryRef.current = [];
          confirmedGestureRef.current = 'NONE';
          // 不清空位置历史，保持滑动检测的连续性
        }
    }

    // 只在 HAND 模式下继续循环
    if (inputMode === 'HAND') {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted
      className="hidden fixed top-0 left-0 w-32 h-32 opacity-0 pointer-events-none" 
    />
  );
};

export default HandDetector;
