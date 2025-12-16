import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  const [show, setShow] = useState(false);
  
  // 1. 使用 Ref 来保存最新的 onClose 函数
  // 这样即使父组件频繁刷新导致 onClose 变化，也不会触发下方的 useEffect 重置计时器
  const onCloseRef = useRef(onClose);
  
  // 每次渲染都更新 ref，保证调用的是最新的函数
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const displayTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (isVisible) {
      // 清除旧的计时器
      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

      setShow(true);

      // 1. 显示 3 秒
      displayTimerRef.current = setTimeout(() => {
        setShow(false); // 开始淡出动画

        // 2. 等待 300ms 动画结束，然后调用 ref 中的关闭函数
        fadeTimerRef.current = setTimeout(() => {
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }, 300);
      }, 3000);
    }

    return () => {
      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
    // 关键修正：依赖数组里移除了 onClose，现在只有 message 或 isVisible 变了才会重置倒计时
  }, [isVisible, message]); 

  if (!isVisible && !show) return null;

  return (
    <div 
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full bg-neutral-900/90 dark:bg-white/90 backdrop-blur-md shadow-xl transition-all duration-300 ease-out ${show ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
    >
      <CheckCircle size={18} className="text-green-500" strokeWidth={2.5} />
      <span className="text-sm font-medium text-white dark:text-neutral-900">{message}</span>
    </div>
  );
};

export default Toast;