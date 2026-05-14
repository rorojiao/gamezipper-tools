/**
 * GameZipper Tools — Monetag Ad Manager
 * ─────────────────────────────────────
 * Unified ad manager replacing monetag-safe.js and monetag-native.js.
 * Manages Popunder + In-Page Push with optimized timing & frequency.
 */
(function(){
  'use strict';
  if (window.GZMonetagManager) return;
  window.GZMonetagManager = true;

  var ZONES = {
    popunder: 10689347,      // Tools Popunder
    inpagePush: 10689346,    // Tools In-Page Push
  };

  var POPUNDER_INTERVAL = 20 * 60 * 1000; // 20 minutes
  var POPUNDER_STORAGE_KEY = 'gz_popunder_last';
  var loaded = {};

  /* ── Helpers ── */

  function isHubPage() {
    return location.pathname === '/' || /\/$/.test(location.pathname);
  }

  function hasActiveEditorFocus() {
    var el = document.activeElement;
    if (!el) return false;
    return /^(TEXTAREA|INPUT|SELECT)$/i.test(el.tagName) || el.isContentEditable;
  }

  function canShowPopunder() {
    var last = 0;
    try { last = parseInt(localStorage.getItem(POPENDER_STORAGE_KEY), 10) || 0; } catch(e) {}
    return Date.now() - last >= POPUNDER_INTERVAL;
  }

  function markPopunderShown() {
    try { localStorage.setItem(POPENDER_STORAGE_KEY, String(Date.now())); } catch(e) {}
  }

  function loadScript(zone, callback) {
    if (loaded[zone]) return;
    loaded[zone] = true;
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-zone', String(zone));
    s.setAttribute('data-cfasync', 'false');
    s.src = 'https://a.magsrv.com/ad-provider.js?zone=' + zone;
    if (callback) { s.onload = callback; s.onerror = callback; }
    document.head.appendChild(s);
  }

  /* ── Popunder (zone 10689347) ── */

  function loadPopunder() {
    if (!canShowPopunder()) {
      console.log('[GZMonetag] Popunder frequency-capped, skipping');
      return;
    }
    if (hasActiveEditorFocus()) {
      console.log('[GZMonetag] User typing, defer popunder');
      return;
    }
    markPopunderShown();
    loadScript(ZONES.popunder);
    console.log('[GZMonetag] Popunder loaded');
  }

  /* ── In-Page Push (zone 10689346) ── */

  function loadInPagePush() {
    if (loaded[ZONES.inpagePush]) return;
    loadScript(ZONES.inpagePush);
    console.log('[GZMonetag] In-Page Push loaded');
  }

  /* ── Bottom ad container fill ── */

  function fillBottomAd() {
    var container = document.getElementById('gz-tools-ad-below');
    if (!container || container.hasChildNodes()) return;
    // In-Page Push can render into any zone container — load it if not yet loaded
    loadInPagePush();
  }

  /* ── Init ── */

  function init() {
    // 1. In-Page Push: all pages, 3 seconds after load (once per page)
    setTimeout(loadInPagePush, 3000);

    // 2. Popunder strategy depends on page type
    if (isHubPage()) {
      // Hub page: 5 seconds after load
      setTimeout(function() {
        if (!hasActiveEditorFocus()) loadPopunder();
      }, 5000);
      // Also trigger on scroll engagement
      window.addEventListener('scroll', function() {
        if (window.scrollY > 300) loadPopunder();
      }, { passive: true, once: true });
    } else {
      // Tool page: 5 seconds after first meaningful interaction
      var interacted = false;
      function onInteract() {
        if (interacted) return;
        interacted = true;
        setTimeout(loadPopunder, 5000);
      }
      document.addEventListener('click', function(e) {
        if (e.target.closest('.gz-btn, button, input[type="submit"]')) onInteract();
      }, { capture: true, passive: true });
      document.addEventListener('keydown', onInteract, { once: true, passive: true });
    }

    // 3. Fill bottom ad container when DOM is ready
    setTimeout(fillBottomAd, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
