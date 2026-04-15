import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Users,
  HelpCircle,
  Cpu,
  Newspaper,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  StatusBadge,
  ToolbarGroup,
} from "./AdminUI";

const SECTION_META = {
  help: { label: "求助", icon: HelpCircle },
  tech: { label: "技术", icon: Cpu },
  news: { label: "资讯", icon: Newspaper },
  team: { label: "组队", icon: Users },
};

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

const AdminCommunity = () => {
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [postAction, setPostAction] = useState({ pendingId: null, mode: "" });
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP_FORM);
  const [groupSaving, setGroupSaving] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await api.get("/admin/community/stats");
      setStats(response.data);
    } catch {
      toast.error("获取社区统计失败");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const response = await api.get("/community/posts", {
        params: { page: 1, limit: 50, sort: "newest" },
      });
      setPosts(response.data?.data || []);
    } catch {
      toast.error("获取社区帖子失败");
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const response = await api.get("/community/groups");
      setGroups(response.data || []);
    } catch {
      toast.error("获取社群列表失败");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPosts();
    fetchGroups();
  }, [fetchGroups, fetchPosts, fetchStats]);

  const filteredPosts = useMemo(() => {
    if (sectionFilter === "all") return posts;
    return posts.filter((post) => post.section === sectionFilter);
  }, [posts, sectionFilter]);

  const statCards = stats
    ? [
        { label: "帖子总数", value: stats.posts?.total || 0, icon: MessageSquare },
        { label: "待审核", value: stats.posts?.pending || 0, icon: AlertCircle },
        { label: "评论总数", value: stats.comments || 0, icon: MessageSquare },
        { label: "社群数量", value: stats.groups || 0, icon: Users },
      ]
    : [];

  const sectionCards = Object.entries(stats?.posts?.bySection || {}).map(([key, value]) => {
    const Icon = SECTION_META[key]?.icon || MessageSquare;
    return {
      id: key,
      label: SECTION_META[key]?.label || key,
      value,
      Icon,
    };
  });

  const handleReview = async (postId, action) => {
    setPostAction({ pendingId: postId, mode: action });
    try {
      await api.put(`/admin/community/posts/${postId}/review`, { action });
      setPosts((previous) =>
        previous.filter((post) => post.id !== postId),
      );
      toast.success(action === "approve" ? "帖子已通过" : "帖子已下架");
      fetchStats();
    } catch {
      toast.error("帖子操作失败");
    } finally {
      setPostAction({ pendingId: null, mode: "" });
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
        toast.success("社群已更新");
      } else {
        await api.post("/community/groups", payload);
        toast.success("社群已创建");
      }

      setGroupForm(EMPTY_GROUP_FORM);
      fetchGroups();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || "保存社群失败");
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
      toast.success("社群已删除");
      setDeleteGroupId(null);
      fetchGroups();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.error || "删除社群失败");
    } finally {
      setGroupSaving(false);
    }
  };

  if (loadingStats && loadingPosts && loadingGroups) {
    return <AdminLoadingState text="正在加载社区管理数据..." />;
  }

  return (
    <>
      <AdminPageShell
        title="社区运营"
        description="基于当前现有接口，这里优先提供社区统计、已发布帖子运营和社群列表维护。待审核数量来自管理统计。"
        actions={
          <AdminButton
            tone="subtle"
            onClick={() => {
              fetchStats();
              fetchPosts();
              fetchGroups();
            }}
          >
            <RefreshCw size={16} />
            刷新
          </AdminButton>
        }
      >
        {loadingStats ? (
          <AdminLoadingState text="正在加载社区统计..." />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((card) => (
              <AdminPanel key={card.label} className="p-5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <card.icon size={16} className="text-indigo-300" />
                  {card.label}
                </div>
                <div className="mt-3 text-2xl font-bold text-white">{card.value}</div>
              </AdminPanel>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
          <AdminPanel
            title="栏目分布"
            description="这里展示目前社区各栏目帖子数量。"
          >
            <div className="grid grid-cols-2 gap-3">
              {sectionCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => {
                    setActiveTab("posts");
                    setSectionFilter(card.id);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <card.Icon size={16} className="text-indigo-300" />
                    {card.label}
                  </div>
                  <div className="mt-3 text-2xl font-bold text-white">{card.value}</div>
                </button>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="接口说明" description="社区后台当前受现有 API 能力约束。">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              现有后端没有提供管理员专用的帖子列表接口，因此这里展示的是已发布帖子列表，
              可以用于运营巡检和下架处理。待审核数量仍会显示在统计卡中。
            </div>
          </AdminPanel>
        </div>

        <AdminPanel
          title="工作区"
          action={
            <div className="flex gap-2">
              <FilterChip active={activeTab === "posts"} onClick={() => setActiveTab("posts")}>
                帖子运营
              </FilterChip>
              <FilterChip active={activeTab === "groups"} onClick={() => setActiveTab("groups")}>
                社群维护
              </FilterChip>
            </div>
          }
        >
          {activeTab === "posts" ? (
            <>
              <AdminToolbar>
                <ToolbarGroup>
                  <FilterChip
                    active={sectionFilter === "all"}
                    onClick={() => setSectionFilter("all")}
                  >
                    全部栏目
                  </FilterChip>
                  {Object.entries(SECTION_META).map(([key, value]) => (
                    <FilterChip
                      key={key}
                      active={sectionFilter === key}
                      onClick={() => setSectionFilter(key)}
                    >
                      {value.label}
                    </FilterChip>
                  ))}
                </ToolbarGroup>
              </AdminToolbar>

              {loadingPosts ? (
                <AdminLoadingState text="正在加载社区帖子..." />
              ) : filteredPosts.length === 0 ? (
                <AdminEmptyState
                  icon={MessageSquare}
                  title="当前没有可展示的帖子"
                  description="可以切换栏目筛选或稍后刷新。"
                />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-gray-500">
                        <th className="p-4">标题</th>
                        <th className="p-4">栏目</th>
                        <th className="p-4">作者</th>
                        <th className="p-4">业务状态</th>
                        <th className="p-4">创建时间</th>
                        <th className="p-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPosts.map((post) => {
                        const Icon = SECTION_META[post.section]?.icon || MessageSquare;
                        return (
                          <tr key={post.id} className="hover:bg-white/[0.03]">
                            <td className="p-4">
                              <div className="font-semibold text-white">{post.title}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                {post.excerpt || "暂无摘要"}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-2 text-gray-300">
                                <Icon size={14} className="text-indigo-300" />
                                {SECTION_META[post.section]?.label || post.section}
                              </span>
                            </td>
                            <td className="p-4 text-gray-400">{post.author_name || "-"}</td>
                            <td className="p-4">
                              <StatusBadge status={post.status} />
                            </td>
                            <td className="p-4 text-gray-400">
                              {post.created_at
                                ? new Date(post.created_at).toLocaleDateString("zh-CN")
                                : "-"}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                <a
                                  href={`/community/${post.section}`}
                                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                  title="前往社区页面"
                                >
                                  <ExternalLink size={16} />
                                </a>
                                <button
                                  onClick={() => handleReview(post.id, "reject")}
                                  disabled={postAction.pendingId === post.id}
                                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-white/5 text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                                  title="下架帖子"
                                >
                                  <XCircle size={16} />
                                </button>
                                <button
                                  onClick={() => handleReview(post.id, "approve")}
                                  disabled={postAction.pendingId === post.id}
                                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-white/5 text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
                                  title="重新通过"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <AdminPanel
                title={groupForm.id ? "编辑社群" : "新增社群"}
                description="该表单直接调用现有 community groups 接口。"
                className="bg-white/[0.03]"
              >
                <div className="grid gap-4">
                  <FormField
                    label="社群名称"
                    value={groupForm.name}
                    onChange={(value) => handleGroupFieldChange("name", value)}
                  />
                  <FormField
                    label="社群描述"
                    value={groupForm.description}
                    onChange={(value) => handleGroupFieldChange("description", value)}
                    textarea
                  />
                  <FormField
                    label="平台"
                    value={groupForm.platform}
                    onChange={(value) => handleGroupFieldChange("platform", value)}
                  />
                  <FormField
                    label="邀请链接"
                    value={groupForm.invite_link}
                    onChange={(value) => handleGroupFieldChange("invite_link", value)}
                  />
                  <FormField
                    label="二维码图片链接"
                    value={groupForm.qr_code_url}
                    onChange={(value) => handleGroupFieldChange("qr_code_url", value)}
                  />
                  <FormField
                    label="成员数量"
                    value={String(groupForm.member_count)}
                    onChange={(value) => handleGroupFieldChange("member_count", value)}
                  />
                  <FormField
                    label="分类"
                    value={groupForm.category}
                    onChange={(value) => handleGroupFieldChange("category", value)}
                  />
                  <div className="flex gap-2">
                    <AdminButton tone="primary" disabled={groupSaving} onClick={submitGroup}>
                      <Plus size={16} />
                      {groupForm.id ? "保存修改" : "创建社群"}
                    </AdminButton>
                    <AdminButton
                      tone="subtle"
                      onClick={() => setGroupForm(EMPTY_GROUP_FORM)}
                    >
                      重置
                    </AdminButton>
                  </div>
                </div>
              </AdminPanel>

              <div>
                {loadingGroups ? (
                  <AdminLoadingState text="正在加载社群列表..." />
                ) : groups.length === 0 ? (
                  <AdminEmptyState
                    icon={Users}
                    title="还没有社群"
                    description="可以先在左侧创建第一个社群入口。"
                  />
                ) : (
                  <div className="grid gap-4">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-white">
                                {group.name}
                              </h3>
                              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                                {group.platform || "wechat"}
                              </span>
                              {group.category ? (
                                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                                  {group.category}
                                </span>
                              ) : null}
                            </div>
                            {group.description ? (
                              <p className="mt-2 text-sm text-gray-400">{group.description}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>成员数: {group.member_count || 0}</span>
                              {group.invite_link ? <span>含邀请链接</span> : null}
                              {group.qr_code_url ? <span>含二维码</span> : null}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-indigo-300"
                              title="编辑社群"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteGroupId(group.id)}
                              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-white/5 text-red-300 transition-colors hover:bg-red-500/10"
                              title="删除社群"
                            >
                              <Trash2 size={16} />
                            </button>
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
        title="确认删除社群"
        description="删除后该社群入口会立即从社区页面中移除。"
        confirmText="确认删除"
        tone="danger"
        pending={groupSaving}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setDeleteGroupId(null)}
      />
    </>
  );
};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none transition-colors focus:border-indigo-500";

const FormField = ({ label, value, onChange, textarea = false }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-400">{label}</label>
    {textarea ? (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={inputClassName}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    )}
  </div>
);

export default AdminCommunity;
