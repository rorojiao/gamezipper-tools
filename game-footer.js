/**
 * GameZipper Tools — game-footer.js (cross-site game promotion + commercialBreak trigger)
 * ───────────────────────────────────────────────────────────────────────────────────────
 * Adapted from gz.com game-footer.js for tools.gamezipper.com (t_bad16c5c).
 *
 * Purpose:
 *   - Show a slim footer bar on tool pages with links to popular gamezipper.com games.
 *   - When user clicks a game link, fire GZAds.commercialBreak() (Poki-model ad overlay).
 *   - P1 (t_73496ae1) exports window.GZAds.commercialBreak from monetag-manager.js v5.18.
 *   - P1 also adds an internal-link click trigger (a[href^="/"]) in monetag-manager.js,
 *     but our links point to https://gamezipper.com/... (cross-site), so no overlap.
 *
 * Differences from gz.com game-footer.js:
 *   - Games list is a curated top-12 (not the full 200+ game DB).
 *   - Links use full URLs (https://gamezipper.com/...) since this is a different subdomain.
 *   - Footer shows after 12s delay (tools pages are task-focused; longer grace than games).
 *   - No "current game" detection (tools aren't games).
 *
 * Acceptance (t_bad16c5c):
 *   - tools game pages: user clicks game-link → commercialBreak triggers
 *   - BI 7d: tools commercial_break_trigger or commercial_break_fill > 0
 */
(function(){
  // Respect user dismissal — use sessionStorage so it persists within the tab
  if (sessionStorage.getItem('gz-footer-dismissed')) return;

  function init() {
    // Guard: prevent duplicate footer if init() is called twice
    if (document.getElementById('game-footer')) return;

    // Curated top-12 games from gamezipper.com (high-traffic + diverse categories)
    var games = [
      {n:'2048',          e:'🔢', u:'https://gamezipper.com/2048/'},
      {n:'Snake',         e:'🐍', u:'https://gamezipper.com/snake/'},
      {n:'Tetris',        e:'🧱', u:'https://gamezipper.com/tetris/'},
      {n:'Sudoku',        e:'🔢', u:'https://gamezipper.com/sudoku/'},
      {n:'Color Sort',    e:'🎨', u:'https://gamezipper.com/color-sort/'},
      {n:'Chess',         e:'♟️', u:'https://gamezipper.com/chess/'},
      {n:'Solitaire',     e:'🃏', u:'https://gamezipper.com/solitaire/'},
      {n:'Mahjong',       e:'🀄', u:'https://gamezipper.com/mahjong-solitaire/'},
      {n:'Minesweeper',   e:'💣', u:'https://gamezipper.com/minesweeper/'},
      {n:'Wordle',        e:'🔤', u:'https://gamezipper.com/wordle/'},
      {n:'Flappy Wings',  e:'🐦', u:'https://gamezipper.com/flappy-wings/'},
      {n:'Brick Breaker', e:'🧱', u:'https://gamezipper.com/brick-breaker/'}
    ];

    // Deterministic shuffle (date-seeded) so the list feels fresh each day
    function getDateSeed() {
      var today = new Date().toISOString().slice(0, 10);
      var hash = 0;
      for (var i = 0; i < today.length; i++) {
        hash = ((hash << 5) - hash) + today.charCodeAt(i);
        hash = hash & hash;
      }
      return hash;
    }
    var seed = getDateSeed();
    games.sort(function(a, b) {
      var ha = (seed + a.n.charCodeAt(0)) & 0xffff;
      var hb = (seed + b.n.charCodeAt(0)) & 0xffff;
      return ha - hb;
    });
    var pick = games.slice(0, 8); // show 8 links to keep the bar compact

    var d = document.createElement('section');
    d.id = 'game-footer';
    d.setAttribute('aria-label', 'Try our games');
    d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(10,10,26,0.96);padding:8px 12px;z-index:40;border-top:1px solid #333;display:none;transition:transform .3s ease';

    var h = '<div style="display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap">';
    h += '<span style="color:#4ecdc4;font-size:11px;font-family:sans-serif;flex-shrink:0">🎮 Play:</span>';
    for (var i = 0; i < pick.length; i++) {
      h += '<a href="' + pick[i].u + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;background:#1a1a3e;padding:4px 10px;border-radius:12px;text-decoration:none;color:#fff;font-size:11px;font-family:sans-serif;flex-shrink:0">' + pick[i].e + ' ' + pick[i].n + '</a>';
    }
    h += '<a href="https://gamezipper.com" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;background:#4ecdc4;padding:4px 10px;border-radius:12px;text-decoration:none;color:#000;font-size:11px;font-family:sans-serif;font-weight:700;flex-shrink:0">🎮 All Games</a>';
    h += '<button onclick="var f=document.getElementById(\'game-footer\');if(f){f.style.transform=\'translateY(100%)\';setTimeout(function(){f.remove()},300);}sessionStorage.setItem(\'gz-footer-dismissed\',\'1\');" style="background:none;border:none;color:#666;font-size:16px;cursor:pointer;padding:4px 6px;flex-shrink:0;line-height:1" aria-label="Close">&times;</button>';
    h += '</div>';
    d.innerHTML = h;
    document.body.appendChild(d);

    // === Poki-model: Commercial Break on game link click ===
    // When user clicks a game link, trigger commercialBreak (ad may or may not show)
    // Mirrors gz.com game-footer.js line 396-408 click trigger pattern.
    // Graceful: if GZAds.commercialBreak not available (P1 not deployed yet), silently skip.
    d.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      // Trigger commercialBreak asynchronously — don't block navigation
      try {
        if (window.GZAds && window.GZAds.commercialBreak) {
          window.GZAds.commercialBreak();
        }
      } catch(err) {}
    }, { passive: true });

    // Smart display: show footer after 12s (tools pages are task-focused, longer grace)
    // Also show on gameover/level-complete events (some fun/ pages emit these)
    var footerShown = false;
    function showFooter() {
      if (footerShown) return;
      footerShown = true;
      d.style.display = 'block';
    }
    document.addEventListener('gameover', showFooter, { once: true });
    document.addEventListener('level-complete', showFooter, { once: true });
    document.addEventListener('level-fail', showFooter, { once: true });
    setTimeout(showFooter, 12000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(init, { timeout: 3000 });
      } else {
        setTimeout(init, 200);
      }
    });
  } else {
    // DOM already ready — defer to requestIdleCallback with hard timeout fallback.
    var _initDone = false;
    var _initTimer = null;
    var _safeInit = function() {
      if (_initDone) return;
      _initDone = true;
      if (_initTimer) { clearTimeout(_initTimer); _initTimer = null; }
      init();
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(_safeInit, { timeout: 3000 });
    }
    _initTimer = setTimeout(_safeInit, 3000);
  }
})();
