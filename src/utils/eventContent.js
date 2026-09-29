import DOMPurify from "dompurify";
import { linkifyHtml } from "./linkify";

const DETAIL_LABEL =
    /^(安排|时间|地点|报名截止|报名方式|报名时间|名额|费用|面向对象|记点条件|官方提醒|注意事项|来源)[：:]/;

const FAQ_HEADING = /^Q\s*(\d+)[：:.、]?\s*(.*)$/i;
const SUBHEADING = /^(报名方式|截止时间|报名截止|注意事项|指导老师|报名流程|面试安排)[：:]?$/;
const PARTICIPATION_DETAIL =
    /截止|费用|收费|免费|名额|仅限|不得|必须|报名方式|报名时间|地点|学分|加分|\d{4}年\d{1,2}月/;

// Only reorganize explicit Q&A articles; ambiguous prose keeps its original order.
export const parseEventFaq = (text) => {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const intro = [];
    const sections = [];
    for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(FAQ_HEADING);
        if (match) {
            const heading = match[2] || lines[++i];
            if (!heading || !/[?？]$/.test(heading)) return null;
            sections.push({ heading, lines: [], number: Number(match[1]) });
        } else if (sections.length) {
            sections[sections.length - 1].lines.push(lines[i]);
        } else {
            intro.push(lines[i]);
        }
    }
    if (
        sections.length < 2 ||
        sections.some(
            (section, i) => !section.lines.length || (i && section.number <= sections[i - 1].number)
        )
    )
        return null;

    const priority = (heading) => {
        if (/(纳新|招新|加入|参加|报名).*(要求|条件)|面向.*(谁|对象)/.test(heading)) return 0;
        if (/(怎么|如何).*报名|报名.*(方式|参加|流程)/.test(heading)) return 1;
        if (/日常|收获|活动.*内容/.test(heading)) return 2;
        return 3;
    };
    if (!sections.some((section) => priority(section.heading) === 1)) return null;
    const background = sections.filter(
        (section) =>
            priority(section.heading) === 3 &&
            /什么样.*(团体|组织)|更多.*了解|在哪里.*了解/.test(section.heading) &&
            !PARTICIPATION_DETAIL.test(section.lines.join("\n"))
    );
    const primary = sections.filter((section) => !background.includes(section));
    primary.sort((a, b) => priority(a.heading) - priority(b.heading));
    return { intro, primary, background, showIntro: PARTICIPATION_DETAIL.test(intro.join("\n")) };
};

const appendFaqLines = (doc, root, lines) => {
    let list = null;
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const number = line.match(/^(\d{1,2})(?:[.、]\s*(.+))?$/);
        if (number && (number[2] || (lines[i + 1] && !SUBHEADING.test(lines[i + 1])))) {
            if (!list) {
                list = doc.createElement("ol");
                root.append(list);
            }
            const item = doc.createElement("li");
            item.value = Number(number[1]);
            item.textContent = number[2] || lines[++i];
            list.append(item);
        } else {
            list = null;
            const el = doc.createElement(SUBHEADING.test(line) ? "h4" : "p");
            el.textContent = line;
            root.append(el);
        }
    }
};

const renderFaq = (doc, faq, backgroundLabel) => {
    const root = doc.createElement("div");
    const appendSection = (parent, section) => {
        const heading = doc.createElement("h3");
        heading.textContent = section.heading;
        parent.append(heading);
        appendFaqLines(doc, parent, section.lines);
    };
    if (faq.showIntro) appendFaqLines(doc, root, faq.intro);
    faq.primary.forEach((section) => appendSection(root, section));
    if ((!faq.showIntro && faq.intro.length) || faq.background.length) {
        const details = doc.createElement("details");
        const summary = doc.createElement("summary");
        summary.textContent = backgroundLabel;
        details.append(summary);
        if (!faq.showIntro) appendFaqLines(doc, details, faq.intro);
        faq.background.forEach((section) => appendSection(details, section));
        root.append(details);
    }
    return root.innerHTML;
};

// Historical imports contain plain text, while newer imports already contain HTML.
export const formatEventContent = (content, description = "", { backgroundLabel } = {}) => {
    const text = String(content || "").trim() || String(description || "").trim();
    const doc = new DOMParser().parseFromString(text, "text/html");
    let html = text;

    if (!doc.body.children.length && !doc.head.children.length) {
        const faq = backgroundLabel && parseEventFaq(text);
        if (faq) {
            return DOMPurify.sanitize(linkifyHtml(renderFaq(doc, faq, backgroundLabel)), {
                ADD_ATTR: ["target"],
            });
        }
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
