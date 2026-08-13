import React, { useCallback, useRef, useState } from "react";
import { Bot, FileStack, GraduationCap, Link as LinkIcon, PackageOpen, Upload } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import api, { isCanceledRequest } from "../services/api";
import PostCard from "./PostCard";
import CommunityPostDetail from "./CommunityPostDetail";
import CommunityFeedPanel from "./CommunityFeedPanel";
import UnifiedCommunityComposer from "./UnifiedCommunityComposer";
import CommunitySearchInput from "./CommunitySearchInput";

const MATERIAL_TYPE_KEYS = ["course", "ai", "other"];
const LEGACY_COURSE_MATERIAL_TYPES = new Set(["exam", "outline", "slides", "notes", "solution"]);
const normalizeMaterialType = (value) => {
    const type = String(value || "")
        .trim()
        .toLowerCase();
    if (LEGACY_COURSE_MATERIAL_TYPES.has(type)) return "course";
    return MATERIAL_TYPE_KEYS.includes(type) ? type : "";
};

const CATEGORY_ICONS = {
    course: GraduationCap,
    ai: Bot,
    other: PackageOpen,
};

const CommunityMaterials = ({ onNewPost, hideNewPostButton = false }) => {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isDayMode = uiMode === "day";
    const [composerOpen, setComposerOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [materialTypes, setMaterialTypes] = useState([]);
    const [selectedMaterialType, setSelectedMaterialType] = useState(() =>
        normalizeMaterialType(searchParams.get("type"))
    );
    const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
    const materialQueryParams = React.useMemo(
        () => ({
            ...(selectedMaterialType ? { material_type: selectedMaterialType } : {}),
        }),
        [selectedMaterialType]
    );
    const clearMaterialFilters = useCallback(() => {
        setSelectedMaterialType("");
        setSearchParams(
            (prev) => {
                const params = new URLSearchParams(prev);
                params.delete("course");
                params.delete("type");
                params.set("postTab", "materials");
                return params;
            },
            { replace: false }
        );
    }, [setSearchParams]);

    const feed = useCommunityFeed({
        endpoint: "/community/posts",
        section: "materials",
        deepLinkParam: "post",
        defaultPageSize: 10,
        extraQueryParams: materialQueryParams,
        extraDependencies: [selectedMaterialType],
        extraFiltersActive: Boolean(selectedMaterialType),
        onResetExtraFilters: clearMaterialFilters,
    });

    const loadMaterialTypes = useCallback(async ({ signal } = {}) => {
        try {
            const res = await api.get("/community/material-types", { signal });
            const rows = Array.isArray(res.data?.data) ? res.data.data : [];
            setMaterialTypes(rows);
        } catch (error) {
            if (!isCanceledRequest(error)) {
                setMaterialTypes(MATERIAL_TYPE_KEYS.map((type) => ({ type, count: 0 })));
            }
        }
    }, []);

    React.useEffect(() => {
        const ac = new AbortController();
        loadMaterialTypes({ signal: ac.signal });
        return () => ac.abort();
    }, [loadMaterialTypes]);

    React.useEffect(() => {
        setSelectedMaterialType(normalizeMaterialType(searchParams.get("type")));
    }, [searchParams]);

    const openComposer = useCallback(() => {
        if (!user) {
            toast.error(t("auth.signin_required"));
            return;
        }
        setEditingPost(null);
        setComposerOpen(true);
    }, [t, user]);

    React.useEffect(() => {
        const onOpenComposer = (event) => {
            if (event.detail?.boardKey !== "materials") return;
            openComposer();
        };
        window.addEventListener("open-community-composer", onOpenComposer);
        return () => window.removeEventListener("open-community-composer", onOpenComposer);
    }, [openComposer]);

    React.useEffect(() => {
        const onRefresh = (event) => {
            if (event.detail?.boardKey === "materials") {
                feed.handleRefresh();
                loadMaterialTypes();
            }
        };
        window.addEventListener("community-feed-refresh", onRefresh);
        return () => window.removeEventListener("community-feed-refresh", onRefresh);
    }, [feed, loadMaterialTypes]);

    const updateParams = useCallback(
        (next) => {
            const params = new URLSearchParams(searchParams);
            ["id", "post", "news", "group"].forEach((key) => params.delete(key));
            Object.entries(next).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "")
                    params.set(key, String(value));
            });
            if (!params.get("postTab")) params.set("postTab", "materials");
            setSearchParams(params, { replace: false });
        },
        [searchParams, setSearchParams]
    );

    const handleOpenPost = (post) => {
        feed.handleItemClick(post);
        updateParams({ postTab: "materials", post: post.id });
    };

    const handleCloseDetail = () => {
        if (fromUserProfileRef.current) {
            fromUserProfileRef.current = false;
            navigate(-2);
            return;
        }
        feed.setSelectedItem(null);
        updateParams({ postTab: "materials" });
    };

    const handleCommentsCountChange = useCallback(
        (postId, count) => {
            feed.updateItemById(postId, (item) => ({ ...item, comments_count: count }));
        },
        [feed]
    );

    const handleRelatedSelect = useCallback(
        (resource) => {
            if (!resource?.id) return;
            if (resource.type === "article")
                return updateParams({ postTab: "tech", id: resource.id });
            if (resource.type === "group") return updateParams({ group: resource.id });
            if (resource.type === "news")
                return updateParams({ postTab: "news", news: resource.id });
            if (resource.type === "post")
                return updateParams({
                    postTab: resource.section || "materials",
                    post: resource.id,
                });
        },
        [updateParams]
    );

    const handleTypeFilter = useCallback(
        (typeValue) => {
            const nextType = normalizeMaterialType(typeValue);
            const params = new URLSearchParams(searchParams);
            ["id", "post", "news", "group"].forEach((key) => params.delete(key));
            params.set("postTab", "materials");
            if (nextType) {
                params.set("type", nextType);
            } else {
                params.delete("type");
            }
            setSelectedMaterialType(nextType);
            feed.setCurrentPage(1);
            setSearchParams(params, { replace: false });
        },
        [feed, searchParams, setSearchParams]
    );

    const renderCard = (post, index, { canAnimate, isDayMode: dm }) => (
        <PostCard
            key={post.id}
            post={post}
            index={index}
            onClick={handleOpenPost}
            canAnimate={canAnimate}
            isDayMode={dm}
        />
    );

    const getMaterialMeta = (post) =>
        [
            post?.material_course
                ? {
                      key: "course",
                      label: t("community.material_course", "课程"),
                      value: post.material_course,
                  }
                : null,
            post?.material_teacher
                ? {
                      key: "teacher",
                      label: t("community.material_teacher", "老师"),
                      value: post.material_teacher,
                  }
                : null,
            post?.material_semester
                ? {
                      key: "semester",
                      label: t("community.material_semester", "学期"),
                      value: post.material_semester,
                  }
                : null,
            post?.material_type
                ? {
                      key: "type",
                      label: t("community.material_type", "资源分类"),
                      value: t(
                          `community.material_type_${normalizeMaterialType(post.material_type) || post.material_type}`,
                          post.material_type
                      ),
                  }
                : null,
        ].filter(Boolean);

    const selectedMaterialMeta = feed.selectedItem ? getMaterialMeta(feed.selectedItem) : [];
    const materialTypeRows = MATERIAL_TYPE_KEYS.map((type) => ({
        type,
        count: materialTypes.find((item) => item.type === type)?.count || 0,
        label: t(`community.material_type_${type}`, type),
    }));
    const uploadAction = onNewPost || openComposer;

    const beforeContent = feed.selectedItem && (
        <div
            className={`mb-6 rounded-lg border p-4 ${isDayMode ? "border-sky-200 bg-sky-50/70" : "border-sky-400/20 bg-sky-500/[0.05]"}`}
        >
            <div
                className={`flex flex-wrap items-center gap-3 text-sm ${isDayMode ? "text-sky-800" : "text-sky-200"}`}
            >
                <span className="inline-flex items-center gap-1.5">
                    <FileStack size={15} />
                    {t("community.materials_detail_tip", "支持上传 PDF、Word、Markdown 与附件块")}
                </span>
                {feed.selectedItem.link ? (
                    <a
                        href={feed.selectedItem.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${isDayMode ? "border-sky-200 text-sky-800 hover:bg-white" : "border-sky-400/20 text-sky-200 hover:bg-sky-400/[0.06]"}`}
                    >
                        <LinkIcon size={13} />
                        {t("community.open_original", "查看原文")}
                    </a>
                ) : null}
            </div>
            {selectedMaterialMeta.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMaterialMeta.map((item) => (
                        <span
                            key={item.key}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${isDayMode ? "border-sky-200 bg-white text-sky-800" : "border-sky-400/20 bg-sky-400/[0.055] text-sky-200"}`}
                        >
                            <span className={isDayMode ? "text-sky-600" : "text-sky-300"}>
                                {item.label}
                            </span>
                            {item.value}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );

    const renderDetail = () => (
        <CommunityPostDetail
            post={feed.selectedItem}
            onClose={handleCloseDetail}
            isDayMode={isDayMode}
            gradientFrom="from-slate-900/30"
            onRelatedSelect={handleRelatedSelect}
            onCommentsCountChange={handleCommentsCountChange}
            beforeContent={beforeContent}
            headerContent={
                feed.selectedItem && (
                    <>
                        <div className="mb-3 flex items-center gap-3">
                            <span
                                className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${isDayMode ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-white/[0.06] text-gray-200"}`}
                            >
                                {t("community.tab_materials", "期末资料")}
                            </span>
                        </div>
                        <h2
                            className={`text-2xl font-black leading-tight tracking-tight md:text-5xl ${isDayMode ? "text-slate-900" : "text-white drop-shadow-2xl"}`}
                        >
                            {feed.selectedItem.title}
                        </h2>
                    </>
                )
            }
        />
    );

    const controls = (
        <div className="grid gap-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3">
                <CommunitySearchInput
                    value={feed.searchQuery}
                    onChange={feed.setSearchQuery}
                    onClear={() => feed.setSearchQuery("")}
                    placeholder={t(
                        "community.materials_search_placeholder",
                        "搜索标题、作者、课程或资源内容"
                    )}
                    isDayMode={isDayMode}
                    size="large"
                />
                {!hideNewPostButton ? (
                    <button
                        type="button"
                        onClick={uploadAction}
                        className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border px-4 text-base font-black transition-colors sm:gap-2.5 sm:px-6 ${
                            isDayMode
                                ? "border-sky-200 bg-white text-sky-800 shadow-[0_8px_22px_rgba(14,165,233,0.06)] hover:border-sky-300 hover:bg-sky-50"
                                : "border-sky-400/20 bg-sky-500/[0.055] text-sky-200 hover:border-sky-400/30 hover:bg-sky-500/[0.08]"
                        }`}
                    >
                        <Upload size={21} />
                        <span>{t("community.materials_upload_action", "上传资料")}</span>
                    </button>
                ) : null}
            </div>
            <div
                className={`rounded-lg border p-2.5 md:p-5 ${isDayMode ? "border-slate-200 bg-white/90 shadow-[0_10px_28px_rgba(15,23,42,0.045)]" : "border-white/10 bg-white/[0.035] backdrop-blur-sm"}`}
            >
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {materialTypeRows.map((item) => {
                        const isActive = selectedMaterialType === item.type;
                        const Icon = CATEGORY_ICONS[item.type] || FileStack;
                        return (
                            <button
                                key={item.type}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => handleTypeFilter(isActive ? "" : item.type)}
                                className={`group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center transition-colors md:min-h-[88px] md:flex-row md:items-center md:justify-start md:gap-3 md:px-4 md:py-3 md:text-left ${
                                    isActive
                                        ? isDayMode
                                            ? "border-sky-300 bg-sky-50 text-sky-800 shadow-[0_10px_26px_rgba(14,165,233,0.07)]"
                                            : "border-sky-400/20 bg-sky-500/[0.055] text-sky-200 shadow-[0_14px_34px_rgba(0,0,0,0.14)]"
                                        : isDayMode
                                          ? "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-sky-200 hover:bg-sky-50/50"
                                          : "border-white/10 bg-white/[0.035] text-gray-200 hover:border-sky-400/20 hover:bg-sky-500/[0.05]"
                                }`}
                            >
                                <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md md:h-10 md:w-10 ${isActive ? "bg-white/20" : isDayMode ? "bg-white shadow-[0_6px_18px_rgba(15,23,42,0.045)]" : "bg-white/[0.06]"}`}
                                >
                                    <Icon size={18} className="md:h-6 md:w-6" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-xs font-black md:text-base">
                                        {item.label}
                                    </span>
                                    <span
                                        className={`mt-1 hidden text-xs leading-5 md:block ${isActive ? "opacity-80" : isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                    >
                                        {t(`community.material_type_${item.type}_desc`, "资源内容")}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <CommunityFeedPanel
                feed={feed}
                isDayMode={isDayMode}
                renderCard={renderCard}
                renderDetail={renderDetail}
                emptyIcon={FileStack}
                emptyTitle={
                    selectedMaterialType
                        ? t(
                              `community.materials_empty_${selectedMaterialType}`,
                              t("community.materials_empty", "暂无资源")
                          )
                        : t("community.materials_empty", "暂无资源")
                }
                emptyDesc={
                    selectedMaterialType
                        ? t(
                              `community.materials_empty_${selectedMaterialType}_desc`,
                              t(
                                  "community.materials_empty_desc",
                                  "审核通过的资源会显示在这里。"
                              )
                          )
                        : t("community.materials_empty_desc", "审核通过的资源会显示在这里。")
                }
                accentColor="blue"
                extraControls={controls}
                onNewPost={onNewPost || openComposer}
                newPostLabel={t("community.materials_upload_action", "上传资料")}
                hideNewPostButton
                hideSortSelector
                hideFilterBadge
                hideSummaryLine
                ignoreActiveFiltersForEmptyState
                surfaceVariant="learning"
            />
            <UnifiedCommunityComposer
                isOpen={composerOpen}
                boardKey="materials"
                initialData={editingPost}
                onClose={() => {
                    setComposerOpen(false);
                    setEditingPost(null);
                }}
                onSuccess={() => {
                    feed.handleRefresh();
                    loadMaterialTypes();
                }}
            />
        </>
    );
};

export default CommunityMaterials;
