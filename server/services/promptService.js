
const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

class PromptService {
    constructor() {
        this.promptsDir = path.resolve(__dirname, '../prompts');
        // Environment variable DATABASE_URL must be set
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
        this.init();
    }

    // Helper to get default prompt from file (read-only fallback)
    loadSystemPromptFromFile(filename) {
        return new Promise((resolve, reject) => {
            fs.readFile(path.join(this.promptsDir, filename), 'utf8', (err, data) => {
                if (err) resolve(""); // Fail gracefully
                else resolve(data);
            });
        });
    }

    // Load from DB, fallback to code-bundled defaults or file if needed
    async loadSystemPrompt(filename) {
        const key = filename.replace('.md', ''); // Use filename as key mostly
        const dbContent = await this.get(key, null);
        if (dbContent) return dbContent;

        // Fallback to file reading if DB is empty for this key
        return await this.loadSystemPromptFromFile(filename);
    }

    async saveSystemPrompt(filename, content) {
        const key = filename.replace('.md', '');
        // Only save to DB
        await this.pool.query(
            `INSERT INTO prompts (key, text) VALUES ($1, $2) 
             ON CONFLICT (key) DO UPDATE SET text = $2`,
            [key, content]
        );
    }

    async init() {
        try {
            const client = await this.pool.connect();
            try {
                // Prompts Table
                await client.query(`
                    CREATE TABLE IF NOT EXISTS prompts (
                        key TEXT PRIMARY KEY,
                        text TEXT NOT NULL
                    )
                `);

                // Templates Table
                await client.query(`
                    CREATE TABLE IF NOT EXISTS templates (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        file_path TEXT NOT NULL,
                        prompt_text TEXT NOT NULL,
                        schema_json TEXT NOT NULL,
                        owner_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Patients Table
                await client.query(`
                    CREATE TABLE IF NOT EXISTS patients (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        mrn TEXT,
                        dob TEXT,
                        doctor_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Transcripts Table
                await client.query(`
                    CREATE TABLE IF NOT EXISTS transcripts (
                        id SERIAL PRIMARY KEY,
                        patient_name TEXT,
                        date TEXT,
                        content TEXT,
                        notes TEXT,
                        audio_url TEXT,
                        assessment_text TEXT,
                        patient_id INTEGER REFERENCES patients(id),
                        doctor_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Migrations (for existing tables)
                try { await client.query(`ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS audio_url TEXT`); } catch (e) { }
                // [DEPRECATED] assessment_text on transcripts table, moved to assessments table

                // Assessments Table (One Transcript -> Multiple Assessments)
                await client.query(`
                    CREATE TABLE IF NOT EXISTS assessments (
                        id SERIAL PRIMARY KEY,
                        transcript_id INTEGER REFERENCES transcripts(id) ON DELETE CASCADE,
                        template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
                        content JSONB,
                        doctor_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

            } finally {
                client.release();
            }
        } catch (err) {
            console.error("Failed to initialize database schema:", err);
            // Don't crash here, might be a connection issue that resolves later
        }
    }

    // --- Prompts ---
    async get(key, defaultText) {
        try {
            const result = await this.pool.query("SELECT text FROM prompts WHERE key = $1", [key]);
            if (result.rows.length > 0) {
                return result.rows[0].text;
            } else if (defaultText !== null) {
                // Only seed if we have a default text provided
                try {
                    await this.pool.query("INSERT INTO prompts (key, text) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", [key, defaultText]);
                } catch (e) { console.error("Error seeding prompt:", e); }
                return defaultText;
            }
            return null;
        } catch (err) {
            console.error(`Error fetching prompt ${key}:`, err);
            return defaultText; // Graceful fallback
        }
    }

    // --- Templates ---
    async getAllTemplates(userId) {
        try {
            const result = await this.pool.query(
                "SELECT * FROM templates WHERE owner_id IS NULL OR owner_id = $1 ORDER BY id DESC",
                [userId]
            );
            return result.rows;
        } catch (err) {
            throw err;
        }
    }

    async getTemplate(id) {
        try {
            const result = await this.pool.query("SELECT * FROM templates WHERE id = $1", [id]);
            return result.rows[0];
        } catch (err) {
            throw err;
        }
    }

    async createTemplate(name, description, filePath, promptText, schemaJson, userId) {
        try {
            const result = await this.pool.query(
                `INSERT INTO templates(name, description, file_path, prompt_text, schema_json, owner_id) 
                 VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
                [name, description, filePath, promptText, JSON.stringify(schemaJson), userId]
            );
            return { id: result.rows[0].id };
        } catch (err) {
            throw err;
        }
    }

    async updateTemplate(id, name, description, promptText, schemaJson, userId) {
        try {
            const result = await this.pool.query(
                `UPDATE templates SET name = $1, description = $2, prompt_text = $3, schema_json = $4 
                 WHERE id = $5 AND owner_id = $6`,
                [name, description, promptText, JSON.stringify(schemaJson), id, userId]
            );
            return { success: true, rowCount: result.rowCount };
        } catch (err) {
            throw err;
        }
    }

    async deleteTemplate(id, userId) {
        try {
            const result = await this.pool.query(
                `DELETE FROM templates WHERE id = $1 AND owner_id = $2`,
                [id, userId]
            );
            return { success: true, rowCount: result.rowCount };
        } catch (err) {
            throw err;
        }
    }

    // --- Patients ---
    async getAllPatients(userId) {
        try {
            const result = await this.pool.query(
                "SELECT * FROM patients WHERE doctor_id = $1 ORDER BY name ASC",
                [userId]
            );
            return result.rows;
        } catch (err) {
            throw err;
        }
    }

    async createPatient(name, mrn, dob, userId) {
        try {
            const result = await this.pool.query(
                `INSERT INTO patients(name, mrn, dob, doctor_id) VALUES($1, $2, $3, $4) RETURNING id`,
                [name, mrn || '', dob || '', userId]
            );
            return { id: result.rows[0].id, name, mrn, dob };
        } catch (err) {
            throw err;
        }
    }

    async updatePatient(id, name, mrn, dob, userId) {
        try {
            const result = await this.pool.query(
                `UPDATE patients SET name = $1, mrn = $2, dob = $3 WHERE id = $4 AND doctor_id = $5`,
                [name, mrn || '', dob || '', id, userId]
            );
            if (result.rowCount === 0) throw new Error("Patient not found or unauthorized");
            return { id, name, mrn, dob };
        } catch (err) {
            throw err;
        }
    }

    // --- Transcripts ---
    async saveTranscript(patientName, date, content, notes, patientId, userId, audioUrl, assessmentText) {
        try {
            const result = await this.pool.query(
                `INSERT INTO transcripts(patient_name, date, content, notes, patient_id, doctor_id, audio_url, assessment_text) 
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [patientName, date, content, notes || '', patientId || null, userId, audioUrl || null, assessmentText || null]
            );
            return result.rows[0].id;
        } catch (err) {
            console.error("DB Insert Error:", err.message);
            throw err;
        }
    }

    async getAllTranscripts(userId) {
        try {
            const result = await this.pool.query(
                `SELECT t.*, 
                 (SELECT COUNT(*) FROM assessments a WHERE a.transcript_id = t.id) as assessment_count
                 FROM transcripts t 
                 WHERE t.doctor_id = $1 
                 ORDER BY t.created_at DESC`,
                [userId]
            );
            return result.rows;
        } catch (err) {
            throw err;
        }
    }

    async getTranscriptById(id, userId) {
        try {
            const result = await this.pool.query(
                "SELECT * FROM transcripts WHERE id = $1 AND doctor_id = $2",
                [id, userId]
            );
            return result.rows[0];
        } catch (err) {
            throw err;
        }
    }

    async updateTranscriptAssessment(id, assessmentText, userId) {
        // [LEGACY/COMPAT] Still updates the column for now, but we prefer the assessments table
        try {
            const result = await this.pool.query(
                `UPDATE transcripts SET assessment_text = $1 WHERE id = $2 AND doctor_id = $3`,
                [assessmentText, id, userId]
            );
            return { success: true, rowCount: result.rowCount };
        } catch (err) {
            throw err;
        }
    }

    async saveAssessment(transcriptId, templateId, content, userId) {
        try {
            const result = await this.pool.query(
                `INSERT INTO assessments(transcript_id, template_id, content, doctor_id) 
                 VALUES($1, $2, $3, $4) RETURNING id`,
                [transcriptId, templateId, content, userId]
            );
            return result.rows[0].id;
        } catch (err) {
            console.error("Error saving assessment:", err);
            throw err;
        }
    }

    async getAssessmentsForTranscript(transcriptId, userId) {
        try {
            const result = await this.pool.query(
                `SELECT a.*, t.name as template_name 
                 FROM assessments a 
                 LEFT JOIN templates t ON a.template_id = t.id
                 WHERE a.transcript_id = $1 AND a.doctor_id = $2
                 ORDER BY a.created_at DESC`,
                [transcriptId, userId]
            );
            return result.rows;
        } catch (err) {
            console.error("Error fetching assessments:", err);
            throw err;
        }
    }
}

module.exports = new PromptService();
