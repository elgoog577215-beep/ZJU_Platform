const ensureColumns = async (db, table, columns, label = table) => {
  try {
    const info = await db.all(`PRAGMA table_info(${table})`);
    const existing = new Set(info.map((col) => col.name));
    if (existing.size === 0) return;

    for (const [name, definition] of Object.entries(columns)) {
      if (!existing.has(name)) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
        console.log(`Added ${name} to ${label}`);
      }
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn(`Migration warning (${label} columns):`, err.message);
    }
  }
};

module.exports = {
  ensureColumns,
};
