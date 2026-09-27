const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const { parseAssistantIntent } = require("../src/utils/eventAssistant");
const { ensureEventProfile } = require("../src/services/eventAiProfileService");
const {
    buildLocalSemanticVector,
    detectSemanticCategories,
    detectSemanticTopics,
    expandSemanticTerms,
} = require("../src/services/eventSemanticSearchService");

const cosine = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);

test("vocal queries map to a stable semantic topic without clarification", () => {
    const intent = parseAssistantIntent({ query: "唱歌" });
    assert.deepEqual(intent.semanticTopics, ["声乐歌唱"]);
    assert(intent.categories.includes("culture_sports"));
    assert.equal(intent.shouldClarify, false);
});

test("vocal topic expansion covers common campus event wording", () => {
    const terms = expandSemanticTerms(["唱歌"]);
    assert(terms.includes("歌唱"));
    assert(terms.includes("校园歌手"));
    assert(terms.includes("声乐"));
    assert.deepEqual(detectSemanticTopics("校园十佳歌手大赛"), ["声乐歌唱"]);
    assert.deepEqual(detectSemanticCategories("校园十佳歌手大赛"), ["culture_sports"]);
});

test("local semantic fallback separates vocal and unrelated AI events", () => {
    const query = buildLocalSemanticVector("我想参加唱歌活动");
    const vocal = buildLocalSemanticVector("校园十佳歌手声乐比赛");
    const unrelated = buildLocalSemanticVector("人工智能编程与算法大赛");
    assert(cosine(query, vocal) > 0.7);
    assert(cosine(query, vocal) > cosine(query, unrelated) + 0.5);
});

test("online retrieval reuses the background profile for a compact event row", async (t) => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    t.after(() => db.close());
    await db.exec(`
        CREATE TABLE event_ai_profiles (
            event_id INTEGER PRIMARY KEY, profile_version INTEGER DEFAULT 1,
            source_hash TEXT NOT NULL, profile_json TEXT NOT NULL, summary TEXT,
            category TEXT, topic_terms TEXT, benefit_terms TEXT, campus_terms TEXT,
            audience_terms TEXT, organizer_terms TEXT, confidence REAL DEFAULT 0,
            status TEXT DEFAULT 'ready', last_error TEXT, model_name TEXT,
            model_provider TEXT, embedding_vector TEXT, embedding_model TEXT,
            embedding_dimensions INTEGER DEFAULT 0, embedded_at DATETIME,
            refreshed_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    const fullEvent = {
        id: 42,
        title: "校园十佳歌手比赛",
        category: "culture_sports",
        description: "面向全校学生的歌唱比赛",
        content: "完整活动正文与报名规则",
        organizer: "学生艺术中心",
    };
    await ensureEventProfile(db, fullEvent, { useModel: false });

    const result = await ensureEventProfile(
        db,
        {
            id: fullEvent.id,
            title: fullEvent.title,
            category: fullEvent.category,
            description: fullEvent.description,
            organizer: fullEvent.organizer,
        },
        {
            useModel: false,
            persistFallback: false,
            trustIndexedProfile: true,
        }
    );

    assert.equal(result.created, false);
    assert.equal(result.transient, undefined);
    assert.equal(result.profile.status, "fallback");
    assert(result.profile.topics.includes("声乐歌唱"));
});
