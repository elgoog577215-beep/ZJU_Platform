const crypto = require("crypto");
const os = require("os");
const aiRuntime = require("./unifiedAiRuntimeService");
const userProfileService = require("./userProfileService");
const { normalizeEventCategory, getCategoryLabel } = require("./eventIntelligenceService");

const PROFILE_VERSION = 1;
const WORKER_POLL_MS = 5000;
const DAILY_RECONCILE_MS = 24 * 60 * 60 * 1000;
const ACTION_WEIGHTS = {
    view_detail: 0.35,
    favorite: 1.2,
    register: 2,
    feedback_up: 1.5,
    unfavorite: -1,
    unregister: -1.6,
    feedback_down: -2,
};

let workerTimer = null;
let reconcileTimer = null;
let workerRunning = false;

const toText = (value, maxLength = 240) =>
    String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);

const safeJson = (value, fallback) => {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
};

const uniqueText = (value, limit = 10, maxLength = 80) =>
    [
        ...new Set(
            (Array.isArray(value) ? value : [])
                .map((item) => toText(item, maxLength))
                .filter(Boolean)
        ),
    ].slice(0, limit);

const clampConfidence = (value, fallback = 0.45) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(Math.max(number, 0), 1) : fallback;
};

const decayForDate = (value) => {
    const time = new Date(value || 0).getTime();
    if (!Number.isFinite(time)) return 0.2;
    const ageDays = Math.max(0, (Date.now() - time) / (24 * 60 * 60 * 1000));
    if (ageDays <= 7) return 1;
    if (ageDays <= 30) return 0.7;
    if (ageDays <= 90) return 0.35;
    return 0.1;
};

const serializeRow = (row) => {
    if (!row) {
        return {
            longTermPreferences: [],
            shortTermInterests: [],
            dislikes: [],
            decisionFactors: [],
            evidence: [],
            confidence: 0,
            status: "missing",
            version: PROFILE_VERSION,
            updatedAt: null,
        };
    }
    return {
        longTermPreferences: safeJson(row.long_term_preferences, []),
        shortTermInterests: safeJson(row.short_term_interests, []),
        dislikes: safeJson(row.dislikes, []),
        decisionFactors: safeJson(row.decision_factors, []),
        evidence: safeJson(row.evidence_json, []),
        confidence: clampConfidence(row.confidence, 0),
        status: row.status || "pending",
        version: Number(row.profile_version || PROFILE_VERSION),
        updatedAt: row.generated_at || row.updated_at || null,
        personalizationResetAt: row.personalization_reset_at || null,
    };
};

const getProfileRow = (db, userId) =>
    db.get("SELECT * FROM user_event_ai_profiles WHERE user_id = ?", [userId]);

const getUserProfile = async (db, userId) => serializeRow(await getProfileRow(db, userId));

const loadBehaviorRows = async (db, userId, resetAt) => {
    const sinceParams = resetAt ? [resetAt] : [];
    const [favorites, registrations, feedback, actions] = await Promise.all([
        db
            .all(
                `SELECT 'favorite' AS action_type, f.created_at, e.id AS event_id, e.title, e.category,
                        e.location, e.organizer, p.topic_terms, p.benefit_terms
                 FROM favorites f
                 JOIN events e ON e.id = f.item_id
                 LEFT JOIN event_ai_profiles p ON p.event_id = e.id
                 WHERE f.user_id = ? AND f.item_type = 'event' ${resetAt ? "AND f.created_at >= ?" : ""}
                 ORDER BY f.created_at DESC LIMIT 80`,
                [userId, ...sinceParams]
            )
            .catch(() => []),
        db
            .all(
                `SELECT 'register' AS action_type, r.created_at, e.id AS event_id, e.title, e.category,
                        e.location, e.organizer, p.topic_terms, p.benefit_terms
                 FROM event_registrations r
                 JOIN events e ON e.id = r.event_id
                 LEFT JOIN event_ai_profiles p ON p.event_id = e.id
                 WHERE r.user_id = ? ${resetAt ? "AND r.created_at >= ?" : ""}
                 ORDER BY r.created_at DESC LIMIT 80`,
                [userId, ...sinceParams]
            )
            .catch(() => []),
        db
            .all(
                `SELECT CASE WHEN f.feedback = 'up' THEN 'feedback_up' ELSE 'feedback_down' END AS action_type,
                        f.created_at, f.reason, e.id AS event_id, e.title, e.category,
                        e.location, e.organizer, p.topic_terms, p.benefit_terms
                 FROM event_recommendation_feedback f
                 JOIN events e ON e.id = f.event_id
                 LEFT JOIN event_ai_profiles p ON p.event_id = e.id
                 WHERE f.user_id = ? ${resetAt ? "AND f.created_at >= ?" : ""}
                 ORDER BY f.created_at DESC LIMIT 100`,
                [userId, ...sinceParams]
            )
            .catch(() => []),
        db
            .all(
                `SELECT a.action_type, a.created_at, e.id AS event_id, e.title, e.category,
                        e.location, e.organizer, p.topic_terms, p.benefit_terms
                 FROM event_recommendation_actions a
                 JOIN events e ON e.id = a.event_id
                 LEFT JOIN event_ai_profiles p ON p.event_id = e.id
                 WHERE a.user_id = ? ${resetAt ? "AND a.created_at >= ?" : ""}
                 ORDER BY a.created_at DESC LIMIT 120`,
                [userId, ...sinceParams]
            )
            .catch(() => []),
    ]);
    return [...favorites, ...registrations, ...feedback, ...actions];
};

const summarizeBehavior = (rows) => {
    const categoryScores = new Map();
    const topicScores = new Map();
    const negativeScores = new Map();
    const factorScores = new Map();
    const evidence = [];
    const add = (map, key, score) => {
        const normalized = toText(key, 60);
        if (normalized) map.set(normalized, (map.get(normalized) || 0) + score);
    };

    rows.forEach((row) => {
        const action = row.action_type;
        const weight = Number(ACTION_WEIGHTS[action] || 0) * decayForDate(row.created_at);
        const category = normalizeEventCategory(row.category) || "other";
        const label = getCategoryLabel(category) || category;
        const topics = safeJson(row.topic_terms, []);
        const benefits = safeJson(row.benefit_terms, []);
        if (weight >= 0) {
            add(categoryScores, label, weight);
            topics.forEach((topic) => add(topicScores, topic, weight));
            if (row.location) add(factorScores, `地点：${row.location}`, weight * 0.35);
            benefits.forEach((benefit) => add(factorScores, `收益：${benefit}`, weight * 0.5));
        } else {
            add(negativeScores, label, Math.abs(weight));
            topics.forEach((topic) => add(negativeScores, topic, Math.abs(weight) * 0.6));
            if (row.reason) add(negativeScores, row.reason, Math.abs(weight));
        }
        if (Math.abs(weight) >= 1 && evidence.length < 20) {
            evidence.push(`${action}:${toText(row.title, 80)}`);
        }
    });

    const top = (map, count) =>
        [...map.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, count)
            .map(([value, score]) => ({ value, score: Number(score.toFixed(2)) }));
    return {
        categories: top(categoryScores, 8),
        topics: top(topicScores, 12),
        negatives: top(negativeScores, 10),
        factors: top(factorScores, 8),
        evidence: uniqueText(evidence, 16, 120),
        actionCount: rows.length,
    };
};

const buildFallbackProfile = (foundation, behavior) => {
    const explicit = foundation?.explicit || {};
    return {
        long_term_preferences: uniqueText(
            [
                ...(explicit.interestTags || []),
                ...behavior.categories.slice(0, 4).map((item) => `偏好${item.value}`),
            ],
            8
        ),
        short_term_interests: uniqueText(
            behavior.topics.slice(0, 6).map((item) => item.value),
            8
        ),
        dislikes: uniqueText(
            behavior.negatives.slice(0, 5).map((item) => item.value),
            6
        ),
        decision_factors: uniqueText(
            [
                explicit.campus ? `常用校区：${explicit.campus}` : "",
                explicit.availability ? `空闲时间：${explicit.availability}` : "",
                ...(explicit.preferredBenefits || []).map((item) => `收益：${item}`),
                ...behavior.factors.slice(0, 4).map((item) => item.value),
            ].filter(Boolean),
            8
        ),
        evidence: behavior.evidence,
        confidence:
            behavior.actionCount > 0 ? Math.min(0.75, 0.42 + behavior.actionCount * 0.015) : 0.3,
    };
};

const generateProfile = async (db, userId) => {
    const existing = await getProfileRow(db, userId);
    const foundation = await userProfileService.loadRecommendationProfileFoundation(db, userId);
    if (!foundation) throw new Error("User profile foundation not found.");
    const rows = await loadBehaviorRows(db, userId, existing?.personalization_reset_at || null);
    const behavior = summarizeBehavior(rows);
    const fallback = buildFallbackProfile(foundation, behavior);
    const source = { explicit: foundation.explicit, behavior, previous: serializeRow(existing) };
    const sourceHash = crypto.createHash("sha256").update(JSON.stringify(source)).digest("hex");
    if (existing?.source_hash === sourceHash && existing.status === "ready") {
        return serializeRow(existing);
    }

    let parsed = fallback;
    let status = "fallback";
    let modelName = "";
    let modelProvider = "";
    let lastError = "";
    try {
        const result = await aiRuntime.callJson(db, {
            task: "user_event_profile",
            timeout: 3000,
            messages: [
                {
                    role: "system",
                    content: [
                        "你是校园活动推荐系统的用户画像更新器。",
                        "显式偏好优先于行为，近期高价值行为优先于长期弱行为。",
                        "不得推断敏感属性，不得编造用户经历，只能基于给定证据输出紧凑 JSON。",
                    ].join("\n"),
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        task: "update_user_event_profile",
                        explicit: foundation.explicit,
                        behavior,
                        previous_profile: serializeRow(existing),
                        output_contract: {
                            long_term_preferences: ["长期稳定偏好，最多8项"],
                            short_term_interests: ["近期兴趣，最多8项"],
                            dislikes: ["明确负偏好，最多6项"],
                            decision_factors: ["时间/校区/收益等决策因素，最多8项"],
                            evidence: ["只能引用输入 evidence 中的证据，最多12项"],
                            confidence: "0-1 number",
                        },
                    }),
                },
            ],
        });
        parsed = result.parsed || fallback;
        status = "ready";
        modelName = result.config?.model || "";
        modelProvider = result.config?.name || result.config?.provider || "";
    } catch (error) {
        lastError = toText(error.message, 500);
    }

    const normalized = {
        longTermPreferences: uniqueText(
            parsed.long_term_preferences || fallback.long_term_preferences,
            8
        ),
        shortTermInterests: uniqueText(
            parsed.short_term_interests || fallback.short_term_interests,
            8
        ),
        dislikes: uniqueText(parsed.dislikes || fallback.dislikes, 6),
        decisionFactors: uniqueText(parsed.decision_factors || fallback.decision_factors, 8),
        evidence: uniqueText(parsed.evidence || fallback.evidence, 12, 120).filter((item) =>
            fallback.evidence.includes(item)
        ),
        confidence: clampConfidence(parsed.confidence, fallback.confidence),
    };

    await db.run(
        `INSERT INTO user_event_ai_profiles (
           user_id, profile_version, profile_json, long_term_preferences,
           short_term_interests, dislikes, decision_factors, evidence_json,
           confidence, status, source_hash, model_name, model_provider, last_error,
           personalization_reset_at, generated_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           profile_version = excluded.profile_version, profile_json = excluded.profile_json,
           long_term_preferences = excluded.long_term_preferences,
           short_term_interests = excluded.short_term_interests, dislikes = excluded.dislikes,
           decision_factors = excluded.decision_factors, evidence_json = excluded.evidence_json,
           confidence = excluded.confidence, status = excluded.status,
           source_hash = excluded.source_hash, model_name = excluded.model_name,
           model_provider = excluded.model_provider, last_error = excluded.last_error,
           generated_at = datetime('now'), updated_at = datetime('now')`,
        [
            userId,
            PROFILE_VERSION,
            JSON.stringify(normalized),
            JSON.stringify(normalized.longTermPreferences),
            JSON.stringify(normalized.shortTermInterests),
            JSON.stringify(normalized.dislikes),
            JSON.stringify(normalized.decisionFactors),
            JSON.stringify(normalized.evidence),
            normalized.confidence,
            status,
            sourceHash,
            modelName,
            modelProvider,
            lastError,
            existing?.personalization_reset_at || null,
        ]
    );
    return getUserProfile(db, userId);
};

const enqueueProfileRefresh = async (db, userId, options = {}) => {
    const normalizedUserId = Number(userId);
    if (!Number.isInteger(normalizedUserId)) return { queued: false };
    const delaySeconds = Math.max(0, Math.min(Number(options.delaySeconds ?? 10), 600));
    const reason = toText(options.reason || "behavior", 80);
    const priority = Math.max(0, Math.min(Number(options.priority ?? 50), 100));
    const availableAt = new Date(Date.now() + delaySeconds * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    const existing = await db.get(
        "SELECT id FROM user_ai_profile_jobs WHERE user_id = ? AND status IN ('pending', 'processing') LIMIT 1",
        [normalizedUserId]
    );
    if (existing) {
        await db.run(
            `UPDATE user_ai_profile_jobs
             SET reason = ?, priority = MAX(priority, ?),
                 available_at = CASE WHEN status = 'pending' AND available_at > ? THEN ? ELSE available_at END,
                 updated_at = datetime('now') WHERE id = ?`,
            [reason, priority, availableAt, availableAt, existing.id]
        );
        return { queued: true, jobId: existing.id, coalesced: true };
    }
    const result = await db.run(
        "INSERT INTO user_ai_profile_jobs (user_id, reason, priority, available_at) VALUES (?, ?, ?, ?)",
        [normalizedUserId, reason, priority, availableAt]
    );
    return { queued: true, jobId: result.lastID, coalesced: false };
};

const claimNextJob = async (db, workerId) => {
    await db.exec("BEGIN IMMEDIATE");
    try {
        await db.run(
            `UPDATE user_ai_profile_jobs
             SET status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END,
                 attempts = attempts + 1, locked_at = NULL, locked_by = NULL,
                 available_at = datetime('now'), last_error = 'Recovered stale worker lock.',
                 updated_at = datetime('now')
             WHERE status = 'processing' AND locked_at < datetime('now', '-5 minutes')`
        );
        const job = await db.get(
            `SELECT * FROM user_ai_profile_jobs
             WHERE status = 'pending' AND available_at <= datetime('now')
             ORDER BY priority DESC, id ASC LIMIT 1`
        );
        if (!job) {
            await db.exec("COMMIT");
            return null;
        }
        await db.run(
            `UPDATE user_ai_profile_jobs SET status = 'processing', locked_at = datetime('now'),
             locked_by = ?, updated_at = datetime('now') WHERE id = ? AND status = 'pending'`,
            [workerId, job.id]
        );
        await db.exec("COMMIT");
        return job;
    } catch (error) {
        await db.exec("ROLLBACK").catch(() => {});
        throw error;
    }
};

const processNextJob = async (db, workerId) => {
    const job = await claimNextJob(db, workerId);
    if (!job) return false;
    try {
        await generateProfile(db, job.user_id);
        await db.run(
            "UPDATE user_ai_profile_jobs SET status = 'completed', updated_at = datetime('now') WHERE id = ?",
            [job.id]
        );
    } catch (error) {
        const attempts = Number(job.attempts || 0) + 1;
        const retrySeconds = Math.min(300, 15 * 2 ** Math.max(0, attempts - 1));
        await db.run(
            `UPDATE user_ai_profile_jobs SET status = ?, attempts = ?, available_at = datetime('now', ?),
             locked_at = NULL, locked_by = NULL, last_error = ?, updated_at = datetime('now') WHERE id = ?`,
            [
                attempts >= 3 ? "failed" : "pending",
                attempts,
                `+${retrySeconds} seconds`,
                toText(error.message, 500),
                job.id,
            ]
        );
    }
    return true;
};

const reconcileProfiles = async (db) => {
    const users = await db
        .all(
            `SELECT DISTINCT user_id FROM (
               SELECT user_id FROM favorites WHERE item_type = 'event' AND created_at >= datetime('now', '-90 days')
               UNION SELECT user_id FROM event_registrations WHERE created_at >= datetime('now', '-90 days')
               UNION SELECT user_id FROM event_recommendation_feedback WHERE created_at >= datetime('now', '-90 days')
               UNION SELECT user_id FROM user_event_preferences
             ) WHERE user_id IS NOT NULL LIMIT 500`
        )
        .catch(() => []);
    for (const row of users) {
        const profile = await getProfileRow(db, row.user_id);
        const stale =
            new Date(profile?.updated_at || 0).getTime() < Date.now() - DAILY_RECONCILE_MS;
        if (!profile || profile.status !== "ready" || stale) {
            await enqueueProfileRefresh(db, row.user_id, {
                reason: "daily_reconcile",
                priority: 20,
                delaySeconds: 0,
            });
        }
    }
};

const startUserEventAiProfileScheduler = ({ getDb }) => {
    if (workerTimer) return;
    const workerId = `${os.hostname()}:${process.pid}`;
    const tick = async () => {
        if (workerRunning) return;
        workerRunning = true;
        try {
            await processNextJob(await getDb(), workerId);
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[UserAiProfileWorker]", error.message);
            }
        } finally {
            workerRunning = false;
        }
    };
    workerTimer = setInterval(tick, WORKER_POLL_MS);
    workerTimer.unref?.();
    reconcileTimer = setInterval(async () => {
        try {
            await reconcileProfiles(await getDb());
        } catch {}
    }, DAILY_RECONCILE_MS);
    reconcileTimer.unref?.();
    tick();
};

const stopUserEventAiProfileScheduler = () => {
    if (workerTimer) clearInterval(workerTimer);
    if (reconcileTimer) clearInterval(reconcileTimer);
    workerTimer = null;
    reconcileTimer = null;
};

const resetUserProfile = async (db, userId) => {
    const normalizedUserId = Number(userId);
    const empty = {
        longTermPreferences: [],
        shortTermInterests: [],
        dislikes: [],
        decisionFactors: [],
        evidence: [],
    };
    await db.exec("BEGIN IMMEDIATE");
    try {
        await db.run(
            "DELETE FROM assistant_memory WHERE user_id = ? AND source = 'event_assistant'",
            [normalizedUserId]
        );
        await db.run(
            "DELETE FROM user_ai_profile_jobs WHERE user_id = ? AND status IN ('pending', 'processing')",
            [normalizedUserId]
        );
        await db.run(
            `INSERT INTO user_event_ai_profiles (
               user_id, profile_version, profile_json, long_term_preferences, short_term_interests,
               dislikes, decision_factors, evidence_json, confidence, status,
               personalization_reset_at, generated_at, updated_at
             ) VALUES (?, ?, ?, '[]', '[]', '[]', '[]', '[]', 0, 'reset', datetime('now'), datetime('now'), datetime('now'))
             ON CONFLICT(user_id) DO UPDATE SET profile_version = excluded.profile_version,
               profile_json = excluded.profile_json, long_term_preferences = '[]',
               short_term_interests = '[]', dislikes = '[]', decision_factors = '[]',
               evidence_json = '[]', confidence = 0, status = 'reset', source_hash = NULL,
               last_error = NULL, personalization_reset_at = datetime('now'),
               generated_at = datetime('now'), updated_at = datetime('now')`,
            [normalizedUserId, PROFILE_VERSION, JSON.stringify(empty)]
        );
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK").catch(() => {});
        throw error;
    }
    return getUserProfile(db, normalizedUserId);
};

module.exports = {
    ACTION_WEIGHTS,
    PROFILE_VERSION,
    enqueueProfileRefresh,
    generateProfile,
    getUserProfile,
    processNextJob,
    reconcileProfiles,
    resetUserProfile,
    startUserEventAiProfileScheduler,
    stopUserEventAiProfileScheduler,
    _test: { decayForDate, summarizeBehavior },
};
