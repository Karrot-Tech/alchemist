const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');
const db = new sqlite3.Database(dbPath);

const PROMPTS = [
    {
        key: 'transcribe_audio',
        text: "Transcribe this audio strictly. Do not summarize. Identify speakers if possible. Output only the transcript text."
    },
    {
        key: 'validate_transcript',
        text: `Analyze the quality of the following transcript.
        
        <transcript>
        {{transcript}}
        </transcript>

        Provide a structured JSON assessment including quality_score (0-100), clarity, and suggestions.`
    },
    {
        key: 'assess_soap',
        text: `
        You are an expert Psychiatrist. Your goal is to create a structured SOAP Note based *strictly* on the provided patient transcript.

        <instructions>
        1.  **Grounding**: Do not hallucinate symptoms, medications, or events. If information is not present in the transcript, state "Not Reported" or leave it generic.
        2.  **Terminology**: Use professional medical terminology.
        3.  **Format**: Return *only* a valid JSON object.
        </instructions>

        <doctor_notes>
        {{notes}}
        </doctor_notes>
        
        <transcript>
        {{transcript}}
        </transcript>
        `
    }
];

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
        schema_json TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_name TEXT NOT NULL,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
