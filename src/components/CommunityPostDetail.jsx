import React, { useMemo } from "react";
import {
    User,
    CheckCircle,
    Flag,
    Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import CommunityDetailModal from "./CommunityDetailModal";
import { parseContentBlocks } from "./communityUtils";
import { LinkifiedText } from "../utils/linkify";

/**
 * Full post-detail view, used by Help and Team sections.
 *
 * Props:
 *   post            - selected post object (null = closed)
 *   onClose         - callback
 *   isDayMode       - theme
 *   gradientFrom    - e.g. "from-amber-900/30"
 *   headerContent   - JSX for title overlay
 *   authorBar       - JSX for author-bar right side
 *   beforeContent   - JSX before content blocks (e.g. team progress)
 */
const CommunityPostDetail = ({
    post,
    onClose,
    isDayMode,
    gradientFrom,
    headerContent,
    authorBar,
    beforeContent,
    onRelatedSelect,
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const contentBlocks = useMemo(
        () => parseContentBlocks(post?.content_blocks),
        [post?.content_blocks]
    );

    const canDeletePost = Boolean(
        post && user && (user.id === post.author_id || user.role === "admin")
    );

    const handleReport = async ({ targetType, targetId = null }) => {
            if (!post?.id) return;
            if (!user) {
                toast.error(t("auth.signin_required"));
                return;
            }
            const reason = window.prompt("可选：补充举报原因（最多 300 字）") || "";
            try {
                await api.post(`/community/posts/${post.id}/report`, {
                    target_type: targetType,
                    target_id: targetId,
                    reason: reason.trim().slice(0, 300),
                });
                toast.success("已提交举报，管理员会尽快处理");
            } catch (error) {
                if (error?.response?.status === 409) {
                    toast.error("你已举报过该内容");
                } else {
                    toast.error("举报失败，请稍后再试");
                }
            }
        };

    const handleDeletePost = async () => {
        if (!post?.id) return;
        if (!canDeletePost) {
            toast.error("无删除权限");
            return;
        }
        if (!window.confirm("确认删除该求助帖吗？删除后将不可恢复。")) return;
        try {
            await api.delete(`/community/posts/${post.id}`);
            toast.success("帖子已删除");
            onClose?.();
        } catch (error) {
            toast.error(error?.response?.data?.error || "删除帖子失败");
        }
    };

    const afterContent = post && (
        <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => handleReport({ targetType: "post" })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? "text-slate-600 border-slate-200 hover:bg-slate-100" : "text-gray-300 border-white/10 hover:bg-white/10"}`}
                >
                    <Flag size={12} />
                    {t("community.report", "举报")}
                </button>
                {canDeletePost && (
                    <button
                        type="button"
                        onClick={handleDeletePost}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? "text-rose-600 border-rose-200 hover:bg-rose-50" : "text-rose-300 border-rose-500/25 hover:bg-rose-500/10"}`}
                    >
                        <Trash2 size={12} />
                        {t("common.delete", "删除")}
                    </button>
                )}
            </div>
            {post.status === "solved" &&
                Array.isArray(post.linked_resources?.articles) &&
                post.linked_resources.articles.length > 0 && (
                    <div
                        className={`mb-8 rounded-lg border p-4 ${isDayMode ? "bg-emerald-50/70 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/30"}`}
                    >
                        <div
                            className={`text-xs font-semibold uppercase tracking-[0.2em] mb-2 ${isDayMode ? "text-emerald-700" : "text-emerald-300"}`}
                        >
                            {t("community.solved_recommend", "已解决推荐阅读")}
                        </div>
                        <p
                            className={`text-sm mb-3 ${isDayMode ? "text-emerald-800" : "text-emerald-100"}`}
                        >
                            {t(
                                "community.solved_recommend_desc",
                                "该问题已解决，可继续阅读相关文章深入了解。"
                            )}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {post.linked_resources.articles.slice(0, 2).map((article) => (
                                <button
                                    key={`solved-article-${article.id}`}
                                    type="button"
                                    onClick={() =>
                                        onRelatedSelect?.({ ...article, type: "article" })
                                    }
                                    className={`w-full text-left rounded-lg border p-3 transition-colors ${isDayMode ? "bg-white border-emerald-200 hover:bg-emerald-50" : "bg-white/[0.035] border-emerald-500/20 hover:bg-emerald-500/10"}`}
                                >
                                    <p
                                        className={`text-sm font-semibold line-clamp-1 ${isDayMode ? "text-slate-800" : "text-white"}`}
                                    >
                                        {article.title}
                                    </p>
                                    <p
                                        className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                    >
                                        {t("community.read_article", "查看文章详情")}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            {Array.isArray(post.linked_resources?.groups) &&
                post.linked_resources.groups.length > 0 && (
                    <div
                        className={`mb-8 rounded-lg border p-4 ${isDayMode ? "bg-blue-50/70 border-blue-200" : "bg-blue-500/10 border-blue-500/30"}`}
                    >
                        <div
                            className={`text-xs font-semibold uppercase tracking-[0.2em] mb-2 ${isDayMode ? "text-blue-700" : "text-blue-300"}`}
                        >
                            {t("community.group_entry", "社群入口")}
                        </div>
                        <p
                            className={`text-sm mb-3 ${isDayMode ? "text-blue-800" : "text-blue-100"}`}
                        >
                            {t(
                                "community.group_entry_desc",
                                "相关社群正在持续讨论这个问题，点击可直接查看。"
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                onRelatedSelect?.({
                                    ...post.linked_resources.groups[0],
                                    type: "group",
                                })
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${isDayMode ? "bg-white text-blue-700 border-blue-200 hover:bg-blue-50" : "bg-blue-500/20 text-blue-200 border-blue-400/40 hover:bg-blue-500/30"}`}
                        >
                            {t("community.join_related_group", "加入相关社群")}
                        </button>
                    </div>
                )}


        </>
    );

    return (
        <CommunityDetailModal
            item={post}
            onClose={onClose}
            isDayMode={isDayMode}
            gradientFrom={gradientFrom}
            headerContent={headerContent}
            authorBar={authorBar}
            beforeContent={beforeContent}
            contentBlocks={contentBlocks}
            htmlContent={post?.content}
            afterContent={afterContent}
            onRelatedSelect={onRelatedSelect}
        />
    );
};

export default CommunityPostDetail;
