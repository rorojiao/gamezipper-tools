/**
 * GameZipper Tools — Google AdSense Auto Ads
 * ──────────────────────────────────────────
 * Loads AdSense auto ads on tools.gamezipper.com pages with safety:
 *   - Loads after 3s fallback (or 1.5s after first interaction) — was 5s/2s
 *   - CSS constraints relaxed: ins.adsbygoogle max-height 280px (was 100px).
 *     Reason: previous 100px cap forced AdSense to skip standard 336x280
 *     rectangle fills. With 280px cap, we let 336x280/300x250 show freely.
 *   - z-index below tool inputs/results
 *   - Page-level limit: loads once per page (no session limit)
 *
 * v5.4-tools-tuning (2026-06-12):
 *   - Lower 5s fallback → 3s for tools (visitors are task-focused, faster ad)
 *   - Lower 2s post-interaction delay → 1.5s
 *   - Relax ins.adsbygoogle max-height 100px → 280px (rectangle fills now possible)
 *   - Relax google-ad-slot max-height 60px → 250px
 *   - Fixed-anchor bottom still 50px (keeps footer ad unobtrusive)
 */
(function(){
  'use strict';
  if (window.GZToolsAdSense) return;
  window.GZToolsAdSense = { loaded: false, skipped: true };

  /* ── AD ENABLED ── Set to false to pause */
  var ADS_ENABLED = true;
  if (!ADS_ENABLED) {
    console.log('[GZToolsAdSense] AdSense PAUSED — set ADS_ENABLED=true to resume');
    return;
  }

  var AD_CLIENT = 'ca-pub-8346383990981353';

  function injectSafetyCSS() {
    var s = document.createElement('style');
    s.id = 'gz-adsense-safety';
    s.textContent = [
      // v5.4: allow standard AdSense rectangle sizes (336x280, 300x250) to render
      'ins.adsbygoogle { max-height: 280px !important; overflow: hidden !important; }',
      '.google-ad-slot, [id^="google_ads_iframe"] { max-height: 250px !important; }',
      '/* Ensure ads stay behind tool UI */',
      '.gz-tool, .gz-container, .gz-result, .gz-input-group, textarea, input, select, .gz-btn { position: relative; z-index: 10 !important; }',
      '/* Anchor ads (bottom) — keep small to not block tool */',
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

  // v5.4: tighter delays — 1.5s after interaction, 3s fallback (was 2s/5s)
  // Visitors are task-focused, faster ad delivery = more impressions.
  var engaged = false;

  function onEngage() {
    if (engaged) return;
    engaged = true;
    setTimeout(loadAdSense, 1500);
  }

  document.addEventListener('click', onEngage, { once: true, passive: true });
  document.addEventListener('keydown', onEngage, { once: true, passive: true });
  document.addEventListener('submit', onEngage, { once: true, passive: true });

  // Fallback: load after 3s even without interaction (was 5s)
  setTimeout(function() {
    if (!window.GZToolsAdSense.loaded) {
      console.log('[GZToolsAdSense] No interaction detected, loading after fallback');
      loadAdSense();
    }
  }, 3000);
})();
