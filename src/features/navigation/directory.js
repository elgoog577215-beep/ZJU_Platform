import { localizedNames } from "./names.js";
// Public editorial allowlist. Never import browser exports or account-specific URLs here.
const site = (id, name, url, zh, en, keywords = "") => ({ id, name, url, zh, en, keywords });
const sections = [
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
        id: "campus",
        zh: "校园与学术服务",
        en: "Campus & academic services",
        sites: [
            site(
                "zdbk",
                "浙大本科",
                "https://zdbk.zju.edu.cn/",
                "本科选课与教务",
                "Undergraduate academic services",
                "浙江大学 选课 成绩 课表 教务"
            ),
            site(
                "eta",
                "ETA",
                "https://eta.zju.edu.cn/",
                "三全育人学生服务",
                "Student services",
                "浙江大学 三全育人 评奖评优 资助"
            ),
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
    {
        id: "office",
        zh: "办公与协作",
        en: "Office & collaboration",
        sites: [
            site(
                "qqdocs",
                "腾讯文档",
                "https://docs.qq.com/",
                "文档、表格与在线协作",
                "Documents & spreadsheets",
                "tencent 办公"
            ),
            site(
                "shimo",
                "石墨文档",
                "https://shimo.im/",
                "多人文档与表格",
                "Collaborative documents",
                "office 办公"
            ),
            site(
                "yuque",
                "语雀",
                "https://www.yuque.com/",
                "知识库与团队文档",
                "Knowledge bases",
                "笔记 文档"
            ),
            site(
                "notion",
                "Notion",
                "https://www.notion.com/",
                "笔记与项目工作区",
                "Notes & project workspace",
                "知识库 办公"
            ),
            site(
                "wps",
                "WPS",
                "https://www.wps.cn/",
                "文档、表格与演示",
                "Documents & presentations",
                "office ppt 办公"
            ),
            site(
                "feishu",
                "飞书",
                "https://www.feishu.cn/",
                "团队协作与多维表格",
                "Teamwork & databases",
                "lark 办公"
            ),
            site(
                "libreoffice",
                "LibreOffice",
                "https://www.libreoffice.org/",
                "开源办公套件",
                "Open-source office suite",
                "文档 表格 演示"
            ),
            site(
                "mubu",
                "幕布",
                "https://mubu.com/",
                "大纲笔记与思维导图",
                "Outlines & mind maps",
                "笔记"
            ),
            site(
                "seatable",
                "SeaTable",
                "https://seatable.cn/",
                "表格与协作数据库",
                "Tables & collaboration",
                "多维表格"
            ),
        ],
    },
    {
        id: "design",
        zh: "设计与图像",
        en: "Design & images",
        sites: [
            site(
                "canva",
                "Canva 可画",
                "https://www.canva.com/",
                "海报与演示设计",
                "Graphics & presentations",
                "素材 ppt"
            ),
            site(
                "gaoding",
                "稿定设计",
                "https://www.gaoding.com/",
                "平面设计与模板",
                "Graphic design templates",
                "海报 素材"
            ),
            site(
                "figma",
                "Figma",
                "https://www.figma.com/",
                "界面设计与原型",
                "Interface design & prototypes",
                "ui ux 设计"
            ),
            site(
                "photopea",
                "Photopea",
                "https://www.photopea.com/",
                "在线图像与 PSD 编辑",
                "Online image & PSD editor",
                "ps 图片"
            ),
            site(
                "removebg",
                "remove.bg",
                "https://www.remove.bg/",
                "图片背景去除",
                "Remove image backgrounds",
                "抠图"
            ),
            site(
                "squoosh",
                "Squoosh",
                "https://squoosh.app/",
                "浏览器图片压缩",
                "Browser image compression",
                "图片 压缩"
            ),
            site(
                "chuangkit",
                "创客贴",
                "https://www.chuangkit.com/",
                "在线设计与模板",
                "Online design & templates",
                "海报"
            ),
            site("bigjpg", "Bigjpg", "https://bigjpg.com/", "图片放大", "Image upscaling", "高清"),
            site(
                "iloveimg",
                "iLoveIMG",
                "https://www.iloveimg.com/",
                "图片裁剪与批量处理",
                "Batch image editing",
                "压缩"
            ),
        ],
    },
    {
        id: "assets",
        zh: "图片与视频素材",
        en: "Photos & video assets",
        sites: [
            site(
                "unsplash",
                "Unsplash",
                "https://unsplash.com/",
                "摄影图片素材",
                "Photography resources",
                "图片 素材"
            ),
            site(
                "pexels",
                "Pexels",
                "https://www.pexels.com/",
                "图片与视频素材",
                "Photos & videos",
                "图片 素材"
            ),
            site(
                "pixabay",
                "Pixabay",
                "https://pixabay.com/",
                "图片、视频与音频",
                "Images, video & audio",
                "素材"
            ),
            site(
                "freepik",
                "Freepik",
                "https://www.freepik.com/",
                "插画与设计素材",
                "Illustrations & design assets",
                "素材"
            ),
            site(
                "pngimg",
                "PNGimg",
                "https://pngimg.com/",
                "透明背景图片素材",
                "Transparent PNG images",
                "素材 png"
            ),
            site(
                "mixkit",
                "Mixkit",
                "https://mixkit.co/",
                "视频、音效与模板",
                "Video, sound & templates",
                "素材 音乐"
            ),
            site(
                "undraw",
                "unDraw",
                "https://undraw.co/",
                "可调色插画",
                "Customizable illustrations",
                "插画"
            ),
            site(
                "manypixels",
                "ManyPixels",
                "https://www.manypixels.co/gallery",
                "插画素材库",
                "Illustration gallery",
                "矢量"
            ),
            site(
                "humaaans",
                "Humaaans",
                "https://www.humaaans.com/",
                "人物插画组件",
                "Mix-and-match illustrations",
                "人物"
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
        id: "icons",
        zh: "图标与字体",
        en: "Icons & fonts",
        sites: [
            site(
                "iconfont",
                "Iconfont",
                "https://www.iconfont.cn/",
                "矢量图标与插画",
                "Vector icons & illustrations",
                "阿里 图标"
            ),
            site(
                "iconpark",
                "IconPark",
                "https://iconpark.oceanengine.com/",
                "可调整的图标库",
                "Customizable icon library",
                "字节 图标"
            ),
            site(
                "iconfinder",
                "Iconfinder",
                "https://www.iconfinder.com/",
                "图标与设计资源",
                "Icons & design resources",
                "素材"
            ),
            site(
                "100font",
                "100font",
                "https://www.100font.com/",
                "中文字体与授权信息",
                "Chinese fonts & licenses",
                "字体"
            ),
            site(
                "googlefonts",
                "Google Fonts",
                "https://fonts.google.com/",
                "网页与设计字体",
                "Web & design fonts",
                "字体"
            ),
            site(
                "fontawesome",
                "Font Awesome",
                "https://fontawesome.com/",
                "界面与网页图标",
                "Interface & web icons",
                "图标"
            ),
            site(
                "icons8",
                "Icons8",
                "https://icons8.com/",
                "图标与设计素材",
                "Icons & design assets",
                "图标"
            ),
            site(
                "iconstore",
                "IconStore",
                "https://iconstore.co/",
                "成套图标素材",
                "Icon collections",
                "图标"
            ),
        ],
    },
    {
        id: "diagrams",
        zh: "图表与灵感",
        en: "Diagrams & inspiration",
        sites: [
            site(
                "drawio",
                "draw.io",
                "https://app.diagrams.net/",
                "流程图与架构图",
                "Flowcharts & architecture",
                "绘图"
            ),
            site(
                "excalidraw",
                "Excalidraw",
                "https://excalidraw.com/",
                "手绘风格协作白板",
                "Sketch-style whiteboard",
                "流程图 绘图"
            ),
            site(
                "processon",
                "ProcessOn",
                "https://www.processon.com/",
                "思维导图与流程图",
                "Mind maps & flowcharts",
                "绘图"
            ),
            site(
                "huaban",
                "花瓣",
                "https://huaban.com/",
                "视觉设计灵感",
                "Visual design inspiration",
                "素材"
            ),
            site(
                "adobecolor",
                "Adobe Color",
                "https://color.adobe.com/",
                "配色与色彩工具",
                "Color palettes & tools",
                "设计"
            ),
            site(
                "dribbble",
                "Dribbble",
                "https://dribbble.com/",
                "设计作品与灵感",
                "Design work & inspiration",
                "ui ux"
            ),
            site(
                "zhongguose",
                "中国色",
                "https://zhongguose.com/",
                "中国传统色彩",
                "Traditional Chinese colors",
                "配色"
            ),
            site(
                "gitmind",
                "GitMind",
                "https://gitmind.cn/",
                "思维导图与脑图",
                "Mind mapping",
                "思维导图"
            ),
        ],
    },
    {
        id: "productivity",
        zh: "文档与效率",
        en: "Documents & utilities",
        sites: [
            site(
                "smallpdf",
                "Smallpdf",
                "https://smallpdf.com/",
                "PDF 编辑与转换",
                "PDF editing & conversion",
                "文档"
            ),
            site(
                "pdf24",
                "PDF24",
                "https://tools.pdf24.org/zh/",
                "PDF 合并、压缩与转换",
                "PDF merge & conversion",
                "文档"
            ),
            site(
                "tinypng",
                "TinyPNG",
                "https://tinypng.com/",
                "图片文件压缩",
                "Image compression",
                "图片"
            ),
            site(
                "docsmall",
                "Docsmall",
                "https://docsmall.com/",
                "图片与 PDF 处理",
                "Image & PDF utilities",
                "压缩 文档"
            ),
            site(
                "toollu",
                "在线工具",
                "https://tool.lu/",
                "文本、编码与开发工具",
                "Text & developer utilities",
                "tool lu"
            ),
            site(
                "aconvert",
                "Aconvert",
                "https://www.aconvert.com/",
                "文件格式转换",
                "File format conversion",
                "转换"
            ),
            site(
                "diffchecker",
                "Diffchecker",
                "https://www.diffchecker.com/",
                "文本与文件差异对比",
                "Text & file comparison",
                "文本"
            ),
        ],
    },
    {
        id: "presentations",
        zh: "演示与排版",
        en: "Presentations & publishing",
        sites: [
            site(
                "slidesgo",
                "Slidesgo",
                "https://slidesgo.com/",
                "演示模板与制作",
                "Presentation templates",
                "PPT"
            ),
            site(
                "showeet",
                "Showeet",
                "https://www.showeet.com/",
                "演示图表与模板",
                "Presentation diagrams & templates",
                "PPT"
            ),
            site(
                "1ppt",
                "第一PPT",
                "https://www.1ppt.com/",
                "PPT 模板与课件",
                "Slides & teaching templates",
                "演示"
            ),
            site(
                "ypppt",
                "优品PPT",
                "https://www.ypppt.com/",
                "PPT 模板与素材",
                "Presentation templates & assets",
                "演示"
            ),
            site(
                "mdnice",
                "墨滴",
                "https://mdnice.com/",
                "Markdown 排版",
                "Markdown publishing",
                "公众号 写作"
            ),
            site(
                "xiumi",
                "秀米",
                "https://xiumi.us/",
                "图文排版与制作",
                "Article layout & design",
                "公众号"
            ),
        ],
    },
    {
        id: "media",
        zh: "音频与视频工具",
        en: "Audio & video",
        sites: [
            site(
                "123apps",
                "123apps",
                "https://123apps.com/",
                "在线音视频编辑",
                "Online audio & video tools",
                "剪辑"
            ),
            site(
                "clipchamp",
                "Clipchamp",
                "https://clipchamp.com/",
                "视频剪辑与字幕",
                "Video editing & captions",
                "剪辑"
            ),
            site(
                "gifcap",
                "gifcap",
                "https://gifcap.dev/",
                "录屏制作 GIF",
                "Record screen to GIF",
                "录屏"
            ),
            site(
                "freesound",
                "Freesound",
                "https://freesound.org/",
                "声音与音效素材",
                "Sounds & audio samples",
                "音频"
            ),
            site(
                "bensound",
                "Bensound",
                "https://www.bensound.com/",
                "配乐素材",
                "Music for creative projects",
                "背景音乐"
            ),
            site(
                "audionautix",
                "Audionautix",
                "https://audionautix.com/",
                "音乐素材库",
                "Music library",
                "配乐"
            ),
        ],
    },
    {
        id: "reading",
        zh: "阅读与数字图书馆",
        en: "Reading & libraries",
        sites: [
            site(
                "gutenberg",
                "Project Gutenberg",
                "https://www.gutenberg.org/",
                "经典电子书",
                "Classic ebooks",
                "阅读"
            ),
            site(
                "shuge",
                "书格",
                "https://www.shuge.org/",
                "古籍与艺术数字资源",
                "Historical books & art",
                "古籍"
            ),
            site(
                "nlc",
                "国家图书馆",
                "https://www.nlc.cn/",
                "馆藏与数字资源",
                "National library resources",
                "图书"
            ),
            site(
                "zjlib",
                "浙江图书馆",
                "https://www.zjlib.cn/",
                "公共图书馆与数字阅读",
                "Public library & digital reading",
                "图书"
            ),
            site(
                "gushiwen",
                "古诗文网",
                "https://www.gushiwen.cn/",
                "古诗词与文言文",
                "Classical Chinese poetry",
                "古诗 文学"
            ),
            site(
                "allhistory",
                "全历史",
                "https://www.allhistory.com/",
                "历史与艺术知识",
                "History & art exploration",
                "历史"
            ),
        ],
    },
    {
        id: "mathematics",
        zh: "数学与科学工具",
        en: "Math & science tools",
        sites: [
            site(
                "wolfram",
                "WolframAlpha",
                "https://www.wolframalpha.com/",
                "计算与知识查询",
                "Computational knowledge",
                "数学"
            ),
            site(
                "geogebra",
                "GeoGebra",
                "https://www.geogebra.org/",
                "几何与函数可视化",
                "Geometry & graphing",
                "数学"
            ),
            site(
                "desmos",
                "Desmos",
                "https://www.desmos.com/calculator",
                "交互式函数绘图",
                "Interactive graphing calculator",
                "数学"
            ),
            site(
                "animagraffs",
                "Animagraffs",
                "https://animagraffs.com/",
                "机械与科学原理图解",
                "Visual explanations of mechanisms",
                "科学"
            ),
            site(
                "mygraphpaper",
                "MyGraphPaper",
                "https://www.mygraphpaper.com/",
                "网格与坐标纸生成",
                "Graph paper generator",
                "数学"
            ),
            site(
                "kingdraw",
                "KingDraw",
                "https://www.kingdraw.cn/",
                "化学结构绘图",
                "Chemical structure drawing",
                "化学"
            ),
        ],
    },
];
// Keep one flat directory. Related bookmark collections share a practical category.
const byId = Object.fromEntries(sections.map((section) => [section.id, section]));
const combine = (id, zh, en, related = [], extraSites = []) => ({
    ...byId[id],
    zh,
    en,
    sites: [...byId[id].sites, ...related.flatMap((key) => byId[key].sites), ...extraSites],
});
const mediaTools = byId.media.sites.slice(0, 3);
const audioAssets = byId.media.sites.slice(3);
export const directory = [
    byId.assistants,
    byId.models,
    byId.campus,
    combine("office", "办公与演示", "Office & presentations", ["presentations"]),
    byId.design,
    combine("assets", "图片与音视频素材", "Images, video & audio", [], audioAssets),
    byId["ai-dev"],
    byId.development,
    combine("learning", "课程与科学学习", "Courses & science", ["mathematics"]),
    combine("research", "论文与阅读", "Research & reading", ["reading"]),
    byId.practice,
    byId.news,
    byId.icons,
    byId.diagrams,
    combine("productivity", "文档与媒体工具", "Document & media tools", [], mediaTools),
];
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
