import db from '../config/database.js';

// Commits the current price asset snapshot captured from Binance into the SQLite engine
export const savePrice = (coin, price) => {
    const timestamp = Date.now();
    const query = `INSERT INTO crypto_history (coin, price, timestamp) VALUES (?, ?, ?)`;
    
    db.run(query, [coin, price, timestamp], (err) => {
        if (err) console.error(`Failed to commit price ledger for ${coin} into database:`, err.message);
    });
};

// Fetches the saved historical dataset to fuel the chart interface metrics
export const getCoinHistoryFromDB = (coin) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT timestamp, price FROM crypto_history 
            WHERE coin = ? 
            ORDER BY timestamp DESC LIMIT 100
        `;
        db.all(query, [coin], (err, rows) => {
            if (err) reject(err);
            const formatted = rows.map(row => [row.timestamp, row.price]).reverse();
            resolve(formatted);
        });
    });
};

// ==========================================
// NEW FEATURES: SQLITE CRUD ENGINE FOR ALERTS
// ==========================================

export const insertAlert = (coin, targetPrice, condition) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO crypto_alerts (coin, target_price, condition) VALUES (?, ?, ?)`;
        db.run(query, [coin, targetPrice, condition], function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID, coin, targetPrice: parseFloat(targetPrice), condition, active: true });
        });
    });
};

export const getActiveAlertsFromDB = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id, coin, target_price AS targetPrice, condition FROM crypto_alerts WHERE is_active = 1`;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

export const removeAlertFromDB = (id) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM crypto_alerts WHERE id = ?`;
        db.run(query, [id], (err) => {
            if (err) reject(err);
            resolve(true);
        });
    });
};

export const deactivateAlertInDB = (id) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE crypto_alerts SET is_active = 0 WHERE id = ?`;
        db.run(query, [id], (err) => {
            if (err) reject(err);
            resolve(true);
        });
    });
};

export const logTriggeredAlertToDB = (coin, triggerPrice, targetPrice) => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const query = `INSERT INTO alert_logs (coin, trigger_price, target_price, timestamp) VALUES (?, ?, ?, ?)`;
        db.run(query, [coin, triggerPrice, targetPrice, timestamp], (err) => {
            if (err) reject(err);
            resolve(true);
        });
    });
};

export const getHistoricalLogsFromDB = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id, coin, trigger_price AS triggerPrice, target_price AS targetPrice, timestamp FROM alert_logs ORDER BY timestamp DESC LIMIT 30`;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};