export const getCompetitionPhase = (event, now = Date.now()) => {
    const startAt = Date.parse(event?.event_start_at || event?.startAt || "");
    const endAt = Date.parse(event?.event_end_at || event?.endAt || "");

    if (Number.isFinite(startAt) && now < startAt) return "upcoming";
    if (Number.isFinite(startAt) && now >= startAt && (!Number.isFinite(endAt) || now <= endAt)) {
        return "live";
    }
    return Number.isFinite(endAt) && now > endAt ? "ended" : "archive";
};
