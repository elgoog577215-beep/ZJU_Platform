import React, { useEffect, useMemo, useState } from "react";
import { Search, Check, X, Clock, Inbox, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { getEventCategoryLabel } from "../../data/eventTaxonomy";
import {
  AdminButton,
  AdminEmptyState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  StatusBadge,
  ToolbarGroup,
} from "./AdminUI";

const TYPE_LABELS = {
  photos: "图片",
  videos: "视频",
  music: "音频",
  articles: "文章",
  events: "活动",
};

const PendingReviewManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [selected, setSelected] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/pending");
      setItems(response.data || []);
    } catch (error) {
      const errorMessage =
        error.response?.status === 403
          ? "没有权限访问审核中心"
          : error.response?.status === 401
            ? "请先登录管理员账号"
            : "获取待审核内容失败";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const filteredItems = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = activeType === "all" || item.type === activeType;
      const eventCategoryText =
        item.type === "events"
          ? `${item.category || ""} ${getEventCategoryLabel(item.category) || ""}`
          : "";
      const tagText = item.type === "events" ? "" : String(item.tags || "");
      const matchesKeyword =
        !lowerKeyword ||
        String(item.title || "")
          .toLowerCase()
          .includes(lowerKeyword) ||
        String(item.description || "")
          .toLowerCase()
          .includes(lowerKeyword) ||
        eventCategoryText.toLowerCase().includes(lowerKeyword) ||
        tagText.toLowerCase().includes(lowerKeyword);
      return matchesType && matchesKeyword;
    });
  }, [activeType, items, keyword]);

  const countsByType = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        accumulator[item.type] = (accumulator[item.type] || 0) + 1;
        return accumulator;
      },
      { all: items.length },
    );
  }, [items]);

  const openConfirm = (mode, currentItems) => {
    setConfirmState({ mode, items: currentItems });
  };

  const clearConfirm = () => setConfirmState(null);

  const submitReview = async () => {
    if (!confirmState?.items?.length) return;
    setSubmitting(true);
    const status = confirmState.mode === "approve" ? "approved" : "rejected";
    const reason = confirmState.mode === "approve" ? "" : "管理员驳回";

    try {
      await Promise.all(
        confirmState.items.map((item) =>
          api.put(`/${item.type}/${item.id}/status`, { status, reason }),
        ),
      );
      const acceptedKeys = new Set(
        confirmState.items.map((item) => `${item.type}-${item.id}`),
      );
      setItems((previous) =>
        previous.filter((item) => !acceptedKeys.has(`${item.type}-${item.id}`)),
      );
      setSelected((previous) =>
        previous.filter((key) => !acceptedKeys.has(key)),
      );
      toast.success(
        confirmState.mode === "approve"
          ? `已通过 ${confirmState.items.length} 条内容`
          : `已驳回 ${confirmState.items.length} 条内容`,
      );
      clearConfirm();
    } catch {
      toast.error("审核操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelected = (item) => {
    const key = `${item.type}-${item.id}`;
    setSelected((previous) =>
      previous.includes(key)
        ? previous.filter((value) => value !== key)
        : [...previous, key],
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleKeys = filteredItems.map((item) => `${item.type}-${item.id}`);
    const allVisibleSelected = visibleKeys.every((key) =>
      selected.includes(key),
    );
    if (allVisibleSelected) {
      setSelected((previous) =>
        previous.filter((key) => !visibleKeys.includes(key)),
      );
    } else {
      setSelected((previous) =>
        Array.from(new Set([...previous, ...visibleKeys])),
      );
    }
  };

  if (loading) {
    return <AdminLoadingState text="正在加载待审核内容..." />;
  }

  const selectedItems = filteredItems.filter((item) =>
    selected.includes(`${item.type}-${item.id}`),
  );

  return (
    <>
      <AdminPageShell
        title="审核中心"
        description="集中处理站内所有待审核资源。这里优先做批量操作，细节编辑再进入对应模块。"
        actions={
          <AdminButton tone="subtle" onClick={fetchPending}>
            <RefreshCw size={16} />
            刷新
          </AdminButton>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup className="w-full flex-1">
              <div className="relative w-full min-w-0 flex-1 md:max-w-md">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={activeType === "events" ? "搜索标题、描述或分类" : "搜索标题、描述或标签"}
                  className="theme-admin-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
            </ToolbarGroup>
            <ToolbarGroup>
              {["all", "photos", "videos", "music", "articles", "events"].map(
                (type) => (
                  <FilterChip
                    key={type}
                    active={activeType === type}
                    onClick={() => setActiveType(type)}
                  >
                    {type === "all" ? "全部" : TYPE_LABELS[type]} (
                    {countsByType[type] || 0})
                  </FilterChip>
                ),
              )}
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {["all", "photos", "videos", "music", "articles", "events"].map(
            (type) => (
              <AdminMetricCard
                key={type}
                label={type === "all" ? "全部待审" : TYPE_LABELS[type]}
                value={countsByType[type] || 0}
                tone={type === "all" ? "amber" : "indigo"}
              />
            ),
          )}
        </div>

        {selectedItems.length > 0 ? (
          <AdminPanel className="border-indigo-500/20 bg-indigo-500/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-indigo-200">
                已选择{" "}
                <span className="font-semibold">{selectedItems.length}</span>{" "}
                条待审核内容。
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  tone="success"
                  onClick={() => openConfirm("approve", selectedItems)}
                >
                  <Check size={16} />
                  批量通过
                </AdminButton>
                <AdminButton
                  tone="danger"
                  onClick={() => openConfirm("reject", selectedItems)}
                >
                  <X size={16} />
                  批量驳回
                </AdminButton>
              </div>
            </div>
          </AdminPanel>
        ) : null}

        <AdminPanel
          title={`待处理内容 (${filteredItems.length})`}
          description="这里只展示尚未处理的资源审核项。"
          action={
            filteredItems.length > 0 ? (
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  aria-label="全选当前结果"
                  checked={
                    filteredItems.length > 0 &&
                    filteredItems.every((item) =>
                      selected.includes(`${item.type}-${item.id}`),
                    )
                  }
                  onChange={toggleSelectAllVisible}
                  className="rounded border-white/20 bg-transparent"
                />
                全选当前结果
              </label>
            ) : null
          }
        >
          {filteredItems.length === 0 ? (
            <AdminEmptyState
              icon={Inbox}
              title={
                items.length === 0 ? "当前没有待审核内容" : "没有匹配的审核项"
              }
              description={
                items.length === 0
                  ? "所有资源都已经处理完成。"
                  : "可以尝试切换类型筛选或修改搜索关键词。"
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map((item) => {
                const itemKey = `${item.type}-${item.id}`;
                const isSelected = selected.includes(itemKey);
                return (
                  <div
                    key={itemKey}
                    className={`grid gap-4 rounded-2xl border p-4 transition-colors md:grid-cols-[auto_96px_minmax(0,1fr)_auto] ${
                      isSelected
                        ? "border-indigo-500/30 bg-indigo-500/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-start pt-1">
                      <input
                        type="checkbox"
                        aria-label={`选择 ${item.title || "未命名内容"}`}
                        checked={isSelected}
                        onChange={() => toggleSelected(item)}
                        className="mt-1 rounded border-white/20 bg-transparent"
                      />
                    </div>

                    <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                      {item.preview_image ? (
                        <img
                          src={item.preview_image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-500">
                          无预览
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status="pending" />
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                          {TYPE_LABELS[item.type] || item.type}
                        </span>
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                          ID {item.id}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {item.title || "未命名内容"}
                      </h3>
                      {item.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                          {item.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        {item.uploader_id ? (
                          <span>上传者 ID: {item.uploader_id}</span>
                        ) : null}
                        {item.category ? (
                          <span>
                            分类: {item.type === "events"
                              ? getEventCategoryLabel(item.category) || item.category
                              : item.category}
                          </span>
                        ) : null}
                        {item.type !== "events" && item.tags ? <span>标签: {item.tags}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:w-[180px] md:flex-col">
                      <AdminButton
                        tone="success"
                        className="flex-1"
                        onClick={() => openConfirm("approve", [item])}
                      >
                        <Check size={16} />
                        通过
                      </AdminButton>
                      <AdminButton
                        tone="danger"
                        className="flex-1"
                        onClick={() => openConfirm("reject", [item])}
                      >
                        <X size={16} />
                        驳回
                      </AdminButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.mode === "approve" ? "确认批量通过" : "确认批量驳回"
        }
        description={
          confirmState
            ? `即将${
                confirmState.mode === "approve" ? "通过" : "驳回"
              } ${confirmState.items.length} 条内容。`
            : ""
        }
        confirmText={confirmState?.mode === "approve" ? "确认通过" : "确认驳回"}
        tone={confirmState?.mode === "approve" ? "success" : "danger"}
        pending={submitting}
        onConfirm={submitReview}
        onCancel={clearConfirm}
      >
        {confirmState?.mode === "reject" ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            当前将使用统一驳回原因“管理员驳回”。后续如果后端提供原因字段检索，再补更细的驳回模板。
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
};

export default PendingReviewManager;
