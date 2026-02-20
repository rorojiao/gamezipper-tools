/* GameZipper Tools — Common JS */
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
      <div class="gz-actions">
        <button class="gz-lang-btn" onclick="GZ.toggleLang()">${lang === 'en' ? '中文' : 'EN'}</button>
      </div>`;
    document.body.prepend(header);
  }

  function renderFooter() {
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

  function toggleLang() {
    setLang(getLang() === 'en' ? 'zh' : 'en');
  }

  // AdSense
  function initAdsense() {
    if (document.querySelector('script[src*="pagead2"]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8346383990981353';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  return { $, $$, showToast, copyText, renderHeader, renderFooter, renderToolPage, toggleLang, initAdsense, CATEGORIES, t };
})();

// Auto-init AdSense
GZ.initAdsense();
