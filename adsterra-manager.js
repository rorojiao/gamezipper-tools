/**
 * GameZipper Tools — Adsterra Ad Manager
 * ─────────────────────────────────────
 * Adsterra integration for tools.gamezipper.com
 * ACTIVE — Zone IDs configured via Adsterra Publisher API (2026-07-07).
 *
 * v6.6.1 Changes (2026-07-07 — BI observability, kanban t_3c737c90):
 *   - 🪲 Fix: ZERO adsterra events in BI EVER (BI 30d scan: 0 rows with network=adsterra_*).
 *     Root cause: adsterra-manager.js (this file) loaded zones, called them, but never
 *     fired window.trackAdEvent() — meaning every Adsterra fill was invisible to BI
 *     dashboards. Other networks (AdSense/Monetag) tracked properly → Adsterra looks
 *     like 0 fills in BI even though scripts render ads.
 *   - 🔧 Fix: added trackAdEvent() integration in:
 *     1. loadScript() — fires 'adsterra_script_loaded' with zoneId + containerId
 *     2. fillContainerAd() — fires 'adsterra_container_ad_fill' on container fill
 *        (via MutationObserver checkFill pattern, mirrors monetag-manager.js line 713)
 *     3. fillContainerAd() — fires 'adsterra_container_ad_no_fill' when ad didn't render
 *   - 🛡️ Safety: Adsterra fills unchanged behavior (still loads zones via effectivecpmnetwork.com).
 *     Only adds observability. No new ads called.
 *   - 📊 Acceptance (7d BI post-deploy): adsterra_* events > 0 (was 0).
 */

(function () {
  'use strict';
  if (window.GZToolsAdsterraManager) return;
  window.GZToolsAdsterraManager = true;

  /* ── CONFIGURATION ─────────────────────────────────────── */
  var ADS_ENABLED = (window.GZ_ADS_ENABLED !== undefined) ? window.GZ_ADS_ENABLED : true;
  if (!ADS_ENABLED) {
    console.log('[GZToolsAdsterra] PAUSED — set window.GZ_ADS_ENABLED=true to enable');
    return;
  }

  /* ── BI TRACKING (v6.6.1) ──────────────────────────────── */
  // v6.6.1: hook into monetag-manager.js's trackAdEvent (gz_ad_event) so Adsterra
  //   fills show up in BI dashboards alongside AdSense/Monetag. Previously invisible.
  //   Safe no-op when trackAdEvent missing (older deployed scripts).
  function trackAdEvent(type, data) {
    try {
      if (typeof window.trackAdEvent === 'function') {
        window.trackAdEvent(type, data);
        return;
      }
    } catch (e) {}
    // Fallback: send via sendBeacon to BI server directly (mirrors tools monetag pattern).
    try {
      var meta = Object.assign({}, data || {}, { network: 'adsterra', ts: Date.now() });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('https://bi.gamezipper.com/api/event', JSON.stringify({
          type: 'gz_ad_event',
          site: location.hostname,
          path: location.pathname,
          meta: meta
        }));
      } else {
        new Image().src = 'https://bi.gamezipper.com/api/event?type=gz_ad_event&path=' +
          encodeURIComponent(location.pathname) + '&meta=' + encodeURIComponent(JSON.stringify(meta));
      }
    } catch (e) {}
  }

  // v6.6.1: MutationObserver-based fill detection (mirrors monetag-manager.js checkFill).
  //   Polls for ad iframes inside `container` for `timeoutMs`. Resolves true on fill, false on timeout.
  function checkFill(container, timeoutMs) {
    return new Promise(function(resolve) {
      if (!container) return resolve(false);
      var resolved = false;
      function isFilled() {
        var iframes = container.querySelectorAll('iframe, ins iframe');
        for (var i = 0; i < iframes.length; i++) {
          var f = iframes[i];
          var w = f.offsetWidth || parseInt(f.getAttribute('width') || '0', 10);
          var h = f.offsetHeight || parseInt(f.getAttribute('height') || '0', 10);
          if (w >= 50 && h >= 50) return true;
        }
        return false;
      }
      if (isFilled()) { resolved = true; resolve(true); return; }
      var observer = null;
      if (typeof MutationObserver !== 'undefined') {
        try {
          observer = new MutationObserver(function() {
            if (resolved) return;
            if (isFilled()) { resolved = true; if (observer) observer.disconnect(); resolve(true); }
          });
          observer.observe(container, { childList: true, subtree: true, attributes: true });
        } catch (e) {}
      }
      setTimeout(function() {
        if (resolved) return;
        if (observer) observer.disconnect();
        resolved = true;
        resolve(isFilled());
      }, timeoutMs || 8000);
    });
  }

  // Zone IDs from Adsterra Publisher API (2026-07-07)
  var ADSTERRA_PID = 'gz_5896870';

  var ZONES = {
    popunder:    '30130929',
    inpagePush:  '30130931',
    interstitial: '30130930',
    socialBar:   '30130931',
    banner:      '30130932',
    banner468:   '30130927',
    banner320:   '30130933',
    nativeBanner:'30130930'
  };

  function isHubPage() {
    return location.pathname === '/' || /\/$/.test(location.pathname);
  }

  function loadScript(zone, container) {
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-zone', String(zone));
    s.src = 'https://www.effectivecpmnetwork.com/' + zone;
    var containerId = container && container.id ? container.id : '';
    s.onload = function() {
      trackAdEvent('adsterra_script_loaded', { zoneId: zone, containerId: containerId });
    };
    s.onerror = function() {
      trackAdEvent('adsterra_script_error', { zoneId: zone, containerId: containerId });
    };
    if (container) {
      container.appendChild(s);
    } else {
      document.head.appendChild(s);
    }
    console.log('[GZToolsAdsterra] Zone ' + zone + ' loaded');
  }

  /* ── Popunder ───────────────────────────────────────────── */
  var _bc = null;
  try { _bc = new BroadcastChannel('gz_tools_adst_popunder'); } catch(e) {}

  var POP_KEY = 'gz_tools_adst_pop_ts';
  var POP_INTERVAL = 25 * 60 * 1000; // v5.13: 25min (was 20min, align with tools, Poki-like restraint)

  function canShowPopunder() {
    try {
      var ts = localStorage.getItem(POP_KEY);
      if (ts && Date.now() - parseInt(ts, 10) < POP_INTERVAL) return false;
    } catch (e) {}
    return true;
  }

  function markPopunderShown() {
    try { localStorage.setItem(POP_KEY, String(Date.now())); } catch (e) {}
    if (_bc) try { _bc.postMessage(Date.now()); } catch(e) {}
  }

  var popPending = false;
  var popLoaded = false;

  function loadPopunder() {
    if (popLoaded || !canShowPopunder()) return;
    if (ZONES.popunder.indexOf('YOUR_') === 0) return;
    popLoaded = true;
    popPending = false;
    markPopunderShown();
    loadScript(ZONES.popunder);
  }

  function armPopunder() {
    if (popLoaded || !canShowPopunder()) return;
    popPending = true;
  }

  document.addEventListener('click', function () {
    if (popPending) {
      popPending = false;
      loadPopunder();
    }
  }, { passive: true });

  /* ── In-Page Push ──────────────────────────────────────── */
  var ippLoaded = false;

  function loadInPagePush() {
    if (ippLoaded) return;
    if (ZONES.inpagePush.indexOf('YOUR_') === 0) return;
    ippLoaded = true;
    loadScript(ZONES.inpagePush);
  }

  /* ── Container Ad Fill ────────────────────────────────── */
  function fillContainerAd(containerId, zone, delay) {
    setTimeout(function () {
      var container = document.getElementById(containerId);
      if (!container || container.getAttribute('data-filled')) return;
      if (zone.indexOf('YOUR_') === 0) return;
      container.setAttribute('data-filled', '1');
      loadScript(zone, container);
      console.log('[GZToolsAdsterra] Container ad filled: ' + containerId);
      // v6.6.1: actually verify fill via checkFill + fire BI event (was: no-op,
      //   BI 30d showed 0 adsterra_* events despite console logging "filled").
      checkFill(container, 6000).then(function(filled) {
        trackAdEvent(filled ? 'adsterra_container_ad_fill' : 'adsterra_container_ad_no_fill', {
          zoneId: zone, containerId: containerId
        });
      });
    }, delay || 3000);
  }

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    if (isHubPage()) {
      armPopunder();
      setTimeout(loadInPagePush, 3000);
    } else {
      armPopunder();
      setTimeout(loadInPagePush, 5000);
    }
    fillContainerAd('gz-tools-ad-below', ZONES.banner, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GZToolsAdsterra = {
    loadPopunder: loadPopunder,
    loadInPagePush: loadInPagePush,
    zones: ZONES,
    pid: ADSTERRA_PID
  };

  console.log('[GZToolsAdsterra] Initialized — Adsterra manager ACTIVE (popunder=' + ZONES.popunder + ', social=' + ZONES.socialBar + ', banner=' + ZONES.banner + ')');
})();
