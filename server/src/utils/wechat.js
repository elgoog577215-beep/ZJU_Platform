const axios = require('axios');
const cheerio = require('cheerio');

// Configuration
// In a real CommonJS app, process.env is already populated by dotenv in index.js
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'; 
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat';

async function scrapeWeChat(url) {
    console.log(`\n🔍 Fetching URL: ${url}...`);
    
    // SSRF Protection
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;
        
        // Block private IP ranges and localhost
        const isPrivate = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|::1)/.test(hostname);
        if (isPrivate) {
             throw new Error('Invalid URL: Internal addresses are not allowed');
        }
        
        // Only allow http/https
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            throw new Error('Invalid URL: Only HTTP/HTTPS allowed');
        }
    } catch (e) {
        console.error('SSRF Protection blocked:', e.message);
        throw new Error('Invalid URL');
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        // Extract basic info
        const title = $('meta[property="og:title"]').attr('content') || $('#activity-name').text().trim();
        const author = $('meta[property="og:article:author"]').attr('content') || $('#js_name').text().trim();
        
        // Extract content
        // Remove scripts and styles
        $('#js_content script').remove();
        $('#js_content style').remove();
        
        let content = $('#js_content').text().trim();
        // Clean up excessive whitespace
        content = content.replace(/\s+/g, ' ').replace(/\n+/g, '\n');
        
        // Extract first image as cover
        const coverImage = $('meta[property="og:image"]').attr('content');
        
        console.log(`✅ Fetched Article: "${title}" by ${author}`);
        
        if (content.length === 0) {
            console.warn('⚠️  Warning: No content extracted. The page might be dynamic or blocked.');
        }

        return {
            title,
            author,
            content,
            coverImage
        };
    } catch (error) {
        console.error('❌ Error fetching URL:', error.message);
        throw new Error('Failed to fetch WeChat article');
    }
}

async function parseWithLLM(data) {
    if (!process.env.LLM_API_KEY) {
        console.warn('⚠️  No LLM_API_KEY found. Skipping LLM parsing.');
        return null;
    }

    console.log(`\n🧠 Sending to LLM (${process.env.LLM_MODEL})...`);
    
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    const ACADEMIC_CALENDAR = `
    【浙江大学校历参考 (2025-2026学年)】
    - 冬学期: 2025年11月中旬 - 2026年1月中旬
    - 寒假: 2026年1月26日开始 - 2026年2月27日结束 (预计)
    - 春学期: 2026年2月底/3月初开学
    - 夏学期: 2026年4月底 - 2026年6月底
    - 暑假: 2026年7月初开始
    - 春节: 2026年2月17日
    `;

    const prompt = `
    你是一个专业的活动信息提取助手。请仔细阅读以下微信公众号文章，提取活动关键信息。
    你的核心能力是【像人类一样思考】，能够结合上下文、常识和提供的参考信息，从模糊的描述中推断出具体的信息，而不仅仅是机械地复制粘贴。

    【参考信息】
    当前日期: ${today} (请基于此日期推断文章中的"明天"、"本周五"等相对时间。年份默认为当年，除非文中明确指定跨年)
    ${ACADEMIC_CALENDAR}
    
    【文章元数据】
    - 标题: ${data.title}
    - 作者: ${data.author}
    
    【文章正文】
    ${data.content}
    
    【提取要求】
    请提取以下字段并严格按照 JSON 格式返回 (纯 JSON 字符串，不要包含 markdown \`\`\`json 标记):
    {
        "title": "活动名称 (优先提取具体活动名，若无则使用文章标题)",
        "description": "活动详情摘要 (字数严格控制在50-80字以内。这是展示在活动卡片上的关键信息，必须包含：1. 活动核心内容/亮点；2. 参与收益(如有)。语气要吸引人，避免流水账。例如：'知名校友分享职场经验，揭秘互联网大厂面试技巧，现场提供简历修改服务，助你斩获心仪Offer！')",
        "date_reasoning": "【关键步骤】请在此字段详细描述你对活动日期的推断逻辑。例如：'文中未明确写日期，但提到了寒假，结合校历寒假从1月26日开始，推断活动开始日期为2026-01-26'。",
        "date": "活动开始日期 (格式 YYYY-MM-DD)",
        "end_date": "活动结束日期 (格式 YYYY-MM-DD。注意：如果是单日活动，结束日期必须与开始日期相同，不能为 null)",
        "location": "活动地点 (尽可能详细，包含校区/楼号/室号。例如：'紫金港校区 东六-201'。如果是线上活动，请填'线上'或平台名称)",
        "organizer": "主办方 (优先提取文中提及的具体主办/承办单位，若无则填文章作者)",
        "target_audience": "面向群体 (如：全校师生、特定学院、本科生、研究生等)",
        "volunteer_time": "志愿时长 (提取具体时长，如 '2.5小时'，无则 null)",
        "score": "综测/素质分 (提取具体分值，如 '0.5分'，无则 null)",
        "tags": ["标签1", "标签2"] (【严格限制】只能从以下列表中选择最匹配的1-2个标签，严禁使用其他词汇：讲座、志愿活动、竞赛、沙龙、展览、演出、会议、文体活动、招聘、宣讲、学术报告、社会实践、班团活动)
    }
    
    【智能推断指南 (Human-like Reasoning)】
    你的目标不仅仅是“提取”，更是“理解”。像一个聪明的人类助理一样思考：
    1. **Description 优化**：不要直接截取开头。请通读全文，提炼出最能吸引同学参加的亮点。如果文中包含多个活动，请概括整体情况。
    2. **结合语境与常识**：如果文中说“寒假期间”，你需要结合提供的【校历】推断出具体的大致日期范围（如寒假开始日期）。
    3. **处理模糊时间**：
       - "本周五" -> 结合【当前日期】计算具体日期。
       - "下个月初" -> 推断为下个月的1号。
       - "2025-2026秋冬学期" -> 结合校历推断大致范围。
    4. **日期优先**：我们只需要日期 (YYYY-MM-DD)，不需要具体时间 (HH:MM)。
    5. **单日活动**：Start Date 和 End Date 必须一致。
    6. **缺失处理**：如果经过深思熟虑仍无法推断，请填 null。
    `;

    try {
        const response = await axios.post(`${process.env.LLM_BASE_URL}/chat/completions`, {
            model: process.env.LLM_MODEL,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: `文章标题: ${data.title}\n\n文章内容:\n${data.content.substring(0, 15000)}` } // Truncate to avoid context limit
            ],
            stream: false, // Use non-streaming for simplicity in backend
            enable_thinking: false // Explicitly disable thinking for non-streaming calls
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60s timeout
        });

        // Handle ModelScope specific response structure if needed, or standard OpenAI format
        const content = response.data.choices[0].message.content;
        
        // Remove markdown code blocks if present
        let jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
        
        // Clean up common JSON syntax errors from LLM
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'); // Remove trailing commas
        
        let result = JSON.parse(jsonStr);

        // Sanitize fields
        if (result.description) {
            result.description = result.description.replace(/^活动详情摘要[：:]\s*/, '').trim();
        }
        if (result.location) {
            result.location = result.location.replace(/^活动地点[：:]\s*/, '').trim();
        }
        
        return result;
    } catch (error) {
        console.error('❌ LLM Error:', error.response?.data || error.message);
        throw new Error('LLM parsing failed');
    }
}

module.exports = {
    scrapeWeChat,
    parseWithLLM
};
