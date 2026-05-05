import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  CalendarDays,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react";
import api from "../../services/api";
import { getEventCategoryLabel } from "../../data/eventTaxonomy";
import Dropdown from "../Dropdown";
import UploadModal from "../UploadModal";
import {
  AdminButton,
  AdminEmptyState,
  AdminHelperText,
  AdminIconButton,
  AdminInlineNote,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminSelectedBar,
  AdminTableCellText,
  AdminTableShell,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  StatusBadge,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const STATUS_FILTERS = [
  { id: "all", label: "全部状态" },
  { id: "approved", label: "已通过" },
  { id: "pending", label: "待审核" },
  { id: "rejected", label: "已驳回" },
];

const ResourceManager = ({ title, apiEndpoint, type, icon: Icon }) => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const listRef = useRef(null);
  const isEventResource = apiEndpoint === "events";
  const [sort, setSort] = useState(isEventResource ? "views" : "newest");

  const scrollToList = useCallback((behavior = "smooth") => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior, block: "start" });
    });
  }, []);

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get(`/${apiEndpoint}`, {
        params: {
          page,
          limit: 10,
          search: searchQuery,
          status: "all",
          sort,
          _t: Date.now(),
        },
      });
      setItems(response.data?.data || []);
      setPagination(
        response.data?.pagination || { page: 1, total: 0, totalPages: 1 },
      );
      setSelectedIds([]);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "获取资源列表失败，请稍后重试";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
  }, [apiEndpoint, sort, searchQuery]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "all") return true;
      return item.status === statusFilter;
    });
  }, [items, statusFilter]);

  const eventSortOptions = useMemo(
    () => [
      { value: "views", label: "按访问量" },
      { value: "registrations", label: "按报名量" },
      { value: "date_desc", label: "按日期（最近）" },
      { value: "date_asc", label: "按日期（最早）" },
      { value: "newest", label: "按最新创建" },
    ],
    [],
  );

  const eventStats = useMemo(() => {
    if (!isEventResource) return null;

    return items.reduce(
      (accumulator, item) => ({
        totalViews: accumulator.totalViews + Number(item.views || 0),
        totalRegistrations:
          accumulator.totalRegistrations + Number(item.registration_count || 0),
        upcoming:
          accumulator.upcoming +
          (item.date &&
          new Date(item.date) >= new Date(new Date().toDateString())
            ? 1
            : 0),
      }),
      {
        totalViews: 0,
        totalRegistrations: 0,
        upcoming: 0,
      },
    );
  }, [isEventResource, items]);

  const formatNumber = (value) =>
    new Intl.NumberFormat("zh-CN").format(Number(value || 0));

  const formatDate = (value) =>
    value ? String(value).replace("T", " ").slice(0, 16) : "未设置";

  const renderTaxonomyPills = (item, maxTags = 4) => {
    if (isEventResource) {
      const categoryLabel =
        getEventCategoryLabel(item.category) || item.category || "未分类";

      return (
        <div className="flex max-w-xs flex-wrap gap-1">
          <span
            className={`rounded-full px-2 py-1 text-xs ${mutedTextClass} ${
              isDayMode
                ? "bg-emerald-50 text-emerald-700"
                : "bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {categoryLabel}
          </span>
        </div>
      );
    }

    const tags = String(item.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, maxTags);

    return (
      <div className="flex max-w-xs flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2 py-1 text-xs ${mutedTextClass} ${
              isDayMode ? "bg-slate-100" : "bg-white/5"
            }`}
          >
            {tag}
          </span>
        ))}
        {tags.length === 0 ? (
          <span className={`text-xs ${mutedTextClass}`}>无标签</span>
        ) : null}
      </div>
    );
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    scrollToList();
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    scrollToList();
  };

  const updateStatusFilter = (filterId) => {
    setStatusFilter(filterId);
    scrollToList();
  };

  const fetchPage = (page) => {
    fetchItems(page);
    scrollToList();
  };

  const openConfirm = (mode, payload = {}) => {
    setConfirmState({ mode, ...payload });
  };

  const closeConfirm = () => setConfirmState(null);

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (newItem) => {
    try {
      if (editingItem) {
        await api.put(`/${apiEndpoint}/${editingItem.id}`, newItem);
        toast.success("内容已更新");
      } else {
        await api.post(`/${apiEndpoint}`, newItem);
        toast.success("内容已创建");
      }
      setIsModalOpen(false);
      fetchItems(pagination.page);
    } catch (error) {
      const errorMessage = error.response?.data?.error || "保存失败";
      toast.error(errorMessage);
    }
  };

  const selectedItems = filteredItems.filter((item) =>
    selectedIds.includes(item.id),
  );

  const statusCounts = useMemo(
    () =>
      filteredItems.reduce(
        (accumulator, item) => {
          accumulator[item.status] = (accumulator[item.status] || 0) + 1;
          return accumulator;
        },
        { total: filteredItems.length },
      ),
    [filteredItems],
  );

  const serverTotal = Number(pagination.total || 0);
  const visibleTotal = filteredItems.length;
  const activeFilterLabel =
    STATUS_FILTERS.find((filter) => filter.id === statusFilter)?.label || "全部状态";

  const submitConfirmedAction = async () => {
    if (!confirmState) return;
    setActionPending(true);
    try {
      if (confirmState.mode === "delete") {
        await api.delete(`/${apiEndpoint}/${confirmState.id}/permanent`);
        toast.success("内容已彻底删除");
      }

      if (confirmState.mode === "batch-delete") {
        await Promise.all(
          confirmState.ids.map((id) =>
            api.delete(`/${apiEndpoint}/${id}/permanent`),
          ),
        );
        toast.success(`已删除 ${confirmState.ids.length} 条内容`);
      }

      if (confirmState.mode === "batch-status") {
        await Promise.all(
          confirmState.ids.map((id) =>
            api.put(`/${apiEndpoint}/${id}/status`, {
              status: confirmState.status,
              reason:
                confirmState.status === "rejected" ? "管理员批量驳回" : "",
            }),
          ),
        );
        toast.success(
          confirmState.status === "approved"
            ? `已通过 ${confirmState.ids.length} 条内容`
            : `已驳回 ${confirmState.ids.length} 条内容`,
        );
      }

      closeConfirm();
      fetchItems(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.error || "操作失败，请稍后重试");
    } finally {
      setActionPending(false);
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  };

  const toggleSelectedVisible = () => {
    const visibleIds = filteredItems.map((item) => item.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((previous) =>
        previous.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedIds((previous) =>
        Array.from(new Set([...previous, ...visibleIds])),
      );
    }
  };

  const descriptionMap = {
    image: "统一管理图片资源，可查看状态、标签和封面预览。",
    video: "集中处理视频内容，支持搜索、状态筛选和快速编辑。",
    audio: "管理音频内容、作者信息和资源状态。",
    article: "维护文章内容与发布状态。",
    event: "查看活动热度、报名情况与审核状态。",
  };

  const renderMobileCards = () => (
    <div className="grid grid-cols-1 gap-3 md:hidden">
      {filteredItems.map((item) => (
        <article
          key={item.id}
          className={`rounded-2xl border p-4 ${
            isDayMode
              ? "border-slate-200/70 bg-white/[0.78]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              aria-label={`选择 ${item.title || "未命名内容"}`}
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelected(item.id)}
              className="mt-1 rounded border-slate-400/40 bg-transparent"
            />
            {type === "image" && item.url ? (
              <img
                src={item.url}
                alt={item.title}
                className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <span className={`rounded-full px-2 py-1 text-xs ${mutedTextClass} ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}>
                  ID {item.id}
                </span>
              </div>
              <h3 className={`mt-2 line-clamp-2 font-semibold ${headingTextClass}`}>
                {item.title || "未命名内容"}
              </h3>
              {isEventResource ? (
                <div className={`mt-2 grid grid-cols-2 gap-2 text-xs ${mutedTextClass}`}>
                  <span>时间: {formatDate(item.date)}</span>
                  <span>访问: {formatNumber(item.views)}</span>
                  <span>报名: {formatNumber(item.registration_count)}</span>
                </div>
              ) : type === "audio" ? (
                <p className={`mt-2 text-xs ${mutedTextClass}`}>
                  作者: {item.artist || "-"}
                </p>
              ) : null}
              <div className="mt-3">{renderTaxonomyPills(item, 3)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <AdminButton tone="subtle" onClick={() => handleEdit(item)}>
              <Edit2 size={16} />
              编辑
            </AdminButton>
            <AdminButton
              tone="danger"
              onClick={() => openConfirm("delete", { id: item.id })}
            >
              <Trash2 size={16} />
              删除
            </AdminButton>
          </div>
        </article>
      ))}
    </div>
  );

  const renderTable = () => (
    <AdminTableShell minWidth={860} maxHeight="62vh">
      <thead>
        <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.2em]">
          <th className="p-4">
            <input
              type="checkbox"
              aria-label="选择当前页全部结果"
              checked={
                filteredItems.length > 0 &&
                filteredItems.every((item) => selectedIds.includes(item.id))
              }
              onChange={toggleSelectedVisible}
              className="rounded border-slate-400/40 bg-transparent"
            />
          </th>
          <th className="p-4">标题</th>
          {isEventResource ? <th className="p-4">活动时间</th> : null}
          <th className="p-4">状态</th>
          {isEventResource ? <th className="p-4">访问</th> : null}
          {isEventResource ? <th className="p-4">报名</th> : null}
          {type === "image" ? <th className="p-4">预览</th> : null}
          {type === "audio" ? <th className="p-4">作者</th> : null}
          <th className="p-4">{isEventResource ? "分类" : "标签"}</th>
          <th className="p-4 text-right">操作</th>
        </tr>
      </thead>
      <tbody className="theme-admin-table-body divide-y">
        {filteredItems.map((item) => (
          <tr key={item.id} className="theme-admin-row">
            <td className="p-4">
              <input
                type="checkbox"
                aria-label={`选择 ${item.title || "未命名内容"}`}
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelected(item.id)}
                className="rounded border-slate-400/40 bg-transparent"
              />
            </td>
            <td className="p-4">
              <AdminTableCellText strong>
                {item.title || "未命名内容"}
              </AdminTableCellText>
              <div className={`mt-1 text-xs ${mutedTextClass}`}>
                ID {item.id}
              </div>
            </td>
            {isEventResource ? (
              <td className="p-4">
                <AdminTableCellText>{formatDate(item.date)}</AdminTableCellText>
              </td>
            ) : null}
            <td className="p-4">
              <StatusBadge status={item.status} />
            </td>
            {isEventResource ? (
              <td
                className={`p-4 ${isDayMode ? "text-indigo-600" : "text-indigo-300"}`}
              >
                {formatNumber(item.views)}
              </td>
            ) : null}
            {isEventResource ? (
              <td
                className={`p-4 ${isDayMode ? "text-emerald-700" : "text-emerald-300"}`}
              >
                {formatNumber(item.registration_count)}
              </td>
            ) : null}
            {type === "image" ? (
              <td className="p-4">
                {item.url ? (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <div className="text-xs text-gray-500">无预览</div>
                )}
              </td>
            ) : null}
            {type === "audio" ? (
              <td className="p-4">
                <AdminTableCellText>{item.artist || "-"}</AdminTableCellText>
              </td>
            ) : null}
            <td className="p-4">{renderTaxonomyPills(item, 4)}</td>
            <td className="p-4">
              <div className="flex justify-end gap-2">
                <AdminIconButton onClick={() => handleEdit(item)} label="编辑">
                  <Edit2 size={16} />
                </AdminIconButton>
                <AdminIconButton
                  onClick={() => openConfirm("delete", { id: item.id })}
                  label="删除"
                  tone="danger"
                >
                  <Trash2 size={16} />
                </AdminIconButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTableShell>
  );

  if (loading) {
    return <AdminLoadingState text="正在加载资源列表..." />;
  }

  return (
    <>
      <AdminPageShell
        title={title}
        description={descriptionMap[type] || "管理当前资源内容。"}
        actions={
          <>
            <AdminButton
              tone="subtle"
              onClick={() => fetchItems(pagination.page)}
            >
              <RefreshCw size={16} />
              刷新
            </AdminButton>
            <AdminButton tone="primary" onClick={handleAdd}>
              <Plus size={16} />
              新增内容
            </AdminButton>
          </>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup className="flex-1">
              <form
                onSubmit={handleSearch}
                className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center"
              >
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={isEventResource ? "搜索标题或分类" : "搜索标题或标签"}
                    className="theme-admin-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                  />
                </div>
                <AdminButton
                  type="submit"
                  tone="subtle"
                  className="w-full sm:w-auto"
                >
                  搜索
                </AdminButton>
                {searchInput || searchQuery ? (
                  <AdminButton
                    tone="subtle"
                    className="w-full sm:w-auto"
                    onClick={clearSearch}
                  >
                    <X size={16} />
                    清空
                  </AdminButton>
                ) : null}
              </form>
            </ToolbarGroup>

            <ToolbarGroup>
              {STATUS_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.id}
                  active={statusFilter === filter.id}
                  onClick={() => updateStatusFilter(filter.id)}
                >
                  {filter.label}
                </FilterChip>
              ))}
              {isEventResource ? (
                <div className="min-w-[220px]">
                  <Dropdown
                    value={sort}
                    onChange={setSort}
                    options={eventSortOptions}
                    placeholder="排序方式"
                    icon={BarChart3}
                  />
                </div>
              ) : null}
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        {isEventResource && eventStats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AdminMetricCard
              label="累计访问"
              value={formatNumber(eventStats.totalViews)}
              icon={Eye}
            />
            <AdminMetricCard
              label="累计报名"
              value={formatNumber(eventStats.totalRegistrations)}
              icon={Users}
              tone="emerald"
            />
            <AdminMetricCard
              label="待开始活动"
              value={formatNumber(eventStats.upcoming)}
              icon={CalendarDays}
              tone="amber"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminMetricCard
            label="当前结果"
            value={formatNumber(statusCounts.total)}
          />
          <AdminMetricCard
            label="已通过"
            value={formatNumber(statusCounts.approved || 0)}
            tone="emerald"
          />
          <AdminMetricCard
            label="待审核"
            value={formatNumber(statusCounts.pending || 0)}
            tone="amber"
          />
          <AdminMetricCard
            label="已驳回"
            value={formatNumber(statusCounts.rejected || 0)}
            tone="rose"
          />
        </div>

        <AdminInlineNote
          tone={statusFilter === "all" && !searchQuery ? "info" : "warning"}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            列表范围：本页 {items.length} 条，服务器 {formatNumber(serverTotal)} 条；
            筛选为“{activeFilterLabel}”
            {searchQuery ? `，搜索“${searchQuery}”` : ""}。
          </span>
          <button
            type="button"
            className="inline-flex shrink-0 font-semibold underline underline-offset-4"
            onClick={() => scrollToList()}
          >
            查看列表
          </button>
        </AdminInlineNote>

        {selectedItems.length > 0 ? (
          <AdminSelectedBar>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm">
                已选择{" "}
                <span className="font-semibold">{selectedItems.length}</span>{" "}
                  条当前可见内容。
                </div>
                <AdminHelperText className="mt-1">
                  批量操作只会作用于当前已选项目，不会自动包含其它分页或未加载结果。
                </AdminHelperText>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  tone="success"
                  onClick={() =>
                    openConfirm("batch-status", {
                      ids: selectedItems.map((item) => item.id),
                      status: "approved",
                    })
                  }
                >
                  <CheckCircle2 size={16} />
                  批量通过
                </AdminButton>
                <AdminButton
                  tone="subtle"
                  onClick={() =>
                    openConfirm("batch-status", {
                      ids: selectedItems.map((item) => item.id),
                      status: "rejected",
                    })
                  }
                >
                  <RotateCcw size={16} />
                  批量驳回
                </AdminButton>
                <AdminButton
                  tone="danger"
                  onClick={() =>
                    openConfirm("batch-delete", {
                      ids: selectedItems.map((item) => item.id),
                    })
                  }
                >
                  <Trash2 size={16} />
                  批量删除
                </AdminButton>
              </div>
            </div>
          </AdminSelectedBar>
        ) : null}

        <div ref={listRef} className="scroll-mt-28">
          <AdminPanel
            title={`${title}列表`}
            description={`当前可见 ${visibleTotal} 条结果，服务器总计 ${formatNumber(serverTotal)} 条。`}
          >
            {filteredItems.length === 0 ? (
              <AdminEmptyState
                icon={Icon}
                title="没有匹配的内容"
                description="尝试切换状态筛选、清空搜索词，或者直接创建新内容。"
                action={
                  <AdminButton tone="primary" onClick={handleAdd}>
                    <Plus size={16} />
                    新增内容
                  </AdminButton>
                }
              />
            ) : (
              <>
                {renderMobileCards()}
                {renderTable()}
              </>
            )}

            {pagination.totalPages > 1 ? (
              <div className="mt-5 flex items-center justify-center gap-3">
                <AdminButton
                  tone="subtle"
                  disabled={pagination.page === 1}
                  onClick={() => fetchPage(pagination.page - 1)}
                >
                  <ChevronLeft size={16} />
                </AdminButton>
                <span className={`text-sm ${mutedTextClass}`}>
                  第 {pagination.page} / {pagination.totalPages} 页
                </span>
                <AdminButton
                  tone="subtle"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => fetchPage(pagination.page + 1)}
                >
                  <ChevronRight size={16} />
                </AdminButton>
              </div>
            ) : null}
          </AdminPanel>
        </div>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.mode === "delete"
            ? "确认删除内容"
            : confirmState?.mode === "batch-delete"
              ? "确认批量删除"
              : confirmState?.status === "approved"
                ? "确认批量通过"
                : "确认批量驳回"
        }
        description={
          confirmState?.mode === "delete"
            ? "这将直接永久删除该内容，无法撤销。"
            : confirmState?.mode === "batch-delete"
              ? `即将永久删除 ${confirmState?.ids?.length || 0} 条内容，无法撤销。`
              : confirmState?.status === "approved"
                ? `即将通过 ${confirmState?.ids?.length || 0} 条内容。`
                : `即将驳回 ${confirmState?.ids?.length || 0} 条内容。`
        }
        confirmText={
          confirmState?.mode?.includes("delete")
            ? "确认删除"
            : confirmState?.status === "approved"
              ? "确认通过"
              : "确认驳回"
        }
        tone={
          confirmState?.mode?.includes("delete")
            ? "danger"
            : confirmState?.status === "approved"
              ? "success"
              : "danger"
        }
        pending={actionPending}
        onConfirm={submitConfirmedAction}
        onCancel={closeConfirm}
      />

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleSave}
        type={type}
        initialData={editingItem}
      />
    </>
  );
};

export default ResourceManager;
