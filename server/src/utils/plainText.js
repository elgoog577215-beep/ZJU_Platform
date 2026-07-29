const cheerio = require("cheerio");

const normalizePlainText = (value, fallback = "") => {
    let text = String(value ?? "");
    if (!text.trim()) return fallback;

    // Run twice so literal markup and entity-encoded markup are both handled.
    for (let pass = 0; pass < 2; pass += 1) {
        const $ = cheerio.load(`<body>${text}</body>`, null, false);
        $("script, style, noscript").remove();
        const nextText = $.root().text();
        if (nextText === text) break;
        text = nextText;
    }

    return text.replace(/\s+/g, " ").trim() || fallback;
};

module.exports = { normalizePlainText };
