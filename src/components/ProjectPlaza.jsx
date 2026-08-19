import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowRight,
    Eye,
    ExternalLink,
    Flag,
    Github,
    Images,
    Lock,
    Mail,
    Share2,
    Sparkles,
    Trophy,
    UploadCloud,
    X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useHackathonSchedule } from "../hooks/useHackathonSchedule";
import { useAuth } from "../context/AuthContext";
import { useBackClose } from "../hooks/useBackClose";
import SEO from "./SEO";
import api, { getProjects, getProject, createProjectCard } from "../services/api";
import FavoriteButton from "./FavoriteButton";
import ProjectSharePoster from "./ProjectSharePoster";
import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import EventProjectSubmissionModal from "./EventProjectSubmissionModal";
import { getProjectShareCardUrl } from "../utils/projectShareCard";
import { getCompetitionPhase } from "../utils/competitionPhase";
import { PROJECT_PLAZA_CSS } from "./projectPlaza.styles";
import BodyPortal from "../shared/ui/BodyPortal";
import { isMiniProgramWebView } from "../utils/miniProgramEnv";
import { shareViaMiniProgram } from "../utils/wechatMiniProgramBridge";
import { ProjectPlazaWorkspace } from "../features/projects/ProjectPlazaSurface";

const PROGRESS_META = {
    idea: { labelKey: "project_plaza.progress.idea", fallback: "构思中", c: "var(--p-idea)" },
    dev: { labelKey: "project_plaza.progress.dev", fallback: "开发中", c: "var(--p-dev)" },
    live: { labelKey: "project_plaza.progress.live", fallback: "已上线", c: "var(--p-live)" },
    pause: { labelKey: "project_plaza.progress.pause", fallback: "暂停", c: "var(--p-pause)" },
};
const PROGRESS_FILTERS = [
    { key: "all", labelKey: "project_plaza.filters.all", fallback: "全部", color: null },
    {
        key: "idea",
        labelKey: "project_plaza.progress.idea",
        fallback: "构思中",
        color: "var(--p-idea)",
    },
    {
        key: "dev",
        labelKey: "project_plaza.progress.dev",
        fallback: "开发中",
        color: "var(--p-dev)",
    },
    {
        key: "live",
        labelKey: "project_plaza.progress.live",
        fallback: "已上线",
        color: "var(--p-live)",
    },
];
const NEED_FILTERS = ["缺人", "缺设计", "缺讨论", "找测试用户"];
const NEEDS_ALL = ["缺人", "缺设计", "缺产品", "缺讨论", "找测试用户", "缺资金"];
const PROG_OPTS = ["idea", "dev", "live", "pause"];
const SORT_OPTIONS = [
    { key: "match", labelKey: "project_plaza.sort.match", fallback: "推荐" },
    { key: "newest", labelKey: "project_plaza.sort.newest", fallback: "最新" },
    { key: "active", labelKey: "project_plaza.sort.active", fallback: "最活跃" },
];
const NEED_LABEL_KEYS = {
    缺人: "project_plaza.needs.people",
    缺设计: "project_plaza.needs.design",
    缺产品: "project_plaza.needs.product",
    缺讨论: "project_plaza.needs.discussion",
    找测试用户: "project_plaza.needs.testers",
    缺资金: "project_plaza.needs.funding",
};

const initials = (name, fallback = "你") =>
    name ? name.trim().slice(0, 1) : fallback.trim().slice(0, 1);
const GRAD = "linear-gradient(135deg,#d88bb8,#8b6fd6)";

const getProgressLabel = (t, progress) => {
    const meta = PROGRESS_META[progress] || PROGRESS_META.idea;
    return t(meta.labelKey, meta.fallback);
};

const getNeedLabel = (t, need) => (NEED_LABEL_KEYS[need] ? t(NEED_LABEL_KEYS[need], need) : need);
const buildProjectSharePayload = (project, t) => {
    const title = project?.title || t("project_plaza.untitled", "未命名项目");
    const intro =
        project?.intro ||
        project?.description ||
        t("project_share_poster.default_intro", "一个正在生长的校园项目");
    const projectId = String(project?.id || "");
    const eventRecord = project?.competitions?.[0];
    const path =
        project?.source_type === "competition_work" && eventRecord
            ? `/hackathon?view=showcase&competition=${encodeURIComponent(eventRecord.slug)}&work=${encodeURIComponent(eventRecord.work_id)}#showcase-works`
            : `/projects?id=${encodeURIComponent(projectId)}`;
    return {
        title,
        text: String(intro).slice(0, 120),
        path,
        imageUrl: getProjectShareCardUrl(project),
    };
};
const projectScore = (p) =>
    (p.progress === "dev" ? 35 : p.progress === "live" ? 28 : p.progress === "idea" ? 20 : 8) +
    Math.min(Number(p.need_tags?.length || 0) * 9, 24) +
    Math.min(Number(p.likes || 0) * 2 + Number(p.views || 0) * 0.35, 32) +
    Math.min(Number(p.tech_tags?.length || 0) * 2, 9);

const numericEventRank = (project, competitionSlug) => {
    const record = project.competitions?.find((item) => item.slug === competitionSlug);
    const rank = Number.parseInt(record?.rank, 10);
    return Number.isFinite(rank) && rank > 0 ? rank : null;
};

const sortProjects = (items, sort, competitionSlug = "") =>
    [...items].sort((a, b) => {
        if (competitionSlug && sort === "match") {
            const leftRank = numericEventRank(a, competitionSlug);
            const rightRank = numericEventRank(b, competitionSlug);
            if (leftRank !== null || rightRank !== null) {
                if (leftRank === null) return 1;
                if (rightRank === null) return -1;
                if (leftRank !== rightRank) return leftRank - rightRank;
            }
        }
        if (sort === "newest")
            return String(b.created_at || "").localeCompare(String(a.created_at || ""));
        if (sort === "active")
            return (
                Number(b.likes || 0) * 8 +
                Number(b.views || 0) -
                (Number(a.likes || 0) * 8 + Number(a.views || 0))
            );
        return projectScore(b) - projectScore(a);
    });

const Avatar = ({ name, grad = GRAD, idx = 0, fallbackInitial = "你" }) => (
    <span className="ppp-av" style={{ background: grad, marginLeft: idx ? -8 : 0 }}>
        {initials(name, fallbackInitial)}
    </span>
);

const ProgPill = ({ progress, t, className = "" }) => {
    const meta = PROGRESS_META[progress] || PROGRESS_META.idea;
    return (
        <span className={`ppp-prog ${className}`}>
            <span className="ppp-d" style={{ background: meta.c }} />
            {getProgressLabel(t, progress)}
        </span>
    );
};

const Card = ({ p, onOpen, onFav, t, competitionSlug }) => {
    const fallbackInitial = t("project_plaza.initial_you", "你");
    const title = p.title || t("project_plaza.untitled", "未命名项目");
    const score = Math.round(projectScore(p));
    const eventRecord =
        p.competitions?.find((item) => item.slug === competitionSlug) || p.competitions?.[0];
    const isArchive = p.source_type === "competition_work";
    return (
        <article className="ppp-card">
            <button
                type="button"
                className="ppp-card-open"
                onClick={() => onOpen(p)}
                aria-label={`${title} ${t("common.view_details")}`}
            />
            <div className="ppp-cover">
                {p.cover_url ? (
                    <img
                        className="ppp-art"
                        src={p.cover_url}
                        alt={title}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <span className="ppp-art ppp-noart">{title.slice(0, 2)}</span>
                )}
                {!eventRecord ? <ProgPill progress={p.progress} t={t} /> : null}
                {!eventRecord && p.images?.length > 1 && (
                    <span className="ppp-photos">
                        <Images size={12} />
                        {p.images.length}
                    </span>
                )}
                {eventRecord ? (
                    <span className="ppp-event-badge">
                        <Trophy size={12} />
                        {eventRecord.award ||
                            (eventRecord.rank
                                ? t("project_plaza.event.rank", "第 {{rank}} 名", {
                                      rank: eventRecord.rank,
                                  })
                                : t("project_plaza.event.submitted", "本场作品"))}
                    </span>
                ) : (
                    <span className="ppp-score">
                        <Sparkles size={12} />
                        {score}
                    </span>
                )}
            </div>
            <div className="ppp-body">
                <div className="ppp-trow">
                    <h3 className="ppp-title">{title}</h3>
                    <ArrowRight className="ppp-arrow" size={16} />
                </div>
                {p.intro && <p className="ppp-intro">{p.intro}</p>}
                {isArchive ? (
                    <div className="ppp-archive-meta">
                        <span>{t("project_plaza.archive.label", "赛事归档")}</span>
                        {p.major ? <span>{p.major}</span> : null}
                    </div>
                ) : null}
                <div
                    className="ppp-card-evidence"
                    aria-label={t("project_plaza.workspace.evidence_aria", "项目公开证据")}
                >
                    <span className={p.repo_url ? "is-ready" : "is-pending"}>
                        <Github size={12} aria-hidden="true" />
                        {p.repo_url
                            ? t("project_plaza.workspace.repo_ready", "GitHub")
                            : t("project_plaza.workspace.repo_pending", "仓库待补充")}
                    </span>
                    <span className={p.deployment_url ? "is-ready" : "is-pending"}>
                        <ExternalLink size={12} aria-hidden="true" />
                        {p.deployment_url
                            ? t("project_plaza.archive.deployed", "可在线体验")
                            : t("project_plaza.archive.deployment_pending", "部署待补充")}
                    </span>
                </div>
                {!eventRecord && p.need_tags?.length > 0 && (
                    <div className="ppp-needs">
                        {p.need_tags.slice(0, 3).map((n) => (
                            <span className="ppp-need" key={n}>
                                {getNeedLabel(t, n)}
                            </span>
                        ))}
                    </div>
                )}
                {!eventRecord && p.tech_tags?.length > 0 && (
                    <div className="ppp-tech">
                        {p.tech_tags.slice(0, 3).map((tag) => (
                            <span className="ppp-tag" key={tag}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                <div className="ppp-meta">
                    <div className="ppp-team">
                        <div className="ppp-stack">
                            <Avatar name={p.owner_name} fallbackInitial={fallbackInitial} />
                        </div>
                        <span className="ppp-lbl">
                            {p.owner_name || t("project_plaza.anonymous", "匿名")}
                        </span>
                    </div>
                    <div className="ppp-favrow">
                        {!eventRecord ? (
                            <span className="ppp-views">
                                <Eye size={14} />
                                {p.views ?? 0}
                            </span>
                        ) : null}
                        {p.source_type !== "competition_work" ? (
                            <FavoriteButton
                                itemId={p.id}
                                itemType="project"
                                favorited={p.favorited}
                                count={p.likes ?? 0}
                                showCount
                                size={22}
                                className="ppp-fav"
                                onToggle={(fav, likes) => onFav(p.id, fav, likes)}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </article>
    );
};

const DetailModal = ({
    p,
    onClose,
    onFav,
    loggedIn,
    onOpenPoster,
    variant,
    showShareCoachmark,
    onDismissShareCoachmark,
}) => {
    const { t } = useTranslation();
    const inMiniProgram = isMiniProgramWebView();
    const imgs = p.images?.length ? p.images : p.cover_url ? [p.cover_url] : [];
    const [active, setActive] = useState(0);
    const paras = (p.content || "").split(/\n+/).filter(Boolean);
    const title = p.title || t("project_plaza.untitled", "未命名项目");
    const ownerName = p.owner_name || t("project_plaza.anonymous", "匿名");
    const isArchive = p.source_type === "competition_work";
    return (
        <BodyPortal>
            <div className="ppp-root ppp-scrim" data-variant={variant} onClick={onClose}>
                <div
                    className="ppp-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="ppp-x"
                        type="button"
                        onClick={onClose}
                        aria-label={t("common.close", "关闭")}
                    >
                        <X size={18} />
                    </button>
                    <div className="ppp-mgallery">
                        {imgs[active] ? (
                            <img
                                className="ppp-mhero"
                                src={imgs[active]}
                                alt={title}
                                loading="eager"
                                decoding="async"
                                fetchpriority="high"
                            />
                        ) : (
                            <span className="ppp-mhero ppp-noart">{title.slice(0, 2)}</span>
                        )}
                        <ProgPill progress={p.progress} t={t} className="ppp-mprog" />
                        {imgs.length > 1 && (
                            <div className="ppp-mthumbs">
                                {imgs.map((im, i) => (
                                    <button
                                        className={`ppp-t ${i === active ? "sel" : ""}`}
                                        type="button"
                                        key={im + i}
                                        onClick={() => setActive(i)}
                                    >
                                        <img src={im} alt="" loading="lazy" decoding="async" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="ppp-mbody">
                        <span className="ppp-kicker">
                            {isArchive
                                ? t("project_plaza.archive.detail_kicker", "黑客松赛事归档")
                                : t("project_plaza.detail_kicker", "项目名片")}
                        </span>
                        <div className="ppp-mhead">
                            <h2 className="ppp-mtitle">{title}</h2>
                        </div>
                        <div className="ppp-mteam">
                            <div className="ppp-stack">
                                <Avatar
                                    name={p.owner_name}
                                    fallbackInitial={t("project_plaza.initial_you", "你")}
                                />
                            </div>
                            <span className="ppp-lbl">
                                {isArchive
                                    ? t("project_plaza.archive.author_prefix", "参赛者")
                                    : t("project_plaza.owner_prefix", "发起人")}{" "}
                                {ownerName}
                            </span>
                        </div>
                        {isArchive ? (
                            <div className="ppp-mstrip">
                                <span>{t("project_plaza.archive.label", "赛事归档")}</span>
                                {p.major ? <span>{p.major}</span> : null}
                                <span>
                                    {p.deployment_url
                                        ? t("project_plaza.archive.deployed", "可在线体验")
                                        : t(
                                              "project_plaza.archive.deployment_pending",
                                              "部署待补充"
                                          )}
                                </span>
                            </div>
                        ) : (
                            <div className="ppp-mstrip">
                                <span>
                                    <Eye size={14} />
                                    {p.views ?? 0}
                                </span>
                                <span>
                                    {t("project_plaza.stats.saves", "{{count}} 收藏", {
                                        count: p.likes ?? 0,
                                    })}
                                </span>
                                <span>{getProgressLabel(t, p.progress)}</span>
                            </div>
                        )}
                        {p.intro && <p className="ppp-msummary">{p.intro}</p>}
                        {paras.length > 0 && (
                            <div className="ppp-mblock">
                                <div className="ppp-bt">
                                    {t("project_plaza.detail_intro", "项目介绍")}
                                </div>
                                <div className="ppp-content">
                                    {paras.map((para, i) => (
                                        <p key={i}>{para}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        {p.need_tags?.length > 0 && (
                            <div className="ppp-mblock">
                                <div className="ppp-bt">
                                    {t("project_plaza.detail_needs", "在找")}
                                </div>
                                <div className="ppp-needs">
                                    {p.need_tags.map((n) => (
                                        <span className="ppp-mneed" key={n}>
                                            {getNeedLabel(t, n)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {p.tech_tags?.length > 0 && (
                            <div className="ppp-mblock">
                                <div className="ppp-bt">
                                    {t("project_plaza.detail_tags", "特点 / 技术栈")}
                                </div>
                                <div className="ppp-tech">
                                    {p.tech_tags.map((tag) => (
                                        <span className="ppp-mtag" key={tag}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {p.competitions?.length > 0 && (
                            <div className="ppp-mblock ppp-event-history">
                                <div className="ppp-bt">
                                    {t("project_plaza.event.history", "赛事履历")}
                                </div>
                                <div className="ppp-event-history-list">
                                    {p.competitions.map((event) => (
                                        <article key={`${event.slug}-${event.work_id}`}>
                                            <div>
                                                <span>{event.event_date || "—"}</span>
                                                <strong>{event.title}</strong>
                                                <small>
                                                    {event.award ||
                                                        (event.rank
                                                            ? t(
                                                                  "project_plaza.event.rank",
                                                                  "第 {{rank}} 名",
                                                                  { rank: event.rank }
                                                              )
                                                            : t(
                                                                  "project_plaza.event.approved",
                                                                  "已入选本场作品"
                                                              ))}
                                                </small>
                                            </div>
                                            <nav
                                                aria-label={t(
                                                    "project_plaza.event.links_aria",
                                                    "{{event}}相关页面",
                                                    { event: event.title }
                                                )}
                                            >
                                                <a
                                                    href={`/hackathon?view=showcase&competition=${encodeURIComponent(event.slug)}&work=${encodeURIComponent(event.work_id)}#showcase-works`}
                                                >
                                                    {t(
                                                        "project_plaza.event.view_outcome",
                                                        "赛事作品"
                                                    )}
                                                </a>
                                                <a
                                                    href={`/media?event=${encodeURIComponent(event.slug)}`}
                                                >
                                                    {t(
                                                        "project_plaza.event.view_media",
                                                        "现场影像"
                                                    )}
                                                </a>
                                            </nav>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="ppp-mcontact">
                            {p.repo_url ? (
                                <a
                                    className={`ppp-cbtn ${inMiniProgram ? "ghost" : "primary"}`}
                                    href={p.repo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Github size={16} />
                                    {t("project_plaza.actions.repo", "查看 GitHub")}
                                </a>
                            ) : (
                                <span
                                    className={`ppp-cbtn ${inMiniProgram ? "ghost" : "primary"} ppp-disabled`}
                                >
                                    <Github size={16} />
                                    {t("project_plaza.actions.no_repo", "暂无 GitHub")}
                                </span>
                            )}
                            {p.deployment_url ? (
                                <a
                                    className="ppp-cbtn primary"
                                    href={p.deployment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink size={16} />
                                    {t("project_plaza.actions.open_deployment", "在线体验")}
                                </a>
                            ) : isArchive ? (
                                <span className="ppp-cbtn ghost ppp-disabled">
                                    <ExternalLink size={16} />
                                    {t(
                                        "project_plaza.actions.deployment_pending",
                                        "部署链接待补充"
                                    )}
                                </span>
                            ) : null}
                            <button
                                className={`ppp-cbtn ${inMiniProgram ? "primary ppp-share-trigger" : "ghost"}`}
                                type="button"
                                onClick={() => onOpenPoster(p)}
                            >
                                <Share2 size={16} />
                                {inMiniProgram
                                    ? t("project_share_poster.miniapp_share_short", "分享")
                                    : t("project_share_poster.open_action", "生成海报")}
                            </button>
                            {p.source_type === "competition_work" ? null : loggedIn ? (
                                <span className="ppp-cbtn ghost">
                                    <Mail size={16} />
                                    {p.contact_wechat
                                        ? `${t("project_plaza.contact.wechat", "微信")} · ${p.contact_wechat}`
                                        : p.contact_email ||
                                          t("project_plaza.contact.empty", "未留联系方式")}
                                </span>
                            ) : (
                                <span className="ppp-cbtn ghost">
                                    <Lock size={16} />
                                    {t(
                                        "project_plaza.contact.login_required",
                                        "登录后查看联系方式"
                                    )}
                                </span>
                            )}
                            {p.source_type !== "competition_work" ? (
                                <FavoriteButton
                                    itemId={p.id}
                                    itemType="project"
                                    favorited={p.favorited}
                                    count={p.likes ?? 0}
                                    showCount
                                    size={24}
                                    className="ppp-fav ppp-fav-modal"
                                    onToggle={(fav, likes) => onFav(p.id, fav, likes)}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
                {inMiniProgram && showShareCoachmark && (
                    <div
                        className="ppp-share-coach"
                        role="status"
                        aria-live="polite"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Share2 size={17} />
                        <span>
                            <strong>
                                {t("project_share_poster.coach_title", "点击右上角 ···")}
                            </strong>
                            {t("project_share_poster.coach_body", "选择“转发给朋友”")}
                        </span>
                        <button
                            type="button"
                            onClick={onDismissShareCoachmark}
                            aria-label={t("common.close", "关闭")}
                        >
                            <X size={15} />
                        </button>
                    </div>
                )}
            </div>
        </BodyPortal>
    );
};

const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data.fileUrl;
};

const CreateForm = ({ onClose, onCreated, competition }) => {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [intro, setIntro] = useState("");
    const [body, setBody] = useState("");
    const [prog, setProg] = useState("dev");
    const [needs, setNeeds] = useState(["缺人"]);
    const [tags, setTags] = useState([]);
    const [tagDraft, setTagDraft] = useState("");
    const [repo, setRepo] = useState("");
    const [deploymentUrl, setDeploymentUrl] = useState("");
    const [wechat, setWechat] = useState("");
    const [images, setImages] = useState([]);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);

    const toggleNeed = (need) =>
        setNeeds((value) =>
            value.includes(need) ? value.filter((item) => item !== need) : [...value, need]
        );
    const addTag = () => {
        const tag = tagDraft.trim();
        if (tag && !tags.includes(tag)) setTags([...tags, tag]);
        setTagDraft("");
    };
    const onPick = async (e) => {
        const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
        for (const file of files) {
            try {
                const url = await uploadImage(file);
                setImages((prev) => [...prev, url]);
            } catch {
                toast.error(t("project_plaza.toasts.upload_failed", "图片上传失败"));
            }
        }
        if (fileRef.current) fileRef.current.value = "";
    };

    const submit = async (status) => {
        if (!name.trim()) {
            toast.error(t("project_plaza.toasts.name_required", "请填写项目名称"));
            return;
        }
        if (repo && !/^https:\/\//i.test(repo)) {
            toast.error(t("project_plaza.toasts.repo_https", "仓库链接需为 https"));
            return;
        }
        if (deploymentUrl && !/^https:\/\//i.test(deploymentUrl)) {
            toast.error(t("project_plaza.toasts.deployment_https", "魔搭部署链接需为 https"));
            return;
        }
        setBusy(true);
        try {
            const { data } = await createProjectCard({
                title: name,
                intro,
                content: body,
                progress: prog,
                need_tags: needs,
                tech_tags: tags,
                repo_url: repo || null,
                deployment_provider: deploymentUrl ? "modelscope" : null,
                deployment_url: deploymentUrl || null,
                contact_wechat: wechat || null,
                images,
                status,
            });
            toast.success(
                status === "draft"
                    ? t("project_plaza.toasts.draft_saved", "已存草稿")
                    : t("project_plaza.toasts.published", "已发布到广场")
            );
            onCreated(data);
        } catch (err) {
            toast.error(
                err?.response?.data?.error || t("project_plaza.toasts.publish_failed", "发布失败")
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="ppp-create">
            <div className="ppp-cbar">
                <button className="ppp-back" type="button" onClick={onClose}>
                    {t("project_plaza.form.back", "返回广场")}
                </button>
                <div className="ppp-ctitle">{t("project_plaza.form.title", "发布项目名片")}</div>
                {competition ? (
                    <span className="ppp-create-event">
                        <Flag size={14} />
                        {t("project_plaza.event.create_for", "创建后提交到 {{event}}", {
                            event: competition.title,
                        })}
                    </span>
                ) : null}
                <div className="ppp-cactions">
                    <button
                        className="ppp-cbtn ghost"
                        type="button"
                        disabled={busy}
                        onClick={() => submit("draft")}
                    >
                        {t("project_plaza.form.save_draft", "存草稿")}
                    </button>
                    <button
                        className="ppp-cbtn primary"
                        type="button"
                        disabled={busy}
                        onClick={() => submit("published")}
                    >
                        {busy
                            ? t("project_plaza.form.publishing", "发布中...")
                            : t("project_plaza.form.publish", "发布到广场")}
                    </button>
                </div>
            </div>
            <div className="ppp-cgrid">
                <div className="ppp-form">
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.photos", "项目照片")}
                            <span>
                                {t("project_plaza.form.photos_hint", "第一张作封面，最多 9 张")}
                            </span>
                        </label>
                        <div className="ppp-uploads">
                            <button
                                className="ppp-up ppp-upadd"
                                type="button"
                                onClick={() => fileRef.current?.click()}
                            >
                                <UploadCloud size={20} />
                                <small>{t("project_plaza.form.upload", "上传")}</small>
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                multiple
                                hidden
                                onChange={onPick}
                            />
                            {images.map((url, i) => (
                                <div className="ppp-up" key={url}>
                                    <img src={url} alt="" loading="lazy" decoding="async" />
                                    {i === 0 && (
                                        <span className="ppp-upcover">
                                            {t("project_plaza.form.cover", "封面")}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.name", "项目名称")}
                        </label>
                        <input
                            className="ppp-finput"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t(
                                "project_plaza.form.name_placeholder",
                                "例如：校园二手书漂流"
                            )}
                            maxLength={40}
                        />
                    </div>
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.summary", "一句话简介")}
                            <span>{t("project_plaza.form.summary_hint", "显示在卡片上")}</span>
                        </label>
                        <input
                            className="ppp-finput"
                            value={intro}
                            onChange={(e) => setIntro(e.target.value)}
                            placeholder={t(
                                "project_plaza.form.summary_placeholder",
                                "一句话说清楚它是什么"
                            )}
                            maxLength={80}
                        />
                    </div>
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.body", "项目介绍")}
                            <span>{t("project_plaza.form.body_hint", "点开名片后展示")}</span>
                        </label>
                        <textarea
                            className="ppp-ftext"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={6}
                            placeholder={t(
                                "project_plaza.form.body_placeholder",
                                "在做什么、做到哪一步、接下来想干嘛..."
                            )}
                        />
                    </div>
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.progress", "当前进度")}
                        </label>
                        <div className="ppp-seg">
                            {PROG_OPTS.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`ppp-segbtn ${prog === key ? "on" : ""}`}
                                    onClick={() => setProg(key)}
                                >
                                    <span
                                        className="ppp-d"
                                        style={{ background: PROGRESS_META[key].c }}
                                    />
                                    {getProgressLabel(t, key)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.needs", "我在找")}
                            <span>{t("project_plaza.form.needs_hint", "可多选")}</span>
                        </label>
                        <div className="ppp-pick">
                            {NEEDS_ALL.map((need) => (
                                <button
                                    key={need}
                                    type="button"
                                    className={`ppp-pchip ${needs.includes(need) ? "on" : ""}`}
                                    onClick={() => toggleNeed(need)}
                                >
                                    {getNeedLabel(t, need)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.tags", "技术栈 / 特点标签")}
                        </label>
                        <div className="ppp-taginput">
                            {tags.map((tag) => (
                                <span className="ppp-tg" key={tag}>
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => setTags(tags.filter((item) => item !== tag))}
                                    >
                                        x
                                    </button>
                                </span>
                            ))}
                            <input
                                value={tagDraft}
                                onChange={(e) => setTagDraft(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && (e.preventDefault(), addTag())
                                }
                                placeholder={t("project_plaza.form.tag_placeholder", "输入后回车")}
                            />
                        </div>
                    </div>
                    <div className="ppp-frow">
                        <div className="ppp-fsec ppp-fhalf">
                            <label className="ppp-flab">
                                {t("project_plaza.form.repo", "仓库链接")}
                            </label>
                            <input
                                className="ppp-finput"
                                value={repo}
                                onChange={(e) => setRepo(e.target.value)}
                                placeholder="https://github.com/..."
                            />
                        </div>
                        <div className="ppp-fsec ppp-fhalf">
                            <label className="ppp-flab">
                                {t("project_plaza.form.contact", "联系方式")}
                                <span>
                                    {t("project_plaza.form.contact_hint", "仅登录用户可见")}
                                </span>
                            </label>
                            <input
                                className="ppp-finput"
                                value={wechat}
                                onChange={(e) => setWechat(e.target.value)}
                                placeholder={t(
                                    "project_plaza.form.contact_placeholder",
                                    "微信号 / 邮箱"
                                )}
                            />
                        </div>
                    </div>
                    <div className="ppp-fsec">
                        <label className="ppp-flab">
                            {t("project_plaza.form.deployment", "魔搭社区部署链接")}
                            <span>
                                {t(
                                    "project_plaza.form.deployment_hint",
                                    "可选；用于在线体验，与 GitHub 仓库分开保存"
                                )}
                            </span>
                        </label>
                        <input
                            className="ppp-finput"
                            value={deploymentUrl}
                            onChange={(e) => setDeploymentUrl(e.target.value)}
                            placeholder="https://modelscope.cn/studios/..."
                        />
                    </div>
                </div>

                <div className="ppp-preview">
                    <div className="ppp-pvlab">
                        {t("project_plaza.form.preview_label", "实时预览")}
                    </div>
                    <article className="ppp-card ppp-pvcard">
                        <div className="ppp-cover">
                            {images[0] ? (
                                <img
                                    className="ppp-art"
                                    src={images[0]}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <span className="ppp-art ppp-noart">
                                    {name.slice(0, 2) || t("project_plaza.form.cover", "封面")}
                                </span>
                            )}
                            <ProgPill progress={prog} t={t} />
                        </div>
                        <div className="ppp-body">
                            <div className="ppp-trow">
                                <h3 className="ppp-title">
                                    {name || t("project_plaza.form.preview_title", "项目名称")}
                                </h3>
                            </div>
                            <p className="ppp-intro" style={{ opacity: intro ? 1 : 0.5 }}>
                                {intro ||
                                    t(
                                        "project_plaza.form.preview_summary",
                                        "一句话简介会显示在这里"
                                    )}
                            </p>
                            <div className="ppp-needs">
                                {(needs.length ? needs : ["缺人"]).slice(0, 3).map((need) => (
                                    <span className="ppp-need" key={need}>
                                        {getNeedLabel(t, need)}
                                    </span>
                                ))}
                            </div>
                            <div className="ppp-tech">
                                {tags.slice(0, 3).map((tag) => (
                                    <span className="ppp-tag" key={tag}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="ppp-meta">
                                <div className="ppp-team">
                                    <div className="ppp-stack">
                                        <Avatar
                                            name={t("project_plaza.initial_you", "你")}
                                            fallbackInitial={t("project_plaza.initial_you", "你")}
                                        />
                                    </div>
                                    <span className="ppp-lbl">
                                        {t("project_plaza.initial_you", "你")}
                                    </span>
                                </div>
                                <div className="ppp-favrow">
                                    <span className="ppp-views">
                                        <Eye size={14} />0
                                    </span>
                                    <span className="ppp-fav ppp-static-fav">0</span>
                                </div>
                            </div>
                        </div>
                    </article>
                    <div className="ppp-pvhint">
                        {t(
                            "project_plaza.form.preview_hint",
                            "别人会先看到这张紧凑名片，点开再读完整介绍。"
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectPlaza = () => {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { schedule } = useHackathonSchedule(settings);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    // 与影像库一致：现场类页面始终使用赛博深色变体，白天模式不给背景加蒙版
    const variant = "cyber";

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [allProjectTotal, setAllProjectTotal] = useState(0);
    const [competition, setCompetition] = useState(null);
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [posterProject, setPosterProject] = useState(null);
    const [showShareCoachmark, setShowShareCoachmark] = useState(false);
    const [creating, setCreating] = useState(false);
    const [submissionOpen, setSubmissionOpen] = useState(false);
    const [existingSubmissionProjectId, setExistingSubmissionProjectId] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [progFilter, setProgFilter] = useState("all");
    const [needFilter, setNeedFilter] = useState(null);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("match");
    const fromFavoritesRef = useRef(
        searchParams.get("fromfav") === "1" || location.state?.fromFavorites === true
    );
    const deepLinkOpenedRef = useRef(false);
    const shareCoachTimerRef = useRef(null);
    const competitionSlug = String(searchParams.get("competition") || "").trim();
    const scheduledCompetition = schedule.events.find(
        (item) => item.results.competitionSlug === competitionSlug
    );
    const competitionPhase = getCompetitionPhase(scheduledCompetition?.event);
    const competitionSubmissionAvailable =
        competitionPhase === "live" || competitionPhase === "archive";

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (progFilter !== "all") params.progress = progFilter;
            if (needFilter) params.need = needFilter;
            if (search.trim()) params.q = search.trim();
            if (competitionSlug) params.competition = competitionSlug;
            const { data } = await getProjects(params);
            setItems(data.items || []);
            setTotal(Number(data.total || 0));
            setCompetition(data.competition || null);
            if (!competitionSlug && progFilter === "all" && !needFilter && !search.trim()) {
                setAllProjectTotal(Number(data.total || 0));
            }
        } catch {
            toast.error(t("project_plaza.toasts.load_failed", "加载失败"));
        } finally {
            setLoading(false);
        }
    }, [competitionSlug, progFilter, needFilter, search, t]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        let alive = true;
        api.get("/competitions")
            .then(({ data }) => {
                if (alive) setCompetitions(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (alive) setCompetitions([]);
            });
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!competitionSlug || allProjectTotal > 0) return undefined;
        let alive = true;
        getProjects({ limit: 1 })
            .then(({ data }) => {
                if (alive) setAllProjectTotal(Number(data.total || 0));
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [allProjectTotal, competitionSlug]);

    useEffect(() => {
        if (!competitionSlug) return;
        setProgFilter("all");
        setNeedFilter(null);
        setFiltersOpen(false);
    }, [competitionSlug]);

    useEffect(() => {
        const id = searchParams.get("id");
        if (id && !deepLinkOpenedRef.current) {
            deepLinkOpenedRef.current = true;
            getProject(id)
                .then((r) => setSelected(r.data))
                .catch(() => {});
        }
    }, [searchParams]);

    useEffect(() => {
        if (!competition || !user) return;
        if (searchParams.get("create") === "1") setCreating(true);
        if (searchParams.get("submit") === "1" && competitionSubmissionAvailable) {
            setSubmissionOpen(true);
        }
    }, [competition, competitionSubmissionAvailable, searchParams, user]);

    const openDetail = async (project) => {
        if (project.source_type === "competition_work") {
            setSelected(project);
            return;
        }
        try {
            const { data } = await getProject(project.id);
            setSelected(data);
        } catch {
            toast.error(t("project_plaza.toasts.open_failed", "打开失败"));
        }
    };

    const closeDetail = useCallback(() => {
        setShowShareCoachmark(false);
        if (fromFavoritesRef.current) {
            fromFavoritesRef.current = false;
            navigate(-2);
            return;
        }
        setSelected(null);
        deepLinkOpenedRef.current = false;
    }, [navigate]);

    useBackClose(selected !== null, closeDetail);

    useEffect(
        () => () => {
            if (shareCoachTimerRef.current) clearTimeout(shareCoachTimerRef.current);
        },
        []
    );

    useEffect(() => {
        if (!selected || !isMiniProgramWebView()) return;
        shareViaMiniProgram(buildProjectSharePayload(selected, t)).catch(() => {});
    }, [selected, t]);

    const openPoster = useCallback(
        async (project) => {
            if (isMiniProgramWebView()) {
                try {
                    await shareViaMiniProgram(buildProjectSharePayload(project, t));
                } catch {
                    toast.error(
                        t("project_share_poster.share_failed", "分享暂时不可用，请稍后重试")
                    );
                    return;
                }
                setShowShareCoachmark(true);
                if (shareCoachTimerRef.current) clearTimeout(shareCoachTimerRef.current);
                shareCoachTimerRef.current = setTimeout(() => setShowShareCoachmark(false), 12000);
                return;
            }

            setPosterProject(project);
            setSelected(null);
        },
        [t]
    );

    useEffect(() => {
        if (!selected && !posterProject) return undefined;
        if (isMiniProgramWebView()) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [posterProject, selected]);

    const applyFav = useCallback((id, favorited, likes) => {
        const patch = (item) =>
            String(item.id) === String(id) ? { ...item, favorited, likes } : item;
        setItems((list) => list.map(patch));
        setSelected((current) =>
            current && String(current.id) === String(id)
                ? { ...current, favorited, likes }
                : current
        );
    }, []);

    const startCreate = () => {
        if (!user) {
            toast(t("project_plaza.toasts.login_to_publish", "请先登录后再发布"));
            return;
        }
        setCreating(true);
    };

    const startCompetitionSubmit = () => {
        if (!user) {
            toast(t("project_plaza.toasts.login_to_submit", "请先登录后再提交参赛项目"));
            return;
        }
        if (!competitionSubmissionAvailable) {
            toast(
                competitionPhase === "upcoming"
                    ? t("project_plaza.event.submission_upcoming", "作品通道将在比赛开始后开放")
                    : t("project_plaza.event.submission_closed", "本场作品提交已结束")
            );
            return;
        }
        setSubmissionOpen(true);
    };

    const selectCompetition = (slug) => {
        if (slug) {
            setProgFilter("all");
            setNeedFilter(null);
            setFiltersOpen(false);
        }
        navigate(slug ? `/projects?competition=${encodeURIComponent(slug)}` : "/projects");
    };

    const clearDiscoveryConditions = () => {
        setSearch("");
        setProgFilter("all");
        setNeedFilter(null);
        setFiltersOpen(false);
    };

    const toggleNeedFilter = (need) => {
        setNeedFilter(needFilter === need ? null : need);
    };
    const setProgressFilter = (key) => {
        setProgFilter(key);
    };
    const visibleItems = sortProjects(items, sort, competition?.slug);
    const activeFilterCount = Number(progFilter !== "all") + Number(Boolean(needFilter));
    const hasDiscoveryConditions = Boolean(search.trim()) || activeFilterCount > 0;
    const featuredCompetition =
        competitions.find((item) => item.is_featured) ||
        competitions.find((item) => item.status === "active") ||
        competitions[0] ||
        null;
    const activeCompetition =
        competition || competitions.find((item) => item.slug === competitionSlug) || null;

    return (
        <div
            className="ppp-root"
            data-variant={variant}
            data-event={competitionSlug ? "true" : "false"}
        >
            <SEO
                title={
                    activeCompetition
                        ? t("project_plaza.event.meta_title", "{{event}}项目广场", {
                              event: activeCompetition.title,
                          })
                        : t("project_plaza.meta_title", "黑客松项目中心")
                }
                description={t(
                    "project_plaza.meta_desc",
                    "提交黑客松作品，查看历届项目，让比赛成果在赛后继续生长。"
                )}
            />
            <style>{PROJECT_PLAZA_CSS}</style>
            <div className="ppp-backdrop" />
            <picture className="ppp-x-field" aria-hidden="true">
                <source media="(max-width: 767px)" srcSet="/images/hackathon/x-field-mobile.webp" />
                <img src="/images/hackathon/x-field-desktop.webp" alt="" />
            </picture>
            <div className="ppp-stage-grid" aria-hidden="true" />
            <div className="ppp-stage-plane" aria-hidden="true" />
            <div className="ppp-stage-horizon" aria-hidden="true" />
            <div className="ppp-stage-word" aria-hidden="true">
                SHIP
            </div>

            <div className="ppp-wrap">
                {creating ? (
                    <CreateForm
                        competition={competition}
                        onClose={() => setCreating(false)}
                        onCreated={(project) => {
                            setCreating(false);
                            fetchList();
                            if (competition && project?.id && project.status === "published") {
                                setExistingSubmissionProjectId(String(project.id));
                            }
                        }}
                    />
                ) : (
                    <ProjectPlazaWorkspace
                        t={t}
                        allProjectTotal={allProjectTotal || (!competitionSlug ? total : 0)}
                        competitions={competitions}
                        competition={activeCompetition}
                        currentCompetitionSlug={competitionSlug}
                        featuredCompetition={featuredCompetition}
                        submissionAvailable={competitionSubmissionAvailable}
                        competitionPhase={competitionPhase}
                        onSelectCompetition={selectCompetition}
                        onSubmitCompetition={startCompetitionSubmit}
                        onCreateProject={startCreate}
                        search={search}
                        onSearch={setSearch}
                        sort={sort}
                        sortOptions={SORT_OPTIONS}
                        onSort={setSort}
                        filtersOpen={filtersOpen}
                        activeFilterCount={activeFilterCount}
                        onToggleFilters={() => setFiltersOpen((value) => !value)}
                        filterPanel={
                            !competitionSlug && filtersOpen ? (
                                <div
                                    id="project-plaza-advanced-filters"
                                    className="ppp-filters is-open"
                                    aria-label={t("project_plaza.filters.aria", "项目筛选")}
                                >
                                    <div className="ppp-filter-group">
                                        <span className="ppp-flabel">
                                            {t("project_plaza.filters.progress", "进度")}
                                        </span>
                                        {PROGRESS_FILTERS.map(
                                            ({ key, labelKey, fallback, color }) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    className={
                                                        "ppp-chip" +
                                                        (progFilter === key ? " on" : "")
                                                    }
                                                    aria-pressed={progFilter === key}
                                                    onClick={() => setProgressFilter(key)}
                                                >
                                                    {color ? (
                                                        <span
                                                            className="ppp-cdot"
                                                            style={{ background: color }}
                                                            aria-hidden="true"
                                                        />
                                                    ) : null}
                                                    {t(labelKey, fallback)}
                                                </button>
                                            )
                                        )}
                                    </div>
                                    <div className="ppp-filter-group">
                                        <span className="ppp-flabel">
                                            {t("project_plaza.filters.needs", "在找")}
                                        </span>
                                        {NEED_FILTERS.map((need) => (
                                            <button
                                                key={need}
                                                type="button"
                                                className={
                                                    "ppp-chip call" +
                                                    (needFilter === need ? " on" : "")
                                                }
                                                aria-pressed={needFilter === need}
                                                onClick={() => toggleNeedFilter(need)}
                                            >
                                                {getNeedLabel(t, need)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        }
                        resultTotal={total}
                        hasConditions={hasDiscoveryConditions}
                        onClearConditions={clearDiscoveryConditions}
                        loading={loading}
                        items={visibleItems}
                        renderProject={(project) => (
                            <Card
                                p={project}
                                key={project.id}
                                onOpen={openDetail}
                                onFav={applyFav}
                                t={t}
                                competitionSlug={competition?.slug}
                            />
                        )}
                    />
                )}
            </div>

            {selected && (
                <DetailModal
                    p={selected}
                    onClose={closeDetail}
                    onFav={applyFav}
                    loggedIn={Boolean(user)}
                    onOpenPoster={openPoster}
                    showShareCoachmark={showShareCoachmark}
                    onDismissShareCoachmark={() => setShowShareCoachmark(false)}
                    variant={variant}
                />
            )}
            {posterProject && (
                <ProjectSharePoster
                    project={posterProject}
                    onClose={() => setPosterProject(null)}
                    variant={variant}
                />
            )}
            <EventProjectSubmissionModal
                open={submissionOpen}
                onClose={() => setSubmissionOpen(false)}
                onSubmitted={() => {
                    fetchList();
                    setSubmissionOpen(false);
                }}
                competition={competition}
            />
            <CompetitionOutcomeUploadModal
                open={Boolean(existingSubmissionProjectId)}
                onClose={() => setExistingSubmissionProjectId("")}
                onSubmitted={() => {
                    fetchList();
                    setExistingSubmissionProjectId("");
                }}
                initialType="work"
                initialProjectId={existingSubmissionProjectId}
                competitionSlug={competition?.slug}
                competitionTitle={competition?.title}
            />
        </div>
    );
};

export default ProjectPlaza;
