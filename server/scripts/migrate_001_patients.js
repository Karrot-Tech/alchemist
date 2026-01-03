const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');
const db = new sqlite3.Database(dbPath);

console.log("Running Migration: Adding Patients Table and Linking Transcripts...");

db.serialize(() => {
    // 1. Create Patients Table
    db.run(`CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mrn TEXT,
        dob TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error("Error creating patients table:", err);
        else console.log("Patients table verified.");
    });

    // 2. Add patient_id column to transcripts if it doesn't exist
    // SQLite doesn't support IF EXISTS for ADD COLUMN, so we try and ignore error
    db.run(`ALTER TABLE transcripts ADD COLUMN patient_id INTEGER REFERENCES patients(id)`, (err) => {
        if (err && err.message.includes("duplicate column name")) {
            console.log("Column 'patient_id' already exists in transcripts.");
        } else if (err) {
            console.error("Error adding patient_id column:", err);
        } else {
            console.log("Added 'patient_id' column to transcripts.");
        }
    });
});

db.close(() => console.log("Migration complete."));
