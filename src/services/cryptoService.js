import axios from 'axios';
import * as dbService from './dbService.js';

// Matrix of Binance trade pairs to track (Always suffixed with USDT)
const SYMBOLS = {
    'BTCUSDT': 'bitcoin',
    'ETHUSDT': 'ethereum',
    'SOLUSDT': 'solana',
    'ADAUSDT': 'cardano'
};

let localPriceCache = {};

export const fetchCurrentPrices = async () => {
    return localPriceCache;
};

// Background sub-routine worker fetching data streams from Binance and writing to SQLite
export const startPriceCollector = () => {
    console.log('🛰️ Binance Data Collector activated. Synchronizing asset streams with SQLite...');
    
    setInterval(async () => {
        try {
            // Highly performant public Binance multi-ticker endpoint
            const symbolsParam = JSON.stringify(Object.keys(SYMBOLS));
            const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbols=${symbolsParam}`);
            
            const tempCache = {};

            response.data.forEach(item => {
                const standardName = SYMBOLS[item.symbol];
                const price = parseFloat(item.price);
                
                // Formats payload model to ensure front-end client compatibility without structural breaking changes
                tempCache[standardName] = {
                    usd: price,
                    usd_24h_change: 0 // Binance demands alternative endpoint for 24h delta tracking; mocked for simplification
                };

                // Commits data snapshot vector straight into SQLite to generate true physical historical context!
                dbService.savePrice(standardName, price);
            });

            localPriceCache = tempCache;

        } catch (error) {
            console.error('Failed to parse active ticker snapshots from Binance API:', error.message);
        }
    }, 10000); // Polling window frequency set to 10 seconds for near real-time telemetry updates!
};

// Resolves chart analytical history datasets straight from your physical SQLite instance
export const fetchCoinHistory = async (coinId) => {
    return await dbService.getCoinHistoryFromDB(coinId);
};