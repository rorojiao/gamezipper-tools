/**
 * GameZipper Tools — Sticky Bottom Ad Banner
 * Shows ONLY after meaningful user action (copy, convert, etc.)
 * Auto-hides after 15s. Closeable. Does not block tool interaction.
 */
(function(){
  'use strict';
  if (window.GZToolsStickyAd) return;
  var BANNER_ID = 'gz-tools-sticky-ad';
  var shown = false;
  var dismissed = false;

  function createStyle(){
    var s = document.createElement('style');
    s.textContent = [
      '#'+BANNER_ID+'{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:linear-gradient(135deg,#1a1a2e,#16213e);border-top:2px solid #4ecdc4;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;transform:translateY(100%);transition:transform .5s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 20px rgba(0,0,0,.3);font-family:system-ui,-apple-system,sans-serif}',
      '#'+BANNER_ID+'.gz-show{transform:translateY(0)}',
      '#'+BANNER_ID+' .gz-ad-text{color:#e0e0e0;font-size:13px;line-height:1.3}',
      '#'+BANNER_ID+' .gz-ad-text strong{color:#4ecdc4}',
      '#'+BANNER_ID+' .gz-ad-link{background:#4ecdc4;color:#1a1a2e;padding:6px 16px;border-radius:20px;text-decoration:none;font-weight:700;font-size:12px;white-space:nowrap;flex-shrink:0}',
      '#'+BANNER_ID+' .gz-ad-close{background:none;border:none;color:#666;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;flex-shrink:0}',
      '#'+BANNER_ID+' .gz-ad-close:hover{color:#fff}'
    ].join('');
    document.head.appendChild(s);
  }

  function show(){
    if (shown || dismissed) return;
    shown = true;
    createStyle();
    var el = document.createElement('div');
    el.id = BANNER_ID;
    el.innerHTML = '<div class="gz-ad-text"><strong>🎮 Try our free games!</strong> Snake, 2048, Tetris & more — no download needed</div><a href="https://gamezipper.com" target="_blank" class="gz-ad-link" rel="noopener">Play Free →</a><button class="gz-ad-close" aria-label="Close">&times;</button>';
    document.body.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('gz-show'); });
    el.querySelector('.gz-ad-close').addEventListener('click', function(){ hide(el); });
    // Auto-hide after 15s
    setTimeout(function(){ if (el.parentNode) hide(el); }, 15000);
  }

  function hide(el){
    el = el || document.getElementById(BANNER_ID);
    if (!el) return;
    el.classList.remove('gz-show');
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 500);
  }

  // Show after user copies text (monkey-patch GZ.copyText)
  // GZ may not be ready yet (common.js defines it later), so poll
  function hookCopyText(){
    if (window.GZ && window.GZ.copyText && !window.GZToolsStickyAd._hooked) {
      window.GZToolsStickyAd._hooked = true;
      var orig = window.GZ.copyText;
      window.GZ.copyText = function(text){
        var result = orig.call(this, text);
        setTimeout(show, 500);
        return result;
      };
      return true;
    }
    return false;
  }

  // Try immediately, then poll every 200ms for up to 5s
  if (!hookCopyText()) {
    var tries = 0;
    var timer = setInterval(function(){
      if (hookCopyText() || ++tries > 25) clearInterval(timer);
    }, 200);
  }

  window.GZToolsStickyAd = { show: show, hide: hide, _hooked: false };
})();
