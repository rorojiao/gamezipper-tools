/**
 * GameZipper Tools - Native Ad Integration
 * In-Page Push + Vignette Banner for tools.gamezipper.com
 * No popups/popunders — browser-friendly formats
 */
(function(){
  'use strict';
  if (window.GZToolsNativeAd) return;

  var INPAGE_PUSH_ZONE = 10689346;   // tools In-Page Push
  var VIGNETTE_ZONE = 10689347;      // tools Vignette Banner
  var loaded = {};

  function loadInPagePush() {
    if (loaded.inpage) return;
    loaded.inpage = true;
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-zone', String(INPAGE_PUSH_ZONE));
    s.src = 'https://a.magsrv.com/ad-provider.js';
    document.head.appendChild(s);
  }

  function loadVignette() {
    if (loaded.vignette) return;
    loaded.vignette = true;
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
