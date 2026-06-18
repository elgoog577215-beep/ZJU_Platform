import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Eye,
  Github,
  Images,
  Lock,
  Mail,
  Plus,
  Search,
  Share2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useBackClose } from "../hooks/useBackClose";
import SEO from "./SEO";
import api, {
  getProjects, getProject, createProjectCard,
} from "../services/api";
import FavoriteButton from "./FavoriteButton";
import ProjectSharePoster from "./ProjectSharePoster";
import { PROJECT_PLAZA_CSS } from "./projectPlaza.styles";

const PROGRESS_META = {
  idea: { labelKey: "project_plaza.progress.idea", fallback: "构思中", c: "var(--p-idea)" },
  dev: { labelKey: "project_plaza.progress.dev", fallback: "开发中", c: "var(--p-dev)" },
  live: { labelKey: "project_plaza.progress.live", fallback: "已上线", c: "var(--p-live)" },
  pause: { labelKey: "project_plaza.progress.pause", fallback: "暂停", c: "var(--p-pause)" },
};
const PROGRESS_FILTERS = [
  { key: "all", labelKey: "project_plaza.filters.all", fallback: "全部", color: null },
  { key: "idea", labelKey: "project_plaza.progress.idea", fallback: "构思中", color: "var(--p-idea)" },
  { key: "dev", labelKey: "project_plaza.progress.dev", fallback: "开发中", color: "var(--p-dev)" },
  { key: "live", labelKey: "project_plaza.progress.live", fallback: "已上线", color: "var(--p-live)" },
];
const NEED_FILTERS = ["缺人", "缺设计", "缺讨论", "找测试用户"];
const NEEDS_ALL = ["缺人", "缺设计", "缺产品", "缺讨论", "找测试用户", "缺资金"];
const PROG_OPTS = ["idea", "dev", "live", "pause"];
const NEED_LABEL_KEYS = {
  "缺人": "project_plaza.needs.people",
  "缺设计": "project_plaza.needs.design",
  "缺产品": "project_plaza.needs.product",
  "缺讨论": "project_plaza.needs.discussion",
  "找测试用户": "project_plaza.needs.testers",
  "缺资金": "project_plaza.needs.funding",
};

const initials = (name, fallback = "你") => (name ? name.trim().slice(0, 1) : fallback.trim().slice(0, 1));
const GRAD = "linear-gradient(135deg,#f43f5e,#7c3aed)";

const getProgressLabel = (t, progress) => {
  const meta = PROGRESS_META[progress] || PROGRESS_META.idea;
  return t(meta.labelKey, meta.fallback);
};

const getNeedLabel = (t, need) => (NEED_LABEL_KEYS[need] ? t(NEED_LABEL_KEYS[need], need) : need);

const Avatar = ({ name, grad = GRAD, idx = 0, fallbackInitial = "你" }) => (
  <span className="ppp-av" style={{ background: grad, marginLeft: idx ? -8 : 0 }}>{initials(name, fallbackInitial)}</span>
);

const ProgPill = ({ progress, t, className = "" }) => {
  const meta = PROGRESS_META[progress] || PROGRESS_META.idea;
  return <span className={`ppp-prog ${className}`}><span className="ppp-d" style={{ background: meta.c }} />{getProgressLabel(t, progress)}</span>;
};

const Card = ({ p, onOpen, onFav, t }) => {
  const fallbackInitial = t("project_plaza.initial_you", "你");
  const title = p.title || t("project_plaza.untitled", "未命名项目");
  return (
    <article className="ppp-card" onClick={() => onOpen(p)}>
      <div className="ppp-cover">
        {p.cover_url
          ? <img className="ppp-art" src={p.cover_url} alt={title} loading="lazy" />
          : <span className="ppp-art ppp-noart">{title.slice(0, 2)}</span>}
        <ProgPill progress={p.progress} t={t} />
        {p.images?.length > 1 && (
          <span className="ppp-photos"><Images size={12} />{p.images.length}</span>
        )}
      </div>
      <div className="ppp-body">
        <div className="ppp-trow">
          <h3 className="ppp-title">{title}</h3>
          <ArrowRight className="ppp-arrow" size={16} />
        </div>
        {p.intro && <p className="ppp-intro">{p.intro}</p>}
        {p.need_tags?.length > 0 && (
          <div className="ppp-needs">{p.need_tags.slice(0, 3).map((n) => <span className="ppp-need" key={n}>{getNeedLabel(t, n)}</span>)}</div>
        )}
        {p.tech_tags?.length > 0 && (
          <div className="ppp-tech">{p.tech_tags.slice(0, 3).map((tag) => <span className="ppp-tag" key={tag}>{tag}</span>)}</div>
        )}
        <div className="ppp-meta">
          <div className="ppp-team">
            <div className="ppp-stack"><Avatar name={p.owner_name} fallbackInitial={fallbackInitial} /></div>
            <span className="ppp-lbl">{p.owner_name || t("project_plaza.anonymous", "匿名")}</span>
          </div>
          <div className="ppp-favrow" onClick={(e) => e.stopPropagation()}>
            <span className="ppp-views"><Eye size={14} />{p.views ?? 0}</span>
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
          </div>
        </div>
      </div>
    </article>
  );
};

const DetailModal = ({ p, onClose, onFav, loggedIn, onOpenPoster }) => {
  const { t } = useTranslation();
  const imgs = p.images?.length ? p.images : (p.cover_url ? [p.cover_url] : []);
  const [active, setActive] = useState(0);
  const paras = (p.content || "").split(/\n+/).filter(Boolean);
  const title = p.title || t("project_plaza.untitled", "未命名项目");
  const ownerName = p.owner_name || t("project_plaza.anonymous", "匿名");
  return (
    <div className="ppp-scrim" onClick={onClose}>
      <div className="ppp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ppp-x" type="button" onClick={onClose} aria-label={t("common.close", "关闭")}><X size={18} /></button>
        <div className="ppp-mgallery">
          {imgs[active]
            ? <img className="ppp-mhero" src={imgs[active]} alt={title} />
            : <span className="ppp-mhero ppp-noart">{title.slice(0, 2)}</span>}
          <ProgPill progress={p.progress} t={t} className="ppp-mprog" />
          {imgs.length > 1 && (
            <div className="ppp-mthumbs">
              {imgs.map((im, i) => (
                <button className={`ppp-t ${i === active ? "sel" : ""}`} type="button" key={im + i} onClick={() => setActive(i)}>
                  <img src={im} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ppp-mbody">
          <span className="ppp-kicker">{t("project_plaza.detail_kicker", "项目名片")}</span>
          <div className="ppp-mhead">
            <h2 className="ppp-mtitle">{title}</h2>
          </div>
          <div className="ppp-mteam">
            <div className="ppp-stack"><Avatar name={p.owner_name} fallbackInitial={t("project_plaza.initial_you", "你")} /></div>
            <span className="ppp-lbl">{t("project_plaza.owner_prefix", "发起人")} {ownerName}</span>
          </div>
          <div className="ppp-mstrip">
            <span><Eye size={14} />{p.views ?? 0}</span>
            <span>{t("project_plaza.stats.saves", "{{count}} 收藏", { count: p.likes ?? 0 })}</span>
            <span>{getProgressLabel(t, p.progress)}</span>
          </div>
          {p.intro && <p className="ppp-msummary">{p.intro}</p>}
          {paras.length > 0 && (
            <div className="ppp-mblock">
              <div className="ppp-bt">{t("project_plaza.detail_intro", "项目介绍")}</div>
              <div className="ppp-content">{paras.map((para, i) => <p key={i}>{para}</p>)}</div>
            </div>
          )}
          {p.need_tags?.length > 0 && (
            <div className="ppp-mblock">
              <div className="ppp-bt">{t("project_plaza.detail_needs", "在找")}</div>
              <div className="ppp-needs">{p.need_tags.map((n) => <span className="ppp-mneed" key={n}>{getNeedLabel(t, n)}</span>)}</div>
            </div>
          )}
          {p.tech_tags?.length > 0 && (
            <div className="ppp-mblock">
              <div className="ppp-bt">{t("project_plaza.detail_tags", "特点 / 技术栈")}</div>
              <div className="ppp-tech">{p.tech_tags.map((tag) => <span className="ppp-mtag" key={tag}>{tag}</span>)}</div>
            </div>
          )}
          <div className="ppp-mcontact">
            {p.repo_url
              ? <a className="ppp-cbtn primary" href={p.repo_url} target="_blank" rel="noreferrer"><Github size={16} />{t("project_plaza.actions.repo", "看仓库")}</a>
              : <span className="ppp-cbtn primary ppp-disabled"><Github size={16} />{t("project_plaza.actions.no_repo", "无仓库")}</span>}
            <button className="ppp-cbtn ghost" type="button" onClick={() => onOpenPoster(p)}>
              <Share2 size={16} />
              {t("project_share_poster.open_action", "生成海报")}
            </button>
            {loggedIn
              ? <span className="ppp-cbtn ghost"><Mail size={16} />{p.contact_wechat ? `${t("project_plaza.contact.wechat", "微信")} · ${p.contact_wechat}` : (p.contact_email || t("project_plaza.contact.empty", "未留联系方式"))}</span>
              : <span className="ppp-cbtn ghost"><Lock size={16} />{t("project_plaza.contact.login_required", "登录后查看联系方式")}</span>}
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
          </div>
        </div>
      </div>
    </div>
  );
};

const uploadImage = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return data.fileUrl;
};

const CreateForm = ({ onClose, onCreated }) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  const [body, setBody] = useState("");
  const [prog, setProg] = useState("dev");
  const [needs, setNeeds] = useState(["缺人"]);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [repo, setRepo] = useState("");
  const [wechat, setWechat] = useState("");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const toggleNeed = (need) => setNeeds((value) => (value.includes(need) ? value.filter((item) => item !== need) : [...value, need]));
  const addTag = () => {
    const tag = tagDraft.trim();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagDraft("");
  };
  const onPick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
    for (const file of files) {
      try { const url = await uploadImage(file); setImages((prev) => [...prev, url]); }
      catch { toast.error(t("project_plaza.toasts.upload_failed", "图片上传失败")); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (status) => {
    if (!name.trim()) { toast.error(t("project_plaza.toasts.name_required", "请填写项目名称")); return; }
    if (repo && !/^https:\/\//i.test(repo)) { toast.error(t("project_plaza.toasts.repo_https", "仓库链接需为 https")); return; }
    setBusy(true);
    try {
      const { data } = await createProjectCard({
        title: name, intro, content: body, progress: prog,
        need_tags: needs, tech_tags: tags, repo_url: repo || null,
        contact_wechat: wechat || null, images, status,
      });
      toast.success(status === "draft" ? t("project_plaza.toasts.draft_saved", "已存草稿") : t("project_plaza.toasts.published", "已发布到广场"));
      onCreated(data);
    } catch (err) {
      toast.error(err?.response?.data?.error || t("project_plaza.toasts.publish_failed", "发布失败"));
    } finally { setBusy(false); }
  };

  return (
    <div className="ppp-create">
      <div className="ppp-cbar">
        <button className="ppp-back" type="button" onClick={onClose}>{t("project_plaza.form.back", "返回广场")}</button>
        <div className="ppp-ctitle">{t("project_plaza.form.title", "发布项目名片")}</div>
        <div className="ppp-cactions">
          <button className="ppp-cbtn ghost" type="button" disabled={busy} onClick={() => submit("draft")}>{t("project_plaza.form.save_draft", "存草稿")}</button>
          <button className="ppp-cbtn primary" type="button" disabled={busy} onClick={() => submit("published")}>{busy ? t("project_plaza.form.publishing", "发布中...") : t("project_plaza.form.publish", "发布到广场")}</button>
        </div>
      </div>
      <div className="ppp-cgrid">
        <div className="ppp-form">
          <div className="ppp-fsec">
            <label className="ppp-flab">{t("project_plaza.form.photos", "项目照片")}<span>{t("project_plaza.form.photos_hint", "第一张作封面，最多 9 张")}</span></label>
            <div className="ppp-uploads">
              <button className="ppp-up ppp-upadd" type="button" onClick={() => fileRef.current?.click()}><UploadCloud size={20} /><small>{t("project_plaza.form.upload", "上传")}</small></button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
              {images.map((url, i) => (
                <div className="ppp-up" key={url}><img src={url} alt="" />{i === 0 && <span className="ppp-upcover">{t("project_plaza.form.cover", "封面")}</span>}</div>
              ))}
            </div>
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">{t("project_plaza.form.name", "项目名称")}</label>
            <input className="ppp-finput" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("project_plaza.form.name_placeholder", "例如：校园二手书漂流")} maxLength={40} />
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">{t("project_plaza.form.summary", "一句话简介")}<span>{t("project_plaza.form.summary_hint", "显示在卡片上")}</span></label>
            <input className="ppp-finput" value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={t("project_plaza.form.summary_placeholder", "一句话说清楚它是什么")} maxLength={80} />
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">{t("project_plaza.form.body", "项目介绍")}<span>{t("project_plaza.form.body_hint", "点开名片后展示")}</span></label>
            <textarea
              className="ppp-ftext"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder={t("project_plaza.form.body_placeholder", "在做什么、做到哪一步、接下来想干嘛...")}
            />
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">{t("project_plaza.form.progress", "当前进度")}</label>
            <div className="ppp-seg">
              {PROG_OPTS.map((key) => (
                <button key={key} type="button" className={`ppp-segbtn ${prog === key ? "on" : ""}`} onClick={() => setProg(key)}>
                  <span className="ppp-d" style={{ background: PROGRESS_META[key].c }} />{getProgressLabel(t, key)}
                </button>
              ))}
            </div>
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">{t("project_plaza.form.needs", "我在找")}<span>{t("project_plaza.form.needs_hint", "可多选")}</span></label>
            <div className="ppp-pick">
              {NEEDS_ALL.map((need) => (
                <button key={need} type="button" className={`ppp-pchip ${needs.includes(need) ? "on" : ""}`} onClick={() => toggleNeed(need)}>{getNeedLabel(t, need)}</button>
              ))}
            </div>
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">{t("project_plaza.form.tags", "技术栈 / 特点标签")}</label>
            <div className="ppp-taginput">
              {tags.map((tag) => <span className="ppp-tg" key={tag}>{tag}<button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))}>x</button></span>)}
              <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder={t("project_plaza.form.tag_placeholder", "输入后回车")} />
            </div>
          </div>
          <div className="ppp-frow">
            <div className="ppp-fsec ppp-fhalf">
              <label className="ppp-flab">{t("project_plaza.form.repo", "仓库链接")}</label>
              <input className="ppp-finput" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div className="ppp-fsec ppp-fhalf">
              <label className="ppp-flab">{t("project_plaza.form.contact", "联系方式")}<span>{t("project_plaza.form.contact_hint", "仅登录用户可见")}</span></label>
              <input className="ppp-finput" value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder={t("project_plaza.form.contact_placeholder", "微信号 / 邮箱")} />
            </div>
          </div>
        </div>

        <div className="ppp-preview">
          <div className="ppp-pvlab">{t("project_plaza.form.preview_label", "实时预览")}</div>
          <article className="ppp-card ppp-pvcard">
            <div className="ppp-cover">
              {images[0] ? <img className="ppp-art" src={images[0]} alt="" /> : <span className="ppp-art ppp-noart">{name.slice(0, 2) || t("project_plaza.form.cover", "封面")}</span>}
              <ProgPill progress={prog} t={t} />
            </div>
            <div className="ppp-body">
              <div className="ppp-trow"><h3 className="ppp-title">{name || t("project_plaza.form.preview_title", "项目名称")}</h3></div>
              <p className="ppp-intro" style={{ opacity: intro ? 1 : 0.5 }}>{intro || t("project_plaza.form.preview_summary", "一句话简介会显示在这里")}</p>
              <div className="ppp-needs">{(needs.length ? needs : ["缺人"]).slice(0, 3).map((need) => <span className="ppp-need" key={need}>{getNeedLabel(t, need)}</span>)}</div>
              <div className="ppp-tech">{tags.slice(0, 3).map((tag) => <span className="ppp-tag" key={tag}>{tag}</span>)}</div>
              <div className="ppp-meta">
                <div className="ppp-team"><div className="ppp-stack"><Avatar name={t("project_plaza.initial_you", "你")} fallbackInitial={t("project_plaza.initial_you", "你")} /></div><span className="ppp-lbl">{t("project_plaza.initial_you", "你")}</span></div>
                <div className="ppp-favrow"><span className="ppp-views"><Eye size={14} />0</span><span className="ppp-fav ppp-static-fav">0</span></div>
              </div>
            </div>
          </article>
          <div className="ppp-pvhint">{t("project_plaza.form.preview_hint", "别人会先看到这张紧凑名片，点开再读完整介绍。")}</div>
        </div>
      </div>
    </div>
  );
};

const ProjectPlaza = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const variant = uiMode === "day" ? "playful" : "cyber";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [posterProject, setPosterProject] = useState(null);
  const [creating, setCreating] = useState(false);
  const [progFilter, setProgFilter] = useState("all");
  const [needFilter, setNeedFilter] = useState(null);
  const [search, setSearch] = useState("");
  const fromFavoritesRef = useRef(
    searchParams.get("fromfav") === "1" || location.state?.fromFavorites === true
  );
  const deepLinkOpenedRef = useRef(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (progFilter !== "all") params.progress = progFilter;
      if (needFilter) params.need = needFilter;
      if (search.trim()) params.q = search.trim();
      const { data } = await getProjects(params);
      setItems(data.items || []);
    } catch { toast.error(t("project_plaza.toasts.load_failed", "加载失败")); }
    finally { setLoading(false); }
  }, [progFilter, needFilter, search, t]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && !deepLinkOpenedRef.current) {
      deepLinkOpenedRef.current = true;
      getProject(id).then((r) => setSelected(r.data)).catch(() => {});
    }
  }, [searchParams]);

  const openDetail = async (project) => {
    try { const { data } = await getProject(project.id); setSelected(data); }
    catch { toast.error(t("project_plaza.toasts.open_failed", "打开失败")); }
  };

  const closeDetail = useCallback(() => {
    if (fromFavoritesRef.current) { fromFavoritesRef.current = false; navigate(-2); return; }
    setSelected(null);
    deepLinkOpenedRef.current = false;
  }, [navigate]);

  useBackClose(selected !== null, closeDetail);

  const applyFav = useCallback((id, favorited, likes) => {
    const patch = (item) => (String(item.id) === String(id) ? { ...item, favorited, likes } : item);
    setItems((list) => list.map(patch));
    setSelected((current) => (current && String(current.id) === String(id) ? { ...current, favorited, likes } : current));
  }, []);

  const startCreate = () => {
    if (!user) { toast(t("project_plaza.toasts.login_to_publish", "请先登录后再发布")); return; }
    setCreating(true);
  };

  return (
    <div className="ppp-root" data-variant={variant}>
      <SEO title={t("project_plaza.meta_title", "项目广场")} description={t("project_plaza.meta_desc", "把正在做的项目放上来，让对的人找到你。")} />
      <style>{PROJECT_PLAZA_CSS}</style>

      <div className="ppp-wrap">
        {creating ? (
          <CreateForm onClose={() => setCreating(false)} onCreated={() => { setCreating(false); fetchList(); }} />
        ) : (
          <>
            <section className="ppp-shell" aria-labelledby="project-plaza-title">
              <div className="ppp-ph">
                <div className="ppp-headcopy">
                  <span className="ppp-code">{t("project_plaza.kicker", "BUILD · 项目广场")}</span>
                  <h1 id="project-plaza-title">{t("project_plaza.title", "项目广场")}</h1>
                  <div className="ppp-sub">{t("project_plaza.subtitle", "找项目、看进度、补队友。")}</div>
                </div>
                <button className="ppp-newbtn" type="button" onClick={startCreate}><Plus size={18} />{t("project_plaza.actions.publish", "发布项目")}</button>
              </div>

              <div className="ppp-toolbar">
                <label className="ppp-search">
                  <Search size={17} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("project_plaza.search_placeholder", "搜索项目、技术栈、发起人...")} />
                </label>
              </div>

              <div className="ppp-filters" aria-label={t("project_plaza.filters.aria", "项目筛选")}>
                <div className="ppp-filter-group">
                  <span className="ppp-flabel">{t("project_plaza.filters.progress", "进度")}</span>
                  {PROGRESS_FILTERS.map(({ key, labelKey, fallback, color }) => (
                    <button key={key} type="button" className={`ppp-chip ${progFilter === key ? "on" : ""}`} onClick={() => setProgFilter(key)}>
                      {color && <span className="ppp-cdot" style={{ background: color }} />}{t(labelKey, fallback)}
                    </button>
                  ))}
                </div>
                <div className="ppp-filter-group">
                  <span className="ppp-flabel">{t("project_plaza.filters.needs", "在找")}</span>
                  {NEED_FILTERS.map((need) => (
                    <button key={need} type="button" className={`ppp-chip call ${needFilter === need ? "on" : ""}`} onClick={() => setNeedFilter(needFilter === need ? null : need)}>{getNeedLabel(t, need)}</button>
                  ))}
                </div>
              </div>
            </section>

            {loading ? (
              <div className="ppp-empty">{t("project_plaza.loading", "加载中...")}</div>
            ) : items.length === 0 ? (
              <div className="ppp-empty">
                <UserRound size={34} />
                <strong>{t("project_plaza.empty_title", "还没有匹配的项目名片")}</strong>
                <span>{t("project_plaza.empty_desc", "换个关键词，或发布第一个项目。")}</span>
                <button className="ppp-newbtn ppp-empty-action" type="button" onClick={startCreate}><Plus size={18} />{t("project_plaza.actions.publish_first", "发布第一个项目")}</button>
              </div>
            ) : (
              <div className="ppp-grid">
                {items.map((project) => <Card p={project} key={project.id} onOpen={openDetail} onFav={applyFav} t={t} />)}
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <DetailModal
          p={selected}
          onClose={closeDetail}
          onFav={applyFav}
          loggedIn={Boolean(user)}
          onOpenPoster={setPosterProject}
        />
      )}
      {posterProject && <ProjectSharePoster project={posterProject} onClose={() => setPosterProject(null)} />}
    </div>
  );
};

export default ProjectPlaza;
