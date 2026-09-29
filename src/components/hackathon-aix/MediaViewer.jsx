import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import BodyPortal from "../../shared/ui/BodyPortal";
import { useBackClose, useBodyScrollLock } from "../../hooks/useBackClose";
export default function MediaViewer({ item, video, onClose, onNext, onPrev }) {
    const { t } = useTranslation();
    const dialog = useRef(null);
    useBackClose(true, onClose);
    useBodyScrollLock(true);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);
    return (
        <BodyPortal>
            <dialog
                ref={dialog}
                className="hx-video-dialog"
                aria-label={item.title || t("aix.tabs.media")}
                onCancel={(event) => {
                    event.preventDefault();
                    onClose();
                }}
                onKeyDown={(event) => {
                    if (event.key === "ArrowRight" && onNext) onNext();
                    if (event.key === "ArrowLeft" && onPrev) onPrev();
                }}
            >
                <div className="hx-viewer-bar">
                    <span>{item.title}</span>
                    <button className="hx-icon" onClick={onClose} aria-label={t("aix.close")}>
                        <X />
                    </button>
                </div>
                {video ? (
                    <video
                        controls
                        autoPlay
                        playsInline
                        src={item.url}
                        poster={item.cover_url || undefined}
                    />
                ) : (
                    <img
                        className="hx-viewer-photo"
                        src={item.url}
                        alt={item.title || t("aix.media.photos")}
                    />
                )}
                {!video && (
                    <div className="hx-viewer-bar">
                        <button
                            className="hx-icon"
                            disabled={!onPrev}
                            onClick={onPrev}
                            aria-label={t("aix.media.previous")}
                        >
                            <ChevronLeft />
                        </button>
                        <a href={item.url} target="_blank" rel="noreferrer">
                            {t("aix.media.original")}
                            <ArrowUpRight size={15} />
                        </a>
                        <button
                            className="hx-icon"
                            disabled={!onNext}
                            onClick={onNext}
                            aria-label={t("aix.media.next")}
                        >
                            <ChevronRight />
                        </button>
                    </div>
                )}
            </dialog>
        </BodyPortal>
    );
}
