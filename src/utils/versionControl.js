import api from '../services/api';

/**
 * 数据版本控制工具
 * 支持内容版本管理、比较和恢复
 */

class VersionControlManager {
  constructor() {
    this.versionKey = 'app_versions';
    this.maxVersionsPerItem = 20;
    this.autoSaveInterval = 60000; // 1 分钟
  }

  /**
   * 创建新版本
   * @param {string} itemId - 项目 ID
   * @param {string} itemType - 项目类型 (post, article, etc.)
   * @param {Object} data - 版本数据
   * @param {string} message - 版本说明
   * @returns {string} 版本 ID
   */
  async createVersion(itemId, itemType, data, message = '') {
    const version = {
      id: this.generateId(),
      itemId,
      itemType,
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      message,
      timestamp: new Date().toISOString(),
      checksum: await this.calculateChecksum(data),
      size: JSON.stringify(data).length
    };

    // 保存到本地存储
    this.saveVersionToLocal(version);

    // 保存到服务器
    await this.saveVersionToServer(version);

    console.log('[VersionControl] Created version:', version.id);
    return version.id;
  }

  /**
   * 获取版本历史
   * @param {string} itemId - 项目 ID
   * @returns {Array} 版本历史
   */
  async getVersionHistory(itemId) {
    // 从本地存储获取
    const localVersions = this.getVersionsFromLocal(itemId);
    
    // 从服务器获取
    try {
      const response = await api.get(`/versions/${itemId}`, { silent: true });
      const serverVersions = response.data || [];
      
      // 合并并去重
      const allVersions = [...serverVersions, ...localVersions];
      const uniqueVersions = allVersions.filter(
        (v, i, self) => i === self.findIndex(t => t.id === v.id)
      );
      
      // 按时间排序
      return uniqueVersions.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (error) {
      return localVersions;
    }
  }

  /**
   * 获取特定版本
   * @param {string} versionId - 版本 ID
   * @returns {Object|null} 版本数据
   */
  async getVersion(versionId) {
    // 从本地存储获取
    const localVersion = this.getVersionFromLocal(versionId);
    if (localVersion) return localVersion;

    // 从服务器获取
    try {
      const response = await api.get(`/versions/${versionId}`, { silent: true });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * 恢复到特定版本
   * @param {string} versionId - 版本 ID
   * @returns {Object|null} 恢复的数据
   */
  async restoreToVersion(versionId) {
    const version = await this.getVersion(versionId);
    if (!version) {
      console.error('[VersionControl] Version not found:', versionId);
      return null;
    }

    // 验证校验和
    const valid = await this.verifyChecksum(version);
    if (!valid) {
      console.error('[VersionControl] Version checksum mismatch:', versionId);
      return null;
    }

    console.log('[VersionControl] Restored to version:', versionId);
    return version.data;
  }

  /**
   * 比较两个版本
   * @param {string} versionId1 - 版本 ID 1
   * @param {string} versionId2 - 版本 ID 2
   * @returns {Object} 比较结果
   */
  async compareVersions(versionId1, versionId2) {
    const version1 = await this.getVersion(versionId1);
    const version2 = await this.getVersion(versionId2);

    if (!version1 || !version2) {
      return null;
    }

    return {
      version1,
      version2,
      diff: this.calculateDiff(version1.data, version2.data),
      size1: version1.size,
      size2: version2.size,
      timestamp1: version1.timestamp,
      timestamp2: version2.timestamp
    };
  }

  /**
   * 删除版本
   * @param {string} versionId - 版本 ID
   */
  async deleteVersion(versionId) {
    // 从本地存储删除
    this.deleteVersionFromLocal(versionId);

    // 从服务器删除
    try {
      await api.delete(`/versions/${versionId}`, { silent: true });
    } catch (error) {
      // 忽略错误
    }

    console.log('[VersionControl] Deleted version:', versionId);
  }

  /**
   * 清理旧版本
   * @param {string} itemId - 项目 ID
   */
  async cleanupOldVersions(itemId) {
    const versions = await this.getVersionHistory(itemId);
    
    if (versions.length > this.maxVersionsPerItem) {
      const toDelete = versions.slice(this.maxVersionsPerItem);
      for (const version of toDelete) {
        await this.deleteVersion(version.id);
      }
      console.log('[VersionControl] Cleaned up old versions for:', itemId);
    }
  }

  /**
   * 自动保存版本
   * @param {string} itemId - 项目 ID
   * @param {string} itemType - 项目类型
   * @param {Object} data - 数据
   * @param {Function} getDataCallback - 获取数据的回调
   */
  startAutoSave(itemId, itemType, data, getDataCallback) {
    this.autoSaveTimer = setInterval(async () => {
      try {
        const currentData = getDataCallback ? getDataCallback() : data;
        if (currentData) {
          await this.createVersion(
            itemId,
            itemType,
            currentData,
            'Auto-save'
          );
        }
      } catch (error) {
        console.error('[VersionControl] Auto-save failed:', error);
      }
    }, this.autoSaveInterval);

    console.log('[VersionControl] Started auto-save for:', itemId);
  }

  /**
   * 停止自动保存
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      console.log('[VersionControl] Stopped auto-save');
    }
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算校验和
   */
  async calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * 验证校验和
   */
  async verifyChecksum(version) {
    const checksum = await this.calculateChecksum(version.data);
    return checksum === version.checksum;
  }

  /**
   * 计算差异（简化版）
   */
  calculateDiff(data1, data2) {
    const str1 = JSON.stringify(data1);
    const str2 = JSON.stringify(data2);
    
    return {
      added: str2.length - str1.length,
      changed: str1 !== str2,
      percentage: Math.abs(str2.length - str1.length) / Math.max(str1.length, 1) * 100
    };
  }

  /**
   * 保存到本地存储
   */
  saveVersionToLocal(version) {
    const versions = JSON.parse(localStorage.getItem(this.versionKey) || '{}');
    
    if (!versions[version.itemId]) {
      versions[version.itemId] = [];
    }
    
    versions[version.itemId].push(version);
    
    // 限制版本数量
    if (versions[version.itemId].length > this.maxVersionsPerItem) {
      versions[version.itemId].shift();
    }
    
    localStorage.setItem(this.versionKey, JSON.stringify(versions));
  }

  /**
   * 从本地存储获取版本
   */
  getVersionsFromLocal(itemId) {
    const versions = JSON.parse(localStorage.getItem(this.versionKey) || '{}');
    return versions[itemId] || [];
  }

  /**
   * 从本地存储获取特定版本
   */
  getVersionFromLocal(versionId) {
    const versions = JSON.parse(localStorage.getItem(this.versionKey) || '{}');
    
    for (const itemId in versions) {
      const version = versions[itemId].find(v => v.id === versionId);
      if (version) return version;
    }
    
    return null;
  }

  /**
   * 从本地存储删除版本
   */
  deleteVersionFromLocal(versionId) {
    const versions = JSON.parse(localStorage.getItem(this.versionKey) || '{}');
    
    for (const itemId in versions) {
      versions[itemId] = versions[itemId].filter(v => v.id !== versionId);
    }
    
    localStorage.setItem(this.versionKey, JSON.stringify(versions));
  }

  /**
   * 保存到服务器
   */
  async saveVersionToServer(version) {
    try {
      await api.post('/versions', version, { silent: true });
    } catch (error) {
      console.warn('[VersionControl] Failed to save to server:', error);
      // 本地版本仍然有效
    }
  }
}

// 创建单例
const versionControlManager = new VersionControlManager();

export default versionControlManager;
