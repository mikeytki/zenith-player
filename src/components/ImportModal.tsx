import React, { useState, useEffect } from 'react';
import { X, Link, ArrowRight, AlertCircle, Music2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  // 每次打开清空状态
  useEffect(() => {
    if (isOpen) {
        setUrl('');
        setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
        setError('Please enter a valid link');
        return;
    }
    onImport(url);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={onClose}
          >
            {/* 弹窗卡片 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-[32px] overflow-hidden p-8 relative"
            >
              {/* 关闭按钮 */}
              <button
                aria-label='close'
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all active:scale-90"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                {/* 顶部图标装饰 */}
                <div className="w-16 h-16 bg-gradient-to-tr from-[var(--theme-color)] to-neutral-400 rounded-2xl flex items-center justify-center shadow-lg mb-6 text-white transform rotate-3">
                    <Music2 size={32} strokeWidth={2} className="drop-shadow-md" />
                </div>
                
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">Import Playlist</h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-8 px-2 leading-relaxed">
                  Paste a link from <span className="text-neutral-800 dark:text-neutral-200 font-medium">QQ Music</span> or <span className="text-neutral-800 dark:text-neutral-200 font-medium">NetEase</span> to add songs to your library.
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-neutral-400">
                            <Link size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Paste link here..."
                            value={url}
                            onChange={(e) => { setUrl(e.target.value); setError(''); }}
                            className="w-full pl-11 pr-5 py-4 bg-neutral-100 dark:bg-neutral-800/50 border border-transparent focus:border-[var(--theme-color)] rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-400 outline-none transition-all focus:ring-4 focus:ring-[var(--theme-color)]/10 text-sm font-medium"
                            autoFocus
                        />
                         {/* 错误提示 */}
                         <AnimatePresence>
                             {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -5, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -5, height: 0 }}
                                    className="flex items-center gap-1.5 text-xs text-red-500 font-medium mt-2 pl-2 overflow-hidden"
                                >
                                    <AlertCircle size={12} /> {error}
                                </motion.div>
                             )}
                         </AnimatePresence>
                    </div>

                    <button
                        type="submit"
                        disabled={!url.trim()}
                        className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-neutral-500/20 flex items-center justify-center gap-2 group"
                    >
                        <span>Import Now</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ImportModal;