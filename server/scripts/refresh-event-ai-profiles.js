const { getDb, pool } = require("../src/config/db");
const { refreshEventProfileIndex } = require("../src/services/eventAiProfileService");

const readFlag = (name, fallback) => {
    const prefix = `--${name}=`;
    const value = process.argv.find((item) => item.startsWith(prefix));
    if (!value) return fallback;
    return value.slice(prefix.length);
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const main = async () => {
    const db = await getDb();
    try {
        const refreshAll = hasFlag("all");
        const maxBatches = refreshAll ? Number(readFlag("max-batches", 100)) : 1;
        let result = null;
        let batchCount = 0;

        do {
            result = await refreshEventProfileIndex(db, {
                limit: Number(readFlag("limit", 40)),
                force: hasFlag("force"),
                useModel: !hasFlag("no-model"),
                localEmbeddingOnly: hasFlag("local-embedding"),
            });
            batchCount += 1;
        } while (
            refreshAll &&
            batchCount < maxBatches &&
            (result.coverage.missingCount > 0 || result.coverage.staleCount > 0)
        );

        console.log(
            JSON.stringify(
                {
                    ok: true,
                    runId: result.runId,
                    batchCount,
                    summary: result.summary,
                    coverage: result.coverage,
                },
                null,
                2
            )
        );
    } finally {
        await pool.close();
    }
};

main().catch(async (error) => {
    console.error("Event AI profile refresh failed:", error.message);
    await pool.close().catch(() => {});
    process.exitCode = 1;
});
