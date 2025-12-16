import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, Music2, Cloud, Play } from 'lucide-react';
import { Song } from '../../types';
import { SONGS } from '../../constants';
import { searchNetEase, getNeteaseAudioUrl } from '../api/netease';
import { searchQQ, getQQAudioUrl } from '../api/qq';

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
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    // 重置状态
    setLoading(true);
    setQqLoading(true);
    setNetLoading(true);
    
    // 1. 本地搜索 (同步)
    const localMatches = SONGS.filter(s => 
        s.title.toLowerCase().includes(query.toLowerCase()) || 
        s.artist.toLowerCase().includes(query.toLowerCase())
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
    searchNetEase(query)
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
        .catch(e => console.error("NetEase Error", e))
        .finally(() => setNetLoading(false));

    // 3. 搜索 QQ 音乐
    searchQQ(query)
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
        .catch(e => console.error("QQ Error", e))
        .finally(() => setQqLoading(false));
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
                <form onSubmit={handleSearch}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
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

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto p-2">
            {results.length > 0 && (
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
            {isLoading && (
                <div className="p-4 flex items-center justify-center gap-2 text-neutral-400 text-xs">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Searching Cloud Music...</span>
                </div>
            )}

            {/* 无结果 */}
            {!isLoading && results.length === 0 && query && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
                    <Search size={32} strokeWidth={1.5} className="opacity-20" />
                    <span className="text-sm">No songs found</span>
                </div>
            )}

            {!query && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-400/50 gap-4">
                    <Music2 size={48} strokeWidth={1} />
                    <span className="text-sm">Type to search music</span>
                </div>
            )}
            
            {!isLoading && results.length > 0 && (
                <div className="p-4 text-center text-xs text-neutral-400">
                    End of results
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;