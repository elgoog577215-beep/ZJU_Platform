const prefix = "profile-reminder-seen:";
const seen = new Set();

export function hasSeenProfileReminder(userId) {
    if (seen.has(userId)) return true;
    try {
        return sessionStorage.getItem(`${prefix}${userId}`) === "1";
    } catch {
        return false;
    }
}
export function markProfileReminderSeen(userId) {
    seen.add(userId);
    try {
        sessionStorage.setItem(`${prefix}${userId}`, "1");
    } catch {
        /* Memory fallback. */
    }
}
export function resetProfileReminders() {
    seen.clear();
    try {
        for (const key of Object.keys(sessionStorage)) {
            if (key.startsWith(prefix)) sessionStorage.removeItem(key);
        }
    } catch {
        /* Storage may be unavailable. */
    }
}
