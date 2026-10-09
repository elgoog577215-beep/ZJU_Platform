import eventRoutes from "../../shared/hackathonRoutes.json" with { type: "json" };

export const EVENT_VIEWS = ["intro", "challenges", "media", "results"];
export const getEventViews = (eventKey) =>
    eventKey === "zhekesong-ai-x-2026" ? ["intro", "challenges"] : EVENT_VIEWS;

const readEventPath = (location = {}) => {
    const pathname = String(location.pathname || "").replace(/\/+$/, "");
    if (!pathname.startsWith("/hackathon/")) return null;
    const segments = pathname.slice("/hackathon/".length).split("/");
    try {
        const slug = decodeURIComponent(segments[0]);
        const eventKey = eventRoutes.find((route) => route.path === slug)?.eventKey || slug;
        const view = segments[1] || "intro";
        return {
            eventKey,
            view,
            invalid: segments.length > 2 || ![...EVENT_VIEWS, "lottery"].includes(view),
        };
    } catch {
        return { invalid: true };
    }
};

export const getEventKey = (location = {}) => readEventPath(location)?.eventKey;
export const getEventView = (location = {}) => readEventPath(location)?.view || "intro";

export const getEventUrl = (eventKey, view = "intro", { search = "", hash = "" } = {}) => {
    const edition =
        eventRoutes.find(
            (route) => route.eventKey === eventKey || route.competitionSlug === eventKey
        )?.path || eventKey;
    const pathname = `/hackathon/${encodeURIComponent(edition)}${view === "intro" ? "" : `/${view}`}`;
    const params = new URLSearchParams(search);
    return `${pathname}${params.size ? `?${params}` : ""}${hash}`;
};

export const resolveEventLocation = (location = {}, schedule = {}) => {
    const path = readEventPath(location);
    const params = new URLSearchParams(location.search || "");
    // Routing belongs to the path. Former query routes and page aliases are retired.
    if (path?.invalid || ["event", "competition", "view"].some((key) => params.has(key)))
        return null;
    const pathname = String(location.pathname || "").replace(/\/+$/, "");
    if (!path && pathname !== "/hackathon") return null;
    const events = schedule.events || [];
    const template = path
        ? events.find(
              (item) =>
                  item.event.key === path.eventKey || item.results.competitionSlug === path.eventKey
          )
        : events.find((item) => item.event.key === schedule.activeEventKey) || events[0];
    if (!template) return null;
    const requestedView = getEventView(location);
    const hidden =
        template.event.key === "zhekesong-ai-x-2026" &&
        ["media", "results"].includes(requestedView);
    const view = hidden ? "intro" : requestedView;
    return { template, view, url: getEventUrl(template.event.key, view, hidden ? {} : location) };
};
