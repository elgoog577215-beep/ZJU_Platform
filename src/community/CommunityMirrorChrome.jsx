import { useCallback, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { COMMUNITY_SECTIONS } from './constants';

export default function CommunityMirrorChrome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { uiMode, changeUiMode } = useSettings();
  const searchRef = useRef(null);

  const openSearch = useCallback(() => {
    window.dispatchEvent(new Event('open-search-palette'));
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="site-head" role="banner">
      <div className="site-head-inner">
        <button
          type="button"
          className="brand-cluster"
          aria-label={t('community.proto_brand_aria')}
          onClick={() => navigate('/community/help')}
        >
          <span className="brand-mark" aria-hidden />
          <span className="brand">{t('community.proto_brand_title')}</span>
        </button>
        <nav className="primary" aria-label={t('community.proto_primary_nav_aria')}>
          {COMMUNITY_SECTIONS.map((s) => (
            <NavLink
              key={s.slug}
              to={`/community/${s.slug}`}
              className={({ isActive }) => `nav-btn ${isActive ? 'on' : ''}`}
            >
              {t(s.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="head-end">
          <button
            type="button"
            className="theme-toggle"
            aria-label={t('community.proto_theme_toggle_aria')}
            title={t('community.proto_theme_toggle_title')}
            onClick={() => changeUiMode(uiMode === 'day' ? 'dark' : 'day')}
          >
            {uiMode === 'day' ? '☀' : '▣'}
          </button>
          <div className="search" role="search">
            <label className="sr-only" htmlFor="community-search-input">
              {t('community.proto_search_label')}
            </label>
            <input
              id="community-search-input"
              ref={searchRef}
              type="search"
              placeholder={t('community.proto_search_placeholder')}
              autoComplete="off"
              onFocus={openSearch}
              readOnly
            />
            <span className="search-hint-kbd" title={t('community.proto_search_kbd_hint')}>
              /
            </span>
          </div>
          <details className="post-dd">
            <summary>{t('community.proto_post_summary')}</summary>
            <div className="post-menu" role="menu">
              <button type="button" role="menuitem">
                {t('community.proto_post_help')}
              </button>
              <button type="button" role="menuitem">
                {t('community.proto_post_discuss')}
              </button>
              <button type="button" role="menuitem">
                {t('community.proto_post_tech')}
              </button>
              <button type="button" role="menuitem">
                {t('community.proto_post_news')}
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
