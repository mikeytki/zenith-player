import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, ListMusic, BarChart2, PenLine, Trash2, CheckSquare, Square, Library, Cloud, CloudDownload, LocateFixed, GripVertical, History } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence, Variants, useMotionValue } from 'framer-motion';
import { triggerHaptic } from '../../utils';
import ConfirmModal from './ConfirmModal';
import { usePlayerStore, PlayHistoryItem } from '../store/usePlayerStore';
import { Song, PlaylistData } from '../../types';

interface PlaylistProps {
  onClose: () => void;
  isOpen: boolean;
  onImport: () => void;
}

// 统一样式
const styles = {
  activeTab: 'bg-[var(--theme-color)] text-white border-transparent shadow-md',
  inactiveTab: 'bg-white/50 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 border-white/30 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/20',
};

const SongRow = React.memo(({
    song, index, isActive, isEditing, isSelected, isDragging, onClick, onToggleSelect, onDelete
}: {
    song: Song, index: number, isActive: boolean, isEditing: boolean, isSelected: boolean, isDragging?: boolean,
    onClick: () => void, onToggleSelect: (id: string) => void, onDelete: (e: React.MouseEvent, id: string) => void
}) => {
    return (
        <div
            id={isActive ? 'active-song' : undefined}
            onClick={() => isEditing ? onToggleSelect(song.id) : onClick()}
            className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors select-none relative overflow-hidden ${
                isDragging
                    ? 'bg-neutral-200 dark:bg-neutral-700 shadow-lg scale-[1.02] z-50'
                    : isEditing
                        ? isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                        : isActive ? 'bg-neutral-100 dark:bg-neutral-800 shadow-sm' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
        >
            <div className="flex items-center gap-4 min-w-0 z-10 w-full">
                {isEditing && (
                    <>
                        <div className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors">
                            <GripVertical size={18} />
                        </div>
                        <div className={`transition-colors ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-300'}`}>
                            {isSelected ? <CheckSquare size={20} strokeWidth={1.5} /> : <Square size={20} strokeWidth={1.5} />}
                        </div>
                    </>
                )}

                <div className={`relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 ${isActive && !isEditing ? 'shadow-md ring-2 ring-white dark:ring-neutral-700' : ''}`}>
                    <img loading="lazy" src={song.coverUrl} className="w-full h-full object-cover" alt={song.title} />
                    {isActive && !isEditing && (
                        <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center">
                            <BarChart2 size={16} className="text-white fill-current animate-pulse" strokeWidth={0} />
                        </div>
                    )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                    <span className={`text-sm font-semibold truncate leading-tight mb-0.5 ${isActive && !isEditing ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {song.title}
                    </span>
                    <span className="text-[11px] font-medium text-neutral-400 truncate uppercase tracking-wider">
                        {song.artist}
                    </span>
                </div>

                {isEditing && (
                    <button
                        aria-label="Delete song"
                        title="Delete song"
                        onClick={(e) => onDelete(e, song.id)}
                        className="p-2 text-neutral-300 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={18} strokeWidth={1.5} />
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

const Playlist: React.FC<PlaylistProps> = ({ onClose, isOpen, onImport }) => {
  const {
    playlists, activePlaylistId, currentSongIndex,
    switchPlaylist, removePlaylist, selectSong, deleteSongs,
    playHistory, clearPlayHistory, playFromHistory
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
      playFromHistory: state.playFromHistory
  })));

  const HISTORY_TAB_ID = '__play_history__';

  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playlistToDelete, setPlaylistToDelete] = useState<{id: string, name: string} | null>(null);
  const [activeTab, setActiveTab] = useState<string>(activePlaylistId);
  
  // 滚动位置（以 Tab 索引为单位）
  const [scrollIndex, setScrollIndex] = useState(0);
  
  // 拖拽相关
  const dragX = useMotionValue(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const TAB_WIDTH = 120; // 弹窗中 Tab 更大

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
    
    // 弹窗更大，显示更多 Tab
    const visibleCount = Math.min(7, total);
    const halfVisible = Math.floor(visibleCount / 2);
    
    const centerIndex = Math.round(scrollIndex);
    
    for (let i = -halfVisible; i <= halfVisible; i++) {
      const actualIndex = ((centerIndex + i) % total + total) % total;
      result.push({
        ...allTabs[actualIndex],
        position: i,
        actualIndex
      });
    }
    
    return result;
  }, [allTabs, scrollIndex]);

  const currentSongs = isHistoryTab
    ? playHistory.map(item => item.song)
    : playlists.find(p => p.id === activeTab)?.songs || [];

  const listContainerRef = useRef<HTMLDivElement>(null);

  const scrollToCurrentSong = useCallback(() => {
    requestAnimationFrame(() => {
        setTimeout(() => {
            const container = listContainerRef.current;
            const activeElement = container?.querySelector('#active-song') as HTMLElement;
            if (activeElement && container) {
                const targetScrollTop = activeElement.offsetTop - (container.clientHeight / 2) + (activeElement.clientHeight / 2);
                container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
        }, 100);
    });
  }, []);

  // 将指定 Tab 滚动到 C 位
  const scrollTabToCenter = useCallback((tabId: string) => {
    const index = allTabs.findIndex(t => t.id === tabId);
    if (index !== -1) {
      setScrollIndex(index);
    }
  }, [allTabs]);

  useEffect(() => {
    if (isOpen) {
        // 打开时：同步到当前播放列表，并将其滚动到 C 位
        setActiveTab(activePlaylistId);
        scrollTabToCenter(activePlaylistId);
        scrollToCurrentSong();
    } else {
        const timer = setTimeout(() => {
            setIsEditing(false);
            setSelectedIds(new Set());
            setPlaylistToDelete(null);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToCurrentSong, activePlaylistId, scrollTabToCenter]);

  // 监听歌单切换，触发滚动
  useEffect(() => {
    if(isOpen && !isHistoryTab) {
        const timer = setTimeout(() => {
            scrollToCurrentSong();
        }, 200);
        return () => clearTimeout(timer);
    }
  }, [activeTab, isOpen, scrollToCurrentSong, isHistoryTab]);

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
    deleteSongs([id]);
  }, [deleteSongs]);

  const selectAll = () => {
    if (selectedIds.size === currentSongs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentSongs.map(s => s.id)));
    triggerHaptic('light');
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    triggerHaptic('medium');
    deleteSongs(Array.from(selectedIds));
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
    
    if (isDragging.current && Math.abs(deltaX) > 40) {
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
    
    if (isDragging.current && Math.abs(deltaX) > 40) {
      const tabsToMove = Math.round(-deltaX / TAB_WIDTH);
      const total = allTabs.length;
      const newIndex = ((scrollIndex + tabsToMove) % total + total) % total;
      
      setScrollIndex(newIndex);
      triggerHaptic('light');
    }
    
    dragX.set(0);
    isDragging.current = false;
  };

  // 获取 Tab 的样式
  const getTabStyle = (position: number, isActive: boolean) => {
    const baseStyle = isActive ? styles.activeTab : styles.inactiveTab;
    
    const absPos = Math.abs(position);
    let opacity = 1;
    let scale = 1;
    
    if (absPos === 1) {
      opacity = 0.85;
      scale = 0.97;
    } else if (absPos === 2) {
      opacity = 0.6;
      scale = 0.93;
    } else if (absPos >= 3) {
      opacity = 0.4;
      scale = 0.88;
    }
    
    return {
      className: baseStyle,
      opacity,
      scale
    };
  };

  const containerVariants: Variants = {
      hidden: { y: "100%", opacity: 0 },
      visible: {
          y: 0,
          opacity: 1,
          transition: { type: "spring", damping: 30, stiffness: 300 }
      },
      exit: {
          y: "100%",
          opacity: 0,
          transition: { type: "spring", damping: 30, stiffness: 300 }
      }
  };

  const listVariants: Variants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.1 } }
  };

  return (
    <AnimatePresence>
        {isOpen && (
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

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[70] bg-black/20 dark:bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ willChange: "transform" }}
                    className="absolute inset-0 top-20 z-[80] bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl rounded-t-[40px] flex flex-col p-6 shadow-2xl overflow-hidden"
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                        if (info.offset.y > 150) onClose();
                    }}
                >
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mb-2" />

                    <div className="flex items-center justify-between mb-2 flex-shrink-0 relative z-20 mt-2">
                        <div className="flex items-center gap-2">
                            <Library size={20} className="text-neutral-800 dark:text-neutral-100" strokeWidth={1.5} />
                            <span className="font-semibold text-lg tracking-tight text-neutral-800 dark:text-neutral-100">Library</span>
                        </div>

                        <div className="flex items-center gap-2">
                            {!isEditing && (
                            <>
                                <button 
                                    aria-label="Locate current song"
                                    title="Locate current song"
                                    onClick={() => { triggerHaptic('light'); scrollToCurrentSong(); }} 
                                    className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                                >
                                    <LocateFixed size={20} />
                                </button>
                                <button 
                                    aria-label="Import playlist"
                                    title="Import playlist"
                                    onClick={() => { triggerHaptic('light'); onImport(); }} 
                                    className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                                >
                                    <CloudDownload size={20} />
                                </button>
                                <button 
                                    aria-label="Edit playlist"
                                    title="Edit playlist"
                                    onClick={() => { triggerHaptic('light'); setIsEditing(true); }} 
                                    className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                                >
                                    <PenLine size={18} />
                                </button>
                            </>
                            )}
                            {isEditing && (
                                <button onClick={() => { triggerHaptic('light'); setIsEditing(false); setSelectedIds(new Set()); }} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm font-medium">
                                    Done
                                </button>
                            )}
                            <button 
                                aria-label="Close library"
                                title="Close library"
                                onClick={() => { triggerHaptic('light'); onClose(); }} 
                                className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* 可滑动的 Tabs */}
                    <div 
                      ref={tabContainerRef}
                      className="relative flex items-center justify-center gap-2 mb-4 p-2 overflow-hidden flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
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
                        className="flex items-center justify-center gap-2"
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
                                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${tabStyle.className}`}
                                >
                                  {tab.isHistory ? (
                                    <History size={14} />
                                  ) : tab.isDefault ? (
                                    <ListMusic size={14} />
                                  ) : (
                                    <Cloud size={14} />
                                  )}
                                  <span className="max-w-[100px] truncate">{tab.name}</span>
                                  <span className="opacity-50 text-[10px]">({tab.songCount})</span>
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
                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 scale-75 transition-all group-hover:opacity-100 group-hover:scale-100 z-10 shadow-sm"
                                  >
                                    <X size={10} strokeWidth={3} />
                                  </button>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                      
                      {/* 滑动指示器 */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1">
                        {allTabs.map((tab, i) => {
                          const isCurrent = i === Math.round(scrollIndex);
                          return (
                            <div 
                              key={tab.id} 
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${isCurrent ? 'bg-[var(--theme-color)]' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className={`w-full flex items-center justify-between mb-2 px-2 overflow-hidden transition-all duration-300 flex-shrink-0 ${isEditing ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <button onClick={selectAll} className="text-xs font-medium text-neutral-500 flex items-center gap-1.5">{selectedIds.size === currentSongs.length ? <CheckSquare size={14} /> : <Square size={14} />} Select All</button>
                            {selectedIds.size > 0 && (<button onClick={handleBatchDelete} className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full flex items-center gap-1.5"><Trash2 size={12} /> Delete ({selectedIds.size})</button>)}
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
                            className="flex-1 overflow-y-auto -mx-2 px-2 no-scrollbar space-y-1 pb-10"
                        >
                            {currentSongs.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-neutral-400 gap-2">
                                    <ListMusic size={32} opacity={0.2} />
                                    <span className="text-sm">Empty List</span>
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
                </motion.div>
            </>
        )}
    </AnimatePresence>
  );
};

export default Playlist;