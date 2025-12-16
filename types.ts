export interface LyricWord {
  text: string;
  startTime: number; // 秒
  duration: number;  // 秒
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  audioUrl: string;
  lyricsUrl?: string;
  lyricsContent?: string;
  tLyricsContent?: string; 
}

export interface PlaylistData {
  id: string;
  name: string;
  songs: Song[];
}

export enum RepeatMode {
  OFF = 'OFF',
  ALL = 'ALL',
  ONE = 'ONE'
}

// [新增] 视图模式枚举
export type ViewMode = 'default' | 'focus' | 'mini';

// [新增] 沉浸模式下的子布局枚举
export type FocusLayout = 'cover' | 'lyrics'; 

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  currentSongIndex: number;
  isLiked: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  volume: number;
}