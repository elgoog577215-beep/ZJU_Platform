import { useEffect, useRef } from "react";
import api from "../services/api";
import { getOrCreateSiteVisitorKey } from "../utils/visitorKey";

const IGNORED_PREFIXES = ["/admin"];

/**
 * Reports a page view to /api/site-metrics/visit so the admin trend chart
 * has real visit data. The backend dedupes per visitor + path every 10 minutes
 * and ignores admin traffic on its own, so this only needs to fire once per
 * visited path.
 */
export function useVisitTracking(pathname, { enabled = true } = {}) {
    const lastTrackedRef = useRef(null);

    useEffect(() => {
        if (!enabled || typeof window === "undefined") return;
        if (!pathname) return;
        if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
        if (lastTrackedRef.current === pathname) return;
        lastTrackedRef.current = pathname;

        const visitorKey = getOrCreateSiteVisitorKey();
        if (!visitorKey) return;

        api.post("/site-metrics/visit", { visitorKey, pagePath: pathname }).catch(() => {});
    }, [pathname, enabled]);
}

export default useVisitTracking;
