import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { ClipboardList, ChevronLeft, ChevronRight, User } from 'lucide-react';
import api from '../../services/api';

const AuditLogViewer = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get(`/audit-logs?page=${page}&limit=20`);
      setLogs(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#111] p-6 rounded-2xl border border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
          <ClipboardList size={20} />
        </div>
        <h2 className="text-xl font-bold text-white">{t('admin.audit_logs.title')}</h2>
      </div>

      <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4">{t('admin.audit_logs.time')}</th>
                <th className="p-4">{t('admin.audit_logs.admin')}</th>
                <th className="p-4">{t('admin.audit_logs.action')}</th>
                <th className="p-4">{t('admin.audit_logs.resource')}</th>
                <th className="p-4">{t('admin.audit_logs.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">{t('common.loading')}...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">{t('admin.audit_logs.no_logs')}</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-gray-400 text-sm font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-500" />
                        <span className="font-bold text-white">{log.admin_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                        ${log.action === 'approved' ? 'bg-green-500/20 text-green-400' : 
                          log.action === 'rejected' ? 'bg-red-500/20 text-red-400' : 
                          'bg-blue-500/20 text-blue-400'}`}>
                        {t(`admin.audit_logs.actions.${log.action}`) || log.action}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-300">
                      {t(`admin.tabs.${log.resource_type}`) || log.resource_type} #{log.resource_id}
                    </td>
                    <td className="p-4 text-sm text-gray-500 italic">
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4">
            <button 
              disabled={pagination.page === 1}
              onClick={() => fetchLogs(pagination.page - 1)}
              className="p-2 bg-white/5 rounded-lg disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button 
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
              className="p-2 bg-white/5 rounded-lg disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogViewer;
