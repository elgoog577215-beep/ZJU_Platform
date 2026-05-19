const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb } = require('../config/db');
const aiRuntime = require('../services/unifiedAiRuntimeService');
const {
    buildEventCatalogPromptText,
    validateParsedEventPayload,
} = require('../services/eventIntelligenceService');

// Simple In-Memory Cache
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const wechatCache = new Map();


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

async function parseWithLLM(data, options = {}) {
    const db = options.db || await getDb();

    console.log(`\n🧠 Sending WeChat article to unified AI runtime...`);

    const today = new Date().toISOString().split('T')[0];
    const ACADEMIC_CALENDAR = `
    【浙江大学校历参考（2025-2026学年）】
    - 当前日期: ${today}
    - 寒假大致在 2026 年 1 月中下旬至 2 月中下旬
    - 春学期大致在 2026 年 2 月底/3 月初开始
    - 暑假大致在 2026 年 7 月初开始
    `;
    const EVENT_CATALOG_CONTEXT = buildEventCatalogPromptText();

    const result = await aiRuntime.callJson(db, {
        task: 'wechat_event_parse',
        modelRunner: options.modelRunner,
        temperature: 0.1,
        maxTokens: 4096,
        timeout: 60000,
        messages: [
            {
                role: 'system',
                content: [
                    '你是浙江大学活动平台的微信图文解析助手。',
                    '你必须调用语义理解能力，从文章上下文中提取、推断并重组活动信息。',
                    '必须结合当前日期、校历参考和网站标准活动库输出结构化 JSON。',
                    '不要返回 markdown，不要解释过程，只输出 JSON 对象。'
                ].join('\n')
            },
            {
                role: 'user',
                content: JSON.stringify({
                    task: 'parse_wechat_article_to_event',
                    today,
                    academicCalendar: ACADEMIC_CALENDAR,
                    standardCatalog: EVENT_CATALOG_CONTEXT,
                    article: {
                        title: data.title,
                        author: data.author,
                        content: String(data.content || '').slice(0, 15000)
                    },
                    outputContract: {
                        title: '活动名称；无具体活动名时用文章标题',
                        description: '0-80 字活动摘要，包含核心内容和参与收益',
                        content: '活动详情 HTML 片段，只用 h3/p/ul/li 等正文标签',
                        date_reasoning: '说明如何从文章和当前日期推断活动日期',
                        date: 'YYYY-MM-DDTHH:MM；无具体时间用 T00:00',
                        end_date: 'YYYY-MM-DDTHH:MM；单日活动需与 date 同日',
                        time: '例如 14:00-16:00，不能确定填 null',
                        location: '尽量包含校区/楼号/房间；线上活动填线上或平台名',
                        organizer: '主办/承办单位；无则用文章作者',
                        category: '必须是网站标准活动库里的 value',
                        category_confidence: '0-1 number',
                        category_reason: '一句话解释分类依据',
                        target_audience: '从标准面向对象中选择；多个用英文逗号连接；无法确定填 null',
                        volunteer_time: '志愿时长；无则 null',
                        score: '综测/素质分；无则 null',
                        tags: []
                    }
                }, null, 2)
            }
        ]
    });

    const cleanField = (str, prefixRegex) => {
        if (!str) return null;
        return String(str).replace(prefixRegex, '').trim();
    };

    let parsed = result.parsed;
    if (parsed.description) parsed.description = cleanField(parsed.description, /^活动详情摘要[：:]\s*/);
    if (parsed.content) parsed.content = cleanField(parsed.content, /^活动详细内容[：:]\s*/);
    if (parsed.location) parsed.location = cleanField(parsed.location, /^活动地点[：:]\s*/);
    if (parsed.organizer) parsed.organizer = cleanField(parsed.organizer, /^主办方[：:]\s*/);
    if (parsed.target_audience) parsed.target_audience = cleanField(parsed.target_audience, /^面向群体[：:]\s*/);
    if (parsed.volunteer_time) parsed.volunteer_time = cleanField(parsed.volunteer_time, /^志愿时长[：:]\s*/);
    if (parsed.score) parsed.score = cleanField(parsed.score, /^综测\/素质分[：:]\s*/);

    parsed = validateParsedEventPayload(parsed, data);
    const runtimeTelemetry = aiRuntime.summarizeModelStatusTelemetry(result.modelStatus);
    parsed.aiMeta = {
        task: result.modelStatus?.task || 'wechat_event_parse',
        provider: result.modelStatus?.provider || null,
        model: result.modelStatus?.model || null,
        runtimeTelemetry
    };
    parsed.ai_runtime = {
        task: parsed.aiMeta.task,
        provider: parsed.aiMeta.provider,
        model: parsed.aiMeta.model,
        runtimeTelemetry
    };

    return parsed;
}


module.exports = {
    scrapeWeChat,
    parseWithLLM,
    cleanWeChatUrl,
    wechatCache,
    CACHE_TTL,
    downloadWeChatImage
};
