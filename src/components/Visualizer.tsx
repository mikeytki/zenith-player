import React, { useEffect, useRef, useMemo, memo } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  analyser: AnalyserNode | null;
  mode?: 'normal' | 'fullscreen';
  themeColor: string; // [新增] 接收主题色
}

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, analyser, mode = 'normal', themeColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // [新增] 解析 HSL 颜色字符串，以便后续拼接 HSLA
  // App.tsx 传过来的是标准格式: "hsl(123, 45%, 67%)"
  const hslValues = useMemo(() => {
    const match = themeColor.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?%?),\s*(\d+(?:\.\d+)?%?)\)/);
    if (match) {
      return { h: match[1], s: match[2], l: match[3] };
    }
    // 默认回退颜色 (白色)
    return { h: '0', s: '0%', l: '100%' };
  }, [themeColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 高清屏适配
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // 2. 视觉参数
    const BAR_COUNT = mode === 'fullscreen' ? 120 : 50;
    const BAR_WIDTH = (rect.width / BAR_COUNT) * 0.5;
    const GAP = (rect.width / BAR_COUNT) * 0.5;

    // 辅助函数：生成带透明度的颜色
    const getColor = (alpha: number) => `hsla(${hslValues.h}, ${hslValues.s}, ${hslValues.l}, ${alpha})`;

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // 暂停时的呼吸线：也改为主题色
      if (!isPlaying) {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = getColor(0.5);
          ctx.fillRect(rect.width * 0.1, rect.height / 2, rect.width * 0.8, 1);
          return;
      }
      ctx.globalAlpha = 1;

      const centerX = rect.width / 2;

      // 双向对称绘制
      for (let i = 0; i < BAR_COUNT / 2; i++) {
        // 只取前 75% 的频率数据
        const dataIndex = Math.floor(i * (bufferLength / (BAR_COUNT * 0.75)));
        let value = dataArray[dataIndex] || 0;

        value = value > 0 ? value * 1.1 : 0;

        const percent = Math.min(1, value / 255);
        const maxBarHeight = rect.height * (mode === 'fullscreen' ? 0.5 : 0.85);
        const barHeight = Math.pow(percent, 1.4) * maxBarHeight;

        // 动态透明度
        const alpha = 0.15 + (percent * 0.85);

        // [修改] 使用主题色创建渐变
        const gradient = ctx.createLinearGradient(0, rect.height/2 - barHeight/2, 0, rect.height/2 + barHeight/2);

        // 渐变策略：两头完全透明，中间根据音量实心，边缘半透明发光
        gradient.addColorStop(0, getColor(0));
        gradient.addColorStop(0.3, getColor(alpha * 0.6));
        gradient.addColorStop(0.5, getColor(alpha));
        gradient.addColorStop(0.7, getColor(alpha * 0.6));
        gradient.addColorStop(1, getColor(0));

        ctx.fillStyle = gradient;

        // 绘制圆角柱状体
        const radius = BAR_WIDTH;

        // 左侧
        const xLeft = centerX - (i * (BAR_WIDTH + GAP)) - GAP;
        const y = (rect.height - barHeight) / 2;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(xLeft, y, BAR_WIDTH, barHeight, radius);
        else ctx.rect(xLeft, y, BAR_WIDTH, barHeight);
        ctx.fill();

        // 右侧
        const xRight = centerX + (i * (BAR_WIDTH + GAP)) + GAP;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(xRight, y, BAR_WIDTH, barHeight, radius);
        else ctx.rect(xRight, y, BAR_WIDTH, barHeight);
        ctx.fill();
      }
    };

    render();

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, analyser, mode, hslValues]); // 添加 hslValues 依赖

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default memo(Visualizer);