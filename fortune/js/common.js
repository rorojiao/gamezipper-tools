// Common utilities
const WALLET = '0xEeD903787Cb86bcCc17777E5C7d10A4c2De43823';
const SITE_URL = 'https://tools.gamezipper.com/fortune/';

function getTipBoxHTML() {
    return `
    <div class="tip-box">
        <p class="tip-text">觉得算得准？打赏香香公主一杯奶茶 🧋</p>
        <div class="wallet" onclick="copyWallet()" title="点击复制">${WALLET}</div>
        <p style="font-size:0.8em;color:#776655;">👆 点击复制钱包地址</p>
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
        <a class="share-btn" onclick="shareWeChat()" href="javascript:void(0)">📱 微信分享</a>
        <a class="share-btn" href="https://service.weibo.com/share/share.php?url=${url}&title=${t}" target="_blank">🔴 微博</a>
        <a class="share-btn" href="https://twitter.com/intent/tweet?url=${url}&text=${t}" target="_blank">🐦 Twitter</a>
        <a class="share-btn" onclick="copyResult()" href="javascript:void(0)">📋 复制结果</a>
    </div>`;
}

function copyWallet() {
    navigator.clipboard.writeText(WALLET).then(() => {
        showToast('钱包地址已复制 ✅');
    }).catch(() => {
        prompt('请复制钱包地址:', WALLET);
    });
}

function shareWeChat() {
    showToast('请截图分享到微信朋友圈 📸');
}

let _resultText = '';
function setResultText(t) { _resultText = t; }
function copyResult() {
    const text = _resultText || document.querySelector('.result-area')?.innerText || '';
    navigator.clipboard.writeText(text + '\n\n来自灵算阁: ' + SITE_URL).then(() => {
        showToast('结果已复制 ✅');
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
    return `<div class="page-footer"><p>灵算阁 © 2024 | 仅供娱乐参考</p></div>`;
}
