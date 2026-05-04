/* GameZipper Tools — Common JS */
(function(){
  var s1=document.createElement('script');s1.src='/shared/monetag-safe.js';s1.defer=true;document.head.appendChild(s1);s1.onload=function(){window.GZToolAds&&window.GZToolAds.init();};
  var s2=document.createElement('script');s2.src='/monetag-native.js';s2.defer=true;document.head.appendChild(s2);s2.onload=function(){window.GZToolsNativeAd&&window.GZToolsNativeAd.init();};
  var s3=document.createElement('script');s3.src='/shared/tools-sticky-ad.js';s3.defer=true;document.head.appendChild(s3);
})();
const GZ = (function(){
  const { t, getLang, setLang } = GZI18n;

  function $(s, p) { return (p || document).querySelector(s); }
  function $$(s, p) { return [...(p || document).querySelectorAll(s)]; }

  function showToast(msg) {
    let el = $('.gz-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'gz-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast(t('copied'))).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(t('copied'));
    });
  }

  const CATEGORIES = [
    { id: 'text', icon: '📝', path: '/text/' },
    { id: 'dev', icon: '💻', path: '/dev/' },
    { id: 'color', icon: '🎨', path: '/color/' },
    { id: 'image', icon: '🖼️', path: '/image/' },
    { id: 'css', icon: '✨', path: '/css-tools/' },
    { id: 'convert', icon: '🔄', path: '/convert/' },
    { id: 'fortune', icon: '🔮', path: '/fortune/' },
    { id: 'calc', icon: '🧮', path: '/calc/' },
    { id: 'seo', icon: '🔍', path: '/seo/' },
    { id: 'fun', icon: '🎲', path: '/fun/' },
  ];

  function renderHeader(activeCat) {
    const lang = getLang();
    const header = document.createElement('header');
    header.className = 'gz-header';
    header.innerHTML = `
      <a class="gz-logo" href="/">🛠️ ${t('brand')}</a>
      <nav class="gz-nav">
        ${CATEGORIES.map(c => `<a href="${c.path}" class="${activeCat === c.id ? 'active' : ''}">${c.icon} ${t(c.id + 'Tools')}</a>`).join('')}
      </nav>
      <a href="https://gamezipper.com" target="_blank" style="background:#ffd93d;color:#1a1a2e;padding:6px 14px;border-radius:20px;font-weight:700;font-size:0.85rem;text-decoration:none;margin-left:8px;white-space:nowrap;">🎮 Play Games</a>
      <div class="gz-actions">
        <button class="gz-lang-btn" onclick="GZ.toggleLang()"></button>
      </div>`;
    document.body.prepend(header);
    updateLangBtn();
  }

  function renderFooter() {
    const allGames = [
      {n:'2048',e:'🔢',u:'/2048/'},{n:'Basketball Shoot',e:'🏀',u:'/basketball-shoot/'},
      {n:'Sudoku',e:'🔢',u:'/sudoku/'},{n:'Snake',e:'🐍',u:'/snake/'},
      {n:'Minesweeper',e:'💣',u:'/minesweeper/'},{n:'Tetris',e:'🧱',u:'/tetris/'},
      {n:'Brick Breaker',e:'💥',u:'/brick-breaker/'},{n:'Neon Run',e:'⚡',u:'/neon-run/'},
      {n:'Color Sort',e:'🎨',u:'/color-sort/'},{n:'Bounce Bot',e:'🤖',u:'/bounce-bot/'},
      {n:'Sushi Stack',e:'🍣',u:'/sushi-stack/'},{n:'Wood Block',e:'🪵',u:'/wood-block-puzzle/'},
      {n:'Catch Turkey',e:'🦃',u:'/catch-turkey/'},{n:'Abyss Chef',e:'🍳',u:'/abyss-chef/'},
      {n:'Word Puzzle',e:'📝',u:'/word-puzzle/'},{n:'Idle Clicker',e:'👆',u:'/idle-clicker/'}
    ];
    // Pick 5 random games each load for variety
    const shuffled = allGames.slice().sort(function(){return 0.5-Math.random()});
    const picked = shuffled.slice(0,5);
    const linkStyle = 'background:var(--glass2);padding:6px 14px;border-radius:10px;text-decoration:none;color:var(--text);font-size:.8em;border:1px solid var(--border)';
    const gameLinks = picked.map(function(g){return '<a href="https://gamezipper.com'+g.u+'" style="'+linkStyle+'">'+g.e+' '+g.n+'</a>';}).join('');
    const games = document.createElement('section');
    games.style.cssText = 'max-width:1100px;margin:30px auto 0;padding:20px 24px;background:var(--glass);border:1px solid var(--border);border-radius:20px;text-align:center';
    games.innerHTML = '<h3 style="margin:0 0 12px;font-size:1rem"><a href="https://gamezipper.com" style="color:var(--accent);text-decoration:none">🎮 Take a Break — Play Free Games</a></h3><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">'+gameLinks+'<a href="https://gamezipper.com" style="background:var(--accent);color:#000;padding:6px 14px;border-radius:10px;text-decoration:none;font-size:.8em;font-weight:700">All Games →</a></div>';
    document.body.appendChild(games);
    const footer = document.createElement('footer');
    footer.className = 'gz-footer';
    footer.innerHTML = `
      <p>${t('madeWith')} <a href="https://gamezipper.com">GameZipper</a> · 
      <a href="https://gamezipper.com">${t('gamesAt')} gamezipper.com 🎮</a></p>
      <p style="margin-top:6px;font-size:0.75rem">${t('privacyNote')}</p>`;
    document.body.appendChild(footer);
  }

  function renderToolPage(opts) {
    // opts: { category, titleKey, descKey, howToSteps, related }
    renderHeader(opts.category);
    
    // Tool header
    const hdr = $('.gz-tool-header');
    if (hdr) {
      hdr.querySelector('h1').textContent = t(opts.titleKey);
      const desc = hdr.querySelector('.desc');
      if (desc) desc.textContent = t(opts.descKey);
      // Privacy badge
      let privacy = hdr.querySelector('.privacy');
      if (!privacy) {
        privacy = document.createElement('div');
        privacy.className = 'privacy';
        privacy.innerHTML = `🔒 ${t('privacyNote')}`;
        hdr.appendChild(privacy);
      }
    }

    // How to use
    if (opts.howToSteps) {
      const howto = $('.gz-howto');
      if (howto) {
        howto.querySelector('h2').textContent = t('howToUse');
        const ol = howto.querySelector('ol');
        if (ol) ol.innerHTML = opts.howToSteps.map((s, i) => `<li>${t(s) || s}</li>`).join('');
      }
    }

    // Related tools
    if (opts.related && opts.related.length) {
      const rel = $('.gz-related');
      if (rel) {
        rel.querySelector('h2').textContent = t('relatedTools');
        const grid = rel.querySelector('.gz-related-grid');
        if (grid) grid.innerHTML = opts.related.map(r => `<a class="gz-related-card" href="${r.href}"><span class="icon">${r.icon}</span><span class="name">${t(r.nameKey) || r.name}</span></a>`).join('');
      }
    }

    renderFooter();
  }

  function updateLangBtn() {
    const btn = document.querySelector('.gz-lang-btn');
    if (btn) btn.textContent = getLang() === 'en' ? '中文' : 'EN';
  }

  function toggleLang() {
    setLang(getLang() === 'en' ? 'zh' : 'en');
    updateLangBtn();
  }

  return { $, $$, showToast, copyText, renderHeader, renderFooter, renderToolPage, toggleLang, CATEGORIES, t };
})();

