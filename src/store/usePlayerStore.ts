import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Song, PlaylistData, RepeatMode, ViewMode, FocusLayout } from '../../types';
import { SONGS as INITIAL_SONGS } from '../../constants';

// --- 新增：手势与交互类型定义 ---
export type GestureType = 'OPEN' | 'FIST' | 'PINCH' | 'POINT' | 'NONE';
export type InputMode = 'MOUSE' | 'HAND';

// 播放历史记录项
export interface PlayHistoryItem {
  song: Song;
  playedAt: number; // timestamp
}

interface PlayerState {
  // === 原有音频状态 ===
  playlists: PlaylistData[];
  activePlaylistId: string;
  currentSongIndex: number;
  isPlaying: boolean;
  volume: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isLiked: boolean;
  isDarkMode: boolean;

  viewMode: ViewMode;
  isFocusMode: boolean;
  focusLayout: FocusLayout;

  // === 新增：交互状态 ===
  inputMode: InputMode;
  cameraPermission: boolean | null; // null=未检测, true=允许, false=拒绝
  currentGesture: GestureType;      // 当前识别到的手势
  cursorPosition: { x: number, y: number }; // 归一化坐标 (-1 到 1)

  // === 播放历史 ===
  playHistory: PlayHistoryItem[];

  // === Getters ===
  getCurrentPlaylist: () => PlaylistData;
  getCurrentSong: () => Song | undefined;

  // === Actions ===
  setPlaylists: (playlists: PlaylistData[]) => void;
  addPlaylist: (playlist: PlaylistData) => void;
  removePlaylist: (id: string) => void;
  switchPlaylist: (id: string) => void;
  
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (val: number) => void;
  
  nextSong: () => void;
  prevSong: (currentTime: number) => void;
  selectSong: (index: number) => void;
  
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLike: () => void;
  toggleDarkMode: () => void;
  
  setViewMode: (mode: ViewMode) => void;
  toggleFocusLayout: () => void; 
  toggleFocusMode: () => void;
  setFocusMode: (enable: boolean) => void;
  
  updateSongLyric: (songId: string, lrc: string, tLrc?: string) => void;
  deleteSongs: (ids: string[]) => void;
  playSearchSong: (song: Song) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;

  // === 新增：交互 Actions ===
  setInputMode: (mode: InputMode) => void;
  setCameraStatus: (status: boolean) => void;
  setGesture: (gesture: GestureType) => void;
  setCursorPosition: (x: number, y: number) => void;

  // === 播放历史 Actions ===
  addToPlayHistory: (song: Song) => void;
  clearPlayHistory: () => void;
  playFromHistory: (song: Song) => void;
  removeFromPlayHistory: (songIds: string[]) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    immer((set, get) => ({
      // --- 初始状态 ---
      playlists: [{ id: 'default', name: 'Favorites', songs: INITIAL_SONGS }],
      activePlaylistId: 'default',
      currentSongIndex: 0,
      isPlaying: false,
      volume: 0.7,
      repeatMode: RepeatMode.OFF,
      isShuffle: false,
      isLiked: false,
      isDarkMode: false,
      
      viewMode: 'default',
      isFocusMode: false,
      focusLayout: 'lyrics',

      // 新增交互状态初始化
      inputMode: 'MOUSE', // 默认从鼠标开始
      cameraPermission: null,
      currentGesture: 'NONE',
      cursorPosition: { x: 0, y: 0 },

      // 播放历史初始化
      playHistory: [],

      // --- Getters ---
      getCurrentPlaylist: () => {
        const { playlists, activePlaylistId } = get();
        return playlists.find((p: PlaylistData) => p.id === activePlaylistId) || playlists[0];
      },
      getCurrentSong: () => {
        const playlist = get().getCurrentPlaylist();
        return playlist.songs[get().currentSongIndex];
      },

      // --- Actions ---
      setPlaylists: (playlists) => set({ playlists }),
      
      addPlaylist: (playlist) => set(state => {
          const maxLists = 8;
          state.playlists.push(playlist);
          if (state.playlists.length > maxLists) {
              state.playlists.splice(1, 1);
          }
          state.activePlaylistId = playlist.id;
          state.currentSongIndex = 0;
          state.isPlaying = false;
      }),

      removePlaylist: (id) => set(state => {
        if (id === 'default') return;
        state.playlists = state.playlists.filter((p: PlaylistData) => p.id !== id);
        if (state.activePlaylistId === id) {
            state.activePlaylistId = 'default';
            state.currentSongIndex = 0;
            state.isPlaying = false;
        }
      }),

      switchPlaylist: (id) => set(state => {
          if (state.activePlaylistId === id) return;
          state.activePlaylistId = id;
          state.currentSongIndex = 0;
          state.isPlaying = false;
      }),

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      togglePlay: () => set(state => { state.isPlaying = !state.isPlaying }),
      
      setVolume: (val) => set({ volume: Math.max(0, Math.min(1, val)) }),

      nextSong: () => set(state => {
        const playlist = state.playlists.find((p: PlaylistData) => p.id === state.activePlaylistId);
        if (!playlist || playlist.songs.length === 0) return;
        
        const songs = playlist.songs;
        let nextIndex = state.currentSongIndex;

        if (state.isShuffle) {
            let rand = Math.floor(Math.random() * songs.length);
            if (songs.length > 1 && rand === state.currentSongIndex) rand = (rand + 1) % songs.length;
            nextIndex = rand;
        } else {
            if (state.currentSongIndex < songs.length - 1) {
                nextIndex = state.currentSongIndex + 1;
            } else {
                if (state.repeatMode === RepeatMode.ALL) nextIndex = 0;
                else {
                    state.isPlaying = false;
                    state.currentSongIndex = 0;
                    return;
                }
            }
        }
        state.currentSongIndex = nextIndex;
        state.isPlaying = true;
        state.isLiked = false;
      }),

      prevSong: (currentTime) => set(state => {
        if (currentTime > 3) return; 
        const playlist = state.playlists.find((p: PlaylistData) => p.id === state.activePlaylistId);
        if (!playlist || playlist.songs.length === 0) return;

        let prevIndex = state.currentSongIndex;
        if (state.currentSongIndex > 0) {
            prevIndex = state.currentSongIndex - 1;
        } else {
            if (state.repeatMode === RepeatMode.ALL) prevIndex = playlist.songs.length - 1;
        }
        state.currentSongIndex = prevIndex;
        state.isPlaying = true;
        state.isLiked = false;
      }),

      selectSong: (index) => set(state => {
          if (index === state.currentSongIndex) {
              state.isPlaying = !state.isPlaying; 
          } else {
              state.currentSongIndex = index;
              state.isPlaying = true;
              state.isLiked = false;
          }
      }),

      toggleShuffle: () => set(state => {
          state.isShuffle = !state.isShuffle;
          if (state.isShuffle) state.repeatMode = RepeatMode.ALL;
      }),
      
      toggleRepeat: () => set(state => {
          if (state.repeatMode === RepeatMode.OFF) state.repeatMode = RepeatMode.ALL;
          else if (state.repeatMode === RepeatMode.ALL) state.repeatMode = RepeatMode.ONE;
          else state.repeatMode = RepeatMode.OFF;
      }),

      toggleLike: () => set(state => { state.isLiked = !state.isLiked }),
      toggleDarkMode: () => set(state => { state.isDarkMode = !state.isDarkMode }),
      
      setViewMode: (mode) => set(state => { 
          state.viewMode = mode;
          state.isFocusMode = mode === 'focus';
      }),

      toggleFocusLayout: () => set(state => {
          state.focusLayout = state.focusLayout === 'cover' ? 'lyrics' : 'cover';
      }),

      toggleFocusMode: () => set(state => { 
          if (state.viewMode === 'focus') {
              state.viewMode = 'default';
              state.isFocusMode = false;
          } else {
              state.viewMode = 'focus';
              state.isFocusMode = true;
          }
      }),
      
      setFocusMode: (enable) => set(state => { 
          state.isFocusMode = enable;
          state.viewMode = enable ? 'focus' : 'default';
      }),

      updateSongLyric: (songId, lrc, tLrc) => set(state => {
          const playlist = state.playlists.find((p: PlaylistData) => p.id === state.activePlaylistId);
          if (playlist) {
              const song = playlist.songs.find((s: Song) => s.id === songId);
              if (song) {
                  song.lyricsContent = lrc;
                  song.tLyricsContent = tLrc || "";
              }
          }
      }),

      deleteSongs: (ids) => set(state => {
          const playlist = state.playlists.find((p: PlaylistData) => p.id === state.activePlaylistId);
          if (!playlist) return;

          const idsSet = new Set(ids);
          const newSongs = playlist.songs.filter((s: Song) => !idsSet.has(s.id));
          
          const shouldPause = newSongs.length === 0;
          let newIndex = state.currentSongIndex;
          
          if (newIndex >= newSongs.length) newIndex = Math.max(0, newSongs.length - 1);

          playlist.songs = newSongs;
          if (shouldPause) state.isPlaying = false;
          state.currentSongIndex = newIndex;
      }),

      playSearchSong: (song) => set(state => {
          const searchListId = 'search-results';
          let searchList = state.playlists.find((p: PlaylistData) => p.id === searchListId);
          
          if (!searchList) {
              searchList = { id: searchListId, name: "Search Results", songs: [] };
              if (state.playlists.length >= 8) {
                  state.playlists.splice(1, 1);
                  state.playlists.push(searchList);
              } else {
                  state.playlists.push(searchList);
              }
          }

          const existingIndex = searchList.songs.findIndex((s: Song) => s.id === song.id);
          
          if (existingIndex !== -1) {
              state.currentSongIndex = existingIndex;
          } else {
              searchList.songs.push(song);
              state.currentSongIndex = searchList.songs.length - 1;
          }

          state.activePlaylistId = searchListId;
          state.isPlaying = true;
          state.isLiked = false;
      }),

      reorderSongs: (fromIndex, toIndex) => set(state => {
          const playlist = state.playlists.find((p: PlaylistData) => p.id === state.activePlaylistId);
          if (!playlist) return;

          const songs = playlist.songs;
          if (fromIndex < 0 || fromIndex >= songs.length || toIndex < 0 || toIndex >= songs.length) return;

          // 移动歌曲
          const [movedSong] = songs.splice(fromIndex, 1);
          songs.splice(toIndex, 0, movedSong);

          // 更新当前播放索引
          if (state.currentSongIndex === fromIndex) {
              // 如果移动的是当前播放的歌曲
              state.currentSongIndex = toIndex;
          } else if (fromIndex < state.currentSongIndex && toIndex >= state.currentSongIndex) {
              // 如果从当前歌曲前面移到后面
              state.currentSongIndex--;
          } else if (fromIndex > state.currentSongIndex && toIndex <= state.currentSongIndex) {
              // 如果从当前歌曲后面移到前面
              state.currentSongIndex++;
          }
      }),

      // === 新增交互 Actions 实现 ===
      setInputMode: (mode) => set({ inputMode: mode }),
      setCameraStatus: (status) => set({ cameraPermission: status }),
      
      // 优化：只有手势真正变化时才更新，减少无意义渲染
      setGesture: (gesture) => set((state) => {
        if (state.currentGesture !== gesture) {
          state.currentGesture = gesture;
        }
      }),
      
      // 优化：只有位置变化超过阈值时才更新，减少无意义渲染
      setCursorPosition: (x, y) => set((state) => {
        const threshold = 0.01; // 1% 的变化阈值
        const dx = Math.abs(state.cursorPosition.x - x);
        const dy = Math.abs(state.cursorPosition.y - y);
        if (dx > threshold || dy > threshold) {
          state.cursorPosition = { x, y };
        }
      }),

      // === 播放历史 Actions 实现 ===
      addToPlayHistory: (song) => set(state => {
        // 移除已存在的相同歌曲（避免重复）
        state.playHistory = state.playHistory.filter(
          (item: PlayHistoryItem) => item.song.id !== song.id
        );
        // 添加到开头（不限制数量）
        state.playHistory.unshift({
          song,
          playedAt: Date.now()
        });
      }),

      clearPlayHistory: () => set({ playHistory: [] }),

      playFromHistory: (song) => set(state => {
        // 复用 playSearchSong 的逻辑，将歌曲添加到 search-results 列表并播放
        const searchListId = 'search-results';
        let searchList = state.playlists.find((p: PlaylistData) => p.id === searchListId);

        if (!searchList) {
          searchList = { id: searchListId, name: "Search Results", songs: [] };
          if (state.playlists.length >= 8) {
            state.playlists.splice(1, 1);
            state.playlists.push(searchList);
          } else {
            state.playlists.push(searchList);
          }
        }

        const existingIndex = searchList.songs.findIndex((s: Song) => s.id === song.id);

        if (existingIndex !== -1) {
          state.currentSongIndex = existingIndex;
        } else {
          searchList.songs.push(song);
          state.currentSongIndex = searchList.songs.length - 1;
        }

        state.activePlaylistId = searchListId;
        state.isPlaying = true;
        state.isLiked = false;
      }),

      removeFromPlayHistory: (songIds) => set(state => {
        const idsSet = new Set(songIds);
        state.playHistory = state.playHistory.filter(
          (item: PlayHistoryItem) => !idsSet.has(item.song.id)
        );
      }),
    })),
    {
      name: 'zenith-storage',
      storage: createJSONStorage(() => localStorage),
      version: 7, // 升级版本号以支持播放历史
      migrate: (persistedState: any, version) => {
          let state = persistedState as PlayerState;

          // ... 之前的迁移逻辑保留 ...
          if (version < 3) { /* ... V3 迁移逻辑 ... */ }
          if (version < 4) { /* ... V4 迁移逻辑 ... */ }
          if (version < 5) {
             state = { ...state, focusLayout: 'lyrics' };
          }

          // V6 迁移：补全交互状态
          if (version < 6) {
            state = {
              ...state,
              inputMode: 'MOUSE',
              cameraPermission: null,
              currentGesture: 'NONE',
              cursorPosition: { x: 0, y: 0 }
            };
          }

          // V7 迁移：添加播放历史
          if (version < 7) {
            state = {
              ...state,
              playHistory: []
            };
          }

          return state;
      },
      partialize: (state) => ({
          // 持久化需要保留的字段
          playlists: state.playlists,
          activePlaylistId: state.activePlaylistId,
          volume: state.volume,
          isDarkMode: state.isDarkMode,
          currentSongIndex: state.currentSongIndex,
          repeatMode: state.repeatMode,
          isShuffle: state.isShuffle,
          viewMode: state.viewMode,
          isFocusMode: state.isFocusMode,
          focusLayout: state.focusLayout,
          // 播放历史需要持久化
          playHistory: state.playHistory,
          // 交互状态通常不需要持久化（下次打开需重新请求权限）
          inputMode: 'MOUSE', // 强制重置为鼠标
      }), 
    }
  )
);