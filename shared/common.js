/* GameZipper Tools — Common JS — tunnel: garden-cricket-aged-depends
 * v5.5.4-tools-platform-account (2026-06-27, P0 task t_5e438852):
 *   Inject <meta name="google-adsense-platform-account" content="ca-pub-8346383990981353">
 *   at parse time. AdSense Auto Ads REQUIRES this meta to register the publisher
 *   account; tools site had 0 of it (gamezipper.com has 406) → 24h AdSense fill=0
 *   even when adsense-auto.js loaded successfully (3 script_loaded in last 24h).
 *   Mirrors gamezipper.com/<game>/index.html line 201.
 *   Safe: <meta> in <head> is idempotent — duplicate has no effect.
 * v5.5.3-tools-preconnect (2026-06-25, P1 task t_de6e7e3f):
 *   Inject preconnect + dns-prefetch for ad/analytics CDNs at the top of common.js.
 *   common.js is parser-blocking (no defer/async), so the browser starts DNS
 *   resolution + TLS handshake for these origins ~50-200ms before the deferred
 *   ad scripts (adsense-auto.js, monetag-manager.js) load and request resources.
 *   Affects all 2769 HTML pages that include shared/common.js.
 *   Mirrors index.html lines 73-80 + gamezipper.com's manual preconnect set.
 *   Browser dedups preconnect hints, so this is safe even on pages that already
 *   have them in <head> (only index.html and 2 zh siblings).
 *   Domains:
 *     - pagead2.googlesyndication.com → AdSense auto-ads (https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js)
 *     - a.magsrv.com + static.magsrv.com → Monetag in-page push (CDN 530 root cause)
 *     - bi.gamezipper.com → BI server analytics (referenced from gz-analytics.js)
 *   dns-prefetch is the fallback for browsers without preconnect (older Firefox/Safari).
 */
(function(){
  // ── v5.5.4 platform-account meta injection (P0 t_5e438852) — MUST run BEFORE AdSense ──
  try {
    if (!document.querySelector('meta[name="google-adsense-platform-account"]')) {
      var m = document.createElement('meta');
      m.name = 'google-adsense-platform-account';
      m.content = 'ca-pub-8346383990981353';
      document.head.appendChild(m);
    }
  } catch(e) { /* non-fatal */ }

  // ── v5.5.3 preconnect/dns-prefetch injection (runs synchronously during HTML parse) ──
  try {
    var hints = [
      { rel: 'preconnect',  href: 'https://pagead2.googlesyndication.com', crossorigin: true },
      { rel: 'preconnect',  href: 'https://a.magsrv.com',                 crossorigin: true },
      { rel: 'preconnect',  href: 'https://static.magsrv.com',            crossorigin: true },
      { rel: 'preconnect',  href: 'https://bi.gamezipper.com',            crossorigin: true },
      { rel: 'dns-prefetch', href: 'https://pagead2.googlesyndication.com' },
      { rel: 'dns-prefetch', href: 'https://a.magsrv.com' },
      { rel: 'dns-prefetch', href: 'https://static.magsrv.com' }
    ];
    for (var i = 0; i < hints.length; i++) {
      var h = hints[i];
      var l = document.createElement('link');
      l.rel = h.rel;
      l.href = h.href;
      if (h.crossorigin) l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    }
  } catch(e) {
    // Non-fatal: tools pages without document.head (very rare) just lose the hints.
  }

  // 2026-06-10: BI server collect endpoint for tools.site ad events.
  // Set BEFORE monetag-manager.js loads so trackAdEvent() can find it (sendBeacon fallback).
  // URL kept in sync with watchdog (gamezipper.com/gz-analytics.js); tunnel rotates ~every few hours.
  window.GZ_COLLECT_ENDPOINT = 'https://growing-collaboration-width-minimize.trycloudflare.com/api/collect';
  // v6.5: load adsterra-manager.js (no-op when zone IDs placeholder, zero resource cost)
  var sAd=document.createElement('script');sAd.src='/adsterra-manager.js?v=20260618P0fix';sAd.defer=true;document.head.appendChild(sAd);
  // v5.9.1 (2026-06-27): bump cache to invalidate v5.9 zone-backoff curve. Old
  // v5.10 (2026-06-27): Banner AdSense Tier 0 + event completeness. v5.9.2 had
  // [10/30/120min] backoffs; v5.10 same backoff curve but adds AdSense Tier 0
  // to homepage banner waterfall. Cache suffix must be monotonically increasing
  // to avoid browser reusing old v5.9.2 from cache.
  var s1=document.createElement('script');s1.src='/monetag-manager.js?v=20260627002';s1.defer=true;document.head.appendChild(s1);
  // (adsterra-manager.js was removed in v5.5.2 since zone IDs were placeholders; v6.5 re-adds it)
  // v5.4.3 (2026-06-21): mid-content ad slots + enhanced load_error diagnostics
  var s4=document.createElement('script');s4.src='/adsense-auto.js?v=20260627444';s4.defer=true;document.head.appendChild(s4);
  var s3=document.createElement('script');s3.src='/shared/tools-sticky-ad.js';s3.defer=true;document.head.appendChild(s3);
  // 2026-06-14: load gz-analytics.js globally so every tools page fires page_view
  // with vid/sid (replaces per-page new Image().src hits to site-analytics.gamezipper.com
  // which returns 501 with no data). Catches all 1780 subpages that load common.js.
  // Cache v=20260614aa is the first tools-side bump; higher lexicographically than
  // gamezipper.com's v=202606147b so we know it's the new one.
  var s5=document.createElement("script");s5.src="/gz-analytics.js?v=20260618P0fix";s5.defer=true;s5.fetchPriority='low';s5.crossOrigin='anonymous';document.head.appendChild(s5);
  // t.js removed (2026-06-14): bi.gamezipper.com/t.js endpoint serves Metabase HTML
  // (the BI subdomain points to a Metabase dashboard, not the FastAPI analytics
  // server which is only reachable via the cloudflared tunnel). vid/sid is now
  // generated inline by adsense-auto.js / monetag-manager.js (see their IIFE setup).
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
      <a href="https://gamezipper.com" style="color:var(--text2);text-decoration:none;font-size:0.8rem;margin-left:12px;white-space:nowrap;">${t('mainSite')} →</a>
      <a href="https://gamezipper.com" target="_blank" style="background:#ffd93d;color:#1a1a2e;padding:6px 14px;border-radius:20px;font-weight:700;font-size:0.85rem;text-decoration:none;margin-left:8px;white-space:nowrap;">🎮 Play Games</a>
      <div class="gz-actions">
        <button class="gz-lang-btn" onclick="GZ.toggleLang()"></button>
      </div>`;
    document.body.prepend(header);
    updateLangBtn();
  }

  function renderFooter() {
    const allGames = [
      {n:'2048',e:'🔢',u:'/2048/'},{n:'Abyss Chef',e:'🍳',u:'/abyss-chef/'},
      {n:'Alien Whack',e:'👽',u:'/alien-whack/'},{n:'Ball Catch',e:'⚽',u:'/ball-catch/'},
      {n:'Basketball Shoot',e:'🏀',u:'/basketball-shoot/'},{n:'Bolt Jam 3D',e:'⚡',u:'/bolt-jam-3d/'},
      {n:'Bounce Bot',e:'🤖',u:'/bounce-bot/'},{n:'Brick Breaker',e:'💥',u:'/brick-breaker/'},
      {n:'Catch Turkey',e:'🦃',u:'/catch-turkey/'},{n:'Chess',e:'♟️',u:'/chess/'},
      {n:'Cloud Sheep',e:'☁️',u:'/cloud-sheep/'},{n:'Color Sort',e:'🎨',u:'/color-sort/'},
      {n:'Crossword',e:'📰',u:'/crossword/'},{n:'Dessert Blast',e:'🍰',u:'/dessert-blast/'},
      {n:'Flappy Wings',e:'🐦',u:'/flappy-wings/'},{n:'Fruit Slash',e:'🍉',u:'/fruit-slash/'},
      {n:'Glyph Quest',e:'🔮',u:'/glyph-quest/'},{n:'Idle Clicker',e:'👆',u:'/idle-clicker/'},
      {n:'Kitty Cafe',e:'🐱',u:'/kitty-cafe/'},{n:'Magic Sort',e:'✨',u:'/magic-sort/'},
      {n:'Memory Match',e:'🧠',u:'/memory-match/'},{n:'Minesweeper',e:'💣',u:'/minesweeper/'},
      {n:'Neon Run',e:'🌈',u:'/neon-run/'},{n:'Ocean Gem Pop',e:'💎',u:'/ocean-gem-pop/'},
      {n:'Paint Splash',e:'🎨',u:'/paint-splash/'},{n:'Phantom Blade',e:'⚔️',u:'/phantom-blade/'},
      {n:'Pong',e:'🏓',u:'/pong/'},{n:'Reaction Time',e:'⏱️',u:'/reaction-time/'},
      {n:'Slope',e:'🏔️',u:'/slope/'},{n:'Snake',e:'🐍',u:'/snake/'},
      {n:'Stacker',e:'📦',u:'/stacker/'},{n:'Sudoku',e:'🔢',u:'/sudoku/'},
      {n:'Sushi Stack',e:'🍣',u:'/sushi-stack/'},{n:'T-Rex',e:'🦖',u:'/t-rex/'},
      {n:'Tetris',e:'🧱',u:'/tetris/'},{n:'Typing Speed',e:'⌨️',u:'/typing-speed/'},
      {n:'Whack-a-Mole',e:'🔨',u:'/whack-a-mole/'},{n:'Wood Block',e:'🪵',u:'/wood-block-puzzle/'},
      {n:'Word Puzzle',e:'📝',u:'/word-puzzle/'}
    ];
    // Pick 8 random games each load for variety and better link distribution
    const shuffled = allGames.slice().sort(function(){return 0.5-Math.random()});
    const picked = shuffled.slice(0,8);
    // Ad container below tool content
    var adBelow = document.createElement('div');
    adBelow.id = 'gz-tools-ad-below';
    adBelow.style.cssText = 'min-height:100px;margin:20px auto;max-width:728px;text-align:center';
    document.body.appendChild(adBelow);

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

    // Auto-apply data-i18n attributes
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (translated && translated !== key) {
        // Preserve child elements (like inputs inside labels)
        const children = [...el.childNodes];
        const hasChildElements = children.some(c => c.nodeType === 1);
        if (hasChildElements) {
          // Only replace text nodes
          children.forEach(c => {
            if (c.nodeType === 3 && c.textContent.trim()) c.textContent = translated + ' ';
          });
        } else {
          el.textContent = translated;
        }
      }
    });
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

