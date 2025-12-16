import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean; // 是否是危险操作（显示红色按钮）
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 1. 背景遮罩 */}
      <div 
        className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* 2. 模态框主体 */}
      <div 
        className={`
            relative w-full max-w-sm
            bg-white/80 dark:bg-neutral-900/80 
            backdrop-blur-2xl saturate-150
            border border-white/20 dark:border-white/10
            rounded-[32px] shadow-2xl 
            transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            flex flex-col overflow-hidden
            ${isAnimating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}
        `}
      >
        <div className="flex flex-col items-center text-center p-8 pb-6">
            {/* 图标 */}
            <div className={`p-4 rounded-full mb-4 ${isDanger ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                <AlertTriangle size={32} strokeWidth={2} />
            </div>

            {/* 标题与内容 */}
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                {title}
            </h3>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {message}
            </p>
        </div>

        {/* 按钮组 */}
        <div className="grid grid-cols-2 gap-3 p-6 pt-0">
            <button
                onClick={onClose}
                className="py-3.5 rounded-2xl font-semibold text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100/50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
            >
                {cancelText}
            </button>
            <button
                onClick={() => {
                    onConfirm();
                    onClose();
                }}
                className={`
                    py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center
                    transition-all duration-200 shadow-lg
                    ${isDanger 
                        ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600 active:scale-95' 
                        : 'bg-neutral-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-95'}
                `}
            >
                {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;