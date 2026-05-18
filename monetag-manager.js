/**
 * GameZipper Tools — Monetag Ad Manager v2
 * ────────────────────────────────────────
 * MultiTag zones (all MULTI = auto-anti-adblock + anti-fraud):
 *   - Popunder:         11012009
 *   - In-Page Push:     11012010
 *   - Vignette Banner:  11012011
 *   - Push Notifications: 11012012
 *
 * Strategy:
 *   1. Popunder: hub → first click; tool pages → 5s after meaningful interaction
 *      Frequency: every 20 min (localStorage, cross-tab via BroadcastChannel)
 *   2. In-Page Push: all pages → 3s delay, once per page
 *   3. Vignette Banner: hub → 25s; tool pages → 45s
 *   4. Push Notifications: all pages → 12s delay, once per session
 */
(function(){
  'use strict';
  if (window.GZMonetagManager) return;
  window.GZMonetagManager = true;

  /* ── AD PAUSE SWITCH ── Set to false to re-enable all ads */
  var ADS_ENABLED = false;
  if (!ADS_ENABLED) {
    console.log('[GZMonetagManager] All ads PAUSED — set ADS_ENABLED=true to resume');
    return;
  }

  /* ── Zone Configuration (MultiTag) ────────────────────────── */
  var ZONES = {
    popunder:   11012009,
    inpagePush: 11012010,
    vignette:   11012011,
    pushNotif:  11012012
  };

  var POPUNDER_INTERVAL = 20 * 60 * 1000; // 20 minutes
  var POPUNDER_STORAGE_KEY = 'gz_tools_popunder_last';
  var loaded = {};

  /* ── BroadcastChannel for cross-tab frequency cap ─────────── */
  var _bc = null;
  try { _bc = new BroadcastChannel('gz_tools_popunder'); } catch(e) {}
  function broadcastPopShown() {
    if (_bc) try { _bc.postMessage(Date.now()); } catch(e) {}
  }
  if (_bc) {
    _bc.onmessage = function(e) {
      try { localStorage.setItem(POPENDER_STORAGE_KEY, String(e.data)); } catch(e2) {}
    };
  }

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
    broadcastPopShown();
  }

  function loadScript(zone) {
    if (loaded[zone]) return;
    loaded[zone] = true;
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-zone', String(zone));
    s.setAttribute('data-cfasync', 'false');
    s.src = 'https://a.magsrv.com/ad-provider.js?zone=' + zone;
    document.head.appendChild(s);
    console.log('[GZMonetag] Zone ' + zone + ' loaded');
  }

  /* ── Popunder (zone 11012009) — CLICK-TRIGGERED ─────────── */

  var popPending = false;

  function loadPopunder() {
    if (loaded[ZONES.popunder] || !canShowPopunder()) return;
    if (hasActiveEditorFocus()) {
      console.log('[GZMonetag] User typing, defer popunder');
      popPending = true; // re-arm for next click
      return;
    }
    markPopunderShown();
    popPending = false;
    loadScript(ZONES.popunder);
  }

  function armPopunder() {
    if (loaded[ZONES.popunder] || !canShowPopunder()) return;
    popPending = true;
  }

  // Global click listener — fire popunder when armed
  document.addEventListener('click', function(e) {
    if (popPending) {
      popPending = false;
      loadPopunder();
    }
  }, { passive: true });

  /* ── In-Page Push (zone 11012010) ───────────────────────── */

  function loadInPagePush() {
    if (loaded[ZONES.inpagePush]) return;
    loadScript(ZONES.inpagePush);
  }

  /* ── Vignette Banner (zone 11012011) ────────────────────── */

  function loadVignette() {
    if (loaded[ZONES.vignette]) return;
    loadScript(ZONES.vignette);
  }

  /* ── Push Notifications (zone 11012012) ─────────────────── */

  function loadPushNotif() {
    if (loaded[ZONES.pushNotif]) return;
    loadScript(ZONES.pushNotif);
  }

  /* ── Container ads (below tool content) ────────────────────── */

  function fillContainerAd(containerId, delay) {
    setTimeout(function () {
      var container = document.getElementById(containerId);
      if (!container || container.getAttribute('data-filled')) return;
      container.setAttribute('data-filled', '1');
      var s = document.createElement('script');
      s.async = true;
      s.setAttribute('data-zone', String(ZONES.inpagePush));
      s.src = 'https://a.magsrv.com/ad-provider.js?zone=' + ZONES.inpagePush;
      container.appendChild(s);
      console.log('[GZMonetag] Container ad filled: ' + containerId);
    }, delay);
  }

  /* ── Init ── */

  function init() {
    // 1. In-Page Push: all pages, 3 seconds after load
    setTimeout(loadInPagePush, 3000);

    // 2. Push Notifications: 12s delay
    setTimeout(loadPushNotif, 12000);

    // 3. Popunder strategy depends on page type
    if (isHubPage()) {
      // Hub page: arm for next click
      armPopunder();
      // Also re-arm on scroll engagement
      window.addEventListener('scroll', function() {
        if (window.scrollY > 300) armPopunder();
      }, { passive: true, once: true });
      // Vignette: 25s
      setTimeout(loadVignette, 25000);
    } else {
      // Tool page: arm popunder after 5s meaningful interaction
      var interacted = false;
      function onInteract() {
        if (interacted) return;
        interacted = true;
        setTimeout(armPopunder, 5000);
      }
      document.addEventListener('click', function(e) {
        if (e.target.closest('.gz-btn, button, input[type="submit"]')) onInteract();
      }, { capture: true, passive: true });
      document.addEventListener('keydown', onInteract, { once: true, passive: true });
      // Vignette: 45s
      setTimeout(loadVignette, 45000);
    }

    // 4. Fill bottom ad container when DOM is ready
    fillContainerAd('gz-tools-ad-below', 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Backward-compatible API ── */
  window.GZMonetagSafe = {
    init: function () {},
    loadNow: loadPopunder,
    maybeLoad: loadPopunder,
    hasBlockingOverlay: function () { return false; },
    disabled: false,
    mode: 'unified-manager-v2'
  };
  window.GZNativeAd = {
    init: function () {},
    loadInPagePush: loadInPagePush,
    loadVignette: loadVignette,
    loadPushNotif: loadPushNotif,
    loaded: { inpage: !!loaded[ZONES.inpagePush], vignette: !!loaded[ZONES.vignette], push: !!loaded[ZONES.pushNotif] }
  };

  console.log('[GZMonetag] v2 Initialized — MultiTag zones active (Popunder: click-triggered)');
})();
