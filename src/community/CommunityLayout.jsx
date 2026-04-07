import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import SEO from '../components/SEO';
import { COMMUNITY_SECTIONS } from './constants';
import { platformAuthMe, platformHealth } from '../services/platformClient';
import CommunityMirrorChrome from './CommunityMirrorChrome';
import CommunitySidebar from './CommunitySidebar';
import CommunityPodcastFloat from './CommunityPodcastFloat';

import './zju-community-mirror.css';

export default function CommunityLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { uiMode } = useSettings();
  const theme = uiMode === 'day' ? 'light' : 'platform';

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    let cancelled = false;
    (async () => {
      const health = await platformHealth();
      if (!cancelled && !health.ok) {
        console.warn('[community dev smoke] GET /api/health failed', health);
      }
      const token = localStorage.getItem('token');
      if (token) {
        const me = await platformAuthMe();
        if (!cancelled && !me.ok) {
          console.warn('[community dev smoke] GET /api/auth/me failed', me);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sectionMatch = COMMUNITY_SECTIONS.find(
    (s) => location.pathname === `/community/${s.slug}`
  );

  return (
    <div className="zju-community-mirror" data-zcu-theme={theme}>
      <SEO title={t('nav.community')} description={t('community.seo_description')} />
      <CommunityMirrorChrome />
      <nav className="page-crumb" aria-label={t('community.breadcrumb_aria')}>
        <Link to="/">{t('community.breadcrumb_platform')}</Link>
        {' / '}
        <Link to="/community/help">{t('community.breadcrumb_community')}</Link>
        {sectionMatch ? (
          <>
            {' / '}
            <strong>{t(sectionMatch.labelKey)}</strong>
          </>
        ) : null}
      </nav>
      <div className="layout">
        <main className="main-col">
          <Outlet />
        </main>
        <CommunitySidebar />
      </div>
      <CommunityPodcastFloat />
    </div>
  );
}
