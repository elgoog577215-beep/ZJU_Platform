import { memo } from 'react';
import { motion } from 'framer-motion';
import { QrCode, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

const groups = [
  {
    id: 'wechat-main',
    nameKey: 'community.groups.wechat_main',
    descKey: 'community.groups.wechat_main_desc',
    qrPlaceholder: true,
  },
  {
    id: 'wechat-tech',
    nameKey: 'community.groups.wechat_tech',
    descKey: 'community.groups.wechat_tech_desc',
    qrPlaceholder: true,
  },
  {
    id: 'wechat-activity',
    nameKey: 'community.groups.wechat_activity',
    descKey: 'community.groups.wechat_activity_desc',
    qrPlaceholder: true,
  },
];

const GroupCard = memo(({ group, index, isDayMode }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className={`backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 ${
        isDayMode
          ? 'bg-white/82 border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)] hover:shadow-[0_24px_52px_rgba(148,163,184,0.18)]'
          : 'bg-[#1a1a1a]/60 border-white/10 hover:border-white/20'
      }`}
    >
      {/* QR Code area */}
      <div className={`w-full aspect-square rounded-2xl mb-5 flex items-center justify-center border-2 border-dashed ${
        isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
      }`}>
        <div className="text-center">
          <QrCode size={48} className={`mx-auto mb-3 ${isDayMode ? 'text-slate-300' : 'text-gray-600'}`} />
          <p className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('community.groups.qr_placeholder', '二维码待上传')}
          </p>
        </div>
      </div>

      <h3 className={`text-lg font-bold mb-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
        {t(group.nameKey)}
      </h3>
      <p className={`text-sm leading-relaxed ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
        {t(group.descKey)}
      </p>
    </motion.div>
  );
});
GroupCard.displayName = 'GroupCard';

const CommunityGroups = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';

  return (
    <div role="tabpanel" aria-labelledby="tab-groups">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center mb-8">
          <p className={`max-w-lg mx-auto text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('community.groups.subtitle', '扫描二维码加入我们的社群，获取最新消息与资源')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group, index) => (
            <GroupCard
              key={group.id}
              group={group}
              index={index}
              isDayMode={isDayMode}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default CommunityGroups;
