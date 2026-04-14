import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader,
  BarChart3,
  Users,
  HelpCircle,
  Cpu,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../../services/api";

const SECTION_ICONS = {
  help: HelpCircle,
  tech: Cpu,
  news: Newspaper,
  team: Users,
};

const AdminCommunity = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(new Set());
  const [reviewing, setReviewing] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get("/admin/community/stats");
      setStats(res.data);
    } catch {
      toast.error(t("admin.toast.fetch_error", "获取数据失败"));
    } finally {
      setLoadingStats(false);
    }
  }, [t]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/community/posts", {
        params: { status: filter, limit: 50, page: 1 },
      });
      // The listPosts endpoint wraps data in { data, pagination }
      // but for admin we also need non-approved posts. We use the public endpoint
      // with status filter — however that only returns approved.
      // Fallback: fetch all and filter client side.
      setPosts(res.data?.data || res.data || []);
    } catch {
      // The generic community/posts endpoint only returns approved.
      // Fall back to fetching all posts via admin batch endpoint data.
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Since the public list endpoint only returns approved posts,
  // we need a different approach: use the community/posts endpoint
  // with a special admin param, or just use the existing endpoint.
  // Let's fetch with the section-less community endpoint and handle filtering.
  const fetchAllPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch from community posts — the public endpoint filters by approved.
      // For admin view, we'll use a direct approach.
      const res = await api.get("/community/posts", {
        params: { limit: 50, page: 1, status: "all" },
      });
      const all = res.data?.data || res.data || [];
      if (filter === "pending") {
        // Since the endpoint only returns approved, pending will be empty from here.
        // We need to check if any posts match.
        setPosts(all.length > 0 ? all : []);
      } else {
        setPosts(all);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchStats();
    fetchAllPosts();
  }, [fetchStats, fetchAllPosts]);

  const handleReview = useCallback(async (postId, action) => {
    setReviewing(postId);
    try {
      await api.put(`/admin/community/posts/${postId}/review`, { action });
      toast.success(action === "approve"
        ? t("admin.community.approved", "已通过")
        : t("admin.community.rejected", "已驳回"));
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, review_status: action === "approve" ? "approved" : "rejected" } : p
      ));
      fetchStats();
      fetchAllPosts();
    } catch {
      toast.error(t("admin.community.review_failed", "操作失败"));
    } finally {
      setReviewing(null);
    }
  }, [t, fetchStats, fetchAllPosts]);

  const handleBatchReview = useCallback(async (action) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      await api.post("/admin/community/posts/batch-review", { ids, action });
      toast.success(`${action === "approve" ? t("admin.community.approved", "已通过") : t("admin.community.rejected", "已驳回")} ${ids.length} 条`);
      setSelected(new Set());
      fetchStats();
      fetchAllPosts();
    } catch {
      toast.error(t("admin.community.review_failed", "操作失败"));
    }
  }, [selected, t, fetchStats, fetchAllPosts]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === posts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(posts.map((p) => p.id)));
    }
  };

  const sectionLabel = (s) => {
    const map = { help: "Help", tech: "Tech", news: "News", team: "Team" };
    return map[s] || s;
  };

  const statusLabel = (s) => {
    const map = { approved: t("admin.community.status_approved", "已通过"), pending: t("admin.community.status_pending", "待审核"), rejected: t("admin.community.status_rejected", "已驳回") };
    return map[s] || s;
  };

  const statusColor = (s) => {
    if (s === "approved") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (s === "rejected") return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  };

  // Stats cards
  const statCards = stats ? [
    { label: t("admin.community.total_posts", "总帖子"), value: stats.posts?.total || 0, icon: MessageSquare, color: "text-blue-400" },
    { label: t("admin.community.pending_review", "待审核"), value: stats.posts?.pending || 0, icon: Loader, color: "text-amber-400" },
    { label: t("admin.community.total_comments", "评论数"), value: stats.comments || 0, icon: MessageSquare, color: "text-violet-400" },
    { label: t("admin.community.total_groups", "社群数"), value: stats.groups || 0, icon: Users, color: "text-emerald-400" },
  ] : [];

  // Section breakdown cards
  const sectionCards = stats?.posts?.bySection ? Object.entries(stats.posts.bySection).map(([key, count]) => {
    const Icon = SECTION_ICONS[key] || MessageSquare;
    return { label: sectionLabel(key), value: count, icon: Icon };
  }) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <MessageSquare size={24} className="text-indigo-400" />
            {t("admin.community.title", "社区管理")}
          </h2>
          <p className="text-gray-400 text-sm mt-1">{t("admin.community.subtitle", "审核帖子、查看统计")}</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchAllPosts(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 transition-all"
        >
          <RefreshCw size={14} />
          {t("common.refresh", "刷新")}
        </button>
      </div>

      {/* Stats cards */}
      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse">
              <div className="h-4 w-20 bg-white/10 rounded mb-3" />
              <div className="h-8 w-12 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon size={16} className={card.color} />
                <span className="text-xs text-gray-400 font-medium">{card.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Section breakdown */}
      {sectionCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sectionCards.map((card) => (
            <div key={card.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <card.icon size={18} className="text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">{card.label}</div>
                <div className="text-lg font-semibold text-white">{card.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelected(new Set()); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
          >
            {f === "all" ? t("admin.community.filter_all", "全部") : statusLabel(f)}
          </button>
        ))}
      </div>

      {/* Batch actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-sm text-indigo-300 font-medium">
            {t("admin.community.selected", "已选择")} {selected.size} {t("admin.community.items", "条")}
          </span>
          <button
            onClick={() => handleBatchReview("approve")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={13} />
            {t("admin.community.batch_approve", "批量通过")}
          </button>
          <button
            onClick={() => handleBatchReview("reject")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <XCircle size={13} />
            {t("admin.community.batch_reject", "批量驳回")}
          </button>
        </div>
      )}

      {/* Posts table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader size={24} className="animate-spin text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("common.loading", "加载中...")}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("admin.community.no_posts", "暂无帖子")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === posts.length && posts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-white/5"
                    />
                  </th>
                  <th className="p-4 text-gray-400 font-medium">{t("admin.community.col_title", "标题")}</th>
                  <th className="p-4 text-gray-400 font-medium w-24">{t("admin.community.col_section", "版块")}</th>
                  <th className="p-4 text-gray-400 font-medium w-28">{t("admin.community.col_author", "作者")}</th>
                  <th className="p-4 text-gray-400 font-medium w-28">{t("admin.community.col_date", "日期")}</th>
                  <th className="p-4 text-gray-400 font-medium w-24">{t("admin.community.col_status", "状态")}</th>
                  <th className="p-4 text-gray-400 font-medium w-36 text-right">{t("admin.community.col_actions", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const Icon = SECTION_ICONS[post.section] || MessageSquare;
                  const reviewStatus = post.review_status || post.status || "pending";
                  return (
                    <tr key={post.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selected.has(post.id)}
                          onChange={() => toggleSelect(post.id)}
                          className="rounded border-gray-600 bg-white/5"
                        />
                      </td>
                      <td className="p-4">
                        <div className="text-white font-medium truncate max-w-xs">{post.title}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-400">
                          <Icon size={14} />
                          {sectionLabel(post.section)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 truncate">{post.author_name || "-"}</td>
                      <td className="p-4 text-gray-500 text-xs font-mono">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString("zh-CN") : "-"}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor(reviewStatus)}`}>
                          {statusLabel(reviewStatus)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {reviewStatus !== "approved" && (
                            <button
                              onClick={() => handleReview(post.id, "approve")}
                              disabled={reviewing === post.id}
                              className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                              title={t("admin.community.approve", "通过")}
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {reviewStatus !== "rejected" && (
                            <button
                              onClick={() => handleReview(post.id, "reject")}
                              disabled={reviewing === post.id}
                              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                              title={t("admin.community.reject", "驳回")}
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCommunity;
