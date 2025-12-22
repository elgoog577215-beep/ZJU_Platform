const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

async function seed() {
  const db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  console.log('Seeding data into unified resources table...');

  // Helper to insert resource
  const insertResource = async (data) => {
    const {
      type, title, description, content, file_url, cover_url, 
      category, tags, featured, status, uploader_id, extra_data
    } = data;

    await db.run(
      `INSERT INTO resources (
        type, title, description, content, file_url, cover_url, 
        category, tags, featured, status, uploader_id, extra_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type, title, description, content, file_url, cover_url, 
        category, tags, featured ? 1 : 0, status || 'approved', 
        uploader_id || 1, extra_data ? JSON.stringify(extra_data) : null
      ]
    );
  };

  // 1. Photos
  const photos = [
    {
      url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=60",
      title: "山峰",
      category: "Nature",
      size: "large",
      gameType: "skyfall",
      gameDescription: "滑翔穿过山峰！避开障碍物。"
    },
    {
      url: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=800&auto=format&fit=crop&q=60",
      title: "霓虹城市",
      category: "Urban",
      size: "small",
      gameType: "runner",
      gameDescription: "在赛博城市中竞速！收集能量。"
    },
    {
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60",
      title: "人像研究",
      category: "Portrait",
      size: "tall",
      gameType: "puzzle",
      gameDescription: "重组记忆。"
    },
    {
      url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&auto=format&fit=crop&q=60",
      title: "时装周",
      category: "Fashion",
      size: "small",
      gameType: "shutter",
      gameDescription: "捕捉完美的姿势！"
    },
    {
      url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=60",
      title: "优胜美地",
      category: "Nature",
      size: "wide",
      gameType: "skyfall",
      gameDescription: "驾驭山谷之风。"
    },
    {
      url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=60",
      title: "相机镜头",
      category: "Photography",
      size: "small",
      gameType: "shutter",
      gameDescription: "快速对焦拍摄！"
    },
    {
      url: "https://images.unsplash.com/photo-1552168324-d612d77725e3?w=800&auto=format&fit=crop&q=60",
      title: "街头生活",
      category: "Urban",
      size: "tall",
      gameType: "runner",
      gameDescription: "躲避城市交通。"
    },
    {
      url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=60",
      title: "迷雾森林",
      category: "Nature",
      size: "large",
      gameType: "skyfall",
      gameDescription: "在迷雾中漂移。"
    },
    {
      url: "https://images.unsplash.com/photo-1551316679-9c6ae9dec224?w=800&auto=format&fit=crop&q=60",
      title: "极简主义",
      category: "Abstract",
      size: "small",
      gameType: "puzzle",
      gameDescription: "寻找隐藏的模式。"
    }
  ];

  for (const p of photos) {
    await insertResource({
      type: 'photo',
      title: p.title,
      file_url: p.url,
      category: p.category,
      description: p.gameDescription,
      extra_data: { size: p.size, gameType: p.gameType, gameDescription: p.gameDescription }
    });
  }
  console.log(`Seeded ${photos.length} photos.`);

  // 2. Music
  const music = [
    {
      title: "Neon Dreams",
      artist: "CyberSynth",
      duration: 245,
      cover: "https://images.unsplash.com/photo-1514525253440-b393452e8d03?w=400&auto=format&fit=crop&q=60",
      audio: "/uploads/music/neon-dreams.mp3",
      category: "Electronic",
      tags: "synthwave,chill"
    },
    {
      title: "Mountain Echoes",
      artist: "Nature Sounds",
      duration: 312,
      cover: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=400&auto=format&fit=crop&q=60",
      audio: "/uploads/music/mountain-echoes.mp3",
      category: "Ambient",
      tags: "nature,relax"
    },
    {
      title: "Urban Beat",
      artist: "City Flow",
      duration: 188,
      cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&auto=format&fit=crop&q=60",
      audio: "/uploads/music/urban-beat.mp3",
      category: "Hip Hop",
      tags: "beat,urban"
    }
  ];

  for (const m of music) {
    await insertResource({
      type: 'music',
      title: m.title,
      file_url: m.audio,
      cover_url: m.cover,
      category: m.category,
      tags: m.tags,
      extra_data: { artist: m.artist, duration: m.duration }
    });
  }
  console.log(`Seeded ${music.length} music tracks.`);

  // 3. Videos
  const videos = [
    {
      title: "Cinematic City",
      category: "Urban",
      tags: "4k,drone,city",
      thumbnail: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&auto=format&fit=crop&q=60",
      video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-at-night-11-large.mp4"
    },
    {
      title: "Nature's Wonder",
      category: "Nature",
      tags: "4k,forest,relax",
      thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&auto=format&fit=crop&q=60",
      video: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4"
    },
    {
      title: "Tech Future",
      category: "Technology",
      tags: "tech,abstract,loop",
      thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=60",
      video: "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blue-circuit-board-97-large.mp4"
    }
  ];

  for (const v of videos) {
    await insertResource({
      type: 'video',
      title: v.title,
      category: v.category,
      tags: v.tags,
      cover_url: v.thumbnail,
      file_url: v.video
    });
  }
  console.log(`Seeded ${videos.length} videos.`);

  // 4. Articles
  const articles = [
    {
      title: "The Future of Digital Art",
      date: "2024-03-15",
      excerpt: "Exploring how AI and blockchain are revolutionizing the art world...",
      tag: "Technology",
      tags: "art,ai,crypto",
      cover: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=60",
      content: "<p>Digital art is evolving rapidly...</p>"
    },
    {
      title: "Sustainable Living Guide",
      date: "2024-03-12",
      excerpt: "Simple steps to reduce your carbon footprint and live better...",
      tag: "Lifestyle",
      tags: "eco,green,life",
      cover: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=60",
      content: "<p>Living sustainably doesn't mean giving up comfort...</p>"
    },
    {
      title: "Modern Architecture Trends",
      date: "2024-03-10",
      excerpt: "How sustainable materials are shaping our skylines...",
      tag: "Design",
      tags: "architecture,modern,city",
      cover: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&auto=format&fit=crop&q=60",
      content: "<p>Architecture is more than just buildings...</p>"
    }
  ];

  for (const a of articles) {
    await insertResource({
      type: 'article',
      title: a.title,
      description: a.excerpt,
      content: a.content,
      category: a.tag,
      tags: a.tags,
      cover_url: a.cover,
      extra_data: { date: a.date }
    });
  }
  console.log(`Seeded ${articles.length} articles.`);

  // 5. Events
  const events = [
    {
      title: "Digital Art Exhibition 2024",
      date: "2024-04-15",
      location: "Virtual Gallery A",
      category: "Exhibition",
      tags: "art,digital,vr",
      image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&auto=format&fit=crop&q=60",
      description: "Experience the latest in digital art.",
      content: "<p>Join us for an immersive experience...</p>",
      link: "https://example.com/tickets"
    },
    {
      title: "Tech Summit Global",
      date: "2024-05-20",
      location: "Convention Center",
      category: "Conference",
      tags: "tech,future,ai",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60",
      description: "The biggest tech conference of the year.",
      content: "<p>Speakers from top companies...</p>",
      link: "https://example.com/register"
    },
    {
      title: "Music Festival Online",
      date: "2024-06-10",
      location: "Streaming Platform",
      category: "Music",
      tags: "music,live,stream",
      image: "https://images.unsplash.com/photo-1459749411177-287ce3288b71?w=800&auto=format&fit=crop&q=60",
      description: "Live performances from around the world.",
      content: "<p>3 days of non-stop music...</p>",
      link: "https://example.com/stream"
    }
  ];

  for (const e of events) {
    await insertResource({
      type: 'event',
      title: e.title,
      description: e.description,
      content: e.content,
      category: e.category,
      tags: e.tags,
      cover_url: e.image,
      extra_data: { date: e.date, location: e.location, link: e.link }
    });
  }
  console.log(`Seeded ${events.length} events.`);

  console.log('Seeding complete.');
}

seed().catch(console.error);
