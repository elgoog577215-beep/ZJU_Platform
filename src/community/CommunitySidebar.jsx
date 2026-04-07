import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function CommunitySidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const onCompose = () => {
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    toast(t('community.composer_toast_pending'));
  };

  return (
    <aside className="sidebar" aria-label={t('community.proto_sidebar_aria')}>
      <div className="sb-card">
        <h3>{t('community.sb_post_title')}</h3>
        <div className="sb-actions">
          <button type="button" onClick={onCompose}>
            {t('community.sb_post_help')}
          </button>
          <button type="button" onClick={onCompose}>
            {t('community.sb_post_discuss')}
          </button>
        </div>
      </div>
      <div className="sb-card sb-pulse">
        <h3>
          {t('community.sb_pulse_title')}
          <span className="sb-live">LIVE</span>
        </h3>
        <ul className="sb-stats">
          <li>
            <span className="sb-k">{t('community.sb_stat_posts')}</span>
            <span className="sb-v">24</span>
          </li>
          <li>
            <span className="sb-k">{t('community.sb_stat_open')}</span>
            <span className="sb-v">11</span>
          </li>
          <li>
            <span className="sb-k">{t('community.sb_stat_active')}</span>
            <span className="sb-v">1.4k</span>
          </li>
        </ul>
        <div className="sb-spark" aria-hidden />
        <p className="sb-pulse-note">{t('community.sb_pulse_note')}</p>
        <div className="sb-tag-cloud" role="group" aria-label={t('community.sb_tag_cloud_aria')}>
          <button type="button">CUDA</button>
          <button type="button">MCP</button>
          <button type="button">{t('community.filter_tag_pool')}</button>
          <button type="button">PyTorch</button>
        </div>
      </div>
      <div className="sb-card">
        <h3>{t('community.sb_quick_title')}</h3>
        <Link className="link" to="/community/help">
          {t('community.sb_quick_tags')}
        </Link>
        <Link className="link" to="/community/tech">
          {t('community.sb_quick_tech')}
        </Link>
        <Link className="link" to="/community/news">
          {t('community.sb_quick_news')}
        </Link>
        <Link className="link" to="/community/team">
          {t('community.sb_quick_meeting')}
        </Link>
        <Link className="link" to="/community/groups">
          {t('community.sb_quick_wx')}
        </Link>
        <Link className="link" to="/community/rules">
          {t('community.sb_quick_rules')}
        </Link>
      </div>
      <div className="sb-card">
        <h3>{t('community.sb_authors_title')}</h3>
        <div className="sub-row">
          <span className="sub-av" aria-hidden>
            陈
          </span>
          <div>
            <strong className="sb-author-name">{t('community.sb_author_1_name')}</strong>
            <br />
            <span className="sb-author-bio">{t('community.sb_author_1_bio')}</span>
          </div>
          <button type="button" className="sub-btn">
            {t('community.sb_subscribe')}
          </button>
        </div>
        <div className="sub-row">
          <span className="sub-av" aria-hidden>
            赵
          </span>
          <div>
            <strong className="sb-author-name">{t('community.sb_author_2_name')}</strong>
            <br />
            <span className="sb-author-bio">{t('community.sb_author_2_bio')}</span>
          </div>
          <button type="button" className="sub-btn">
            {t('community.sb_subscribe')}
          </button>
        </div>
      </div>
    </aside>
  );
}
