import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Cpu,
  Edit2,
  ExternalLink,
  FileStack,
  HelpCircle,
  MessageSquare,
  Newspaper,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import api from "../../services/api";
import { useSettings } from "../../context/SettingsContext";
import {
  AdminButton,
  AdminEmptyState,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminTableShell,
  ConfirmDialog,
  FilterChip,
  StatusBadge,
  ToolbarGroup,
} from "./AdminUI";

const BOARD_META = {
  tech: { labelKey: "admin.community.boards.tech", fallback: "技术分享", icon: Cpu, tone: "text-sky-500" },
  help: { labelKey: "admin.community.boards.help", fallback: "求助问答", icon: HelpCircle, tone: "text-amber-500" },
  materials: { labelKey: "admin.community.boards.materials", fallback: "期末资料", icon: FileStack, tone: "text-emerald-500" },
  news: { labelKey: "admin.community.boards.news", fallback: "新闻热点", icon: Newspaper, tone: "text-rose-500" },
  team: { labelKey: "admin.community.boards.team", fallback: "组队协作", icon: Users, tone: "text-violet-500" },
};

const WORKFLOW_FILTERS = [
  { key: "all", labelKey: "admin.community.filters.all_status", fallback: "全部状态" },
  { key: "draft", labelKey: "admin.community.filters.draft", fallback: "草稿" },
  { key: "pending", labelKey: "admin.community.filters.pending", fallback: "待审核" },
  { key: "approved", labelKey: "admin.community.filters.approved", fallback: "已发布" },
  { key: "rejected", labelKey: "admin.community.filters.rejected", fallback: "已驳回" },
  { key: "deleted", labelKey: "admin.community.filters.deleted", fallback: "已下架" },
];

const EMPTY_GROUP_FORM = {
  id: null,
  name: "",
  description: "",
  platform: "wechat",
  invite_link: "",
  qr_code_url: "",
  member_count: 0,
  category: "",
};

const toDateText = (value) => (value ? new Date(value).toLocaleDateString("zh-CN") : "-");

const safeArray = (value) => (Array.isArray(value) ? value : []);

const statusOf = (item) => item.workflow_status || item.review_status || item.status || "approved";

const normalizeArticle = (item, t) => ({
  id: item.id,
  type: "article",
  boardKey: "tech",
  title: item.title || t("admin.community.untitled_article", "未命名文章"),
  excerpt: item.excerpt || item.content || "",
  author: item.author_name || item.author || "-",
  status: statusOf(item),
  createdAt: item.created_at,
  metric: t("admin.community.praise_metric", { count: item.likes || 0, defaultValue: "{{count}} 赞" }),
  href: `/articles?postTab=tech&id=${item.id}`,
  raw: item,
});

const normalizeNews = (item, t) => ({
  id: item.id,
  type: "news",
  boardKey: "news",
  title: item.title || t("admin.community.untitled_news", "未命名新闻"),
  excerpt: item.excerpt || item.content || "",
  author: item.author_name || item.source_name || "-",
  status: statusOf(item),
  createdAt: item.created_at,
  metric: t("admin.community.hot_metric", { count: item.hot_score || 0, defaultValue: "{{count}} 热度" }),
  href: `/articles?postTab=news&news=${item.id}`,
  raw: item,
});

const normalizePost = (item, t) => {
  const boardKey = item.section === "team" ? "team" : item.section === "materials" ? "materials" : "help";
  const materialMeta = [
    item.material_course,
    item.material_teacher,
    item.material_semester,
    item.material_type ? t(`community.material_type_${item.material_type}`, item.material_type) : "",
  ].filter(Boolean);
  return {
    id: item.id,
    type: "post",
    boardKey,
    title: item.title || t("admin.community.untitled_post", "未命名帖子"),
    excerpt: item.excerpt || item.content || materialMeta.join(" / ") || "",
    author: item.author_name || item.author || "-",
    status: statusOf(item),
    createdAt: item.created_at,
    metric: t("admin.community.reply_metric", { count: item.comments_count || 0, defaultValue: "{{count}} 回复" }),
    href: `/articles?postTab=${boardKey}&post=${item.id}`,
    materialMeta,
    raw: item,
  };
};

const AdminCommunity = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [stats, setStats] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("content");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [boardFilter, setBoardFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [groupReviewFilter, setGroupReviewFilter] = useState("all");
  const [noteFilter, setNoteFilter] = useState("all");
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP_FORM);
  const [groupSaving, setGroupSaving] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [pendingAction, setPendingAction] = useState({ key: "", mode: "" });
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await api.get("/admin/community/stats");
      setStats(response.data);
    } catch {
      toast.error(t("admin.community.load_stats_failed", "获取社区统计失败"));
    } finally {
      setLoadingStats(false);
    }
  }, [t]);

  const fetchContent = useCallback(async () => {
    setLoadingContent(true);
    try {
      const [articlesRes, newsRes, postsRes] = await Promise.all([
        api.get("/articles", { params: { page: 1, limit: 80, status: "all", category: "tech", sort: "newest" } }),
        api.get("/news", { params: { page: 1, limit: 80, status: "all", sort: "latest" } }),
        api.get("/community/posts", { params: { page: 1, limit: 100, workflow_status: "all", sort: "newest" } }),
      ]);

      const articles = safeArray(articlesRes.data?.data || articlesRes.data).map((item) => normalizeArticle(item, t));
      const news = safeArray(newsRes.data?.data || newsRes.data).map((item) => normalizeNews(item, t));
      const posts = safeArray(postsRes.data?.data || postsRes.data)
        .filter((item) => item.section === "help" || item.section === "team" || item.section === "materials")
        .map((item) => normalizePost(item, t));

      setContentItems([...articles, ...news, ...posts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.community.load_content_failed", "获取社区内容失败"));
    } finally {
      setLoadingContent(false);
    }
  }, [t]);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const response = await api.get("/community/groups", {
        params: { review_status: groupReviewFilter },
      });
      setGroups(response.data || []);
    } catch {
      toast.error(t("admin.community.load_groups_failed", "获取社群列表失败"));
    } finally {
      setLoadingGroups(false);
    }
  }, [groupReviewFilter, t]);

  useEffect(() => {
    fetchStats();
    fetchContent();
    fetchGroups();
  }, [fetchContent, fetchGroups, fetchStats]);

  const filteredContent = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contentItems.filter((item) => {
      if (boardFilter !== "all" && item.boardKey !== boardFilter) return false;
      if (workflowFilter !== "all" && item.status !== workflowFilter) return false;
      if (!term) return true;
      return [item.title, item.excerpt, item.author, ...(item.materialMeta || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [boardFilter, contentItems, search, workflowFilter]);

  const filteredGroups = useMemo(() => {
    if (noteFilter === "has_note") {
      return groups.filter((group) => String(group.review_note || "").trim().length > 0);
    }
    if (noteFilter === "no_note") {
      return groups.filter((group) => String(group.review_note || "").trim().length === 0);
    }
    return groups;
  }, [groups, noteFilter]);

  const contentStats = useMemo(() => {
    const base = {
      total: contentItems.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    contentItems.forEach((item) => {
      if (base[item.status] !== undefined) base[item.status] += 1;
    });
    return base;
  }, [contentItems]);

  const statCards = [
    { label: t("admin.community.stat_content", "统一内容"), value: contentStats.total, icon: MessageSquare },
    { label: t("admin.community.stat_pending", "待审核"), value: contentStats.pending, icon: AlertCircle },
    { label: t("admin.community.stat_published", "已发布"), value: contentStats.approved, icon: CheckCircle },
    { label: t("admin.community.stat_groups", "社群数量"), value: stats?.groups || groups.length || 0, icon: Users },
  ];

  const actionKey = (item, mode) => `${item.type}:${item.id}:${mode}`;

  const refreshAll = () => {
    fetchStats();
    fetchContent();
    fetchGroups();
  };

  const reviewItem = async (item, status, reason = "") => {
    const mode = status === "approved" ? "approve" : "reject";
    setPendingAction({ key: actionKey(item, mode), mode });
    try {
      if (item.type === "article") {
        await api.put(`/articles/${item.id}/status`, { status, reason });
      } else if (item.type === "news") {
        await api.put(`/news/${item.id}/review`, { status, reason });
      } else {
        await api.put(`/admin/community/posts/${item.id}/review`, {
          action: status === "approved" ? "approve" : "reject",
          reason,
        });
      }
      toast.success(status === "approved" ? t("admin.community.approved_toast", "内容已通过") : t("admin.community.rejected_toast", "内容已驳回"));
      fetchContent();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.community.review_failed", "内容审核失败"));
    } finally {
      setPendingAction({ key: "", mode: "" });
    }
  };

  const requestReject = (item) => {
    const reason = window.prompt(t("admin.community.reject_prompt", "请输入驳回原因（可选）"), item.raw?.rejection_reason || "");
    if (reason === null) return;
    reviewItem(item, "rejected", reason.trim());
  };

  const deleteItem = async (item) => {
    setPendingAction({ key: actionKey(item, "delete"), mode: "delete" });
    try {
      if (item.type === "article") {
        await api.delete(`/articles/${item.id}`);
      } else if (item.type === "news") {
        await api.delete(`/news/${item.id}`);
      } else {
        await api.delete(`/community/posts/${item.id}`);
      }
      toast.success(t("admin.community.deleted_toast", "内容已下架"));
      fetchContent();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.community.delete_failed", "下架失败"));
    } finally {
      setPendingAction({ key: "", mode: "" });
      setConfirmAction(null);
    }
  };

  const restoreItem = async (item) => {
    setPendingAction({ key: actionKey(item, "restore"), mode: "restore" });
    try {
      if (item.type === "article") {
        await api.post(`/articles/${item.id}/restore`);
      } else if (item.type === "news") {
        await api.post(`/news/${item.id}/restore`);
      } else {
        await api.post(`/community/posts/${item.id}/restore`);
      }
      toast.success(t("admin.community.restored_toast", "内容已恢复"));
      fetchContent();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.community.restore_failed", "恢复失败"));
    } finally {
      setPendingAction({ key: "", mode: "" });
    }
  };

  const toggleNewsPin = async (item) => {
    setPendingAction({ key: actionKey(item, "pin"), mode: "pin" });
    try {
      await api.put(`/news/${item.id}`, {
        ...item.raw,
        is_pinned: item.raw?.is_pinned ? 0 : 1,
        pin_weight: item.raw?.is_pinned ? 0 : Math.max(Number(item.raw?.pin_weight || 0), 100),
      });
      toast.success(item.raw?.is_pinned ? t("admin.community.unpinned_toast", "已取消置顶") : t("admin.community.pinned_toast", "新闻已置顶"));
      fetchContent();
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.community.pin_failed", "置顶操作失败"));
    } finally {
      setPendingAction({ key: "", mode: "" });
    }
  };

  const handleGroupFieldChange = (key, value) => {
    setGroupForm((previous) => ({ ...previous, [key]: value }));
  };

  const submitGroup = async () => {
    setGroupSaving(true);
    try {
      const payload = {
        name: groupForm.name,
        description: groupForm.description,
        platform: groupForm.platform,
        invite_link: groupForm.invite_link || null,
        qr_code_url: groupForm.qr_code_url || null,
        member_count: Number(groupForm.member_count || 0),
        category: groupForm.category || null,
      };

      if (groupForm.id) {
        await api.put(`/community/groups/${groupForm.id}`, payload);
        toast.success(t("admin.community.group_updated", "社群已更新"));
      } else {
        await api.post("/community/groups", payload);
        toast.success(t("admin.community.group_created", "社群已创建"));
      }

      setGroupForm(EMPTY_GROUP_FORM);
      fetchGroups();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.community.group_save_failed", "保存社群失败"));
    } finally {
      setGroupSaving(false);
    }
  };

  const handleEditGroup = (group) => {
    setActiveTab("groups");
    setGroupForm({
      id: group.id,
      name: group.name || "",
      description: group.description || "",
      platform: group.platform || "wechat",
      invite_link: group.invite_link || "",
      qr_code_url: group.qr_code_url || "",
      member_count: group.member_count || 0,
      category: group.category || "",
    });
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupId) return;
    setGroupSaving(true);
    try {
      await api.delete(`/community/groups/${deleteGroupId}`);
      toast.success(t("admin.community.group_deleted", "社群已删除"));
      setDeleteGroupId(null);
      fetchGroups();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || t("admin.community.group_delete_failed", "删除社群失败"));
    } finally {
      setGroupSaving(false);
    }
  };

  const renderContentMobileCards = () => (
    <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
      {filteredContent.map((item) => {
        const meta = BOARD_META[item.boardKey] || BOARD_META.help;
        const Icon = meta.icon;
        return (
          <article
            key={`${item.type}-${item.id}`}
            className={`rounded-lg border p-4 ${
              isDayMode
                ? "border-slate-200/70 bg-white/[0.78]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`inline-flex items-center gap-2 ${isDayMode ? "text-slate-600" : "text-gray-300"}`}>
                <Icon size={14} className={meta.tone} />
                {t(meta.labelKey, meta.fallback)}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <h3 className={`mt-3 line-clamp-2 font-semibold ${isDayMode ? "text-slate-900" : "text-white"}`}>
              {item.title}
            </h3>
            <p className={`mt-2 line-clamp-2 text-sm ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
              {item.excerpt || t("admin.community.no_excerpt", "暂无摘要")}
            </p>
            <div className={`mt-3 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              {item.author} · {toDateText(item.createdAt)} · {item.metric}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton tone="subtle" className="min-w-0 flex-1" onClick={() => window.open(item.href, "_blank", "noopener,noreferrer")}>
                {t("admin.community.view", "查看")}
              </AdminButton>
              {item.status !== "approved" ? (
                <AdminButton tone="success" className="min-w-0 flex-1" disabled={pendingAction.key === actionKey(item, "approve")} onClick={() => reviewItem(item, "approved")}>
                  {t("admin.community.approve", "通过")}
                </AdminButton>
              ) : null}
              <AdminButton tone="danger" className="min-w-0 flex-1" disabled={pendingAction.key === actionKey(item, "reject")} onClick={() => requestReject(item)}>
                {t("admin.community.reject", "驳回")}
              </AdminButton>
            </div>
          </article>
        );
      })}
    </div>
  );

  if (loadingStats && loadingContent && loadingGroups) {
    return <AdminLoadingState text={t("admin.community.loading", "正在加载社区内容管理...")} />;
  }

  return (
    <>
      <AdminPageShell
        title={t("admin.community.title", "社区内容管理")}
        description={t("admin.community.description", "统一管理 AI 社区四个版面：技术分享、求助问答、新闻热点和组队协作。底层仍调用现有文章、新闻、社区帖子接口。")}
        actions={
          <AdminButton tone="subtle" onClick={refreshAll}>
            <RefreshCw size={16} />
            {t("admin.community.refresh", "刷新")}
          </AdminButton>
        }
      >
        {loadingStats ? (
          <AdminLoadingState text={t("admin.community.loading_stats", "正在加载社区统计...")} />
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <AdminPanel key={card.label} className="p-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <card.icon size={16} className={isDayMode ? "text-indigo-600" : "text-indigo-300"} />
                  {card.label}
                </div>
                <div className={`mt-2 text-xl font-bold ${isDayMode ? "text-slate-950" : "text-white"}`}>{card.value}</div>
              </AdminPanel>
            ))}
          </div>
        )}

        <AdminPanel
          title={t("admin.community.workspace", "工作区")}
          action={
            <div className="flex gap-2">
              <FilterChip active={activeTab === "content"} onClick={() => setActiveTab("content")}>
                {t("admin.community.content_tab", "内容管理")}
              </FilterChip>
              <FilterChip active={activeTab === "groups"} onClick={() => setActiveTab("groups")}>
                {t("admin.community.groups_tab", "社群维护")}
              </FilterChip>
            </div>
          }
        >
          {activeTab === "content" ? (
            <>
              <div className="grid gap-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <ToolbarGroup>
                    <FilterChip active={boardFilter === "all"} onClick={() => setBoardFilter("all")}>
                      {t("admin.community.filters.all_boards", "全部版面")}
                    </FilterChip>
                    {Object.entries(BOARD_META).map(([key, meta]) => (
                      <FilterChip key={key} active={boardFilter === key} onClick={() => setBoardFilter(key)}>
                        {t(meta.labelKey, meta.fallback)}
                      </FilterChip>
                    ))}
                  </ToolbarGroup>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("admin.community.search_placeholder", "搜索标题、摘要或作者")}
                    className="theme-admin-input min-h-[40px] w-full rounded-[6px] px-3 text-sm xl:w-72"
                  />
                </div>
                <ToolbarGroup>
                  {WORKFLOW_FILTERS.map((item) => (
                    <FilterChip key={item.key} active={workflowFilter === item.key} onClick={() => setWorkflowFilter(item.key)}>
                      {t(item.labelKey, item.fallback)}
                    </FilterChip>
                  ))}
                </ToolbarGroup>
              </div>

              {loadingContent ? (
                <AdminLoadingState text={t("admin.community.loading_content", "正在加载社区内容...")} />
              ) : filteredContent.length === 0 ? (
                <AdminEmptyState
                  icon={MessageSquare}
                  title={t("admin.community.empty_content_title", "当前没有匹配的社区内容")}
                  description={t("admin.community.empty_content_desc", "可以切换版面、状态或清空搜索词后再试。")}
                />
              ) : (
                <>
                  {renderContentMobileCards()}
                  <div className="mt-4">
                    <AdminTableShell minWidth={1040}>
                      <thead>
                        <tr className={`border-b text-xs uppercase tracking-[0.2em] ${isDayMode ? "border-slate-200/80 text-slate-500" : "border-white/10 text-gray-500"}`}>
                          <th className="p-4">{t("admin.community.title_col", "标题")}</th>
                          <th className="p-4">{t("admin.community.board_col", "版面")}</th>
                          <th className="p-4">{t("admin.community.author_col", "作者")}</th>
                          <th className="p-4">{t("admin.community.review_col", "审核状态")}</th>
                          <th className="p-4">{t("admin.community.metric_col", "热度/回复")}</th>
                          <th className="p-4">{t("admin.community.created_col", "创建时间")}</th>
                          <th className="p-4 text-right">{t("admin.community.actions_col", "操作")}</th>
                        </tr>
                      </thead>
                      <tbody className="theme-admin-table-body divide-y">
                        {filteredContent.map((item) => {
                          const meta = BOARD_META[item.boardKey] || BOARD_META.help;
                          const Icon = meta.icon;
                          const isDeleted = item.status === "deleted";
                          return (
                            <tr key={`${item.type}-${item.id}`} className={isDayMode ? "hover:bg-slate-50/80" : "hover:bg-white/[0.03]"}>
                              <td className="p-4">
                                <div className={`line-clamp-1 font-semibold ${isDayMode ? "text-slate-900" : "text-white"}`}>{item.title}</div>
                                <div className={`mt-1 line-clamp-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
                                  {item.excerpt || t("admin.community.no_excerpt", "暂无摘要")}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-2 ${isDayMode ? "text-slate-600" : "text-gray-300"}`}>
                                  <Icon size={14} className={meta.tone} />
                                  {t(meta.labelKey, meta.fallback)}
                                </span>
                              </td>
                              <td className={`p-4 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>{item.author}</td>
                              <td className="p-4">
                                <StatusBadge status={item.status} />
                              </td>
                              <td className={`p-4 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>{item.metric}</td>
                              <td className={`p-4 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>{toDateText(item.createdAt)}</td>
                              <td className="p-4">
                                <div className="flex justify-end gap-2">
                                  <ActionIcon href={item.href} title={t("admin.community.view_content", "查看内容")} isDayMode={isDayMode}>
                                    <ExternalLink size={16} />
                                  </ActionIcon>
                                  {item.type === "news" ? (
                                    <ActionButton
                                      title={item.raw?.is_pinned ? t("admin.community.unpin_news", "取消置顶") : t("admin.community.pin_news", "置顶新闻")}
                                      isDayMode={isDayMode}
                                      disabled={pendingAction.key === actionKey(item, "pin")}
                                      onClick={() => toggleNewsPin(item)}
                                    >
                                      <Pin size={16} />
                                    </ActionButton>
                                  ) : null}
                                  {!isDeleted && item.status !== "approved" ? (
                                    <ActionButton
                                      title={t("admin.community.approve_content", "审核通过")}
                                      isDayMode={isDayMode}
                                      tone="success"
                                      disabled={pendingAction.key === actionKey(item, "approve")}
                                      onClick={() => reviewItem(item, "approved")}
                                    >
                                      <CheckCircle size={16} />
                                    </ActionButton>
                                  ) : null}
                                  {!isDeleted ? (
                                    <ActionButton
                                      title={t("admin.community.reject_content", "驳回内容")}
                                      isDayMode={isDayMode}
                                      tone="danger"
                                      disabled={pendingAction.key === actionKey(item, "reject")}
                                      onClick={() => requestReject(item)}
                                    >
                                      <XCircle size={16} />
                                    </ActionButton>
                                  ) : null}
                                  {isDeleted ? (
                                    <ActionButton
                                      title={t("admin.community.restore_content", "恢复内容")}
                                      isDayMode={isDayMode}
                                      tone="success"
                                      disabled={pendingAction.key === actionKey(item, "restore")}
                                      onClick={() => restoreItem(item)}
                                    >
                                      <RotateCcw size={16} />
                                    </ActionButton>
                                  ) : (
                                    <ActionButton
                                      title={t("admin.community.delete_content", "下架内容")}
                                      isDayMode={isDayMode}
                                      tone="danger"
                                      disabled={pendingAction.key === actionKey(item, "delete")}
                                      onClick={() => setConfirmAction({ type: "deleteItem", item })}
                                    >
                                      <Trash2 size={16} />
                                    </ActionButton>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </AdminTableShell>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <AdminPanel
                title={groupForm.id ? t("admin.community.edit_group", "编辑社群") : t("admin.community.new_group", "新增社群")}
                description={t("admin.community.groups_desc", "二维码社群继续作为辅助目录维护，不进入四版面主内容区。")}
                className={isDayMode ? "bg-white/[0.88]" : "bg-white/[0.03]"}
              >
                <div className="grid gap-4">
                  <FormField label={t("admin.community.group_name", "社群名称")} value={groupForm.name} onChange={(value) => handleGroupFieldChange("name", value)} />
                  <FormField label={t("admin.community.group_desc", "社群描述")} value={groupForm.description} onChange={(value) => handleGroupFieldChange("description", value)} textarea />
                  <FormField label={t("admin.community.platform", "平台")} value={groupForm.platform} onChange={(value) => handleGroupFieldChange("platform", value)} />
                  <FormField label={t("admin.community.invite_link", "邀请链接")} value={groupForm.invite_link} onChange={(value) => handleGroupFieldChange("invite_link", value)} />
                  <FormField label={t("admin.community.qr_link", "二维码图片链接")} value={groupForm.qr_code_url} onChange={(value) => handleGroupFieldChange("qr_code_url", value)} />
                  <FormField label={t("admin.community.member_count", "成员数量")} value={String(groupForm.member_count)} onChange={(value) => handleGroupFieldChange("member_count", value)} />
                  <FormField label={t("admin.community.category", "分类")} value={groupForm.category} onChange={(value) => handleGroupFieldChange("category", value)} />
                  <div className="flex gap-2">
                    <AdminButton tone="primary" disabled={groupSaving} onClick={submitGroup}>
                      <Plus size={16} />
                      {groupForm.id ? t("admin.community.save_group", "保存修改") : t("admin.community.create_group", "创建社群")}
                    </AdminButton>
                    <AdminButton tone="subtle" onClick={() => setGroupForm(EMPTY_GROUP_FORM)}>
                      {t("admin.community.reset", "重置")}
                    </AdminButton>
                  </div>
                </div>
              </AdminPanel>

              <div>
                {loadingGroups ? (
                  <AdminLoadingState text={t("admin.community.loading_groups", "正在加载社群列表...")} />
                ) : filteredGroups.length === 0 ? (
                  <AdminEmptyState icon={Users} title={t("admin.community.empty_groups_title", "还没有社群")} description={t("admin.community.empty_groups_desc", "可以先在左侧创建第一个社群入口。")} />
                ) : (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap gap-2">
                      <FilterChip active={groupReviewFilter === "all"} onClick={() => setGroupReviewFilter("all")}>
                        {t("admin.community.filters.all_status", "全部状态")}
                      </FilterChip>
                      <FilterChip active={groupReviewFilter === "approved"} onClick={() => setGroupReviewFilter("approved")}>
                        {t("admin.community.approved", "已通过")}
                      </FilterChip>
                      <FilterChip active={groupReviewFilter === "pending"} onClick={() => setGroupReviewFilter("pending")}>
                        {t("admin.community.filters.pending", "待审核")}
                      </FilterChip>
                      <FilterChip active={groupReviewFilter === "rejected"} onClick={() => setGroupReviewFilter("rejected")}>
                        {t("admin.community.filters.rejected", "已驳回")}
                      </FilterChip>
                      <FilterChip active={noteFilter === "all"} onClick={() => setNoteFilter("all")}>
                        {t("admin.community.all_notes", "全部备注")}
                      </FilterChip>
                      <FilterChip active={noteFilter === "has_note"} onClick={() => setNoteFilter("has_note")}>
                        {t("admin.community.has_note", "有备注")}
                      </FilterChip>
                      <FilterChip active={noteFilter === "no_note"} onClick={() => setNoteFilter("no_note")}>
                        {t("admin.community.no_note", "无备注")}
                      </FilterChip>
                    </div>
                    {filteredGroups.map((group) => (
                      <div key={group.id} className={`rounded-lg border p-4 ${isDayMode ? "border-slate-200/80 bg-white/[0.88]" : "border-white/10 bg-white/[0.03]"}`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`text-lg font-semibold ${isDayMode ? "text-slate-900" : "text-white"}`}>{group.name}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-xs ${isDayMode ? "bg-slate-100 text-slate-500" : "bg-white/5 text-gray-400"}`}>
                                {group.platform || "wechat"}
                              </span>
                              <StatusBadge status={group.review_status || "approved"} />
                            </div>
                            {group.description ? <p className={`mt-2 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>{group.description}</p> : null}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>{t("admin.community.members", { count: group.member_count || 0, defaultValue: "成员数: {{count}}" })}</span>
                              {group.invite_link ? <span>{t("admin.community.has_invite", "含邀请链接")}</span> : null}
                              {group.qr_code_url ? <span>{t("admin.community.has_qr", "含二维码")}</span> : null}
                            </div>
                            {group.review_note ? (
                              <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${isDayMode ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}`}>
                                {t("admin.community.note", { note: group.review_note, defaultValue: "备注：{{note}}" })}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <ActionButton title={t("admin.community.edit_group_action", "编辑社群")} isDayMode={isDayMode} onClick={() => handleEditGroup(group)}>
                              <Edit2 size={16} />
                            </ActionButton>
                            <ActionButton title={t("admin.community.delete_group_action", "删除社群")} isDayMode={isDayMode} tone="danger" onClick={() => setDeleteGroupId(group.id)}>
                              <Trash2 size={16} />
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </AdminPanel>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(deleteGroupId)}
        title={t("admin.community.confirm_delete_group", "确认删除社群")}
        description={t("admin.community.confirm_delete_group_desc", "删除后该社群入口会立即从社区页面中移除。")}
        confirmText={t("admin.community.confirm_delete", "确认删除")}
        tone="danger"
        pending={groupSaving}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setDeleteGroupId(null)}
      />

      <ConfirmDialog
        open={confirmAction?.type === "deleteItem"}
        title={t("admin.community.confirm_delete_content", "确认下架内容")}
        description={t("admin.community.confirm_delete_content_desc", "下架后公开列表会立即隐藏该内容，后续可在统一内容管理中恢复。")}
        confirmText={t("admin.community.confirm_unpublish", "确认下架")}
        tone="danger"
        pending={pendingAction.mode === "delete"}
        onConfirm={() => confirmAction?.item && deleteItem(confirmAction.item)}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
};

const iconButtonBase = (isDayMode, tone = "default") => {
  const base = "inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg transition-colors disabled:opacity-50";
  if (tone === "success") {
    return `${base} ${isDayMode ? "border border-slate-200/80 bg-white text-emerald-600 hover:bg-emerald-50" : "bg-white/5 text-emerald-300 hover:bg-emerald-500/10"}`;
  }
  if (tone === "danger") {
    return `${base} ${isDayMode ? "border border-slate-200/80 bg-white text-rose-600 hover:bg-rose-50" : "bg-white/5 text-red-300 hover:bg-red-500/10"}`;
  }
  return `${base} ${isDayMode ? "border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`;
};

const ActionButton = ({ title, isDayMode, tone = "default", children, ...props }) => (
  <button type="button" title={title} aria-label={title} className={iconButtonBase(isDayMode, tone)} {...props}>
    {children}
  </button>
);

const ActionIcon = ({ href, title, isDayMode, children }) => (
  <a href={href} title={title} aria-label={title} target="_blank" rel="noreferrer" className={iconButtonBase(isDayMode)}>
    {children}
  </a>
);

const inputClassName = "theme-admin-input w-full rounded-lg p-3";

const FormField = ({ label, value, onChange, textarea = false }) => (
  <div>
    <label className="theme-admin-muted mb-2 block text-sm font-medium">{label}</label>
    {textarea ? (
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={inputClassName} />
    ) : (
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} />
    )}
  </div>
);

export default AdminCommunity;
