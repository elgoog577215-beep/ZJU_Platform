import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { getLotteryUrl } from "../../utils/lotteryRoute";

export default function LotteryShare({ campaign }) {
    const { t } = useTranslation();
    const linkRef = useRef(null);
    const [qr, setQr] = useState(null);
    const [copyStatus, setCopyStatus] = useState("");
    const shareUrl = campaign?.id
        ? new URL(getLotteryUrl(campaign), window.location.origin).href
        : "";

    useEffect(() => {
        if (!shareUrl) return;
        let active = true;
        QRCode.toDataURL(shareUrl, {
            width: 1024,
            margin: 4,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#ffffff" },
        })
            .then((image) => {
                if (active) setQr({ url: shareUrl, image });
            })
            .catch(() => {
                if (active) setQr({ url: shareUrl, error: true });
            });
        return () => {
            active = false;
        };
    }, [shareUrl]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopyStatus("link_copied");
        } catch {
            linkRef.current?.focus();
            linkRef.current?.select();
            let copied = false;
            try {
                copied = document.execCommand("copy");
            } catch {
                // Leave the selected link available for manual copying.
            }
            setCopyStatus(copied ? "link_copied" : "copy_manually");
        }
    };
    const currentQr = qr?.url === shareUrl ? qr : null;

    return (
        <section className="lottery-panel lottery-share" aria-label={t("lottery.share_title")}>
            <h2>{t("lottery.share_title")}</h2>
            {!shareUrl ? (
                <p className="lottery-muted">{t("lottery.share_save_first")}</p>
            ) : (
                <>
                    <p className="lottery-muted">{t("lottery.share_hint")}</p>
                    {campaign.status === "draft" && (
                        <p className="lottery-alert">{t("lottery.share_draft_notice")}</p>
                    )}
                    <div className="lottery-share-grid">
                        <div>
                            <label>
                                {t("lottery.campaign_link")}
                                <input
                                    ref={linkRef}
                                    type="url"
                                    readOnly
                                    value={shareUrl}
                                    onFocus={(e) => e.target.select()}
                                />
                            </label>
                            <div className="lottery-actions">
                                <button type="button" onClick={copyLink}>
                                    {t("lottery.copy_link")}
                                </button>
                                {currentQr?.image && (
                                    <a
                                        className="lottery-download"
                                        href={currentQr.image}
                                        download={`lottery-${campaign.id}-qr.png`}
                                    >
                                        {t("lottery.download_qr")}
                                    </a>
                                )}
                            </div>
                            {copyStatus && <p role="status">{t(`lottery.${copyStatus}`)}</p>}
                            <p className="lottery-muted">{t("lottery.share_wechat_hint")}</p>
                        </div>
                        <div className="lottery-qr-preview">
                            {currentQr?.image ? (
                                <img src={currentQr.image} alt={t("lottery.campaign_qr")} />
                            ) : (
                                <p role={currentQr?.error ? "alert" : "status"}>
                                    {t(
                                        currentQr?.error
                                            ? "lottery.qr_failed"
                                            : "lottery.qr_loading"
                                    )}
                                </p>
                            )}
                            <p className="lottery-muted">{t("lottery.qr_caption")}</p>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
