import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Song, PlaylistData, RepeatMode, ViewMode, FocusLayout } from '../../types'; // [修改] 引入 FocusLayout
import { SONGS as INITIAL_SONGS } from '../../constants';

interface PlayerState {
  // === State (状态) ===
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
  isFocusMode: boolean; // 兼容旧字段
  
  // [新增] 沉浸模式布局状态
  focusLayout: FocusLayout; 

  // === Getters (计算属性) ===
  getCurrentPlaylist: () => PlaylistData;
  getCurrentSong: () => Song | undefined;

  // === Actions (动作) ===
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
  // [新增] 切换沉浸布局
  toggleFocusLayout: () => void; 
  
  toggleFocusMode: () => void;
  setFocusMode: (enable: boolean) => void;
  
  updateSongLyric: (songId: string, lrc: string, tLrc?: string) => void;
  deleteSongs: (ids: string[]) => void;
  playSearchSong: (song: Song) => void;
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
      focusLayout: 'lyrics', // 默认为歌词模式

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

      // [新增] 实现切换 Action
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
    })),
    {
      name: 'zenith-storage', 
      storage: createJSONStorage(() => localStorage),
      // [升级] 升级版本号到 5
      version: 5, 
      migrate: (persistedState: any, version) => {
          let state = persistedState as PlayerState;
          
          if (version < 3) {
              let newPlaylists = state.playlists || [];
              newPlaylists = newPlaylists.map((p: PlaylistData) => {
                  if (p.id === 'default') {
                      return { ...p, songs: INITIAL_SONGS };
                  }
                  return p;
              });
              if (newPlaylists.length === 0) {
                  newPlaylists = [{ id: 'default', name: 'Favorites', songs: INITIAL_SONGS }];
              }
              state = {
                  ...state,
                  playlists: newPlaylists,
                  activePlaylistId: 'default',
                  currentSongIndex: 0,
                  isPlaying: false,
              };
          }

          if (version < 4) {
              state = {
                  ...state,
                  viewMode: (state as any).isFocusMode ? 'focus' : 'default',
                  isFocusMode: (state as any).isFocusMode ?? false
              };
          }

          // [迁移步骤 3] V5: 引入 focusLayout
          if (version < 5) {
              state = {
                  ...state,
                  focusLayout: 'lyrics' // 默认值
              }
          }

          return state;
      },
      partialize: (state) => ({ 
          playlists: state.playlists,
          activePlaylistId: state.activePlaylistId,
          volume: state.volume,
          isDarkMode: state.isDarkMode,
          currentSongIndex: state.currentSongIndex,
          repeatMode: state.repeatMode,
          isShuffle: state.isShuffle,
          viewMode: state.viewMode,
          isFocusMode: state.isFocusMode,
          focusLayout: state.focusLayout, // 持久化新状态
      }), 
    }
  )
);