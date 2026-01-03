const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');
const db = new sqlite3.Database(dbPath);

console.log("Connecting to database at:", dbPath);

db.serialize(() => {
    db.run("DELETE FROM templates", function (err) {
        if (err) {
            console.error("Error wiping templates:", err);
            process.exit(1);
        } else {
            console.log(`Success: Deleted ${this.changes} templates.`);
        }
    });
});

db.close();
