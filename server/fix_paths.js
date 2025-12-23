const { getDb } = require('./src/config/db');

(async () => {
  try {
    const db = await getDb();
    console.log("正在修复数据库图片路径...");

    const tables = ['photos', 'videos', 'music', 'articles', 'events'];
    const fields = {
      'photos': ['url'],
      'videos': ['thumbnail', 'video'],
      'music': ['cover', 'audio'],
      'articles': ['cover'],
      'events': ['image']
    };

    for (const table of tables) {
      const tableFields = fields[table];
      for (const field of tableFields) {
        // 将 http://localhost:3001 替换为空字符串，转为相对路径
        const sql = `UPDATE ${table} SET ${field} = REPLACE(${field}, 'http://localhost:3001', '') WHERE ${field} LIKE 'http://localhost:3001%'`;
        
        try {
            await db.run(sql);
            console.log(`Executed update on ${table}.${field}`);
        } catch (e) {
             console.error(`Error updating ${table}.${field}:`, e.message);
        }
      }
    }
    console.log("数据库路径修复完成！");

  } catch (err) {
    console.error("Error:", err);
  }
})();
