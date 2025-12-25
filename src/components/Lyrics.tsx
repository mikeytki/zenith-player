import React, { useEffect, useState, useRef, memo } from 'react';

interface LyricLine {
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
  isMeta?: boolean;
}

interface LyricsProps {
  lyricsUrl?: string;
  lyricsContent?: string;
  tLyricsContent?: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

const hasChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

const parseLyrics = (lrc: string, tLrc?: string): { lines: LyricLine[], isStatic: boolean } => {
  const lines: LyricLine[] = [];
  const lrcRegex = /^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  const yrcRegex = /^\[(\d+),(\d+)\](.*)$/;
  const metaRegex = /^(?:(?:作|编|谱|填)?(?:词|曲)|制作|Producer|Lyricist|Composer|Arranger|Mix|Mastering|录音|混音|演唱|监制|统筹|出品|发行|OP|SP)\s*[:：]/i;
  const tagRegex = /^\[(ti|ar|al|by|offset):(.*)\]$/;
  const karaokeRegex = /\(\d+(?:,\d+)*\)/g; 
  const bracketTranslationRegex = /^(.*?)\s*[（(]([^）)]+)[）)]\s*$/;

  const rawLines = lrc.split('\n');
  const cleanedRawLines: string[] = []; 
  
  for (const line of rawLines) {
    let trimmed = line.trim();
    if (!trimmed) continue;
    trimmed = trimmed.replace(karaokeRegex, '').trim();
    const plainText = trimmed.replace(/^\[\d+,\d+\]/, '').trim();
    if (!trimmed || trimmed.startsWith('{')) continue;

    let isMetaLine = false;
    let metaContent = "";
    const tagMatch = trimmed.match(tagRegex);
    if (tagMatch) {
        if (tagMatch[1] !== 'ti' && tagMatch[1] !== 'offset') {
            isMetaLine = true; metaContent = tagMatch[2].trim();
        }
    } else {
        const contentWithoutTime = trimmed.replace(/^\[.*?\]/, '').trim();
        if (metaRegex.test(contentWithoutTime)) {
            isMetaLine = true; metaContent = contentWithoutTime;
        }
    }

    if (isMetaLine && metaContent) {
        lines.push({ startTime: 0, endTime: 0, text: metaContent, isMeta: true });
        cleanedRawLines.push(metaContent);
        continue;
    }

    if (plainText) cleanedRawLines.push(plainText);

    let time: number | null = null;
    let content = "";
    let duration = 10;

    const yrcMatch = trimmed.match(yrcRegex);
    const lrcMatch = trimmed.match(lrcRegex);

    if (yrcMatch) {
        const startMs = parseInt(yrcMatch[1]);
        time = startMs / 1000;
        duration = 5; 
        content = yrcMatch[3].trim();
    } else if (lrcMatch) {
        time = parseInt(lrcMatch[1]) * 60 + parseInt(lrcMatch[2]) + parseFloat("0." + (lrcMatch[3] || "0"));
        content = lrcMatch[4].trim();
        duration = 10;
    }

    if (time !== null && content) {
        let text = content;
        let translation = "";

        if (!tLrc) {
            const match = text.match(bracketTranslationRegex);
            if (match) {
                const mainText = match[1].trim();
                const subText = match[2].trim();
                if (hasChinese(subText)) {
                    text = mainText;
                    translation = subText;
                }
            }
        }
        lines.push({ startTime: time, endTime: time + duration, text: text, translation: translation });
    }
  }

  if (tLrc) {
      const transMap = new Map<string, string>();
      tLrc.split('\n').forEach(line => {
          const match = line.trim().match(lrcRegex);
          if (match && match[4].trim()) {
              const time = (parseInt(match[1]) * 60 + parseInt(match[2]) + parseFloat("0." + (match[3] || "0"))).toFixed(1);
              transMap.set(time, match[4].trim());
          }
      });
      lines.forEach(l => {
          if (!l.isMeta) {
              const key = l.startTime.toFixed(1);
              if (transMap.has(key)) l.translation = transMap.get(key);
          }
      });
  }

  if (lines.length > 0) {
      lines.sort((a, b) => a.startTime - b.startTime);
      for (let i = 0; i < lines.length - 1; i++) {
          if (!lines[i].isMeta) {
              const nextLine = lines[i+1];
              if (lines[i].endTime > nextLine.startTime) {
                  lines[i].endTime = nextLine.startTime;
              }
          }
      }
      return { lines, isStatic: false };
  } else {
      return { lines: cleanedRawLines.map((t, i) => ({ startTime: i, endTime: i+1, text: t, isMeta: metaRegex.test(t) })), isStatic: true };
  }
};

const Lyrics: React.FC<LyricsProps> = ({ lyricsUrl, lyricsContent, tLyricsContent, currentTime, onSeek }) => {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [isStatic, setIsStatic] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveLineIndex(-1); setLines([]); setIsStatic(false);
    const load = async () => {
        let content = lyricsContent;
        if (!content && lyricsUrl) {
            setLoading(true);
            try { content = await (await fetch(lyricsUrl)).text(); } catch {}
            setLoading(false);
        }
        if (content) {
            const parsed = parseLyrics(content, tLyricsContent);
            setLines(parsed.lines);
            setIsStatic(parsed.isStatic);
        }
    };
    load();
  }, [lyricsUrl, lyricsContent, tLyricsContent]);

  useEffect(() => {
    if (!lines.length || isStatic) return;
    const index = lines.findIndex((line, i) => {
        const next = lines[i + 1];
        return currentTime >= line.startTime && (!next || currentTime < next.startTime);
    });
    if (index !== -1 && index !== activeLineIndex) setActiveLineIndex(index);
  }, [currentTime, lines, isStatic]);

  useEffect(() => {
    if (activeLineIndex !== -1 && listRef.current && containerRef.current && !isStatic) {
      const activeEl = listRef.current.children[activeLineIndex] as HTMLElement;
      if (activeEl) {
        const containerHeight = containerRef.current.clientHeight;
        const activeTop = activeEl.offsetTop;
        const activeHeight = activeEl.clientHeight;
        const targetScrollTop = activeTop - (containerHeight / 2) + (activeHeight / 2);
        containerRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }
  }, [activeLineIndex, isStatic]);

  if (loading) return <div className="flex h-full items-center justify-center text-neutral-400 text-sm">Loading...</div>;
  if (!lines.length && !loading) return <div className="flex h-full items-center justify-center text-neutral-400 text-sm italic">Lyrics not available</div>;

  return (
    <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto no-scrollbar mask-gradient relative" 
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}
    >
        <div 
          ref={listRef} 
          className="flex flex-col items-start gap-5 w-full max-w-2xl mx-auto py-[50vh] px-8"
        >
          {lines.map((line, i) => {
            const isActive = i === activeLineIndex;
            const isMeta = line.isMeta;
            
            // === 修改区域：增强文字对比度 ===
            
            // Meta信息：白天模式用中性灰 (neutral-500) 且不透明度 60%，黑夜模式保持浅灰
            const META_STYLE = "text-lg md:text-xl font-bold text-neutral-500/60 dark:text-neutral-500/40 scale-95 origin-left mb-2 transition-opacity duration-300";
            
            // 未激活歌词：
            // 白天模式：text-neutral-600/60 (深灰，60%不透明) —— 关键修改，原先太浅
            // 黑夜模式：text-neutral-400/50 (浅灰，50%不透明)
            // 悬停：加深至 90-100%
            const INACTIVE_STYLE = "text-lg md:text-xl font-bold text-neutral-600/60 dark:text-neutral-400/50 scale-95 origin-left cursor-pointer hover:text-neutral-900/90 dark:hover:text-neutral-200/90 transition-all duration-300 hover:scale-[0.98]";
            
            const ACTIVE_STYLE = "font-bold text-2xl md:text-3xl transition-all duration-300 scale-100 origin-left drop-shadow-sm";
            
            // 翻译：跟随主歌词颜色策略
            const TRANS_INACTIVE = "text-sm text-neutral-600/50 dark:text-neutral-500/40 font-medium mt-1 transition-opacity duration-300";
            const TRANS_ACTIVE = "text-lg text-neutral-700 dark:text-neutral-300 font-semibold mt-2 transition-all duration-300";

            let lineClass = "";
            let transClass = "";
            let containerProps = {};

            if (isStatic) {
                lineClass = "text-lg md:text-xl font-medium text-neutral-600/80 dark:text-neutral-400/80 my-1";
            } else if (isMeta) {
                lineClass = META_STYLE;
            } else if (isActive) {
                lineClass = ACTIVE_STYLE;
                transClass = TRANS_ACTIVE;
            } else {
                lineClass = INACTIVE_STYLE;
                transClass = TRANS_INACTIVE;
                containerProps = { onClick: () => onSeek(line.startTime) };
            }

            return (
              <div
                key={i}
                {...containerProps}
                className={`flex flex-col items-start text-left w-full will-change-transform`} 
              >
                <p 
                    className={`font-sans tracking-wide leading-tight ${lineClass}`}
                    style={{ color: isActive && !isStatic ? 'var(--theme-color)' : undefined }}
                >
                  {line.text}
                </p>

                {line.translation && (
                    <p className={`font-sans ${transClass}`}>
                        {line.translation}
                    </p>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
};

export default memo(Lyrics);