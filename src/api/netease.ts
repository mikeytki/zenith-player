import { fetchViaProxy } from "../../utils";

const LYRIC_API_BASE = "https://163api.qijieya.cn";
const METING_API = "https://api.qijieya.cn/meting/";
const NETEASE_SEARCH_API = "https://163api.qijieya.cn/cloudsearch";
const NETEASE_API_BASE = "http://music.163.com/api";
const NETEASECLOUD_API_BASE = "https://163api.qijieya.cn";

const METADATA_KEYWORDS = [
  "歌词贡献者", "翻译贡献者", "作词", "作曲", "编曲", "制作", "词曲", "词 / 曲", 
  "Lyricist", "Composer", "Arranger", "Producer", "Mix", "Mastering", 
  "录音", "混音", "演唱", "监制", "统筹", "出品", "发行", "OP", "SP"
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const metadataKeywordRegex = new RegExp(`^(${METADATA_KEYWORDS.map(escapeRegex).join("|")})\\s*[:：]`, "iu");

interface NeteaseApiArtist { name?: string; }
interface NeteaseApiAlbum { name?: string; picUrl?: string; }
interface NeteaseApiSong { id: number; name?: string; ar?: NeteaseApiArtist[]; al?: NeteaseApiAlbum; dt?: number; }
interface NeteaseSearchResponse { result?: { songs?: NeteaseApiSong[]; }; }
interface NeteasePlaylistResponse { songs?: NeteaseApiSong[]; }
interface NeteaseSongDetailResponse { code?: number; songs?: NeteaseApiSong[]; }
interface NeteasePlaylistDetailResponse { playlist?: { name: string; coverImgUrl?: string; description?: string; }; }

export interface NeteaseTrackInfo {
  id: string; title: string; artist: string; album: string; coverUrl?: string; duration?: number; isNetease: true; neteaseId: string;
}

type SearchOptions = { limit?: number; offset?: number; };

const formatArtists = (artists?: NeteaseApiArtist[]) => (artists ?? []).map((artist) => artist.name?.trim()).filter(Boolean).join("/") || "";

const mapNeteaseSongToTrack = (song: NeteaseApiSong): NeteaseTrackInfo => ({
  id: song.id.toString(),
  title: song.name?.trim() ?? "",
  artist: formatArtists(song.ar),
  album: song.al?.name?.trim() ?? "",
  coverUrl: song.al?.picUrl,
  duration: song.dt,
  isNetease: true,
  neteaseId: song.id.toString(),
});

const parseJsonMetadata = (line: string) => {
  try {
    const json = JSON.parse(line.trim());
    if (json.c && Array.isArray(json.c)) {
      const content = json.c.map((item: any) => item.tx || "").join("").trim();
      if (metadataKeywordRegex.test(content)) return content;
    }
  } catch {}
  return null;
};

export const getNeteaseAudioUrl = (id: string) => `${METING_API}?type=url&id=${id}`;

export const searchNetEase = async (keyword: string, options: SearchOptions = {}): Promise<NeteaseTrackInfo[]> => {
  const { limit = 20, offset = 0 } = options;
  const url = `${NETEASE_SEARCH_API}?keywords=${encodeURIComponent(keyword)}&limit=${limit}&offset=${offset}`;
  try {
    const res = (await fetchViaProxy(url)) as NeteaseSearchResponse;
    return (res.result?.songs ?? []).map(mapNeteaseSongToTrack);
  } catch (e) { console.error(e); return []; }
};

export const fetchNeteasePlaylist = async (playlistId: string): Promise<NeteaseTrackInfo[]> => {
  try {
    const allTracks: NeteaseTrackInfo[] = [];
    let offset = 0, limit = 1000, shouldContinue = true;
    while (shouldContinue) {
      const url = `${NETEASECLOUD_API_BASE}/playlist/track/all?id=${playlistId}&limit=${limit}&offset=${offset}`;
      const data = (await fetchViaProxy(url)) as NeteasePlaylistResponse;
      const songs = data.songs ?? [];
      if (!songs.length) break;
      allTracks.push(...songs.map(mapNeteaseSongToTrack));
      if (songs.length < limit) shouldContinue = false;
      else offset += limit;
    }
    return allTracks;
  } catch (e) { console.error(e); return []; }
};

export const fetchNeteaseSong = async (songId: string): Promise<NeteaseTrackInfo | null> => {
  try {
    const url = `${NETEASECLOUD_API_BASE}/song/detail?ids=${songId}`;
    const data = (await fetchViaProxy(url)) as NeteaseSongDetailResponse;
    if (data.songs?.[0]) return mapNeteaseSongToTrack(data.songs[0]);
    return null;
  } catch (e) { console.error(e); return null; }
};

// --- 保留并导出此函数供 App.tsx 调用 ---
export const searchAndMatchLyrics = async (
  title: string,
  artist: string,
): Promise<{ lrc: string; tLrc?: string; metadata: string[] } | null> => {
  try {
    const songs = await searchNetEase(`${title} ${artist}`, { limit: 5 });
    if (songs.length === 0) return null;
    return await fetchLyricsById(songs[0].id);
  } catch (error) {
    return null;
  }
};

export const fetchLyricsById = async (songId: string): Promise<{ lrc: string; tLrc?: string; metadata: string[] } | null> => {
  try {
    const url = `${NETEASECLOUD_API_BASE}/lyric/new?id=${songId}`;
    const data = await fetchViaProxy(url);
    if (!data) return null;

    const yrc = data.yrc?.lyric;
    const lrc = data.lrc?.lyric;
    
    let originalLrc = lrc || yrc;
    if (!originalLrc) return null;

    const cleanLrc = originalLrc.split('\n').map((line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
          const meta = parseJsonMetadata(trimmed);
          return meta || ""; 
      }
      return line;
    }).filter((line: string) => line.trim() !== '').join('\n');

    return { lrc: cleanLrc, tLrc: data.tlyric?.lyric, metadata: [] };
  } catch (e) { console.error(e); return null; }
};

export const fetchPlaylistDetail = async (id: string) => {
    try {
      const url = `${NETEASECLOUD_API_BASE}/playlist/detail?id=${id}`;
      const data = (await fetchViaProxy(url)) as NeteasePlaylistDetailResponse;
      return data.playlist ? { name: data.playlist.name, cover: data.playlist.coverImgUrl } : null;
    } catch { return null; }
};