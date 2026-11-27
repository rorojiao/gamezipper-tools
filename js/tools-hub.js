// R448 (2026-11-27): extracted from index.html + zh/index.html inline block
// (the two copies were code-identical, comments aside). Loaded with defer AFTER
// tools-data.js (defer preserves document order). HTML oninput/onclick handlers
// (filterTools/setFilter) are user-triggered so defer timing is safe.
// DISCIPLINE: bump ?v=rNNN in BOTH index.html and zh/index.html when editing.



const lang = GZI18n.getLang();
const DISPLAY_TOOL_COUNT = '2,544+';
const { t } = GZ;

// Add social category fallback if not in shared definitions
if (!GZ.CATEGORIES.find(c => c.id === 'social')) {
  GZ.CATEGORIES.push({ id: 'social', icon: '💬', path: '/?cat=social' });
}
// Register social i18n keys if missing
if (!GZI18n._data.en.socialTools) {
  GZI18n._data.en.socialTools = 'Social Media Tools';
  GZI18n._data.zh.socialTools = '社交媒体工具';
  GZI18n._data.en.socialToolsDesc = 'Generate chat mockups, social posts, thumbnails and shareable content for WhatsApp, iMessage, Instagram, Twitter and more.';
  GZI18n._data.zh.socialToolsDesc = '为 WhatsApp、iMessage、Instagram、Twitter 等平台生成聊天截图、社交帖子、缩略图和分享内容。';
}

// Render page
document.getElementById('hero-title').textContent = lang === 'zh' ? '🛠️ 免费在线工具箱' : '🛠️ Free Online Toolbox';
document.getElementById('hero-sub').textContent = lang === 'zh' ? `${DISPLAY_TOOL_COUNT} 免费工具，无需注册，即开即用` : `${DISPLAY_TOOL_COUNT} free tools, no signup required`;
document.getElementById('tool-count').textContent = lang === 'zh' ? `✨ ${DISPLAY_TOOL_COUNT} 个工具` : `✨ ${DISPLAY_TOOL_COUNT} tools`;
document.getElementById('hero-more-link').textContent = lang === 'zh' ? '← 更多免费工具尽在 GameZipper.com →' : '← More free tools at GameZipper.com →';
document.querySelector('.gz-search input').placeholder = t('search');

// Render header
GZ.renderHeader(null);

// Render filters
const cats = [
  {id:'all', en:'All', zh:'All'},
  ...GZ.CATEGORIES.map(c => ({id:c.id, en:t(c.id+'Tools'), zh:t(c.id+'Tools')}))
];
document.getElementById('filters').innerHTML = cats.map(c => {
  const icon = c.id==='all' ? '' : (GZ.CATEGORIES.find(x=>x.id===c.id)?.icon+' '||'');
  const label = lang==='zh' ? c.zh : c.en;
  const cls = c.id==='all' ? ' active' : '';
  return `<button class="gz-filter-btn${cls}" onclick="setFilter('${c.id}',this)">${icon}${label}</button>`;
}).join('');

let currentFilter = 'all';

// Auto-filter from URL param (e.g. ?cat=fun)
(function() {
  const params = new URLSearchParams(location.search);
  const cat = params.get('cat');
  if (cat && cats.some(c => c.id === cat)) {
    currentFilter = cat;
    document.querySelectorAll('.gz-filter-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.gz-filter-btn[onclick="setFilter('${cat}',this)"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
})();

function setFilter(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.gz-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTools();
}

function filterTools() {
  renderTools();
}

// R988: HTML escaping helpers for tool-card injection (prevents DOM-breaking descriptions)
function escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s){ return escHtml(s).replace(/'/g,'&#39;'); }

function renderTools() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const sections = document.getElementById('tool-sections');
  const filtered = TOOLS.filter(tool => {
    if (currentFilter !== 'all' && tool.cat !== currentFilter) return false;
    if (q) {
      const info = tool[lang] || tool.en;
      return info.name.toLowerCase().includes(q) || info.desc.toLowerCase().includes(q) || tool.id.includes(q);
    }
    return true;
  });

  // Group by category
  const groups = {};
  filtered.forEach(tool => {
    if (!groups[tool.cat]) groups[tool.cat] = [];
    groups[tool.cat].push(tool);
  });

  const catOrder = ['text','dev','color','image','css','convert','seo','social','calc','fun','fortune'];
  let html = '';
  for (const cat of catOrder) {
    if (!groups[cat]) continue;
    const catInfo = GZ.CATEGORIES.find(c => c.id === cat);
    html += `<h2 class="section-title"><span class="icon">${catInfo?.icon||''}</span> ${t(cat+'Tools')}</h2>`;
    html += '<div class="gz-cards">';
    for (const tool of groups[cat]) {
      const info = tool[lang] || tool.en;
      // R988: escape name and desc before innerHTML. A raw angle bracket in a desc
      // (for example a script tag) opened a real script element and swallowed the rest
      // of the DOM, so 1695 of 2530 tool cards never rendered and those tools had
      // no internal link from the hub.
      html += `<a class="gz-card" href="${escAttr(tool.path)}"><span class="icon">${escHtml(tool.icon||'')}</span><h3>${escHtml(info.name||'')}</h3><p>${escHtml(info.desc||'')}</p><span class="tag">${escHtml(t(cat+'Tools'))}</span></a>`;
    }
    html += '</div>';
  }
  sections.innerHTML = html;
}

// Render static sections with i18n
(function renderStaticSections() {
  const t = GZI18n.t;
  const lang = GZI18n.getLang();

  // Featured traffic tools section
  const trafficTools = [
    { path: '/text/case-converter.html', icon: '🔤', name: { en: 'Case Converter', zh: '大小写转换' }, desc: { en: 'Convert uppercase, lowercase, title case, camelCase, snake_case, and more.', zh: '将文本转换为大写、小写、标题格式等' }, tag: 'textTools' },
    { path: '/dev/json.html', icon: '📋', name: { en: 'JSON Formatter', zh: 'JSON 格式化' }, desc: { en: 'Beautify, validate, and minify JSON with fast syntax highlighting.', zh: '格式化、验证、压缩和美化 JSON' }, tag: 'devTools' },
    { path: '/text/markdown.html', icon: '📝', name: { en: 'Markdown Preview', zh: 'Markdown 预览' }, desc: { en: 'Write Markdown and see the rendered preview live in your browser.', zh: '实时预览 Markdown 渲染效果' }, tag: 'textTools' },
    { path: '/seo/meta-tag-generator.html', icon: '🏷️', name: { en: 'Meta Tag Generator', zh: 'Meta 标签生成器' }, desc: { en: 'Create title, description, canonical, OG, and Twitter tags for landing pages.', zh: '为落地页生成 title、description、canonical、OG 和 Twitter 标签' }, tag: 'seoTools' },
  ];
  document.getElementById('featured-traffic-tools').innerHTML =
    '<h2 class="section-title"><span class="icon">🔥</span> ' + t('popularTools') + '</h2>' +
    '<div class="gz-cards">' +
    trafficTools.map(tool =>
      '<a class="gz-card" href="' + tool.path + '"><span class="icon">' + tool.icon + '</span><h3>' + (tool.name[lang] || tool.name.en) + '</h3><p>' + (tool.desc[lang] || tool.desc.en) + '</p><span class="tag">' + t(tool.tag) + '</span></a>'
    ).join('') + '</div>';

  // SEO hub block
  const hubCards = [
    { icon: '💻', title: 'devTools', descKey: 'devToolsDesc' },
    { icon: '🎨', title: 'colorTools', descKey: 'colorToolsDesc' },
    { icon: '🖼️', title: 'imageTools', descKey: 'imgTextToolsDesc' },
    { icon: '⚡', title: 'funTools', descKey: 'quickToolsDesc' },
  ];
  document.getElementById('tool-hub-seo-block').innerHTML =
    '<h2 class="section-title" style="margin-top:0"><span class="icon">🚀</span> ' + t('startWith') + '</h2>' +
    '<p style="color:var(--text2);line-height:1.85;margin:0 0 18px">' + t('startWithDesc') + '</p>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">' +
    hubCards.map(c => '<div class="gz-card" style="padding:18px;text-decoration:none"><h3>' + c.icon + ' ' + t(c.title) + '</h3><p>' + t(c.descKey) + '</p></div>').join('') + '</div>';

  // FAQ section
  const faqItems = [
    { q: 'faqQ1', a: 'faqA1' },
    { q: 'faqQ2', a: 'faqA2' },
    { q: 'faqQ3', a: 'faqA3' },
  ];
  document.getElementById('tool-hub-faq').innerHTML =
    '<h2 class="section-title" style="margin-top:0"><span class="icon">❓</span> ' + t('faqTitle') + '</h2>' +
    '<div style="display:grid;gap:16px">' +
    faqItems.map((item, i) => '<div class="gz-faq-item" style="background:var(--glass2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;cursor:pointer" data-faq="' + i + '">' + '<h3 style="margin:0;display:flex;justify-content:space-between;align-items:center;font-size:0.95em">' + t(item.q) + '<span class="gz-faq-arrow" style="font-size:0.8em;transition:transform 0.3s">&#9660;</span></h3>' + '<p class="gz-faq-answer" style="margin:8px 0 0;color:var(--text2);line-height:1.8;display:none">' + t(item.a) + '</p></div>').join('') + '</div>';

// FAQ Accordion toggle
(function(){
  var obs=new MutationObserver(function(){
    document.querySelectorAll('.gz-faq-item').forEach(function(el){
      if(el.dataset.bound)return;
      el.dataset.bound='1';
      el.addEventListener('click',function(){
        var p=el.querySelector('.gz-faq-answer');
        var arrow=el.querySelector('.gz-faq-arrow');
        var open=p.style.display!=='none';
        document.querySelectorAll('.gz-faq-item').forEach(function(other){
          other.querySelector('.gz-faq-answer').style.display='none';
          other.querySelector('.gz-faq-arrow').style.transform='';
        });
        if(!open){p.style.display='block';arrow.style.transform='rotate(180deg)'}
      });
    });
  });
  obs.observe(document.body,{childList:true,subtree:true});
})();
})();

renderTools();
// Recommended Games section (game names stay English, UI strings use i18n)
const gamesSection = document.createElement('section');
gamesSection.style.cssText = 'max-width:1100px;margin:30px auto 18px;padding:24px;background:var(--glass);border:1px solid var(--border);border-radius:20px';
const gamesData = [
  { href: 'https://gamezipper.com/snake/', icon: '🐍', name: 'Snake' },
  { href: 'https://gamezipper.com/2048/', icon: '🔢', name: '2048' },
  { href: 'https://gamezipper.com/tetris/', icon: '🧱', name: 'Tetris' },
  { href: 'https://gamezipper.com/brick-breaker/', icon: '💥', name: 'Brick Breaker' },
  { href: 'https://gamezipper.com/color-sort/', icon: '🎨', name: 'Color Sort' },
  { href: 'https://gamezipper.com/word-puzzle/', icon: '📝', name: 'Word Puzzle' },
  { href: 'https://gamezipper.com/idle-clicker/', icon: '👆', name: 'Idle Clicker' },
  { href: 'https://gamezipper.com/sudoku/', icon: '🔢', name: 'Sudoku' },
];
gamesSection.innerHTML = '<h2 class="section-title" style="margin-top:0"><span class="icon">🎮</span> ' + t('recommendedGames') + '</h2>' +
'<p style="color:var(--text2);line-height:1.8;margin:0 0 18px">' + t('gamesTagline') + '</p>' +
'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">' +
gamesData.map(g => '<a href="' + g.href + '" style="display:flex;align-items:center;gap:8px;background:var(--glass2);padding:12px;border-radius:12px;text-decoration:none;color:var(--text);border:1px solid var(--border);transition:transform .2s" onmouseenter="this.style.transform=\'translateY(-2px)\'" onmouseleave="this.style.transform=\'\'"><span style="font-size:1.5em">' + g.icon + '</span><span style="font-size:.85em">' + g.name + '</span></a>').join('') + '</div>' +
'<p style="text-align:center;margin-top:16px"><a href="https://gamezipper.com" style="color:var(--accent);font-weight:700;text-decoration:none">🎮 ' + t('browseAllGames') + ' →</a></p>';
document.querySelector('.gz-container-wide').insertBefore(gamesSection, document.getElementById('tool-hub-faq'));

GZ.renderFooter();
