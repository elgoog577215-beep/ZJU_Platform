import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Share2 } from "lucide-react";
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

const PROG = {
  idea: { label: "构思中", c: "var(--p-idea)" },
  dev: { label: "开发中", c: "var(--p-dev)" },
  live: { label: "已上线", c: "var(--p-live)" },
  pause: { label: "暂停", c: "var(--p-pause)" },
};
const PROGRESS_FILTERS = [
  ["all", "全部", null], ["idea", "构思中", "var(--p-idea)"],
  ["dev", "开发中", "var(--p-dev)"], ["live", "已上线", "var(--p-live)"],
];
const NEED_FILTERS = ["缺人", "缺设计", "缺讨论", "找测试用户"];
const NEEDS_ALL = ["缺人", "缺设计", "缺产品", "缺讨论", "找测试用户", "缺资金"];
const PROG_OPTS = [["idea", "构思中"], ["dev", "开发中"], ["live", "已上线"], ["pause", "暂停"]];

const initials = (name) => (name ? name.trim().slice(0, 1) : "你");
const GRAD = "linear-gradient(135deg,#22d3ee,#6366f1)";

const Avatar = ({ name, grad = GRAD, idx = 0 }) => (
  <span className="ppp-av" style={{ background: grad, marginLeft: idx ? -8 : 0 }}>{initials(name)}</span>
);

const ProgPill = ({ progress, className = "" }) => {
  const p = PROG[progress] || PROG.idea;
  return <span className={`ppp-prog ${className}`}><span className="ppp-d" style={{ background: p.c }} />{p.label}</span>;
};

const Card = ({ p, onOpen, onFav }) => (
  <article className="ppp-card" onClick={() => onOpen(p)}>
    <div className="ppp-cover">
      {p.cover_url
        ? <img className="ppp-art" src={p.cover_url} alt={p.title} loading="lazy" />
        : <span className="ppp-art ppp-noart">{p.title?.slice(0, 2)}</span>}
      <ProgPill progress={p.progress} />
      {p.images?.length > 1 && <span className="ppp-photos">📷 {p.images.length}</span>}
    </div>
    <div className="ppp-body">
      <div className="ppp-trow"><h3 className="ppp-title">{p.title}</h3></div>
      {p.intro && <p className="ppp-intro">{p.intro}</p>}
      {p.need_tags?.length > 0 && (
        <div className="ppp-needs">{p.need_tags.map((n) => <span className="ppp-need" key={n}>{n}</span>)}</div>
      )}
      {p.tech_tags?.length > 0 && (
        <div className="ppp-tech">{p.tech_tags.slice(0, 3).map((t) => <span className="ppp-tag" key={t}>{t}</span>)}</div>
      )}
      <div className="ppp-meta">
        <div className="ppp-team">
          <div className="ppp-stack"><Avatar name={p.owner_name} /></div>
          <span className="ppp-lbl">{p.owner_name || "匿名"}</span>
        </div>
        <div className="ppp-favrow" onClick={(e) => e.stopPropagation()}>
          <span className="ppp-views">👁 {p.views ?? 0}</span>
          <FavoriteButton
            itemId={p.id}
            itemType="project"
            favorited={p.favorited}
            count={p.likes ?? 0}
            showCount
            size={26}
            className="ppp-fav"
            onToggle={(fav, likes) => onFav(p.id, fav, likes)}
          />
        </div>
      </div>
    </div>
  </article>
);

const DetailModal = ({ p, onClose, onFav, loggedIn, onOpenPoster }) => {
  const { t } = useTranslation();
  const imgs = p.images?.length ? p.images : (p.cover_url ? [p.cover_url] : []);
  const [active, setActive] = useState(0);
  const paras = (p.content || "").split(/\n+/).filter(Boolean);
  return (
    <div className="ppp-scrim" onClick={onClose}>
      <div className="ppp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ppp-x" onClick={onClose}>✕</button>
        <div className="ppp-mgallery">
          {imgs[active]
            ? <img className="ppp-mhero" src={imgs[active]} alt={p.title} />
            : <span className="ppp-mhero ppp-noart">{p.title?.slice(0, 2)}</span>}
          <ProgPill progress={p.progress} className="ppp-mprog" />
          {imgs.length > 1 && (
            <div className="ppp-mthumbs">
              {imgs.map((im, i) => (
                <button className={`ppp-t ${i === active ? "sel" : ""}`} key={im + i} onClick={() => setActive(i)}>
                  <img src={im} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ppp-mbody">
          <span className="ppp-kicker">项目名片</span>
          <div className="ppp-mhead">
            <h2 className="ppp-mtitle">{p.title}</h2>
            <ProgPill progress={p.progress} className="ppp-mprog2" />
          </div>
          <div className="ppp-mteam">
            <div className="ppp-stack"><Avatar name={p.owner_name} /></div>
            <span className="ppp-lbl">发起人 {p.owner_name || "匿名"}</span>
          </div>
          <div className="ppp-mstats">
            <div className="ppp-mstat"><b>{p.likes ?? 0}</b><span>收藏</span></div>
            <div className="ppp-mstat"><b>{p.views ?? 0}</b><span>浏览</span></div>
            <div className="ppp-mstat"><b>{PROG[p.progress]?.label || "—"}</b><span>状态</span></div>
          </div>
          {paras.length > 0 && (
            <div className="ppp-mblock">
              <div className="ppp-bt">项目介绍</div>
              <div className="ppp-content">{paras.map((para, i) => <p key={i}>{para}</p>)}</div>
            </div>
          )}
          {p.need_tags?.length > 0 && (
            <div className="ppp-mblock">
              <div className="ppp-bt">在找 / 状态</div>
              <div className="ppp-needs">{p.need_tags.map((n) => <span className="ppp-mneed" key={n}>{n}</span>)}</div>
            </div>
          )}
          {p.tech_tags?.length > 0 && (
            <div className="ppp-mblock">
              <div className="ppp-bt">特点 / 技术栈</div>
              <div className="ppp-tech">{p.tech_tags.map((t) => <span className="ppp-mtag" key={t}>{t}</span>)}</div>
            </div>
          )}
          <div className="ppp-mcontact">
            {p.repo_url
              ? <a className="ppp-cbtn primary" href={p.repo_url} target="_blank" rel="noreferrer">✦ 看仓库</a>
              : <span className="ppp-cbtn primary ppp-disabled">无仓库</span>}
            <button className="ppp-cbtn ghost" type="button" onClick={() => onOpenPoster(p)}>
              <Share2 size={16} />
              {t("project_share_poster.open_action", "生成海报")}
            </button>
            {loggedIn
              ? <span className="ppp-cbtn ghost">{p.contact_wechat ? `✉ 微信 · ${p.contact_wechat}` : (p.contact_email ? `✉ ${p.contact_email}` : "未留联系方式")}</span>
              : <span className="ppp-cbtn ghost">🔒 登录后查看联系方式</span>}
            <FavoriteButton
              itemId={p.id}
              itemType="project"
              favorited={p.favorited}
              count={p.likes ?? 0}
              showCount
              size={26}
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

  const toggleNeed = (n) => setNeeds((v) => (v.includes(n) ? v.filter((x) => x !== n) : [...v, n]));
  const addTag = () => { const t = tagDraft.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setTagDraft(""); };
  const onPick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 9 - images.length);
    for (const f of files) {
      try { const url = await uploadImage(f); setImages((prev) => [...prev, url]); }
      catch { toast.error("图片上传失败"); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (status) => {
    if (!name.trim()) { toast.error("请填写项目名称"); return; }
    if (repo && !/^https:\/\//i.test(repo)) { toast.error("仓库链接需为 https"); return; }
    setBusy(true);
    try {
      const { data } = await createProjectCard({
        title: name, intro, content: body, progress: prog,
        need_tags: needs, tech_tags: tags, repo_url: repo || null,
        contact_wechat: wechat || null, images, status,
      });
      toast.success(status === "draft" ? "已存草稿" : "已发布到广场");
      onCreated(data);
    } catch (err) {
      toast.error(err?.response?.data?.error || "发布失败");
    } finally { setBusy(false); }
  };

  return (
    <div className="ppp-create">
      <div className="ppp-cbar">
        <button className="ppp-back" onClick={onClose}>← 返回广场</button>
        <div className="ppp-ctitle">发布项目名片</div>
        <div className="ppp-cactions">
          <button className="ppp-cbtn ghost" disabled={busy} onClick={() => submit("draft")}>存草稿</button>
          <button className="ppp-cbtn primary" disabled={busy} onClick={() => submit("published")}>{busy ? "发布中…" : "发布到广场"}</button>
        </div>
      </div>
      <div className="ppp-cgrid">
        <div className="ppp-form">
          <div className="ppp-fsec">
            <label className="ppp-flab">项目照片<span>第一张作封面，最多 9 张</span></label>
            <div className="ppp-uploads">
              <div className="ppp-up ppp-upadd" onClick={() => fileRef.current?.click()}>＋<small>上传 / 拖入</small></div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
              {images.map((url, i) => (
                <div className="ppp-up" key={url}><img src={url} alt="" />{i === 0 && <span className="ppp-upcover">封面</span>}</div>
              ))}
            </div>
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">项目名称</label>
            <input className="ppp-finput" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：校园二手书漂流" maxLength={40} />
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">一句话简介<span>显示在卡片上</span></label>
            <input className="ppp-finput" value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="一句话说清楚它是什么" maxLength={80} />
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">项目介绍<span>名片主体，可以写长一点 · 支持分段</span></label>
            <textarea className="ppp-ftext" value={body} onChange={(e) => setBody(e.target.value)} rows={7}
              placeholder={"在做什么、为什么做、做到哪一步、接下来想干嘛……\n这是别人点开名片后读到的主要内容，尽量写充分。"} />
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">当前进度</label>
            <div className="ppp-seg">
              {PROG_OPTS.map(([k, label]) => (
                <button key={k} className={`ppp-segbtn ${prog === k ? "on" : ""}`} onClick={() => setProg(k)}>
                  <span className="ppp-d" style={{ background: PROG[k].c }} />{label}
                </button>
              ))}
            </div>
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">我在找<span>可多选 · 广场按这个筛你</span></label>
            <div className="ppp-pick">
              {NEEDS_ALL.map((n) => (
                <button key={n} className={`ppp-pchip ${needs.includes(n) ? "on" : ""}`} onClick={() => toggleNeed(n)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="ppp-fsec">
            <label className="ppp-flab">技术栈 / 特点标签</label>
            <div className="ppp-taginput">
              {tags.map((t) => <span className="ppp-tg" key={t}>{t}<i onClick={() => setTags(tags.filter((x) => x !== t))}>×</i></span>)}
              <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="输入后回车" />
            </div>
          </div>
          <div className="ppp-frow">
            <div className="ppp-fsec ppp-fhalf">
              <label className="ppp-flab">仓库链接</label>
              <input className="ppp-finput" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/…" />
            </div>
            <div className="ppp-fsec ppp-fhalf">
              <label className="ppp-flab">联系方式<span>仅登录用户可见</span></label>
              <input className="ppp-finput" value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder="微信号 / 邮箱" />
            </div>
          </div>
        </div>

        <div className="ppp-preview">
          <div className="ppp-pvlab">实时预览</div>
          <article className="ppp-card ppp-pvcard">
            <div className="ppp-cover">
              {images[0] ? <img className="ppp-art" src={images[0]} alt="" /> : <span className="ppp-art ppp-noart">{name.slice(0, 2) || "封面"}</span>}
              <ProgPill progress={prog} />
            </div>
            <div className="ppp-body">
              <div className="ppp-trow"><h3 className="ppp-title">{name || "项目名称"}</h3></div>
              <p className="ppp-intro" style={{ opacity: intro ? 1 : 0.5 }}>{intro || "一句话简介会显示在这里"}</p>
              <div className="ppp-needs">{(needs.length ? needs : ["缺人"]).map((n) => <span className="ppp-need" key={n}>{n}</span>)}</div>
              <div className="ppp-tech">{tags.slice(0, 3).map((t) => <span className="ppp-tag" key={t}>{t}</span>)}</div>
              <div className="ppp-meta">
                <div className="ppp-team"><div className="ppp-stack"><Avatar name="你" /></div><span className="ppp-lbl">你</span></div>
                <div className="ppp-favrow"><span className="ppp-views">👁 0</span><span className="ppp-fav" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>♡ 0</span></div>
              </div>
            </div>
          </article>
          <div className="ppp-pvhint">广场上别人看到的就是这张卡 · 点开能读到完整「项目介绍」</div>
        </div>
      </div>
    </div>
  );
};

const ProjectPlaza = () => {
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
  // Came from the user's favorites list? Prefer the URL marker (survives the
  // detail's history.pushState, which wipes router state); fall back to state.
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
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  }, [progFilter, needFilter, search]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Deep link ?id= opens the detail once (also the favorites-return entry point).
  // Guarded so closing the modal (which clears ?id) never re-triggers an open.
  useEffect(() => {
    const id = searchParams.get("id");
    if (id && !deepLinkOpenedRef.current) {
      deepLinkOpenedRef.current = true;
      getProject(id).then((r) => setSelected(r.data)).catch(() => {});
    }
  }, [searchParams]);

  const openDetail = async (p) => {
    try { const { data } = await getProject(p.id); setSelected(data); }
    catch { toast.error("打开失败"); }
  };

  // fromFavorites: jump back to the favorites tab (navigate(-2)); otherwise just
  // close. Do NOT issue any extra navigation in the else branch — useBackClose
  // owns the history (it pops the pushed hash), and a competing setSearchParams
  // here would override navigate(-2) during the popstate re-entry.
  const closeDetail = useCallback(() => {
    if (fromFavoritesRef.current) { fromFavoritesRef.current = false; navigate(-2); return; }
    setSelected(null);
    deepLinkOpenedRef.current = false;
  }, [navigate]);

  useBackClose(selected !== null, closeDetail);

  // FavoriteButton owns the API call + login check + optimistic update;
  // we just sync the plaza/detail local state from its onToggle callback.
  const applyFav = useCallback((id, favorited, likes) => {
    const patch = (x) => (String(x.id) === String(id) ? { ...x, favorited, likes } : x);
    setItems((list) => list.map(patch));
    setSelected((s) => (s && String(s.id) === String(id) ? { ...s, favorited, likes } : s));
  }, []);

  const startCreate = () => {
    if (!user) { toast("请先登录后再发布"); return; }
    setCreating(true);
  };

  return (
    <div className="ppp-root" data-variant={variant}>
      <SEO title="项目广场" description="把正在做的项目放上来，让对的人找到你。" />
      <style>{PROJECT_PLAZA_CSS}</style>

      <div className="ppp-wrap">
        {creating ? (
          <CreateForm onClose={() => setCreating(false)} onCreated={() => { setCreating(false); fetchList(); }} />
        ) : (
          <>
            <div className="ppp-ph">
              <div>
                <h1>项目广场</h1>
                <div className="ppp-sub">把正在发生的想法，变成一张可以被看见的项目名片 —— 它会自我介绍：在做什么、做到哪、还缺谁。</div>
              </div>
              <div className="ppp-brand">TUOTUZJU</div>
            </div>

            <div className="ppp-toolbar">
              <div className="ppp-search">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目、技术栈、发起人…" />
              </div>
              <button className="ppp-newbtn" onClick={startCreate}>＋ 发布我的项目</button>
            </div>

            <div className="ppp-filters">
              <span className="ppp-flabel">进度</span>
              {PROGRESS_FILTERS.map(([k, label, c]) => (
                <span key={k} className={`ppp-chip ${progFilter === k ? "on" : ""}`} onClick={() => setProgFilter(k)}>
                  {c && <span className="ppp-cdot" style={{ background: c }} />}{label}
                </span>
              ))}
              <span className="ppp-sep" />
              <span className="ppp-flabel">我在找</span>
              {NEED_FILTERS.map((n) => (
                <span key={n} className={`ppp-chip call ${needFilter === n ? "on" : ""}`} onClick={() => setNeedFilter(needFilter === n ? null : n)}>{n}</span>
              ))}
            </div>

            {loading ? (
              <div className="ppp-empty">加载中…</div>
            ) : items.length === 0 ? (
              <div className="ppp-empty">
                <div className="ppp-empty-emoji">🌱</div>
                还没有匹配的项目名片。
                <button className="ppp-newbtn ppp-empty-action" onClick={startCreate} style={{ marginTop: 16 }}>＋ 发布第一个项目</button>
              </div>
            ) : (
              <div className="ppp-grid">
                {items.map((p) => <Card p={p} key={p.id} onOpen={openDetail} onFav={applyFav} />)}
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
