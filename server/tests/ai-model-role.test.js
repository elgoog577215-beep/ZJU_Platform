const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const modelService = require("../src/services/aiModelConfigService");

const createDb = async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE ai_model_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, provider TEXT,
            base_url TEXT NOT NULL, model TEXT NOT NULL, role TEXT DEFAULT 'general',
            encrypted_api_key TEXT NOT NULL, priority INTEGER DEFAULT 100,
            enabled INTEGER DEFAULT 1, last_status TEXT, last_error TEXT,
            last_checked_at DATETIME, created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    return db;
};

const payload = (name, role, priority) => ({
    name,
    provider: "openai-compatible",
    base_url: "https://example.invalid/v1",
    model: `${name}-model`,
    role,
    api_key: `sk-${name}`,
    priority,
    enabled: true,
});

test("model configs persist roles and support role-specific fallback", async (t) => {
    const db = await createDb();
    t.after(() => db.close());
    const previousApiKey = process.env.LLM_API_KEY;
    process.env.LLM_API_KEY = "test-env-key";
    t.after(() => {
        if (previousApiKey === undefined) delete process.env.LLM_API_KEY;
        else process.env.LLM_API_KEY = previousApiKey;
    });

    const general = await modelService.createConfig(db, payload("general", "general", 50), 1);
    const fast = await modelService.createConfig(db, payload("fast", "fast", 10), 1);
    assert.equal(fast.role, "fast");
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, false, "fast")).map((item) => item.id),
        [fast.id, general.id]
    );
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, false, "reasoning")).map((item) => item.id),
        [general.id]
    );
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, true, "reasoning")).map((item) => item.id),
        [general.id, "env"]
    );
    assert.deepEqual(await modelService.getEnabledConfigs(db, true, "embedding"), []);
    await assert.rejects(modelService.callEmbeddingWithFailover(db, "test embedding"), (error) => {
        assert.equal(error.code, "AI_EMBEDDING_NOT_CONFIGURED");
        assert.deepEqual(error.attempts, []);
        return true;
    });
    assert.deepEqual(
        await db.get("SELECT last_status, last_error FROM ai_model_configs WHERE id = ?", [
            general.id,
        ]),
        { last_status: null, last_error: null }
    );

    const updated = await modelService.updateConfig(db, fast.id, {
        role: "embedding",
        priority: 5,
    });
    assert.equal(updated.role, "embedding");
    assert.equal(updated.priority, 5);
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, true, "embedding")).map((item) => item.id),
        [fast.id]
    );
});
