const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.each("SELECT key, text FROM prompts", (err, row) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`\n--- [${row.key}] ---`);
            console.log(row.text);
            console.log("--------------------");
        }
    });
});

db.close();
