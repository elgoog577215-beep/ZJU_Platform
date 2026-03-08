import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load env from server/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.argv[2];

if (!url) {
    console.log('Usage: node server/scripts/wechat_parser.js <url>');
    process.exit(1);
}

// Configuration
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'; // Default to DeepSeek or OpenAI
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat'; // or gpt-3.5-turbo

async function scrapeWeChat(url) {
    console.log(`\n🔍 Fetching URL: ${url}...`);
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
        console.log(`📝 Content Length: ${content.length} chars`);
        
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
        process.exit(1);
    }
}

async function parseWithLLM(data) {
    if (!LLM_API_KEY) {
        console.log('\n⚠️  No LLM_API_KEY found in .env. Skipping LLM parsing.');
        console.log('💡 To enable parsing, add LLM_API_KEY to server/.env');
        console.log('---------------------------------------------------');
        console.log('Simulated Prompt that would be sent:');
        console.log(`
        文章标题: ${data.title}
        文章作者: ${data.author}
        文章内容: ${data.content.substring(0, 200)}... (truncated)
        `);
        return;
    }

    console.log(`\n🧠 Sending to LLM (${LLM_MODEL})...`);
    
    const prompt = `
    你是一个活动信息提取助手。请从以下微信公众号文章内容中提取活动相关信息。
    如果不包含某个字段的信息，请留空或填 null。
    
    文章标题: ${data.title}
    文章作者: ${data.author}
    文章内容:
    ${data.content.substring(0, 5000)}
    
    请提取以下字段并以 JSON 格式返回 (不要包含 markdown 代码块标记):
    {
        "title": "活动名称 (通常是文章标题，但如果有更具体的活动名请提取)",
        "description": "活动简介 (50-100字摘要)",
        "date": "活动日期 (格式 YYYY-MM-DD，如果是范围则用 / 分隔)",
        "time": "活动具体时间 (如 14:00-16:00)",
        "location": "活动地点",
        "organizer": "主办方 (通常是作者，但文中可能有更具体的)",
        "type": "活动类型 (如: 讲座, 展览, 演出, 聚会, 比赛, 其他)",
        "tags": ["标签1", "标签2"]
    }
    `;

    try {
        const response = await axios.post(`${LLM_BASE_URL}/chat/completions`, {
            model: LLM_MODEL,
            messages: [
                { role: 'system', content: 'You are a helpful assistant that extracts event information from text into JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        }, {
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data.choices[0].message.content;
        console.log('\n✅ LLM Result:');
        console.log(result);
        
        // Try to parse JSON to verify
        try {
            const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(jsonStr);
            console.log('\n📊 Parsed JSON Object:');
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.warn('⚠️  Could not parse LLM response as JSON:', e.message);
        }

    } catch (error) {
        console.error('❌ LLM Error:', error.response?.data || error.message);
    }
}

// Main
(async () => {
    const data = await scrapeWeChat(url);
    await parseWithLLM(data);
})();
