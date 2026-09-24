const test = require("node:test");
const assert = require("node:assert/strict");
const {
    normalizeStudentSummary,
    renderStudentSummary,
    normalizeDeadline,
    withWeekday,
    yearOf,
} = require("../src/utils/wechatEventSummary");

test("student summary keeps only known, ordered, bounded fields", () => {
    const summary = normalizeStudentSummary({
        highlight: "  讲座  可获二课分 ",
        key_info: [
            { label: "报名方式", value: "打开原文扫码报名" },
            { label: "时间", value: "9月24日 15:00-17:30" },
            { label: "时间", value: "重复的时间" },
            { label: "主办方意义", value: "不应出现" },
            { label: "地点", value: "" },
        ],
        sections: [
            { heading: "怎么参加", bullets: ["报名", "", "签到", "3", "4", "5", "6"] },
            { heading: "", bullets: ["无标题"] },
            { heading: "空节", bullets: [] },
        ],
    });
    assert.equal(summary.highlight, "讲座 可获二课分");
    assert.deepEqual(
        summary.key_info.map((x) => x.label),
        ["时间", "报名方式"]
    );
    assert.equal(summary.key_info[0].value, "9月24日 15:00-17:30");
    assert.deepEqual(summary.sections, [
        { heading: "怎么参加", bullets: ["报名", "签到", "3", "4", "5"] },
    ]);
    assert.equal(normalizeStudentSummary({ description: "只有旧字段" }), null);
});

test("rendered summary puts the main image first and escapes model text", () => {
    const html = renderStudentSummary(
        {
            highlight: "名将<面对面>",
            key_info: [{ label: "时间", value: "10月11日（周六） 8:30" }],
            sections: [{ heading: "怎么参加", bullets: ["9月22日开放报名"] }],
        },
        {
            images: [
                "/uploads/covers/main.jpg",
                "javascript:alert(1)",
                "/uploads/covers/../secret",
                "/uploads/covers/main.jpg",
                "/uploads/covers/second.png",
                "https://mmbiz.qpic.cn/third.jpg",
                "/uploads/covers/fourth.jpg",
            ],
            year: 2026,
        }
    );
    const order = [
        "main.jpg",
        "名将&lt;面对面&gt;",
        "10月11日（周日） 8:30",
        "<h3>怎么参加</h3>",
        "9月22日（周二）开放报名",
        "second.png",
        "third.jpg",
    ].map((part) => html.indexOf(part));
    assert.ok(
        order.every((index) => index >= 0),
        html
    );
    assert.deepEqual(
        [...order].sort((a, b) => a - b),
        order
    );
    assert.doesNotMatch(html, /javascript|secret|fourth|周六|<面对面>/);
    assert.equal(html.match(/main\.jpg/g).length, 1);
    assert.equal(renderStudentSummary(null, { images: [] }), "");
});

test("weekdays, years and deadlines are computed rather than trusted", () => {
    assert.equal(withWeekday("9月21日（星期三）22:00截止", 2026), "9月21日（周一）22:00截止");
    assert.equal(withWeekday("2月30日", 2026), "2月30日");
    assert.equal(yearOf("2025-12-01T00:00:00Z", "2026-01-01"), 2025);
    assert.equal(yearOf("1790000000"), 2026);
    assert.equal(normalizeDeadline("2026-09-24T24:00"), "2026-09-24T23:59");
    assert.equal(normalizeDeadline("2026-09-21T22:00"), "2026-09-21T22:00");
    assert.equal(normalizeDeadline("2026-02-30T10:00"), null);
    assert.equal(normalizeDeadline("9月26日"), null);
    assert.equal(normalizeDeadline(null), null);
});
