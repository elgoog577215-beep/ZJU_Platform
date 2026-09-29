import DOMPurify from "dompurify";
import { linkifyHtml } from "./linkify";

const DETAIL_LABEL =
    /^(安排|时间|地点|报名截止|报名方式|报名时间|名额|费用|面向对象|记点条件|官方提醒|注意事项|来源)[：:]/;

// Historical imports contain plain text, while newer imports already contain HTML.
export const formatEventContent = (content, description = "") => {
    const text = String(content || "").trim() || String(description || "").trim();
    const doc = new DOMParser().parseFromString(text, "text/html");
    let html = text;

    if (!doc.body.children.length && !doc.head.children.length) {
        const root = doc.createElement("div");
        for (const paragraph of text.split(/\r?\n\s*\r?\n/).filter(Boolean)) {
            const p = doc.createElement("p");
            paragraph.split(/\r?\n/).forEach((line, index) => {
                if (index) p.append(doc.createElement("br"));
                const label = line.match(DETAIL_LABEL)?.[0];
                if (label) {
                    const strong = doc.createElement("strong");
                    strong.textContent = label;
                    p.append(strong);
                }
                p.append(doc.createTextNode(label ? line.slice(label.length) : line));
            });
            root.append(p);
        }
        html = root.innerHTML;
    }

    return DOMPurify.sanitize(linkifyHtml(html), { ADD_ATTR: ["target"] });
};
