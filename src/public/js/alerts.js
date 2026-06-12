// Requests authorization for native operating system system notifications
if (Notification.permission === 'default') {
    Notification.requestPermission();
}

function triggerNativeNotification(title, message) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'https://cdn-icons-png.flaticon.com/512/2856/2856849.png'
        });
    }
    // Fallback Sound Effect (Synthetic audio alert pitch via Web Audio API)
    playAlertSound();
}

function playAlertSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Note A (High Pitch)
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3); // Play for 300ms
    } catch (e) {
        console.log('AudioContext initialization blocked until explicit user interaction state.');
    }
}

function appendToLog(alert) {
    const logBox = document.getElementById('alert-logs');
    // Flushes initial empty italic placeholder text layout on the first execution block
    if (logBox.querySelector('p.italic')) logBox.innerHTML = '';

    const dateStr = new Date(alert.timestamp).toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'p-2 bg-gray-800/40 border border-gray-800 rounded flex justify-between items-center border-l-4 border-l-amber-500';
    item.innerHTML = `
        <div>
            <span class="font-bold text-gray-200 capitalize">${alert.coin}</span> breached 
            <span class="text-amber-400 font-semibold">$${alert.triggerPrice.toLocaleString()}</span>
        </div>
        <span class="text-[10px] text-gray-500">${dateStr}</span>
    `;
    logBox.prepend(item);
}