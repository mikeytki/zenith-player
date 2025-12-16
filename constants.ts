import { Song } from './types';

// SVG Data URIs for offline, API-free usage
const COVERS = {
  // Dark blue/green gradient with subtle circles
  midnight: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230f2027'/%3E%3Cstop offset='50%25' stop-color='%23203a43'/%3E%3Cstop offset='100%25' stop-color='%232c5364'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='800' fill='url(%23a)'/%3E%3Ccircle cx='400' cy='200' r='100' fill='white' opacity='0.05'/%3E%3Ccircle cx='600' cy='600' r='200' fill='white' opacity='0.03'/%3E%3C/svg%3E`,

  // Warm beige/earth gradient with curves
  ceramic: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cdefs%3E%3ClinearGradient id='b' x1='100%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23eacda3'/%3E%3Cstop offset='100%25' stop-color='%23d6ae7b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='800' fill='url(%23b)'/%3E%3Cpath d='M400 200 Q600 200 600 400 T400 600 T200 400 T400 200' fill='none' stroke='white' stroke-width='2' opacity='0.3'/%3E%3C/svg%3E`,

  // Monochrome geometric
  silent: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cdefs%3E%3ClinearGradient id='c' x1='0%25' y1='100%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%238e9eab'/%3E%3Cstop offset='100%25' stop-color='%23eef2f3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='800' fill='url(%23c)'/%3E%3Crect x='200' y='200' width='400' height='400' stroke='%232c3e50' stroke-width='1' fill='none' opacity='0.2'/%3E%3Cline x1='0' y1='0' x2='800' y2='800' stroke='%232c3e50' stroke-width='1' opacity='0.1'/%3E%3C/svg%3E`,

  // Soft pink/pastel gradient
  soft: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cdefs%3E%3ClinearGradient id='d' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ff9a9e'/%3E%3Cstop offset='99%25' stop-color='%23fecfef'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='800' fill='url(%23d)'/%3E%3Ccircle cx='400' cy='400' r='250' fill='white' opacity='0.2'/%3E%3C/svg%3E`,

  // Netease Red/Branding style
  netease: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cdefs%3E%3ClinearGradient id='n' x1='0%25' y1='100%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23dd243b'/%3E%3Cstop offset='100%25' stop-color='%237d0a0a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='800' fill='url(%23n)'/%3E%3Ccircle cx='400' cy='400' r='180' stroke='white' stroke-width='40' fill='none' opacity='0.2'/%3E%3Ccircle cx='400' cy='400' r='80' fill='white' opacity='0.2'/%3E%3C/svg%3E`
};

const COMMON_LYRICS = 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/REALLY%20REALLY.lrc';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'REALLY REALLY',
    artist: 'WINNER',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000004bLTeF0z7TQt_1.jpg?max_age=2592000',
    duration: 0, // 4:30
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/REALLY-REALLY-WINNER.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/REALLY%20REALLY.lrc'
  },
  {
    id: '2',
    title: '诺言',
    artist: '鹿晗',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000000MGbCx0EUuMk_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN@main/img/诺言-鹿晗.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/诺言-鹿晗.lrc'
  },
  {
    id: '3',
    title: '我不好',
    artist: '张艺兴',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002e7tc70jbSUj_2.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/我不好-张艺兴.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/我不好%20-%20张艺兴.lrc'
  },
  {
    id: '4',
    title: '半岛铁盒',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000004MGitN0zEHpb_3.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/半岛铁盒.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/半岛铁盒-周杰伦.lrc'
  },
  {
    id: '5',
    title: '晴天',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000000MkMni19ClKG_5.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/晴天-周杰伦.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/晴天-周杰伦.lrc'
  },
  {
    id: '6',
    title: '七里香',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000003DFRzD192KKD_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/七里香-周杰伦.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/七里香-周杰伦.lrc'
  },
  {
    id: '7',
    title: '给我一首歌的时间',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002Neh8l0uciQZ_3.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/给我一首歌的时间-周杰伦.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/给我一首歌的时间-周杰伦.lrc'
  },
  {
    id: '8',
    title: '发如雪',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M0000024bjiL2aocxT_5.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/发如雪-周杰伦.mp3',
    lyricsUrl: 'https://npm.elemecdn.com/anzhiyu-music@1.0.3/发如雪/发如雪.lrc'
  },
  {
    id: '9',
    title: '稻香',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002Neh8l0uciQZ_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://npm.elemecdn.com/anzhiyu-music@1.0.1/周杰伦/稻香/稻香.mp3',
    lyricsUrl: 'https://npm.elemecdn.com/anzhiyu-music@1.0.1/周杰伦/稻香/稻香.lrc'
  },
  {
    id: '10',
    title: '雨下一整晚',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002Neh8l0uciQZ_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/雨下一整晚.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/雨下一整晚.lrc'
  },
  {
    id: '11',
    title: '花海',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002Neh8l0uciQZ_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://npm.elemecdn.com/anzhiyu-music-jay@1.0.1/花海/花海.flac',
    lyricsUrl: 'https://npm.elemecdn.com/anzhiyu-music-jay@1.0.1/花海/花海.lrc'
  },
  {
    id: '12',
    title: '反方向的钟',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000000f01724fd7TH_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://npm.elemecdn.com/anzhiyu-music-jay@1.0.1/反方向的钟/反方向的钟.flac',
    lyricsUrl: 'https://npm.elemecdn.com/anzhiyu-music-jay@1.0.1/反方向的钟/反方向的钟.lrc'
  },
  {
    id: '13',
    title: '青花瓷',
    artist: '周杰伦',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002eFUFm2XYZ7z_2.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://npm.elemecdn.com/anzhiyu-music@1.0.4/青花瓷/青花瓷.mp3',
    lyricsUrl: 'https://npm.elemecdn.com/anzhiyu-music@1.0.4/青花瓷/青花瓷.lrc'
  },
  {
    id: '14',
    title: 'leave me alone',
    artist: 'TC',
    coverUrl: 'https://p1.music.126.net/ut3ej8hjxACnIzanHch1AQ==/109951165562501951.jpg?param=130y130',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/leave%20me%20alone.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/leave-me-alone-TC.lrc'
  },
  {
    id: '15',
    title: 'why why why',
    artist: '王嘉尔',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M0000004RBSO0XOBLz_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/Why%20Why%20Why-王嘉尔.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/why%20why%20why.lrc'
  },
  {
    id: '16',
    title: '2_soon',
    artist: 'keshi',
    coverUrl: 'https://p2.music.126.net/xB31iMXB9XwzStrPQzcrdw==/109951168789057630.jpg?param=130y130',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/2_soon.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/2_soon.lrc'
  },
  {
    id: '17',
    title: 'Love U2',
    artist: '陈伟霆',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002gSRRI3Ue1fL_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/Love_U2.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN@main/img/Love_U2.lrc'
  },
  {
    id: '18',
    title: 'For You',
    artist: 'AZU',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R180x180M000001CczYM1PrYPs_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/For%20You-AZU.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/For-You-AZU.lrc'
  },
  {
    id: '19',
    title: 'U can do it !',
    artist: 'DOMINO',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000003Bn6pq1kjnfJ_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN@main/img/U%20can%20do%20it%20!-DOMINO.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/U-can-do-it-DOMINO.lrc'
  },
  {
    id: '20',
    title: '君の待つ世界 (你所等待的世界)',
    artist: 'LAGOON',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000004RjXBL16FBBZ_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN@main/img/%E5%90%9B%E3%81%AE%E5%BE%85%E3%81%A4%E4%B8%96%E7%95%8C%20(%E4%BD%A0%E6%89%80%E7%AD%89%E5%BE%85%E7%9A%84%E4%B8%96%E7%95%8C)-LAGOON.mp3',
    lyricsUrl: ''
  },
  {
    id: '21',
    title: 'Baby Can I',
    artist: 'Bumkey',
    coverUrl: 'http://p2.music.126.net/tc9GvCQa6T5bq8dEOziUVQ==/109951169727212098.jpg?param=130y130',
    duration: 0,
    audioUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN@main/img/Baby%20Can%20I.mp3',
    lyricsUrl: 'https://gcore.jsdelivr.net/gh/mikeytki/CDN/img/Baby%20Can%20I.lrc'
  },
  {
    id: '22',
    title: 'Falling U',
    artist: 'T-ara',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M0000020VJot0C2HJc_2.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/Falling%20U.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/Falling%20U.lrc'
  },
  {
    id: '23',
    title: '水（H2O）',
    artist: '张艺兴',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000003XzNlG3eSgRq_3.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/水.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/水.lrc'
  },
  {
    id: '24',
    title: 'Pull up',
    artist: '蔡徐坤',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000002wdavM3BDAQ3_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/Pull%20Up.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/Pull%20Up.lrc'
  },
  {
    id: '25',
    title: '情人',
    artist: '蔡徐坤',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M00000363n7y1Ft6gE_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/情人.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/情人.lrc'
  },
  {
    id: '26',
    title: 'Hug me',
    artist: '蔡徐坤',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000004Tap2C2ZQe4B_2.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/Hug%20me.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/Hug%20me.lrc'
  },
  {
    id: '27',
    title: 'WANTCHU',
    artist: 'keshi',
    coverUrl: 'https://p2.music.126.net/xB31iMXB9XwzStrPQzcrdw==/109951168789057630.jpg?param=130y130',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/WANTCHU.mp3',
    lyricsUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/WANTCHU.lrc'
  },
  {
    id: '28',
    title: '姐姐真漂亮',
    artist: 'SHINee',
    coverUrl: 'https://y.qq.com/music/photo_new/T002R300x300M000004NeRnr41yEFz_1.jpg?max_age=2592000',
    duration: 0,
    audioUrl: 'https://cdn.jsdmirror.com/gh/mikeytki/CDN/img/姐姐真漂亮.mp3',
    lyricsUrl: ''
  }
]

export const NETEASE_COVER = COVERS.netease;