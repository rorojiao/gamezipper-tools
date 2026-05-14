/**
 * GameZipper Tools — Google AdSense Auto Ads
 * ──────────────────────────────────────────
 * Loads AdSense auto ads on tools.gamezipper.com pages with safety:
 *   - Loads after 5s (tools have interaction — give user time to engage first)
 *   - CSS constraints for clean tool UX
 *   - z-index below tool inputs/results
 *   - Page-level limit: loads once per page (no session limit)
 */
(function(){
  'use strict';
  if (window.GZToolsAdSense) return;
  window.GZToolsAdSense = { loaded: false, skipped: false };

  var AD_CLIENT = 'ca-pub-8346383990981353';

  function injectSafetyCSS() {
    var s = document.createElement('style');
    s.id = 'gz-adsense-safety';
    s.textContent = [
      'ins.adsbygoogle { max-height: 100px !important; overflow: hidden !important; }',
      '.google-ad-slot, [id^="google_ads_iframe"] { max-height: 60px !important; }',
      '/* Ensure ads stay behind tool UI */',
      '.gz-tool, .gz-container, .gz-result, .gz-input-group, textarea, input, select, .gz-btn { position: relative; z-index: 10 !important; }',
      '/* Anchor ads (bottom) — cap height */',
      '.google-fixed-anchor { max-height: 50px !important; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  function loadAdSense() {
    if (window.GZToolsAdSense.loaded) return;
    window.GZToolsAdSense.loaded = true;

    injectSafetyCSS();

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + AD_CLIENT;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    console.log('[GZToolsAdSense] AdSense auto ads loaded');
  }

  // Strategy: wait for first user interaction then load after 2s,
  // or fallback 5s after page load if no interaction
  var engaged = false;

  function onEngage() {
    if (engaged) return;
    engaged = true;
    setTimeout(loadAdSense, 2000);
  }

  document.addEventListener('click', onEngage, { once: true, passive: true });
  document.addEventListener('keydown', onEngage, { once: true, passive: true });
  document.addEventListener('submit', onEngage, { once: true, passive: true });

  // Fallback: load after 5s even without interaction
  setTimeout(function() {
    if (!window.GZToolsAdSense.loaded) {
      console.log('[GZToolsAdSense] No interaction detected, loading after fallback');
      loadAdSense();
    }
  }, 5000);
})();
