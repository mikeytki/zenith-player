import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Music2, Cloud, Play, Clock, Trash2, History } from 'lucide-react';
import { Song } from '../../types';
import { SONGS } from '../../constants';
import { searchNetEase, getNeteaseAudioUrl } from '../api/netease';
import { searchQQ, getQQAudioUrl } from '../api/qq';
import { usePlayerStore, PlayHistoryItem } from '../store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';

// 搜索历史存储 key
const SEARCH_HISTORY_KEY = 'zenith-search-history';
const MAX_HISTORY_ITEMS = 10;

// 获取搜索历史
const getSearchHistory = (): string[] => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

// 保存搜索历史
const saveSearchHistory = (query: string) => {
  try {
    let history = getSearchHistory();
    // 移除重复项
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    // 添加到开头
    history.unshift(query);
    // 限制数量
    history = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
};

// 清除搜索历史
const clearSearchHistory = () => {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
};

// 格式化时间为相对时间
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlay: (song: Song) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onPlay }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false); // 总体加载状态
  const [qqLoading, setQqLoading] = useState(false); // 单独的 QQ 加载状态
  const [netLoading, setNetLoading] = useState(false); // 单独的网易云加载状态
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');

  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取播放历史
  const { playHistory, clearPlayHistory, playFromHistory } = usePlayerStore(useShallow(state => ({
    playHistory: state.playHistory,
    clearPlayHistory: state.clearPlayHistory,
    playFromHistory: state.playFromHistory
  })));

  // 加载搜索历史
  useEffect(() => {
    if (isOpen) {
      setSearchHistory(getSearchHistory());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => setIsAnimating(true));
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
        setTimeout(() => {
            setQuery('');
            setResults([]);
            setLoading(false);
        }, 300);
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    // 保存到搜索历史
    saveSearchHistory(q.trim());
    setSearchHistory(getSearchHistory());

    // 重置状态
    setLoading(true);
    setQqLoading(true);
    setNetLoading(true);
    
    // 1. 本地搜索 (同步)
    const localMatches = SONGS.filter(s =>
        s.title.toLowerCase().includes(q.toLowerCase()) ||
        s.artist.toLowerCase().includes(q.toLowerCase())
    );
    // 先显示本地结果
    setResults(localMatches);

    // 定义合并函数，避免重复
    const mergeResults = (prev: Song[], newSongs: Song[]) => {
        const combined = [...prev];
        const existingIds = new Set(prev.map(s => s.id));
        newSongs.forEach(s => {
            if (!existingIds.has(s.id)) {
                combined.push(s);
                existingIds.add(s.id);
            }
        });
        return combined;
    };

    // 2. 搜索网易云
    searchNetEase(q)
        .then(netData => {
            const netMatches: Song[] = (Array.isArray(netData) ? netData : []).map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                coverUrl: track.coverUrl || '',
                duration: (track.duration || 0) / 1000,
                audioUrl: getNeteaseAudioUrl(track.id),
            }));
            setResults(prev => mergeResults(prev, netMatches));
        })
        .catch(() => {})
        .finally(() => setNetLoading(false));

    // 3. 搜索 QQ 音乐
    searchQQ(q)
        .then(qqData => {
            const qqMatches: Song[] = (Array.isArray(qqData) ? qqData : []).map(track => ({
                id: `qq-${track.songid || track.url_id}`, // 确保 ID 带前缀
                title: track.name || track.title || 'Unknown',
                artist: (track.artist || track.author || 'Unknown'),
                coverUrl: track.pic || '',
                duration: 0,
                audioUrl: track.url || getQQAudioUrl(track.songid),
            }));
            setResults(prev => mergeResults(prev, qqMatches));
        })
        .catch(() => {})
        .finally(() => setQqLoading(false));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(h => h !== item);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    setSearchHistory(newHistory);
  };

  // 只要有一个还在加载，就视为 loading
  const isLoading = qqLoading || netLoading;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div 
        className={`
            relative w-full max-w-lg h-[600px] max-h-[85vh]
            bg-white/90 dark:bg-neutral-900/90 
            backdrop-blur-2xl saturate-150
            border border-white/20 dark:border-white/10
            rounded-[32px] shadow-2xl 
            transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            flex flex-col overflow-hidden
            ${isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}
        `}
      >
        {/* 搜索头 */}
        <div className="flex items-center gap-3 p-6 pb-4 border-b border-neutral-100 dark:border-white/5">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <form onSubmit={handleFormSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setActiveTab('search'); }}
                        placeholder="Search songs, artists..."
                        className="
                            w-full pl-11 pr-4 py-3.5
                            bg-neutral-100 dark:bg-black/30
                            hover:bg-neutral-200/70 dark:hover:bg-black/50
                            focus:bg-white dark:focus:bg-black/50
                            border-2 border-transparent focus:border-neutral-900/10 dark:focus:border-white/10
                            rounded-2xl
                            text-neutral-900 dark:text-white
                            placeholder:text-neutral-400
                            outline-none transition-all duration-200
                            text-sm font-medium
                        "
                    />
                </form>
            </div>
            <button
                aria-label="Close"
                onClick={onClose}
                className="p-3 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-full text-neutral-500 transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        {/* Tab 切换 */}
        {!query && (
            <div className="flex gap-2 px-6 py-3 border-b border-neutral-100 dark:border-white/5">
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        activeTab === 'search'
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                            : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'
                    }`}
                >
                    <Search size={14} />
                    Search
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        activeTab === 'history'
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                            : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'
                    }`}
                >
                    <History size={14} />
                    History
                    {playHistory.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-neutral-200 dark:bg-white/20 rounded-full text-[10px]">
                            {playHistory.length}
                        </span>
                    )}
                </button>
            </div>
        )}

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto p-2">
            {/* 搜索结果 */}
            {activeTab === 'search' && results.length > 0 && (
                <div className="space-y-1">
                    {results.map((song) => {
                        const isLocal = SONGS.some(s => s.id === song.id);
                        const sourceLabel = song.id.startsWith('qq-') ? 'QQ' : (isLocal ? 'LOCAL' : 'NETEASE');
                        
                        return (
                            <div 
                                key={song.id}
                                onClick={() => onPlay(song)}
                                className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer transition-all active:scale-[0.98]"
                            >
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-white/10 flex-shrink-0">
                                    {song.coverUrl ? (
                                        <img src={song.coverUrl} className="w-full h-full object-cover" alt={song.title} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                            <Music2 size={20} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={20} className="text-white fill-current" />
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                                        {song.title}
                                    </h4>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                                        {song.artist}
                                    </p>
                                </div>

                                <div className="px-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                        sourceLabel === 'QQ' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                        sourceLabel === 'NETEASE' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                        'bg-neutral-100 dark:bg-white/10 text-neutral-500'
                                    }`}>
                                        {sourceLabel}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 加载中状态显示在底部 */}
            {activeTab === 'search' && isLoading && (
                <div className="p-4 flex items-center justify-center gap-2 text-neutral-400 text-xs">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Searching Cloud Music...</span>
                </div>
            )}

            {/* 无结果 */}
            {activeTab === 'search' && !isLoading && results.length === 0 && query && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
                    <Search size={32} strokeWidth={1.5} className="opacity-20" />
                    <span className="text-sm">No songs found</span>
                </div>
            )}

            {/* 搜索历史（搜索 Tab 且无搜索词时显示） */}
            {activeTab === 'search' && !query && searchHistory.length > 0 && (
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium">
                            <Clock size={14} />
                            <span>Recent Searches</span>
                        </div>
                        <button
                            onClick={handleClearHistory}
                            className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {searchHistory.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => handleHistoryClick(item)}
                                className="group flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-full text-sm text-neutral-600 dark:text-neutral-300 transition-colors"
                            >
                                <span className="max-w-[150px] truncate">{item}</span>
                                <X
                                    size={14}
                                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                                    onClick={(e) => handleRemoveHistoryItem(e, item)}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'search' && !query && searchHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400/50 gap-4">
                    <Music2 size={48} strokeWidth={1} />
                    <span className="text-sm">Type to search music</span>
                </div>
            )}

            {activeTab === 'search' && !isLoading && results.length > 0 && (
                <div className="p-4 text-center text-xs text-neutral-400">
                    End of results
                </div>
            )}

            {/* 播放历史 Tab */}
            {activeTab === 'history' && !query && (
                <>
                    {playHistory.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between px-4 py-2">
                                <span className="text-xs text-neutral-500">
                                    {playHistory.length} songs played
                                </span>
                                <button
                                    onClick={clearPlayHistory}
                                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="space-y-1">
                                {playHistory.map((item: PlayHistoryItem, index: number) => {
                                    const song = item.song;
                                    const playedDate = new Date(item.playedAt);
                                    const timeAgo = getTimeAgo(playedDate);

                                    return (
                                        <div
                                            key={`${song.id}-${index}`}
                                            onClick={() => { playFromHistory(song); onClose(); }}
                                            className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer transition-all active:scale-[0.98]"
                                        >
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-white/10 flex-shrink-0">
                                                {song.coverUrl ? (
                                                    <img src={song.coverUrl} className="w-full h-full object-cover" alt={song.title} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                        <Music2 size={20} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Play size={20} className="text-white fill-current" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                                                    {song.title}
                                                </h4>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                                    {song.artist}
                                                </p>
                                            </div>

                                            <div className="text-[10px] text-neutral-400 whitespace-nowrap">
                                                {timeAgo}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400/50 gap-4">
                            <History size={48} strokeWidth={1} />
                            <span className="text-sm">No play history yet</span>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;