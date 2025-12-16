import React, { useRef, useState } from 'react';
import { triggerHaptic } from '../../utils';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentTime, duration, onSeek }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const lastHapticRef = useRef<number>(0);

  const percentage = isDragging
    ? localProgress
    : (currentTime / duration) * 100 || 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    triggerHaptic('light'); 
    setIsDragging(true);
    updateProgressFromEvent(e);
    progressBarRef.current?.setPointerCapture(e.pointerId);
    lastHapticRef.current = percentage;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateProgressFromEvent(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      triggerHaptic('light'); 
      setIsDragging(false);
      const newTime = (localProgress / 100) * duration;
      onSeek(newTime);
      progressBarRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  const updateProgressFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const rawPercent = (x / rect.width) * 100;
      const clampedPercent = Math.min(Math.max(rawPercent, 0), 100);
      
      if (Math.abs(clampedPercent - lastHapticRef.current) > 2) {
        triggerHaptic('tick');
        lastHapticRef.current = clampedPercent;
      }

      setLocalProgress(clampedPercent);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-2 group cursor-pointer select-none touch-none"
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
    >
      {/* Track Area */}
      <div 
        ref={progressBarRef}
        className="relative w-full h-4 flex items-center" 
      >
        {/* Background Track */}
        <div className="absolute w-full h-[2px] bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden transition-colors duration-300">
         {/* Active Track */}
         <div 
          className="h-full transition-all duration-100 ease-out" 
          style={{ 
            width: `${percentage}%`,
            backgroundColor: 'var(--theme-color)' 
          }}
          />
          <div 
            className="h-full bg-neutral-800 dark:bg-neutral-100 transition-all duration-100 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Handle (Dot) */}
        <div 
          className={`absolute h-3 w-3 bg-neutral-900 dark:bg-neutral-50 rounded-full shadow-sm transform transition-transform duration-200 ease-out ${isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100'}`}
          style={{ 
            left: `${percentage}%`, 
            transform: `translate(-50%, 0) scale(${isDragging ? 1.5 : 1})`
          }}
        >
          <div className="absolute inset-0 m-auto w-1 h-1 bg-white dark:bg-neutral-900 rounded-full opacity-50" />
        </div>
      </div>

      {/* Time Labels - [修复] 提高对比度 */}
      <div className="flex justify-between text-[10px] font-medium text-neutral-500 dark:text-neutral-400 tracking-wide transition-colors duration-300">
        <span>{formatTime(isDragging ? (localProgress / 100) * duration : currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default ProgressBar;