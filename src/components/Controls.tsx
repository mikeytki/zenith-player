import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Repeat, Repeat1, ListMusic, Shuffle, ListOrdered, CloudDownload, Volume2, VolumeX, Volume1 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'framer-motion';
import { RepeatMode } from '../../types';
import { triggerHaptic } from '../../utils';
import { usePlayerStore } from '../store/usePlayerStore';

interface ControlsProps {
  onTogglePlaylist: () => void;
  onImport: () => void;
}

const Controls: React.FC<ControlsProps> = ({ onTogglePlaylist, onImport }) => {
  const { 
    isPlaying, togglePlay, nextSong, prevSong, 
    isLiked, toggleLike, 
    repeatMode, isShuffle, toggleShuffle, toggleRepeat,
    isDarkMode
  } = usePlayerStore(useShallow(state => ({
      isPlaying: state.isPlaying,
      togglePlay: state.togglePlay,
      nextSong: state.nextSong,
      prevSong: state.prevSong,
      isLiked: state.isLiked,
      toggleLike: state.toggleLike,
      repeatMode: state.repeatMode,
      isShuffle: state.isShuffle,
      toggleShuffle: state.toggleShuffle,
      toggleRepeat: state.toggleRepeat,
      isDarkMode: state.isDarkMode
  })));

  const volume = usePlayerStore(state => state.volume);
  const setVolume = usePlayerStore(state => state.setVolume);

  // 本地 UI 状态
  const [localVolume, setLocalVolume] = useState(volume);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  
  // [关键优化 1] 节流计时器引用
  const lastUpdateRef = useRef(0);

  // 当不是在拖动时，同步全局 Store 的音量
  useEffect(() => {
    if (!isDraggingVolume) {
      setLocalVolume(volume);
    }
  }, [volume, isDraggingVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    
    // 1. UI 必须瞬时响应，绝不能卡顿
    setLocalVolume(newVol); 

    // 2. [关键优化 2] 节流全局状态更新
    // 只有距离上次更新超过 32ms (约30fps) 才写入 Store/LocalStorage
    // 这样既保证了听觉反馈的连续性，又避免了 LocalStorage IO 阻塞 UI 线程
    const now = Date.now();
    if (now - lastUpdateRef.current >= 32) {
        setVolume(newVol);
        lastUpdateRef.current = now;
    }
  };

  // [关键优化 3] 拖拽结束时强制同步最终值
  const handleDragEnd = () => {
      setIsDraggingVolume(false);
      setVolume(localVolume); // 确保最后手指松开时的值被保存
  };

  const renderModeIcon = () => {
    if (isShuffle) return <Shuffle strokeWidth={1.5} size={20} />;
    switch (repeatMode) {
        case RepeatMode.ONE: return <Repeat1 strokeWidth={1.5} size={20} />;
        case RepeatMode.ALL: return <Repeat strokeWidth={1.5} size={20} />;
        default: return <ListOrdered strokeWidth={1.5} size={20} />;
    }
  };

  const getModeColor = () => {
      if (!isShuffle && repeatMode === RepeatMode.OFF) {
          return 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200';
      }
      return 'text-neutral-900 dark:text-white';
  };

  const secondaryBtnClass = "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors duration-200 active:scale-90";

  const renderVolumeIcon = () => {
    if (localVolume === 0) return <VolumeX strokeWidth={1.5} size={20} />;
    if (localVolume < 0.5) return <Volume1 strokeWidth={1.5} size={20} />;
    return <Volume2 strokeWidth={1.5} size={20} />;
  };

  const wrapClick = (fn: () => void, style: 'light' | 'medium' = 'light') => () => {
      triggerHaptic(style);
      fn();
  };

  return (
    <div className="flex flex-col items-center w-full gap-8">
      
      {/* Main Playback Controls */}
      <div className="flex items-center justify-between w-56 px-2">
        <button 
          onClick={wrapClick(() => prevSong(0))}
          aria-label="Previous track"
          className="text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-200 active:scale-90"
        >
          <SkipBack strokeWidth={1.5} size={32} />
        </button>

        <div className="relative flex items-center justify-center">
            {/* 呼吸光晕层 */}
            {isPlaying && (
                <motion.div
                    className="absolute inset-0 rounded-full blur-xl opacity-50"
                    style={{ backgroundColor: 'var(--theme-color)' }}
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                    }}
                />
            )}

            <button 
              onClick={wrapClick(togglePlay, 'medium')}
              aria-label={isPlaying ? "Pause" : "Play"}
              className={`relative z-10 group flex items-center justify-center w-20 h-20 rounded-full shadow-2xl shadow-neutral-300 dark:shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-300 ${isDarkMode ? 'text-neutral-900' : 'text-white'}`}
              style={{ backgroundColor: 'var(--theme-color)' }}
            >
              {isPlaying ? (
                <Pause strokeWidth={1.5} size={32} className="fill-current" />
              ) : (
                <Play strokeWidth={1.5} size={32} className="ml-1 fill-current" />
              )}
            </button>
        </div>

        <button 
          onClick={wrapClick(nextSong)}
          aria-label="Next track"
          className="text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-200 active:scale-90"
        >
          <SkipForward strokeWidth={1.5} size={32} />
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center justify-between w-full max-w-[340px] px-2 mt-2">
        <button 
          onClick={wrapClick(toggleLike)}
          aria-label={isLiked ? "Unlike" : "Like"}
          className={`transition-all duration-300 active:scale-90 ${isLiked ? 'text-red-500' : secondaryBtnClass}`}
        >
          <Heart strokeWidth={1.5} size={20} className={isLiked ? "fill-current" : ""} style={{ color: isLiked ? 'var(--theme-color)' : undefined }} />
        </button>

        <button 
            onClick={wrapClick(onImport)}
            aria-label="Import Playlist"
            className={secondaryBtnClass}
            title="Import"
        >
          <CloudDownload strokeWidth={1.5} size={20} />
        </button>

        <button 
          onClick={wrapClick(isShuffle ? toggleShuffle : toggleRepeat)}
          aria-label="Change Play Mode"
          className={`transition-colors duration-200 active:scale-90 ${getModeColor()}`}
        >
          {renderModeIcon()}
        </button>

        {/* Volume Control */}
        <div 
            className="relative flex items-center justify-center py-2"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
        >
            <button 
                onClick={() => {
                  const newVol = volume === 0 ? 0.7 : 0;
                  setLocalVolume(newVol);
                  setVolume(newVol);
                }}
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                className={secondaryBtnClass}
            >
                {renderVolumeIcon()}
            </button>
            
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col justify-end pb-4 transition-all duration-300 origin-bottom ${showVolume ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'}`}>
                <div className="w-8 h-24 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-full shadow-xl flex items-center justify-center overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                    <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={localVolume} 
                        onChange={handleVolumeChange}
                        onMouseDown={() => setIsDraggingVolume(true)}
                        onMouseUp={handleDragEnd}   // 修改：使用新的处理函数
                        onTouchStart={() => setIsDraggingVolume(true)}
                        onTouchEnd={handleDragEnd}  // 修改：使用新的处理函数
                        aria-label="Volume Control"
                        className="w-20 h-full opacity-0 cursor-pointer absolute inset-0 z-20 -rotate-90" 
                    />
                    <div className="relative w-1.5 h-16 bg-neutral-200 dark:bg-neutral-600 rounded-full overflow-hidden pointer-events-none">
                        <div className="absolute bottom-0 left-0 w-full rounded-full" style={{ height: `${localVolume * 100}%`, backgroundColor: 'var(--theme-color)' }} />
                    </div>
                </div>
            </div>
        </div>

        <button 
          onClick={wrapClick(onTogglePlaylist)}
          aria-label="Toggle Playlist"
          className={secondaryBtnClass}
        >
          <ListMusic strokeWidth={1.5} size={20} />
        </button>
      </div>
    </div>
  );
};

export default Controls;