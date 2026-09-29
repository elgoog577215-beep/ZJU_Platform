export const HACKATHON_WORKSPACE_VIEWS = ["register", "projects", "media", "showcase"];

export const isHackathonWorkspaceView = (value) =>
    HACKATHON_WORKSPACE_VIEWS.includes(String(value || ""));

// Retired project-center links lead to the event results. Project IDs are not work IDs.
export const getLegacyProjectsUrl = (location = {}) => {
    const source = new URLSearchParams(location.search || "");
    const params = new URLSearchParams({ view: "results" });
    for (const key of ["event", "competition", "work"]) {
        if (source.get(key)) params.set(key, source.get(key));
    }
    if (!params.has("event") && !params.has("competition"))
        params.set("event", "zhekesong-current");
    return `/hackathon?${params}#showcase-works`;
};

export const getHackathonViewFromLocation = (location = {}, fallback = "register") => {
    const params = new URLSearchParams(location.search || "");
    const requestedView = params.get("view");
    const pathname = String(location.pathname || "");

    if (pathname.includes("/showcase") || pathname.includes("/works")) {
        return "showcase";
    }
    if (isHackathonWorkspaceView(requestedView)) return requestedView;
    return isHackathonWorkspaceView(fallback) ? fallback : "register";
};

export const getDefaultHackathonView = (template = {}, now = new Date()) => {
    const event = template.event || {};
    const start = Date.parse(event.startAt || "");
    const end = Date.parse(event.endAt || event.startAt || "");
    const nowTime = now instanceof Date ? now.getTime() : Date.parse(now);
    const hasNow = Number.isFinite(nowTime);

    if (Number.isFinite(end) && hasNow && nowTime > end) {
        return template.navigation?.resultsVisible === false ? "projects" : "showcase";
    }
    if (event.registrationOpen || (Number.isFinite(start) && hasNow && nowTime < start)) {
        return "register";
    }
    return "projects";
};

export const getHackathonMediaView = (search = "", fallback = "live") => {
    const value = new URLSearchParams(search || "").get("mediaView");
    return value === "featured" || value === "live" ? value : fallback;
};

export default getHackathonViewFromLocation;

export const EVENT_VIEWS = ["intro", "challenges", "media", "results"];
export const getEventUrl = (eventKey, view = "intro") =>
    `/hackathon?${new URLSearchParams({ event: eventKey, view: view === "register" ? "intro" : view })}`;

export const getEventView = (location = {}) => {
    const view = new URLSearchParams(location.search || "").get("view");
    if (/\/(showcase|works)$/.test(location.pathname || "") || view === "showcase")
        return "results";
    if (view === "register") return "register";
    return EVENT_VIEWS.includes(view) ? view : "intro";
};

// Old work shares predate the event picker; their implicit edition is always the first.
export const getLegacyWorksUrl = (location = {}) => {
    const params = new URLSearchParams(location.search || "");
    const work = params.get("work") || params.get("id");
    params.delete("id");
    params.set("view", "results");
    if (!params.has("event") && !params.has("competition"))
        params.set("event", "zhekesong-current");
    if (work) params.set("work", work);
    return `/hackathon?${params}#showcase-works`;
};
