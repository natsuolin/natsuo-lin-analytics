import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Failed to establish connection with SQLite instance:', err.message);
    else console.log('💾 SQLite relational engine initialized and connected successfully!');
});

// Enforces serialized creation execution for all platform schema requirements
db.serialize(() => {
    // 1. Ticker price history matrix table
    db.run(`
        CREATE TABLE IF NOT EXISTS crypto_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coin TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);

    // 2. NEW: Active threshold monitoring rules table
    db.run(`
        CREATE TABLE IF NOT EXISTS crypto_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coin TEXT NOT NULL,
            target_price REAL NOT NULL,
            condition TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        )
    `);

    // 3. NEW: Historical intercepted alert trigger rows table
    db.run(`
        CREATE TABLE IF NOT EXISTS alert_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coin TEXT NOT NULL,
            trigger_price REAL NOT NULL,
            target_price REAL NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);
});

export default db;