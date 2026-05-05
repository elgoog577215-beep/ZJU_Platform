import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
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

const safeParseTools = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const HackathonManager = () => {
  const { isDayMode, headingTextClass, mutedTextClass } = useAdminTheme();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const itemsPerPage = 20;

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/hackathon/registrations");
      setRegistrations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.error || "加载报名数据失败");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const filteredRegistrations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return registrations.filter((registration) => {
      const matchesSearch =
        !query ||
        String(registration.name || "")
          .toLowerCase()
          .includes(query) ||
        String(registration.student_id || "")
          .toLowerCase()
          .includes(query) ||
        String(registration.major || "")
          .toLowerCase()
          .includes(query);

      const matchesGrade = gradeFilter ? registration.grade === gradeFilter : true;
      return matchesSearch && matchesGrade;
    });
  }, [gradeFilter, registrations, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRegistrations.length / itemsPerPage),
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedData = filteredRegistrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const stats = useMemo(() => {
    const byGrade = registrations.reduce((accumulator, registration) => {
      accumulator[registration.grade] = (accumulator[registration.grade] || 0) + 1;
      return accumulator;
    }, {});

    return {
      total: registrations.length,
      filtered: filteredRegistrations.length,
      lowerGrades: (byGrade.freshman || 0) + (byGrade.sophomore || 0),
      upperGrades: (byGrade.junior || 0) + (byGrade.senior || 0),
      graduate: (byGrade.master || 0) + (byGrade.phd || 0),
    };
  }, [filteredRegistrations.length, registrations]);

  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString("zh-CN") : "未知时间";

  const formatNumber = (value) =>
    new Intl.NumberFormat("zh-CN").format(Number(value || 0));

  const handleExport = () => {
    const headers = [
      "姓名",
      "学号",
      "专业",
      "年级",
      "AI 工具",
      "AI 项目经历",
      "报名时间",
    ];
    const data = registrations.map((registration) => [
      registration.name,
      registration.student_id,
      registration.major,
      gradeLabels[registration.grade] || registration.grade,
      safeParseTools(registration.ai_tools)
        .map((tool) => aiToolLabels[tool] || tool)
        .join(", "),
      (registration.experience || "").replace(/"/g, '""'),
      formatDateTime(registration.created_at),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...data]
        .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hackathon_registrations_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success("导出成功");
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setActionPending(true);
    try {
      await api.delete(`/admin/hackathon/registrations/${confirmDeleteId}`);
      setRegistrations((previous) =>
        previous.filter((registration) => registration.id !== confirmDeleteId),
      );
      toast.success("报名记录已删除");
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "删除失败");
    } finally {
      setActionPending(false);
    }
  };

  const renderToolTags = (registration) => {
    const tools = safeParseTools(registration.ai_tools);
    if (tools.length === 0) {
      return <span className={`text-xs ${mutedTextClass}`}>未填写</span>;
    }

    return tools.map((tool) => (
      <span
        key={tool}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
          isDayMode
            ? "bg-violet-500/10 text-violet-700"
            : "bg-violet-500/15 text-violet-200"
        }`}
      >
        <Cpu size={12} />
        {aiToolLabels[tool] || tool}
      </span>
    ));
  };

  const renderMobileCards = () => (
    <div className="grid gap-3 md:hidden">
      {paginatedData.map((registration) => (
        <article
          key={registration.id}
          className={`rounded-2xl border p-4 ${
            isDayMode
              ? "border-slate-200/70 bg-white/[0.78]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isDayMode
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-indigo-500/15 text-indigo-200"
                  }`}
                >
                  <User size={16} />
                </div>
                <div>
                  <h3 className={`font-semibold ${headingTextClass}`}>
                    {registration.name || "未命名"}
                  </h3>
                  <p className={`text-xs ${mutedTextClass}`}>
                    {registration.student_id || "无学号"}
                  </p>
                </div>
              </div>
              <p className={`mt-3 text-sm ${mutedTextClass}`}>
                {registration.major || "未填写专业"} ·{" "}
                {gradeLabels[registration.grade] || registration.grade || "未填写年级"}
              </p>
            </div>
            <AdminIconButton
              label="删除报名记录"
              tone="danger"
              onClick={() => setConfirmDeleteId(registration.id)}
            >
              <Trash2 size={16} />
            </AdminIconButton>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {renderToolTags(registration)}
          </div>
          <p className={`mt-3 line-clamp-3 text-sm leading-6 ${mutedTextClass}`}>
            {registration.experience || "暂无项目经历"}
          </p>
          <div className={`mt-3 flex items-center gap-2 text-xs ${mutedTextClass}`}>
            <Calendar size={12} />
            {formatDateTime(registration.created_at)}
          </div>
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
        title="黑客松报名管理"
        description="查看参赛学生报名资料、筛选年级分布，并导出 CSV 用于后续联络和赛务安排。"
        actions={
          <>
            <AdminButton tone="subtle" onClick={fetchRegistrations}>
              <RefreshCw size={16} />
              刷新
            </AdminButton>
            <AdminButton
              tone="primary"
              onClick={handleExport}
              disabled={registrations.length === 0}
            >
              <Download size={16} />
              导出 CSV
            </AdminButton>
          </>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup className="w-full flex-1">
              <div className="relative w-full min-w-0 flex-1 md:max-w-lg">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="搜索姓名、学号、专业"
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
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <AdminMetricCard
            label="总报名"
            value={formatNumber(stats.total)}
            icon={Users}
          />
          <AdminMetricCard
            label="当前显示"
            value={formatNumber(stats.filtered)}
            icon={Filter}
            tone="emerald"
          />
          <AdminMetricCard
            label="大一 - 大二"
            value={formatNumber(stats.lowerGrades)}
            icon={GraduationCap}
            tone="violet"
          />
          <AdminMetricCard
            label="大三 - 大四"
            value={formatNumber(stats.upperGrades)}
            icon={BookOpen}
            tone="amber"
          />
          <AdminMetricCard
            label="硕博"
            value={formatNumber(stats.graduate)}
            icon={GraduationCap}
            tone="indigo"
          />
        </div>

        <AdminInlineNote tone={searchTerm || gradeFilter ? "warning" : "info"}>
          当前筛选展示 {formatNumber(stats.filtered)} 条报名记录；CSV 导出会包含全部{" "}
          {formatNumber(stats.total)} 条报名记录。
        </AdminInlineNote>

        <AdminPanel
          title={`报名列表 (${formatNumber(filteredRegistrations.length)})`}
          description={`当前第 ${currentPage} / ${totalPages} 页，每页最多 ${itemsPerPage} 条。`}
        >
          {paginatedData.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title="暂无匹配的报名数据"
              description="可以清空搜索词、切换年级筛选，或稍后刷新。"
            />
          ) : (
            <>
              {renderMobileCards()}
              <AdminTableShell minWidth={1120}>
                <thead>
                  <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.2em]">
                    <th className="p-4">姓名</th>
                    <th className="p-4">学号</th>
                    <th className="p-4">专业</th>
                    <th className="p-4">年级</th>
                    <th className="p-4">AI 工具</th>
                    <th className="p-4">项目经历</th>
                    <th className="p-4">报名时间</th>
                    <th className="p-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="theme-admin-table-body divide-y">
                  {paginatedData.map((registration) => (
                    <tr key={registration.id} className="theme-admin-row">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              isDayMode
                                ? "bg-indigo-100 text-indigo-600"
                                : "bg-indigo-500/15 text-indigo-200"
                            }`}
                          >
                            <User size={16} />
                          </div>
                          <AdminTableCellText strong>
                            {registration.name || "未命名"}
                          </AdminTableCellText>
                        </div>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText className="font-mono">
                          {registration.student_id || "-"}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText>
                          {registration.major || "-"}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isDayMode
                              ? "bg-sky-500/10 text-sky-700"
                              : "bg-sky-500/15 text-sky-200"
                          }`}
                        >
                          {gradeLabels[registration.grade] ||
                            registration.grade ||
                            "未填写"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {renderToolTags(registration)}
                        </div>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText className="line-clamp-2 max-w-[260px] break-words">
                          {registration.experience || "暂无"}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText>
                          {formatDateTime(registration.created_at)}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end">
                          <AdminIconButton
                            label="删除报名记录"
                            tone="danger"
                            onClick={() => setConfirmDeleteId(registration.id)}
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
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  下一页
                  <ChevronRight size={16} />
                </AdminButton>
              </div>
            </div>
          ) : null}
        </AdminPanel>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="确认删除报名记录"
        description="该操作会删除这条黑客松报名记录，删除后不可恢复。"
        confirmText="确认删除"
        tone="danger"
        pending={actionPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
};

export default HackathonManager;
