import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminInlineNote,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminTableCellText,
  AdminTableShell,
  FilterChip,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const ORG_TYPES = new Set(["club", "school", "enterprise", "organization"]);
const LEVELS = ["strong", "medium", "weak", "conflict"];

const getCandidateKey = (candidate) =>
  `${candidate.event_id || candidate.event?.id}:${candidate.target_profile_id}`;

const levelTone = {
  strong: "emerald",
  medium: "amber",
  weak: "slate",
  conflict: "rose",
};

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

const EventAttributionMigrationManager = () => {
  const { t } = useTranslation();
  const { isDayMode, headingTextClass, mutedTextClass, subtleTextClass } = useAdminTheme();
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [applying, setApplying] = useState(false);

  const organizationProfiles = useMemo(
    () => profiles.filter((profile) => ORG_TYPES.has(profile.type) && profile.status !== "archived"),
    [profiles],
  );

  const candidates = preview?.candidates || [];
  const visibleCandidates = useMemo(
    () => candidates.filter((candidate) => levelFilter === "all" || candidate.match_level === levelFilter),
    [candidates, levelFilter],
  );
  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedKeys.has(getCandidateKey(candidate))),
    [candidates, selectedKeys],
  );
  const selectableCandidates = useMemo(
    () => visibleCandidates.filter((candidate) => candidate.match_level !== "conflict"),
    [visibleCandidates],
  );

  useEffect(() => {
    let active = true;
    setProfilesLoading(true);
    api.get("/admin/profiles")
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        setProfiles(rows);
        const firstOrg = rows.find((profile) => ORG_TYPES.has(profile.type) && profile.status !== "archived");
        setSelectedProfileId((current) => current || (firstOrg ? String(firstOrg.id) : ""));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error.response?.data?.error || t("admin.attribution.load_profiles_failed"));
      })
      .finally(() => {
        if (active) setProfilesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  const fetchPreview = async () => {
    if (!selectedProfileId) {
      toast.error(t("admin.attribution.select_profile_first"));
      return;
    }
    setPreviewLoading(true);
    setSelectedKeys(new Set());
    try {
      const response = await api.get("/admin/event-attribution/candidates", {
        params: {
          profile_id: selectedProfileId,
          limit: 500,
        },
      });
      setPreview(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.attribution.preview_failed"));
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleCandidate = (candidate) => {
    if (candidate.match_level === "conflict") return;
    const key = getCandidateKey(candidate);
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      for (const candidate of selectableCandidates) {
        next.add(getCandidateKey(candidate));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedKeys(new Set());

  const applySelected = async () => {
    if (selectedCandidates.length === 0) {
      toast.error(t("admin.attribution.select_candidates_first"));
      return;
    }
    const confirmed = window.confirm(
      t("admin.attribution.apply_confirm", {
        count: selectedCandidates.length,
        defaultValue: "Apply attribution for {{count}} selected events? Original uploader and creation time will not be overwritten.",
      }),
    );
    if (!confirmed) return;

    setApplying(true);
    try {
      const response = await api.post("/admin/event-attribution/apply", {
        candidates: selectedCandidates.map((candidate) => ({
          event_id: candidate.event_id,
          target_profile_id: candidate.target_profile_id,
          match_level: candidate.match_level,
          confidence: candidate.confidence,
          matched_by: candidate.matched_by,
          evidence: candidate.evidence,
        })),
      });
      const appliedCount = response.data?.applied?.length || 0;
      const skippedCount = response.data?.skipped?.length || 0;
      toast.success(
        t("admin.attribution.apply_success", {
          applied: appliedCount,
          skipped: skippedCount,
          defaultValue: "Applied {{applied}} events and skipped {{skipped}}.",
        }),
      );
      await fetchPreview();
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.attribution.apply_failed"));
    } finally {
      setApplying(false);
    }
  };

  const profileOptions = organizationProfiles.map((profile) => ({
    value: String(profile.id),
    label: `${profile.display_name}${profile.type ? ` · ${profile.type}` : ""}`,
  }));

  const summary = preview?.summary || { total: 0, strong: 0, medium: 0, weak: 0, conflict: 0 };
  const chipLabel = (level) => t(`admin.attribution.levels.${level}`);
  const badgeClass = (level) => {
    const tone = levelTone[level] || "slate";
    if (tone === "emerald") return isDayMode ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/10 text-emerald-200";
    if (tone === "amber") return isDayMode ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-200";
    if (tone === "rose") return isDayMode ? "bg-rose-50 text-rose-700" : "bg-rose-500/10 text-rose-200";
    return isDayMode ? "bg-slate-100 text-slate-600" : "bg-white/10 text-gray-200";
  };

  return (
    <AdminPageShell
      title={t("admin.attribution.title")}
      description={t("admin.attribution.description")}
      actions={(
        <AdminButton
          tone="primary"
          onClick={fetchPreview}
          disabled={profilesLoading || previewLoading || !selectedProfileId}
        >
          <Search size={16} />
          {previewLoading ? t("admin.attribution.previewing") : t("admin.attribution.preview")}
        </AdminButton>
      )}
      toolbar={(
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className={`block text-sm font-semibold ${headingTextClass}`}>
            {t("admin.attribution.profile_label")}
            <select
              value={selectedProfileId}
              onChange={(event) => {
                setSelectedProfileId(event.target.value);
                setPreview(null);
                setSelectedKeys(new Set());
              }}
              className="theme-admin-input mt-2 w-full rounded-[6px] px-3 py-2.5 text-sm"
              disabled={profilesLoading}
            >
              {profileOptions.length === 0 ? (
                <option value="">{t("admin.attribution.no_profiles")}</option>
              ) : null}
              {profileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ToolbarGroup>
            <AdminButton tone="subtle" onClick={fetchPreview} disabled={previewLoading || !selectedProfileId}>
              <RefreshCw size={16} />
              {t("admin.attribution.refresh")}
            </AdminButton>
          </ToolbarGroup>
        </div>
      )}
    >
      <AdminInlineNote tone="warning">
        {t("admin.attribution.safety_note")}
      </AdminInlineNote>

      <div className="grid gap-3 md:grid-cols-4">
        <AdminMetricCard label={t("admin.attribution.metrics.total")} value={summary.total || 0} icon={GitBranch} />
        <AdminMetricCard label={t("admin.attribution.metrics.strong")} value={summary.strong || 0} icon={CheckCircle2} tone="emerald" />
        <AdminMetricCard label={t("admin.attribution.metrics.medium")} value={summary.medium || 0} icon={ShieldCheck} tone="amber" />
        <AdminMetricCard label={t("admin.attribution.metrics.conflict")} value={summary.conflict || 0} icon={AlertTriangle} tone="rose" />
      </div>

      <AdminPanel
        title={t("admin.attribution.candidates_title")}
        description={t("admin.attribution.candidates_desc")}
        action={(
          <ToolbarGroup>
            {["all", ...LEVELS].map((level) => (
              <FilterChip
                key={level}
                active={levelFilter === level}
                onClick={() => setLevelFilter(level)}
              >
                {level === "all" ? t("admin.attribution.levels.all") : chipLabel(level)}
              </FilterChip>
            ))}
          </ToolbarGroup>
        )}
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className={`text-sm ${mutedTextClass}`}>
            {t("admin.attribution.selected_count", {
              count: selectedCandidates.length,
              defaultValue: "{{count}} candidates selected",
            })}
          </div>
          <ToolbarGroup>
            <AdminButton tone="subtle" onClick={selectVisible} disabled={selectableCandidates.length === 0}>
              {t("admin.attribution.select_visible")}
            </AdminButton>
            <AdminButton tone="subtle" onClick={clearSelection} disabled={selectedCandidates.length === 0}>
              {t("admin.attribution.clear_selection")}
            </AdminButton>
            <AdminButton tone="success" onClick={applySelected} disabled={applying || selectedCandidates.length === 0}>
              {applying ? t("admin.attribution.applying") : t("admin.attribution.apply_selected")}
            </AdminButton>
          </ToolbarGroup>
        </div>

        {previewLoading ? (
          <div className={`py-8 text-center text-sm ${mutedTextClass}`}>
            {t("admin.attribution.previewing")}
          </div>
        ) : visibleCandidates.length === 0 ? (
          <AdminEmptyState
            icon={GitBranch}
            title={preview ? t("admin.attribution.empty_title") : t("admin.attribution.initial_title")}
            description={preview ? t("admin.attribution.empty_desc") : t("admin.attribution.initial_desc")}
          />
        ) : (
          <>
            <AdminTableShell minWidth={980}>
              <thead>
                <tr>
                  <th className="w-12 p-4">{t("admin.attribution.table.select")}</th>
                  <th className="p-4">{t("admin.attribution.table.event")}</th>
                  <th className="p-4">{t("admin.attribution.table.organizer")}</th>
                  <th className="p-4">{t("admin.attribution.table.level")}</th>
                  <th className="p-4">{t("admin.attribution.table.evidence")}</th>
                  <th className="p-4">{t("admin.attribution.table.current")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleCandidates.map((candidate) => {
                  const key = getCandidateKey(candidate);
                  const disabled = candidate.match_level === "conflict";
                  return (
                    <tr key={key} className="border-t border-[rgba(128,146,167,0.14)]">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(key)}
                          disabled={disabled}
                          onChange={() => toggleCandidate(candidate)}
                          aria-label={t("admin.attribution.select_candidate")}
                        />
                      </td>
                      <td className="p-4">
                        <AdminTableCellText strong>{candidate.event?.title || t("admin.attribution.untitled")}</AdminTableCellText>
                        <div className={`mt-1 text-xs ${mutedTextClass}`}>ID {candidate.event_id}</div>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText>{candidate.event?.organizer || t("admin.attribution.no_organizer")}</AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-[5px] px-2 py-1 text-xs font-semibold ${badgeClass(candidate.match_level)}`}>
                          {chipLabel(candidate.match_level)} · {formatPercent(candidate.confidence)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className={`max-w-sm text-xs leading-5 ${subtleTextClass}`}>{candidate.evidence}</div>
                        <div className={`mt-1 text-[11px] uppercase tracking-[0.12em] ${mutedTextClass}`}>{candidate.matched_by}</div>
                      </td>
                      <td className="p-4">
                        <div className={`text-xs leading-5 ${mutedTextClass}`}>
                          {t("admin.attribution.current_publisher", {
                            id: candidate.event?.publisher_profile_id || "-",
                            defaultValue: "Publisher: {{id}}",
                          })}
                          <br />
                          {t("admin.attribution.current_organizer", {
                            id: candidate.event?.organizer_profile_id || "-",
                            defaultValue: "Organizer: {{id}}",
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTableShell>

            <div className="space-y-2 md:hidden">
              {visibleCandidates.map((candidate) => {
                const key = getCandidateKey(candidate);
                const disabled = candidate.match_level === "conflict";
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleCandidate(candidate)}
                    className={`w-full rounded-[6px] border p-3 text-left ${
                      selectedKeys.has(key)
                        ? "border-indigo-400 bg-indigo-500/10"
                        : isDayMode
                          ? "border-slate-200 bg-white/80"
                          : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-semibold ${headingTextClass}`}>{candidate.event?.title || t("admin.attribution.untitled")}</div>
                        <div className={`mt-1 text-xs ${mutedTextClass}`}>{candidate.evidence}</div>
                      </div>
                      <span className={`shrink-0 rounded-[5px] px-2 py-1 text-xs font-semibold ${badgeClass(candidate.match_level)}`}>
                        {chipLabel(candidate.match_level)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </AdminPanel>
    </AdminPageShell>
  );
};

export default EventAttributionMigrationManager;
