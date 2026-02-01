
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function verifyIsolation() {
    const db = await open({
      filename: path.join(__dirname, 'server/database.sqlite'),
      driver: sqlite3.Database
    });

    // 1. Check raw data
    const photosTags = await db.all('SELECT tags FROM photos');
    const articlesTags = await db.all('SELECT tags FROM articles');
    
    console.log('--- Raw Data ---');
    console.log('Photos Tags:', photosTags.map(t => t.tags).filter(Boolean));
    console.log('Articles Tags:', articlesTags.map(t => t.tags).filter(Boolean));

    // 2. Simulate API logic
    const resources = ['photos', 'videos', 'music', 'articles', 'events'];
    
    async function getTagsForType(type) {
        let targetTable = null;
        if (resources.includes(type)) targetTable = type;
        else if (resources.includes(type + 's')) targetTable = type + 's';
        
        if (!targetTable) return 'Invalid Type';

        const items = await db.all(`SELECT tags FROM ${targetTable}`);
        const tagCounts = {};
        
        for (const item of items) {
            if (item.tags) {
                item.tags.split(',').forEach(t => {
                    const tag = t.trim();
                    if (tag) {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    }
                });
            }
        }
        return tagCounts;
    }

    console.log('\n--- API Simulation ---');
    const photoTags = await getTagsForType('photos');
    console.log('Tags for type=photos:', photoTags);

    const articleTags = await getTagsForType('articles');
    console.log('Tags for type=articles:', articleTags);
    
    // Check overlap
    const photoKeys = Object.keys(photoTags);
    const articleKeys = Object.keys(articleTags);
    
    console.log('\n--- Analysis ---');
    const uniqueToPhotos = photoKeys.filter(x => !articleKeys.includes(x));
    console.log('Unique to Photos:', uniqueToPhotos);
    
    const uniqueToArticles = articleKeys.filter(x => !photoKeys.includes(x));
    console.log('Unique to Articles:', uniqueToArticles);

    // Check Event Images
    console.log('\n--- Event Images ---');
    const events = await db.all('SELECT id, title, image FROM events LIMIT 5');
    console.log(JSON.stringify(events, null, 2));
}

verifyIsolation();
