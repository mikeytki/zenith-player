<div align="center">
<h1>🎵 Zenith Player</h1>
  
**极简 · 沉浸 · 纯粹**

Zenith Player 是一款基于 React 19 生态构建的现代 Web 音乐播放器。  
它摒弃了繁杂的边框,采用玻璃拟态 (Glassmorphism) 与大面积留白设计,  
配合流体动画与触觉反馈,为您提供最纯粹的听觉与视觉享受。

[![React](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Motion-12.0-ff0055?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)

</div>

---

## ✨ 核心特性

| 🎨 **极致视觉** | 🎵 **音乐体验** | ⚡ **交互细节** |
| :--- | :--- | :--- |
| **深色模式**：自适应日夜切换与环境光感知 | **多源支持**：内置 API 支持网易云/QQ音乐歌单导入 | **流体动画**：基于 Framer Motion 的丝滑转场 |
| **动态主题**：从专辑封面自动提取主色调 | **歌词系统**：支持 LRC/YRC 双语歌词解析与翻译 | **触觉反馈**：模拟移动端物理震动的细腻手感 |
| **磨砂质感**：现代 UI 模糊与通透感设计 | **沉浸模式**：全屏大图与极简歌词展示 (Focus Mode) | **持久化**：自动保存播放列表与偏好设置 |

---

## 🚀 快速开始

只需简单几步,即可在本地运行 Zenith Player。

### 前置要求
请确保您的环境已安装 [Node.js](https://nodejs.org/) (推荐 v18 或更高版本)。

### 1. 获取代码

首先将仓库克隆到本地:

```bash
git clone https://github.com/your-username/zenith-player.git
cd zenith-player
```

### 2. 安装依赖

推荐使用 npm、yarn 或 pnpm 进行依赖安装:

```bash
# 使用 npm
npm install

# 或者使用 yarn
yarn install

# 或者使用 pnpm
pnpm install
```

### 3. 启动开发服务器

运行以下命令启动本地开发环境:

```bash
npm run dev
```

启动成功后,打开浏览器访问终端显示的地址（通常是 `http://localhost:5173/player/`）即可开始体验。

---

## 🛠️ 自定义指南

Zenith Player 的代码结构清晰,非常适合进行个性化定制。

### 1. 修改默认歌单 (添加本地音乐)

想要在初始化时加载您自己的音乐？请编辑 `src/constants.ts` 文件。

```typescript
// src/constants.ts
export const SONGS: Song[] = [
  {
    id: '1',
    title: '您的歌曲标题',
    artist: '歌手名',
    // 封面图片 (支持本地路径或网络 URL)
    coverUrl: 'https://example.com/cover.jpg',
    // 音频文件地址
    audioUrl: 'https://example.com/song.mp3',
    // [可选] 歌词文件地址
    lyricsUrl: 'https://example.com/lyrics.lrc'
  },
  // ... 在此处添加更多歌曲对象
];
```

### 2. 修改部署路径

项目默认配置为部署在 `/player/` 子路径下。如果您希望部署在域名的根目录（例如 `https://music.your.com/`）,请修改 `vite.config.ts`:

```typescript
// vite.config.ts
export default defineConfig({
  base: '/',  // 将 '/player/' 修改为 '/'
  // ... 其他配置保持不变
})
```

### 3. 修改主题色逻辑

颜色提取逻辑位于 `src/App.tsx` 中,使用 `fast-average-color` 库自动提取封面颜色。如果您想固定某种主题色,可以直接修改 `themeColor` 变量。

---

## 📂 项目结构概览

```
src/
├── api/            # 🌐 音乐平台 API (NetEase, QQ) 适配逻辑
├── components/     # 🧩 UI 组件库 (播放控制、歌词、进度条、弹窗等)
├── store/          # 📦 状态管理 (Zustand) - 处理播放状态、播放列表
├── types/          # TS 类型定义
├── utils/          # 🛠 工具函数 (震动反馈、网络请求代理)
├── App.tsx         # 📱 应用主入口与布局
└── constants.ts    # 🎵 静态数据与默认配置
```

---

## 📦 构建与部署

当您准备好发布时,运行以下命令构建生产环境版本:

```bash
npm run build
```

构建完成后,`dist` 目录下的文件即为最终产物。您可以将其部署到 GitHub Pages、Vercel、Netlify 或任何静态 Web 服务器上。

---

## 📄 许可证

本项目基于 **MIT License** 开源。

---

<div align="center">
<sub>Designed & Developed with ❤️ by Zenith Team</sub>
</div>