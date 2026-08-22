const test = require("node:test");
const assert = require("node:assert/strict");

const { parseAssistantIntent } = require("../src/utils/eventAssistant");
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
