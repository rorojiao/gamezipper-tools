/**
 * GameZipper Tools - Native Ad Integration
 * In-Page Push + Vignette Banner for tools.gamezipper.com
 * No popups/popunders — browser-friendly formats
 */
(function(){
  'use strict';
  if (window.GZToolsNativeAd) return;

  var INPAGE_PUSH_ZONE = 10689346;   // tools In-Page Push
  // VIGNETTE_ZONE: Placeholder ID — 10689347 was same as Popunder zone (monetag-safe.js)
  // Previously caused ad-provider.js to load twice with same zone ID (wasted bandwidth)
  // ⚠️ Create a dedicated Vignette zone in Monetag dashboard and update this ID
  var VIGNETTE_ZONE = 10689348;      // ⚠️ PLACEHOLDER — create this zone in Monetag dashboard
  var loaded = {};

  // Session-based frequency control: track when each ad type was last shown
  var MIN_INTERVAL = 60000; // 60 seconds minimum between ad loads
  var lastShown = { inpage: 0, vignette: 0 };

  function loadInPagePush() {
    if (loaded.inpage) return;
    // Frequency cap: don't load again within MIN_INTERVAL
    if (Date.now() - lastShown.inpage < MIN_INTERVAL) {
      console.log('[GZToolsNativeAd] In-Page Push frequency-capped, skipping');
      return;
    }
    loaded.inpage = true;
    lastShown.inpage = Date.now();
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-zone', String(INPAGE_PUSH_ZONE));
    s.src = 'https://a.magsrv.com/ad-provider.js';
    document.head.appendChild(s);
  }

  function loadVignette() {
    if (loaded.vignette) return;
    // Frequency cap: don't load again within MIN_INTERVAL
    if (Date.now() - lastShown.vignette < MIN_INTERVAL) {
      console.log('[GZToolsNativeAd] Vignette frequency-capped, skipping');
      return;
    }
    loaded.vignette = true;
    lastShown.vignette = Date.now();
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-zone', String(VIGNETTE_ZONE));
    s.src = 'https://a.magsrv.com/ad-provider.js';
    document.head.appendChild(s);
  }

  // Tools pages: load In-Page Push after 5s, Vignette after 30s
  // Tools don't have gameplay, so both are safe with shorter delays
  function init() {
    setTimeout(loadInPagePush, 5000);
    setTimeout(loadVignette, 30000);
  }

  window.GZToolsNativeAd = { init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
