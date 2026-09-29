export const AIX_EVENT_KEY = "zhekesong-ai-x-2026";
export const AIX_VIEWS = ["intro", "challenges", "media", "results"];
export const resolveAiXView = (view) =>
    AIX_VIEWS.includes(view) ? view : view === "showcase" ? "results" : "intro";
export const stageState = (stage, now = Date.now()) => {
    if (now < Date.parse(stage.opensAt)) return "upcoming";
    if (now >= Date.parse(stage.closesAt)) return "ended";
    return "live";
};
export const currentStage = (stages, now = Date.now()) =>
    stages.find((stage) => stageState(stage, now) === "live") ||
    stages.find((stage) => stageState(stage, now) === "upcoming") ||
    stages.at(-1);
export const registrationOpen = (template, now = Date.now()) =>
    template.navigation.registrationVisible &&
    template.event.registrationOpen &&
    (!template.event.program?.registrationClosesAt ||
        now < Date.parse(template.event.program.registrationClosesAt));
export const safeWebUrl = (value) => {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
};

// Editor date/time values represent the event’s Asia/Shanghai time zone.
export const eventTimestamp = (value) =>
    Date.parse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "") ? `${value}:00+08:00` : value);
