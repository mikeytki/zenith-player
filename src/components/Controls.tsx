import React, { useState, useEffect, useRef, memo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Repeat, Repeat1, ListMusic, Shuffle, ListOrdered, CloudDownload, Volume2, VolumeX, Volume1 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'framer-motion';
import { RepeatMode } from '../../types';
import { triggerHaptic } from '../../utils';
import { usePlayerStore } from '../store/usePlayerStore';

interface ControlsProps {
  onTogglePlaylist: () => void;
  onImport: () => void;
  onToast: (msg: string) => void;
}

const Controls: React.FC<ControlsProps> = ({ onTogglePlaylist, onImport, onToast }) => {
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

  const [localVolume, setLocalVolume] = useState(volume);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!isDraggingVolume) {
      setLocalVolume(volume);
    }
  }, [volume, isDraggingVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setLocalVolume(newVol); 
    const now = Date.now();
    if (now - lastUpdateRef.current >= 32) {
        setVolume(newVol);
        lastUpdateRef.current = now;
    }
  };

  const handleDragEnd = () => {
      setIsDraggingVolume(false);
      setVolume(localVolume); 
  };

  const handleLikeClick = () => {
      // [修复] 添加参数 'medium'
      triggerHaptic('medium');
      toggleLike();
      onToast(isLiked ? "Removed from Favorites" : "Added to Favorites");
  };

  const handleModeClick = () => {
      // [修复] 添加参数 'medium'
      triggerHaptic('medium');

      if (isShuffle) {
          toggleShuffle(); 
          // 切换到 OFF 状态 (需要两次 toggleRepeat，因为循环是 OFF->ALL->ONE->OFF)
          toggleRepeat();
          toggleRepeat();
          onToast("Play in Order");
      } else {
          // [修复] RepeatMode.Off -> RepeatMode.OFF
          if (repeatMode === RepeatMode.OFF) {
              toggleRepeat();
              onToast("Loop All");
          // [修复] RepeatMode.List -> RepeatMode.ALL
          } else if (repeatMode === RepeatMode.ALL) {
              toggleRepeat();
              onToast("Loop One");
          } else {
              // 当前是 ONE，切换到 Shuffle
              toggleShuffle();
              onToast("Shuffle Play");
          }
      }
  };

  const renderModeIcon = () => {
    if (isShuffle) return <Shuffle strokeWidth={1.5} size={20} />;
    switch (repeatMode) {
        // [修复] RepeatMode.Single -> RepeatMode.ONE
        case RepeatMode.ONE: return <Repeat1 strokeWidth={1.5} size={20} />;
        case RepeatMode.ALL: return <Repeat strokeWidth={1.5} size={20} />;
        default: return <ListOrdered strokeWidth={1.5} size={20} />;
    }
  };

  const getModeColor = () => {
      // [修复] RepeatMode.Off -> RepeatMode.OFF
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
    // [响应式修复] 间距：手机 gap-4，电脑 gap-8
    <div className="flex flex-col items-center w-full gap-4 md:gap-8">
      
      {/* 播放控制区 */}
      {/* [响应式修复] 宽度：手机 w-48，电脑 w-56 */}
      <div className="flex items-center justify-between w-48 md:w-56 px-2">
        <button 
          onClick={wrapClick(() => prevSong(0))}
          aria-label="Previous track"
          className="text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-200 active:scale-90"
        >
          {/* [响应式修复] 图标：手机 24px (w-6 h-6)，电脑 32px (md:w-8 md:h-8) */}
          <SkipBack strokeWidth={1.5} className="w-6 h-6 md:w-8 md:h-8" />
        </button>

        <button
          onClick={wrapClick(togglePlay, 'medium')}
          aria-label={isPlaying ? "Pause" : "Play"}
          // [响应式修复] 按钮：手机 w-14 h-14，电脑 w-20 h-20
          className={`relative z-10 group flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full shadow-xl md:shadow-2xl shadow-neutral-300 dark:shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-300 ${isDarkMode ? 'text-neutral-900' : 'text-white'}`}
          style={{ backgroundColor: 'var(--theme-color)' }}
        >
          {isPlaying ? (
            // [响应式修复] 图标
            <Pause strokeWidth={1.5} className="w-6 h-6 md:w-8 md:h-8 fill-current" />
          ) : (
            <Play strokeWidth={1.5} className="ml-1 w-6 h-6 md:w-8 md:h-8 fill-current" />
          )}
        </button>

        <button 
          onClick={wrapClick(nextSong)}
          aria-label="Next track"
          className="text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-200 active:scale-90"
        >
          <SkipForward strokeWidth={1.5} className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      </div>

      {/* 次级操作区 */}
      <div className="flex items-center justify-between w-full max-w-[340px] px-2 md:mt-2">
        <button 
          onClick={handleLikeClick}
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
          onClick={handleModeClick}
          aria-label="Change Play Mode"
          className={`transition-colors duration-200 active:scale-90 ${getModeColor()}`}
        >
          {renderModeIcon()}
        </button>

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
                  onToast(newVol === 0 ? "Muted" : "Unmuted");
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
                        onMouseUp={handleDragEnd}
                        onTouchStart={() => setIsDraggingVolume(true)}
                        onTouchEnd={handleDragEnd}
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

export default memo(Controls);