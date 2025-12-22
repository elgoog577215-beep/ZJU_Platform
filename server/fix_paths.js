const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // Fix photos table
    db.run(`UPDATE photos SET url = REPLACE(url, 'http://localhost:3001/uploads/', '/uploads/') WHERE url LIKE 'http://localhost:3001/uploads/%'`);
    db.run(`UPDATE photos SET url = REPLACE(url, 'http://localhost:5173/uploads/', '/uploads/') WHERE url LIKE 'http://localhost:5173/uploads/%'`);
    
    // Fix events table
    db.run(`UPDATE events SET image = REPLACE(image, 'http://localhost:3001/uploads/', '/uploads/') WHERE image LIKE 'http://localhost:3001/uploads/%'`);
    db.run(`UPDATE events SET image = REPLACE(image, 'http://localhost:5173/uploads/', '/uploads/') WHERE image LIKE 'http://localhost:5173/uploads/%'`);

    // Fix users table
    db.run(`UPDATE users SET avatar = REPLACE(avatar, 'http://localhost:3001/uploads/', '/uploads/') WHERE avatar LIKE 'http://localhost:3001/uploads/%'`);
    
    console.log("Database paths updated to relative paths.");
});

db.close();
