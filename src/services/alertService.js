import * as dbService from './dbService.js';

const pendingClientNotifications = [];

export const registerAlert = async (coin, targetPrice, condition) => {
    return await dbService.insertAlert(coin, targetPrice, condition);
};

export const evaluatePricesForAlerts = async (currentPrices) => {
    try {
        const activeAlerts = await dbService.getActiveAlertsFromDB();
        
        for (const alert of activeAlerts) {
            const currentPrice = currentPrices[alert.coin]?.usd;
            if (!currentPrice) continue;

            let isTriggered = false;
            if (alert.condition === 'above' && currentPrice >= alert.targetPrice) isTriggered = true;
            if (alert.condition === 'below' && currentPrice <= alert.targetPrice) isTriggered = true;

            if (isTriggered) {
                // 1. Deactivate alert in database so it doesn't trigger continuously
                await dbService.deactivateAlertInDB(alert.id);
                
                // 2. Commit log into physical SQLite historical telemetry
                await dbService.logTriggeredAlertToDB(alert.coin, currentPrice, alert.targetPrice);
                
                // 3. Queue into short-lived buffer for real-time frontend consumption
                pendingClientNotifications.push({
                    id: alert.id,
                    coin: alert.coin,
                    targetPrice: alert.targetPrice,
                    triggerPrice: currentPrice,
                    timestamp: Date.now()
                });
            }
        }
    } catch (err) {
        console.error('Failed to run conditional alert intercept matrices:', err.message);
    }
};

export const getPendingTriggers = () => {
    const list = [...pendingClientNotifications];
    pendingClientNotifications.length = 0; 
    return list;
};

export const fetchActiveAlertsList = async () => {
    return await dbService.getActiveAlertsFromDB();
};

export const deleteAlertById = async (id) => {
    return await dbService.removeAlertFromDB(id);
};

export const fetchHistoricalLogs = async () => {
    return await dbService.getHistoricalLogsFromDB();
};