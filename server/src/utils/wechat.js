const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple In-Memory Cache
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const wechatCache = new Map();

// Configuration
// In a real CommonJS app, process.env is already populated by dotenv in index.js
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'; 
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat';

// Download image from WeChat and save locally
async function downloadWeChatImage(imageUrl) {
    if (!imageUrl) return null;
    
    try {
        // Generate unique filename
        const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
        const ext = imageUrl.includes('.png') ? 'png' : 
                   imageUrl.includes('.gif') ? 'gif' : 'jpg';
        const filename = `wechat_${hash}.${ext}`;
        
        // Determine upload directory
        const uploadDir = path.join(__dirname, '../../uploads/covers');
        const filePath = path.join(uploadDir, filename);
        
        // Create directory if not exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Check if already downloaded
        if (fs.existsSync(filePath)) {
            console.log(`📸 Using cached image: ${filename}`);
            return `/uploads/covers/${filename}`;
        }
        
        console.log(`📥 Downloading image from WeChat...`);
        
        // Download with proper headers to bypass hotlink protection
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://mp.weixin.qq.com/',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 15000
        });
        
        // Save to local file
        fs.writeFileSync(filePath, response.data);
        console.log(`✅ Image saved: ${filename}`);
        
        return `/uploads/covers/${filename}`;
    } catch (error) {
        console.error(`❌ Failed to download image: ${error.message}`);
        return null;
    }
}

function cleanWeChatUrl(url) {
    try {
        const u = new URL(url);
        // Remove tracking params that don't affect content
        const paramsToRemove = ['chksm', 'scene', 'subscene', 'ascene', 'fasttmpl_type', 'fasttmpl_fullversion', 'clicktime', 'enterid', 'utm_source', 'utm_medium', 'utm_campaign'];
        paramsToRemove.forEach(p => u.searchParams.delete(p));
        u.hash = ''; // Remove anchor
        return u.toString();
    } catch (e) {
        return url;
    }
}

async function scrapeWeChat(url) {
    console.log(`\n🔍 Fetching URL: ${url}...`);
    
    // SSRF Protection
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
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
        
        // Validate WeChat domain
        const isWeChatDomain = hostname.includes('weixin.qq.com') || hostname.includes('mp.weixin.qq.com');
        if (!isWeChatDomain) {
            console.warn(`⚠️  Non-WeChat domain detected: ${hostname}`);
        }
    } catch (e) {
        console.error('SSRF Protection blocked:', e.message);
        throw new Error(`Invalid URL: ${e.message}`);
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000, // 30 second timeout
            maxRedirects: 5,
            validateStatus: (status) => status < 400
        });
        
        const html = response.data;
        
        if (!html || html.length === 0) {
            throw new Error('Empty response from server');
        }
        
        const $ = cheerio.load(html);
        
        // Extract basic info with multiple fallback strategies
        let title = $('meta[property="og:title"]').attr('content') || 
                    $('meta[name="twitter:title"]').attr('content') ||
                    $('#activity-name').text().trim() ||
                    $('h1').first().text().trim() ||
                    $('title').text().trim();
                    
        let author = $('meta[property="og:article:author"]').attr('content') || 
                     $('meta[name="author"]').attr('content') ||
                     $('#js_name').text().trim() ||
                     $('.profile_nickname').text().trim() ||
                     $('a#js_name').text().trim();
        
        // Extract content with multiple fallback strategies
        let contentElement = $('#js_content');
        if (!contentElement.length) {
            contentElement = $('#js_article');
        }
        if (!contentElement.length) {
            contentElement = $('.rich_media_content');
        }
        if (!contentElement.length) {
            contentElement = $('article');
        }
        
        // Remove scripts and styles
        contentElement.find('script').remove();
        contentElement.find('style').remove();
        contentElement.find('iframe').remove();
        
        let content = contentElement.text().trim();
        
        // Clean up excessive whitespace
        content = content.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
        
        // If still no content, try to get any text from the body
        if (content.length === 0) {
            content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
        }
        
        // Extract cover image with multiple fallback strategies
        let coverImage = $('meta[property="og:image"]').attr('content') || 
                          $('meta[name="twitter:image"]').attr('content');
        
        // If no meta image, find the best image from content
        if (!coverImage) {
            const contentImages = [];
            $('#js_content img').each((i, el) => {
                const $img = $(el);
                const dataSrc = $img.attr('data-src');
                const src = $img.attr('src');
                const imgUrl = dataSrc || src;
                
                if (imgUrl) {
                    // Skip small images (emojis, icons, ads)
                    const width = parseInt($img.attr('width') || $img.css('width') || 0);
                    const height = parseInt($img.attr('height') || $img.css('height') || 0);
                    const dataType = $img.attr('data-type');
                    
                    // Skip if it's clearly a small image or emoji
                    if (width > 0 && width < 100) return;
                    if (height > 0 && height < 100) return;
                    if (dataType === 'emoji' || imgUrl.includes('emoji')) return;
                    if (imgUrl.includes('mmbiz.qpic.cn/mmbiz_')) return; // Skip emojis
                    if (imgUrl.includes('qrcode')) return; // Skip QR codes
                    
                    contentImages.push({
                        url: imgUrl,
                        width,
                        height,
                        index: i
                    });
                }
            });
            
            // Select the best image (prefer larger images, first image as fallback)
            if (contentImages.length > 0) {
                // Sort by estimated size, prefer first large image
                const bestImage = contentImages.find(img => img.width >= 300 || img.height >= 200) 
                               || contentImages[0];
                coverImage = bestImage.url;
                console.log(`📸 Selected cover from ${contentImages.length} content images`);
            }
        }
        
        console.log(`✅ Fetched Article: "${title}" by ${author}`);
        console.log(`📝 Content Length: ${content.length} chars`);
        console.log(`🖼️ Cover Image: ${coverImage ? coverImage.substring(0, 100) + '...' : 'Not found'}`);
        
        if (content.length === 0) {
            console.warn('⚠️  Warning: No content extracted. The page might be dynamic or blocked.');
        }

        return {
            title: title || 'Untitled',
            author: author || 'Unknown',
            content,
            coverImage
        };
    } catch (error) {
        console.error('❌ Error fetching URL:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Headers:`, JSON.stringify(error.response.headers));
        }
        throw new Error(`Failed to fetch WeChat article: ${error.message}`);
    }
}

async function parseWithLLM(data) {
    if (!process.env.LLM_API_KEY) {
        console.warn('⚠️  No LLM_API_KEY found. Skipping LLM parsing.');
        return null;
    }

    console.log(`\n🧠 Sending to LLM (${process.env.LLM_MODEL})...`);
    
    const today = new Date().toISOString().split('T')[0];
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
        "content": "活动详细内容 (HTML格式)。请对原文进行【重组和精简】，去除广告、关注引导、无关图片占位符等噪音，只保留活动介绍、嘉宾、议程、报名方式等核心信息。使用 <h3>, <p>, <ul>, <li> 等标签排版，保持美观易读。不要包含 <html> 或 <body> 标签。",
        "date_reasoning": "【关键步骤】请在此字段详细描述你对活动日期的推断逻辑。例如：'文中未明确写日期，但提到了寒假，结合校历寒假从1月26日开始，推断活动开始日期为2026-01-26'。",
        "date": "活动开始日期时间 (格式 YYYY-MM-DDTHH:MM，例如 2026-03-15T14:00。若无法确定具体时间，使用 T00:00)",
        "end_date": "活动结束日期时间 (格式 YYYY-MM-DDTHH:MM，例如 2026-03-15T16:00。注意：如果是单日活动，结束日期必须与开始日期相同，不能为 null。若无法确定具体结束时间，使用与开始日期相同的日期加 T23:59)",
        "time": "活动具体时间 (如 14:00-16:00)",
        "location": "活动地点 (尽可能详细，包含校区/楼号/室号。例如：'紫金港校区 东六-201'。如果是线上活动，请填'线上'或平台名称)",
        "organizer": "主办方 (优先提取文中提及的具体主办/承办单位，若无则填文章作者)",
        "target_audience": "面向群体 (如：全校师生、特定学院、本科生、研究生等)",
        "volunteer_time": "志愿时长 (提取具体时长，如 '2.5小时'，无则 null)",
        "score": "综测/素质分 (提取具体分值，如 '0.5分'，无则 null)",
        "tags": ["标签1", "标签2"] (【严格限制】只能从以下列表中选择最匹配的1-2个标签，严禁使用其他词汇：讲座、志愿活动、竞赛、沙龙、展览、演出、会议、文体活动、招聘、宣讲、学术报告、社会实践、班团活动)
    }
    
    【智能推断指南 (Human-like Reasoning)】
    你的目标不仅仅是“提取”，更是“理解”和“重组”。像一个聪明的人类助理一样思考：
    1. **Description vs Content**: 
       - Description 是简短的摘要，用于列表展示。
       - Content 是详情页内容，需要保留原文的核心结构和信息，但要清洗掉噪音。
    2. **结合语境与常识**: 如果文中说“寒假期间”，你需要结合提供的【校历】推断出具体的大致日期范围（如寒假开始日期）。
    3. **处理模糊时间**：
       - "本周五" -> 结合【当前日期】计算具体日期。
       - "下个月初" -> 推断为下个月的1号。
       - "2025-2026秋冬学期" -> 结合校历推断大致范围。
    4. **日期时间优先**：我们需要完整的日期时间 (YYYY-MM-DDTHH:MM)。如果文中有具体时间（如"14:00-16:00"），请合并进 date 和 end_date 字段，不要单独返回 time 字段。
    5. **单日活动**：Start Date 和 End Date 必须一致。
    6. **缺失处理**：如果经过深思熟虑仍无法推断，请填 null。
    `;

    const MAX_RETRIES = 3;
    let lastError = null;

    // Debug: Log environment variables (masked)
    const apiKey = process.env.LLM_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL;
    const model = process.env.LLM_MODEL;
    
    console.log('\n🔧 LLM Configuration:');
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Model: ${model}`);
    console.log(`   API Key: ${apiKey ? apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4) : 'NOT SET'}`);
    console.log(`   API Key Length: ${apiKey ? apiKey.length : 0}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`\n🔄 LLM Attempt ${attempt}/${MAX_RETRIES}...`);
            
            const response = await axios.post(`${baseUrl}/chat/completions`, {
                model: model,
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: `文章标题: ${data.title}\n\n文章内容:\n${data.content.substring(0, 15000)}` } // Truncate to avoid context limit
                ],
                stream: false,
                enable_thinking: false,
                max_tokens: 4096
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60s timeout
            });

            const content = response.data.choices[0].message.content;
            
            // Extract JSON from code blocks or raw text
            let jsonStr = content;
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1] || jsonMatch[0];
            }
            
            // Clean up common JSON syntax errors
            jsonStr = jsonStr.trim()
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');

            let result;
            try {
                result = JSON.parse(jsonStr);
            } catch (e) {
                console.warn(`⚠️ JSON Parse failed on attempt ${attempt}. Content:`, jsonStr.substring(0, 100) + '...');
                throw new Error('Invalid JSON response');
            }

            // Sanitize fields
            const cleanField = (str, prefixRegex) => {
                if (!str) return null;
                return str.replace(prefixRegex, '').trim();
            };

            if (result.description) result.description = cleanField(result.description, /^活动详情摘要[：:]\s*/);
            if (result.content) result.content = cleanField(result.content, /^活动详细内容[：:]\s*/);
            if (result.location) result.location = cleanField(result.location, /^活动地点[：:]\s*/);
            if (result.organizer) result.organizer = cleanField(result.organizer, /^主办方[：:]\s*/);
            if (result.target_audience) result.target_audience = cleanField(result.target_audience, /^面向群体[：:]\s*/);
            if (result.volunteer_time) result.volunteer_time = cleanField(result.volunteer_time, /^志愿时长[：:]\s*/);
            if (result.score) result.score = cleanField(result.score, /^综测\/素质分[：:]\s*/);

            return result; // Success!

        } catch (error) {
            lastError = error;
            
            // Handle specific error codes
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                if (status === 401) {
                    console.error(`❌ LLM Authentication failed (401): API Key无效或已过期`);
                    throw new Error('LLM_API_KEY_INVALID: API密钥无效或已过期，请检查server/.env文件中的LLM_API_KEY配置');
                } else if (status === 429) {
                    console.error(`❌ LLM Rate limit exceeded (429)`);
                    throw new Error('LLM_RATE_LIMIT: 请求过于频繁，请稍后再试');
                } else if (status >= 500) {
                    console.error(`❌ LLM Server error (${status}):`, errorData);
                } else {
                    console.error(`❌ LLM Attempt ${attempt} failed (${status}):`, errorData || error.message);
                }
            } else {
                console.error(`❌ LLM Attempt ${attempt} failed:`, error.message);
            }
            
            if (attempt === MAX_RETRIES) break;
            // Wait 1s before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    throw new Error(`LLM parsing failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

module.exports = {
    scrapeWeChat,
    parseWithLLM,
    cleanWeChatUrl,
    wechatCache,
    CACHE_TTL,
    downloadWeChatImage
};
