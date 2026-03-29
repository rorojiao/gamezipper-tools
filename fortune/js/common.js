// Common utilities
const WALLET = '0xEeD903787Cb86bcCc17777E5C7d10A4c2De43823';
const SITE_URL = 'https://tools.gamezipper.com/fortune/';

function getTipBoxHTML() {
    return `
    <div class="tip-box">
        <p class="tip-text">Found this accurate？Buy Princess Xiangxiang a bubble tea 🧋</p>
        <div class="wallet" onclick="copyWallet()" title="Click to copy">${WALLET}</div>
        <p style="font-size:0.8em;color:#776655;">👆 Click to copy wallet address</p>
        <div class="chains">
            <span class="chain-tag">ETH</span>
            <span class="chain-tag">USDC</span>
            <span class="chain-tag">BSC (BNB Chain)</span>
            <span class="chain-tag">Polygon</span>
        </div>
    </div>`;
}

function getShareBarHTML(title, text) {
    const url = encodeURIComponent(window.location.href);
    const t = encodeURIComponent(title || document.title);
    const txt = encodeURIComponent(text || '');
    return `
    <div class="share-bar">
        <a class="share-btn" onclick="shareWeChat()" href="javascript:void(0)">📱 WeChat Share</a>
        <a class="share-btn" href="https://service.weibo.com/share/share.php?url=${url}&title=${t}" target="_blank">🔴 Weibo</a>
        <a class="share-btn" href="https://twitter.com/intent/tweet?url=${url}&text=${t}" target="_blank">🐦 Twitter</a>
        <a class="share-btn" onclick="copyResult()" href="javascript:void(0)">📋 Copy Result</a>
    </div>`;
}

function copyWallet() {
    navigator.clipboard.writeText(WALLET).then(() => {
        showToast('Wallet address copied ✅');
    }).catch(() => {
        prompt('Please copy wallet address:', WALLET);
    });
}

function shareWeChat() {
    showToast('Please screenshot and share on WeChat Moments 📸');
}

let _resultText = '';
function setResultText(t) { _resultText = t; }
function copyResult() {
    const text = _resultText || document.querySelector('.result-area')?.innerText || '';
    navigator.clipboard.writeText(text + '\n\nFrom Fortune Tools: ' + SITE_URL).then(() => {
        showToast('Result copied ✅');
    });
}

function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(255,215,0,0.9);color:#1a0a00;padding:10px 24px;border-radius:20px;font-size:0.9em;z-index:9999;transition:opacity 0.3s;font-family:"Noto Serif SC",serif;';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2000);
}

// Pseudo-random with seed for reproducible daily results
function seededRandom(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = ((s << 5) - s) + seed.charCodeAt(i);
    return function() {
        s = (s * 16807 + 0) % 2147483647;
        return (s & 0x7fffffff) / 0x7fffffff;
    };
}

function pickRandom(arr, rng) {
    const r = rng ? rng() : Math.random();
    return arr[Math.floor(r * arr.length)];
}

function getPageFooterHTML() {
    return `<div class="page-footer"><p>Fortune Tools © 2024 | For entertainment purposes only</p></div>`;
}
