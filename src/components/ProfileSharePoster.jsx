import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Building2, Copy, Download, QrCode, Share2, UserRound, X } from "lucide-react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const initials = (value) => {
    const text = String(value || "拓浙")
        .replace(/\s+/g, "")
        .trim();
    return text.slice(0, 2).toUpperCase() || "拓浙";
};

const safeFilePart = (value) =>
    String(value || "profile")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .slice(0, 40) || "profile";

const compactUrl = (value) => {
    try {
        const parsed = new URL(value);
        return `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
    } catch {
        return value || "";
    }
};

const resolveAssetUrl = (value) => {
    if (!value) return "";
    try {
        return new URL(value, window.location.origin).toString();
    } catch {
        return value;
    }
};

const clampList = (items, limit) =>
    Array.isArray(items)
        ? items
              .map((item) => String(item || "").trim())
              .filter(Boolean)
              .slice(0, limit)
        : [];

const copyTextToClipboard = async (value) => {
    const text = String(value || "");
    if (!text) throw new Error("empty-copy-value");

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Some embedded browsers reject Clipboard API writes despite a user gesture.
        }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) throw new Error("fallback-copy-failed");
};

const ProfileSharePoster = ({
    profile,
    profileCard,
    displayName,
    metaLabel,
    description,
    shareUrl,
    tags = [],
    onClose,
}) => {
    const { t } = useTranslation();
    const posterRef = useRef(null);
    const manualCopyRef = useRef(null);
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [busy, setBusy] = useState("");
    const [manualCopyOpen, setManualCopyOpen] = useState(false);

    const isPerson = profile?.type === "person";
    const name = displayName || profile?.display_name || t("profiles.types.subject");
    const avatarUrl = resolveAssetUrl(profile?.logo_url || profile?.avatar_url || "");
    const coverUrl = resolveAssetUrl(profile?.cover_url || "");
    const statusLabel = profileCard?.status
        ? t(`user_profile.center.profile_status.${profileCard.status}`, {
              defaultValue: profileCard.status,
          })
        : "";
    const slogan = String(profileCard?.slogan || "").trim();
    const intro = slogan || description || t("profile_share_poster.default_intro");
    const fileName = `tuotu-profile-${safeFilePart(name)}.png`;
    const shareTitle = t("profile_share_poster.share_title", { name });
    const visibleTags = useMemo(() => {
        const merged = [
            statusLabel,
            ...clampList(tags, 5),
            metaLabel,
            profile?.verified ? t("profiles.page.verified") : "",
        ];
        const seen = new Set();
        return merged
            .filter((item) => {
                const key = String(item || "")
                    .trim()
                    .toLowerCase();
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 5);
    }, [metaLabel, profile?.verified, statusLabel, tags, t]);
    const Icon = isPerson ? UserRound : Building2;

    useEffect(() => {
        if (!shareUrl) return undefined;
        let alive = true;
        setQrDataUrl("");
        QRCode.toDataURL(shareUrl, {
            width: 196,
            margin: 1,
            color: { dark: "#17231f", light: "#fffdf8" },
        })
            .then((url) => {
                if (alive) setQrDataUrl(url);
            })
            .catch(() => {
                if (alive) toast.error(t("profile_share_poster.qr_failed"));
            });
        return () => {
            alive = false;
        };
    }, [shareUrl, t]);

    useEffect(() => {
        if (!manualCopyOpen) return undefined;
        const timer = window.setTimeout(() => {
            manualCopyRef.current?.focus();
            manualCopyRef.current?.select();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [manualCopyOpen]);

    const exportPoster = async () => {
        if (!posterRef.current) throw new Error("poster-not-ready");
        if (document.fonts?.ready) await document.fonts.ready;
        return toPng(posterRef.current, {
            backgroundColor: "#fffdf8",
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
            toast.success(t("profile_share_poster.download_success"));
        } catch {
            toast.error(t("profile_share_poster.download_failed"));
        } finally {
            setBusy("");
        }
    };

    const handleCopy = async () => {
        try {
            await copyTextToClipboard(shareUrl);
            setManualCopyOpen(false);
            toast.success(t("profile_share_poster.copy_success"));
        } catch {
            setManualCopyOpen(true);
            toast.error(t("profile_share_poster.copy_failed_manual"));
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
                title: shareTitle,
                text: t(
                    isPerson
                        ? "profile_share_poster.share_text_person"
                        : "profile_share_poster.share_text_org"
                ),
                url: shareUrl,
            };
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ ...shareData, files: [file] });
            } else {
                await navigator.share(shareData);
            }
        } catch (error) {
            if (error?.name !== "AbortError") toast.error(t("profile_share_poster.share_failed"));
        } finally {
            setBusy("");
        }
    };

    if (!profile || !shareUrl || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[160] flex min-h-dvh items-center justify-center bg-slate-950/68 px-4 py-5 backdrop-blur-md"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={t("profile_share_poster.dialog_title")}
        >
            <div
                className="relative grid max-h-[94vh] w-full max-w-[920px] gap-5 overflow-auto rounded-[8px] border border-white/18 bg-[#fffdf8] p-4 text-slate-950 shadow-[0_34px_90px_rgba(15,23,42,0.34)] md:grid-cols-[minmax(0,1fr)_280px] md:p-6"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    data-testid="profile-share-close-button"
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:text-slate-950"
                    aria-label={t("common.close", "关闭")}
                >
                    <X size={18} />
                </button>

                <div className="flex min-w-0 justify-center pt-8 md:pt-3">
                    <article
                        ref={posterRef}
                        className="relative flex h-[430px] w-[294px] flex-col overflow-hidden rounded-[8px] border border-[#d8d2c3] bg-[#fffdf8] shadow-[0_18px_54px_rgba(39,58,49,0.2)] sm:h-[540px] sm:w-[360px]"
                    >
                        <div className="relative h-24 shrink-0 overflow-hidden bg-[#dfeee8] sm:h-32">
                            {coverUrl ? (
                                <img
                                    src={coverUrl}
                                    alt=""
                                    crossOrigin="anonymous"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full bg-[linear-gradient(135deg,#dceee8_0%,#fffdf8_48%,#ffe4d0_100%)]" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(255,253,248,0.96))]" />
                            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-[6px] border border-white/70 bg-white/88 px-2.5 py-1.5 shadow-sm">
                                <img
                                    src="/newlogo.png"
                                    alt=""
                                    crossOrigin="anonymous"
                                    className="h-5 w-5 object-contain sm:h-6 sm:w-6"
                                />
                                <div className="flex flex-col leading-none">
                                    <strong className="text-[9px] font-black text-[#17231f] sm:text-[10px]">
                                        {t("profile_share_poster.site_name")}
                                    </strong>
                                    <span className="mt-1 text-[7px] font-black uppercase tracking-[0.08em] text-[#c85f3d] sm:text-[8px]">
                                        {t("profile_share_poster.site_subtitle")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="relative -mt-8 flex flex-1 flex-col px-5 pb-5 sm:-mt-10 sm:px-6 sm:pb-6">
                            <div className="flex items-end justify-between gap-4">
                                <div className="h-[68px] w-[68px] overflow-hidden rounded-[8px] border-[3px] border-[#fffdf8] bg-[#17231f] shadow-[0_12px_26px_rgba(23,35,31,0.22)] sm:h-[82px] sm:w-[82px]">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt=""
                                            crossOrigin="anonymous"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center text-xl font-black text-white">
                                            {initials(name)}
                                        </div>
                                    )}
                                </div>
                                <span className="mb-1 inline-flex items-center gap-1.5 rounded-[6px] border border-[#d8d2c3] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#3d4f47] sm:mb-2 sm:text-[11px]">
                                    <Icon size={12} />
                                    {metaLabel}
                                </span>
                            </div>

                            <div className="mt-3 min-w-0 sm:mt-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="line-clamp-2 text-[24px] font-black leading-[1.06] tracking-normal text-[#17231f] sm:text-[31px]">
                                        {name}
                                    </h2>
                                    {profile?.verified ? (
                                        <BadgeCheck className="shrink-0 text-[#0f8f6d]" size={18} />
                                    ) : null}
                                </div>
                                <p className="mt-2 font-mono text-[11px] font-black text-[#728078] sm:text-[12px]">
                                    @{profile?.handle}
                                </p>
                                <p className="mt-3 line-clamp-3 text-[12px] font-bold leading-5 text-[#4d5f57] sm:mt-4 sm:text-[13px] sm:leading-6">
                                    {intro}
                                </p>
                            </div>

                            {visibleTags.length > 0 ? (
                                <div className="mt-3 flex max-h-[48px] flex-wrap gap-2 overflow-hidden sm:mt-4 sm:max-h-[58px]">
                                    {visibleTags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex max-w-[118px] items-center rounded-[6px] border border-[#cfe1d9] bg-[#edf8f3] px-2.5 py-1 text-[9px] font-black text-[#17634e] sm:max-w-[142px] sm:text-[10px]"
                                        >
                                            <span className="truncate">{tag}</span>
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            <div className="mt-auto grid grid-cols-[1fr_72px] items-end gap-3 border-t border-dashed border-[#cfc7b8] pt-3 sm:grid-cols-[1fr_82px] sm:gap-4 sm:pt-4">
                                <div className="min-w-0">
                                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-[6px] bg-[#17231f] px-2 py-1 text-[9px] font-black text-[#fffdf8] sm:text-[10px]">
                                        <QrCode size={12} />
                                        {t("profile_share_poster.scan_badge")}
                                    </div>
                                    <strong className="block text-[14px] font-black leading-tight text-[#17231f] sm:text-[16px]">
                                        {t(
                                            isPerson
                                                ? "profile_share_poster.scan_title_person"
                                                : "profile_share_poster.scan_title_org"
                                        )}
                                    </strong>
                                    <span className="mt-1 block truncate text-[10px] font-bold text-[#7c897f]">
                                        {compactUrl(shareUrl)}
                                    </span>
                                </div>
                                <div className="h-[72px] w-[72px] rounded-[6px] border border-[#d8d2c3] bg-white p-1.5 shadow-sm sm:h-[82px] sm:w-[82px]">
                                    {qrDataUrl ? (
                                        <img
                                            src={qrDataUrl}
                                            alt={t("profile_share_poster.qr_alt")}
                                            className="h-full w-full"
                                        />
                                    ) : (
                                        <span className="block h-full w-full rounded-[4px] bg-slate-100" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </article>
                </div>

                <aside className="flex min-w-0 flex-col px-1 pb-1 pt-0 md:pt-8">
                    <span className="order-2 mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#c85f3d] md:order-1 md:mt-0">
                        {t("profile_share_poster.preview_label")}
                    </span>
                    <h3 className="order-3 mt-2 text-xl font-black leading-tight text-[#17231f] md:order-2 md:text-2xl">
                        {t("profile_share_poster.dialog_title")}
                    </h3>
                    <p className="order-4 mt-2 text-xs font-semibold leading-5 text-[#65756d] md:order-3 md:mt-3 md:text-sm md:leading-6">
                        {t(
                            isPerson
                                ? "profile_share_poster.dialog_desc_person"
                                : "profile_share_poster.dialog_desc_org"
                        )}
                    </p>
                    <div className="order-1 grid gap-2 md:order-4 md:mt-5">
                        <button
                            type="button"
                            data-testid="profile-share-download-button"
                            disabled={Boolean(busy) || !qrDataUrl}
                            onClick={handleDownload}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-[#17231f] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            <Download size={16} />
                            {busy === "download"
                                ? t("profile_share_poster.exporting")
                                : t("profile_share_poster.download_png")}
                        </button>
                        <button
                            type="button"
                            data-testid="profile-share-native-button"
                            disabled={Boolean(busy) || !qrDataUrl}
                            onClick={handleNativeShare}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-[#d8d2c3] bg-white px-4 text-sm font-black text-[#17231f] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            <Share2 size={16} />
                            {busy === "share"
                                ? t("profile_share_poster.exporting")
                                : t("profile_share_poster.native_share")}
                        </button>
                        <button
                            type="button"
                            data-testid="profile-share-copy-button"
                            onClick={handleCopy}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-[#d8d2c3] bg-white px-4 text-sm font-black text-[#17231f]"
                        >
                            <Copy size={16} />
                            {t("profile_share_poster.copy_link")}
                        </button>
                        {manualCopyOpen ? (
                            <label className="block rounded-[6px] border border-[#e4ded1] bg-[#f9f5eb] p-2">
                                <span className="sr-only">
                                    {t("profile_share_poster.manual_copy_label")}
                                </span>
                                <input
                                    ref={manualCopyRef}
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    onFocus={(event) => event.currentTarget.select()}
                                    aria-label={t("profile_share_poster.manual_copy_label")}
                                    data-testid="profile-share-manual-copy-input"
                                    className="h-9 w-full rounded-[5px] border border-[#d8d2c3] bg-white px-2 font-mono text-[11px] font-bold text-[#17231f] outline-none focus:border-[#17634e] focus:ring-2 focus:ring-[#17634e]/15"
                                />
                            </label>
                        ) : null}
                    </div>
                    <div className="order-5 mt-3 rounded-[6px] border border-[#e4ded1] bg-[#f9f5eb] px-3 py-2 text-[11px] font-bold leading-5 text-[#6f7c73] md:mt-5 md:py-3 md:text-xs">
                        {t("profile_share_poster.privacy_note")}
                    </div>
                </aside>
            </div>
        </div>,
        document.body
    );
};

export default ProfileSharePoster;
