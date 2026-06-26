import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Search, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";
import OfficialVerificationBadge from "./OfficialVerificationBadge";

const profilePath = (profile) =>
  profile.type === "person" ? `/u/${profile.handle}` : `/org/${profile.handle}`;

const ProfileDirectory = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const profileTypes = useMemo(
    () => [
      { value: "", label: t("profiles.types.all", "全部") },
      { value: "person", label: t("profiles.types.person", "个人") },
      { value: "club", label: t("profiles.types.club", "社团") },
      { value: "school", label: t("profiles.types.school", "学校") },
      { value: "enterprise", label: t("profiles.types.enterprise", "企业") },
      { value: "organization", label: t("profiles.types.organization", "组织") },
    ],
    [t],
  );

  const params = useMemo(() => {
    const next = {};
    if (debouncedQuery.trim()) next.q = debouncedQuery.trim();
    if (type) next.type = type;
    return next;
  }, [debouncedQuery, type]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const typeLabelFor = (value) =>
    profileTypes.find((item) => item.value === value)?.label ||
    t("profiles.types.subject", "主体");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get("/profiles", { params })
      .then((response) => {
        if (!active) return;
        setProfiles(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (active) setProfiles([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <div className={`min-h-screen px-4 pb-6 pt-[calc(env(safe-area-inset-top)+76px)] sm:px-6 md:py-8 lg:px-8 ${isDayMode ? "bg-slate-50 text-slate-950" : "bg-[#0d0f14] text-white"}`}>
      <SEO title={t("profiles.directory_title", "主体目录")} description={t("profiles.directory_desc", "浏览个人、社团、学校、企业和组织主体主页")} />
      <main className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between md:gap-4">
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.18em] md:text-xs md:tracking-[0.22em] ${isDayMode ? "text-indigo-700" : "text-indigo-300"}`}>Profiles</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:mt-2 md:text-3xl">
              {t("profiles.directory_title", "主体目录")}
            </h1>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <div className="relative min-w-0 flex-1 md:w-72">
              <Search className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${isDayMode ? "text-slate-400" : "text-white/40"}`} size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("profiles.search_placeholder", "搜索主体")}
                className={`min-h-10 w-full rounded-[6px] border py-2 pl-10 pr-3 text-sm outline-none md:min-h-[44px] md:py-2.5 ${isDayMode ? "border-slate-200 bg-white text-slate-950" : "border-white/10 bg-white/5 text-white"}`}
              />
            </div>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={`min-h-10 rounded-[6px] border px-3 py-2 text-sm outline-none md:min-h-[44px] md:py-2.5 ${isDayMode ? "border-slate-200 bg-white text-slate-950" : "border-white/10 bg-white/5 text-white"}`}
            >
              {profileTypes.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className={`rounded-[6px] border p-5 text-center text-sm md:p-8 ${isDayMode ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/[0.03] text-white/50"}`}>
            {t("common.loading")}
          </div>
        ) : profiles.length === 0 ? (
          <div className={`rounded-[6px] border p-5 text-center text-sm md:p-8 ${isDayMode ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/[0.03] text-white/50"}`}>
            {t("profiles.empty", "暂无匹配主体")}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => {
              const Icon = profile.type === "person" ? UserRound : Building2;
              const mark = profile.logo_url || profile.avatar_url;
              return (
                <Link
                  key={profile.id}
                  to={profilePath(profile)}
                  className={`group rounded-[6px] border p-3 transition md:p-4 ${isDayMode ? "border-slate-200 bg-white hover:border-indigo-200" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}
                >
                  <div className="flex items-start gap-2.5 md:gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border md:h-12 md:w-12 ${isDayMode ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"}`}>
                      {mark ? (
                        <img src={mark} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="truncate text-sm font-bold md:text-base">{profile.display_name}</h2>
                        <OfficialVerificationBadge profile={profile} compact isDayMode={isDayMode} />
                      </div>
                      <p className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-white/45"}`}>
                        {typeLabelFor(profile.type)} · @{profile.handle}
                      </p>
                      {(profile.bio || profile.description) ? (
                        <p className={`mt-2 line-clamp-2 text-xs leading-5 md:mt-3 md:text-sm md:leading-6 ${isDayMode ? "text-slate-600" : "text-white/65"}`}>
                          {profile.bio || profile.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfileDirectory;
