import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ListMusic, BarChart2, PenLine, Trash2, CheckSquare, Square, Library, Cloud, CloudDownload, LocateFixed } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { triggerHaptic } from '../../utils';
import ConfirmModal from './ConfirmModal';
import { usePlayerStore } from '../store/usePlayerStore';
import { Song } from '../../types';

interface PlaylistProps {
  onClose: () => void;
  isOpen: boolean;
  onImport: () => void;
}

// [优化 1] 移除 layoutId，保留纯 CSS 变换动画，极大提升性能
const SongRow = React.memo(({ 
    song, index, isActive, isEditing, isSelected, onClick, onToggleSelect, onDelete 
}: { 
    song: Song, index: number, isActive: boolean, isEditing: boolean, isSelected: boolean, 
    onClick: () => void, onToggleSelect: (id: string) => void, onDelete: (e: React.MouseEvent, id: string) => void 
}) => {
    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
    };

    return (
        <motion.div 
            id={isActive ? 'active-song' : undefined}
            variants={itemVariants}
            onClick={() => isEditing ? onToggleSelect(song.id) : onClick()}
            className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors duration-200 select-none relative overflow-hidden ${
                isEditing 
                    ? isSelected ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30' 
                    : isActive ? 'bg-neutral-100 dark:bg-neutral-800 shadow-sm' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
            }`}
        >
            <div className="flex items-center gap-4 min-w-0 z-10 w-full">
                {isEditing && (
                    <div className={`transition-all ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-300'}`}>
                        {isSelected ? <CheckSquare size={20} strokeWidth={1.5} /> : <Square size={20} strokeWidth={1.5} />}
                    </div>
                )}
                
                <div className={`relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 transition-all ${isActive && !isEditing ? 'shadow-md ring-2 ring-white dark:ring-neutral-700' : ''}`}>
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
        </motion.div>
    );
});

const Playlist: React.FC<PlaylistProps> = ({ onClose, isOpen, onImport }) => {
  const { 
    playlists, activePlaylistId, currentSongIndex, 
    switchPlaylist, removePlaylist, selectSong, deleteSongs 
  } = usePlayerStore(useShallow(state => ({
      playlists: state.playlists,
      activePlaylistId: state.activePlaylistId,
      currentSongIndex: state.currentSongIndex,
      switchPlaylist: state.switchPlaylist,
      removePlaylist: state.removePlaylist,
      selectSong: state.selectSong,
      deleteSongs: state.deleteSongs
  })));

  // [优化 2] 移除 useTransition，保证状态更新是即时且同步的
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playlistToDelete, setPlaylistToDelete] = useState<{id: string, name: string} | null>(null);

  const currentSongs = playlists.find(p => p.id === activePlaylistId)?.songs || [];
  const tabsRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const scrollToCurrentSong = useCallback(() => {
    // 稍微延时以确保 DOM 已经渲染
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

  const scrollToActiveTab = useCallback(() => {
    requestAnimationFrame(() => {
        setTimeout(() => {
            const container = tabsRef.current;
            const activeTab = container?.querySelector(`[data-id="${activePlaylistId}"]`) as HTMLElement;
            if (activeTab && container) {
                const targetScrollLeft = activeTab.offsetLeft - (container.clientWidth / 2) + (activeTab.clientWidth / 2);
                container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            }
        }, 100);
    });
  }, [activePlaylistId]);

  useEffect(() => {
    if (isOpen) {
        scrollToCurrentSong();
        scrollToActiveTab();
    } else {
        const timer = setTimeout(() => {
            setIsEditing(false);
            setSelectedIds(new Set());
            setPlaylistToDelete(null);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToCurrentSong, scrollToActiveTab]);

  // 监听歌单切换，触发滚动
  useEffect(() => {
    if(isOpen) {
        // 稍微延时等待动画开始
        const timer = setTimeout(() => {
            scrollToCurrentSong();
        }, 200);
        return () => clearTimeout(timer);
    }
  }, [activePlaylistId, isOpen, scrollToCurrentSong]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        return newSet;
    });
    triggerHaptic('tick');
  }, []);

  const handleRowClick = useCallback((index: number) => {
      triggerHaptic('light');
      selectSong(index);
  }, [selectSong]);

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

  const handleSwitchPlaylist = (id: string) => {
      triggerHaptic('light');
      // [优化 3] 直接切换，不使用 startTransition，让 React 立即响应
      switchPlaylist(id);
  };

  const containerVariants: Variants = {
      hidden: { y: "100%", opacity: 0 },
      visible: { 
          y: 0, 
          opacity: 1,
          transition: { 
              type: "spring", 
              damping: 30, 
              stiffness: 300,
              staggerChildren: 0.03,
              delayChildren: 0.1 
          } 
      },
      exit: { 
          y: "100%", 
          opacity: 0,
          transition: { type: "spring", damping: 30, stiffness: 300 } 
      }
  };

  // [优化 4] 新增：专门用于列表切换的 variants，避免每次重新渲染整个 modal
  const listVariants: Variants = {
      hidden: { opacity: 0, x: -20 },
      visible: { 
          opacity: 1, 
          x: 0,
          transition: { 
              duration: 0.2,
              staggerChildren: 0.02 // 更快的级联
          }
      },
      exit: { 
          opacity: 0, 
          x: 20,
          transition: { duration: 0.1 } 
      }
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
                    className="absolute inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ willChange: "transform" }}
                    className="absolute inset-0 top-20 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl rounded-t-[40px] flex flex-col p-6 shadow-2xl overflow-hidden"
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

                    <div ref={tabsRef} className="flex items-center gap-2 mb-4 p-1 overflow-x-auto no-scrollbar mask-gradient-right snap-x flex-shrink-0">
                        {playlists.map(playlist => {
                            const isActive = playlist.id === activePlaylistId;
                            const isDefault = playlist.id === 'default';
                            return (
                                <div key={playlist.id} className="relative group snap-start flex-shrink-0">
                                    <button
                                        data-id={playlist.id}
                                        onClick={() => handleSwitchPlaylist(playlist.id)}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border ${isActive ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent shadow-md' : 'bg-white dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                                    >
                                        {isDefault ? <ListMusic size={14}/> : <Cloud size={14}/>}
                                        <span className="max-w-[100px] truncate">{playlist.name}</span>
                                        <span className="opacity-50 text-[10px]">({playlist.songs.length})</span>
                                    </button>
                                    {!isDefault && (
                                        <button 
                                            aria-label={`Delete playlist ${playlist.name}`}
                                            title={`Delete playlist ${playlist.name}`}
                                            onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); setPlaylistToDelete({ id: playlist.id, name: playlist.name }); }} 
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 scale-75 transition-all group-hover:opacity-100 group-hover:scale-100 z-10 shadow-sm"
                                        >
                                            <X size={10} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className={`w-full flex items-center justify-between mb-2 px-2 overflow-hidden transition-all duration-300 flex-shrink-0 ${isEditing ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <button onClick={selectAll} className="text-xs font-medium text-neutral-500 flex items-center gap-1.5">{selectedIds.size === currentSongs.length ? <CheckSquare size={14} /> : <Square size={14} />} Select All</button>
                            {selectedIds.size > 0 && (<button onClick={handleBatchDelete} className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full flex items-center gap-1.5"><Trash2 size={12} /> Delete ({selectedIds.size})</button>)}
                    </div>

                    {/* [优化 5] 在列表内部使用 AnimatePresence mode='wait'，确保切换歌单时旧的先走，新的再来，避免空白或重叠 */}
                    <AnimatePresence mode="wait">
                        <motion.div 
                            ref={listContainerRef} 
                            key={activePlaylistId} // 关键：Key 变化触发 exit 和 enter
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
                                    isActive={index === currentSongIndex}
                                    isEditing={isEditing}
                                    isSelected={selectedIds.has(song.id)}
                                    onClick={() => handleRowClick(index)}
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