const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const PROMPTS_DIR = path.join(__dirname, 'prompts');

const seed = async () => {
    console.log("🌱 Starting Prompt Seeding...");

    try {
        const files = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.md'));

        for (const file of files) {
            const key = file.replace('.md', '');
            const content = fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf8');

            console.log(`- Seeding: ${key}`);

            await pool.query(
                `INSERT INTO prompts (key, text) VALUES ($1, $2) 
                 ON CONFLICT (key) DO UPDATE SET text = EXCLUDED.text`,
                [key, content]
            );
        }

        console.log("✅ Seeding Complete!");
    } catch (err) {
        console.error("❌ Seeding Failed:", err);
    } finally {
        await pool.end();
    }
};

seed();
