import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import MediaViewer from "./legacy-media/Viewer";
import Gallery from "./legacy-media/Gallery";
import CategoryRail from "./legacy-media/CategoryRail";
import { useSettings } from "../../context/SettingsContext";
import "./legacy-media/EmbeddedMedia.css";
import CompetitionOutcomeUploadModal from "../CompetitionOutcomeUploadModal";
export default function Media({ template, live }) {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const [params, setParams] = useSearchParams();
    const [category, setCategory] = useState("");
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [status, setStatus] = useState("loading");
    const [revision, setRevision] = useState(0);
    const photoId = params.get("photo");
    const selected = items.find(
        (item) => String(item.source_id || item.id) === photoId || String(item.id) === photoId
    );
    const setSelected = (item) => {
        const next = new URLSearchParams(params);
        next.delete("photo");
        next.delete("video");
        if (item) next.set("photo", String(item.source_id || item.id));
        setParams(next, { replace: true });
    };
    useEffect(() => {
        if (!params.has("video")) return;
        const next = new URLSearchParams(params);
        next.delete("video");
        setParams(next, { replace: true });
    }, [params, setParams]);
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
                            type: "photos",
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
    }, [template.results.competitionSlug, category, offset, revision, live, template.event.key]);
    const sceneOrder =
        template.event.key === "zhekesong-current"
            ? ["致辞与分享", "开发现场", "交流现场", "颁奖与合影"]
            : [];
    const scenes = [
        ...new Set([...sceneOrder.filter((name) => categories.includes(name)), ...categories]),
    ];
    const orderedItems = [...scenes, ""].flatMap((scene) =>
        items.filter((item) => (item.category_name || "") === scene)
    );
    const index = selected ? orderedItems.findIndex((item) => item.id === selected.id) : -1;
    const upcoming = Date.now() < new Date(template.event.startAt).getTime();
    const presentation = {
        title: t("aix.media.photoTitle"),
        emptyTitle: t(upcoming ? "aix.media.emptyUpcoming" : "aix.media.emptyPhotos"),
        emptyDescription: upcoming
            ? t("aix.media.emptyDescription")
            : t("aix.media.emptyArchiveDescription", {
                  type: t("aix.media.photos").toLowerCase(),
              }),
    };
    const controls =
        scenes.length > 1 ? (
            <CategoryRail
                categories={scenes.map((name) => ({ id: name, name }))}
                activeCategoryId={category}
                allLabel={t("aix.media.all")}
                label={t("aix.media.scenes")}
                isDayMode={uiMode === "day"}
                onChange={(value) => {
                    if (category === value) return;
                    setSelected(null);
                    setItems([]);
                    setCategory(value);
                    setOffset(0);
                }}
            />
        ) : null;
    return (
        <div className="legacy-media-surface">
            <Gallery
                {...presentation}
                items={orderedItems}
                status={status}
                hasMore={hasMore}
                onMore={() => setOffset((value) => value + 36)}
                onOpen={setSelected}
                onUpload={() => setUpload(true)}
                onRetry={() => setRevision((value) => value + 1)}
                controls={controls}
            />
            {selected && (
                <MediaViewer
                    item={selected}
                    onClose={() => setSelected(null)}
                    onPrev={index > 0 ? () => setSelected(orderedItems[index - 1]) : undefined}
                    onNext={
                        index < orderedItems.length - 1
                            ? () => setSelected(orderedItems[index + 1])
                            : undefined
                    }
                />
            )}
            <CompetitionOutcomeUploadModal
                open={upload}
                onClose={() => setUpload(false)}
                onSubmitted={reload}
                initialType="stage_photo"
                photoCategories={scenes}
                initialPhotoCategory={category}
                lockType
                competitionSlug={template.results.competitionSlug}
                competitionTitle={template.event.title}
            />
        </div>
    );
}
