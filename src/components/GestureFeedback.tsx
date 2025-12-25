import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Play, Pause, SkipForward } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';

const GestureFeedback: React.FC = () => {
  const { inputMode, currentGesture, cursorPosition } = usePlayerStore(
    useShallow(state => ({
      inputMode: state.inputMode,
      currentGesture: state.currentGesture,
      cursorPosition: state.cursorPosition
    }))
  );

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackIcon, setFeedbackIcon] = useState<React.ReactNode>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [lastGesture, setLastGesture] = useState<string>('NONE');
  const [gestureStartTime, setGestureStartTime] = useState<number>(0);
  const [confirmProgress, setConfirmProgress] = useState(0);

  // 手势确认时间（毫秒）
  const CONFIRM_DURATION = 170; // 5帧 * 33.3ms ≈ 170ms

  useEffect(() => {
    if (inputMode !== 'HAND') {
      setShowFeedback(false);
      setConfirmProgress(0);
      return;
    }

    // 检测手势变化
    if (currentGesture !== lastGesture) {
      setLastGesture(currentGesture);
      setGestureStartTime(Date.now());
      setConfirmProgress(0);
    }

    if (currentGesture === 'NONE' || currentGesture === 'POINT') {
      setShowFeedback(false);
      setConfirmProgress(0);
      return;
    }

    // 根据手势显示不同的反馈
    let icon: React.ReactNode = null;
    let text = '';

    switch (currentGesture) {
      case 'OPEN':
        icon = <Play size={48} className="fill-current" />;
        text = 'Play';
        break;
      case 'FIST':
        icon = <Pause size={48} className="fill-current" />;
        text = 'Pause';
        break;
      case 'PINCH':
        icon = <SkipForward size={48} />;
        text = 'Next Song';
        break;
    }

    setFeedbackIcon(icon);
    setFeedbackText(text);
    setShowFeedback(true);

    // 更新确认进度
    const updateProgress = () => {
      const elapsed = Date.now() - gestureStartTime;
      const progress = Math.min(elapsed / CONFIRM_DURATION, 1);
      setConfirmProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }, [currentGesture, inputMode, lastGesture, gestureStartTime]);

  // 将归一化坐标 (-1 到 1) 转换为屏幕坐标 (0 到 100%)
  const cursorX = ((cursorPosition.x + 1) / 2) * 100;
  const cursorY = ((cursorPosition.y + 1) / 2) * 100;

  if (inputMode !== 'HAND') return null;

  return (
    <>
      {/* 虚拟光标 */}
      <motion.div
        className="fixed pointer-events-none z-[100]"
        style={{
          left: `${cursorX}%`,
          top: `${cursorY}%`,
          transform: 'translate(-50%, -50%)'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* 外圈光晕 */}
        <div className="absolute inset-0 w-12 h-12 -translate-x-1/2 -translate-y-1/2">
          <div className="w-full h-full rounded-full bg-indigo-500/30 blur-xl animate-pulse" />
        </div>

        {/* 内圈光标 */}
        <div className="relative w-6 h-6 -translate-x-1/2 -translate-y-1/2">
          <div className="w-full h-full rounded-full bg-indigo-500 border-2 border-white shadow-lg" />
          {/* 中心点 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>
      </motion.div>

      {/* 手势反馈提示 - 带确认进度条 */}
      <AnimatePresence>
        {showFeedback && feedbackIcon && (
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[99] pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="relative flex flex-col items-center gap-4 p-8 bg-black/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
              {/* 确认进度环 */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="48%"
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.3)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="48%"
                    fill="none"
                    stroke="rgb(99, 102, 241)"
                    strokeWidth="3"
                    strokeDasharray={`${confirmProgress * 100} 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.05s linear' }}
                  />
                </svg>
              </div>

              <div className="text-indigo-400 relative z-10">
                {feedbackIcon}
              </div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <p className="text-white text-xl font-bold tracking-wide">
                  {feedbackText}
                </p>
                <p className="text-white/60 text-sm">
                  Hold to confirm
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 手势指南 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        <div className="flex items-center gap-6 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Play size={16} className="fill-current" />
            </div>
            <span>Open Palm</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Pause size={16} className="fill-current" />
            </div>
            <span>Fist</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <SkipForward size={16} />
            </div>
            <span>Pinch</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GestureFeedback;
