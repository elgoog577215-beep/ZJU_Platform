import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import MediaViewer from "./legacy-media/Viewer";
import Gallery from "./legacy-media/Gallery";
import Videos from "./legacy-media/Videos";
import SortSelector from "./legacy-media/SortSelector";
import "./legacy-media/EmbeddedMedia.css";
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
    const Page = mode === "photos" ? Gallery : Videos;
    const controls = (
        <div className="flex flex-wrap justify-center gap-4">
            <SortSelector
                className="w-48"
                sort={mode}
                onSortChange={(value) => {
                    if (mode === value) return;
                    setSelected(null);
                    setItems([]);
                    setMode(value);
                    setCategory("");
                    setOffset(0);
                }}
                options={["photos", "videos"].map((value) => ({
                    value,
                    label: `${t(`aix.media.${value}`)}${mode === value ? ` · ${total}` : ""}`,
                }))}
            />
            {categories.length > 0 && (
                <SortSelector
                    className="w-48"
                    sort={category}
                    onSortChange={(value) => {
                        setSelected(null);
                        setItems([]);
                        setCategory(value);
                        setOffset(0);
                    }}
                    options={[
                        { value: "", label: t("aix.media.all") },
                        ...categories.map((value) => ({ value, label: value })),
                    ]}
                />
            )}
        </div>
    );
    return (
        <div className="legacy-media-surface">
            <Page
                items={items}
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
