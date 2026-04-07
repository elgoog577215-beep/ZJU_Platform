import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  COMMUNITY_SECTIONS,
  COMMUNITY_SECTION_SLUGS,
  HELP_PREVIEW_ROWS,
  HELP_TAG_KEYS,
} from './constants';

export default function CommunitySectionPage() {
  const { section } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const meta = COMMUNITY_SECTIONS.find((s) => s.slug === section);
  const valid = COMMUNITY_SECTION_SLUGS.has(section);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [helpTab, setHelpTab] = useState('all');
  const [tagOn, setTagOn] = useState(() => Object.fromEntries(HELP_TAG_KEYS.map((k) => [k, false])));

  useEffect(() => {
    if (!valid || section !== 'tech') return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .get('/articles', { params: { limit: 10 } })
      .then((res) => {
        const list = res.data?.data;
        if (!cancelled) setArticles(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section, valid]);

  const onCompose = () => {
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    toast(t('community.composer_toast_pending'));
  };

  if (!valid) {
    return <Navigate to="/community/help" replace />;
  }

  if (section === 'help') {
    const filteredRows = HELP_PREVIEW_ROWS.filter((row) => {
      if (helpTab === 'all') return true;
      if (helpTab === 'help') return row.stripe === 'help';
      if (helpTab === 'discuss') return row.stripe === 'discuss';
      return true;
    });

    return (
      <div className="zcu-page-swap" key="help">
        <div className="hero-strip hero-strip--home" id="hero-help">
          <div className="hero-inner">
            <h1>{t('community.help_hero_title')}</h1>
            <p>{t('community.help_hero_lead')}</p>
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label={t('community.help_tabs_aria')}>
          {[
            { id: 'all', label: t('community.tab_all') },
            { id: 'help', label: t('community.tab_help') },
            { id: 'discuss', label: t('community.tab_discuss') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={helpTab === tab.id}
              className={`tab ${helpTab === tab.id ? 'on' : ''}`}
              onClick={() => setHelpTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tag-filter-bar" role="region" aria-label={t('community.tag_filter_region_aria')}>
          <div className="tag-filter-head">
            <span className="tag-filter-label">{t('community.tag_bar_label')}</span>
            <span className="tag-filter-strategy" dangerouslySetInnerHTML={{ __html: t('community.tag_bar_strategy_html') }} />
            <button
              type="button"
              className="tag-filter-clear"
              onClick={() => setTagOn(Object.fromEntries(HELP_TAG_KEYS.map((k) => [k, false])))}
            >
              {t('community.tag_filter_clear')}
            </button>
          </div>
          <div className="tag-filter-scroll" role="toolbar" aria-label={t('community.tag_bar_label')}>
            {HELP_TAG_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`tag-filter-chip ${tagOn[key] ? 'on' : ''}`}
                aria-pressed={tagOn[key]}
                onClick={() => setTagOn((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
        <div id="help-feed" className="feed-list stagger">
          {filteredRows.map((row, i) => (
            <button type="button" key={i} className="row-feed" onClick={onCompose}>
              <span className={`stripe ${row.stripe}`} aria-hidden />
              <span className="row-body">
                <span className="row-title">{t(row.titleKey)}</span>
                {row.badges?.map((b) => (
                  <span key={b.labelKey} className={`badge ${b.cls}`}>
                    {t(b.labelKey)}
                  </span>
                ))}
                <div className="row-chips" aria-label={t('community.row_chips_aria')}>
                  {row.tagKeys.map((tk) => (
                    <span key={tk} className="tag-chip">
                      {t(tk)}
                    </span>
                  ))}
                </div>
                <div className="row-meta">{t(row.metaKey)}</div>
              </span>
            </button>
          ))}
        </div>
        <p className="proto-note">{t('community.preview_data_note')}</p>
      </div>
    );
  }

  if (section === 'tech') {
    return (
      <div className="zcu-page-swap" key="tech">
        <div className="hero-strip hero-strip--home">
          <div className="hero-inner">
            <h1>{t('community.tech_hero_title')}</h1>
            <p>{t('community.tech_hero_lead')}</p>
          </div>
        </div>
        <div className="feed-list stagger">
          {loading ? (
            <div className="empty-hint">{t('common.loading')}</div>
          ) : articles.length === 0 ? (
            <div className="empty-hint">{t('community.tech_empty')}</div>
          ) : (
            articles.map((a) => {
              const tags = a.tags
                ? String(a.tags)
                    .split(/[,\s]+/)
                    .filter(Boolean)
                    .slice(0, 6)
                : [];
              return (
                <button type="button" key={a.id} className="row-feed" onClick={onCompose}>
                  <span className="stripe help" aria-hidden />
                  <span className="row-body">
                    <span className="row-title">{a.title}</span>
                    {tags.length > 0 ? (
                      <div className="row-chips" aria-label={t('community.row_chips_aria')}>
                        {tags.map((tag) => (
                          <span key={tag} className="tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="row-meta">
                      {[a.excerpt, a.date].filter(Boolean).join(' · ')}
                    </div>
                  </span>
                </button>
              );
            })
          )}
        </div>
        <p className="proto-note">{t('community.write_path_pending')}</p>
      </div>
    );
  }

  if (section === 'rules') {
    return (
      <div className="zcu-page-swap" key="rules">
        <div className="card-article article-wide">
          <h1>{t('community.rules_page_title')}</h1>
          <div className="prose">
            <p>{t('community.rules_p1')}</p>
            <p>{t('community.rules_p2')}</p>
            <p>{t('community.rules_p3')}</p>
            <p>{t('community.rules_p4')}</p>
            <p dangerouslySetInnerHTML={{ __html: t('community.rules_p5_html') }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="zcu-page-swap" key={section}>
      <div className="hero-strip hero-strip--compact">
        <h1>{t(meta.labelKey)}</h1>
        <p>{t('community.section_placeholder', { section: t(meta.labelKey) })}</p>
      </div>
      <div className="card-article">
        <button type="button" className="tab on" style={{ cursor: 'pointer' }} onClick={onCompose}>
          {t('community.cta_composer')}
        </button>
        <p className="proto-note">{t('community.write_path_pending')}</p>
      </div>
    </div>
  );
}
