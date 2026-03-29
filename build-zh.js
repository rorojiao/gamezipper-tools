#!/usr/bin/env node
/**
 * Build /zh/ mirror for tools.gamezipper.com
 * - Copies tool HTML dirs to zh/
 * - Modifies lang, canonical, hreflang, SEO tags
 * - Injects GZI18n default zh
 * - Adds hreflang to en pages
 * - Updates sitemap
 * - Adds auto-lang redirect & lang switch button
 */

const fs = require('fs');
const path = require('path');

const BASE = '/home/msdn/gamezipper-tools';
const BASE_URL = 'https://tools.gamezipper.com';
const DIRS = ['text','dev','color','image','css-tools','convert','fortune','calc','seo','social','fun'];

// Step 1: Clean and copy directories
console.log('=== Step 1: Copy directories ===');
const zhDir = path.join(BASE, 'zh');
if (fs.existsSync(zhDir)) fs.rmSync(zhDir, { recursive: true });
fs.mkdirSync(zhDir, { recursive: true });

for (const d of DIRS) {
  const src = path.join(BASE, d);
  const dst = path.join(zhDir, d);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
    console.log(`Copied ${d}/ → zh/${d}/`);
  }
}

// Step 2: Collect all en HTML files and their zh translations
console.log('\n=== Step 2: Process zh/ HTML files ===');
const htmlFiles = [];
function findHtml(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) findHtml(fp);
    else if (f.endsWith('.html')) htmlFiles.push(fp);
  }
}
for (const d of DIRS) {
  const dir = path.join(zhDir, d);
  if (fs.existsSync(dir)) findHtml(dir);
}

// Extract zh translations from en source
function extractZhTranslations(html) {
  // Match zh: { ... } block in GZI18n.register
  const zhMatch = html.match(/zh:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
  if (!zhMatch) return {};
  const block = zhMatch[1];
  const result = {};
  const pairs = block.matchAll(/(\w+)\s*:\s*'([^']*)'/g);
  for (const m of pairs) result[m[1]] = m[2];
  const pairs2 = block.matchAll(/(\w+)\s*:\s*"([^"]*)"/g);
  for (const m of pairs2) result[m[1]] = m[2];
  return result;
}

function processZhFile(fp) {
  const rel = path.relative(zhDir, fp); // e.g. text/case-converter.html
  const enUrl = `${BASE_URL}/${rel}`;
  const zhUrl = `${BASE_URL}/zh/${rel}`;

  let html = fs.readFileSync(fp, 'utf8');
  const zhTrans = extractZhTranslations(html);

  // Fix lang
  html = html.replace(/<html lang="en">/, '<html lang="zh">');
  html = html.replace(/<html lang="en" /, '<html lang="zh" ');

  // Remove existing hreflang lines
  html = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?/g, '');

  // Fix canonical
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${zhUrl}">`);

  // Fix og:url
  html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${zhUrl}">`);

  // Replace title with zh translation if available
  if (zhTrans.toolTitle) {
    const zhTitle = zhTrans.toolTitle;
    const zhDesc = zhTrans.toolDesc || '';
    
    // Replace <title>
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${zhTitle} - 免费在线工具 | GameZipper 工具箱</title>`);
    
    // Replace meta description
    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${zhDesc}">`);
    
    // Replace og:title
    html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${zhTitle} - 免费在线工具 | GameZipper 工具箱">`);
    
    // Replace og:description
    html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${zhDesc}">`);
    
    // Replace twitter:title
    html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${zhTitle} - 免费在线工具 | GameZipper 工具箱">`);
    
    // Replace schema.org JSON-LD name and description
    html = html.replace(/"name":"[^"]*"/, `"name":"${zhTitle}"`);
    html = html.replace(/"description":"[^"]*"/, `"description":"${zhDesc}"`);
    // Fix schema URL
    html = html.replace(/"url":"[^"]*"/, `"url":"${zhUrl}"`);
  }

  // Fix shared resource paths: ../../shared/ or ../shared/ → /shared/
  html = html.replace(/\.\.\/\.\.\/shared\//g, '/shared/');
  html = html.replace(/\.\.\/shared\//g, '/shared/');
  // Also fix any remaining relative shared paths
  html = html.replace(/(href|src)="shared\//g, '$1="/shared/');

  // Inject hreflang before </head>
  const hreflang = `
<link rel="alternate" hreflang="en" href="${enUrl}">
<link rel="alternate" hreflang="zh" href="${zhUrl}">
<link rel="alternate" hreflang="x-default" href="${enUrl}">`;
  html = html.replace('</head>', hreflang + '\n</head>');

  // Inject GZI18n default zh setup after i18n.js script tag
  // We add a small script that overrides the default before i18n runs
  // Actually, let's add it right after the i18n.js script load
  if (!html.includes('gz-force-zh')) {
    const forceZhScript = `<script>localStorage.setItem('gz-force-zh','1');</script>`;
    // Insert before i18n.js so it can check
    html = html.replace('<script src="/shared/i18n.js"></script>', 
      forceZhScript + '\n<script src="/shared/i18n.js"></script>');
  }

  fs.writeFileSync(fp, html);
  console.log(`Processed zh/${rel}`);
}

for (const fp of htmlFiles) processZhFile(fp);

// Process zh/index.html specially
console.log('\n=== Step 2b: Process zh/index.html ===');
const zhIndexSrc = path.join(BASE, 'index.html');
const zhIndexDst = path.join(zhDir, 'index.html');
if (fs.existsSync(zhIndexSrc)) {
  let html = fs.readFileSync(zhIndexSrc, 'utf8');
  html = html.replace(/<html lang="en">/, '<html lang="zh">');
  html = html.replace(/<link rel="alternate" hreflang="en" href="[^"]*">\n?/g, '');
  html = html.replace(/<link rel="alternate" hreflang="zh" href="[^"]*">\n?/g, '');
  html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://tools.gamezipper.com/zh/">');
  html = html.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://tools.gamezipper.com/zh/">');
  // Fix title for zh
  html = html.replace(/<title>[^<]*<\/title>/, '<title>免费在线工具箱 — GameZipper 工具箱</title>');
  html = html.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="50+ 免费在线工具，开发者、设计师、创作者必备。JSON格式化、Base64编解码、颜色工具、图片处理、CSS生成器、SEO工具等。">');
  // Fix shared paths
  html = html.replace(/(href|src)="shared\//g, '$1="/shared/');
  html = html.replace(/\.\.\/shared\//g, '/shared/');
  
  const hreflang = `
<link rel="alternate" hreflang="en" href="https://tools.gamezipper.com/">
<link rel="alternate" hreflang="zh" href="https://tools.gamezipper.com/zh/">
<link rel="alternate" hreflang="x-default" href="https://tools.gamezipper.com/">`;
  html = html.replace('</head>', hreflang + '\n</head>');
  
  // Force zh
  html = html.replace('<script src="/shared/i18n.js"></script>',
    '<script>localStorage.setItem(\'gz-force-zh\',\'1\');</script>\n<script src="/shared/i18n.js"></script>');
  
  // Fix internal links to point to /zh/ versions
  html = html.replace(/href="\/text\//g, 'href="/zh/text/');
  html = html.replace(/href="\/dev\//g, 'href="/zh/dev/');
  html = html.replace(/href="\/color\//g, 'href="/zh/color/');
  html = html.replace(/href="\/image\//g, 'href="/zh/image/');
  html = html.replace(/href="\/css-tools\//g, 'href="/zh/css-tools/');
  html = html.replace(/href="\/convert\//g, 'href="/zh/convert/');
  html = html.replace(/href="\/fortune\//g, 'href="/zh/fortune/');
  html = html.replace(/href="\/calc\//g, 'href="/zh/calc/');
  html = html.replace(/href="\/seo\//g, 'href="/zh/seo/');
  html = html.replace(/href="\/social\//g, 'href="/zh/social/');
  html = html.replace(/href="\/fun\//g, 'href="/zh/fun/');
  // Keep /shared/ as is
  
  fs.writeFileSync(zhIndexDst, html);
  console.log('Created zh/index.html');
}

// Step 3: Add hreflang to en pages
console.log('\n=== Step 3: Add hreflang to en HTML files ===');
const enHtmlFiles = [];
function findEnHtml(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'zh' || f === '.git' || f === 'shared') continue;
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) findEnHtml(fp);
    else if (f.endsWith('.html') && f !== 'googleaf4887b838cad74a.html') enHtmlFiles.push(fp);
  }
}
findEnHtml(BASE);

function processEnFile(fp) {
  const rel = path.relative(BASE, fp);
  const enUrl = `${BASE_URL}/${rel}`;
  const zhUrl = `${BASE_URL}/zh/${rel}`;

  let html = fs.readFileSync(fp, 'utf8');
  
  // Skip if already has hreflang for this
  if (html.includes(`hreflang="zh"`)) return;

  // Remove old hreflang if any
  html = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?/g, '');

  const hreflang = `
<link rel="alternate" hreflang="en" href="${enUrl}">
<link rel="alternate" hreflang="zh" href="${zhUrl}">
<link rel="alternate" hreflang="x-default" href="${enUrl}">`;
  html = html.replace('</head>', hreflang + '\n</head>');

  fs.writeFileSync(fp, html);
  console.log(`Added hreflang to ${rel}`);
}

for (const fp of enHtmlFiles) processEnFile(fp);

// Step 4: Update i18n.js with auto-lang redirect and lang switch
console.log('\n=== Step 4: Update i18n.js ===');
const i18nPath = path.join(BASE, 'shared/i18n.js');
let i18n = fs.readFileSync(i18nPath, 'utf8');

// Replace the lang initialization line to handle /zh/ pages and force-zh
i18n = i18n.replace(
  "let lang = localStorage.getItem('gz-lang') || (navigator.language && navigator.language.startsWith('zh') ? 'zh' : 'en');",
  `let lang = (function(){
    // If on /zh/ path, force zh
    if (location.pathname.startsWith('/zh/')) return 'zh';
    // If force-zh flag set (zh pages inject this), use zh
    if (localStorage.getItem('gz-force-zh') === '1') { localStorage.removeItem('gz-force-zh'); return 'zh'; }
    // User preference
    var saved = localStorage.getItem('gz-lang');
    if (saved) return saved;
    // Auto-redirect: zh browser on en page → redirect to /zh/
    if (navigator.language && navigator.language.startsWith('zh') && !localStorage.getItem('gz-lang-manual')) {
      var zhPath = '/zh' + location.pathname;
      localStorage.setItem('gz-lang', 'zh');
      location.replace(zhPath);
      return 'zh';
    }
    return 'en';
  })();`
);

// Update setLang to handle /zh/ navigation
i18n = i18n.replace(
  "function setLang(l) { lang = l; localStorage.setItem('gz-lang', l); document.documentElement.lang = l; location.reload(); }",
  `function setLang(l) {
    lang = l;
    localStorage.setItem('gz-lang', l);
    localStorage.setItem('gz-lang-manual', '1');
    document.documentElement.lang = l;
    // Navigate between en/zh versions
    var path = location.pathname;
    if (l === 'zh' && !path.startsWith('/zh/')) {
      location.replace('/zh' + path);
    } else if (l === 'en' && path.startsWith('/zh/')) {
      location.replace(path.replace('/zh/', '/'));
    } else {
      location.reload();
    }
  }`
);

fs.writeFileSync(i18nPath, i18n);
console.log('Updated i18n.js with auto-redirect and lang switching');

// Step 5: Update common.js lang button
console.log('\n=== Step 5: Update common.js lang button ===');
const commonPath = path.join(BASE, 'shared/common.js');
let common = fs.readFileSync(commonPath, 'utf8');

// Fix the lang button to show proper label and link instead of toggle
common = common.replace(
  "<button class=\"gz-lang-btn\" onclick=\"GZ.toggleLang()\">'EN'</button>",
  `<a class="gz-lang-btn" id="gz-lang-switch" href="#">中文</a>`
);

// Add lang switch link handler in the init
if (!common.includes('gz-lang-switch')) {
  // Replace the toggleLang function
  common = common.replace(
    "function toggleLang() {\n    setLang(getLang() === 'en' ? 'zh' : 'en');\n  }",
    `function toggleLang() {
    setLang(getLang() === 'en' ? 'zh' : 'en');
  }
  
  function setupLangSwitch() {
    var link = document.getElementById('gz-lang-switch');
    if (!link) return;
    var path = location.pathname;
    if (path.startsWith('/zh/')) {
      link.textContent = 'English';
      link.href = path.replace('/zh/', '/');
    } else {
      link.textContent = '中文';
      link.href = '/zh' + path;
    }
    link.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.setItem('gz-lang-manual', '1');
      location.href = this.href;
    });
  }
  
  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLangSwitch);
  } else {
    setupLangSwitch();
  }`
  );
}

fs.writeFileSync(commonPath, common);
console.log('Updated common.js with lang switch link');

// Step 6: Generate sitemap
console.log('\n=== Step 6: Generate sitemap ===');
const today = new Date().toISOString().split('T')[0];
let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

// Homepage en + zh
sitemap += `  <url><loc>${BASE_URL}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n`;
sitemap += `  <url><loc>${BASE_URL}/zh/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n`;

// All tool pages
const allEnFiles = [];
function collectEnFiles(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'zh' || f === '.git' || f === 'shared') continue;
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) collectEnFiles(fp);
    else if (f.endsWith('.html') && f !== 'googleaf4887b838cad74a.html' && f !== 'index.html') allEnFiles.push(fp);
  }
}
collectEnFiles(BASE);
// Also include fortune/index.html and seo/index.html
const indexFiles = ['fortune/index.html', 'seo/index.html'];
for (const idx of indexFiles) {
  if (fs.existsSync(path.join(BASE, idx))) allEnFiles.push(path.join(BASE, idx));
}

for (const fp of allEnFiles) {
  const rel = path.relative(BASE, fp);
  sitemap += `  <url><loc>${BASE_URL}/${rel}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
  sitemap += `  <url><loc>${BASE_URL}/zh/${rel}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
}

sitemap += '</urlset>';
fs.writeFileSync(path.join(BASE, 'sitemap.xml'), sitemap);
console.log(`Generated sitemap.xml with ${allEnFiles.length * 2 + 2} URLs`);

// Step 7: Add ad banner to tool pages
console.log('\n=== Step 7: Add Monetag banner ads ===');
// Add a bottom banner ad div before footer in all HTML files (both en and zh)
const adBanner = '<div id="gz-bottom-ad" style="max-width:728px;margin:20px auto;text-align:center;min-height:90px"></div>';

function addAdBanner(fp) {
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes('gz-bottom-ad')) return;
  // Insert before footer or before </body>
  if (html.includes('<footer')) {
    html = html.replace('<footer', adBanner + '\n<footer');
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', adBanner + '\n</body>');
  }
  fs.writeFileSync(fp, html);
}

// Add to all en files
for (const fp of [...enHtmlFiles, path.join(BASE, 'index.html')]) {
  if (fs.existsSync(fp)) addAdBanner(fp);
}
// Add to all zh files
for (const fp of htmlFiles) addAdBanner(fp);
if (fs.existsSync(zhIndexDst)) addAdBanner(zhIndexDst);
console.log('Added ad banners');

// Step 8: Ensure monetag-safe.js loads ads on /zh/ too
// Already handled since we use absolute paths to /shared/monetag-safe.js

console.log('\n=== DONE ===');
console.log('Summary:');
console.log(`- zh/ directory created with ${htmlFiles.length} tool pages`);
console.log(`- hreflang added to ${enHtmlFiles.length} en pages`);
console.log('- sitemap.xml updated');
console.log('- i18n.js updated with auto-redirect');
console.log('- common.js updated with lang switch');
console.log('- Ad banners added');
