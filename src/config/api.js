import axios from 'axios';

// Instantiates a reusable Axios configuration cluster targeting the CoinGecko API node infrastructure
export const coinGeckoApi = axios.create({
    baseURL: 'https://api.coingecko.com/api/v3',
    timeout: 10000,
    headers: { 'Accept': 'application/json' }
});