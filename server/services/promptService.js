const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');

class PromptService {
    constructor() {
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Could not connect to database', err);
            } else {
                console.log('Connected to prompts database');
                this.init();
            }
        });
    }

    init() {
        this.db.serialize(() => {
            // Prompts Table
            this.db.run(`CREATE TABLE IF NOT EXISTS prompts (
                key TEXT PRIMARY KEY,
                text TEXT NOT NULL
            )`);

            // Templates Table
            this.db.run(`CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                file_path TEXT NOT NULL,
                prompt_text TEXT NOT NULL,
                schema_json TEXT NOT NULL
            )`);
        });
    }

    // --- Prompts ---
    get(key, defaultText) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT text FROM prompts WHERE key = ?", [key], (err, row) => {
                if (err) return reject(err);
                if (row) {
                    resolve(row.text);
                } else {
                    this.db.run("INSERT INTO prompts (key, text) VALUES (?, ?)", [key, defaultText], (err) => {
                        if (err) console.error("Error seeding prompt:", err);
                    });
                    resolve(defaultText);
                }
            });
        });
    }

    // --- Templates ---
    getAllTemplates() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM templates ORDER BY id DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getTemplate(id) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM templates WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    saveTemplate(name, description, filePath, promptText, schemaJson) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`INSERT INTO templates (name, description, file_path, prompt_text, schema_json) VALUES (?, ?, ?, ?, ?)`);
            stmt.run([name, description, filePath, promptText, JSON.stringify(schemaJson)], function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
            stmt.finalize();
        });
    }

    // --- Transcripts ---
    saveTranscript(patientName, date, content) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO transcripts (patient_name, date, content) VALUES (?, ?, ?)`,
                [patientName, date, content],
                function (err) {
                    if (err) {
                        console.error("DB Insert Error:", err.message);
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    getAllTranscripts() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT id, patient_name, date, created_at FROM transcripts ORDER BY created_at DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getTranscriptById(id) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM transcripts WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
}

module.exports = new PromptService();
