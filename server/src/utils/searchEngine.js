const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Strictly use the local dev_search_test.db
const DB_PATH = path.join(__dirname, '../../../../数据库/dev_search_test.db');

const CATEGORY_MAP = {
  "十佳歌手": "culture_sports",
  "音乐": "culture_sports",
  "歌手": "culture_sports",
  "演出": "culture_sports",
  "文艺": "culture_sports",
  "体育": "culture_sports",
  "文体": "culture_sports",
  "展览": "culture_sports",
  "运动会": "culture_sports",
  "晚会": "culture_sports",
  "嘉年华": "culture_sports",
  "戏剧节": "culture_sports",
  "艺术周": "culture_sports",
  
  "讲座": "lecture", "报告": "lecture", "沙龙": "lecture", "论坛": "lecture",
  "研讨会": "lecture", "分享会": "lecture", "学术": "lecture", "交流会": "lecture",
  "竞赛": "competition", "比赛": "competition", "大赛": "competition",
  "挑战赛": "competition", "黑客松": "competition", "hackathon": "competition",
  "志愿": "volunteer", "支教": "volunteer", "公益": "volunteer",
  "义工": "volunteer", "社会实践": "volunteer", "志愿者": "volunteer",
  "招新": "recruitment", "纳新": "recruitment", "招聘": "recruitment",
  "实习": "recruitment", "招募": "recruitment",
  "交流": "exchange", "交换": "exchange", "访学": "exchange",
  "留学": "exchange", "国际": "exchange"
};

const AUDIENCE_KEYWORDS = {
  "全校学生": ["全校", "全体学生", "所有学生", "面向全校", "全校师生"],
  "本科生": ["本科生", "本科"],
  "研究生": ["研究生", "硕士", "博士", "硕博", "博士生", "硕士生"],
  "新生": ["新生", "大一", "2026级", "2025级", "新同学"],
  "开发者": ["开发者", "程序员", "技术", "编程"],
  "志愿者": ["志愿者", "志愿服务"],
  "参赛者": ["参赛者", "参赛团队", "参赛选手"]
};

const REWARD_KEYWORDS = {
  "综素分": ["综素", "综素分", "综合素质"],
  "二课分": ["二课", "二课分", "第二课堂", "美育二课", "美育分"],
  "综测": ["综测", "综合测评"],
  "证书": ["证书", "获奖证书", "参赛证书"],
  "奖金": ["奖金", "元", "奖励金", "奖品"]
};

const CAMPUS_KEYWORDS = {
  "紫金港": ["紫金港", "zijingang"],
  "玉泉": ["玉泉", "yuquan"],
  "西溪": ["西溪", "xixi"],
  "华家池": ["华家池", "huajiachi"],
  "之江": ["之江", "zhijiang"],
  "海宁": ["海宁", "haining"]
};

function _weekRange(now, offset) {
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, ...
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { start: monday.toISOString(), end: sunday.toISOString() };
}

function _weekendRange(now) {
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + distanceToMonday + 5);
  saturday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  sunday.setHours(23, 59, 59, 999);
  
  return { start: saturday.toISOString(), end: sunday.toISOString() };
}

function parseTimeRange(query, now) {
  if (query.includes("今天")) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (query.includes("明天")) {
    const start = new Date(now);
    start.setDate(now.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (query.includes("后天")) {
    const start = new Date(now);
    start.setDate(now.getDate() + 2);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (query.includes("这周") || query.includes("本周")) {
    return _weekRange(now, 0);
  }
  if (query.includes("下周")) {
    return _weekRange(now, 1);
  }
  if (query.includes("周末")) {
    return _weekendRange(now);
  }
  if (query.includes("这个月")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  return null;
}

class QueryParser {
  constructor(query) {
    this.raw = query.trim();
    this.lower = query.toLowerCase();
    this.now = new Date();
    this.result = {
      category: null,
      topics: [],
      audience: [],
      reward_tags: [],
      location_type: null,
      campus: null,
      time_range: null,
      registration_status: null,
      event_status: null,
      keywords: [],
      sort_by: "default"
    };
  }

  parse() {
    this._parseTime();
    this._parseCategory();
    this._parseStatus();
    this._parseLocation();
    this._parseAudience();
    this._parseReward();
    this._parseTopics();
    this._extractKeywords();
    return this.result;
  }

  _parseTime() {
    const tr = parseTimeRange(this.raw, this.now);
    if (tr) {
      this.result.time_range = tr;
      return;
    }
    if (this.raw.includes("最近") || this.raw.includes("近期")) {
      this.result.sort_by = "nearest";
    }
  }

  _parseCategory() {
    for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
      if (this.raw.includes(keyword)) {
        this.result.category = category;
        this.result.keywords.push(keyword);
        return;
      }
    }
  }

  _parseStatus() {
    if (["已结束", "结束的", "结束了", "历史", "过期"].some(w => this.raw.includes(w))) {
      this.result.event_status = "ended";
      this.result.sort_by = "ended";
    } else if (["进行中", "正在", "开始了"].some(w => this.raw.includes(w))) {
      this.result.event_status = "ongoing";
    }

    if (["报名中", "还没截止", "未截止", "可以报名"].some(w => this.raw.includes(w))) {
      this.result.registration_status = "open";
    } else if (["报名截止", "已截止"].some(w => this.raw.includes(w))) {
      this.result.registration_status = "closed";
    }
  }

  _parseLocation() {
    if (["线上", "在线", "远程"].some(w => this.raw.includes(w))) {
      this.result.location_type = "online";
    } else if (["线下", "现场"].some(w => this.raw.includes(w))) {
      this.result.location_type = "offline";
    }

    for (const [campus, aliases] of Object.entries(CAMPUS_KEYWORDS)) {
      if (aliases.some(a => this.raw.includes(a))) {
        this.result.campus = campus;
        return;
      }
    }
  }

  _parseAudience() {
    for (const [audience, aliases] of Object.entries(AUDIENCE_KEYWORDS)) {
      if (aliases.some(a => this.raw.includes(a))) {
        this.result.audience.push(audience);
        this.result.keywords.push(aliases[0]);
      }
    }
  }

  _parseReward() {
    for (const [reward, aliases] of Object.entries(REWARD_KEYWORDS)) {
      if (aliases.some(a => this.raw.includes(a))) {
        this.result.reward_tags.push(reward);
        this.result.keywords.push(aliases[0]);
      }
    }
  }

  _parseTopics() {
    const topic_map = {
      "ai": "AI", "人工智能": "AI", "大模型": "AI", "llm": "AI",
      "机器学习": "AI", "深度学习": "AI", "全栈": "全栈开发",
      "开发": "全栈开发", "编程": "全栈开发", "hackathon": "黑客松",
      "黑客松": "黑客松", "算法": "算法", "技术": "技术",
      "科普": "科普", "海洋": "海洋", "支教": "支教",
      "暑期": "社会实践", "寒假": "社会实践", "社会实践": "社会实践",
      "航空航天": "航空航天", "机器人": "机器人",
      "设计": "设计", "创意": "创意", "创业": "创业",
      "能源": "能源", "算力": "算力", "低碳": "低碳",
      "农创": "农创", "手工": "手工", "文化": "文化活动",
      "求职": "求职", "实习": "实习", "职业": "求职",
      "国卓": "国卓院", "工程师": "国卓院",
      "医药": "医学", "生命": "生命健康", "健康": "生命健康"
    };

    for (const [keyword, topic] of Object.entries(topic_map)) {
      if (this.lower.includes(keyword)) {
        if (!this.result.topics.includes(topic)) {
          this.result.topics.push(topic);
        }
      }
    }
  }

  _extractKeywords() {
    const STOP_WORDS = new Set([
      "的", "了", "是", "在", "有", "和", "与", "或", "及", "等", "这", "那",
      "什么", "怎么", "如何", "哪些", "哪个", "可以", "没有", "已经", "还",
      "适合", "最近", "一个", "这个", "那个", "不", "都", "就", "也", "很",
      "吗", "呢", "吧", "啊", "哦", "哈", "呀", "对", "从", "到", "让", "把",
      "被", "给", "为", "以", "要", "会", "能", "可", "应该"
    ]);

    const cnWords = this.raw.match(/[\u4e00-\u9fff]{2,6}/g) || [];
    for (const w of cnWords) {
      if (!this.result.keywords.includes(w) && !STOP_WORDS.has(w)) {
        this.result.keywords.push(w);
      }
    }

    const bigrams = this.raw.match(/[\u4e00-\u9fff]{2}/g) || [];
    for (const w of bigrams) {
      if (!this.result.keywords.includes(w) && !STOP_WORDS.has(w)) {
        this.result.keywords.push(w);
      }
    }
  }
}

async function getSearchDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READONLY
  });
}

function getTitleSimilarity(title1, title2) {
  if (!title1 || !title2) return 0;
  const set1 = new Set(title1.replace(/\s+/g, ''));
  const set2 = new Set(title2.replace(/\s+/g, ''));
  let intersection = 0;
  for (const char of set1) {
    if (set2.has(char)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

function areDuplicates(e1, e2) {
  if (e1.source_url && e2.source_url && e1.source_url === e2.source_url) {
    return true;
  }
  
  const date1 = e1.date ? e1.date.substring(0, 10) : '';
  const date2 = e2.date ? e2.date.substring(0, 10) : '';
  
  if (date1 && date1 === date2) {
    const sim = getTitleSimilarity(e1.title, e2.title);
    if (sim >= 0.7) {
      return true;
    }
    
    if (e1.location && e1.location === e2.location &&
        e1.organizer && e1.organizer === e2.organizer) {
      return true;
    }
  }
  
  return false;
}

class SearchEngineV2 {
  async search(parsed, limit = 20) {
    const startTime = Date.now();
    let result = await this._doSearch(parsed, limit);

    let relaxed = false;
    if (result.total === 0 && parsed.time_range) {
      const relaxedParsed = { ...parsed, time_range: null, sort_by: "nearest" };
      result = await this._doSearch(relaxedParsed, limit);
      relaxed = true;
    }

    // Deduplicate search results
    const originalEvents = result.events || [];
    const dedupedEvents = [];
    let deduped = false;

    for (const event of originalEvents) {
      const isDup = dedupedEvents.some(existing => areDuplicates(existing, event));
      if (isDup) {
        deduped = true;
      } else {
        dedupedEvents.push(event);
      }
    }

    result.events = dedupedEvents;
    result.total = dedupedEvents.length;
    result.relaxed_match = relaxed;
    result.deduped = deduped;
    result.search_time_ms = Date.now() - startTime;
    return result;
  }

  async _doSearch(parsed, limit = 20) {
    const condPairs = [];
    condPairs.push(["e.deleted_at IS NULL", []]);
    condPairs.push(["e.status = 'approved'", []]);

    if (parsed.event_status === "ended") {
      condPairs.push(["ecs.event_status_calc = 'ended'", []]);
    } else if (parsed.event_status === "ongoing") {
      condPairs.push(["ecs.event_status_calc = 'ongoing'", []]);
    }

    if (parsed.registration_status === "open") {
      condPairs.push(["ecs.registration_status_calc = 'open'", []]);
    } else if (parsed.registration_status === "closed") {
      condPairs.push(["ecs.registration_status_calc = 'closed'", []]);
    }

    let catJoins = "";
    if (parsed.category) {
      catJoins = `
        JOIN event_tag_relations etr_cat ON e.id = etr_cat.event_id
        JOIN event_tags et_cat ON etr_cat.tag_id = et_cat.id AND et_cat.type = 'category'
      `;
      condPairs.push(["et_cat.name = ?", [parsed.category]]);
    }

    if (parsed.location_type === "online") {
      condPairs.push(["ecs.location_type_calc = 'online'", []]);
    } else if (parsed.location_type === "offline") {
      condPairs.push(["ecs.location_type_calc = 'offline'", []]);
    }

    if (parsed.campus) {
      condPairs.push(["ecs.campus_extracted = ?", [parsed.campus]]);
    }

    if (parsed.time_range) {
      condPairs.push(["e.date >= ? AND e.date <= ?", [parsed.time_range.start, parsed.time_range.end]]);
    }

    let topicJoins = "";
    if (parsed.topics && parsed.topics.length > 0) {
      topicJoins = `
        JOIN event_tag_relations etr_topic ON e.id = etr_topic.event_id
        JOIN event_tags et_topic ON etr_topic.tag_id = et_topic.id AND et_topic.type = 'topic'
      `;
      const topicParams = parsed.topics;
      const placeholders = topicParams.map(() => '?').join(',');
      condPairs.push([`et_topic.name IN (${placeholders})`, topicParams]);
    }

    let audienceJoins = "";
    if (parsed.audience && parsed.audience.length > 0) {
      audienceJoins = `
        JOIN event_audience_relations ear ON e.id = ear.event_id
        JOIN audiences a ON ear.audience_id = a.id
      `;
      const audParams = parsed.audience;
      const placeholders = audParams.map(() => '?').join(',');
      condPairs.push([`a.name IN (${placeholders})`, audParams]);
    }

    let rewardJoins = "";
    if (parsed.reward_tags && parsed.reward_tags.length > 0) {
      rewardJoins = `
        JOIN event_reward_relations err ON e.id = err.event_id
        JOIN reward_tags rt ON err.reward_id = rt.id
      `;
      const rewParams = parsed.reward_tags;
      const placeholders = rewParams.map(() => '?').join(',');
      condPairs.push([`rt.name IN (${placeholders})`, rewParams]);
    }

    const hasStructured = Boolean(
      parsed.category || parsed.event_status ||
      parsed.campus || parsed.location_type ||
      parsed.time_range || parsed.registration_status ||
      (parsed.topics && parsed.topics.length > 0) ||
      (parsed.audience && parsed.audience.length > 0) ||
      (parsed.reward_tags && parsed.reward_tags.length > 0)
    );

    const keywordConditions = [];
    const keywordParams = [];
    if (parsed.keywords && parsed.keywords.length > 0) {
      for (const kw of parsed.keywords.slice(0, 5)) {
        const p = `%${kw}%`;
        keywordConditions.push("(e.title LIKE ? OR ecs.search_text LIKE ? OR e.organizer LIKE ?)");
        keywordParams.push(p, p, p);
      }
    }

    if (keywordConditions.length > 0 && !hasStructured) {
      condPairs.push([`(${keywordConditions.join(" OR ")})`, keywordParams]);
    }

    const conditions = condPairs.map(p => p[0]);
    const allParams = [];
    for (const pair of condPairs) {
      allParams.push(...pair[1]);
    }

    const whereClause = conditions.join(" AND ");

    let orderParts = [
      "CASE WHEN ecs.event_status_calc = 'ongoing' THEN 0 WHEN ecs.event_status_calc = 'upcoming' THEN 1 ELSE 2 END ASC",
      "CASE WHEN ecs.registration_status_calc = 'open' THEN 0 ELSE 1 END ASC",
      "ABS(julianday(COALESCE(e.date, '2099-01-01')) - julianday('now')) ASC",
      "COALESCE(e.views, 0) DESC"
    ];

    if (parsed.sort_by === "ended") {
      orderParts = ["COALESCE(e.date, '2000-01-01') DESC", "COALESCE(e.views, 0) DESC"];
    } else if (parsed.sort_by === "hottest") {
      orderParts = ["COALESCE(e.views, 0) DESC", "e.likes DESC"];
    } else if (parsed.sort_by === "nearest") {
      orderParts = ["ABS(julianday(COALESCE(e.date, '2099-01-01')) - julianday('now')) ASC"];
    }

    const orderClause = orderParts.join(", ");
    const allJoins = [catJoins, topicJoins, audienceJoins, rewardJoins].filter(Boolean).join(" ");

    const sql = `
      SELECT DISTINCT
        e.id, e.title,
        COALESCE(e.description, '') as summary,
        COALESCE(e.description, '') as description,
        ecs.category_extracted as category,
        ecs.event_status_calc as event_status,
        ecs.registration_status_calc as registration_status,
        e.date,
        e.end_date,
        e.registration_deadline,
        e.deadline_raw,
        e.location,
        ecs.location_type_calc as location_type,
        ecs.campus_extracted as campus,
        e.organizer,
        e.image,
        e.link,
        e.featured,
        e.volunteer_time,
        COALESCE(e.views, 0) as views,
        COALESCE(e.likes, 0) as likes,
        e.target_audience,
        e.score,
        e.link as source_url
      FROM events e
      JOIN event_computed_status ecs ON e.id = ecs.event_id
      ${allJoins}
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ?
    `;

    const countSql = `
      SELECT COUNT(DISTINCT e.id) as cnt
      FROM events e
      JOIN event_computed_status ecs ON e.id = ecs.event_id
      ${allJoins}
      WHERE ${whereClause}
    `;

    const db = await getSearchDb();
    
    try {
      const rows = await db.all(sql, [...allParams, limit]);
      const countRow = await db.get(countSql, allParams);
      const total = countRow ? countRow.cnt : 0;

      for (const row of rows) {
        const reasons = [];
        if (parsed.category && row.category === parsed.category) {
          reasons.push(`分类: ${parsed.category}`);
        }
        for (const topic of parsed.topics || []) {
          const content = ((row.title || "") + (row.summary || "")).toLowerCase();
          if (content.includes(topic.toLowerCase())) {
            reasons.push(`主题: ${topic}`);
          }
        }
        for (const aud of parsed.audience || []) {
          if (String(row.target_audience || "").includes(aud)) {
            reasons.push(`人群: ${aud}`);
          }
        }
        if (row.registration_status === "open") {
          reasons.push("报名未截止");
        }
        if (row.event_status === "ongoing") {
          reasons.push("进行中");
        }
        row.match_reasons = reasons;
      }

      return {
        total: total,
        events: rows
      };
    } finally {
      await db.close();
    }
  }
}

module.exports = {
  QueryParser,
  SearchEngineV2
};
