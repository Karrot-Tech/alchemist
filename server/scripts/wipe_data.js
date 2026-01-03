const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../prompts.db');
const db = new sqlite3.Database(dbPath);

console.log("Connecting to database at:", dbPath);

db.serialize(() => {
    db.run("DELETE FROM transcripts", function (err) {
        if (err) console.error("Error wiping transcripts:", err);
        else console.log(`Deleted ${this.changes} transcripts.`);
    });

    // Optional: Wipe patients too? Yes, for a full clean slate as requested.
    db.run("DELETE FROM patients", function (err) {
        if (err) console.error("Error wiping patients:", err);
        else console.log(`Deleted ${this.changes} patients.`);
    });
});

db.close();
