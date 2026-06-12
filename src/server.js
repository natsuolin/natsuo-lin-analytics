import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios'; 
import * as cryptoController from './controllers/cryptoController.js';
import * as cryptoService from './services/cryptoService.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Serve static UI assets for the Front-End client
app.use(express.static(path.join(__dirname, 'public')));

// Core Platform API Routes
app.get('/api/prices', cryptoController.getPrices);
app.get('/api/history/:coin', cryptoController.getHistory);
app.post('/api/alerts', cryptoController.createAlert);
app.get('/api/alerts/check', cryptoController.checkAlertsTriggered);

// SECURE ON-CHAIN ROUTE: Normalizes extended public targets and individual addresses via Mempool Node API proxy
app.get('/api/wallet/:address', async (req, res) => {
    const { address } = req.params;
    
    try {
        console.log(`🔍 Web3 Scanner: Processing wallet ledger for target: ${address}`);
        
        let url = '';
        const isXpub = /^[xyz]pub[a-zA-Z0-9]/.test(address);

        if (isXpub) {
            url = `https://mempool.space/api/v1/xpub/${address}`;
        } else {
            url = `https://mempool.space/api/address/${address}`;
        }

        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
        });

        const stats = response.data.chain_stats;
        const funded = stats.funded_txo_sum || 0;
        const spent = stats.spent_txo_sum || 0;
        const satoshiBalance = funded - spent;

        res.json({
            [address]: {
                final_balance: satoshiBalance
            }
        });

    } catch (error) {
        console.error('Node instance intercept warning on deep scanning constraint:', error.message);
        
        // Handles 400/404 node rejection paths gracefully with an unprocessable entity 422 JSON response mapping
        res.status(422).json({ 
            error: 'RESTRICTED_XPUB',
            message: 'Free public indexers restrict full extended cryptographic key deep tracking (zpub/ypub) to prevent resource overloads.' 
        });
    }
});

// Adicione essas novas assinaturas de rotas junto com as demais no seu src/server.js
app.get('/api/alerts/active', cryptoController.getActiveAlerts);
app.delete('/api/alerts/:id', cryptoController.removeAlert);
app.get('/api/alerts/logs', cryptoController.getAlertLogsHistory);

// Fire up background persistent collection cycles: Binance -> SQLite -> Dashboard UI
cryptoService.startPriceCollector();

app.listen(PORT, () => {
    console.log(`🚀 Web3 Analytical Server engine online at http://localhost:${PORT}`);
});