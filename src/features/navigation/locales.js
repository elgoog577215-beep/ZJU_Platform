import { localizedNames } from "./names";
import i18n from "../../i18n";
export const resources = {
    zh: {
        subtitle: "从校园出发，连接 AI 的学习、研究与创造。",
        title: "探索 AI，从这里开始。",
        meta: "AI 与科技导航 · 拓浙AI生态",
        description:
            "面向大学生与开发者的 AI、计算机、科研与科技网址导航。发现模型、代码、课程、论文与实践机会。",
        search: "搜索网站、工具、课程、论文…",
        searchLabel: "搜索导航网站",
        searchHint: "支持名称与用途关键词",
        featured: "常用直达",
        clear: "清除搜索",
        all: "全部",
        categories: "按用途浏览",
        count: "{{count}} 个精选入口",
        results: "找到 {{count}} 个入口",
        sectionTitle: "为学习与创造，找到合适的工具。",
        categoryHelp: "从一个问题，到一门课程、一篇论文、一个项目。",
        empty: "还没有找到匹配的网站",
        emptyHelp: "试试“模型”“Python”或“论文”，也可以清除筛选浏览全部。",
        reset: "浏览全部网站",
        external: "在新标签页打开",
        shortcut: "聚焦搜索",
        names: localizedNames.zh,
    },
    en: {
        subtitle: "From campus to a world of learning, research and creation.",
        title: "Your starting point for AI.",
        meta: "AI & technology directory · TUOZHE AI ECOSYSTEM",
        description:
            "A curated AI, computer science and research directory for students and developers. Discover models, code, courses, papers and opportunities.",
        search: "Search sites, tools, courses, papers…",
        searchLabel: "Search directory",
        searchHint: "Search by name or purpose",
        featured: "Quick access",
        clear: "Clear search",
        all: "All",
        categories: "Browse by purpose",
        count: "{{count}} curated links",
        results: "{{count}} results",
        sectionTitle: "Find the tools for your next idea.",
        categoryHelp: "A question, a course, a paper, a project.",
        empty: "No matching sites yet",
        emptyHelp: "Try “models”, “Python” or “papers”, or clear the filters to browse all sites.",
        reset: "Browse all sites",
        external: "Opens in a new tab",
        shortcut: "Focus search",
        names: localizedNames.en,
    },
};
function register() {
    for (const [language, resource] of Object.entries(resources)) {
        i18n.addResourceBundle(language, "navigation", resource, true, true);
    }
}
if (i18n.isInitialized) register();
else i18n.on("initialized", register);
