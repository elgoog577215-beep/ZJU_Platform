import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminTableCellText,
  AdminTableShell,
  AdminToolbar,
  ConfirmDialog,
  StatusBadge,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

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

const workStatusLabels = {
  all: "全部状态",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

const itemsPerPage = 20;

const safeParseTools = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const escapeCsv = (value) => String(value || "").replace(/"/g, '""');

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("zh-CN") : "未知时间";

const formatNumber = (value) =>
  new Intl.NumberFormat("zh-CN").format(Number(value || 0));

const HackathonManager = () => {
  const { isDayMode, headingTextClass, mutedTextClass } = useAdminTheme();
  const [registrations, setRegistrations] = useState([]);
  const [works, setWorks] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workSearchTerm, setWorkSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [workStatusFilter, setWorkStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRegistrations = async () => {
    const response = await api.get("/admin/hackathon/registrations");
    setRegistrations(Array.isArray(response.data) ? response.data : []);
  };

  const fetchWorks = async () => {
    const response = await api.get("/admin/competition-works", {
      params: { status: "all" },
    });
    setWorks(Array.isArray(response.data) ? response.data : []);
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRegistrations(), fetchWorks()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "加载黑客松运营数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

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

  const filteredWorks = useMemo(() => {
    const query = workSearchTerm.trim().toLowerCase();
    return works.filter((work) => {
      const matchesStatus = workStatusFilter === "all" || work.status === workStatusFilter;
      const matchesSearch =
        !query ||
        [
          work.title,
          work.author,
          work.summary,
          work.award,
          work.rank,
          work.honor_title,
          work.highlight,
          work.experience,
          work.uploader_name,
        ]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [workSearchTerm, workStatusFilter, works]);

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

  const workStats = useMemo(() => {
    const byStatus = works.reduce((accumulator, work) => {
      const status = work.status || "unknown";
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return {
      total: works.length,
      filtered: filteredWorks.length,
      pending: byStatus.pending || 0,
      approved: byStatus.approved || 0,
      rejected: byStatus.rejected || 0,
    };
  }, [filteredWorks.length, works]);

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
    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${escapeCsv(cell)}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hackathon_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("报名数据已导出");
  };

  const deleteConfirmed = async () => {
    if (!confirmState) return;
    setSaving(true);
    try {
      await api.delete(`/admin/hackathon/registrations/${confirmState.id}`);
      await fetchRegistrations();
      toast.success("报名记录已删除");
      setConfirmState(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "删除失败");
    } finally {
      setSaving(false);
    }
  };

  const reviewWork = async (work, status) => {
    setSaving(true);
    try {
      await api.put(`/admin/competition-works/${work.id}/review`, {
        status,
        reason: status === "rejected" ? "管理员驳回" : "",
      });
      await fetchWorks();
      toast.success(status === "approved" ? "作品已通过审核" : "作品已驳回");
    } catch (error) {
      toast.error(error.response?.data?.error || "作品审核失败");
    } finally {
      setSaving(false);
    }
  };

  const renderWorkCards = () => (
    <div className="grid gap-3 xl:grid-cols-2">
      {filteredWorks.map((work) => (
        <article
          key={work.id}
          className={`rounded-2xl border p-4 ${
            isDayMode ? "border-slate-200/70 bg-white/[0.78]" : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={work.status} label={workStatusLabels[work.status] || work.status} />
                {work.award ? (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isDayMode ? "bg-cyan-50 text-cyan-700" : "bg-cyan-500/15 text-cyan-100"
                  }`}>
                    {work.award}
                  </span>
                ) : null}
              </div>
              <h3 className={`mt-3 line-clamp-2 text-lg font-black ${headingTextClass}`}>
                {work.title || "未命名作品"}
              </h3>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>
                {[work.author, work.honor_title, work.rank ? `Rank ${work.rank}` : ""].filter(Boolean).join(" · ") || "未填写作者"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {work.git_url ? (
                <a
                  href={work.git_url}
                  target="_blank"
                  rel="noreferrer"
                  className="theme-button-ghost inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold"
                >
                  项目
                  <ExternalLink size={14} />
                </a>
              ) : null}
              <AdminButton
                tone="success"
                className="min-h-[36px] px-3 text-xs"
                disabled={saving || work.status === "approved"}
                onClick={() => reviewWork(work, "approved")}
              >
                <CheckCircle size={14} />
                通过
              </AdminButton>
              <AdminButton
                tone="danger"
                className="min-h-[36px] px-3 text-xs"
                disabled={saving || work.status === "rejected"}
                onClick={() => reviewWork(work, "rejected")}
              >
                <XCircle size={14} />
                驳回
              </AdminButton>
            </div>
          </div>
          {work.highlight ? (
            <p className={`mt-4 border-l-2 pl-3 text-sm font-semibold leading-6 ${
              isDayMode ? "border-cyan-400 text-slate-700" : "border-cyan-300 text-cyan-100/84"
            }`}>
              {work.highlight}
            </p>
          ) : null}
          <p className={`mt-3 line-clamp-3 text-sm leading-6 ${mutedTextClass}`}>
            {work.summary || "暂无作品简介"}
          </p>
          {work.experience ? (
            <p className={`mt-2 line-clamp-2 text-xs leading-5 ${mutedTextClass}`}>
              经验：{work.experience}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );

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
              onClick={() => setConfirmState({ id: registration.id })}
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
    return <AdminLoadingState text="正在加载黑客松报名数据..." />;
  }

  return (
    <>
      <AdminPageShell
        title="黑客松运营管理"
        description={`报名 ${formatNumber(registrationStats.total)} 条，待审作品 ${formatNumber(workStats.pending)} 条。`}
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
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <AdminMetricCard label="总报名" value={formatNumber(registrationStats.total)} icon={Users} />
          <AdminMetricCard label="当前显示" value={formatNumber(registrationStats.filtered)} icon={Filter} tone="emerald" />
          <AdminMetricCard label="作品总数" value={formatNumber(workStats.total)} icon={Award} tone="indigo" />
          <AdminMetricCard label="待审作品" value={formatNumber(workStats.pending)} icon={RefreshCw} tone="amber" />
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

        <AdminPanel
          title={`报名列表 (${formatNumber(filteredRegistrations.length)})`}
          description={`第 ${currentPage} / ${totalPages} 页，CSV 导出包含全部 ${formatNumber(registrationStats.total)} 条。`}
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
                            onClick={() => setConfirmState({ id: registration.id })}
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

        <AdminPanel
          title={`作品与经验审核 (${formatNumber(filteredWorks.length)})`}
          description={`待审 ${formatNumber(workStats.pending)} 条，已发布 ${formatNumber(workStats.approved)} 条。`}
        >
          <AdminToolbar>
            <ToolbarGroup className="w-full flex-1">
              <div className="relative w-full min-w-0 flex-1 md:max-w-lg">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="搜索作品、作者、荣誉、经验"
                  value={workSearchTerm}
                  onChange={(event) => setWorkSearchTerm(event.target.value)}
                  className="theme-admin-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
            </ToolbarGroup>
            <ToolbarGroup>
              <select
                value={workStatusFilter}
                onChange={(event) => setWorkStatusFilter(event.target.value)}
                className="theme-admin-input min-h-[40px] rounded-xl px-3 py-2 text-sm"
                aria-label="按作品审核状态筛选"
              >
                {Object.entries(workStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </ToolbarGroup>
          </AdminToolbar>

          {filteredWorks.length === 0 ? (
            <AdminEmptyState icon={Award} title="暂无匹配的作品/经验" description="外部提交作品后会进入这里；也可以在审核中心批量处理。" />
          ) : (
            renderWorkCards()
          )}
        </AdminPanel>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title="确认删除报名记录"
        description="删除后该报名记录不会再显示在后台列表中。"
        confirmText="确认删除"
        tone="danger"
        pending={saving}
        onConfirm={deleteConfirmed}
        onCancel={() => setConfirmState(null)}
      />
    </>
  );
};

export default HackathonManager;
