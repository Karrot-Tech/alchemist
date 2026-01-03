const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        console.log("Connecting to Database...");
        const client = await pool.connect();
        console.log("✅ Connected successfully!");

        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("Tables found:", res.rows.map(r => r.table_name));

        client.release();
        process.exit(0);
    } catch (err) {
        console.error("❌ Connection failed:", err);
        process.exit(1);
    }
}

verify();
