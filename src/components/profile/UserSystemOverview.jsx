import React from "react";
import { Bell, Briefcase, Loader2, UserCheck, Users } from "lucide-react";

const targetForCompletionKey = (key) => {
  if (key === "activityProfile") return "activity-profile";
  if (key === "identity" || key === "managedProfile") return "identity";
  return "profile-card";
};

const UserSystemOverview = ({ overview, loading, isDayMode, t, onOpenTarget }) => {
  const panelClass = isDayMode
    ? "border-slate-200 bg-white shadow-[0_18px_42px_rgba(148,163,184,0.12)]"
    : "border-white/10 bg-white/[0.045]";
  const mutedText = isDayMode ? "text-slate-500" : "text-gray-400";
  const titleText = isDayMode ? "text-slate-950" : "text-white";
  const tileClass = isDayMode
    ? "border-slate-200 bg-slate-50/80"
    : "border-white/10 bg-black/20";
  const percent = Math.max(0, Math.min(100, Number(overview?.profileCompletion?.percent) || 0));
  const completionItems = overview?.profileCompletion?.items || [];
  const pendingCount =
    (Number(overview?.contentSummary?.pending) || 0) +
    (Number(overview?.outcomeSummary?.candidate) || 0) +
    (Number(overview?.identitySummary?.pending) || 0);
  const statItems = [
    {
      key: "completion",
      icon: UserCheck,
      value: `${percent}%`,
      label: t("user_profile.system_overview.stats.completion"),
    },
    {
      key: "identities",
      icon: Briefcase,
      value: overview?.identitySummary?.verified || overview?.identitySummary?.total || 0,
      label: t("user_profile.system_overview.stats.identities"),
    },
    {
      key: "profiles",
      icon: Users,
      value: overview?.managedProfiles?.length || 0,
      label: t("user_profile.system_overview.stats.profiles"),
    },
    {
      key: "pending",
      icon: Bell,
      value: pendingCount,
      label: t("user_profile.system_overview.stats.pending"),
    },
  ];
  const quickActions = [
    ...completionItems
      .filter((item) => !item.completed)
      .map((item) => ({
        key: item.key,
        target: item.target || targetForCompletionKey(item.key),
        label: t(`user_profile.system_overview.completion_items.${item.key}`),
      })),
    ...(overview?.contentSummary?.pending > 0
      ? [{
          key: "pendingSubmissions",
          target: "submissions",
          label: t("user_profile.system_overview.actions.pending_submissions", {
            count: overview.contentSummary.pending,
          }),
        }]
      : []),
    ...(overview?.outcomeSummary?.candidate > 0
      ? [{
          key: "candidateOutcomes",
          target: "identity",
          label: t("user_profile.system_overview.actions.candidate_outcomes", {
            count: overview.outcomeSummary.candidate,
          }),
        }]
      : []),
  ].slice(0, 5);
  const contentStatusItems = ["approved", "pending", "drafts"]
    .map((key) => ({
      key,
      value: Number(overview?.contentSummary?.[key]) || 0,
    }))
    .filter((item) => item.value > 0);
  const openTarget = (target) => {
    if (onOpenTarget) onOpenTarget(target);
  };

  return (
    <section className={`mb-6 rounded-[8px] border p-4 md:p-6 ${panelClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className={`text-xs font-bold uppercase tracking-[0.18em] ${mutedText}`}>
            {t("user_profile.system_overview.eyebrow")}
          </div>
          <h2 className={`mt-2 text-xl font-bold md:text-2xl ${titleText}`}>
            {t("user_profile.system_overview.title")}
          </h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedText}`}>
            {t("user_profile.system_overview.subtitle")}
          </p>
        </div>
        {loading && (
          <div className={`inline-flex items-center gap-2 rounded-[6px] border px-3 py-2 text-xs font-bold ${tileClass} ${mutedText}`}>
            <Loader2 size={15} className="animate-spin" />
            {t("common.loading")}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map(({ key, icon: Icon, value, label }) => (
          <div key={key} className={`rounded-[8px] border p-4 ${tileClass}`}>
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[6px] ${isDayMode ? "bg-white text-indigo-600" : "bg-white/10 text-indigo-200"}`}>
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className={`text-2xl font-bold ${titleText}`}>{value}</div>
            <div className={`mt-1 text-xs font-semibold ${mutedText}`}>{label}</div>
          </div>
        ))}
      </div>

      <div className={`mt-5 rounded-[8px] border p-4 ${tileClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className={`text-sm font-bold ${titleText}`}>
            {t("user_profile.system_overview.completion_title")}
          </div>
          <div className={`text-sm font-bold ${isDayMode ? "text-indigo-600" : "text-indigo-200"}`}>
            {percent}%
          </div>
        </div>
        <div className={`mt-3 h-2 overflow-hidden rounded-full ${isDayMode ? "bg-slate-200" : "bg-white/10"}`}>
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {completionItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => openTarget(item.target || targetForCompletionKey(item.key))}
              className={`rounded-[6px] border px-3 py-2 text-xs font-bold transition-colors ${
                item.completed
                  ? isDayMode
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : isDayMode
                    ? "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t(`user_profile.system_overview.completion_items.${item.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className={`rounded-[8px] border p-4 ${tileClass}`}>
          <div className={`mb-3 text-sm font-bold ${titleText}`}>
            {t("user_profile.system_overview.actions.title")}
          </div>
          {quickActions.length === 0 ? (
            <p className={`text-sm ${mutedText}`}>{t("user_profile.system_overview.actions.empty")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => openTarget(action.target)}
                  className="inline-flex min-h-[38px] items-center rounded-[6px] bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`rounded-[8px] border p-4 ${tileClass}`}>
          <div className={`mb-3 text-sm font-bold ${titleText}`}>
            {t("user_profile.system_overview.managed_profiles")}
          </div>
          {overview?.managedProfiles?.length ? (
            <div className="space-y-2">
              {overview.managedProfiles.slice(0, 4).map((profile) => (
                <div key={profile.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`truncate text-sm font-bold ${titleText}`}>
                      {profile.display_name}
                    </div>
                    <div className={`text-xs ${mutedText}`}>
                      {t(`user_profile.system_overview.profile_types.${profile.type}`, profile.type)}
                      {profile.member_role ? ` · ${profile.member_role}` : ""}
                    </div>
                  </div>
                  {profile.verified && (
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${isDayMode ? "bg-emerald-50 text-emerald-700" : "bg-emerald-400/10 text-emerald-200"}`}>
                      {t("user_profile.system_overview.verified")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${mutedText}`}>{t("user_profile.system_overview.no_managed_profiles")}</p>
          )}
        </div>
      </div>

      {contentStatusItems.length > 0 && (
        <div className={`mt-5 flex flex-wrap gap-2 text-xs font-bold ${mutedText}`}>
          {contentStatusItems.map((item) => (
            <span key={item.key} className={`rounded-full border px-3 py-1.5 ${isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
              {t(`user_profile.system_overview.content_status.${item.key}`)} {item.value}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

export default UserSystemOverview;
