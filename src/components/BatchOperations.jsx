import React, { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Download, 
  Tag,
  X,
  MoreHorizontal,
  Folder,
  Archive,
  Share2,
  Loader2
} from 'lucide-react';

// Batch Operations Context
const BatchContext = createContext(null);

/**
 * Batch Operations Provider
 */
export const BatchProvider = ({ children }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const toggleSelection = useCallback((id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items) => {
    setSelectedItems(new Set(items.map(item => item.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const toggleSelectAll = useCallback((items) => {
    setSelectedItems(prev => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map(item => item.id));
    });
  }, []);

  const isSelected = useCallback((id) => {
    return selectedItems.has(id);
  }, [selectedItems]);

  const startSelecting = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const stopSelecting = useCallback(() => {
    setIsSelecting(false);
    deselectAll();
  }, [deselectAll]);

  const value = {
    selectedItems,
    isSelecting,
    selectedCount: selectedItems.size,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    isSelected,
    startSelecting,
    stopSelecting
  };

  return (
    <BatchContext.Provider value={value}>
      {children}
    </BatchContext.Provider>
  );
};

/**
 * Hook to use batch operations
 */
export const useBatch = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatch must be used within a BatchProvider');
  }
  return context;
};

/**
 * Selection Checkbox Component
 */
export const SelectionCheckbox = ({ id, className = '' }) => {
  const { isSelecting, isSelected, toggleSelection } = useBatch();
  const selected = isSelected(id);

  if (!isSelecting) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      onClick={(e) => {
        e.stopPropagation();
        toggleSelection(id);
      }}
      className={`
        absolute top-3 left-3 z-20
        p-2 rounded-lg backdrop-blur-md
        transition-all duration-200
        ${selected 
          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
          : 'bg-black/40 text-white/70 hover:bg-black/60'
        }
        ${className}
      `}
    >
      {selected ? <CheckSquare size={18} /> : <Square size={18} />}
    </motion.button>
  );
};

/**
 * Batch Action Bar
 */
export const BatchActionBar = ({ 
  onDelete,
  onDownload,
  onTag,
  onMove,
  onArchive,
  onShare,
  isProcessing = false
}) => {
  const { selectedCount, stopSelecting, deselectAll } = useBatch();
  const [showMore, setShowMore] = useState(false);

  if (selectedCount === 0) return null;

  const actions = [
    { icon: Tag, label: '添加标签', onClick: onTag, show: !!onTag },
    { icon: Folder, label: '移动到', onClick: onMove, show: !!onMove },
    { icon: Archive, label: '归档', onClick: onArchive, show: !!onArchive },
    { icon: Share2, label: '分享', onClick: onShare, show: !!onShare },
  ].filter(action => action.show);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a]/90 backdrop-blur-xl 
                      rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
        {/* Selection Count */}
        <div className="flex items-center gap-3 px-2 border-r border-white/10">
          <span className="text-white font-medium">
            已选择 {selectedCount} 项
          </span>
          <button
            onClick={deselectAll}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-1">
          {onDownload && (
            <ActionButton 
              icon={Download} 
              label="下载" 
              onClick={onDownload}
              disabled={isProcessing}
            />
          )}
          
          {onDelete && (
            <ActionButton 
              icon={Trash2} 
              label="删除" 
              onClick={onDelete}
              variant="danger"
              disabled={isProcessing}
            />
          )}
        </div>

        {/* More Actions */}
        {actions.length > 0 && (
          <div className="relative">
            <ActionButton 
              icon={MoreHorizontal} 
              label="更多" 
              onClick={() => setShowMore(!showMore)}
              disabled={isProcessing}
            />
            
            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 py-2 min-w-[160px]
                           bg-[#0a0a0a]/95 backdrop-blur-xl rounded-xl
                           border border-white/10 shadow-xl"
                >
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        action.onClick();
                        setShowMore(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5
                               text-gray-300 hover:text-white hover:bg-white/5
                               transition-colors text-left"
                    >
                      <action.icon size={18} />
                      {action.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Cancel */}
        <button
          onClick={stopSelecting}
          className="ml-2 px-4 py-2 text-sm text-gray-400 hover:text-white
                   transition-colors border-l border-white/10"
        >
          取消
        </button>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 px-2">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
            <span className="text-sm text-gray-400">处理中...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Action Button
 */
const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled }) => {
  const variants = {
    default: 'hover:bg-white/10 text-gray-300 hover:text-white',
    danger: 'hover:bg-red-500/20 text-gray-300 hover:text-red-400'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        transition-all duration-200
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Icon size={18} />
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
};

/**
 * Batch Selection Toggle
 */
export const BatchSelectionToggle = () => {
  const { isSelecting, startSelecting, stopSelecting } = useBatch();

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={isSelecting ? stopSelecting : startSelecting}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
        transition-all duration-200
        ${isSelecting 
          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
        }
      `}
    >
      {isSelecting ? (
        <>
          <X size={16} />
          退出选择
        </>
      ) : (
        <>
          <CheckSquare size={16} />
          批量选择
        </>
      )}
    </motion.button>
  );
};

/**
 * Select All Checkbox
 */
export const SelectAllCheckbox = ({ items }) => {
  const { isSelecting, selectedCount, toggleSelectAll } = useBatch();
  const allSelected = selectedCount === items.length && items.length > 0;

  if (!isSelecting) return null;

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => toggleSelectAll(items)}
      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
    >
      {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
      {allSelected ? '取消全选' : '全选'}
    </motion.button>
  );
};

/**
 * Batch Tag Modal
 */
export const BatchTagModal = ({ isOpen, onClose, onConfirm, selectedCount }) => {
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(tags.split(',').map(t => t.trim()).filter(Boolean));
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl 
                   border border-white/10 p-6 shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-2">
          为 {selectedCount} 个项目添加标签
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          输入标签，用逗号分隔
        </p>
        
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="例如：风景, 旅行, 2024"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                   text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50
                   transition-colors mb-6"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-300
                     hover:bg-white/10 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!tags.trim() || isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white
                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            确认添加
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Batch Delete Confirmation
 */
export const BatchDeleteConfirm = ({ isOpen, onClose, onConfirm, selectedCount, itemName = '项目' }) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl 
                   border border-white/10 p-6 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <Trash2 size={24} className="text-red-400" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          删除 {selectedCount} 个{itemName}?
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          此操作无法撤销。这些{itemName}将被永久删除。
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-300
                     hover:bg-white/10 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white
                     hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            确认删除
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default {
  BatchProvider,
  useBatch,
  SelectionCheckbox,
  BatchActionBar,
  BatchSelectionToggle,
  SelectAllCheckbox,
  BatchTagModal,
  BatchDeleteConfirm
};
