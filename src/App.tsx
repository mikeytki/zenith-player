import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NETEASE_COVER } from '../constants';
import { Song } from '../types';
import ProgressBar from './components/ProgressBar';
import Controls from './components/Controls';
import Visualizer from './components/Visualizer';
import Playlist from './components/Playlist';
import Lyrics from './components/Lyrics';
import Toast from './components/Toast';
import ImportModal from './components/ImportModal';
import SearchModal from './components/SearchModal'; 
import { Moon, Sun, Search, Maximize2, Minimize2, PictureInPicture2, Monitor, AlignJustify, ChevronDown } from 'lucide-react'; 
import { FastAverageColor } from 'fast-average-color'; 
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from './store/usePlayerStore'; 
import { fetchNeteasePlaylist, getNeteaseAudioUrl, fetchLyricsById as fetchNeteaseLyrics, fetchPlaylistDetail, searchAndMatchLyrics } from './api/netease';
import { fetchQQPlaylist, getQQAudioUrl, parseQQPlaylistId, fetchQQLyricsById } from './api/qq';
import { motion, AnimatePresence } from 'framer-motion'; 

const fac = new FastAverageColor();

// 统一按钮样式
const BUTTON_CLASS = "p-3 bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/10 shadow-sm rounded-full text-neutral-600 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white transition-all active:scale-95 flex items-center justify-center";

function getAccessibleColor(hex: string, isDarkMode: boolean) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) { r = parseInt("0x" + hex[1] + hex[1]); g = parseInt("0x" + hex[2] + hex[2]); b = parseInt("0x" + hex[3] + hex[3]); } else if (hex.length === 7) { r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16); }
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;
  if (delta === 0) h = 0; else if (cmax === r) h = ((g - b) / delta) % 6; else if (cmax === g) h = (b - r) / delta + 2; else h = (r - g) / delta + 4;
  h = Math.round(h * 60); if (h < 0) h += 360;
  l = (cmax + cmin) / 2; s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  const isGrayscale = s < 0.15; 
  if (!isDarkMode) { if (l > 0.45) l = 0.35; else if (l < 0.1) l = 0.15; if (isGrayscale) { s = 0; } else { if (s < 0.5) s = 0.5; } } else { if (l < 0.65) l = 0.75; if (isGrayscale) { s = 0; } else { if (s < 0.4) s = 0.5; } }
  return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

const App: React.FC = () => {
  const { 
    isPlaying, volume, isDarkMode, viewMode, focusLayout,
    togglePlay, toggleDarkMode,
    getCurrentSong,
    addPlaylist, nextSong, prevSong, pause, updateSongLyric,
    playSearchSong,
    setViewMode, toggleFocusLayout
  } = usePlayerStore(useShallow(state => ({
      isPlaying: state.isPlaying,
      volume: state.volume,
      isDarkMode: state.isDarkMode,
      viewMode: state.viewMode,
      focusLayout: state.focusLayout,
      togglePlay: state.togglePlay,
      toggleDarkMode: state.toggleDarkMode,
      getCurrentSong: state.getCurrentSong,
      addPlaylist: state.addPlaylist,
      nextSong: state.nextSong,
      prevSong: state.prevSong,
      pause: state.pause,
      updateSongLyric: state.updateSongLyric,
      playSearchSong: state.playSearchSong,
      setViewMode: state.setViewMode,
      toggleFocusLayout: state.toggleFocusLayout
  })));

  const currentSong = getCurrentSong();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rawCoverColor, setRawCoverColor] = useState<string>('#525252');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false); 
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const isFirstRender = useRef(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const themeColor = useMemo(() => getAccessibleColor(rawCoverColor, isDarkMode), [rawCoverColor, isDarkMode]);

  const showToastMsg = (msg: string) => { setToastMessage(msg); setShowToast(true); };

  const initAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256; 

        if (!sourceRef.current) {
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyserNode);
            analyserNode.connect(ctx.destination);
            sourceRef.current = source;
        }

        audioContextRef.current = ctx;
        setAnalyser(analyserNode);
    } catch (e) {
        console.error("Web Audio API init failed:", e);
    }
  };

  useEffect(() => {
    if (isPlaying && !audioContextRef.current) {
        initAudioContext();
    }
    if (isPlaying && audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }
  }, [isPlaying]);

  const handleFullScreenToggle = async () => {
      if (!document.fullscreenElement) {
          try { 
              await document.documentElement.requestFullscreen();
              setViewMode('focus'); 
          } catch(e) { console.warn(e); }
      } else {
          try { 
              await document.exitFullscreen(); 
          } catch(e) { console.warn(e); }
      }
  };

  useEffect(() => {
    const onFullScreenChange = () => {};
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    showToastMsg(isDarkMode ? "🌙 Dark Mode On" : "☀️ Light Mode On");
  }, [isDarkMode]);
  
  useEffect(() => {
    if (currentSong?.coverUrl) {
        fac.getColorAsync(currentSong.coverUrl, { algorithm: 'dominant' })
        .then(color => setRawCoverColor(color.hex))
        .catch(() => setRawCoverColor('#737373'));
    }
  }, [currentSong?.coverUrl]);

  useEffect(() => {
    const fetchLyrics = async () => {
        if (!currentSong) return;
        if (currentSong.lyricsContent || currentSong.lyricsUrl) return;
        const targetId = currentSong.id;
        try {
            let lyricData = null;
            if (targetId.toString().startsWith('qq-')) {
                lyricData = await fetchQQLyricsById(targetId);
                if (!lyricData || !lyricData.tLrc) {
                    const match = await searchAndMatchLyrics(currentSong.title, currentSong.artist);
                    if (match) lyricData = match;
                }
            } else { lyricData = await fetchNeteaseLyrics(targetId); }
            if (lyricData) { updateSongLyric(targetId, lyricData.lrc, lyricData.tLrc); }
        } catch (e) { console.error("Failed to fetch lyrics", e); }
    };
    fetchLyrics();
  }, [currentSong?.id, currentSong?.lyricsContent, updateSongLyric]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (isPlaying) { const promise = audio.play(); if (promise !== undefined) promise.catch(() => pause()); } else { audio.pause(); }
  }, [isPlaying, currentSong?.id, pause]); 

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const handleImportPlaylist = async (url: string) => {
      if (!url) return;
      const qqId = parseQQPlaylistId(url);
      let neteaseId = null;
      if (!qqId) { const match = url.match(/[?&]id=(\d+)/); if (match) neteaseId = match[1]; }
      if (!qqId && !neteaseId) { showToastMsg('Invalid playlist link'); return; }
      const platform = qqId ? 'Tencent' : 'Netease';
      showToastMsg(`Fetching ${platform} playlist...`);
      try {
          let newSongs: Song[] = [];
          let playlistName = `Imported ${platform}`;
          let playlistCover = NETEASE_COVER;
          if (qqId) {
              const qqTracks = await fetchQQPlaylist(qqId);
              if (qqTracks.length === 0) throw new Error("No songs found");
              if (qqTracks[0]?.pic) playlistCover = qqTracks[0].pic;
              playlistName = `QQ Music ${qqId}`;
              newSongs = qqTracks.map(track => ({ id: `qq-${track.songid || track.url_id}`, title: track.name || track.title || 'Unknown', artist: track.artist || track.author || 'Unknown', coverUrl: track.pic || playlistCover, duration: 0, audioUrl: track.url || getQQAudioUrl(track.songid), }));
          } else if (neteaseId) {
              const details = await fetchPlaylistDetail(neteaseId);
              playlistName = details?.name || `Playlist ${neteaseId}`;
              const neteaseTracks = await fetchNeteasePlaylist(neteaseId);
              if (neteaseTracks.length === 0) throw new Error("No songs found");
              newSongs = neteaseTracks.map(track => ({ id: track.id, title: track.title, artist: track.artist, coverUrl: track.coverUrl || details?.cover || NETEASE_COVER, duration: (track.duration || 0) / 1000, audioUrl: getNeteaseAudioUrl(track.id), }));
          }
          const newPlaylistId = `${platform.toLowerCase()}-${qqId || neteaseId}-${Date.now()}`;
          addPlaylist({ id: newPlaylistId, name: playlistName, songs: newSongs }); 
          showToastMsg(`Imported "${playlistName}"`);
          setShowPlaylist(true);
      } catch (error) { console.error(error); showToastMsg('Failed to import playlist'); }
  };
  const handlePlayFromSearch = (song: Song) => { showToastMsg(`Playing "${song.title}"`); playSearchSong(song); setShowSearchModal(false); };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch(e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': if (audioRef.current) audioRef.current.currentTime += 5; break;
        case 'ArrowLeft': if (audioRef.current) audioRef.current.currentTime -= 5; break;
        case 'KeyN': nextSong(); break;
        case 'KeyP': prevSong(audioRef.current?.currentTime || 0); break;
        case 'Escape': if (viewMode !== 'default') setViewMode('default'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, nextSong, prevSong, viewMode, setViewMode]);

  if (!currentSong) return ( <div className={`${isDarkMode ? 'dark' : ''} w-full h-screen bg-stone-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-4 text-neutral-400`}> <p>No songs available</p> <button onClick={() => setShowSearchModal(true)} className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-full text-sm">Search Music</button> <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} onPlay={handlePlayFromSearch} /> </div> );

  const transition = { type: "spring" as const, stiffness: 280, damping: 30 };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} w-full h-screen overflow-hidden bg-stone-50 dark:bg-neutral-950 transition-colors duration-500`} style={{ '--theme-color': themeColor } as React.CSSProperties}>
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      <Playlist isOpen={showPlaylist} onClose={() => setShowPlaylist(false)} onImport={() => setShowImportModal(true)} />
      <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImportPlaylist} />
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} onPlay={handlePlayFromSearch} />

      <audio
        ref={audioRef}
        src={currentSong.audioUrl}
        crossOrigin="anonymous"
        onEnded={() => nextSong()}
        onTimeUpdate={() => { if(audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) { setDuration(audioRef.current.duration); audioRef.current.volume = volume; } }}
        onError={() => { pause(); showToastMsg("Audio Error"); }}
      />

      <motion.div 
        className="absolute inset-0 z-0 will-change-transform transform-gpu"
        animate={{ opacity: viewMode === 'mini' ? 0 : (isDarkMode ? 1 : 0.6) }}
        transition={{ duration: 0.5 }}
        style={{ 
            backgroundImage: `url(${currentSong.coverUrl})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center', 
            filter: isDarkMode ? 'blur(30px) saturate(1.2) brightness(0.4)' : 'blur(30px) saturate(1.5) brightness(1.1)', 
            transform: 'scale(1.1) translateZ(0)',
        }} 
      />
      <div className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-500 ${isDarkMode ? 'bg-black/50' : 'bg-white/30'}`} />

      {/* 顶部按钮组 */}
      <AnimatePresence>
        {viewMode !== 'mini' && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-6 right-8 z-[60] flex items-center gap-3"
            >
                <button 
                    aria-label="Search" title="Search"
                    onClick={() => setShowSearchModal(true)} 
                    className={BUTTON_CLASS}
                >
                    <Search size={20} strokeWidth={2} />
                </button>
                
                <button 
                    aria-label="Toggle Theme" title="Toggle Theme"
                    onClick={toggleDarkMode} 
                    className={BUTTON_CLASS}
                >
                    {isDarkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
                </button>
                
                {/* Focus 模式：只保留布局切换 */}
                {viewMode === 'focus' && (
                    <button 
                        aria-label="Switch Layout" title="Switch Cover/Lyrics View"
                        onClick={toggleFocusLayout} 
                        className={BUTTON_CLASS}
                    >
                        <AlignJustify size={20} strokeWidth={2} />
                    </button>
                )}

                {/* Default 模式：显示独立的 Mini 和 Expand 按钮 */}
                {viewMode === 'default' && (
                    <>
                        <button 
                            aria-label="Mini Mode" title="Mini Mode (Picture in Picture)"
                            onClick={() => setViewMode('mini')} 
                            className={BUTTON_CLASS}
                        >
                            <PictureInPicture2 size={20} strokeWidth={2} />
                        </button>
                        <button 
                            aria-label="Focus Mode" title="Immersive Mode"
                            onClick={() => setViewMode('focus')} 
                            className={BUTTON_CLASS}
                        >
                            <Maximize2 size={20} strokeWidth={2} />
                        </button>
                    </>
                )}

                {/* Monitor 按钮：全屏沉浸 */}
                <button 
                    aria-label="Full Screen Focus" title="Full Screen Immersion"
                    onClick={handleFullScreenToggle} 
                    className={BUTTON_CLASS}
                >
                    <Monitor size={20} strokeWidth={2} />
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full h-full flex items-center justify-center font-sans text-neutral-900 dark:text-neutral-50 pointer-events-none">
        <AnimatePresence mode='wait'> 
          {/* === Mode 1: Default === */}
          {viewMode === 'default' && (
            <motion.div 
                key="default"
                className="relative w-full max-w-[95%] md:max-w-[1100px] lg:max-w-[1300px] h-[85vh] md:h-[750px] lg:h-[820px] max-h-[92vh] bg-white/70 dark:bg-black/60 backdrop-blur-3xl rounded-[48px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] dark:shadow-black/60 border border-white/40 dark:border-white/10 flex flex-col md:flex-row overflow-hidden pointer-events-auto will-change-transform transform-gpu"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={transition}
            >
                <div className="w-full md:w-[45%] lg:w-[42%] h-full flex flex-col items-center justify-between p-6 md:p-12 relative z-20 shrink-0 bg-white/30 dark:bg-black/20 border-r border-white/10">
                    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0 gap-6 md:gap-8 mt-4 md:mt-0">
                        <motion.div 
                            layoutId="album-cover" 
                            className="relative w-56 h-56 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-[40px] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] dark:shadow-black/50 ring-1 ring-white/20 dark:ring-white/5 cursor-pointer will-change-transform"
                            onClick={() => setViewMode('focus')} 
                            whileHover={{ scale: 1.02 }}
                        >
                            <motion.img layoutId="album-img" src={currentSong.coverUrl} alt={currentSong.title} className="w-full h-full object-cover" />
                        </motion.div>
                        <div className="text-center space-y-2 max-w-[90%]">
                            <motion.h1 layoutId="song-title" className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug truncate">{currentSong.title}</motion.h1>
                            <motion.p layoutId="song-artist" className="text-sm md:text-base font-medium text-neutral-500 dark:text-neutral-400 tracking-widest uppercase truncate">{currentSong.artist}</motion.p>
                        </div>
                    </div>
                    <div className="w-full space-y-6 md:space-y-8 mt-6">
                        <div className="h-6 flex items-center justify-center w-full">
                            <Visualizer isPlaying={isPlaying} analyser={analyser} themeColor={themeColor} />
                        </div>
                        <ProgressBar currentTime={currentTime} duration={duration} onSeek={(t) => { if(audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); }}} />
                        <Controls onTogglePlaylist={() => setShowPlaylist(true)} onImport={() => setShowImportModal(true)} />
                    </div>
                </div>
                <div className="hidden md:block w-[1px] my-16 bg-gradient-to-b from-transparent via-neutral-300 dark:via-neutral-700 to-transparent opacity-30"></div>
                <div className="w-full md:flex-1 h-full relative overflow-hidden flex flex-col">
                    <div className="w-full h-full p-8 md:p-14 overflow-hidden relative flex flex-col">
                         <div className="absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-white/0 to-transparent h-16 pointer-events-none" />
                         <Lyrics lyricsUrl={currentSong.lyricsUrl} lyricsContent={currentSong.lyricsContent} tLyricsContent={currentSong.tLyricsContent} currentTime={currentTime} onSeek={(t) => { if(audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); }}} />
                         <div className="absolute bottom-0 left-0 w-full z-10 bg-gradient-to-t from-white/0 to-transparent h-16 pointer-events-none" />
                    </div>
                </div>
            </motion.div>
          )}

          {/* === Mode 2: Focus (Immersive Mode) === */}
          {viewMode === 'focus' && (
            <motion.div 
                key="focus"
                className={`absolute inset-0 w-full h-full flex items-center justify-center p-6 md:p-20 pointer-events-auto will-change-transform transform-gpu z-50 overflow-hidden ${focusLayout === 'cover' ? 'flex-col gap-12 md:gap-16' : 'flex-col md:flex-row'}`} // 修复 Bug 1：在 cover 模式下增加 gap
            >
                 <div className="absolute inset-0 z-[-1] pointer-events-none opacity-20 mix-blend-overlay">
                    <Visualizer isPlaying={isPlaying} analyser={analyser} mode="fullscreen" themeColor={themeColor} />
                 </div>

                 {/* 布局逻辑：严格分屏 */}
                 {focusLayout === 'cover' ? (
                   // === Cover Only Layout ===
                   <motion.div 
                      layout
                      className="flex flex-col items-center justify-center w-full h-full"
                   >
                       {/* 封面容器：高度自适应修复遮挡问题 */}
                       <motion.div 
                          layoutId="album-cover"
                          className="relative w-full max-w-[300px] md:max-w-[600px] aspect-square rounded-[30px] md:rounded-[60px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] dark:shadow-black/80 ring-1 ring-white/10 will-change-transform shrink-1 max-h-[50vh]" // 动态高度 max-h-[50vh]
                          transition={transition}
                       >
                           <motion.img layoutId="album-img" src={currentSong.coverUrl} className="w-full h-full object-cover" alt={currentSong.title} />
                       </motion.div>
                       
                       <div className="text-center space-y-4 mt-8 flex-shrink-0">
                           <motion.h1 layoutId="song-title" className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white drop-shadow-lg tracking-tight px-4">{currentSong.title}</motion.h1>
                           <motion.p layoutId="song-artist" className="text-lg md:text-2xl font-medium text-neutral-600 dark:text-neutral-300 tracking-widest uppercase">{currentSong.artist}</motion.p>
                       </div>

                       <motion.div 
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="w-full max-w-md bg-white/40 dark:bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl flex-shrink-0 mt-8" // 增加 mt-8
                       >
                           <ProgressBar currentTime={currentTime} duration={duration} onSeek={(t) => { if(audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); }}} />
                           <div className="flex justify-center mt-4">
                               <Controls onTogglePlaylist={() => setShowPlaylist(true)} onImport={() => setShowImportModal(true)} />
                           </div>
                       </motion.div>
                   </motion.div>
                 ) : (
                   // === Lyrics Layout ===
                   // 修复 Bug 2：强制左右 50% 宽度，禁止收缩
                   <>
                     <motion.div 
                        className="w-full md:w-1/2 min-w-[50%] max-w-[50%] flex-shrink-0 h-[40vh] md:h-full flex flex-col items-center justify-center gap-8 md:gap-12"
                     >
                         <div style={{ perspective: 1000 }} className="flex-shrink-1">
                             <motion.div 
                                layoutId="album-cover"
                                className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-[30px] md:rounded-[60px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] dark:shadow-black/80 ring-1 ring-white/10 will-change-transform max-h-[45vh] aspect-square" // 同样加上 max-h 保护
                                transition={transition}
                             >
                                 <motion.div className="w-full h-full">
                                     <motion.img layoutId="album-img" src={currentSong.coverUrl} className="w-full h-full object-cover" alt={currentSong.title} />
                                 </motion.div>
                             </motion.div>
                         </div>
                         
                         <div className="text-center space-y-4 flex-shrink-0">
                             <motion.h1 layoutId="song-title" className="text-3xl md:text-5xl font-black text-neutral-900 dark:text-white drop-shadow-lg tracking-tight px-4">{currentSong.title}</motion.h1>
                             <motion.p layoutId="song-artist" className="text-lg md:text-2xl font-medium text-neutral-600 dark:text-neutral-300 tracking-widest uppercase">{currentSong.artist}</motion.p>
                         </div>

                         <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="w-full max-w-md bg-white/40 dark:bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl flex-shrink-0"
                         >
                             <ProgressBar currentTime={currentTime} duration={duration} onSeek={(t) => { if(audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); }}} />
                             <div className="flex justify-center mt-4">
                                 <Controls onTogglePlaylist={() => setShowPlaylist(true)} onImport={() => setShowImportModal(true)} />
                             </div>
                         </motion.div>
                     </motion.div>

                     {/* 右侧歌词：同样强制 50% 宽度 */}
                     <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, ...transition }}
                        className="w-full md:w-1/2 min-w-[50%] max-w-[50%] flex-shrink-0 h-[45vh] md:h-[80vh] relative overflow-hidden hidden md:block"
                     >
                         <Lyrics lyricsUrl={currentSong.lyricsUrl} lyricsContent={currentSong.lyricsContent} tLyricsContent={currentSong.tLyricsContent} currentTime={currentTime} onSeek={(t) => { if(audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); }}} />
                     </motion.div>
                   </>
                 )}

                 {/* 底部退出箭头 */}
                 <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-neutral-500 hover:text-white dark:text-white/50 transition-all z-50 pointer-events-auto"
                    onClick={() => setViewMode('default')}
                 >
                    <ChevronDown size={32} />
                 </motion.button>
            </motion.div>
          )}

          {/* === Mode 3: Mini === */}
          {viewMode === 'mini' && (
            <motion.div 
                key="mini"
                initial={{ opacity: 0, y: 100, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="fixed bottom-6 right-6 z-50 w-80 bg-white/80 dark:bg-black/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 p-4 flex items-center gap-4 pointer-events-auto overflow-hidden group hover:scale-105 transition-transform duration-300"
            >
                <motion.div 
                    layoutId="album-cover"
                    className="w-16 h-16 rounded-xl overflow-hidden shadow-md cursor-pointer flex-shrink-0"
                    onClick={() => setViewMode('default')}
                >
                    <motion.img layoutId="album-img" src={currentSong.coverUrl} className="w-full h-full object-cover" alt={currentSong.title} />
                </motion.div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <motion.h1 layoutId="song-title" className="text-sm font-bold text-neutral-900 dark:text-white truncate">{currentSong.title}</motion.h1>
                    <motion.p layoutId="song-artist" className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{currentSong.artist}</motion.p>
                    <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-[var(--theme-color)] rounded-full" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                     <button 
                        onClick={() => isPlaying ? pause() : togglePlay()}
                        aria-label={isPlaying ? "Pause" : "Play"}
                        title={isPlaying ? "Pause" : "Play"}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-[var(--theme-color)] hover:text-white transition-colors flex-shrink-0"
                     >
                        {isPlaying ? (
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                        ) : (
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
                        )}
                     </button>
                     <button 
                         onClick={() => setViewMode('default')}
                         aria-label="Expand"
                         title="Expand"
                         className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                     >
                         <Maximize2 size={16} />
                     </button>
                </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;