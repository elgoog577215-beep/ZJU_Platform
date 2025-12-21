const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function seed() {
  const db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  console.log('Clearing existing data...');
  
  await db.exec(`
    DROP TABLE IF EXISTS photos;
    DROP TABLE IF EXISTS music;
    DROP TABLE IF EXISTS videos;
    DROP TABLE IF EXISTS articles;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS event_categories;
    DROP TABLE IF EXISTS settings;
  `);

  console.log('Creating tables...');

  await db.exec(`
    CREATE TABLE photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      title TEXT,
      category TEXT,
      tags TEXT,
      size TEXT,
      gameType TEXT,
      gameDescription TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      deleted_at DATETIME
    );

    CREATE TABLE music (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      artist TEXT,
      duration INTEGER,
      cover TEXT,
      audio TEXT,
      category TEXT,
      tags TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      deleted_at DATETIME
    );

    CREATE TABLE videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      category TEXT,
      tags TEXT,
      thumbnail TEXT,
      video TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      deleted_at DATETIME
    );

    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      excerpt TEXT,
      tag TEXT,
      tags TEXT,
      content TEXT,
      cover TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      deleted_at DATETIME
    );

    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      location TEXT,
      category TEXT,
      tags TEXT,
      status TEXT,
      image TEXT,
      description TEXT,
      content TEXT,
      link TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      deleted_at DATETIME
    );

    CREATE TABLE event_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );

    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log('Seeding data...');

  // Photos
  const photos = [
    {
      id: 1,
      url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=60",
      title: "山峰",
      category: "Nature",
      size: "large",
      gameType: "skyfall",
      gameDescription: "滑翔穿过山峰！避开障碍物。"
    },
    {
      id: 2,
      url: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=800&auto=format&fit=crop&q=60",
      title: "霓虹城市",
      category: "Urban",
      size: "small",
      gameType: "runner",
      gameDescription: "在赛博城市中竞速！收集能量。"
    },
    {
      id: 3,
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60",
      title: "人像研究",
      category: "Portrait",
      size: "tall",
      gameType: "puzzle",
      gameDescription: "重组记忆。"
    },
    {
      id: 4,
      url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&auto=format&fit=crop&q=60",
      title: "时装周",
      category: "Fashion",
      size: "small",
      gameType: "shutter",
      gameDescription: "捕捉完美的姿势！"
    },
    {
      id: 5,
      url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=60",
      title: "优胜美地",
      category: "Nature",
      size: "wide",
      gameType: "skyfall",
      gameDescription: "驾驭山谷之风。"
    },
    {
      id: 6,
      url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=60",
      title: "相机镜头",
      category: "Photography",
      size: "small",
      gameType: "shutter",
      gameDescription: "快速对焦拍摄！"
    },
    {
      id: 7,
      url: "https://images.unsplash.com/photo-1552168324-d612d77725e3?w=800&auto=format&fit=crop&q=60",
      title: "街头生活",
      category: "Urban",
      size: "tall",
      gameType: "runner",
      gameDescription: "躲避城市交通。"
    },
    {
      id: 8,
      url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=60",
      title: "迷雾森林",
      category: "Nature",
      size: "large",
      gameType: "skyfall",
      gameDescription: "在迷雾中漂移。"
    },
    {
      id: 9,
      url: "https://images.unsplash.com/photo-1551316679-9c6ae9dec224?w=800&auto=format&fit=crop&q=60",
      title: "极简主义",
      category: "Abstract",
      size: "small",
      gameType: "puzzle",
      gameDescription: "寻找隐藏的模式。"
    },
    {
      id: 10,
      url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&auto=format&fit=crop&q=60",
      title: "高山湖泊",
      category: "Nature",
      size: "wide",
      gameType: "skyfall",
      gameDescription: "反思旅程。"
    },
    {
      id: 11,
      url: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&auto=format&fit=crop&q=60",
      title: "忠诚伙伴",
      category: "Portrait",
      size: "small",
      gameType: "puzzle",
      gameDescription: "忠诚的朋友。"
    },
    {
      id: 12,
      url: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&auto=format&fit=crop&q=60",
      title: "雨夜",
      category: "Urban",
      size: "tall",
      gameType: "runner",
      gameDescription: "在雨中奔跑。"
    },
    {
      id: 13,
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60",
      title: "海岸线",
      category: "Nature",
      size: "wide",
      gameType: "skyfall",
      gameDescription: "沿着海岸飞翔。"
    },
    {
      id: 14,
      url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop&q=60",
      title: "现代女性",
      category: "Portrait",
      size: "large",
      gameType: "puzzle",
      gameDescription: "拼凑面孔。"
    },
    {
      id: 15,
      url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=60",
      title: "几何结构",
      category: "Abstract",
      size: "small",
      gameType: "puzzle",
      gameDescription: "解开几何谜题。"
    },
    {
      id: 16,
      url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=60",
      title: "街头风格",
      category: "Fashion",
      size: "tall",
      gameType: "shutter",
      gameDescription: "捕捉时尚瞬间。"
    },
    {
      id: 17,
      url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=60",
      title: "流动的光",
      category: "Abstract",
      size: "wide",
      gameType: "puzzle",
      gameDescription: "连接光线。"
    },
    {
      id: 18,
      url: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=800&auto=format&fit=crop&q=60",
      title: "朋友",
      category: "Portrait",
      size: "small",
      gameType: "puzzle",
      gameDescription: "回忆美好时光。"
    },
    {
      id: 19,
      url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop&q=60",
      title: "摩天大楼",
      category: "Urban",
      size: "large",
      gameType: "runner",
      gameDescription: "攀登高峰。"
    },
    {
      id: 20,
      url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=60",
      title: "静谧森林",
      category: "Nature",
      size: "tall",
      gameType: "skyfall",
      gameDescription: "在树林中穿梭。"
    },
    {
      id: 21,
      url: "https://images.unsplash.com/photo-1558981806-ec527fa84c3d?w=800&auto=format&fit=crop&q=60",
      title: "机车",
      category: "Photography",
      size: "small",
      gameType: "shutter",
      gameDescription: "捕捉速度。"
    },
    {
      id: 22,
      url: "https://images.unsplash.com/photo-1542206391-78c48b40dd5f?w=800&auto=format&fit=crop&q=60",
      title: "秋色",
      category: "Nature",
      size: "wide",
      gameType: "skyfall",
      gameDescription: "感受秋风。"
    }
  ];

  for (const photo of photos) {
    await db.run(
      'INSERT INTO photos (url, title, category, tags, size, gameType, gameDescription, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [photo.url, photo.title, photo.category, photo.tags || '', photo.size, photo.gameType, photo.gameDescription, photo.featured ? 1 : 0]
    );
  }

  // Music
  const music = [
    { id: 1, title: "霓虹地平线", artist: "合成波少年", duration: 225, cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 2, title: "赛博之雨", artist: "数字梦境", duration: 260, cover: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: 3, title: "午夜城市", artist: "守夜人", duration: 192, cover: "https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: 4, title: "星际航行", artist: "太空学员", duration: 305, cover: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: 5, title: "复古驾驶", artist: "激光网格", duration: 210, cover: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { id: 6, title: "梦境", artist: "空灵思维", duration: 245, cover: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
    { id: 7, title: "深海信号", artist: "声纳", duration: 300, cover: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
    { id: 8, title: "量子跃迁", artist: "光速", duration: 180, cover: "https://images.unsplash.com/photo-1506318137071-a8bcbf670b27?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
    { id: 9, title: "机械心跳", artist: "机器人", duration: 240, cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
    { id: 10, title: "失落的频率", artist: "电波", duration: 215, cover: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
    { id: 11, title: "虚拟日落", artist: "像素", duration: 270, cover: "https://images.unsplash.com/photo-1495615080073-6b89c98beddb?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
    { id: 12, title: "引力波", artist: "黑洞", duration: 290, cover: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1000&auto=format&fit=crop", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" }
  ];

  for (const track of music) {
    await db.run(
      'INSERT INTO music (title, artist, duration, cover, audio, category, tags, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [track.title, track.artist, track.duration, track.cover, track.audio, 'music', track.tags || '', track.featured ? 1 : 0]
    );
  }

  // Videos
  const videos = [
    { id: 1, title: "虚空", category: "动画", thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4" },
    { id: 2, title: "数字灵魂", category: "短片", thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4" },
    { id: 3, title: "霓虹之夜", category: "音乐视频", thumbnail: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4" },
    { id: 4, title: "赛博城市", category: "作品集锦", thumbnail: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4" },
    { id: 5, title: "抽象流动", category: "实验", thumbnail: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4" },
    { id: 6, title: "未来科技", category: "纪录片", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4" },
    { id: 7, title: "深空探索", category: "纪录片", thumbnail: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4" },
    { id: 8, title: "粒子风暴", category: "实验", thumbnail: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4" },
    { id: 9, title: "城市节奏", category: "短片", thumbnail: "https://images.unsplash.com/photo-1495615080073-6b89c98beddb?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4" },
    { id: 10, title: "虚拟现实", category: "动画", thumbnail: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4" },
    { id: 11, title: "海洋之心", category: "纪录片", thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop", video: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4" }
  ];

  for (const video of videos) {
    await db.run(
      'INSERT INTO videos (title, category, thumbnail, video, featured) VALUES (?, ?, ?, ?, ?)',
      [video.title, video.category, video.thumbnail, video.video, video.featured ? 1 : 0]
    );
  }

  // Articles
  const articles = [
  { 
    id: 1, 
    title: "数字艺术的未来", 
    date: "2024-10-24", 
    excerpt: "探索人工智能、虚拟现实与传统绘画技巧的交汇点。", 
    tag: "观点",
    content: `
      <p class="mb-4">数字艺术领域正在以前所未有的速度演变。随着生成式 AI 和沉浸式 VR 体验的出现，“艺术”的定义正在被重写。</p>
      <p class="mb-4">传统上，艺术局限于物理媒介——画布、石头、纸张。今天，像素和顶点是新的粘土。但这是否削弱了人的因素？我认为恰恰相反。</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-4">AI 协作者</h3>
      <p class="mb-4">AI 工具不是在取代艺术家；而是在赋能他们。就像照相机没有扼杀绘画，而是将其从现实主义的需求中解放出来一样，AI 正在将数字艺术家从技术束缚中解放出来，让纯粹的想象力占据中心舞台。</p>
      <p>展望未来，最成功的艺术家将是那些能够融合这些技术的人——将人类创造力的原始情感与机器智能的无限可能性相结合。</p>
    `
  },
  { 
    id: 2, 
    title: "幕后揭秘：天际坠落", 
    date: "2024-09-12", 
    excerpt: "深入解析我最新的 WebGL 游戏的开发过程。", 
    tag: "开发日志",
    content: `
      <p class="mb-4">Skyfall（天际坠落）最初只是 Three.js 中的一个简单实验：“我能让飞机飞过无限的云层吗？”答案是肯定的，但让它<em>感觉</em>良好才是真正的挑战。</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-4">性能优化</h3>
      <p class="mb-4">最大的障碍之一是在渲染数千个云粒子和体积光的同时保持 60 FPS。解决方案涉及实例化网格渲染和自定义着色器，在 GPU 而非 CPU 上处理运动。</p>
      <p class="mb-4">这种方法使我们能够从 100 个对象扩展到 10,000 个对象，而几乎没有性能成本。</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-4">飞行物理</h3>
      <p>我们要的不是模拟器；我们要的是街机感。通过将空气动力学模型简化为仅包含推力、阻力和一个“趣味因子”向量，我们实现了既直观又灵敏的控制。</p>
    `
  },
  { 
    id: 3, 
    title: "代码中的极简主义", 
    date: "2024-08-05", 
    excerpt: "为什么少写代码通常能带来更好、更易维护的软件。", 
    tag: "技术",
    content: `
      <p class="mb-4">“完美的达成，不是当没有什么可以添加时，而是当没有什么可以去掉时。” —— 安托万·德·圣埃克苏佩里</p>
      <p class="mb-4">在软件工程中，复杂性是敌人。你写的每一行代码都是一种负债——它需要被测试、维护，并最终被重构。</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-4">删除的艺术</h3>
      <p class="mb-4">我发现我效率最高的日子往往是代码行数为负的日子。删除无用的功能、简化逻辑和移除依赖项会让代码库更健康。</p>
      <p>下次当你准备安装一个新的库或编写一个复杂的辅助函数时，问问自己：有没有更简单的方法？</p>
    `
  },
  { 
    id: 4, 
    title: "网页设计中的色彩理论", 
    date: "2024-07-15", 
    excerpt: "如何使用调色板来唤起情感并引导用户行为。", 
    tag: "设计",
    content: `
      <p class="mb-4">颜色不仅仅是装饰；它是一种语言。它在甚至我们还没意识到的情况下就与我们的潜意识对话并影响我们的决定。</p>
      <p class="mb-4">在网页设计中，“60-30-10”规则之所以经典是有原因的。60% 的主色，30% 的辅助色，10% 的强调色。这种平衡确保了你的设计感觉连贯而不压抑。</p>
      <p>对于“Lumos”，我选择了带有霓虹青色点缀的暗色主题，以唤起一种未来主义的神秘感和科技优雅感。</p>
    `
  },
  { 
    id: 5, 
    title: "胶片摄影的静谧力量", 
    date: "2024-06-02", 
    excerpt: "在数字世界中重新发现模拟过程的乐趣。", 
    tag: "摄影",
    content: `
      <p class="mb-4">在一个我们可以一分钟拍 1000 张照片的时代，36 张胶卷的限制是一种礼物。它迫使你慢下来，思考，在按下快门之前真正地<em>看</em>。</p>
      <p class="mb-4">冲洗胶卷有一种切实的魔力——化学药品的味道，房间的黑暗，以及看到你的图像从底片中显现出来的期待。</p>
      <p>胶片颗粒增加了数字滤镜仍然难以完美复制的质感和温暖。这不仅仅是一种美学；这是一种感觉。</p>
    `
  },
  { 
    id: 6, 
    title: "沉浸式音频体验", 
    date: "2024-05-18", 
    excerpt: "空间音频如何改变我们体验数字媒体的方式。", 
    tag: "技术",
    content: `
      <p class="mb-4">声音不仅仅是我们听到的东西，它是我们感受环境的关键。随着 VR 和 AR 的发展，空间音频正在成为创造沉浸感不可或缺的一部分。</p>
      <p class="mb-4">双耳录音技术让我们能够通过耳机体验到声音的方向和距离，仿佛身临其境。这对于游戏和电影来说是一个巨大的飞跃。</p>
      <p>未来的界面可能不仅仅是视觉的，而是听觉的。想象一下，通过声音的微妙变化来导航数字空间。</p>
    `
  },
  { 
    id: 7, 
    title: "生成式艺术的伦理", 
    date: "2024-04-30", 
    excerpt: "当机器开始创作时，谁拥有版权？", 
    tag: "观点",
    content: `
      <p class="mb-4">AI 生成的艺术作品引发了关于原创性和版权的激烈争论。如果一个 AI 是在数百万张受版权保护的图像上训练出来的，那么它的输出属于谁？</p>
      <p class="mb-4">我们需要重新思考“作者”的定义。也许未来的艺术家更像是策展人或导演，指导 AI 产生特定的结果。</p>
      <p>这是一个法律和道德的灰色地带，我们需要在保护人类创造力和拥抱技术进步之间找到平衡。</p>
    `
  },
  { 
    id: 8, 
    title: "独立游戏开发的苦与乐", 
    date: "2024-04-12", 
    excerpt: "从零开始构建一个世界的个人旅程。", 
    tag: "开发日志",
    content: `
      <p class="mb-4">做独立游戏是一场孤独的马拉松。你既是程序员，又是美术，还是音效师和市场经理。每一个像素、每一行代码都出自你手。</p>
      <p class="mb-4">但当你看到玩家沉浸在你创造的世界中，体验你设计的故事时，所有的辛苦都值得了。</p>
      <p>保持动力的关键是设定小目标，并庆祝每一个微小的胜利。不要试图一口气造出罗马，一块砖一块砖地来。</p>
    `
  },
  { 
    id: 9, 
    title: "UI 设计中的微交互", 
    date: "2024-03-25", 
    excerpt: "小细节如何产生大影响。", 
    tag: "设计",
    content: `
      <p class="mb-4">微交互是那些由于用户操作而发生的微小动画或反馈。比如点赞时的心跳动画，或者下拉刷新时的加载指示器。</p>
      <p class="mb-4">这些细节看似微不足道，但它们赋予了界面生命力。它们告诉用户：系统正在工作，你的操作已被接收。</p>
      <p>好的微交互应该是几乎不可见的——它们感觉自然、流畅，增强了体验而不是打断它。</p>
    `
  },
  { 
    id: 10, 
    title: "赛博朋克美学指南", 
    date: "2024-03-10", 
    excerpt: "霓虹灯、雨夜与高科技低生活的视觉语言。", 
    tag: "艺术",
    content: `
      <p class="mb-4">赛博朋克不仅仅是科幻，它是一种独特的视觉风格。高对比度的霓虹色调、潮湿的街道、复杂的机械结构，构成了这种美学的核心。</p>
      <p class="mb-4">在设计赛博朋克风格的作品时，光影是关键。利用发光材质和体积光来创造氛围。</p>
      <p>但不要忘记“低生活”的部分。破败的建筑、混乱的电线和涂鸦，与高科技元素形成对比，才能讲述完整的故事。</p>
    `
  }
  ];

  for (const article of articles) {
    await db.run(
      'INSERT INTO articles (title, date, excerpt, tag, tags, content, cover, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [article.title, article.date, article.excerpt, article.tag, article.tags || article.tag, article.content, article.cover || null, article.featured ? 1 : 0]
    );
  }

  // Events
  const events = [
  {
    id: 1,
    title: "全球 AI 艺术黑客马拉松 2024",
    date: "2024-11-15",
    location: "线上 / 旧金山",
    category: "比赛",
    status: "Upcoming",
    image: "https://images.unsplash.com/photo-1592478411213-61535fdd861d?q=80&w=1000&auto=format&fit=crop",
    description: "与来自世界各地的艺术家和开发者一起，拓展生成式艺术的边界。48小时的编码、创作与协作。",
    content: "<p>全球 AI 艺术黑客马拉松回归！今年的主题是‘共生’。人类创造力与机器智能如何共存并相互增强？</p><p>奖品包括 1 万美元的奖金、云服务额度以及《数字艺术月刊》的专题报道。</p>"
  },
  {
    id: 2,
    title: "社区科技教育工作坊",
    date: "2024-10-05",
    location: "市图书馆 302 室",
    category: "志愿者",
    status: "Past",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1000&auto=format&fit=crop",
    description: "向老年人教授基础编程和数字素养。通过科技连接两代人的美好下午。",
    content: "<p>我们与当地图书馆合作举办了这次工作坊。看到老人们写下第一行 Python 代码时的兴奋，真是太棒了！</p>"
  },
  {
    id: 3,
    title: "WebGL 的未来",
    date: "2024-12-01",
    location: "科技中心礼堂",
    category: "讲座",
    status: "Upcoming",
    image: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=1000&auto=format&fit=crop",
    description: "深入探讨基于浏览器的图形技术的最新进展。来自主要浏览器厂商和游戏工作室的特邀嘉宾。",
    content: "<p>主题将包括 WebGPU、浏览器光线追踪以及 Web 3D 资产优化。会后有交流环节。</p>"
  },
  {
    id: 4,
    title: "生态代码挑战赛",
    date: "2024-09-20",
    location: "绿谷公园",
    category: "比赛",
    status: "Past",
    image: "https://images.unsplash.com/photo-1497250681960-ef04820a93bf?q=80&w=1000&auto=format&fit=crop",
    description: "为当地环境问题构建可持续的技术解决方案。团队竞争创造最佳的碳足迹追踪应用。",
    content: "<p>获胜团队创建了一个面向高中生的垃圾分类游戏化应用。目前正在三所当地学校试运行！</p>"
  },
  {
    id: 5,
    title: "VR 公益行动",
    date: "2025-01-10",
    location: "虚拟空间",
    category: "志愿者",
    status: "Upcoming",
    image: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=1000&auto=format&fit=crop",
    description: "为住院儿童创造 VR 体验。我们需要 3D 建模师、故事讲述者和 Unity 开发者。",
    content: "<p>我们的目标是将外面的世界带给那些无法离开病房的孩子。我们正在建造一个虚拟动物园和一个空间站体验。</p>"
  },
  // New Events
  {
    id: 6,
    title: "创意编程工作坊",
    date: "2025-02-15",
    location: "艺术学院",
    category: "工作坊",
    status: "Upcoming",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=60",
    description: "学习如何使用 Processing 和 p5.js 创作视觉艺术。适合初学者。",
    content: "<p>无论你是设计师还是程序员，这里都有你发挥的空间。我们将从基础开始，最终创作出属于你自己的生成艺术作品。</p>"
  },
  {
    id: 7,
    title: "数字遗产论坛",
    date: "2024-08-12",
    location: "线上",
    category: "讲座",
    status: "Past",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
    description: "探讨在数字时代如何保存和传承人类文化遗产。",
    content: "<p>专家小组讨论关于数据持久性、数字考古学以及人工智能在文化保护中的作用。</p>"
  },
  {
    id: 8,
    title: "24小时游戏开发挑战",
    date: "2025-03-20",
    location: "创新中心",
    category: "比赛",
    status: "Upcoming",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=60",
    description: "在24小时内从零开始制作一款游戏。主题将在活动开始时公布。",
    content: "<p>挑战极限，激发潜能。我们提供食物、饮料和休息区，你只需要带上你的电脑和创意。</p>"
  },
  {
    id: 9,
    title: "科技助老公益日",
    date: "2024-11-05",
    location: "社区中心",
    category: "志愿者",
    status: "Past",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&auto=format&fit=crop&q=60",
    description: "帮助社区老人解决智能手机使用难题，跨越数字鸿沟。",
    content: "<p>一对一辅导，耐心解答。让科技不再是障碍，而是连接亲情的桥梁。</p>"
  },
  {
    id: 10,
    title: "沉浸式叙事研讨会",
    date: "2025-04-10",
    location: "VR 实验室",
    category: "工作坊",
    status: "Upcoming",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e63?w=800&auto=format&fit=crop&q=60",
    description: "探索 VR/AR 环境下的非线性叙事技巧。",
    content: "<p>如何引导观众的注意力？如何在自由探索与故事推进之间取得平衡？来这里寻找答案。</p>"
  }
  ];

  for (const event of events) {
    await db.run(
      'INSERT INTO events (title, date, location, category, status, image, description, content, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [event.title, event.date, event.location, event.category, event.status, event.image, event.description, event.content, event.featured ? 1 : 0]
    );
  }

  console.log('Seeding completed.');
  await db.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
