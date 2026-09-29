import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
export function useEventOutcome(slug, live = false) {
    const [outcome, setOutcome] = useState(null);
    const [status, setStatus] = useState("loading");
    const [revision, setRevision] = useState(0);
    const reload = useCallback(() => setRevision((value) => value + 1), []);
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const load = async (initial) => {
            if (initial) setStatus("loading");
            try {
                const { data } = await api.get(
                    `/competitions/${encodeURIComponent(slug)}/outcome`,
                    {
                        params: { stagePhotoLimit: 120, promoVideoLimit: 24, workLimit: 100 },
                        signal: controller.signal,
                    }
                );
                if (active) {
                    setOutcome(data);
                    setStatus("ready");
                }
            } catch (error) {
                if (active && error.code !== "ERR_CANCELED") setStatus("error");
            }
        };
        load(true);
        const timer = live
            ? window.setInterval(() => {
                  if (!document.hidden) load(false);
              }, 30000)
            : null;
        return () => {
            active = false;
            controller.abort();
            if (timer) window.clearInterval(timer);
        };
    }, [slug, live, revision]);
    return { outcome, status, reload };
}
