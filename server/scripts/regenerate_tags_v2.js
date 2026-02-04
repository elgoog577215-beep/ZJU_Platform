const { getDb } = require('../src/config/db');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'; 
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat';

if (!LLM_API_KEY) {
    console.error('❌ No LLM_API_KEY found in .env');
    process.exit(1);
}

const EVENT_TAGS = [
    "讲座", "志愿活动", "竞赛", "沙龙", "展览", "演出", "会议", 
    "文体活动", "招聘", "宣讲", "学术报告", "社会实践", "班团活动"
];

const PHOTO_TAGS = [
    "风景", "人像", "建筑", "校园", "夜景", "活动纪实", "自然", "人文"
];

async function getTagsFromLLM(title, description, allowedTags) {
    const prompt = `
    你是一个标签生成助手。请根据以下标题和描述，从给定的【允许标签列表】中选择最匹配的1-2个标签。
    
    【输入】
    标题: ${title}
    描述: ${description || '无'}
    
    【允许标签列表】
    ${allowedTags.join(', ')}
    
    【要求】
    1. 必须只返回 JSON 格式：{"tags": ["标签1"]}
    2. 只能使用列表中的词，严禁创造新词。
    3. 如果没有合适的，选择最接近的 "活动纪实" (对于图片) 或 "文体活动" (对于活动)。
    `;

    try {
        const response = await axios.post(`${LLM_BASE_URL}/chat/completions`, {
            model: LLM_MODEL,
            messages: [
                { role: 'system', content: 'You are a JSON generator. Output valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        }, {
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonStr);
        return result.tags || [];
    } catch (error) {
        console.error('LLM Error:', error.message);
        return [];
    }
}

async function run() {
    try {
        console.log('Connecting to database...');
        const db = await getDb();
        
        // 1. Events
        console.log('\nProcessing Events...');
        const events = await db.all('SELECT id, title, description FROM events');
        for (const event of events) {
            console.log(`Processing Event: ${event.title}`);
            const tags = await getTagsFromLLM(event.title, event.description, EVENT_TAGS);
            if (tags.length > 0) {
                const tagStr = tags.join(',');
                await db.run('UPDATE events SET tags = ? WHERE id = ?', [tagStr, event.id]);
                console.log(`  -> Updated tags: ${tagStr}`);
            } else {
                console.log('  -> No tags generated');
            }
            // Rate limit
            await new Promise(r => setTimeout(r, 1000));
        }

        // 2. Photos
        console.log('\nProcessing Photos...');
        const photos = await db.all('SELECT id, title, description FROM photos');
        for (const photo of photos) {
            console.log(`Processing Photo: ${photo.title || 'Untitled'}`);
            const tags = await getTagsFromLLM(photo.title, photo.description, PHOTO_TAGS);
            if (tags.length > 0) {
                const tagStr = tags.join(',');
                await db.run('UPDATE photos SET tags = ? WHERE id = ?', [tagStr, photo.id]);
                console.log(`  -> Updated tags: ${tagStr}`);
            } else {
                console.log('  -> No tags generated');
            }
            // Rate limit
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('\nDone!');
    } catch (error) {
        console.error('Script failed:', error);
    }
}

run();
