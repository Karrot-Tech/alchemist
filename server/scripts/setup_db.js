const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');
const db = new sqlite3.Database(dbPath);

// Load prompts from external .md files
const { loadPrompts } = require('../prompts/loader');
const PROMPTS = loadPrompts();

db.serialize(() => {
    console.log("Initializing database...");

    db.run(`CREATE TABLE IF NOT EXISTS prompts (
        key TEXT PRIMARY KEY,
        text TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        file_path TEXT,
        prompt_text TEXT,
        schema_json TEXT,
        owner_id TEXT -- NULL for Global, Clerk ID for Private
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mrn TEXT, 
        dob TEXT,
        doctor_id TEXT NOT NULL, -- Clerk User ID
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        patient_name TEXT NOT NULL,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        notes TEXT,
        doctor_id TEXT NOT NULL, -- Linked to doctor for fast access
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(patient_id) REFERENCES patients(id)
    )`);
    console.log("Database initialized.");

    PROMPTS.forEach(prompt => {
        db.run(`REPLACE INTO prompts (key, text) VALUES (?, ?)`, [prompt.key, prompt.text], (err) => {
            if (err) console.error(`Error inserting ${prompt.key}:`, err);
            else console.log(`Updated prompt: ${prompt.key}`);
        });
    });
});

db.close(() => {
    console.log("Database setup complete.");
});
