import api from '../services/api';

/**
 * 运营工具 - 数据导出和统计
 */

class OperationsManager {
  constructor() {
    this.exportFormats = ['json', 'csv', 'xlsx'];
  }

  /**
   * 导出数据
   * @param {string} endpoint - API 端点
   * @param {string} format - 导出格式
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Blob>} 导出的文件
   */
  async exportData(endpoint, format = 'json', filters = {}) {
    try {
      const response = await api.get(endpoint, {
        params: { format, ...filters },
        responseType: 'blob',
        silent: true
      });

      return response.data;
    } catch (error) {
      console.error('[Operations] Export failed:', error);
      throw error;
    }
  }

  /**
   * 下载文件
   * @param {Blob} blob - 文件 Blob
   * @param {string} filename - 文件名
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[Operations] Downloaded:', filename);
  }

  /**
   * 导出用户数据
   * @param {Object} filters - 过滤条件
   */
  async exportUsers(filters = {}) {
    const blob = await this.exportData('/admin/export/users', 'json', filters);
    const filename = `users-${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(blob, filename);
    return blob;
  }

  /**
   * 导出内容数据
   * @param {string} type - 内容类型 (posts, articles, etc.)
   * @param {Object} filters - 过滤条件
   */
  async exportContent(type, filters = {}) {
    const blob = await this.exportData(`/admin/export/${type}`, 'json', filters);
    const filename = `${type}-${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(blob, filename);
    return blob;
  }

  /**
   * 导出 CSV
   * @param {string} endpoint - API 端点
   * @param {Array} data - 数据
   * @param {string} filename - 文件名
   */
  exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      console.error('[Operations] No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header =>
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, filename);
  }

  /**
   * 获取统计数据
   * @param {string} type - 统计类型
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计数据
   */
  async getStatistics(type, filters = {}) {
    try {
      const response = await api.get(`/admin/stats/${type}`, {
        params: filters,
        silent: true
      });
      return response.data;
    } catch (error) {
      console.error('[Operations] Failed to get statistics:', error);
      return null;
    }
  }

  /**
   * 获取用户统计
   */
  async getUserStats(filters = {}) {
    return this.getStatistics('users', filters);
  }

  /**
   * 获取内容统计
   */
  async getContentStats(type, filters = {}) {
    return this.getStatistics(`content/${type}`, filters);
  }

  /**
   * 获取访问统计
   */
  async getAnalyticsStats(filters = {}) {
    return this.getStatistics('analytics', filters);
  }

  /**
   * 批量操作
   * @param {string} endpoint - API 端点
   * @param {Array} ids - 项目 ID 列表
   * @param {string} action - 操作类型
   * @returns {Promise<Object>} 操作结果
   */
  async batchOperation(endpoint, ids, action) {
    try {
      const response = await api.post(endpoint, {
        ids,
        action
      }, { silent: true });
      
      console.log('[Operations] Batch operation completed:', action);
      return response.data;
    } catch (error) {
      console.error('[Operations] Batch operation failed:', error);
      throw error;
    }
  }

  /**
   * 批量删除
   */
  async batchDelete(endpoint, ids) {
    return this.batchOperation(endpoint, ids, 'delete');
  }

  /**
   * 批量更新
   */
  async batchUpdate(endpoint, ids, updates) {
    try {
      const response = await api.put(endpoint, {
        ids,
        updates
      }, { silent: true });
      
      console.log('[Operations] Batch update completed');
      return response.data;
    } catch (error) {
      console.error('[Operations] Batch update failed:', error);
      throw error;
    }
  }

  /**
   * 生成报告
   * @param {string} type - 报告类型
   * @param {Object} options - 报告选项
   * @returns {Promise<Object>} 报告数据
   */
  async generateReport(type, options = {}) {
    try {
      const response = await api.post('/admin/reports/generate', {
        type,
        options
      }, { silent: true });
      
      console.log('[Operations] Report generated:', type);
      return response.data;
    } catch (error) {
      console.error('[Operations] Report generation failed:', error);
      throw error;
    }
  }

  /**
   * 下载报告
   * @param {string} reportId - 报告 ID
   */
  async downloadReport(reportId) {
    try {
      const response = await api.get(`/admin/reports/${reportId}/download`, {
        responseType: 'blob',
        silent: true
      });
      
      const blob = response.data;
      const filename = `report-${reportId}-${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadFile(blob, filename);
      
      return blob;
    } catch (error) {
      console.error('[Operations] Report download failed:', error);
      throw error;
    }
  }

  /**
   * 清理数据
   * @param {string} type - 数据类型
   * @param {Object} filters - 过滤条件
   */
  async cleanupData(type, filters = {}) {
    try {
      const response = await api.post(`/admin/cleanup/${type}`, filters, {
        silent: true
      });
      
      console.log('[Operations] Data cleanup completed:', type);
      return response.data;
    } catch (error) {
      console.error('[Operations] Data cleanup failed:', error);
      throw error;
    }
  }
}

// 创建单例
const operationsManager = new OperationsManager();

export default operationsManager;
