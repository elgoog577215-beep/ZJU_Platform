import { localizedNames } from "./names.js";
// Public editorial allowlist. Never import browser exports or account-specific URLs here.
const site = (id, name, url, zh, en, keywords = "") => ({ id, name, url, zh, en, keywords });
export const directory = [
    {
        id: "assistants",
        zh: "AI 助手与应用",
        en: "AI assistants",
        sites: [
            site(
                "chatgpt",
                "ChatGPT",
                "https://chatgpt.com/",
                "通用 AI 助手",
                "General AI assistant",
                "openai 对话 写作"
            ),
            site(
                "claude",
                "Claude",
                "https://claude.ai/",
                "写作与代码协作",
                "Writing & coding",
                "anthropic 对话"
            ),
            site(
                "gemini",
                "Gemini",
                "https://gemini.google.com/",
                "Google AI 助手",
                "Google AI assistant",
                "谷歌 多模态"
            ),
            site(
                "deepseek",
                "DeepSeek",
                "https://chat.deepseek.com/",
                "推理与问题求解",
                "Reasoning & problem solving",
                "深度求索 数学"
            ),
            site(
                "qwen",
                "通义千问",
                "https://www.qianwen.com/",
                "通用问答与创作",
                "Qwen AI assistant",
                "qwen 千问 阿里"
            ),
            site(
                "notebooklm",
                "NotebookLM",
                "https://notebooklm.google.com/",
                "围绕资料学习研究",
                "Research with your sources",
                "笔记 阅读 文献 google"
            ),
            site(
                "perplexity",
                "Perplexity",
                "https://www.perplexity.ai/",
                "AI 搜索与来源追踪",
                "AI search with sources",
                "搜索 检索 research"
            ),
            site(
                "kimi",
                "Kimi",
                "https://www.kimi.com/",
                "文档阅读与问答",
                "Documents & questions",
                "月之暗面 长文本"
            ),
            site(
                "doubao",
                "豆包",
                "https://www.doubao.com/",
                "日常学习与创作",
                "Everyday learning & creation",
                "doubao 字节"
            ),
        ],
    },
    {
        id: "models",
        zh: "模型与数据集",
        en: "Models & datasets",
        sites: [
            site(
                "huggingface",
                "Hugging Face",
                "https://huggingface.co/",
                "模型、数据与应用",
                "Models, datasets & apps",
                "hf 开源 transformers"
            ),
            site(
                "modelscope",
                "魔搭 ModelScope",
                "https://modelscope.cn/",
                "开源模型社区",
                "Open model community",
                "模型 国内"
            ),
            site(
                "kaggle",
                "Kaggle",
                "https://www.kaggle.com/",
                "数据集与数据科学",
                "Datasets & data science",
                "数据分析 机器学习"
            ),
            site(
                "ollama",
                "Ollama",
                "https://ollama.com/",
                "在本地运行模型",
                "Run models locally",
                "本地部署 inference"
            ),
            site(
                "uci",
                "UCI 数据集",
                "https://archive.ics.uci.edu/",
                "机器学习基准数据",
                "ML benchmark datasets",
                "dataset 加州大学"
            ),
            site(
                "openrouter",
                "OpenRouter",
                "https://openrouter.ai/",
                "多模型 API 入口",
                "Multi-model API access",
                "接口 推理"
            ),
        ],
    },
    {
        id: "ai-dev",
        zh: "AI 开发与实验",
        en: "Build & experiment",
        sites: [
            site(
                "pytorch",
                "PyTorch",
                "https://pytorch.org/",
                "深度学习框架",
                "Deep learning framework",
                "训练 神经网络"
            ),
            site(
                "colab",
                "Google Colab",
                "https://colab.research.google.com/",
                "云端 Python 笔记本",
                "Cloud Python notebooks",
                "算力 gpu 实验"
            ),
            site(
                "autodl",
                "AutoDL",
                "https://www.autodl.com/",
                "GPU 算力与训练",
                "GPU compute & training",
                "云服务器 算力"
            ),
            site(
                "dify",
                "Dify",
                "https://dify.ai/",
                "构建 AI 应用工作流",
                "Build AI workflows",
                "智能体 agent rag"
            ),
            site(
                "coze",
                "扣子 Coze",
                "https://www.coze.cn/",
                "智能体与工作流",
                "Agents & workflows",
                "agent bot"
            ),
            site(
                "cursor",
                "Cursor",
                "https://cursor.com/",
                "AI 编程编辑器",
                "AI code editor",
                "ide 代码 开发"
            ),
            site(
                "langchain",
                "LangChain",
                "https://docs.langchain.com/",
                "智能体开发文档",
                "Agent framework docs",
                "agent rag langgraph"
            ),
            site(
                "gradio",
                "Gradio",
                "https://www.gradio.app/",
                "快速搭建模型演示",
                "Build model demos",
                "python demo 应用"
            ),
            site(
                "vercel",
                "Vercel",
                "https://vercel.com/",
                "发布 Web 应用",
                "Deploy web applications",
                "部署 前端 hosting"
            ),
        ],
    },
    {
        id: "development",
        zh: "开源与软件开发",
        en: "Open source & development",
        sites: [
            site(
                "github",
                "GitHub",
                "https://github.com/",
                "开源项目与协作",
                "Open source & collaboration",
                "git 代码 仓库"
            ),
            site(
                "gitlab",
                "GitLab",
                "https://gitlab.com/",
                "代码托管与交付",
                "Code hosting & delivery",
                "git devops"
            ),
            site(
                "stackoverflow",
                "Stack Overflow",
                "https://stackoverflow.com/",
                "开发问题与解答",
                "Developer questions",
                "代码 报错 问答"
            ),
            site(
                "mdn",
                "MDN",
                "https://developer.mozilla.org/",
                "Web 开发文档",
                "Web development docs",
                "javascript html css 前端"
            ),
            site(
                "python",
                "Python 文档",
                "https://docs.python.org/zh-cn/3/",
                "Python 官方参考",
                "Official Python reference",
                "编程 语言 教程"
            ),
            site(
                "docker",
                "Docker",
                "https://www.docker.com/",
                "容器与开发环境",
                "Containers & environments",
                "部署 devops"
            ),
            site(
                "npm",
                "npm",
                "https://www.npmjs.com/",
                "JavaScript 软件包",
                "JavaScript packages",
                "node 包管理"
            ),
            site(
                "pypi",
                "PyPI",
                "https://pypi.org/",
                "Python 软件包",
                "Python packages",
                "pip 包管理"
            ),
            site(
                "cloudflare",
                "Cloudflare",
                "https://www.cloudflare.com/",
                "网络与应用基础设施",
                "Network & app infrastructure",
                "workers 部署 dns"
            ),
        ],
    },
    {
        id: "learning",
        zh: "CS 与 AI 学习",
        en: "Learn CS & AI",
        sites: [
            site(
                "csdiy",
                "CS 自学指南",
                "https://csdiy.wiki/",
                "计算机学习路线",
                "A path through CS",
                "计算机 科班 课程"
            ),
            site(
                "mit",
                "MIT OCW",
                "https://ocw.mit.edu/",
                "麻省理工开放课程",
                "MIT open courses",
                "大学 数学 公开课"
            ),
            site(
                "cs50",
                "CS50",
                "https://cs50.harvard.edu/x/",
                "计算机科学入门",
                "Introduction to CS",
                "哈佛 编程"
            ),
            site(
                "d2l",
                "动手学深度学习",
                "https://zh.d2l.ai/",
                "从原理到代码实践",
                "Deep learning in practice",
                "dive deep learning 李沐"
            ),
            site(
                "hf-learn",
                "HF Learn",
                "https://huggingface.co/learn",
                "模型与智能体课程",
                "Models & agents courses",
                "hugging face 学习 大模型"
            ),
            site(
                "deeplearning",
                "DeepLearning.AI",
                "https://www.deeplearning.ai/",
                "AI 课程与短课",
                "AI courses & short courses",
                "吴恩达 andrew ng"
            ),
            site(
                "fastai",
                "fast.ai",
                "https://www.fast.ai/",
                "实用深度学习",
                "Practical deep learning",
                "课程 神经网络"
            ),
            site(
                "missing",
                "Missing Semester",
                "https://missing.csail.mit.edu/",
                "开发工具与工作方法",
                "Developer tools & workflows",
                "终端 git shell mit"
            ),
            site(
                "mooc",
                "中国大学 MOOC",
                "https://www.icourse163.org/",
                "高校课程与系统学习",
                "University online courses",
                "慕课 大学"
            ),
        ],
    },
    {
        id: "research",
        zh: "论文与科研",
        en: "Papers & research",
        sites: [
            site(
                "arxiv",
                "arXiv",
                "https://arxiv.org/",
                "论文预印本",
                "Research preprints",
                "论文 计算机 ai cs"
            ),
            site(
                "scholar",
                "Google Scholar",
                "https://scholar.google.com/",
                "学术文献检索",
                "Academic search",
                "谷歌学术 论文"
            ),
            site(
                "semantic",
                "Semantic Scholar",
                "https://www.semanticscholar.org/",
                "文献发现与关联",
                "Discover connected papers",
                "学术 搜索 引用"
            ),
            site(
                "openreview",
                "OpenReview",
                "https://openreview.net/",
                "会议论文与评审",
                "Papers & peer reviews",
                "iclr neurips 学术"
            ),
            site(
                "hfpapers",
                "HF Papers",
                "https://huggingface.co/papers",
                "AI 论文与社区讨论",
                "AI papers & discussion",
                "hugging face 研究"
            ),
            site(
                "overleaf",
                "Overleaf",
                "https://www.overleaf.com/",
                "协作撰写 LaTeX",
                "Collaborative LaTeX",
                "论文 排版 写作"
            ),
            site(
                "zotero",
                "Zotero",
                "https://www.zotero.org/",
                "文献与引用管理",
                "References & citations",
                "论文 文献"
            ),
            site(
                "connected",
                "Connected Papers",
                "https://www.connectedpapers.com/",
                "探索论文关联",
                "Explore paper connections",
                "文献 图谱"
            ),
            site(
                "dblp",
                "DBLP",
                "https://dblp.org/",
                "计算机文献索引",
                "CS bibliography",
                "作者 会议 论文"
            ),
        ],
    },
    {
        id: "practice",
        zh: "竞赛与项目实践",
        en: "Competitions & practice",
        sites: [
            site(
                "leetcode",
                "LeetCode",
                "https://leetcode.cn/",
                "算法与面试练习",
                "Algorithms & interviews",
                "力扣 刷题"
            ),
            site(
                "luogu",
                "洛谷",
                "https://www.luogu.com.cn/",
                "算法训练与题库",
                "Algorithm practice",
                "oj 编程"
            ),
            site(
                "codeforces",
                "Codeforces",
                "https://codeforces.com/",
                "算法竞赛社区",
                "Competitive programming",
                "比赛 acm"
            ),
            site(
                "kaggle-comp",
                "Kaggle 竞赛",
                "https://www.kaggle.com/competitions",
                "数据科学实战",
                "Data science competitions",
                "机器学习 比赛"
            ),
            site(
                "tianchi",
                "天池",
                "https://tianchi.aliyun.com/",
                "AI 竞赛与训练",
                "AI competitions & learning",
                "阿里 数据"
            ),
            site(
                "devpost",
                "Devpost",
                "https://devpost.com/",
                "黑客松与项目展示",
                "Hackathons & projects",
                "hackathon 比赛"
            ),
        ],
    },
    {
        id: "news",
        zh: "科技资讯与社区",
        en: "Technology & community",
        sites: [
            site(
                "hn",
                "Hacker News",
                "https://news.ycombinator.com/",
                "技术与创业讨论",
                "Tech & startup discussions",
                "新闻 科技"
            ),
            site(
                "trending",
                "GitHub Trending",
                "https://github.com/trending",
                "发现热门开源项目",
                "Discover open source",
                "趋势 github 代码"
            ),
            site(
                "jiqizhixin",
                "机器之心",
                "https://www.jiqizhixin.com/",
                "AI 研究与产业资讯",
                "AI research & industry",
                "新闻 科技"
            ),
            site(
                "qbitai",
                "量子位",
                "https://www.qbitai.com/",
                "AI 与前沿科技",
                "AI & emerging technology",
                "新闻"
            ),
            site(
                "mitreview",
                "MIT Tech Review",
                "https://www.technologyreview.com/",
                "科技趋势与影响",
                "Technology & its impact",
                "麻省理工 科技评论"
            ),
            site(
                "juejin",
                "掘金",
                "https://juejin.cn/",
                "开发经验与技术文章",
                "Developer knowledge",
                "社区 前端 后端"
            ),
        ],
    },
    {
        id: "campus",
        zh: "校园与学术服务",
        en: "Campus & academic services",
        sites: [
            site(
                "courses",
                "学在浙大",
                "https://courses.zju.edu.cn/",
                "课程与教学平台",
                "Courses & teaching",
                "浙江大学 学校"
            ),
            site(
                "zjulib",
                "浙大图书馆",
                "https://libweb.zju.edu.cn/",
                "馆藏与学术资源",
                "Library & research resources",
                "浙江大学 文献"
            ),
            site(
                "zju-git",
                "ZJU Git",
                "https://git.zju.edu.cn/",
                "校内代码协作",
                "Campus code collaboration",
                "浙江大学 仓库"
            ),
            site(
                "mirrors",
                "浙大开源镜像",
                "https://mirrors.zju.edu.cn/",
                "软件与系统镜像",
                "Open source mirrors",
                "浙江大学 linux 下载"
            ),
            site(
                "pta",
                "PTA",
                "https://pintia.cn/",
                "程序设计练习",
                "Programming practice",
                "浙大 数据结构 oj"
            ),
            site(
                "zjucourses",
                "浙大课程攻略",
                "https://github.com/QSCTech/zju-icicles",
                "公开课程学习资料",
                "Community course resources",
                "浙江大学 qsctech 学习"
            ),
        ],
    },
];
export const featuredIds = ["github", "huggingface", "chatgpt", "deepseek", "arxiv", "colab"];
export const allSites = directory.flatMap((group) => group.sites);
export function filterDirectory(query, category = "all") {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return directory
        .filter((group) => category === "all" || group.id === category)
        .map((group) => ({
            ...group,
            sites: group.sites.filter((entry) => {
                const haystack = [
                    entry.name,
                    ...Object.values(localizedNames).map((names) => names[entry.id] || ""),
                    entry.zh,
                    entry.en,
                    entry.keywords,
                    entry.url,
                    group.zh,
                    group.en,
                ]
                    .join(" ")
                    .toLocaleLowerCase();
                return terms.every((term) => haystack.includes(term));
            }),
        }))
        .filter((group) => group.sites.length);
}
