import { fetchViaProxy } from "../../utils";

const METING_API = "https://api.qijieya.cn/meting/";

interface MetingSong {
  name: string;
  artist: string;
  url_id: string;
  pic: string;
  lrc: string;
  url: string;
  songid: string | number;
  title?: string;
  author?: string;
}

// 1. 获取 QQ 音乐歌单
export const fetchQQPlaylist = async (id: string) => {
  try {
    const url = `${METING_API}?type=playlist&id=${id}&server=tencent`;
    const data = await fetchViaProxy(url);
    if (!Array.isArray(data)) return []; 
    return data as MetingSong[];
  } catch (e) {
    console.error("QQ Playlist fetch error", e);
    return [];
  }
};

export const getQQAudioUrl = (id: string | number) => {
  return `${METING_API}?type=url&id=${id}&server=tencent`;
};

// 基础获取歌词文本
export const fetchQQLyric = async (id: string | number) => {
    try {
        const url = `${METING_API}?type=lrc&id=${id}&server=tencent`;
        const res = await fetchViaProxy(url);
        if (typeof res === 'string') return res;
        if (res && res.lyric) return res.lyric;
        return "";
    } catch (e) {
        console.error("QQ Lyric fetch error", e);
        return "";
    }
};

// --- 新增：统一格式的歌词获取函数 (对齐网易云接口格式) ---
export const fetchQQLyricsById = async (id: string): Promise<{ lrc: string; tLrc?: string; metadata: string[] } | null> => {
    // 移除 id 前面的 "qq-" 前缀 (如果存在)
    const rawId = id.toString().replace(/^qq-/, '');
    
    try {
        const lrc = await fetchQQLyric(rawId);
        
        // QQ 音乐目前通过 Meting API 较难直接获取翻译，暂时返回空翻译
        // 但返回了标准结构，Lyrics 组件就能正常解析 lrc 中的元数据了
        return {
            lrc: lrc,
            tLrc: "", 
            metadata: []
        };
    } catch (e) {
        console.error("QQ Lyrics By ID fetch error", e);
        return null;
    }
};

// 4. 解析 QQ 音乐链接中的 ID
export const parseQQPlaylistId = (url: string): string | null => {
    if (url.includes('music.163.com') || url.includes('163.com')) {
        return null;
    }

    const matchV2 = url.match(/\/playlist\/(\d+)/);
    if (matchV2) return matchV2[1];

    const matchId = url.match(/[?&]id=(\d+)/);
    if (matchId) return matchId[1];

    return null;
};

// 搜索功能
export const searchQQ = async (keyword: string) => {
    try {
        const url = `${METING_API}?type=search&keyword=${encodeURIComponent(keyword)}&server=tencent`;
        const data = await fetchViaProxy(url);
        if (!Array.isArray(data)) {
            return [];
        }
        return data as MetingSong[];
    } catch (e) {
        console.error("QQ Search error", e);
        return [];
    }
};