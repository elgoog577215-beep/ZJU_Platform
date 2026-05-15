import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  GraduationCap,
  Image as ImageIcon,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api, { uploadFile } from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminIconButton,
  AdminInlineNote,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminTableCellText,
  AdminTableShell,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  StatusBadge,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const blankCompetition = {
  title: "",
  subtitle: "",
  description: "",
  event_date: "",
  cover_image: "",
  status: "active",
  is_featured: false,
};

const blankMedia = {
  type: "stage_photo",
  title: "",
  description: "",
  url: "",
  cover_url: "",
  sort_order: 0,
  status: "approved",
  file: null,
  coverFile: null,
};

const blankWork = {
  title: "",
  author: "",
  summary: "",
  git_url: "",
  award: "",
  rank: "",
  cover_url: "",
  sort_order: 0,
  status: "approved",
  coverFile: null,
};

const statusOptions = [
  { value: "approved", label: "已通过" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "已驳回" },
];

const mediaTypeOptions = [
  { value: "stage_photo", label: "赛场照片" },
  { value: "promo_video", label: "赛事宣传片" },
];

const competitionStatusOptions = [
  { value: "active", label: "启用" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "归档" },
];

const competitionStatusLabels = competitionStatusOptions.reduce((accumulator, option) => {
  accumulator[option.value] = option.label;
  return accumulator;
}, {});

const competitionStatusTone = {
  active: "approved",
  draft: "pending",
  archived: "closed",
};

const gradeLabels = {
  freshman: "大一",
  sophomore: "大二",
  junior: "大三",
  senior: "大四",
  master: "硕士",
  phd: "博士",
};

const aiToolLabels = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  trae: "Trae",
  other: "其他",
};

const safeParseTools = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const uploadAsset = async (file, fieldName = "file") => {
  if (!file) return null;
  const formData = new FormData();
  formData.append(fieldName, file);
  const response = await uploadFile("/upload", formData);
  return fieldName === "cover" ? response.data.coverUrl : response.data.fileUrl;
};

const Field = ({ label, children }) => (
  <label className="grid gap-1.5 text-sm font-semibold">
    <span>{label}</span>
    {children}
  </label>
);

const inputClass = "theme-admin-input min-h-[40px] rounded-xl px-3 py-2 text-sm";

const toCount = (value) => Number(value || 0);

const packageStats = (competition) => [
  ["宣传片", toCount(competition.promo_video_count)],
  ["照片", toCount(competition.stage_photo_count)],
  ["作品", toCount(competition.works_count)],
  ["待审", toCount(competition.pending_count)],
];

const competitionMetaText = (competition) => {
  const parts = [competition?.subtitle, competition?.event_date].filter(Boolean);
  return parts.length ? parts.join(" · ") : "未填写副标题或日期";
};

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("zh-CN") : "未知时间";

const formatNumber = (value) =>
  new Intl.NumberFormat("zh-CN").format(Number(value || 0));

const HackathonManager = () => {
  const { isDayMode, headingTextClass, mutedTextClass } = useAdminTheme();
  const [activeTab, setActiveTab] = useState("outcomes");
  const [registrations, setRegistrations] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [works, setWorks] = useState([]);
  const [competitionForm, setCompetitionForm] = useState(blankCompetition);
  const [mediaForm, setMediaForm] = useState(blankMedia);
  const [workForm, setWorkForm] = useState(blankWork);
  const [editingCompetitionId, setEditingCompetitionId] = useState(null);
  const [editingMediaId, setEditingMediaId] = useState(null);
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const selectedCompetition = useMemo(
    () => competitions.find((competition) => String(competition.id) === String(selectedCompetitionId)) || null,
    [competitions, selectedCompetitionId],
  );

  const featuredCompetition = useMemo(
    () => competitions.find((competition) => competition.is_featured) || null,
    [competitions],
  );

  const fetchRegistrations = async () => {
    const response = await api.get("/admin/hackathon/registrations");
    setRegistrations(Array.isArray(response.data) ? response.data : []);
  };

  const fetchCompetitions = async () => {
    const response = await api.get("/admin/competitions");
    const rows = Array.isArray(response.data) ? response.data : [];
    setCompetitions(rows);
    setSelectedCompetitionId((previous) => {
      if (previous && rows.some((competition) => String(competition.id) === String(previous))) {
        return previous;
      }
      return rows[0]?.id ? String(rows[0].id) : "";
    });
  };

  const fetchAssets = async (competitionId = selectedCompetitionId) => {
    if (!competitionId) {
      setMediaItems([]);
      setWorks([]);
      return;
    }
    const [mediaResponse, worksResponse] = await Promise.all([
      api.get("/admin/competition-media", { params: { competition_id: competitionId, status: "all" } }),
      api.get("/admin/competition-works", { params: { competition_id: competitionId, status: "all" } }),
    ]);
    setMediaItems(Array.isArray(mediaResponse.data) ? mediaResponse.data : []);
    setWorks(Array.isArray(worksResponse.data) ? worksResponse.data : []);
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRegistrations(), fetchCompetitions()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "加载比赛成果包管理数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    fetchAssets().catch((error) => {
      toast.error(error.response?.data?.error || "加载比赛成果失败");
    });
  }, [selectedCompetitionId]);

  const stats = useMemo(
    () => ({
      registrations: registrations.length,
      competitions: competitions.length,
      pending: competitions.reduce((sum, item) => sum + Number(item.pending_count || 0), 0),
      outcomes: competitions.reduce(
        (sum, item) =>
          sum +
          Number(item.promo_video_count || 0) +
          Number(item.stage_photo_count || 0) +
          Number(item.works_count || 0),
        0,
      ),
    }),
    [competitions, registrations.length],
  );

  const filteredRegistrations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return registrations.filter((registration) => {
      const matchesSearch =
        !query ||
        [
          registration.name,
          registration.student_id,
          registration.major,
          registration.grade,
          registration.experience,
          safeParseTools(registration.ai_tools).join(" "),
        ]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(query));

      const matchesGrade = gradeFilter ? registration.grade === gradeFilter : true;
      return matchesSearch && matchesGrade;
    });
  }, [gradeFilter, registrations, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRegistrations.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedRegistrations = filteredRegistrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const registrationStats = useMemo(() => {
    const byGrade = registrations.reduce((accumulator, registration) => {
      const grade = registration.grade || "unknown";
      accumulator[grade] = (accumulator[grade] || 0) + 1;
      return accumulator;
    }, {});

    return {
      total: registrations.length,
      filtered: filteredRegistrations.length,
      undergraduate:
        (byGrade.freshman || 0) +
        (byGrade.sophomore || 0) +
        (byGrade.junior || 0) +
        (byGrade.senior || 0),
      graduate: (byGrade.master || 0) + (byGrade.phd || 0),
    };
  }, [filteredRegistrations.length, registrations]);

  const updateCompetitionForm = (field, value) =>
    setCompetitionForm((previous) => ({ ...previous, [field]: value }));
  const updateMediaForm = (field, value) =>
    setMediaForm((previous) => ({ ...previous, [field]: value }));
  const updateWorkForm = (field, value) =>
    setWorkForm((previous) => ({ ...previous, [field]: value }));

  const changeMediaType = (type) => {
    setMediaForm((previous) => ({
      ...previous,
      type,
      coverFile: type === "promo_video" ? previous.coverFile : null,
      cover_url: type === "promo_video" ? previous.cover_url : "",
    }));
  };

  const resetCompetitionForm = () => {
    setEditingCompetitionId(null);
    setCompetitionForm(blankCompetition);
  };

  const resetMediaForm = () => {
    setEditingMediaId(null);
    setMediaForm(blankMedia);
  };

  const resetWorkForm = () => {
    setEditingWorkId(null);
    setWorkForm(blankWork);
  };

  const saveCompetition = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      let nextSelectedId = selectedCompetitionId;
      if (editingCompetitionId) {
        const response = await api.put(`/admin/competitions/${editingCompetitionId}`, competitionForm);
        nextSelectedId = response.data?.id || editingCompetitionId;
        toast.success("比赛成果包已更新");
      } else {
        const response = await api.post("/admin/competitions", competitionForm);
        nextSelectedId = response.data.id;
        toast.success("比赛成果包已创建");
      }
      setSelectedCompetitionId(String(nextSelectedId));
      resetCompetitionForm();
      await fetchCompetitions();
      await fetchAssets(nextSelectedId);
    } catch (error) {
      toast.error(error.response?.data?.error || "保存比赛成果包失败");
    } finally {
      setSaving(false);
    }
  };

  const saveMedia = async (event) => {
    event.preventDefault();
    if (!selectedCompetitionId) {
      toast.error("请先创建或选择比赛成果包");
      return;
    }
    setSaving(true);
    try {
      const fileUrl = await uploadAsset(mediaForm.file, "file");
      const coverUrl = mediaForm.type === "promo_video" ? await uploadAsset(mediaForm.coverFile, "cover") : null;
      const payload = {
        ...mediaForm,
        competition_id: selectedCompetitionId,
        url: fileUrl || mediaForm.url,
        cover_url: mediaForm.type === "promo_video" ? coverUrl || mediaForm.cover_url : "",
      };
      delete payload.file;
      delete payload.coverFile;

      if (editingMediaId) {
        await api.put(`/admin/competition-media/${editingMediaId}`, payload);
        toast.success("素材已更新");
      } else {
        await api.post("/admin/competition-media", payload);
        toast.success("素材已发布");
      }
      resetMediaForm();
      await fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.error || "保存素材失败");
    } finally {
      setSaving(false);
    }
  };

  const saveWork = async (event) => {
    event.preventDefault();
    if (!selectedCompetitionId) {
      toast.error("请先创建或选择比赛成果包");
      return;
    }
    setSaving(true);
    try {
      const coverUrl = await uploadAsset(workForm.coverFile, "file");
      const payload = {
        ...workForm,
        competition_id: selectedCompetitionId,
        cover_url: coverUrl || workForm.cover_url,
      };
      delete payload.coverFile;

      if (editingWorkId) {
        await api.put(`/admin/competition-works/${editingWorkId}`, payload);
        toast.success("作品已更新");
      } else {
        await api.post("/admin/competition-works", payload);
        toast.success("作品已发布");
      }
      resetWorkForm();
      await fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.error || "保存作品失败");
    } finally {
      setSaving(false);
    }
  };

  const reviewItem = async (kind, id, status) => {
    const endpoint =
      kind === "media"
        ? `/admin/competition-media/${id}/review`
        : `/admin/competition-works/${id}/review`;
    await api.put(endpoint, { status, reason: status === "rejected" ? "管理员驳回" : "" });
    await fetchAssets();
    await fetchCompetitions();
    toast.success(status === "approved" ? "已通过审核" : "已驳回");
  };

  const setFeatured = async (id) => {
    const response = await api.put(`/admin/competitions/${id}/feature`);
    const featuredId = response.data?.id || id;
    setSelectedCompetitionId(String(featuredId));
    await fetchCompetitions();
    await fetchAssets(featuredId);
    toast.success("已设为当前公开展示比赛包");
  };

  const deleteConfirmed = async () => {
    if (!confirmState) return;
    setSaving(true);
    try {
      if (confirmState.kind === "competition") {
        await api.delete(`/admin/competitions/${confirmState.id}`);
        await fetchCompetitions();
      } else if (confirmState.kind === "media") {
        await api.delete(`/admin/competition-media/${confirmState.id}`);
        await fetchAssets();
      } else if (confirmState.kind === "work") {
        await api.delete(`/admin/competition-works/${confirmState.id}`);
        await fetchAssets();
      } else if (confirmState.kind === "registration") {
        await api.delete(`/admin/hackathon/registrations/${confirmState.id}`);
        await fetchRegistrations();
      }
      toast.success("已删除");
      setConfirmState(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "删除失败");
    } finally {
      setSaving(false);
    }
  };

  const editCompetition = (competition) => {
    setEditingCompetitionId(competition.id);
    setCompetitionForm({
      title: competition.title || "",
      subtitle: competition.subtitle || "",
      description: competition.description || "",
      event_date: competition.event_date || "",
      cover_image: competition.cover_image || "",
      status: competition.status || "active",
      is_featured: Boolean(competition.is_featured),
    });
  };

  const editMedia = (item) => {
    setEditingMediaId(item.id);
    setMediaForm({
      type: item.type || "stage_photo",
      title: item.title || "",
      description: item.description || "",
      url: item.url || "",
      cover_url: item.cover_url || "",
      sort_order: item.sort_order || 0,
      status: item.status || "approved",
      file: null,
      coverFile: null,
    });
  };

  const editWork = (item) => {
    setEditingWorkId(item.id);
    setWorkForm({
      title: item.title || "",
      author: item.author || "",
      summary: item.summary || "",
      git_url: item.git_url || "",
      award: item.award || "",
      rank: item.rank || "",
      cover_url: item.cover_url || "",
      sort_order: item.sort_order || 0,
      status: item.status || "approved",
      coverFile: null,
    });
  };

  const escapeCsv = (value) => String(value || "").replace(/"/g, '""');

  const exportRegistrations = () => {
    const headers = ["姓名", "学号", "专业", "年级", "AI 工具", "项目经验", "报名时间"];
    const rows = registrations.map((registration) => [
      registration.name,
      registration.student_id,
      registration.major,
      gradeLabels[registration.grade] || registration.grade,
      safeParseTools(registration.ai_tools)
        .map((tool) => aiToolLabels[tool] || tool)
        .join(", "),
      registration.experience,
      formatDateTime(registration.created_at),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map((cell) => `"${escapeCsv(cell)}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hackathon_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("报名数据已导出");
  };

  const renderToolTags = (registration) => {
    const tools = safeParseTools(registration.ai_tools);
    if (tools.length === 0) {
      return <span className={mutedTextClass}>未填写</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {tools.map((tool) => (
          <span key={tool} className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold">
            {aiToolLabels[tool] || tool}
          </span>
        ))}
      </div>
    );
  };

  const renderRegistrationMobileCards = () => (
    <div className="grid gap-3 md:hidden">
      {paginatedRegistrations.map((registration) => (
        <article
          key={registration.id}
          className={`rounded-2xl border p-4 ${
            isDayMode ? "border-slate-200/70 bg-white/[0.78]" : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isDayMode ? "bg-cyan-100 text-cyan-700" : "bg-cyan-500/15 text-cyan-200"
                }`}
              >
                <User size={16} />
              </div>
              <div className="min-w-0">
                <h3 className={`truncate font-semibold ${headingTextClass}`}>{registration.name || "未命名"}</h3>
                <p className={`text-xs ${mutedTextClass}`}>
                  {registration.student_id || "未填学号"} · {gradeLabels[registration.grade] || registration.grade || "未填年级"}
                </p>
              </div>
            </div>
            <AdminIconButton
              label="删除报名记录"
              tone="danger"
              onClick={() => setConfirmState({ kind: "registration", id: registration.id })}
            >
              <Trash2 size={16} />
            </AdminIconButton>
          </div>
          <div className={`mt-4 grid gap-2 text-sm ${mutedTextClass}`}>
            <span className="inline-flex items-center gap-2">
              <GraduationCap size={14} />
              {registration.major || "未填写专业"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar size={14} />
              {formatDateTime(registration.created_at)}
            </span>
          </div>
          <div className="mt-3">{renderToolTags(registration)}</div>
          {registration.experience ? (
            <p className={`mt-3 line-clamp-3 text-sm leading-6 ${mutedTextClass}`}>{registration.experience}</p>
          ) : null}
        </article>
      ))}
    </div>
  );

  if (loading) {
    return <AdminLoadingState text="正在加载比赛成果包数据..." />;
  }

  return (
    <>
      <AdminPageShell
        title="比赛成果包管理"
        description="一个比赛成果包包含该次比赛的全部宣传片、赛场照片、优秀作品及审核状态；公开成果页一次只展示当前公开展示包。"
        actions={
          <>
            <AdminButton tone="subtle" onClick={refreshAll}>
              <RefreshCw size={16} />
              刷新
            </AdminButton>
            <AdminButton tone="primary" onClick={exportRegistrations} disabled={registrations.length === 0}>
              <Download size={16} />
              导出报名
            </AdminButton>
          </>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup>
              {[
                ["outcomes", "成果包管理"],
                ["registrations", "报名管理"],
              ].map(([value, label]) => (
                <FilterChip key={value} active={activeTab === value} onClick={() => setActiveTab(value)}>
                  {label}
                </FilterChip>
              ))}
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminMetricCard label="成果包" value={formatNumber(stats.competitions)} icon={Star} />
          <AdminMetricCard label="待审核" value={formatNumber(stats.pending)} icon={PackagePlus} tone="amber" />
          <AdminMetricCard label="成果记录" value={formatNumber(stats.outcomes)} icon={Check} tone="emerald" />
          <AdminMetricCard label="报名" value={formatNumber(stats.registrations)} icon={Users} tone="violet" />
        </div>

        {activeTab === "registrations" ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <AdminMetricCard label="总报名" value={formatNumber(registrationStats.total)} icon={Users} />
              <AdminMetricCard label="当前显示" value={formatNumber(registrationStats.filtered)} icon={Filter} tone="emerald" />
              <AdminMetricCard label="本科生" value={formatNumber(registrationStats.undergraduate)} icon={GraduationCap} tone="indigo" />
              <AdminMetricCard label="研究生" value={formatNumber(registrationStats.graduate)} icon={BookOpen} tone="violet" />
            </div>

            <AdminToolbar>
              <ToolbarGroup className="w-full flex-1">
                <div className="relative w-full min-w-0 flex-1 md:max-w-lg">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="搜索姓名、学号、专业、项目经验"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="theme-admin-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                  />
                </div>
              </ToolbarGroup>
              <ToolbarGroup>
                <select
                  value={gradeFilter}
                  onChange={(event) => {
                    setGradeFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="theme-admin-input min-h-[40px] rounded-xl px-3 py-2 text-sm"
                  aria-label="按年级筛选"
                >
                  <option value="">所有年级</option>
                  {Object.entries(gradeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </ToolbarGroup>
            </AdminToolbar>

            <AdminInlineNote tone={searchTerm || gradeFilter ? "warning" : "info"}>
              当前筛选展示 {formatNumber(registrationStats.filtered)} 条报名记录；CSV 导出会包含全部{" "}
              {formatNumber(registrationStats.total)} 条报名记录。
            </AdminInlineNote>

            <AdminPanel
              title={`报名列表 (${formatNumber(filteredRegistrations.length)})`}
              description={`当前第 ${currentPage} / ${totalPages} 页，每页最多 ${itemsPerPage} 条。`}
            >
              {paginatedRegistrations.length === 0 ? (
                <AdminEmptyState icon={Users} title="暂无匹配的报名数据" description="可以清空搜索词、切换年级筛选，或稍后刷新。" />
              ) : (
                <>
                  {renderRegistrationMobileCards()}
                  <AdminTableShell minWidth={1180}>
                    <thead>
                      <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.2em]">
                        <th className="p-4">报名人</th>
                        <th className="p-4">学号</th>
                        <th className="p-4">专业</th>
                        <th className="p-4">年级</th>
                        <th className="p-4">AI 工具</th>
                        <th className="p-4">项目经验</th>
                        <th className="p-4">报名时间</th>
                        <th className="p-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="theme-admin-table-body divide-y">
                      {paginatedRegistrations.map((registration) => (
                        <tr key={registration.id} className="theme-admin-row">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                  isDayMode ? "bg-cyan-100 text-cyan-700" : "bg-cyan-500/15 text-cyan-200"
                                }`}
                              >
                                <User size={16} />
                              </div>
                              <AdminTableCellText strong>{registration.name || "未命名"}</AdminTableCellText>
                            </div>
                          </td>
                          <td className="p-4"><AdminTableCellText>{registration.student_id || "-"}</AdminTableCellText></td>
                          <td className="p-4">
                            <AdminTableCellText className="max-w-[180px] break-words">
                              {registration.major || "-"}
                            </AdminTableCellText>
                          </td>
                          <td className="p-4">
                            <AdminTableCellText>{gradeLabels[registration.grade] || registration.grade || "-"}</AdminTableCellText>
                          </td>
                          <td className="p-4">{renderToolTags(registration)}</td>
                          <td className="p-4">
                            <AdminTableCellText className="line-clamp-2 max-w-[280px] break-words">
                              {registration.experience || "暂无"}
                            </AdminTableCellText>
                          </td>
                          <td className="p-4"><AdminTableCellText>{formatDateTime(registration.created_at)}</AdminTableCellText></td>
                          <td className="p-4">
                            <div className="flex justify-end">
                              <AdminIconButton
                                label="删除报名记录"
                                tone="danger"
                                onClick={() => setConfirmState({ kind: "registration", id: registration.id })}
                              >
                                <Trash2 size={16} />
                              </AdminIconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </AdminTableShell>
                </>
              )}

              {filteredRegistrations.length > itemsPerPage ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className={`text-sm ${mutedTextClass}`}>
                    第 {(currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(currentPage * itemsPerPage, filteredRegistrations.length)} 条，
                    共 {formatNumber(filteredRegistrations.length)} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminButton
                      tone="subtle"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      <ChevronLeft size={16} />
                      上一页
                    </AdminButton>
                    <span className={`text-sm font-semibold ${headingTextClass}`}>
                      {currentPage} / {totalPages}
                    </span>
                    <AdminButton
                      tone="subtle"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      下一页
                      <ChevronRight size={16} />
                    </AdminButton>
                  </div>
                </div>
              ) : null}
            </AdminPanel>
          </>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
            <div className="space-y-4">
              <AdminInlineNote tone={featuredCompetition ? "success" : "warning"}>
                {featuredCompetition ? (
                  <div className="space-y-2">
                    <div>
                      <span className="font-bold">当前公开展示：</span>
                      <span>{featuredCompetition.title}</span>
                    </div>
                    <div className={`text-sm ${mutedTextClass}`}>{competitionMetaText(featuredCompetition)}</div>
                    <div className="flex flex-wrap gap-2">
                      {packageStats(featuredCompetition).map(([label, value]) => (
                        <span key={label} className="rounded-full border border-current/15 px-2.5 py-1 text-xs">
                          {label} {value}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  "当前没有公开展示的比赛成果包。请创建或选择一个成果包并设为当前公开展示。"
                )}
              </AdminInlineNote>

              <AdminPanel title={editingCompetitionId ? "编辑比赛成果包" : "创建比赛成果包"}>
                <form onSubmit={saveCompetition} className="grid gap-3">
                  <Field label="成果包名称">
                    <input required value={competitionForm.title} onChange={(event) => updateCompetitionForm("title", event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="副标题">
                    <input value={competitionForm.subtitle} onChange={(event) => updateCompetitionForm("subtitle", event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="简介">
                    <textarea rows={4} value={competitionForm.description} onChange={(event) => updateCompetitionForm("description", event.target.value)} className={`${inputClass} min-h-[96px]`} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="日期">
                      <input value={competitionForm.event_date} onChange={(event) => updateCompetitionForm("event_date", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="封面地址">
                      <input value={competitionForm.cover_image} onChange={(event) => updateCompetitionForm("cover_image", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="成果包状态">
                      <select value={competitionForm.status} onChange={(event) => updateCompetitionForm("status", event.target.value)} className={inputClass}>
                        {competitionStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={competitionForm.is_featured} onChange={(event) => updateCompetitionForm("is_featured", event.target.checked)} />
                    设为当前公开展示包
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton type="submit" tone="primary" disabled={saving}>
                      <Save size={16} />
                      {editingCompetitionId ? "保存成果包" : "创建成果包"}
                    </AdminButton>
                    {editingCompetitionId ? (
                      <AdminButton tone="subtle" onClick={resetCompetitionForm}>取消编辑</AdminButton>
                    ) : null}
                  </div>
                </form>
              </AdminPanel>

              <AdminPanel title="比赛成果包列表">
                {competitions.length === 0 ? (
                  <AdminEmptyState icon={Star} title="暂无比赛成果包" description="先创建一个成果包，再上传该次比赛对应的宣传片、赛场照片和优秀作品。" />
                ) : (
                  <div className="grid gap-2">
                    {competitions.map((competition) => (
                      <button
                        type="button"
                        key={competition.id}
                        onClick={() => setSelectedCompetitionId(String(competition.id))}
                        className={`rounded-2xl border p-4 text-left transition ${
                          String(selectedCompetitionId) === String(competition.id)
                            ? "border-cyan-300 bg-cyan-300/10"
                            : "border-white/10 bg-white/[0.03] hover:border-cyan-300/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold">{competition.title}</span>
                              {competition.is_featured ? <StatusBadge status="approved" label="当前公开展示" /> : null}
                              <StatusBadge
                                status={competitionStatusTone[competition.status] || "pending"}
                                label={competitionStatusLabels[competition.status] || competition.status || "未知状态"}
                              />
                            </div>
                            <p className={`mt-1 text-sm ${mutedTextClass}`}>{competitionMetaText(competition)}</p>
                          </div>
                          <span className={`text-xs ${mutedTextClass}`}>ID {competition.id}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {packageStats(competition).map(([label, value]) => (
                            <span key={label} className="rounded-xl bg-white/[0.04] px-2.5 py-2 text-center text-xs">
                              <span className="block font-black">{value}</span>
                              <span className={mutedTextClass}>{label}</span>
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <AdminButton tone="subtle" onClick={(event) => { event.stopPropagation(); editCompetition(competition); }}>编辑</AdminButton>
                          {!competition.is_featured ? (
                            <AdminButton tone="success" onClick={(event) => { event.stopPropagation(); setFeatured(competition.id); }}>设为公开展示</AdminButton>
                          ) : null}
                          <AdminButton tone="danger" onClick={(event) => { event.stopPropagation(); setConfirmState({ kind: "competition", id: competition.id }); }}>删除</AdminButton>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </AdminPanel>
            </div>

            <div className="space-y-4">
              <AdminInlineNote tone={selectedCompetition ? "info" : "warning"}>
                {selectedCompetition ? (
                  <div className="space-y-2">
                    <div>
                      <span className="font-bold">当前选中成果包：</span>
                      <span>{selectedCompetition.title}</span>
                    </div>
                    <div className={`text-sm ${mutedTextClass}`}>{competitionMetaText(selectedCompetition)}</div>
                    <div className="flex flex-wrap gap-2">
                      {packageStats(selectedCompetition).map(([label, value]) => (
                        <span key={label} className="rounded-full border border-current/15 px-2.5 py-1 text-xs">
                          {label} {value}
                        </span>
                      ))}
                    </div>
                    <div className={`text-sm ${mutedTextClass}`}>
                      下方上传的宣传片、赛场照片和优秀作品都会归属这个成果包。
                    </div>
                  </div>
                ) : (
                  "请先创建或选择一个比赛成果包。"
                )}
              </AdminInlineNote>

              <AdminPanel title={editingMediaId ? "编辑赛事素材" : "上传赛事宣传片 / 赛场照片"}>
                <form onSubmit={saveMedia} className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="类型">
                      <select value={mediaForm.type} onChange={(event) => changeMediaType(event.target.value)} className={inputClass}>
                        {mediaTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="标题">
                      <input required value={mediaForm.title} onChange={(event) => updateMediaForm("title", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="状态">
                      <select value={mediaForm.status} onChange={(event) => updateMediaForm("status", event.target.value)} className={inputClass}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="简介">
                    <textarea rows={2} value={mediaForm.description} onChange={(event) => updateMediaForm("description", event.target.value)} className={`${inputClass} min-h-[72px]`} />
                  </Field>
                  <div className={`grid gap-3 ${mediaForm.type === "promo_video" ? "sm:grid-cols-2" : ""}`}>
                    <Field label="上传文件">
                      <input type="file" accept={mediaForm.type === "promo_video" ? "video/*" : "image/*"} onChange={(event) => updateMediaForm("file", event.target.files?.[0] || null)} className={inputClass} />
                    </Field>
                    {mediaForm.type === "promo_video" ? (
                      <Field label="封面（可选）">
                        <input type="file" accept="image/*" onChange={(event) => updateMediaForm("coverFile", event.target.files?.[0] || null)} className={inputClass} />
                      </Field>
                    ) : null}
                  </div>
                  <Field label="已上传地址">
                    <input value={mediaForm.url} onChange={(event) => updateMediaForm("url", event.target.value)} className={inputClass} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton type="submit" tone="primary" disabled={saving || !selectedCompetitionId}>
                      <Upload size={16} />
                      {editingMediaId ? "保存素材" : "发布素材"}
                    </AdminButton>
                    {editingMediaId ? <AdminButton tone="subtle" onClick={resetMediaForm}>取消编辑</AdminButton> : null}
                  </div>
                </form>
              </AdminPanel>

              <AdminPanel title={`素材列表 (${mediaItems.length})`}>
                {mediaItems.length === 0 ? (
                  <AdminEmptyState icon={ImageIcon} title="暂无素材" description="上传赛事宣传片或赛场照片后会显示在这里。" />
                ) : (
                  <AssetList
                    items={mediaItems}
                    kind="media"
                    onEdit={editMedia}
                    onDelete={(id) => setConfirmState({ kind: "media", id })}
                    onReview={reviewItem}
                  />
                )}
              </AdminPanel>

              <AdminPanel title={editingWorkId ? "编辑优秀作品" : "上传优秀作品"}>
                <form onSubmit={saveWork} className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="作品名称">
                      <input required value={workForm.title} onChange={(event) => updateWorkForm("title", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="作者">
                      <input required value={workForm.author} onChange={(event) => updateWorkForm("author", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="状态">
                      <select value={workForm.status} onChange={(event) => updateWorkForm("status", event.target.value)} className={inputClass}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="简介">
                    <textarea required rows={3} value={workForm.summary} onChange={(event) => updateWorkForm("summary", event.target.value)} className={`${inputClass} min-h-[88px]`} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Git 链接">
                      <input required type="url" value={workForm.git_url} onChange={(event) => updateWorkForm("git_url", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="奖项">
                      <input value={workForm.award} onChange={(event) => updateWorkForm("award", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="排序">
                      <input value={workForm.rank} onChange={(event) => updateWorkForm("rank", event.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="封面上传">
                      <input type="file" accept="image/*" onChange={(event) => updateWorkForm("coverFile", event.target.files?.[0] || null)} className={inputClass} />
                    </Field>
                    <Field label="封面地址">
                      <input value={workForm.cover_url} onChange={(event) => updateWorkForm("cover_url", event.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton type="submit" tone="primary" disabled={saving || !selectedCompetitionId}>
                      <PackagePlus size={16} />
                      {editingWorkId ? "保存作品" : "发布作品"}
                    </AdminButton>
                    {editingWorkId ? <AdminButton tone="subtle" onClick={resetWorkForm}>取消编辑</AdminButton> : null}
                  </div>
                </form>
              </AdminPanel>

              <AdminPanel title={`作品列表 (${works.length})`}>
                {works.length === 0 ? (
                  <AdminEmptyState icon={PackagePlus} title="暂无优秀作品" description="作品名称、作者、简介和 Git 链接会打包进入同一条作品记录。" />
                ) : (
                  <AssetList
                    items={works}
                    kind="work"
                    onEdit={editWork}
                    onDelete={(id) => setConfirmState({ kind: "work", id })}
                    onReview={reviewItem}
                  />
                )}
              </AdminPanel>
            </div>
          </div>
        )}
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title="确认删除"
        description="删除后该记录不会再展示在后台列表或公开成果页。"
        confirmText="确认删除"
        tone="danger"
        pending={saving}
        onConfirm={deleteConfirmed}
        onCancel={() => setConfirmState(null)}
      />
    </>
  );
};

const AssetList = ({ items, kind, onEdit, onDelete, onReview }) => (
  <div className="grid gap-3">
    {items.map((item) => (
      <div key={`${kind}-${item.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={item.status} />
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs">
                {kind === "media" ? (item.type === "promo_video" ? "赛事宣传片" : "赛场照片") : "优秀作品"}
              </span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs">ID {item.id}</span>
            </div>
            <h3 className="mt-2 text-base font-bold">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-gray-400">
              {kind === "media" ? item.description || item.url : `${item.author || ""} ${item.summary || ""}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.status === "pending" ? (
              <>
                <AdminButton tone="success" onClick={() => onReview(kind, item.id, "approved")}><Check size={16} />通过</AdminButton>
                <AdminButton tone="danger" onClick={() => onReview(kind, item.id, "rejected")}><X size={16} />驳回</AdminButton>
              </>
            ) : null}
            <AdminButton tone="subtle" onClick={() => onEdit(item)}>编辑</AdminButton>
            <AdminButton tone="danger" onClick={() => onDelete(item.id)}><Trash2 size={16} />删除</AdminButton>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default HackathonManager;
