const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function getDb() {
  return open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
}

// Helper to determine category based on title
function determineCategory(title) {
  if (title.includes('讲座') || title.includes('报告')) return 'Lecture';
  if (title.includes('夏令营')) return 'Workshop';
  if (title.includes('比赛') || title.includes('竞赛')) return 'Competition';
  if (title.includes('志愿者') || title.includes('招募')) return 'Volunteer';
  return 'General';
}

// Scraper for Zhejiang University Academic Notices
// URL: https://www.zju.edu.cn/ (Using main page news for demo or specific list if available)
// Note: Real scrapers need to be robust against layout changes. This is a simplified example.
async function scrapeZJU() {
  try {
    const url = 'https://www.zju.edu.cn/'; // ZJU Homepage which lists events/news
    // For specific academic notices, one might use: https://www.zju.edu.cn/xs_579/list.htm
    // We will try to scrape the "Academic Events" (讲座论坛) section if possible, or general news.
    
    console.log(`Crawling ${url}...`);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(data);
    const events = [];

    // NOTE: Selectors are based on typical structure found in search results or generic ZJU templates.
    // We need to inspect the actual page source to get perfect selectors.
    // Based on search result #1, there is a section "讲座论坛"
    
    // Example Selector strategy (hypothetical based on common CMS):
    // Finding elements that likely contain "讲座" or dates.
    
    // Let's try to find the "Lecture/Forum" section. 
    // Usually these are in a specific div or ul.
    // We'll look for any list item that contains a date and a link.
    
    $('li, .news-item, .event-item').each((i, el) => {
      const title = $(el).find('a').text().trim() || $(el).text().trim();
      const link = $(el).find('a').attr('href');
      const dateText = $(el).find('.date, .time').text().trim() || $(el).text().match(/\d{4}-\d{2}-\d{2}/)?.[0];
      
      // Filter for keywords to ensure relevance
      if (title && (title.includes('讲座') || title.includes('论坛') || title.includes('报告'))) {
        let fullLink = link;
        if (link && !link.startsWith('http')) {
          fullLink = new URL(link, url).href;
        }

        if (fullLink) {
            events.push({
              title: title.replace(/\s+/g, ' ').substring(0, 100), // Clean up
              date: dateText || new Date().toISOString().split('T')[0],
              location: 'Zhejiang University', // Default
              category: determineCategory(title),
              status: 'Upcoming',
              image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop', // Generic academic image
              description: `Source: Zhejiang University Official Website. Original Link: ${fullLink}`,
              content: `This event was automatically crawled from Zhejiang University website.\n\nOriginal Title: ${title}\nLink: ${fullLink}`,
              featured: false
            });
        }
      }
    });

    console.log(`Found ${events.length} potential events.`);
    return events;

  } catch (error) {
    console.error('Scraping Error:', error);
    return [];
  }
}

// Generic Scraper
async function scrapeGeneric(url) {
  try {
    console.log(`Crawling ${url}...`);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(data);
    const events = [];

    // Generic strategy: Look for list items or divs that contain links and dates
    // This is a "best effort" generic scraper
    $('li, div, article').each((i, el) => {
      // Heuristic: Must contain a link and likely a date-like string
      const linkEl = $(el).find('a');
      if (linkEl.length === 0) return;

      const title = linkEl.first().text().trim() || $(el).text().trim();
      const link = linkEl.attr('href');
      
      // Basic validation: Title length, link existence
      if (!title || title.length < 5 || !link) return;

      // Date detection
      const text = $(el).text();
      const dateMatch = text.match(/\d{4}[-/]\d{2}[-/]\d{2}/) || text.match(/\d{2}[-/]\d{2}/);
      
      // Keyword detection (optional, but helps reduce noise)
      const keywords = ['讲座', '论坛', '报告', '比赛', '通知', 'Lecture', 'Seminar', 'Workshop', 'Event'];
      const hasKeyword = keywords.some(kw => title.includes(kw));

      if (hasKeyword || dateMatch) {
          let fullLink = link;
          if (link && !link.startsWith('http')) {
             try {
                fullLink = new URL(link, url).href;
             } catch (e) {
                return;
             }
          }

          events.push({
            title: title.replace(/\s+/g, ' ').substring(0, 100),
            date: dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0],
            location: new URL(url).hostname,
            category: determineCategory(title),
            status: 'Upcoming',
            image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop',
            description: `Source: ${new URL(url).hostname}. Original Link: ${fullLink}`,
            content: `This event was automatically crawled from ${url}.\n\nOriginal Title: ${title}\nLink: ${fullLink}`,
            featured: false
          });
      }
    });

    // Remove duplicates from the same crawl session
    const uniqueEvents = [];
    const seenUrls = new Set();
    for (const ev of events) {
        if (!seenUrls.has(ev.content) && ev.title) {
            seenUrls.add(ev.content);
            uniqueEvents.push(ev);
        }
    }

    console.log(`Found ${uniqueEvents.length} potential events from ${url}.`);
    return uniqueEvents;

  } catch (error) {
    console.error(`Scraping Error for ${url}:`, error.message);
    return [];
  }
}

// Main function to run crawlers and save to DB
async function runCrawler(targetUrl = null, source = null) {
    const db = await getDb();
    let crawledEvents = [];

    if (targetUrl) {
        // User provided URL
        crawledEvents = await scrapeGeneric(targetUrl);
    } else {
        // Default (ZJU)
        crawledEvents = await scrapeZJU();
    }
    
    let addedCount = 0;

    for (const event of crawledEvents) {
        // Check for duplicates based on title
        const existing = await db.get('SELECT id FROM events WHERE title = ?', [event.title]);
        
        if (!existing) {
            await db.run(
                'INSERT INTO events (title, date, location, category, status, image, description, content, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [event.title, event.date, event.location, event.category, event.status, event.image, event.description, event.content, event.featured ? 1 : 0]
            );
            addedCount++;
        }
    }

    return { total: crawledEvents.length, added: addedCount };
}

module.exports = { runCrawler };