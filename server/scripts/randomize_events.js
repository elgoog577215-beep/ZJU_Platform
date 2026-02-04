const { getDb } = require('../src/config/db');
const path = require('path');

// Ensure we look for .env in the server root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function randomizeEvents() {
    try {
        console.log('Connecting to database...');
        const db = await getDb();
        
        console.log('Fetching all events...');
        // Use 'events' table, not 'resources'
        const events = await db.all('SELECT id, title FROM events');
        
        console.log(`Found ${events.length} events. Updating dates...`);
        
        const now = new Date();
        const twoMonthsLater = new Date(now);
        twoMonthsLater.setMonth(now.getMonth() + 2);
        
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        
        for (const event of events) {
            // Random start date between -1 month and +2 months
            const randomTime = oneMonthAgo.getTime() + Math.random() * (twoMonthsLater.getTime() - oneMonthAgo.getTime());
            const startDateObj = new Date(randomTime);
            
            // Format YYYY-MM-DD
            const startDate = startDateObj.toISOString().split('T')[0];
            
            // Random duration: 30% chance of multi-day (1-3 days), 70% single day
            let endDate = null;
            if (Math.random() > 0.7) {
                const durationDays = Math.floor(Math.random() * 3) + 1; // 1 to 3 days extra
                const endDateObj = new Date(startDateObj);
                endDateObj.setDate(endDateObj.getDate() + durationDays);
                endDate = endDateObj.toISOString().split('T')[0];
            }
            
            // Random time (08:00 to 20:00)
            const hour = Math.floor(Math.random() * (20 - 8 + 1)) + 8;
            const minute = Math.random() > 0.5 ? '00' : '30';
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
            
            // Update
            // date: YYYY-MM-DDTHH:mm
            // end_date: YYYY-MM-DDTHH:mm (default 17:00 if multi-day, or same day + 2 hours if single day)
            
            const fullStartDate = `${startDate}T${timeStr}`;
            
            let fullEndDate;
            if (endDate) {
                 // Multi-day, end at 17:00
                 fullEndDate = `${endDate}T17:00`;
            } else {
                 // Single day, end 2 hours later
                 const endHour = hour + 2;
                 const endHourStr = endHour.toString().padStart(2, '0');
                 fullEndDate = `${startDate}T${endHourStr}:${minute}`;
            }
            
            await db.run(
                `UPDATE events SET date = ?, end_date = ?, time = ? WHERE id = ?`,
                [fullStartDate, fullEndDate, timeStr, event.id]
            );
            
            console.log(`Updated "${event.title}": ${fullStartDate} - ${fullEndDate}`);
        }
        
        console.log('✅ All events updated with random dates.');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

randomizeEvents();
