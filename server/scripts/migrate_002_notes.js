const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');
const db = new sqlite3.Database(dbPath);

console.log("Running Migration: Adding Notes Column...");

db.serialize(() => {
    db.run(`ALTER TABLE transcripts ADD COLUMN notes TEXT`, (err) => {
        if (err && err.message.includes("duplicate column name")) {
            console.log("Column 'notes' already exists in transcripts.");
        } else if (err) {
            console.error("Error adding notes column:", err);
        } else {
            console.log("Added 'notes' column to transcripts.");
        }
    });
});

db.close(() => console.log("Migration complete."));
