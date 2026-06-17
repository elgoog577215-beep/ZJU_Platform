import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Newspaper,
  Radio,
  Search,
  User,
  Users,
} from "lucide-react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";

const TYPE_META = {
  person: { label: "个人主页", icon: User, tone: "sky" },
  club: { label: "社团账号", icon: Users, tone: "violet" },
  school: { label: "学校/学院", icon: Building2, tone: "emerald" },
  enterprise: { label: "企业账号", icon: Building2, tone: "amber" },
  organization: { label: "组织账号", icon: Users, tone: "indigo" },
};

const FEED_TABS = [
  { key: "all", label: "全部", icon: Grid3X3 },
  { key: "events", label: "活动", icon: CalendarDays },
  { key: "articles", label: "文章", icon: FileText },
  { key: "news", label: "新闻", icon: Newspaper },
  { key: "media", label: "媒体", icon: ImageIcon },
  { key: "posts", label: "社区", icon: Radio },
];

const typeMeta = (type) => TYPE_META[type] || TYPE_META.organization;

const formatDate = (value) => {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
};

const profileImage = (profile) =>
  profile?.logo_url || profile?.avatar_url || profile?.cover_url || "";

const profileRoute = (profile) =>
  profile?.type === "person" ? `/u/${profile.handle}` : `/org/${profile.handle}`;

const feedTarget = (item) => {
  if (item.type === "event") return `/events?id=${item.id}`;
  if (item.type === "article") return `/articles?article=${item.id}`;
  if (item.type === "news") return `/articles?news=${item.id}`;
  return "";
};

const ProfileMark = ({ profile, isDayMode }) => {
  const src = profileImage(profile);
  const name = profile?.display_name || "Profile";
  if (src) {
    return (
      <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border md:h-24 md:w-24 ${
        isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.04]"
      }`}>
        <img src={src} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[8px] border text-2xl font-black md:h-24 md:w-24 ${
      isDayMode ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-white/[0.04] text-white"
    }`}>
      {String(name).replace(/\s+/g, "").slice(0, 2).toUpperCase()}
    </div>
  );
};

const FeedCard = ({ item, isDayMode }) => {
  const target = feedTarget(item);
  const content = (
    <article className={`group grid min-h-[148px] grid-cols-[108px_1fr] overflow-hidden rounded-[8px] border transition-colors md:grid-cols-[148px_1fr] ${
      isDayMode
        ? "border-slate-200 bg-white hover:border-sky-200"
        : "border-white/10 bg-white/[0.04] hover:border-white/20"
    }`}>
      <div className={`relative min-h-full ${isDayMode ? "bg-slate-100" : "bg-white/[0.04]"}`}>
        {item.cover ? (
          <img src={item.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full min-h-[148px] items-center justify-center">
            <FileText className={isDayMode ? "text-slate-400" : "text-white/35"} size={28} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col p-3 md:p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-[4px] border px-2 py-1 text-[11px] font-black uppercase ${
            isDayMode ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/[0.05] text-slate-300"
          }`}>
            {item.type}
          </span>
          {item.relation === "organized" ? (
            <span className={`rounded-[4px] px-2 py-1 text-[11px] font-bold ${
              isDayMode ? "bg-violet-50 text-violet-700" : "bg-indigo-500/15 text-indigo-100"
            }`}>
              主办关联
            </span>
          ) : null}
        </div>
        <h3 className={`line-clamp-2 text-base font-black leading-6 md:text-lg ${
          isDayMode ? "text-slate-950" : "text-white"
        }`}>
          {item.title}
        </h3>
        {item.excerpt ? (
          <p className={`mt-2 line-clamp-2 text-sm leading-6 ${
            isDayMode ? "text-slate-600" : "text-slate-300"
          }`}>
            {item.excerpt}
          </p>
        ) : null}
        <div className={`mt-auto flex items-center gap-3 pt-3 text-xs font-semibold ${
          isDayMode ? "text-slate-500" : "text-slate-400"
        }`}>
          {item.date ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              {formatDate(item.date)}
            </span>
          ) : null}
          {item.organizer ? (
            <span className="hidden min-w-0 items-center gap-1.5 md:inline-flex">
              <MapPin size={14} />
              <span className="truncate">{item.organizer}</span>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!target) return content;
  return (
    <Link to={target} className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/30">
      {content}
    </Link>
  );
};

const ProfilePage = ({ forcedHandle = null }) => {
  const params = useParams();
  const navigate = useNavigate();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const handle = forcedHandle || params.handle;
  const [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState([]);
  const [pagination, setPagination] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!handle) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get(`/profiles/${handle}`, { signal: controller.signal })
      .then((response) => setProfile(response.data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err);
        setProfile(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [handle]);

  useEffect(() => {
    if (!handle || error) return undefined;
    const controller = new AbortController();
    setFeedLoading(true);
    api
      .get(`/profiles/${handle}/feed`, {
        params: { type: activeTab, limit: 24 },
        signal: controller.signal,
      })
      .then((response) => {
        setFeed(Array.isArray(response.data?.data) ? response.data.data : []);
        setPagination(response.data?.pagination || {});
      })
      .catch(() => {
        if (!controller.signal.aborted) setFeed([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setFeedLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, error, handle]);

  const meta = useMemo(() => typeMeta(profile?.type), [profile?.type]);
  const TypeIcon = meta.icon;
  const description = profile?.description || profile?.bio || "这个主体还没有填写公开介绍。";

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-sky-500" size={28} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center ${
        isDayMode ? "text-slate-900" : "text-white"
      }`}>
        <Search className={isDayMode ? "text-slate-400" : "text-white/35"} size={48} />
        <h1 className="mt-5 text-2xl font-black">主体主页不存在</h1>
        <p className={`mt-2 text-sm ${isDayMode ? "text-slate-500" : "text-slate-400"}`}>
          这个 Profile 可能尚未创建、已归档，或 handle 已变更。
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
            isDayMode ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-white/5 text-white"
          }`}
        >
          <ArrowLeft size={16} />
          返回
        </button>
      </div>
    );
  }

  return (
    <section className={`min-h-screen px-4 py-8 md:px-8 md:py-12 ${
      isDayMode ? "bg-slate-50 text-slate-950" : "text-white"
    }`}>
      <SEO title={`${profile.display_name} - 主体主页`} description={description} />
      <div className="mx-auto w-full max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`mb-5 inline-flex min-h-10 items-center gap-2 rounded-[6px] border px-3 text-sm font-bold ${
            isDayMode ? "border-slate-200 bg-white text-slate-600 hover:text-slate-950" : "border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
          }`}
        >
          <ArrowLeft size={16} />
          返回
        </button>

        <header className={`overflow-hidden rounded-[8px] border ${
          isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.035]"
        }`}>
          <div className={`h-28 md:h-36 ${
            profile.cover_url
              ? ""
              : isDayMode
                ? "bg-[linear-gradient(120deg,#e0f2fe,#f8fafc,#dcfce7)]"
                : "bg-[linear-gradient(120deg,rgba(14,165,233,0.22),rgba(99,102,241,0.18),rgba(16,185,129,0.12))]"
          }`}>
            {profile.cover_url ? (
              <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className="grid gap-5 p-4 md:grid-cols-[auto_1fr_auto] md:gap-6 md:p-6">
            <ProfileMark profile={profile} isDayMode={isDayMode} />
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-xs font-black ${
                  isDayMode ? "border-sky-200 bg-sky-50 text-sky-700" : "border-sky-300/20 bg-sky-400/10 text-sky-100"
                }`}>
                  <TypeIcon size={14} />
                  {meta.label}
                </span>
                {profile.verified ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-black ${
                    isDayMode ? "bg-emerald-50 text-emerald-700" : "bg-emerald-400/10 text-emerald-100"
                  }`}>
                    <BadgeCheck size={14} />
                    已认证
                  </span>
                ) : null}
              </div>
              <h1 className="truncate text-3xl font-black leading-tight md:text-5xl">
                {profile.display_name}
              </h1>
              {profile.display_name_en ? (
                <p className={`mt-1 text-sm font-bold md:text-base ${
                  isDayMode ? "text-slate-500" : "text-slate-400"
                }`}>
                  {profile.display_name_en}
                </p>
              ) : null}
              <p className={`mt-4 max-w-3xl text-sm leading-7 md:text-base ${
                isDayMode ? "text-slate-600" : "text-slate-300"
              }`}>
                {description}
              </p>
              {profile.cooperation_direction ? (
                <p className={`mt-3 text-sm font-bold ${
                  isDayMode ? "text-violet-700" : "text-indigo-100"
                }`}>
                  {profile.cooperation_direction}
                </p>
              ) : null}
            </div>

            <div className="flex flex-row gap-2 md:flex-col md:items-end">
              {profile.link_url ? (
                <a
                  href={profile.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
                    isDayMode ? "border-slate-200 bg-white text-slate-700 hover:border-sky-200" : "border-white/10 bg-white/[0.04] text-white hover:border-white/20"
                  }`}
                >
                  外部链接
                  <ExternalLink size={16} />
                </a>
              ) : null}
              <Link
                to={profileRoute(profile)}
                className={`inline-flex min-h-11 items-center justify-center rounded-[6px] border px-4 text-sm font-mono font-bold ${
                  isDayMode ? "border-slate-200 bg-slate-50 text-slate-500" : "border-white/10 bg-white/[0.04] text-slate-400"
                }`}
              >
                @{profile.handle}
              </Link>
            </div>
          </div>

          <div className={`grid grid-cols-2 border-t md:grid-cols-4 ${
            isDayMode ? "border-slate-200" : "border-white/10"
          }`}>
            {[
              ["内容", profile.stats?.published_count || 0],
              ["活动", profile.stats?.event_count || 0],
              ["类型", meta.label],
              ["状态", profile.verified ? "认证" : "普通"],
            ].map(([label, value]) => (
              <div key={label} className={`px-4 py-4 ${
                isDayMode ? "border-slate-200" : "border-white/10"
              } md:border-r last:border-r-0`}>
                <div className={`text-xs font-black uppercase ${isDayMode ? "text-slate-400" : "text-slate-500"}`}>
                  {label}
                </div>
                <div className="mt-1 text-xl font-black">{value}</div>
              </div>
            ))}
          </div>
        </header>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {FEED_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[6px] border px-3 text-sm font-black ${
                  active
                    ? isDayMode
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-sky-300/25 bg-sky-400/10 text-sky-100"
                    : isDayMode
                      ? "border-slate-200 bg-white text-slate-600"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-4">
          {feedLoading ? (
            <div className={`flex min-h-56 items-center justify-center rounded-[8px] border ${
              isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.035]"
            }`}>
              <Loader2 className="animate-spin text-sky-500" size={24} />
            </div>
          ) : feed.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {feed.map((item) => (
                <FeedCard key={`${item.type}-${item.id}-${item.relation || "published"}`} item={item} isDayMode={isDayMode} />
              ))}
            </div>
          ) : (
            <div className={`flex min-h-64 flex-col items-center justify-center rounded-[8px] border border-dashed px-4 text-center ${
              isDayMode ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/[0.035] text-slate-400"
            }`}>
              <Grid3X3 size={34} />
              <h2 className={`mt-4 text-lg font-black ${isDayMode ? "text-slate-900" : "text-white"}`}>
                暂无公开内容
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6">
                这个主体还没有发布或关联到当前分类下的公开内容。
              </p>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 ? (
          <div className={`mt-5 text-center text-xs font-semibold ${
            isDayMode ? "text-slate-500" : "text-slate-400"
          }`}>
            第 {pagination.page || 1} / {pagination.totalPages} 页
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ProfilePage;
