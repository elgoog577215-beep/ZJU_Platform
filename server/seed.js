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
      size TEXT,
      gameType TEXT,
      gameDescription TEXT,
      featured BOOLEAN DEFAULT 0
    );

    CREATE TABLE music (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      artist TEXT,
      duration TEXT,
      cover TEXT,
      audio TEXT,
      featured BOOLEAN DEFAULT 0
    );

    CREATE TABLE videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      category TEXT,
      thumbnail TEXT,
      video TEXT,
      featured BOOLEAN DEFAULT 0
    );

    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      excerpt TEXT,
      tag TEXT,
      content TEXT,
      cover TEXT,
      featured BOOLEAN DEFAULT 0
    );

    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      location TEXT,
      category TEXT,
      status TEXT,
      image TEXT,
      description TEXT,
      content TEXT,
      featured BOOLEAN DEFAULT 0
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
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop',
      title: 'Neon City',
      category: '赛博朋克',
      size: '4MB',
      gameType: '科幻',
      gameDescription: 'A futuristic city bathed in neon lights.',
      featured: true
    },
    {
      url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop',
      title: 'Virtual Reality',
      category: '科技',
      size: '3.2MB',
      gameType: '模拟',
      gameDescription: 'Immersive VR experience.',
      featured: true
    },
    {
      url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
      title: 'Retro Gaming',
      category: '复古',
      size: '2.1MB',
      gameType: '街机',
      gameDescription: 'Classic arcade vibes.',
      featured: true
    },
    {
      url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop',
      title: 'Live Concert',
      category: '活动',
      size: '5MB',
      gameType: '现场',
      gameDescription: 'Energy of the crowd.'
    },
    {
      url: 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?w=800&auto=format&fit=crop',
      title: 'Anime Style',
      category: '艺术',
      size: '1.5MB',
      gameType: '视觉小说',
      gameDescription: 'Hand-drawn aesthetic.'
    },
    {
      url: 'https://images.unsplash.com/photo-1614728853913-1e22ba6e8a75?w=800&auto=format&fit=crop',
      title: 'Space Exploration',
      category: '科幻',
      size: '6MB',
      gameType: '冒险',
      gameDescription: 'Journey to the stars.'
    },
    {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop',
      title: 'Industrial Mech',
      category: '赛博朋克',
      size: '4.5MB',
      gameType: '动作',
      gameDescription: 'Heavy machinery and robotics.'
    },
    {
      url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop',
      title: 'Cyber Security',
      category: '科技',
      size: '2.8MB',
      gameType: '益智',
      gameDescription: 'Hacking terminal interface.'
    },
    {
      url: 'https://images.unsplash.com/photo-1614332287897-cdc485fa562d?w=800&auto=format&fit=crop',
      title: 'Coming Soon',
      category: '预告',
      size: '3.0MB',
      gameType: '策略',
      gameDescription: 'A glimpse into the future.'
    },
    {
      url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop',
      title: 'Abstract Flow',
      category: '艺术',
      size: '5.2MB',
      gameType: '休闲',
      gameDescription: 'Relaxing visual patterns.'
    },
    {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
      title: 'Digital Waves',
      category: '抽象',
      size: '4.1MB',
      gameType: '节奏',
      gameDescription: 'Music-driven visuals.'
    },
    {
      url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop',
      title: 'Neon Sign',
      category: '赛博朋克',
      size: '2.5MB',
      gameType: '模拟',
      gameDescription: 'City nightlife simulation.'
    },
    {
      url: 'https://images.unsplash.com/photo-1506318137071-a8bcbf670b27?w=800&auto=format&fit=crop',
      title: 'Mountain Peak',
      category: '自然',
      size: '3.8MB',
      gameType: '冒险',
      gameDescription: 'Summit the highest peaks.'
    },
    {
      url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop',
      title: 'Urban Jungle',
      category: '建筑',
      size: '4.2MB',
      gameType: '模拟',
      gameDescription: 'Navigate the concrete maze.'
    },
    {
      url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop',
      title: 'Synthwave Sunset',
      category: '复古',
      size: '2.9MB',
      gameType: '竞速',
      gameDescription: 'Drive into the horizon.'
    },
    {
      url: 'https://images.unsplash.com/photo-1535378437323-9555f3747975?w=800&auto=format&fit=crop',
      title: 'Deep Ocean',
      category: '自然',
      size: '3.5MB',
      gameType: '生存',
      gameDescription: 'Explore the abyss.'
    },
    {
      url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&auto=format&fit=crop',
      title: 'Cyber Samurai',
      category: '角色',
      size: '4.8MB',
      gameType: '动作',
      gameDescription: 'Warrior of the future.'
    },
    {
      url: 'https://images.unsplash.com/photo-1515462277126-2dd0c162007a?w=800&auto=format&fit=crop',
      title: 'Retro Console',
      category: '游戏',
      size: '2.3MB',
      gameType: '历史',
      gameDescription: 'The golden age of gaming.'
    },
    {
      url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop',
      title: 'Data Stream',
      category: '科技',
      size: '3.1MB',
      gameType: '益智',
      gameDescription: 'Decode the matrix.'
    },
    {
      url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop',
      title: 'Holographic UI',
      category: '设计',
      size: '2.7MB',
      gameType: '科幻',
      gameDescription: 'Interactive future interfaces.'
    },
    // More New Photos
    {
      url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&auto=format&fit=crop',
      title: 'Code Editor',
      category: '科技',
      size: '2.4MB',
      gameType: '模拟',
      gameDescription: 'The art of programming.'
    },
    {
      url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop',
      title: 'Streaming Setup',
      category: '游戏',
      size: '3.6MB',
      gameType: '生活',
      gameDescription: 'Broadcast yourself.'
    },
    {
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop',
      title: 'Orbit',
      category: '科幻',
      size: '5.5MB',
      gameType: '策略',
      gameDescription: 'Command the fleet.'
    },
    {
      url: 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=800&auto=format&fit=crop',
      title: 'Drone Shot',
      category: '科技',
      size: '4.0MB',
      gameType: '模拟',
      gameDescription: 'Fly high above.'
    },
    {
      url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=800&auto=format&fit=crop',
      title: 'Gold Circuit',
      category: '抽象',
      size: '3.3MB',
      gameType: '益智',
      gameDescription: 'Connect the nodes.'
    },
    {
      url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
      title: 'Arcade Night',
      category: '复古',
      size: '2.8MB',
      gameType: '街机',
      gameDescription: 'High scores only.'
    },
    {
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
      title: 'Liquid Metal',
      category: '抽象',
      size: '4.7MB',
      gameType: '艺术',
      gameDescription: 'Fluid dynamics.'
    },
    {
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
      title: 'Chipset',
      category: '科技',
      size: '3.9MB',
      gameType: '模拟',
      gameDescription: 'Build your PC.'
    },
    {
      url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop',
      title: 'Dark Moody',
      category: '艺术',
      size: '2.2MB',
      gameType: '恐怖',
      gameDescription: 'Survive the night.'
    },
    {
      url: 'https://images.unsplash.com/photo-1592478411213-61535fdd861d?w=800&auto=format&fit=crop',
      title: 'Character Design',
      category: '角色',
      size: '5.1MB',
      gameType: '角色扮演',
      gameDescription: 'Create your hero.'
    }
  ];

  for (const photo of photos) {
    await db.run(
      'INSERT INTO photos (url, title, category, size, gameType, gameDescription, featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [photo.url, photo.title, photo.category, photo.size, photo.gameType, photo.gameDescription, photo.featured ? 1 : 0]
    );
  }

  // Music
  const music = [
    {
      title: 'Cyberpunk City',
      artist: 'Synthwave Boy',
      duration: '3:45',
      cover: 'https://images.unsplash.com/photo-1614726365723-49cfae927827?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      featured: true
    },
    {
      title: 'Neon Dreams',
      artist: 'Retro Future',
      duration: '4:20',
      cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      featured: true
    },
    {
      title: 'Digital Rain',
      artist: 'Matrix Core',
      duration: '3:15',
      cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      featured: true
    },
    {
      title: 'Night Drive',
      artist: 'Kavinsky Style',
      duration: '5:10',
      cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      featured: true
    },
    {
      title: 'Glitch in the System',
      artist: 'Error 404',
      duration: '2:55',
      cover: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      featured: true
    },
    {
      title: 'Future Bass',
      artist: 'Bass Drop',
      duration: '3:30',
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'
    },
    {
      title: 'Ambient Space',
      artist: 'Star Gazer',
      duration: '6:00',
      cover: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'
    },
    {
      title: 'Retro Arcade',
      artist: '8-Bit Hero',
      duration: '2:45',
      cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
    },
    {
      title: 'Lo-Fi Study Beats',
      artist: 'Chill Cow',
      duration: '4:15',
      cover: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'
    },
    {
      title: 'Epic Orchestral',
      artist: 'Hans Score',
      duration: '5:30',
      cover: 'https://images.unsplash.com/photo-1507838153414-b4b713384ebd?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
    },
    {
      title: 'Smooth Jazz',
      artist: 'Sax Master',
      duration: '3:50',
      cover: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3'
    },
    {
      title: 'Techno Bunker',
      artist: 'Deep Bass',
      duration: '6:45',
      cover: 'https://images.unsplash.com/photo-1594623930572-300a3011d9ae?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3'
    },
    {
      title: 'Acoustic Morning',
      artist: 'Guitar Guy',
      duration: '3:10',
      cover: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3'
    },
    // More New Music
    {
      title: 'Midnight Run',
      artist: 'Dark Synth',
      duration: '4:05',
      cover: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3'
    },
    {
      title: 'Piano Dreams',
      artist: 'Melody Maker',
      duration: '3:55',
      cover: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3'
    },
    {
      title: 'Heavy Metal',
      artist: 'Iron Clad',
      duration: '4:30',
      cover: 'https://images.unsplash.com/photo-1511735111819-9a3f77ebd307?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
    },
    {
      title: 'Pop Hit',
      artist: 'Star Singer',
      duration: '3:20',
      cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    {
      title: 'Electric Groove',
      artist: 'Funky Bot',
      duration: '3:40',
      cover: 'https://images.unsplash.com/photo-1459749411177-8c4750bb09d0?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    {
      title: 'Deep House',
      artist: 'Club Mix',
      duration: '5:15',
      cover: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&auto=format&fit=crop',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    }
  ];

  for (const track of music) {
    await db.run(
      'INSERT INTO music (title, artist, duration, cover, audio, featured) VALUES (?, ?, ?, ?, ?, ?)',
      [track.title, track.artist, track.duration, track.cover, track.audio, track.featured ? 1 : 0]
    );
  }

  // Videos
  const videos = [
    {
      title: 'Cyberpunk 2077 Gameplay',
      category: '游戏',
      thumbnail: 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
      featured: true
    },
    {
      title: 'Future Tech Showcase',
      category: '科技',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
      featured: true
    },
    {
      title: 'Digital Art Tutorial',
      category: '艺术',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
      featured: true
    },
    {
      title: 'Synthwave Visualizer',
      category: '音乐',
      thumbnail: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
    },
    {
      title: 'VR Experience Demo',
      category: '科技',
      thumbnail: 'https://images.unsplash.com/photo-1622979135225-d2ba269fb1bd?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4'
    },
    {
      title: 'Indie Game Trailer',
      category: '游戏',
      thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
    },
    {
      title: 'Nature Documentary',
      category: '自然',
      thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4'
    },
    {
      title: 'Space Launch',
      category: '科幻',
      thumbnail: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
    },
    {
      title: 'Cooking Masterclass',
      category: '生活',
      thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4'
    },
    {
      title: 'Animated Short Film',
      category: '动画',
      thumbnail: 'https://images.unsplash.com/photo-1626544827763-d516dce335ca?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
    },
    // More New Videos
    {
      title: 'Travel Vlog: Tokyo',
      category: '生活',
      thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4'
    },
    {
      title: 'Speed Painting',
      category: '艺术',
      thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
    },
    {
      title: 'Esports Finals',
      category: '游戏',
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4'
    },
    {
      title: 'Product Unboxing',
      category: '科技',
      thumbnail: 'https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
    },
    {
      title: 'Yoga Routine',
      category: '生活',
      thumbnail: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/sintel/trailer.mp4'
    },
    {
      title: 'Wildlife Photography',
      category: '自然',
      thumbnail: 'https://images.unsplash.com/photo-1472396961693-142e6e596e35?w=800&auto=format&fit=crop',
      video: 'https://media.w3.org/2010/05/bunny/trailer.mp4'
    }
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
      title: 'The Future of Digital Art',
      date: '2023-10-15',
      excerpt: 'Exploring how AI and VR are reshaping the creative landscape.',
      tag: '科技',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      cover: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop',
      featured: true
    },
    {
      title: 'Cyberpunk Aesthetics in 2024',
      date: '2023-11-02',
      excerpt: 'Why the neon-soaked dystopian look is making a comeback.',
      tag: '设计',
      content: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      cover: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=800&auto=format&fit=crop',
      featured: true
    },
    {
      title: 'Top 10 Synthwave Tracks',
      date: '2023-11-20',
      excerpt: 'A curated list of the best retro-futuristic beats.',
      tag: '音乐',
      content: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'
    },
    {
      title: 'Coding for the Metaverse',
      date: '2023-12-05',
      excerpt: 'Essential skills for building the next generation of the internet.',
      tag: '编程',
      content: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      cover: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&auto=format&fit=crop'
    },
    {
      title: 'Game Design Principles',
      date: '2024-01-10',
      excerpt: 'Creating immersive worlds and engaging gameplay loops.',
      tag: '游戏',
      content: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
      cover: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&auto=format&fit=crop'
    },
    {
      title: 'The Rise of Virtual Events',
      date: '2024-02-15',
      excerpt: 'How online gatherings are changing the way we connect.',
      tag: '文化',
      content: 'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
      cover: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop'
    },
    {
      title: 'AI in Creative Writing',
      date: '2024-03-20',
      excerpt: 'Can artificial intelligence truly replace human creativity in literature?',
      tag: '人工智能',
      content: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
      cover: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&auto=format&fit=crop'
    },
    {
      title: 'Sustainable Tech Trends',
      date: '2024-04-05',
      excerpt: 'Green technology innovations shaping a better future.',
      tag: '科技',
      content: 'Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.',
      cover: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop'
    },
    {
      title: 'Photography Basics',
      date: '2024-04-25',
      excerpt: 'Mastering the art of composition and lighting.',
      tag: '艺术',
      content: 'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.',
      cover: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop'
    },
    {
      title: 'The History of Synthesizers',
      date: '2024-05-12',
      excerpt: 'From modular giants to digital plugins: a sonic journey.',
      tag: '音乐',
      content: 'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.',
      cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop'
    },
    // More New Articles
    {
      title: 'Minimalist Web Design',
      date: '2024-06-01',
      excerpt: 'Less is more: strategies for clean and effective UI.',
      tag: '设计',
      content: 'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
      cover: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop'
    },
    {
      title: 'The State of Esports',
      date: '2024-06-20',
      excerpt: 'How competitive gaming became a global phenomenon.',
      tag: '游戏',
      content: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
      cover: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop'
    },
    {
      title: 'Remote Work Culture',
      date: '2024-07-05',
      excerpt: 'Building team cohesion in a distributed world.',
      tag: '文化',
      content: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
      cover: 'https://images.unsplash.com/photo-1593642632823-8f78536788c6?w=800&auto=format&fit=crop'
    },
    {
      title: 'Understanding Blockchain',
      date: '2024-07-18',
      excerpt: 'A beginner\'s guide to decentralized technology.',
      tag: '科技',
      content: 'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
      cover: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop'
    },
    {
      title: 'Digital Detox Tips',
      date: '2024-08-02',
      excerpt: 'Finding balance in an always-connected world.',
      tag: '生活',
      content: 'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?',
      cover: 'https://images.unsplash.com/photo-1511871893393-82e9c16b8d77?w=800&auto=format&fit=crop'
    }
  ];

  for (const article of articles) {
    await db.run(
      'INSERT INTO articles (title, date, excerpt, tag, content, cover, featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [article.title, article.date, article.excerpt, article.tag, article.content, article.cover, article.featured ? 1 : 0]
    );
  }

  // Events
  const events = [
    {
      title: 'Neon Nights Festival',
      date: '2024-06-15',
      location: 'Tokyo, Japan',
      category: '音乐',
      status: 'approved',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop',
      description: 'A three-day celebration of synthwave and cyberpunk culture.',
      content: 'Join us for an unforgettable experience with top artists from around the globe.'
    },
    {
      title: 'Tech Expo 2024',
      date: '2024-08-20',
      location: 'San Francisco, CA',
      category: '科技',
      status: 'approved',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
      description: 'Showcasing the latest innovations in VR, AR, and AI.',
      content: 'Experience the future today at the annual Tech Expo.'
    },
    {
      title: 'Digital Art Workshop',
      date: '2024-05-10',
      location: 'Online',
      category: '工坊',
      status: 'Closed',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop',
      description: 'Learn the fundamentals of generative art.',
      content: 'A hands-on workshop for aspiring digital artists.'
    },
    {
      title: 'Indie Game Jam',
      date: '2024-09-01',
      location: 'Berlin, Germany',
      category: '游戏',
      status: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&auto=format&fit=crop',
      description: '48 hours to create a game from scratch.',
      content: 'Compete with developers from around the world in this intense game jam.'
    },
    {
      title: 'Cyber Security Summit',
      date: '2024-10-12',
      location: 'London, UK',
      category: '科技',
      status: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop',
      description: 'Discussing the latest threats and defense strategies.',
      content: 'Experts from leading security firms share their insights.'
    },
    {
      title: 'AI Art Exhibition',
      date: '2024-11-05',
      location: 'New York, NY',
      category: '艺术',
      status: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&auto=format&fit=crop',
      description: 'Exploring the intersection of artificial intelligence and creativity.',
      content: 'Witness groundbreaking artworks generated by neural networks.'
    },
    {
      title: 'Global Hackathon',
      date: '2024-12-01',
      location: 'Online',
      category: '编程',
      status: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1504384308090-c54be3855833?w=800&auto=format&fit=crop',
      description: 'Solve real-world problems with code.',
      content: 'Join thousands of developers in a race to build innovative solutions.'
    },
    {
      title: 'Retro Gaming Expo',
      date: '2025-01-15',
      location: 'Osaka, Japan',
      category: '游戏',
      status: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800&auto=format&fit=crop',
      description: 'Celebrate the classics of video game history.',
      content: 'Play vintage consoles, meet industry legends, and buy rare collectibles.'
    },
    // More New Events
    {
      title: 'Startup Pitch Night',
      date: '2025-02-10',
      location: 'Austin, TX',
      category: '商业',
      status: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1559136555-930d72f18615?w=800&auto=format&fit=crop',
      description: 'Entrepreneurs showcase their next big idea.',
      content: 'Investors and innovators meet to shape the future of business.'
    },
    {
      title: 'Music Production Masterclass',
      date: '2025-03-05',
      location: 'Los Angeles, CA',
      category: '音乐',
      status: 'Upcoming',
      image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop',
      description: 'Learn from Grammy-winning producers.',
      content: 'Deep dive into mixing, mastering, and sound design techniques.',
      status: 'approved'
    },
    {
      title: 'Cosplay Convention',
      date: '2025-04-20',
      location: 'Seoul, South Korea',
      category: '文化',
      status: 'approved',
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop',
      description: 'The ultimate gathering for cosplay enthusiasts.',
      content: 'Costume contests, workshops, and photoshoots.'
    },
    {
      title: 'Web3 Conference',
      date: '2025-05-15',
      location: 'Miami, FL',
      category: '科技',
      status: 'approved',
      image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop',
      description: 'The future of the decentralized web.',
      content: 'Keynotes on crypto, NFTs, and DAOs.'
    }
  ];

  for (const event of events) {
    await db.run(
      'INSERT INTO events (title, date, location, category, status, image, description, content, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [event.title, event.date, event.location, event.category, event.status, event.image, event.description, event.content, event.featured ? 1 : 0]
    );
  }

  // Seed Event Categories
  const categories = [...new Set(events.map(e => e.category))];
  for (const category of categories) {
    await db.run('INSERT INTO event_categories (name) VALUES (?)', [category]);
  }

  // Settings
  await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('pagination_enabled', 'false')");
  await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'cyber')");
  await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('language', 'zh')");

  console.log('Database seeded successfully!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
});
