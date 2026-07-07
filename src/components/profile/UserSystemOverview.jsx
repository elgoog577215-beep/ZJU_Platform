import React from "react";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Loader2,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const targetForCompletionKey = (key) => {
  if (key === "nickname" || key === "avatar") return "profile-basics";
  if (key === "profileCard") return "profile-card-editor";
  if (key === "activityProfile") return "activity-profile";
  if (key === "identity") return "identity-claims";
  if (key === "managedProfile") return "managed-profiles";
  return "profile-basics";
};

const actionTargetForKey = (key) => {
  if (key === "check_submissions") return "submissions";
  if (key === "confirm_outcomes") return "outcome-claims";
  if (key === "claim_organization") return "managed-profiles";
  if (key === "review_identity") return "identity-claims";
  if (key?.startsWith("complete_")) {
    return targetForCompletionKey(key.replace("complete_", ""));
  }
  return "profile-basics";
};

const isBroadTarget = (target) => target === "identity" || target === "profile-card";

const resolveCompletionTarget = (item) =>
  item?.target && !isBroadTarget(item.target)
    ? item.target
    : targetForCompletionKey(item?.key);

const resolveActionTarget = (action) =>
  action?.target && !isBroadTarget(action.target)
    ? action.target
    : actionTargetForKey(action?.key);

const scopeLabelKey = (scope) =>
  scope === "core_partner"
    ? "user_profile.system_overview.partner_scope.core"
    : "user_profile.system_overview.partner_scope.activity";

const UserSystemOverview = ({ overview, loading, isDayMode, t, onOpenTarget }) => {
  const panelClass = isDayMode
    ? "border-slate-200 bg-white shadow-[0_18px_42px_rgba(148,163,184,0.12)]"
    : "border-white/10 bg-white/[0.045]";
  const mutedText = isDayMode ? "text-slate-500" : "text-gray-400";
  const titleText = isDayMode ? "text-slate-950" : "text-white";
  const moduleClass = isDayMode
    ? "border-slate-200 bg-slate-50/85"
    : "border-white/10 bg-black/20";
  const buttonClass = "inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[6px] px-3 py-2 text-xs font-bold transition-colors";
  const percent = Math.max(0, Math.min(100, Number(overview?.profileCompletion?.percent) || 0));
  const completionItems = overview?.profileCompletion?.items || [];
  const permission = overview?.permissionSummary || {};
  const accountType = permission.accountType || overview?.account?.account_type || "personal";
  const reviewPermission = permission.reviewPermission || overview?.account?.review_permission || "normal";
  const organizationWorkspace = overview?.organizationWorkspace || {};
  const managedOrganizations = organizationWorkspace.managed || [];
  const pendingCount =
    (Number(overview?.contentSummary?.pending) || 0) +
    (Number(overview?.outcomeSummary?.candidate) || 0) +
    (Number(overview?.identitySummary?.pending) || 0);
  const openTarget = (target) => {
    if (onOpenTarget) onOpenTarget(target);
  };

  const generatedActions = [
    ...completionItems
      .filter((item) => !item.completed)
      .map((item) => ({
        key: `complete_${item.key}`,
        target: resolveCompletionTarget(item),
      })),
    ...(overview?.contentSummary?.pending > 0
      ? [{ key: "check_submissions", target: "submissions", count: overview.contentSummary.pending }]
      : []),
    ...(overview?.outcomeSummary?.candidate > 0
      ? [{ key: "confirm_outcomes", target: "identity", count: overview.outcomeSummary.candidate }]
      : []),
  ];
  const nextActions = (overview?.nextActions?.length ? overview.nextActions : generatedActions).slice(0, 6);

  const topStats = [
    {
      key: "account",
      icon: accountType === "organization" ? Briefcase : UserRound,
      label: t("user_profile.system_overview.stats.account_type"),
      value: t(`user_profile.system_overview.account_type.${accountType}`),
      target: "profile-basics",
      tone: isDayMode ? "text-sky-700" : "text-sky-200",
    },
    {
      key: "permission",
      icon: ShieldCheck,
      label: t("user_profile.system_overview.stats.review_permission"),
      value: t(`user_profile.system_overview.review_permission.${reviewPermission}`),
      target: "submissions",
      tone: permission.canBypassReview
        ? isDayMode ? "text-emerald-700" : "text-emerald-200"
        : isDayMode ? "text-amber-700" : "text-amber-200",
    },
    {
      key: "organizations",
      icon: Users,
      label: t("user_profile.system_overview.stats.organizations"),
      value: organizationWorkspace.total || managedOrganizations.length || 0,
      target: "managed-profiles",
      tone: isDayMode ? "text-violet-700" : "text-violet-200",
    },
    {
      key: "pending",
      icon: Bell,
      label: t("user_profile.system_overview.stats.pending"),
      value: pendingCount,
      target: overview?.contentSummary?.pending > 0
        ? "submissions"
        : overview?.outcomeSummary?.candidate > 0
          ? "outcome-claims"
          : "identity-claims",
      tone: pendingCount > 0
        ? isDayMode ? "text-rose-700" : "text-rose-200"
        : isDayMode ? "text-slate-700" : "text-slate-200",
    },
  ];

  const contentStatusItems = ["approved", "pending", "drafts", "rejected"]
    .map((key) => ({
      key,
      value: Number(overview?.contentSummary?.[key]) || 0,
    }))
    .filter((item) => item.value > 0);

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
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedText}`}>
            {t("user_profile.system_overview.subtitle")}
          </p>
        </div>
        {loading ? (
          <div className={`inline-flex items-center gap-2 rounded-[6px] border px-3 py-2 text-xs font-bold ${moduleClass} ${mutedText}`}>
            <Loader2 size={15} className="animate-spin" />
            {t("common.loading")}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {topStats.map(({ key, icon: Icon, value, label, target, tone }) => (
          <button
            key={key}
            type="button"
            onClick={() => openTarget(target)}
            data-testid={`user-system-stat-${key}`}
            className={`rounded-[8px] border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
              isDayMode
                ? `${moduleClass} hover:border-indigo-200 hover:bg-white`
                : `${moduleClass} hover:border-white/20 hover:bg-white/[0.07]`
            }`}
            aria-label={`${label}: ${value}`}
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[6px] ${isDayMode ? "bg-white" : "bg-white/10"} ${tone}`}>
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className={`text-2xl font-bold ${titleText}`}>{value}</div>
            <div className={`mt-1 text-xs font-semibold ${mutedText}`}>{label}</div>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <div className={`rounded-[8px] border p-4 ${moduleClass}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={`text-sm font-bold ${titleText}`}>
                {t("user_profile.system_overview.completion_title")}
              </div>
              <div className={`mt-1 text-xs leading-5 ${mutedText}`}>
                {t("user_profile.system_overview.completion_desc")}
              </div>
            </div>
            <div className={`text-xl font-black ${isDayMode ? "text-indigo-600" : "text-indigo-200"}`}>
              {percent}%
            </div>
          </div>
          <div className={`mt-4 h-2 overflow-hidden rounded-full ${isDayMode ? "bg-slate-200" : "bg-white/10"}`}>
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {completionItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openTarget(resolveCompletionTarget(item))}
                data-testid={`user-system-completion-${item.key}`}
                className={`flex min-h-10 items-center justify-between gap-2 rounded-[6px] border px-3 text-left text-xs font-bold transition-colors ${
                  item.completed
                    ? isDayMode
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : isDayMode
                      ? "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
                      : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{t(`user_profile.system_overview.completion_items.${item.key}`)}</span>
                {item.completed ? <CheckCircle2 size={15} /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-[8px] border p-4 ${moduleClass}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className={`text-sm font-bold ${titleText}`}>
                {t("user_profile.system_overview.actions.title")}
              </div>
              <div className={`mt-1 text-xs leading-5 ${mutedText}`}>
                {t("user_profile.system_overview.actions.desc")}
              </div>
            </div>
            <ClipboardList size={18} className={mutedText} />
          </div>
          {nextActions.length === 0 ? (
            <p className={`text-sm ${mutedText}`}>{t("user_profile.system_overview.actions.empty")}</p>
          ) : (
            <div className="grid gap-2">
              {nextActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => openTarget(resolveActionTarget(action))}
                  data-testid={`user-system-action-${action.key}`}
                  className={`${buttonClass} justify-between border text-left ${
                    isDayMode
                      ? "border-indigo-100 bg-white text-indigo-700 hover:border-indigo-200"
                      : "border-indigo-300/20 bg-indigo-400/10 text-indigo-100 hover:bg-indigo-400/15"
                  }`}
                >
                  <span>{t(`user_profile.system_overview.next_actions.${action.key}`)}</span>
                  {action.count ? <span className="tabular-nums">{action.count}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className={`rounded-[8px] border p-4 ${moduleClass}`}>
          <div className={`mb-3 text-sm font-bold ${titleText}`}>
            {t("user_profile.system_overview.organization_workspace.title")}
          </div>
          {managedOrganizations.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {managedOrganizations.slice(0, 6).map((profile) => {
                const logo = profile.logo_url || profile.avatar_url || profile.cover_url;
                return (
                  <a
                    key={profile.id}
                    href={profile.handle ? `/org/${profile.handle}` : undefined}
                    className={`flex min-w-0 gap-3 rounded-[8px] border p-3 transition-colors ${
                      isDayMode
                        ? "border-slate-200 bg-white hover:border-violet-200"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border ${
                      isDayMode ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/20"
                    }`}>
                      {logo ? (
                        <img src={logo} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Users size={18} className={mutedText} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`truncate text-sm font-bold ${titleText}`}>{profile.display_name}</div>
                      <div className={`mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold ${mutedText}`}>
                        <span>{t(`user_profile.system_overview.profile_types.${profile.type}`, profile.type)}</span>
                        {profile.member_role ? <span>{profile.member_role}</span> : null}
                        {profile.partner?.partner_scope ? (
                          <span>{t(scopeLabelKey(profile.partner.partner_scope))}</span>
                        ) : null}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className={`rounded-[8px] border border-dashed p-4 text-sm leading-6 ${isDayMode ? "border-slate-200 bg-white text-slate-600" : "border-white/10 bg-white/5 text-gray-300"}`}>
              {t("user_profile.system_overview.no_managed_profiles")}
              <button
                type="button"
                onClick={() => openTarget("identity")}
                className={`mt-3 ${buttonClass} border ${
                  isDayMode ? "border-violet-200 bg-violet-50 text-violet-700" : "border-violet-300/20 bg-violet-400/10 text-violet-100"
                }`}
              >
                {t("user_profile.system_overview.organization_workspace.claim")}
              </button>
            </div>
          )}
        </div>

        <div className={`rounded-[8px] border p-4 ${moduleClass}`}>
          <div className={`mb-3 text-sm font-bold ${titleText}`}>
            {t("user_profile.system_overview.content_title")}
          </div>
          {contentStatusItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {contentStatusItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openTarget(item.key === "pending" ? "submissions" : "published")}
                  className={`rounded-[8px] border p-3 text-left ${
                    isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className={`text-xl font-black ${titleText}`}>{item.value}</div>
                  <div className={`mt-1 text-xs font-bold ${mutedText}`}>
                    {t(`user_profile.system_overview.content_status.${item.key}`)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${mutedText}`}>{t("user_profile.system_overview.content_empty")}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default UserSystemOverview;
