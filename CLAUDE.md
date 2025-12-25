# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server (default: http://localhost:5173/player/)
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture Overview

Zenith Player is a React 19 web music player with glassmorphism UI, built with Vite + TypeScript + Tailwind CSS 4.

### Core Structure

- **State Management**: Zustand store with Immer middleware (`src/store/usePlayerStore.ts`)
  - Persisted to localStorage under key `zenith-storage`
  - Handles playlists, playback state, view modes, and hand gesture input state
  - Uses `useShallow` for selective subscriptions in components

- **Music APIs** (`src/api/`):
  - `netease.ts` - NetEase Cloud Music API integration (search, playlists, lyrics)
  - `qq.ts` - QQ Music API via Meting proxy
  - Both use `fetchViaProxy()` from `utils.ts` which falls back to allorigins.win proxy on CORS failure

- **View Modes**: Three modes controlled by `viewMode` state:
  - `default` - Standard player layout with cover + lyrics side-by-side
  - `focus` - Immersive fullscreen mode with two sub-layouts (`cover` or `lyrics`)
  - `mini` - Document Picture-in-Picture window (Chrome only)

- **Audio Visualization**: Web Audio API with AnalyserNode in `src/components/Visualizer.tsx`

- **Hand Gesture Control**: MediaPipe Tasks Vision integration
  - `HandDetector.tsx` - Camera capture and gesture recognition
  - `GestureFeedback.tsx` - Visual feedback overlay
  - Gesture types: OPEN, FIST, PINCH, POINT, NONE

### Key Files

- `types.ts` - Core type definitions (Song, PlaylistData, RepeatMode, ViewMode)
- `constants.ts` - Default song list and cover image data URIs
- `utils.ts` - Haptic feedback and proxy fetch utilities

### Component Patterns

- Framer Motion for animations with `layoutId` for shared element transitions
- Dynamic theme color extraction from album covers using `fast-average-color`
- React Portal for PiP window content rendering

### Path Aliases

`@/*` maps to `./src/*` (configured in both tsconfig.json and vite.config.ts)

### Deployment

Default base path is `/player/`. Change `base` in `vite.config.ts` for different deployment paths.
