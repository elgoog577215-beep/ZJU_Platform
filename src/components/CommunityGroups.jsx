import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';

const PLATFORM_LABELS = { wechat: '微信', qq: 'QQ', discord: 'Discord', telegram: 'Telegram', other: '其他' };

const GroupCard = memo(({ group, index, isDayMode }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className={`backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 ${isDayMode ? 'bg-white/82 border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)] hover:shadow-[0_24px_52px_rgba(148,163,184,0.18)]' : 'bg-[#1a1a1a]/60 border-white/10 hover:border-white/20'}`}
    >
      {/* QR Code area */}
      <div className={`w-full aspect-square rounded-2xl mb-5 flex items-center justify-center border-2 border-dashed ${isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
        {group.qr_code_url ? (
          <img src={group.qr_code_url} alt={group.name} className="w-full h-full object-contain rounded-2xl" />
        ) : (
          <div className="text-center">
            <QrCode size={48} className={`mx-auto mb-3 ${isDayMode ? 'text-slate-300' : 'text-gray-600'}`} />
            <p className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('community.groups.qr_placeholder', '二维码待上传')}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{group.name}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isDayMode ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-gray-400 border-white/10'}`}>
          {PLATFORM_LABELS[group.platform] || group.platform}
        </span>
      </div>
      <p className={`text-sm leading-relaxed mb-4 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{group.description}</p>
      {group.invite_link && (
        <a href={group.invite_link} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isDayMode ? 'text-orange-600 hover:text-orange-700' : 'text-orange-300 hover:text-orange-200'}`}>
          {t('community.groups.join_link', '加入链接')}
          <ExternalLink size={14} />
        </a>
      )}
    </motion.div>
  );
});
GroupCard.displayName = 'GroupCard';

const CommunityGroups = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    api.get('/community/groups', { signal: ac.signal })
      .then((res) => setGroups(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <div role="tabpanel" aria-labelledby="tab-groups">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="text-center mb-8">
          <p className={`max-w-lg mx-auto text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('community.groups.subtitle', '扫描二维码加入我们的社群，获取最新消息与资源')}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <QrCode size={64} className="text-gray-500 mb-4 opacity-60" />
            <p className={`${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('community.groups.empty', '暂无社群')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group, index) => (
              <GroupCard key={group.id} group={group} index={index} isDayMode={isDayMode} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CommunityGroups;
