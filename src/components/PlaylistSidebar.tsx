import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ListMusic, BarChart2, PenLine, Trash2, CheckSquare, Square, Library, Cloud, CloudDownload, LocateFixed, GripVertical, History, ChevronLeft } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence, Variants, useMotionValue, animate } from 'framer-motion';
import { triggerHaptic } from '../../utils';
import ConfirmModal from './ConfirmModal';
import { usePlayerStore, PlayHistoryItem } from '../store/usePlayerStore';
import { Song, PlaylistData } from '../../types';

interface PlaylistSidebarProps {
  onImport: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isFocusMode?: boolean;
}

// 统一的样式配置
const getStyles = (isFocusMode: boolean) => ({
  container: 'bg-white/60 dark:bg-black/50 border-white/30 dark:border-white/10',
  header: 'border-white/20 dark:border-white/10',
  text: 'text-neutral-800 dark:text-white',
  textMuted: 'text-neutral-500 dark:text-neutral-400',
  button: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10',
  activeTab: 'bg-[var(--theme-color)] text-white border-transparent shadow-md',
  inactiveTab: 'bg-white/50 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 border-white/30 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/20',
});

const SongRow = React.memo(({
    song, index, isActive, isEditing, isSelected, onClick, onToggleSelect, onDelete
}: {
    song: Song, index: number, isActive: boolean, isEditing: boolean, isSelected: boolean,
    onClick: () => void, onToggleSelect: (id: string) => void, onDelete: (e: React.MouseEvent, id: string) => void
}) => {
    return (
        <div
            id={isActive ? 'active-song-sidebar' : undefined}
            onClick={() => isEditing ? onToggleSelect(song.id) : onClick()}
            className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors duration-200 select-none relative overflow-hidden ${
                isEditing
                    ? isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                    : isActive ? 'bg-neutral-100 dark:bg-neutral-800 shadow-sm' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
        >
            <div className="flex items-center gap-3 min-w-0 z-10 w-full">
                {isEditing && (
                    <>
                        <div className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors">
                            <GripVertical size={16} />
                        </div>
                        <div className={`transition-all ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-300'}`}>
                            {isSelected ? <CheckSquare size={18} strokeWidth={1.5} /> : <Square size={18} strokeWidth={1.5} />}
                        </div>
                    </>
                )}

                <div className={`relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all ${isActive && !isEditing ? 'shadow-md ring-2 ring-white dark:ring-neutral-700' : ''}`}>
                    <img loading="lazy" src={song.coverUrl} className="w-full h-full object-cover" alt={song.title} />
                    {isActive && !isEditing && (
                        <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center">
                            <BarChart2 size={14} className="text-white fill-current animate-pulse" strokeWidth={0} />
                        </div>
                    )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-xs font-semibold truncate leading-tight mb-0.5 ${isActive && !isEditing ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {song.title}
                    </span>
                    <span className="text-[10px] font-medium text-neutral-400 truncate uppercase tracking-wider">
                        {song.artist}
                    </span>
                </div>

                {isEditing && (
                    <button
                        aria-label="Delete song"
                        title="Delete song"
                        onClick={(e) => onDelete(e, song.id)}
                        className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                )}
            </div>
        </div>
    );
});

// Tab 项类型
interface TabItem {
  id: string;
  name: string;
  isDefault: boolean;
  isHistory: boolean;
  songCount: number;
}

const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({ onImport, isCollapsed, onToggleCollapse, isFocusMode = false }) => {
  const {
    playlists, activePlaylistId, currentSongIndex,
    switchPlaylist, removePlaylist, selectSong, deleteSongs,
    playHistory, clearPlayHistory, playFromHistory, removeFromPlayHistory
  } = usePlayerStore(useShallow(state => ({
      playlists: state.playlists,
      activePlaylistId: state.activePlaylistId,
      currentSongIndex: state.currentSongIndex,
      switchPlaylist: state.switchPlaylist,
      removePlaylist: state.removePlaylist,
      selectSong: state.selectSong,
      deleteSongs: state.deleteSongs,
      playHistory: state.playHistory,
      clearPlayHistory: state.clearPlayHistory,
      playFromHistory: state.playFromHistory,
      removeFromPlayHistory: state.removeFromPlayHistory
  })));

  const HISTORY_TAB_ID = '__play_history__';

  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playlistToDelete, setPlaylistToDelete] = useState<{id: string, name: string} | null>(null);
  const [activeTab, setActiveTab] = useState<string>(activePlaylistId);
  
  // 滚动位置（以 Tab 索引为单位，支持小数实现平滑滚动）
  const [scrollIndex, setScrollIndex] = useState(0);
  
  // 拖拽相关
  const dragX = useMotionValue(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const TAB_WIDTH = 90; // 每个 Tab 的大致宽度

  const isHistoryTab = activeTab === HISTORY_TAB_ID;

  // 构建所有 Tab 项（包括 History）
  const allTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = playlists.map(p => ({
      id: p.id,
      name: p.name,
      isDefault: p.id === 'default',
      isHistory: false,
      songCount: p.songs.length
    }));
    tabs.push({
      id: HISTORY_TAB_ID,
      name: 'History',
      isDefault: false,
      isHistory: true,
      songCount: playHistory.length
    });
    return tabs;
  }, [playlists, playHistory.length]);

  // 找到当前激活 Tab 的索引
  const activeTabIndex = useMemo(() => {
    return allTabs.findIndex(t => t.id === activeTab);
  }, [allTabs, activeTab]);

  // 计算可见的 Tabs（基于 scrollIndex）
  const visibleTabs = useMemo(() => {
    if (allTabs.length === 0) return [];
    
    const total = allTabs.length;
    const result: (TabItem & { position: number; actualIndex: number })[] = [];
    
    // 显示的 Tab 数量
    const visibleCount = Math.min(5, total);
    const halfVisible = Math.floor(visibleCount / 2);
    
    // 中心位置基于 scrollIndex
    const centerIndex = Math.round(scrollIndex);
    
    for (let i = -halfVisible; i <= halfVisible; i++) {
      // 环形索引
      const actualIndex = ((centerIndex + i) % total + total) % total;
      result.push({
        ...allTabs[actualIndex],
        position: i, // 相对于中心的位置
        actualIndex
      });
    }
    
    return result;
  }, [allTabs, scrollIndex]);

  const currentSongs = isHistoryTab
    ? playHistory.map(item => item.song)
    : playlists.find(p => p.id === activePlaylistId)?.songs || [];

  const listContainerRef = useRef<HTMLDivElement>(null);
  const prevIsCollapsed = useRef(isCollapsed);

  // 滚动到当前播放歌曲
  const scrollToCurrentSong = useCallback(() => {
    requestAnimationFrame(() => {
        setTimeout(() => {
            const container = listContainerRef.current;
            const activeElement = container?.querySelector('#active-song-sidebar') as HTMLElement;
            if (activeElement && container) {
                const targetScrollTop = activeElement.offsetTop - (container.clientHeight / 2) + (activeElement.clientHeight / 2);
                container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
        }, 150);
    });
  }, []);

  // 将指定 Tab 滚动到 C 位
  const scrollTabToCenter = useCallback((tabId: string) => {
    const index = allTabs.findIndex(t => t.id === tabId);
    if (index !== -1) {
      setScrollIndex(index);
    }
  }, [allTabs]);

  // 同步 activePlaylistId 到 activeTab，并将其滚动到 C 位
  useEffect(() => {
    setActiveTab(activePlaylistId);
    scrollTabToCenter(activePlaylistId);
  }, [activePlaylistId, scrollTabToCenter]);

  // 侧边栏从折叠变为展开时，自动定位
  useEffect(() => {
    if (prevIsCollapsed.current && !isCollapsed) {
      // 从折叠变为展开：将当前歌单滚动到 C 位
      scrollTabToCenter(activePlaylistId);
      scrollToCurrentSong();
    }
    prevIsCollapsed.current = isCollapsed;
  }, [isCollapsed, scrollToCurrentSong, scrollTabToCenter, activePlaylistId]);

  // Tab 切换时滚动到当前歌曲
  useEffect(() => {
    if (!isHistoryTab && !isCollapsed) {
        scrollToCurrentSong();
    }
  }, [activeTab, scrollToCurrentSong, isHistoryTab, isCollapsed]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        return newSet;
    });
    triggerHaptic('tick');
  }, []);

  const handleRowClick = useCallback((index: number, song?: Song) => {
      triggerHaptic('light');
      if (isHistoryTab && song) {
          playFromHistory(song);
      } else {
          selectSong(index);
      }
  }, [selectSong, playFromHistory, isHistoryTab]);

  const handleSingleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic('medium');
    if (isHistoryTab) {
      removeFromPlayHistory([id]);
    } else {
      deleteSongs([id]);
    }
  }, [deleteSongs, removeFromPlayHistory, isHistoryTab]);

  const selectAll = () => {
    if (selectedIds.size === currentSongs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentSongs.map(s => s.id)));
    triggerHaptic('light');
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    triggerHaptic('medium');
    if (isHistoryTab) {
      removeFromPlayHistory(Array.from(selectedIds));
    } else {
      deleteSongs(Array.from(selectedIds));
    }
    setSelectedIds(new Set());
  };

  // 点击 Tab：切换歌单并将其滚动到 C 位
  const handleTabClick = (tab: TabItem & { position: number; actualIndex: number }) => {
    if (isDragging.current) return;
    
    triggerHaptic('light');
    
    // 切换歌单
    setActiveTab(tab.id);
    if (tab.id !== HISTORY_TAB_ID) {
      switchPlaylist(tab.id);
    }
    
    // 将点击的 Tab 滚动到 C 位
    setScrollIndex(tab.actualIndex);
  };

  // 拖拽处理
  const handleDragStart = (e: React.PointerEvent) => {
    isDragging.current = false;
    dragStartX.current = e.clientX;
    dragX.set(0);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    
    const deltaX = e.clientX - dragStartX.current;
    
    if (Math.abs(deltaX) > 5) {
      isDragging.current = true;
    }
    
    dragX.set(deltaX);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    const deltaX = e.clientX - dragStartX.current;
    
    if (isDragging.current && Math.abs(deltaX) > 30) {
      // 计算滑动了多少个 Tab
      const tabsToMove = Math.round(-deltaX / TAB_WIDTH);
      const total = allTabs.length;
      const newIndex = ((scrollIndex + tabsToMove) % total + total) % total;
      
      setScrollIndex(newIndex);
      triggerHaptic('light');
    }
    
    dragX.set(0);
    isDragging.current = false;
  };

  // 触摸事件处理
  const touchStartX = useRef(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    
    if (Math.abs(deltaX) > 5) {
      isDragging.current = true;
    }
    
    dragX.set(deltaX);
  };

  const handleTouchEnd = () => {
    const deltaX = dragX.get();
    
    if (isDragging.current && Math.abs(deltaX) > 30) {
      const tabsToMove = Math.round(-deltaX / TAB_WIDTH);
      const total = allTabs.length;
      const newIndex = ((scrollIndex + tabsToMove) % total + total) % total;
      
      setScrollIndex(newIndex);
      triggerHaptic('light');
    }
    
    dragX.set(0);
    isDragging.current = false;
  };

  const listVariants: Variants = {
      hidden: { opacity: 0 },
      visible: {
          opacity: 1,
          transition: { duration: 0.15 }
      },
      exit: {
          opacity: 0,
          transition: { duration: 0.1 }
      }
  };

  // 折叠时完全隐藏
  if (isCollapsed) {
    return null;
  }

  const styles = getStyles(isFocusMode);

  // 获取 Tab 的样式（根据位置）
  const getTabStyle = (position: number, isActive: boolean) => {
    const baseStyle = isActive ? styles.activeTab : styles.inactiveTab;
    
    const absPos = Math.abs(position);
    let opacity = 1;
    let scale = 1;
    
    if (absPos === 1) {
      opacity = 0.8;
      scale = 0.95;
    } else if (absPos >= 2) {
      opacity = 0.5;
      scale = 0.9;
    }
    
    return {
      className: baseStyle,
      opacity,
      scale
    };
  };

  return (
    <>
      <ConfirmModal
          isOpen={!!playlistToDelete}
          onClose={() => setPlaylistToDelete(null)}
          onConfirm={() => {
              if (playlistToDelete) {
                  triggerHaptic('medium');
                  removePlaylist(playlistToDelete.id);
              }
          }}
          title="Delete Playlist?"
          message={`Are you sure you want to delete "${playlistToDelete?.name}"?`}
          confirmText="Delete"
          isDanger={true}
      />

      <div className={`h-full w-72 flex flex-col backdrop-blur-xl border-r overflow-hidden ${styles.container}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 flex-shrink-0 border-b ${styles.header}`}>
          <div className="flex items-center gap-2">
            <Library size={18} className={styles.text} strokeWidth={1.5} />
            <span className={`font-semibold text-sm tracking-tight ${styles.text}`}>Library</span>
          </div>

          <div className="flex items-center gap-1">
            {!isEditing && (
            <>
                <button
                    aria-label="Locate current song"
                    title="Locate current song"
                    onClick={() => { triggerHaptic('light'); scrollToCurrentSong(); }}
                    className={`p-1.5 rounded-lg transition-colors ${styles.button}`}
                >
                    <LocateFixed size={16} />
                </button>
                <button
                    aria-label="Import playlist"
                    title="Import playlist"
                    onClick={() => { triggerHaptic('light'); onImport(); }}
                    className={`p-1.5 rounded-lg transition-colors ${styles.button}`}
                >
                    <CloudDownload size={16} />
                </button>
                <button
                    aria-label="Edit playlist"
                    title="Edit playlist"
                    onClick={() => { triggerHaptic('light'); setIsEditing(true); }}
                    className={`p-1.5 rounded-lg transition-colors ${styles.button}`}
                >
                    <PenLine size={14} />
                </button>
            </>
            )}
            {isEditing && (
                <button onClick={() => { triggerHaptic('light'); setIsEditing(false); setSelectedIds(new Set()); }} className="px-2 py-1 rounded-lg text-xs font-medium bg-[var(--theme-color)] text-white">
                    Done
                </button>
            )}
            <button
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                onClick={onToggleCollapse}
                className={`p-1.5 rounded-lg transition-colors ${styles.button}`}
            >
                <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* 可滑动的 Tabs */}
        <div 
          ref={tabContainerRef}
          className={`relative flex items-center justify-center gap-1.5 p-3 flex-shrink-0 border-b overflow-hidden cursor-grab active:cursor-grabbing select-none ${styles.header}`}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerLeave={handleDragEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
        >
          <motion.div 
            className="flex items-center justify-center gap-1.5"
            style={{ x: dragX }}
          >
            <AnimatePresence mode="popLayout">
              {visibleTabs.map((tab) => {
                const isCurrentActive = tab.id === activeTab;
                const tabStyle = getTabStyle(tab.position, isCurrentActive);
                
                return (
                  <motion.div
                    key={`${tab.id}-${tab.position}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: tabStyle.opacity, scale: tabStyle.scale }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="relative group flex-shrink-0"
                  >
                    <button
                      data-id={tab.id}
                      onClick={() => handleTabClick(tab)}
                      className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${tabStyle.className}`}
                    >
                      {tab.isHistory ? (
                        <History size={12} />
                      ) : tab.isDefault ? (
                        <ListMusic size={12} />
                      ) : (
                        <Cloud size={12} />
                      )}
                      <span className="max-w-[50px] truncate">{tab.name}</span>
                    </button>
                    {/* 删除按钮（非默认、非历史，且在 C 位） */}
                    {!tab.isDefault && !tab.isHistory && tab.position === 0 && (
                      <button
                        aria-label={`Delete playlist ${tab.name}`}
                        title={`Delete playlist ${tab.name}`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          triggerHaptic('light'); 
                          setPlaylistToDelete({ id: tab.id, name: tab.name }); 
                        }}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 scale-75 transition-all group-hover:opacity-100 group-hover:scale-100 z-10 shadow-sm text-[8px]"
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
          
          {/* 滑动指示器 */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {allTabs.map((tab, i) => {
              const isCurrent = i === Math.round(scrollIndex);
              return (
                <div 
                  key={tab.id} 
                  className={`w-1 h-1 rounded-full transition-colors ${isCurrent ? 'bg-[var(--theme-color)]' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Edit Actions */}
        <div className={`w-full flex items-center justify-between px-3 overflow-hidden transition-all flex-shrink-0 ${isEditing ? 'max-h-10 py-2 opacity-100' : 'max-h-0 py-0 opacity-0'}`}>
            <button onClick={selectAll} className={`text-[10px] font-medium flex items-center gap-1 ${styles.textMuted}`}>{selectedIds.size === currentSongs.length ? <CheckSquare size={12} /> : <Square size={12} />} All</button>
            {selectedIds.size > 0 && (<button onClick={handleBatchDelete} className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg flex items-center gap-1"><Trash2 size={10} /> Delete ({selectedIds.size})</button>)}
        </div>

        {/* Song List */}
        <AnimatePresence mode="popLayout">
            <motion.div
                ref={listContainerRef}
                key={activeTab}
                variants={listVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 overflow-y-auto px-2 py-1 no-scrollbar space-y-0.5"
            >
                {currentSongs.length === 0 && (
                    <div className={`flex flex-col items-center justify-center h-32 gap-2 ${styles.textMuted}`}>
                        <ListMusic size={24} opacity={0.2} />
                        <span className="text-xs">Empty List</span>
                    </div>
                )}

                {currentSongs.map((song, index) => (
                    <SongRow
                        key={song.id}
                        song={song}
                        index={index}
                        isActive={!isHistoryTab && index === currentSongIndex}
                        isEditing={isEditing}
                        isSelected={selectedIds.has(song.id)}
                        onClick={() => handleRowClick(index, song)}
                        onToggleSelect={toggleSelect}
                        onDelete={handleSingleDelete}
                    />
                ))}
            </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className={`flex-shrink-0 px-4 py-2 border-t text-[10px] text-center ${styles.header} ${styles.textMuted}`}>
          {currentSongs.length} {currentSongs.length === 1 ? 'song' : 'songs'}
        </div>
      </div>
    </>
  );
};

export default PlaylistSidebar;
