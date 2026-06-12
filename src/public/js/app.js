let currentSelectedCoin = 'bitcoin';
let latestBtcPrice = 60000; 

const REFRESH_INTERVAL = 20;
let countdown = REFRESH_INTERVAL;
let isFirstLoad = true;

document.addEventListener('DOMContentLoaded', () => {
    initChart('#crypto-chart');
    
    renderCachedPrices();
    renderCachedWallet();
    
    // Initial fetch sequences targeting global SQLite instances
    syncActiveAlertsFeed();
    syncHistoricalLogsFeed();
    refreshData();

    setInterval(() => {
        countdown--;
        document.getElementById('update-timer').innerText = `${countdown}s`;
        
        if (countdown <= 0) {
            refreshData();
            countdown = REFRESH_INTERVAL;
        }
    }, 1000);

    document.getElementById('alert-form').addEventListener('submit', createAlert);
});

async function refreshData() {
    if (isFirstLoad) {
        setSyncStatus(true);
    }

    const currentPrices = await loadPrices();
    await loadChartHistory(currentSelectedCoin);
    
    if (currentPrices) {
        await checkServerAlerts();
    }
    
    const now = new Date();
    document.getElementById('last-sync-time').innerText = `Last sync: ${now.toLocaleTimeString()}`;
    
    if (isFirstLoad) {
        isFirstLoad = false;
        setSyncStatus(false);
    }
}

function setSyncStatus(isSyncingOldData) {
    const statusContainer = document.getElementById('last-sync-time').parentElement;
    let badge = document.getElementById('live-status-badge');
    
    if (!badge) {
        badge = statusContainer.querySelector('.flex.items-center');
        if (badge) badge.id = 'live-status-badge';
    }

    if (badge) {
        if (isSyncingOldData) {
            badge.className = "flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 px-3 py-1 rounded-full mb-0.5 animate-pulse";
            badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-amber-500"></span> Displaying Stale Session Data...`;
        } else {
            badge.className = "flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1 rounded-full mb-0.5";
            badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Connection`;
        }
    }
}

async function loadPrices() {
    try {
        const response = await fetch('/api/prices');
        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
            if (data.bitcoin) {
                latestBtcPrice = data.bitcoin.usd;
            }
            localStorage.setItem('natsuo_prices_cache', JSON.stringify(data));
            renderPriceCards(data);
            return data;
        }
    } catch (err) {
        console.error('Failed to parse ticker prices from server:', err);
    }
    return null;
}

async function loadChartHistory(coinId) {
    try {
        const response = await fetch(`/api/history/${coinId}`);
        const historicalData = await response.json();
        
        if (historicalData && historicalData.length > 0) {
            updateChartData(historicalData);
            renderTableRows(historicalData, coinId);
            
            const loader = document.getElementById('chart-loading');
            if (loader) {
                loader.style.opacity = '0';
                loader.style.pointerEvents = 'none';
            }
            
            currentSelectedCoin = coinId;
            document.getElementById('active-coin-title').innerText = coinId;
        }
    } catch (err) {
        console.error('Failed to load asset history matrix:', err);
    }
}

function renderTableRows(historicalData, coinId) {
    const tableBody = document.getElementById('db-history-rows');
    if (!tableBody) return;
    
    tableBody.innerHTML = ''; 
    const sortedEntries = [...historicalData].reverse();

    sortedEntries.forEach(entry => {
        const timestamp = entry[0];
        const price = entry[1];
        const formattedTime = new Date(timestamp).toLocaleTimeString();
        const formattedDate = new Date(timestamp).toLocaleDateString();

        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-800/30 transition-colors';
        row.innerHTML = `
            <td class="p-3 font-mono text-gray-400">
                <span class="text-gray-500 mr-1">${formattedDate}</span> ${formattedTime}
            </td>
            <td class="p-3 capitalize font-semibold text-cyan-400 flex items-center gap-1.5">
                <span class="text-[10px] bg-gray-800 text-gray-400 px-1 rounded uppercase">${coinId.substring(0,3)}</span>
                ${coinId}/USDT
            </td>
            <td class="p-3 text-right font-bold font-mono text-emerald-400">
                $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderCachedPrices() {
    const cache = localStorage.getItem('natsuo_prices_cache');
    if (cache) {
        const data = JSON.parse(cache);
        renderPriceCards(data, true); 
    }
}

function renderPriceCards(data, isCached = false) {
    const container = document.getElementById('price-cards');
    if (!data || Object.keys(data).length === 0) return;

    container.innerHTML = '';

    Object.keys(data).forEach(coin => {
        const coinData = data[coin];
        const isSelected = coin === currentSelectedCoin;

        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border cursor-pointer transition-all ${
            isSelected 
            ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10' 
            : 'bg-gray-900 border-gray-800 hover:border-gray-700'
        }`;
        
        card.onclick = () => {
            currentSelectedCoin = coin;
            loadChartHistory(coin);
        };

        let statusIndicator = '';
        if (isCached) {
            statusIndicator = `
                <div class="text-[10px] mt-2 p-1 bg-amber-950/30 border border-amber-900/50 rounded text-amber-400 font-medium animate-pulse text-center">
                    ⚠️ Stale session data
                </div>
            `;
        } else {
            statusIndicator = `
                <div class="text-xs mt-2 font-semibold text-emerald-400 flex items-center gap-1">
                    ▲ Live (Binance)
                </div>
            `;
        }

        card.innerHTML = `
            <div class="text-xs font-medium text-gray-400 uppercase tracking-wider">${coin}</div>
            <div class="text-base font-bold text-white mt-1">$${coinData.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            ${statusIndicator}
        `;
        container.appendChild(card);
    });
}

// ==========================================
// FEATURE: ON-CHAIN WALLET QUERY HANDLER
// ==========================================
async function checkWalletBalance() {
    let input = document.getElementById('wallet-address').value.trim();
    if (!input) {
        alert('Please provide a valid transaction address or extended public key.');
        return;
    }

    if (input.toLowerCase().startsWith('bitcoin:')) input = input.substring(8);
    if (input.includes('?')) input = input.split('?')[0];

    const btn = document.querySelector("button[onclick='checkWalletBalance()']");
    const originalText = btn.innerText;
    btn.innerText = "Syncing Node Layer...";
    btn.disabled = true;

    const cachedData = localStorage.getItem(`wallet_${input}`);
    if (cachedData) {
        const cached = JSON.parse(cachedData);
        showWalletUI(cached.btc, cached.usd, true);
    }

    try {
        const response = await fetch(`/api/wallet/${input}`);
        if (!response.ok) throw new Error('Invalid signature payload configuration.');
        
        const data = await response.json();
        const walletData = data[input]; 
        if (!walletData) throw new Error('On-chain tracking records missing.');

        const btcBalance = walletData.final_balance / 100000000;
        const usdValue = btcBalance * latestBtcPrice;

        localStorage.setItem(`wallet_${input}`, JSON.stringify({
            btc: btcBalance.toFixed(8),
            usd: usdValue.toFixed(2),
            address: input
        }));
        localStorage.setItem('last_searched_wallet', input);
        showWalletUI(btcBalance.toFixed(8), usdValue.toFixed(2), false);

    } catch (err) {
        console.error(err);
        if (!cachedData) alert('Blockchain synchronization failed.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showWalletUI(btc, usd, isCached) {
    const resultDiv = document.getElementById('wallet-result');
    let alertBadge = document.getElementById('wallet-cache-alert');
    if (!alertBadge) {
        alertBadge = document.createElement('div');
        alertBadge.id = 'wallet-cache-alert';
        resultDiv.prepend(alertBadge);
    }

    if (isCached) {
        alertBadge.className = "mb-2 p-1.5 bg-amber-950/40 border border-amber-800/60 rounded text-[10px] text-amber-400 font-medium animate-pulse text-center";
        alertBadge.innerText = "⚠️ Displaying historical cache telemetry. Awaiting next block synchronization...";
    } else {
        alertBadge.className = "mb-2 p-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded text-[10px] text-emerald-400 font-medium text-center";
        alertBadge.innerText = "✅ On-chain ledger data synchronized successfully!";
    }

    document.getElementById('wallet-btc').innerText = `${parseFloat(btc).toFixed(8)} BTC`;
    document.getElementById('wallet-usd').innerText = `$${parseFloat(usd).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
    resultDiv.classList.remove('hidden');
}

function renderCachedWallet() {
    const lastWallet = localStorage.getItem('last_searched_wallet');
    if (lastWallet) {
        document.getElementById('wallet-address').value = lastWallet;
        const cachedData = localStorage.getItem(`wallet_${lastWallet}`);
        if (cachedData) {
            const cached = JSON.parse(cachedData);
            showWalletUI(cached.btc, cached.usd, true);
        }
    }
}

// ==========================================
// RADAR PRICE ALERTS OPERATIONS IN SQLITE
// ==========================================
async function createAlert(e) {
    e.preventDefault();
    const coin = document.getElementById('alert-coin').value;
    const condition = document.getElementById('alert-condition').value;
    const targetPrice = document.getElementById('alert-target').value;

    try {
        const response = await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coin, condition, targetPrice })
        });
        
        if (response.ok) {
            alert('Radar threshold monitor successfully deployed to SQLite!');
            document.getElementById('alert-target').value = '';
            syncActiveAlertsFeed();
        }
    } catch (err) {
        console.error('Failed to stream alert deployment to node instance:', err);
    }
}

async function checkServerAlerts() {
    try {
        const response = await fetch('/api/alerts/check');
        const triggered = await response.json();
        
        triggered.forEach(triggeredAlert => {
            triggerNativeNotification(`🚨 Target Breach!`, `Asset ${triggeredAlert.coin} triggered your target mark at $${triggeredAlert.targetPrice}!`);
        });

        if (triggered.length > 0) {
            syncActiveAlertsFeed();
            syncHistoricalLogsFeed();
        }
    } catch (err) {
        console.error('Failed to run conditional intercept verification checks:', err);
    }
}

async function syncActiveAlertsFeed() {
    try {
        const response = await fetch('/api/alerts/active');
        const list = await response.json();
        
        const container = document.getElementById('active-alerts-container');
        const countBadge = document.getElementById('active-alerts-count');
        countBadge.innerText = list.length;

        if (list.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-600 italic text-center py-2">No active radars deployed.</p>`;
            return;
        }

        container.innerHTML = '';
        list.forEach(alertItem => {
            const row = document.createElement('div');
            row.className = "flex items-center justify-between p-2 bg-gray-950/60 border border-gray-800 rounded-lg text-xs";
            const condSign = alertItem.condition === 'above' ? '≥' : '≤';
            
            row.innerHTML = `
                <div class="font-mono text-gray-300">
                    <span class="capitalize font-bold text-cyan-400">${alertItem.coin.substring(0,3)}</span> 
                    <span class="text-gray-500">${condSign}</span> 
                    <span class="text-amber-500 font-semibold">$${parseFloat(alertItem.targetPrice).toLocaleString()}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="editAlert(${alertItem.id}, '${alertItem.coin}', '${alertItem.condition}', ${alertItem.targetPrice})" class="text-gray-400 hover:text-cyan-400 transition-colors p-1">✏️</button>
                    <button onclick="deleteAlert(${alertItem.id})" class="text-gray-400 hover:text-rose-500 transition-colors p-1">❌</button>
                </div>
            `;
            container.appendChild(row);
        });
    } catch (err) {
        console.error('Failed syncing active watchlist entries:', err);
    }
}

async function syncHistoricalLogsFeed() {
    try {
        const response = await fetch('/api/alerts/logs');
        const logs = await response.json();
        const logBox = document.getElementById('alert-logs');

        if (logs.length === 0) {
            logBox.innerHTML = `<p class="text-center py-4 text-gray-600 italic">No alert threshold breaches intercepted in this active session block.</p>`;
            return;
        }

        logBox.innerHTML = '';
        logs.forEach(alertLog => {
            const dateStr = new Date(alertLog.timestamp).toLocaleTimeString();
            const item = document.createElement('div');
            item.className = 'p-2 bg-gray-800/40 border border-gray-800 rounded flex justify-between items-center border-l-4 border-l-amber-500 text-xs';
            item.innerHTML = `
                <div>
                    <span class="font-bold text-gray-200 capitalize">${alertLog.coin}</span> breached 
                    <span class="text-amber-400 font-semibold">$${alertLog.triggerPrice.toLocaleString()}</span>
                </div>
                <span class="text-[10px] text-gray-500">${dateStr}</span>
            `;
            logBox.appendChild(item);
        });
    } catch (err) {
        console.error('Failed syncing system log blocks:', err);
    }
}

async function deleteAlert(alertId) {
    try {
        await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
        syncActiveAlertsFeed();
    } catch (err) {
        console.error('Failed to clean item from relational ledger execution:', err);
    }
}

function editAlert(alertId, coin, condition, targetPrice) {
    document.getElementById('alert-coin').value = coin;
    document.getElementById('alert-condition').value = condition;
    document.getElementById('alert-target').value = targetPrice;
    deleteAlert(alertId);
}