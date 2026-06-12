import * as cryptoService from '../services/cryptoService.js';
import * as alertService from '../services/alertService.js';

export const getPrices = async (req, res) => {
    const prices = await cryptoService.fetchCurrentPrices();
    alertService.evaluatePricesForAlerts(prices);
    res.json(prices);
};

export const getHistory = async (req, res) => {
    const { coin } = req.params;
    try {
        const history = await cryptoService.fetchCoinHistory(coin);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to resolve historical database context streams.' });
    }
};

export const createAlert = async (req, res) => {
    const { coin, targetPrice, condition } = req.body;
    if (!coin || !targetPrice || !condition) {
        return res.status(400).json({ error: 'Insufficient payload parameters provided for alert registration.' });
    }
    try {
        const alert = await alertService.registerAlert(coin, targetPrice, condition);
        res.status(201).json(alert);
    } catch (err) {
        res.status(500).json({ error: 'Database engine failure writing watch entry.' });
    }
};

export const checkAlertsTriggered = (req, res) => {
    const triggers = alertService.getPendingTriggers();
    res.json(triggers);
};

// NEW ENDPOINTS: RELATIONAL PERSISTENCE ROUTING LAYERS
export const getActiveAlerts = async (req, res) => {
    const list = await alertService.fetchActiveAlertsList();
    res.json(list);
};

export const removeAlert = async (req, res) => {
    const { id } = req.params;
    await alertService.deleteAlertById(id);
    res.json({ success: true });
};

export const getAlertLogsHistory = async (req, res) => {
    const logs = await alertService.fetchHistoricalLogs();
    res.json(logs);
};