// 原有的震动函数保持不变
export const triggerHaptic = (style: 'tick' | 'light' | 'medium' | 'heavy') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      const patterns = { tick: 5, light: 15, medium: 40, heavy: 70 };
      window.navigator.vibrate(patterns[style]);
    } catch (e) {}
  }
};

// --- 修改：增强版网络请求 (支持 JSON 和 Text) ---
export const fetchViaProxy = async (targetUrl: string): Promise<any> => {
  try {
    // 1. 先尝试直接请求
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Direct fetch failed: ${response.status}`);
    }
    
    // 关键修改：先获取文本，再尝试解析 JSON
    // 这样既能兼容 NetEase 的 JSON 数据，也能兼容 QQ 的 LRC 纯文本数据
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        return text; // 解析 JSON 失败，说明是纯文本，直接返回
    }

  } catch (directError) {
    try {
      // 2. 代理请求
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy fetch failed: ${response.status}`);
      }
      
      const text = await response.text();
      try {
          return JSON.parse(text);
      } catch (e) {
          return text;
      }

    } catch (proxyError) {
      console.error("Both direct and proxy requests failed", proxyError);
      return null;
    }
  }
};