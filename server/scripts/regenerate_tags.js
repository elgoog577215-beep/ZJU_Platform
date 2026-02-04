require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getDb } = require('../src/config/db');
const axios = require('axios');

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL;
const LLM_MODEL = process.env.LLM_MODEL;

const EVENT_TAG_OPTIONS = [
    '讲座', '志愿活动', '竞赛', '沙龙', '展览', '演出', '会议', 
    '文体活动', '招聘', '宣讲', '学术报告', '社会实践', '班团活动'
];

async function generateTags(text, type) {
    if (!text || !LLM_API_KEY) return null;

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'event') {
        systemPrompt = 'You are an event tag classifier. Output JSON only.';
        userPrompt = `
        Analyze the following event information and select 1-2 tags from the allowed list.
        
        Event Info:
        ${text}

        Allowed Tags: ${EVENT_TAG_OPTIONS.join(', ')}

        Requirements:
        1. Return ONLY a JSON object: {"tags": ["Tag1", "Tag2"]}
        2. ONLY use tags from the allowed list.
        3. Do NOT invent new tags like "Culture", "Winter Break", etc.
        `;
    } else if (type === 'photo') {
        systemPrompt = 'You are a photo tag generator. Output JSON only.';
        userPrompt = `
        Analyze the following photo title/description and generate 1-3 short, descriptive tags (in Chinese).
        
        Photo Info:
        ${text}

        Requirements:
        1. Return ONLY a JSON object: {"tags": ["Tag1", "Tag2"]}
        2. Tags should describe the visual content or theme (e.g., 校园风光, 人物摄影, 活动现场, 建筑, 自然, 运动).
        3. Keep tags concise (2-4 chars).
        `;
    }

    try {
        const response = await axios.post(`${LLM_BASE_URL}/chat/completions`, {
            model: LLM_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
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
        return result.tags ? result.tags.join(',') : null;
    } catch (error) {
        console.error('LLM Error:', error.message);
        return null;
    }
}

async function main() {
    const db = await getDb();

    // 1. Events
    console.log('Fetching events...');
    const events = await db.all('SELECT id, title, description, content FROM events');
    console.log(`Found ${events.length} events. Regenerating tags...`);

    for (const event of events) {
        const text = `Title: ${event.title}\nDescription: ${event.description || ''}\nContent: ${event.content || ''}`.substring(0, 1000); // Truncate to save tokens
        const tags = await generateTags(text, 'event');
        if (tags) {
            console.log(`Event [${event.id}] ${event.title} -> Tags: ${tags}`);
            await db.run('UPDATE events SET tags = ? WHERE id = ?', [tags, event.id]);
        } else {
            console.log(`Event [${event.id}] Failed to generate tags.`);
        }
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
    }

    // 2. Photos
    console.log('\nFetching photos...');
    const photos = await db.all('SELECT id, title, gameDescription FROM photos');
    console.log(`Found ${photos.length} photos. Regenerating tags...`);

    for (const photo of photos) {
        const text = `Title: ${photo.title}\nDescription: ${photo.gameDescription || ''}`;
        const tags = await generateTags(text, 'photo');
        if (tags) {
            console.log(`Photo [${photo.id}] ${photo.title} -> Tags: ${tags}`);
            await db.run('UPDATE photos SET tags = ? WHERE id = ?', [tags, photo.id]);
        } else {
            console.log(`Photo [${photo.id}] Failed to generate tags.`);
        }
        // Small delay
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('Done!');
}

main().catch(console.error);
