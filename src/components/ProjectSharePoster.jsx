import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, Share2, X } from "lucide-react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const clampList = (items, limit) => (Array.isArray(items) ? items.filter(Boolean).slice(0, limit) : []);

const initials = (name) => (name ? String(name).trim().slice(0, 1) : "拓");

const formatCount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
};

const safeFilePart = (value) =>
  String(value || "project")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "project";

const buildProjectUrl = (projectId) => {
  const url = new URL("/projects", window.location.origin);
  url.searchParams.set("id", String(projectId));
  return url.toString();
};

const resolveAssetUrl = (value) => {
  if (!value) return "";
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
};

const ProjectSharePoster = ({ project, onClose, variant = "playful" }) => {
  const { t } = useTranslation();
  const posterRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(null);

  const projectUrl = useMemo(() => buildProjectUrl(project?.id), [project?.id]);
  const title = project?.title || t("project_share_poster.untitled", "未命名项目");
  const intro = project?.intro || t("project_share_poster.default_intro", "一个正在生长的校园项目");
  const ownerName = project?.owner_name || t("project_share_poster.unknown_owner", "项目发起人");
  const ownerAvatar = resolveAssetUrl(project?.owner_avatar);
  const coverUrl = resolveAssetUrl(project?.cover_url || project?.images?.[0] || "");
  const techTags = clampList(project?.tech_tags, 2);
  const needTags = clampList(project?.need_tags, 2);
  const progressLabel = t(`project_share_poster.progress.${project?.progress || "idea"}`, {
    defaultValue: t("project_share_poster.progress.idea", "构思中"),
  });
  const allTags = [
    ...needTags.map((value) => ({ value, tone: "need" })),
    ...techTags.map((value) => ({ value, tone: "tech" })),
  ].slice(0, 4);
  const fileName = `tuotu-project-${safeFilePart(title)}.png`;

  useEffect(() => {
    let alive = true;
    setQrDataUrl("");
    QRCode.toDataURL(projectUrl, {
      width: 184,
      margin: 1,
      color: { dark: "#22161a", light: "#fff8f1" },
    })
      .then((url) => {
        if (alive) setQrDataUrl(url);
      })
      .catch(() => {
        if (alive) toast.error(t("project_share_poster.qr_failed", "二维码生成失败"));
      });
    return () => {
      alive = false;
    };
  }, [projectUrl, t]);

  const exportPoster = async () => {
    if (!posterRef.current) throw new Error("poster-not-ready");
    if (document.fonts?.ready) await document.fonts.ready;
    return toPng(posterRef.current, {
      backgroundColor: "#fff8f1",
      cacheBust: true,
      pixelRatio: 3,
    });
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const dataUrl = await exportPoster();
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      toast.success(t("project_share_poster.download_success", "海报已生成"));
    } catch (error) {
      toast.error(t("project_share_poster.download_failed", "海报生成失败，请检查图片是否可访问"));
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      toast.success(t("project_share_poster.copy_success", "项目链接已复制"));
    } catch {
      toast.error(t("common.copy_failed", "复制失败"));
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    setBusy("share");
    try {
      const dataUrl = await exportPoster();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const shareData = {
        title,
        text: t("project_share_poster.share_text", "看看这个项目广场里的校园项目"),
        url: projectUrl,
      };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
      } else {
        await navigator.share(shareData);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        toast.error(t("project_share_poster.share_failed", "分享失败，可先复制链接"));
      }
    } finally {
      setBusy(null);
    }
  };

  if (!project || typeof document === "undefined") return null;

  return createPortal(
    <div className="ppp-root ppp-poster-scrim" data-variant={variant} onClick={onClose}>
      <div className="ppp-poster-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="ppp-poster-close"
          type="button"
          onClick={onClose}
          aria-label={t("common.close", "关闭")}
        >
          <X size={18} />
        </button>

        <div className="ppp-poster-preview">
          <div className="ppp-poster-card" ref={posterRef}>
            <div className="ppp-poster-cover">
              {coverUrl ? (
                <img className="ppp-poster-cover-img" src={coverUrl} alt="" crossOrigin="anonymous" />
              ) : (
                <div className="ppp-poster-cover-fallback">
                  <span>{initials(title)}</span>
                </div>
              )}
              <div className="ppp-poster-topbar">
                <div className="ppp-poster-site">
                  <img src="/newlogo.png" alt="" crossOrigin="anonymous" />
                  <div>
                    <strong>{t("project_share_poster.site_name", "拓浙AI生态")}</strong>
                    <span>{t("project_share_poster.site_subtitle", "项目广场")}</span>
                  </div>
                </div>
                <span className="ppp-poster-badge">{progressLabel}</span>
              </div>
            </div>

            <div className="ppp-poster-main">
              <section className="ppp-poster-title-block">
                <div className="ppp-poster-kicker">{t("project_share_poster.kicker", "校园项目分享")}</div>
                <h2 className="ppp-poster-title">{title}</h2>
                <p className="ppp-poster-intro">{intro}</p>
              </section>

              <div className="ppp-poster-meta-row">
                <div className="ppp-poster-owner">
                  <div className="ppp-poster-avatar">
                    {ownerAvatar ? <img src={ownerAvatar} alt="" crossOrigin="anonymous" /> : <span>{initials(ownerName)}</span>}
                  </div>
                  <div className="ppp-poster-owner-text">
                    <span>{t("project_share_poster.owner_label", "发起人")}</span>
                    <strong>{ownerName}</strong>
                  </div>
                </div>

                <div className="ppp-poster-stats">
                  <div><strong>{formatCount(project?.likes)}</strong><span>{t("project_share_poster.likes_label", "收藏")}</span></div>
                  <div><strong>{formatCount(project?.views)}</strong><span>{t("project_share_poster.views_label", "浏览")}</span></div>
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="ppp-poster-tags">
                  {allTags.map((tag) => (
                    <span className={`ppp-poster-tag ${tag.tone}`} key={`${tag.tone}-${tag.value}`}>{tag.value}</span>
                  ))}
                </div>
              )}

              <div className="ppp-poster-footer">
                <div className="ppp-poster-footer-brand">
                  <img src="/newlogo.png" alt="" crossOrigin="anonymous" />
                </div>
                <div className="ppp-poster-cta">
                  <em>{t("project_share_poster.brand", "拓浙AI生态：项目广场")}</em>
                  <strong>{t("project_share_poster.scan_title", "扫码查看项目详情")}</strong>
                  <span>{t("project_share_poster.scan_subtitle", "发现更多校园项目与实践伙伴")}</span>
                </div>
                <div className="ppp-poster-qr">
                  {qrDataUrl ? <img src={qrDataUrl} alt={t("project_share_poster.qr_alt", "项目详情二维码")} /> : <span />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="ppp-poster-side">
          <span className="ppp-poster-side-kicker">{t("project_share_poster.preview_label", "海报预览")}</span>
          <h3>{t("project_share_poster.dialog_title", "项目分享海报")}</h3>
          <p>{t("project_share_poster.dialog_desc", "先确认画面，再下载 PNG 或复制项目链接。二维码会打开当前项目详情。")}</p>
          <div className="ppp-poster-actions">
            <button className="ppp-cbtn primary" type="button" disabled={Boolean(busy) || !qrDataUrl} onClick={handleDownload}>
              <Download size={16} />
              {busy === "download" ? t("project_share_poster.exporting", "生成中...") : t("project_share_poster.download_png", "下载 PNG")}
            </button>
            <button className="ppp-cbtn ghost" type="button" disabled={Boolean(busy) || !qrDataUrl} onClick={handleNativeShare}>
              <Share2 size={16} />
              {busy === "share" ? t("project_share_poster.exporting", "生成中...") : t("project_share_poster.native_share", "系统分享")}
            </button>
            <button className="ppp-cbtn ghost" type="button" onClick={handleCopy}>
              <Copy size={16} />
              {t("project_share_poster.copy_link", "复制链接")}
            </button>
          </div>
          <div className="ppp-poster-note">{t("project_share_poster.privacy_note", "海报不会显示联系方式，只展示公开项目信息。")}</div>
        </aside>
      </div>
    </div>,
    document.body
  );
};

export default ProjectSharePoster;
