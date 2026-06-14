/**
 * GameZipper Tools — Result Area Recommendation
 * Shows game recommendations below tool output after user interaction.
 * Goal: Drive tools→games cross-domain traffic → increase ad impressions.
 *
 * Trigger: copy, button click, form submit, or 8s dwell fallback
 * Position: Below .gz-tool-area (never blocks tool input/output)
 * Dismissible: Yes (stores in sessionStorage)
 * Safe: No popups, no overlays, no layout shifts
 */
(function(){
  'use strict';
  if (window.GZToolsRec) return;

  var REC_ID = 'gz-tools-result-rec';
  var SESSION_KEY = 'gz_tools_rec_dismissed';
  var STYLE_ID = 'gz-tools-rec-style';

  var games = [
    {n:'2048 Galaxy',e:'🌌',u:'https://gamezipper.com/2048/',t:'Puzzle'},
    {n:'Snake Classic',e:'🐍',u:'https://gamezipper.com/snake/',t:'Arcade'},
    {n:'Basketball Shoot',e:'🏀',u:'https://gamezipper.com/basketball-shoot/',t:'Sports'},
    {n:'Sudoku',e:'🔢',u:'https://gamezipper.com/sudoku/',t:'Puzzle'},
    {n:'Minesweeper',e:'💣',u:'https://gamezipper.com/minesweeper/',t:'Puzzle'},
    {n:'Slope',e:'🏔️',u:'https://gamezipper.com/slope/',t:'Arcade'},
    {n:'Neon Run',e:'🌈',u:'https://gamezipper.com/neon-run/',t:'Arcade'},
    {n:'T-Rex Runner',e:'🦖',u:'https://gamezipper.com/t-rex/',t:'Arcade'},
    {n:'Sushi Stack',e:'🍣',u:'https://gamezipper.com/sushi-stack/',t:'Puzzle'},
    {n:'Brick Breaker',e:'🧱',u:'https://gamezipper.com/brick-breaker/',t:'Arcade'},
    {n:'Color Sort',e:'🎨',u:'https://gamezipper.com/color-sort/',t:'Puzzle'},
    {n:'Tetris',e:'🧱',u:'https://gamezipper.com/tetris/',t:'Classic'},
    {n:'Fruit Slash',e:'🍉',u:'https://gamezipper.com/fruit-slash/',t:'Action'},
    {n:'Pong',e:'🏓',u:'https://gamezipper.com/pong/',t:'Classic'},
    {n:'Chess',e:'♟️',u:'https://gamezipper.com/chess/',t:'Strategy'},
    {n:'Crossword',e:'📰',u:'https://gamezipper.com/crossword/',t:'Word'}
  ];

  function ensureStyle(){
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#'+REC_ID+'{margin:24px auto;max-width:700px;padding:0 16px;opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;pointer-events:none}',
      '#'+REC_ID+'.gz-rec-visible{opacity:1;transform:translateY(0);pointer-events:auto}',
      '#'+REC_ID+' .gz-rec-card{background:linear-gradient(135deg,rgba(26,26,62,.85),rgba(45,27,105,.7));border:1px solid rgba(78,205,196,.2);border-radius:16px;padding:20px;backdrop-filter:blur(8px)}',
      '#'+REC_ID+' .gz-rec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
      '#'+REC_ID+' .gz-rec-title{color:#fff;font-size:15px;font-weight:700}',
      '#'+REC_ID+' .gz-rec-title span{color:#4ecdc4}',
      '#'+REC_ID+' .gz-rec-close{background:none;border:none;color:#555;font-size:18px;cursor:pointer;padding:2px 6px;line-height:1}',
      '#'+REC_ID+' .gz-rec-close:hover{color:#fff}',
      '#'+REC_ID+' .gz-rec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}',
      '#'+REC_ID+' a.gz-rec-item{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);text-decoration:none;transition:transform .15s,border-color .15s,background .15s}',
      '#'+REC_ID+' a.gz-rec-item:hover{transform:translateY(-1px);border-color:rgba(78,205,196,.4);background:rgba(255,255,255,.07)}',
      '#'+REC_ID+' .gz-rec-emoji{font-size:22px;flex-shrink:0}',
      '#'+REC_ID+' .gz-rec-info{min-width:0}',
      '#'+REC_ID+' .gz-rec-name{color:#fff;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#'+REC_ID+' .gz-rec-tag{color:#4ecdc4;font-size:10px;margin-top:2px}'
    ].join('');
    document.head.appendChild(s);
  }

  function isZh(){
    return location.pathname.indexOf('/zh/') !== -1;
  }

  function render(){
    if (document.getElementById(REC_ID)) return;
    ensureStyle();

    // Pick 4 random games
    var shuffled = games.slice().sort(function(){ return 0.5 - Math.random(); });
    var picks = shuffled.slice(0, 4);
    var zh = isZh();

    var wrap = document.createElement('section');
    wrap.id = REC_ID;
    wrap.setAttribute('aria-label', zh ? '推荐免费游戏' : 'Recommended free games');

    var html = '<div class="gz-rec-card">';
    html += '<div class="gz-rec-head">';
    html += '<div class="gz-rec-title">' + (zh ? '🎮 用完了？来玩个<span>免费游戏</span>！' : '🎮 Done? Try a <span>free game</span>!') + '</div>';
    html += '<button class="gz-rec-close" aria-label="Close">&times;</button>';
    html += '</div>';
    html += '<div class="gz-rec-grid">';
    for (var i = 0; i < picks.length; i++) {
      var g = picks[i];
      html += '<a class="gz-rec-item" href="'+g.u+'" target="_blank" rel="noopener">';
      html += '<div class="gz-rec-emoji">'+g.e+'</div>';
      html += '<div class="gz-rec-info"><div class="gz-rec-name">'+g.n+'</div><div class="gz-rec-tag">'+g.t+'</div></div>';
      html += '</a>';
    }
    html += '</div></div>';
    wrap.innerHTML = html;

    // Insert after .gz-tool-area or before .gz-howto
    var toolArea = document.querySelector('.gz-tool-area');
    var howto = document.querySelector('.gz-howto');
    var related = document.querySelector('.gz-related');
    var container = document.querySelector('.gz-container');

    var footer = document.querySelector('footer') || document.querySelector('.gz-footer');
    if (toolArea && toolArea.nextSibling) {
      toolArea.parentNode.insertBefore(wrap, toolArea.nextSibling);
    } else if (howto) {
      howto.parentNode.insertBefore(wrap, howto);
    } else if (related) {
      related.parentNode.insertBefore(wrap, related);
    } else if (footer) {
      // Insert before footer on homepage/category pages (not body bottom)
      footer.parentNode.insertBefore(wrap, footer);
    } else if (container) {
      container.appendChild(wrap);
    } else {
      document.body.appendChild(wrap);
    }

    // Close handler
    wrap.querySelector('.gz-rec-close').addEventListener('click', function(){
      wrap.classList.remove('gz-rec-visible');
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch(e){}
    });

    // rec-click tracking removed 2026-06-14: was a dead 501 hit, no data delivered
    wrap.querySelectorAll('.gz-rec-item').forEach(function(link){
      link.addEventListener('click', function(){});
    });
  }

  function show(){
    try { if (sessionStorage.getItem(SESSION_KEY)) return; } catch(e){}
    render();
    var el = document.getElementById(REC_ID);
    if (!el) return;
    // rec-show impression tracking removed 2026-06-14: was a dead 501 hit, no data delivered

    // Trigger animation on next frame
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        el.classList.add('gz-rec-visible');
      });
    });
  }

  function init(){
    // Only on tools pages
    if (location.hostname.indexOf('tools.gamezipper.com') === -1) return;

    // Skip homepage and category index pages — rec only makes sense on actual tool pages
    var path = location.pathname.replace(/\/+$/, '');
    if (!path || path === '/zh' || path === '/fortune') return; // bare homepage / simple index
    // Category index pages: /dev, /text, /color, /convert, /zh/dev, etc.
    var catPattern = /^\/(zh\/)?(dev|text|color|convert|fortune|hasher|seo|math|image|generator)$/i;
    if (catPattern.test(path)) return;

    var triggered = false;
    function onAction(){
      if (triggered) return;
      triggered = true;
      setTimeout(show, 2000); // Show 2s after action
    }

    // Trigger on meaningful user actions
    document.addEventListener('copy', onAction, { once: true, capture: true });
    document.addEventListener('click', function(e){
      if (e.target.closest('.gz-btn, button[type="submit"], input[type="submit"]')) {
        onAction();
      }
    }, { capture: true, once: true });
    document.addEventListener('submit', onAction, { once: true, capture: true });

    // Fallback: show after 8s dwell (for live/real-time tools like letter counter)
    setTimeout(function(){
      if (!triggered) {
        triggered = true;
        show();
      }
    }, 8000);
  }

  window.GZToolsRec = { show: show, init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
