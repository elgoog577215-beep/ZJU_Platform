export const HACKATHON_WORKSPACE_VIEWS = ["register", "projects", "media", "showcase"];

export const isHackathonWorkspaceView = (value) =>
    HACKATHON_WORKSPACE_VIEWS.includes(String(value || ""));

// Retire the embedded project route without losing project actions or share context.
export const getHackathonProjectUrl = (competitionSlug, location = {}) => {
    const params = new URLSearchParams(location.search || "");
    ["event", "view", "mediaView", "photo"].forEach((key) => params.delete(key));
    if (competitionSlug) params.set("competition", competitionSlug);
    else params.delete("competition");
    const search = params.toString();
    return `/projects${search ? `?${search}` : ""}${location.hash || ""}`;
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
