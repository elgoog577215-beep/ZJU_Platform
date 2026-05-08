import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  Trees,
  User,
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
  StatusBadge,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const statusOptions = [
  { value: "new", label: "新提交" },
  { value: "contacted", label: "已联络" },
  { value: "in_progress", label: "推进中" },
  { value: "closed", label: "已关闭" },
];

const statusLabels = statusOptions.reduce((accumulator, option) => {
  accumulator[option.value] = option.label;
  return accumulator;
}, {});

const statusTone = {
  new: "pending",
  contacted: "open",
  in_progress: "recruiting",
  closed: "closed",
};

const FutureLearningManager = () => {
  const { isDayMode, headingTextClass, mutedTextClass } = useAdminTheme();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({ status: "new", adminNote: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const itemsPerPage = 20;

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/future-learning/registrations");
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
        [
          registration.topic,
          registration.name,
          registration.organization,
          registration.email,
          registration.phone,
          registration.message,
        ]
          .map((value) => String(value || "").toLowerCase())
          .some((value) => value.includes(query));

      const matchesStatus = statusFilter
        ? registration.status === statusFilter
        : true;
      return matchesSearch && matchesStatus;
    });
  }, [registrations, searchTerm, statusFilter]);

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
    const byStatus = registrations.reduce((accumulator, registration) => {
      const status = registration.status || "new";
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return {
      total: registrations.length,
      filtered: filteredRegistrations.length,
      newCount: byStatus.new || 0,
      contacted: byStatus.contacted || 0,
      inProgress: byStatus.in_progress || 0,
    };
  }, [filteredRegistrations.length, registrations]);

  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString("zh-CN") : "未知时间";

  const formatNumber = (value) =>
    new Intl.NumberFormat("zh-CN").format(Number(value || 0));

  const escapeCsv = (value) => String(value || "").replace(/"/g, '""');

  const handleExport = () => {
    const headers = [
      "揭榜问题",
      "姓名",
      "年龄",
      "性别",
      "学校或组织",
      "邮箱",
      "电话",
      "留言",
      "跟进状态",
      "管理员备注",
      "报名时间",
    ];
    const data = registrations.map((registration) => [
      registration.topic,
      registration.name,
      registration.age,
      registration.gender,
      registration.organization,
      registration.email,
      registration.phone,
      registration.message,
      statusLabels[registration.status] || registration.status,
      registration.admin_note,
      formatDateTime(registration.created_at),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...data]
        .map((row) => row.map((cell) => `"${escapeCsv(cell)}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `future_learning_registrations_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("导出成功");
  };

  const openEditDialog = (registration) => {
    setEditingRecord(registration);
    setEditForm({
      status: registration.status || "new",
      adminNote: registration.admin_note || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setActionPending(true);
    try {
      const response = await api.put(
        `/admin/future-learning/registrations/${editingRecord.id}`,
        editForm,
      );
      const updated = response.data;
      setRegistrations((previous) =>
        previous.map((registration) =>
          registration.id === updated.id ? updated : registration,
        ),
      );
      toast.success("跟进信息已保存");
      setEditingRecord(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "保存失败");
    } finally {
      setActionPending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setActionPending(true);
    try {
      await api.delete(`/admin/future-learning/registrations/${confirmDeleteId}`);
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

  const renderStatus = (registration) => (
    <StatusBadge
      status={statusTone[registration.status || "new"] || "pending"}
      label={statusLabels[registration.status || "new"] || "新提交"}
    />
  );

  const renderContact = (registration) => (
    <div className={`grid gap-1 text-sm ${mutedTextClass}`}>
      {registration.email ? (
        <span className="inline-flex items-center gap-1.5">
          <Mail size={13} />
          {registration.email}
        </span>
      ) : null}
      {registration.phone ? (
        <span className="inline-flex items-center gap-1.5">
          <Phone size={13} />
          {registration.phone}
        </span>
      ) : null}
    </div>
  );

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
                      ? "bg-teal-100 text-teal-700"
                      : "bg-teal-500/15 text-teal-200"
                  }`}
                >
                  <User size={16} />
                </div>
                <div>
                  <h3 className={`font-semibold ${headingTextClass}`}>
                    {registration.name || "未命名"}
                  </h3>
                  <p className={`text-xs ${mutedTextClass}`}>
                    {registration.organization || "未填写组织"}
                  </p>
                </div>
              </div>
            </div>
            {renderStatus(registration)}
          </div>
          <p className={`mt-4 line-clamp-3 text-sm leading-6 ${mutedTextClass}`}>
            {registration.topic || "未填写揭榜问题"}
          </p>
          <div className="mt-3">{renderContact(registration)}</div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => openEditDialog(registration)}
              className={`text-sm font-semibold ${
                isDayMode ? "text-teal-700" : "text-teal-200"
              }`}
            >
              跟进备注
            </button>
            <AdminIconButton
              label="删除报名记录"
              tone="danger"
              onClick={() => setConfirmDeleteId(registration.id)}
            >
              <Trash2 size={16} />
            </AdminIconButton>
          </div>
        </article>
      ))}
    </div>
  );

  if (loading) {
    return <AdminLoadingState text="正在加载未来学习中心报名数据..." />;
  }

  return (
    <>
      <AdminPageShell
        title="未来学习中心报名管理"
        description="收集「智能生命健康」项目问题揭榜报名信息，跟进联络状态，并导出 CSV 用于项目组处理。"
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
                  placeholder="搜索问题、姓名、组织、联系方式"
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
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="theme-admin-input min-h-[40px] rounded-xl px-3 py-2 text-sm"
                aria-label="按跟进状态筛选"
              >
                <option value="">所有状态</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <AdminMetricCard label="总报名" value={formatNumber(stats.total)} icon={Trees} />
          <AdminMetricCard
            label="当前显示"
            value={formatNumber(stats.filtered)}
            icon={Filter}
            tone="emerald"
          />
          <AdminMetricCard
            label="新提交"
            value={formatNumber(stats.newCount)}
            icon={MessageSquareText}
            tone="amber"
          />
          <AdminMetricCard
            label="已联络"
            value={formatNumber(stats.contacted)}
            icon={Phone}
            tone="indigo"
          />
          <AdminMetricCard
            label="推进中"
            value={formatNumber(stats.inProgress)}
            icon={CheckCircle2}
            tone="violet"
          />
        </div>

        <AdminInlineNote tone={searchTerm || statusFilter ? "warning" : "info"}>
          当前筛选展示 {formatNumber(stats.filtered)} 条报名记录；CSV 导出会包含全部{" "}
          {formatNumber(stats.total)} 条报名记录。
        </AdminInlineNote>

        <AdminPanel
          title={`报名列表 (${formatNumber(filteredRegistrations.length)})`}
          description={`当前第 ${currentPage} / ${totalPages} 页，每页最多 ${itemsPerPage} 条。`}
        >
          {paginatedData.length === 0 ? (
            <AdminEmptyState
              icon={Trees}
              title="暂无匹配的未来学习中心报名数据"
              description="可以清空搜索词、切换状态筛选，或稍后刷新。"
            />
          ) : (
            <>
              {renderMobileCards()}
              <AdminTableShell minWidth={1280}>
                <thead>
                  <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.2em]">
                    <th className="p-4">报名人</th>
                    <th className="p-4">揭榜问题</th>
                    <th className="p-4">组织</th>
                    <th className="p-4">联系方式</th>
                    <th className="p-4">留言</th>
                    <th className="p-4">状态</th>
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
                                ? "bg-teal-100 text-teal-700"
                                : "bg-teal-500/15 text-teal-200"
                            }`}
                          >
                            <User size={16} />
                          </div>
                          <div>
                            <AdminTableCellText strong>
                              {registration.name || "未命名"}
                            </AdminTableCellText>
                            <div className={`mt-1 text-xs ${mutedTextClass}`}>
                              {registration.age || "-"} 岁 ·{" "}
                              {registration.gender || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText className="line-clamp-3 max-w-[280px] break-words">
                          {registration.topic || "-"}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText className="max-w-[180px] break-words">
                          {registration.organization || "-"}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">{renderContact(registration)}</td>
                      <td className="p-4">
                        <AdminTableCellText className="line-clamp-2 max-w-[240px] break-words">
                          {registration.message || "暂无"}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">{renderStatus(registration)}</td>
                      <td className="p-4">
                        <AdminTableCellText>
                          {formatDateTime(registration.created_at)}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <AdminButton
                            tone="subtle"
                            className="min-h-9 px-3 text-xs"
                            onClick={() => openEditDialog(registration)}
                          >
                            跟进
                          </AdminButton>
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
        open={Boolean(editingRecord)}
        title="更新跟进信息"
        description={editingRecord ? `报名人：${editingRecord.name}` : ""}
        confirmText="保存"
        tone="primary"
        pending={actionPending}
        onConfirm={handleSaveEdit}
        onCancel={() => setEditingRecord(null)}
      >
        <div className="space-y-4">
          <label className={`block text-sm font-semibold ${headingTextClass}`}>
            跟进状态
            <select
              value={editForm.status}
              onChange={(event) =>
                setEditForm((previous) => ({
                  ...previous,
                  status: event.target.value,
                }))
              }
              className="theme-admin-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={`block text-sm font-semibold ${headingTextClass}`}>
            管理员备注
            <textarea
              value={editForm.adminNote}
              onChange={(event) =>
                setEditForm((previous) => ({
                  ...previous,
                  adminNote: event.target.value,
                }))
              }
              rows={5}
              maxLength={2000}
              placeholder="记录联络结果、下一步安排或内部备注"
              className="theme-admin-input mt-2 w-full resize-none rounded-xl px-3 py-2.5 text-sm leading-6"
            />
          </label>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="确认删除报名记录"
        description="该操作会删除这条未来学习中心报名记录，删除后不可恢复。"
        confirmText="确认删除"
        tone="danger"
        pending={actionPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
};

export default FutureLearningManager;
