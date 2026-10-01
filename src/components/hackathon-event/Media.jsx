import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Play, Upload } from "lucide-react";
import api from "../../services/api";
import Empty from "./Empty";
import MediaViewer from "./MediaViewer";
import EventMediaGallery from "./EventMediaGallery";
import CompetitionOutcomeUploadModal from "../CompetitionOutcomeUploadModal";
export default function Media({ template, live }) {
    const { t } = useTranslation();
    const [params, setParams] = useSearchParams();
    const [mode, setMode] = useState(() => (params.has("video") ? "videos" : "photos"));
    const [category, setCategory] = useState("");
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [categories, setCategories] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [status, setStatus] = useState("loading");
    const [revision, setRevision] = useState(0);
    const photoId = params.get("photo");
    const selected =
        mode === "photos"
            ? items.find(
                  (item) =>
                      String(item.source_id || item.id) === photoId || String(item.id) === photoId
              )
            : items.find((item) => String(item.id) === params.get("video"));
    const setSelected = (item) => {
        const next = new URLSearchParams(params);
        next.delete("photo");
        next.delete("video");
        if (item)
            next.set(
                mode === "photos" ? "photo" : "video",
                String(mode === "photos" ? item.source_id || item.id : item.id)
            );
        setParams(next, { replace: true });
    };
    const [upload, setUpload] = useState(false);
    const reload = () => {
        setOffset(0);
        setRevision((value) => value + 1);
    };
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const load = async (background = false) => {
            if (!background) setStatus("loading");
            try {
                const { data } = await api.get(
                    `/competitions/${encodeURIComponent(template.results.competitionSlug)}/media`,
                    {
                        params: {
                            type: mode,
                            category,
                            offset,
                            limit: 36,
                            sort: ["zhekesong-current", "getui-beauty-2026"].includes(
                                template.event.key
                            )
                                ? "curated"
                                : "latest",
                        },
                        signal: controller.signal,
                    }
                );
                if (active) {
                    setItems((current) =>
                        offset
                            ? [
                                  ...new Map(
                                      [...current, ...data.items].map((item) => [item.id, item])
                                  ).values(),
                              ]
                            : data.items
                    );
                    setTotal(data.total);
                    setCategories(data.categories);
                    setHasMore(data.hasMore);
                    setStatus("ready");
                }
            } catch (error) {
                if (active && error.code !== "ERR_CANCELED") setStatus("error");
            }
        };
        load();
        const timer =
            live && offset === 0
                ? window.setInterval(() => {
                      if (!document.hidden) load(true);
                  }, 30000)
                : null;
        return () => {
            active = false;
            controller.abort();
            if (timer) window.clearInterval(timer);
        };
    }, [
        template.results.competitionSlug,
        mode,
        category,
        offset,
        revision,
        live,
        template.event.key,
    ]);
    const index = selected ? items.findIndex((item) => item.id === selected.id) : -1;
    return (
        <div className="hx-content hx-media-page event-original-media">
            <div className="event-gallery-heading">
                <div>
                    <p className="hx-overline">
                        {t(live && offset === 0 ? "aix.media.live" : "aix.media.kicker")}
                    </p>
                    <h1>{t("aix.tabs.media")}</h1>
                    <p>
                        {t(
                            template.event.key === "zhekesong-current"
                                ? "firstEdition.mediaIntro"
                                : template.event.key === "getui-beauty-2026"
                                  ? "getuiBeauty.mediaIntro"
                                  : "aix.media.description"
                        )}
                    </p>
                </div>
                <button className="event-gallery-upload" onClick={() => setUpload(true)}>
                    <Upload size={17} />
                    {t("aix.media.upload")}
                </button>
            </div>
            <div className="event-gallery-toolbar">
                <div className="event-gallery-modes">
                    {["photos", "videos"].map((value) => (
                        <button
                            key={value}
                            aria-pressed={mode === value}
                            onClick={() => {
                                if (mode === value) return;
                                setSelected(null);
                                setItems([]);
                                setMode(value);
                                setCategory("");
                                setOffset(0);
                            }}
                        >
                            {value === "photos" ? <ImageIcon size={17} /> : <Play size={17} />}
                            {t(`aix.media.${value}`)}
                            {mode === value && <span>{total}</span>}
                        </button>
                    ))}
                </div>
                {categories.length > 0 && (
                    <select
                        aria-label={t("aix.media.category")}
                        value={category}
                        onChange={(event) => {
                            setSelected(null);
                            setItems([]);
                            setCategory(event.target.value);
                            setOffset(0);
                        }}
                    >
                        <option value="">{t("aix.media.all")}</option>
                        {categories.map((item) => (
                            <option key={item}>{item}</option>
                        ))}
                    </select>
                )}
                <span className="event-gallery-order">
                    {t(
                        ["zhekesong-current", "getui-beauty-2026"].includes(template.event.key)
                            ? "firstEdition.curated"
                            : "aix.media.latest"
                    )}
                </span>
            </div>
            {items.length > 0 && (
                <EventMediaGallery items={items} video={mode === "videos"} onOpen={setSelected} />
            )}
            {status === "loading" ? (
                <p className="hx-loading" role="status">
                    {t("aix.loading")}
                </p>
            ) : status === "error" ? (
                <div className="hx-empty" role="alert">
                    <p>{t("aix.loadFailed")}</p>
                    <button
                        className="hx-outline"
                        onClick={() => setRevision((value) => value + 1)}
                    >
                        {t("aix.retry")}
                    </button>
                </div>
            ) : items.length === 0 ? (
                <Empty
                    icon={ImageIcon}
                    title={t("aix.media.empty")}
                    description={t("aix.media.emptyDescription")}
                />
            ) : (
                hasMore && (
                    <button
                        className="hx-outline hx-load-more"
                        onClick={() => setOffset((value) => value + 36)}
                    >
                        {t("aix.media.more")}
                    </button>
                )
            )}
            {selected && (
                <MediaViewer
                    item={selected}
                    rounded
                    video={mode === "videos"}
                    onClose={() => setSelected(null)}
                    onPrev={index > 0 ? () => setSelected(items[index - 1]) : undefined}
                    onNext={
                        index < items.length - 1 ? () => setSelected(items[index + 1]) : undefined
                    }
                />
            )}
            <CompetitionOutcomeUploadModal
                open={upload}
                onClose={() => setUpload(false)}
                onSubmitted={() => {
                    setUpload(false);
                    reload();
                }}
                initialType={mode === "photos" ? "stage_photo" : "promo_video"}
                competitionSlug={template.results.competitionSlug}
                competitionTitle={template.event.title}
            />
        </div>
    );
}
