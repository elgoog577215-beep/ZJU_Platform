/**
 * 操作历史管理工具
 * 支持撤销/重做功能
 */

class ActionHistoryManager {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 50;
    this.history = [];
    this.currentIndex = -1;
    this.historyKey = 'action_history';
    
    // 从本地存储加载历史
    this.loadFromStorage();
  }

  /**
   * 记录操作
   * @param {Object} action - 操作对象
   * @param {string} action.type - 操作类型
   * @param {Object} action.data - 操作数据
   * @param {Object} action.previousState - 之前的状态
   * @param {Object} action.newState - 新的状态
   */
  record(action) {
    const actionRecord = {
      ...action,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };

    // 如果当前不在历史末尾，删除后面的历史
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新操作
    this.history.push(actionRecord);
    this.currentIndex = this.history.length - 1;

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }

    // 保存到本地存储
    this.saveToStorage();

    console.log('[ActionHistory] Recorded action:', action.type);
    return actionRecord.id;
  }

  /**
   * 撤销操作
   * @returns {Object|null} 撤销的操作
   */
  undo() {
    if (this.currentIndex < 0) {
      console.log('[ActionHistory] Nothing to undo');
      return null;
    }

    const action = this.history[this.currentIndex];
    console.log('[ActionHistory] Undoing action:', action.type);

    this.currentIndex--;
    this.saveToStorage();

    return action;
  }

  /**
   * 重做操作
   * @returns {Object|null} 重做的操作
   */
  redo() {
    if (this.currentIndex >= this.history.length - 1) {
      console.log('[ActionHistory] Nothing to redo');
      return null;
    }

    this.currentIndex++;
    const action = this.history[this.currentIndex];
    console.log('[ActionHistory] Redoing action:', action.type);

    this.saveToStorage();

    return action;
  }

  /**
   * 获取当前操作历史状态
   * @returns {Object} 历史状态
   */
  getHistoryState() {
    return {
      canUndo: this.currentIndex >= 0,
      canRedo: this.currentIndex < this.history.length - 1,
      currentIndex: this.currentIndex,
      totalHistory: this.history.length
    };
  }

  /**
   * 获取操作历史列表
   * @param {number} limit - 限制数量
   * @returns {Array} 操作历史
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * 清空历史
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    localStorage.removeItem(this.historyKey);
    console.log('[ActionHistory] History cleared');
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存到本地存储
   */
  saveToStorage() {
    try {
      const toSave = {
        history: this.history.slice(-this.maxHistory),
        currentIndex: this.currentIndex
      };
      localStorage.setItem(this.historyKey, JSON.stringify(toSave));
    } catch (error) {
      console.error('[ActionHistory] Failed to save to storage:', error);
    }
  }

  /**
   * 从本地存储加载
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.historyKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.history = parsed.history || [];
        this.currentIndex = parsed.currentIndex ?? -1;
        console.log('[ActionHistory] Loaded from storage');
      }
    } catch (error) {
      console.error('[ActionHistory] Failed to load from storage:', error);
      this.clear();
    }
  }
}

// 创建单例
const actionHistoryManager = new ActionHistoryManager();

// React Hook
export const useActionHistory = () => {
  const [historyState, setHistoryState] = React.useState(
    actionHistoryManager.getHistoryState()
  );

  const record = (action) => {
    actionHistoryManager.record(action);
    setHistoryState(actionHistoryManager.getHistoryState());
  };

  const undo = () => {
    const action = actionHistoryManager.undo();
    setHistoryState(actionHistoryManager.getHistoryState());
    return action;
  };

  const redo = () => {
    const action = actionHistoryManager.redo();
    setHistoryState(actionHistoryManager.getHistoryState());
    return action;
  };

  const canUndo = historyState.canUndo;
  const canRedo = historyState.canRedo;

  return {
    record,
    undo,
    redo,
    canUndo,
    canRedo,
    historyState,
    getHistory: actionHistoryManager.getHistory.bind(actionHistoryManager),
    clear: actionHistoryManager.clear.bind(actionHistoryManager)
  };
};

export default actionHistoryManager;
