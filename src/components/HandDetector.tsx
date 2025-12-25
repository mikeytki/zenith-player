import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import { usePlayerStore, GestureType } from '../store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';

// 平滑系数
const LERP_FACTOR = 0.15;
// 动作冷却时间 (毫秒)，防止误触连点
const ACTION_COOLDOWN = 1000;
// 捏合检测阈值
const PINCH_THRESHOLD = 0.07;
// 手势确认帧数 - 需要连续检测到相同手势才触发
const GESTURE_CONFIRM_FRAMES = 5; // 降低到5帧，更快响应 

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

  // 2. [新增] 获取播放控制动作 (用于执行逻辑)
  const {
    currentGesture, // 监听当前手势
    play,
    pause,
    nextSong
  } = usePlayerStore(useShallow(state => ({
    currentGesture: state.currentGesture,
    play: state.play,
    pause: state.pause,
    nextSong: state.nextSong
  })));

  // Refs
  const lastCursorRef = useRef({ x: 0, y: 0 });
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastActionTimeRef = useRef<number>(0); // 动作冷却计时器

  // 手势确认机制
  const gestureHistoryRef = useRef<GestureType[]>([]);
  const confirmedGestureRef = useRef<GestureType>('NONE');

  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // === 核心逻辑：监听手势变化并执行命令 ===
  useEffect(() => {
    if (inputMode !== 'HAND') return;

    const now = Date.now();
    // 检查冷却时间
    if (now - lastActionTimeRef.current < ACTION_COOLDOWN) return;

    // 只响应已确认的手势
    const gesture = confirmedGestureRef.current;

    if (gesture === 'PINCH') {
        console.log("👌 Gesture Trigger: NEXT SONG");
        nextSong();
        lastActionTimeRef.current = now;
        confirmedGestureRef.current = 'NONE';
        gestureHistoryRef.current = []; // 清空历史
    }
    else if (gesture === 'OPEN') {
        // 张开手掌 = 播放（无论当前状态）
        console.log("🖐️ Gesture Trigger: PLAY");
        play();
        lastActionTimeRef.current = now;
        confirmedGestureRef.current = 'NONE';
        gestureHistoryRef.current = [];
    }
    else if (gesture === 'FIST') {
        // 握拳 = 暂停（无论当前状态）
        console.log("✊ Gesture Trigger: PAUSE");
        pause();
        lastActionTimeRef.current = now;
        confirmedGestureRef.current = 'NONE';
        gestureHistoryRef.current = [];
    }
  }, [currentGesture, inputMode, nextSong, play, pause]);

  // === 以下为 MediaPipe 初始化与循环逻辑 (保持不变) ===

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

        if (results.gestures.length > 0) {
          const mediapipeGesture = results.gestures[0][0].categoryName;
          const confidence = results.gestures[0][0].score;
          const landmarks = results.landmarks[0];

          // 获取手指位置（用于光标）
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];

          let myGesture: GestureType = 'NONE';

          // 只接受高置信度的手势 (>0.6)
          if (confidence > 0.6) {
            const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

            if (distance < PINCH_THRESHOLD) {
              myGesture = 'PINCH';
            } else {
              // 如果不是捏合，再检测其他手势
              if (mediapipeGesture === 'Open_Palm') myGesture = 'OPEN';
              else if (mediapipeGesture === 'Closed_Fist') myGesture = 'FIST';
              else if (mediapipeGesture === 'Victory') myGesture = 'POINT';
            }
          }

          // 手势确认机制：需要连续多帧检测到相同手势
          gestureHistoryRef.current.push(myGesture);
          if (gestureHistoryRef.current.length > GESTURE_CONFIRM_FRAMES) {
            gestureHistoryRef.current.shift();
          }

          // 检查最近的帧是否都是同一个手势
          if (gestureHistoryRef.current.length === GESTURE_CONFIRM_FRAMES) {
            const allSame = gestureHistoryRef.current.every(g => g === myGesture);
            if (allSame && myGesture !== 'NONE' && myGesture !== 'POINT') {
              // 只有当确认手势与当前不同时才更新
              if (confirmedGestureRef.current !== myGesture) {
                confirmedGestureRef.current = myGesture;
                setGesture(myGesture);
              }
            } else if (myGesture === 'NONE' || myGesture === 'POINT') {
              // NONE 和 POINT 立即更新（用于光标控制）
              setGesture(myGesture);
            }
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