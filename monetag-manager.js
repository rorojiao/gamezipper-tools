/**
 * GameZipper Tools — Monetag Ad Manager v3 (Poki-style)
 * ────────────────────────────────────────────────
 * Poki-model: Smart frequency control, minimal disruption
 * 
 * Zones (MultiTag):
 *   - In-Page Push:     11012010 (banners, containers)
 *   - Vignette Banner:  11012011 (interstitials)
 *   - Popunder:         11012009 (click-triggered only)
 *   - Push:             11012012 (disabled per user request)
 */
;(function() {
  'use strict';
  if (window.GZMonetagManager) return;
  window.GZMonetagManager = true;

  var ADS_ENABLED = (window.GZ_ADS_ENABLED !== undefined) ? window.GZ_ADS_ENABLED : true;
  if (!ADS_ENABLED) return;

  var ZONES = {
    popunder:   11012009,
    inpagePush: 11012010,
    vignette:   11012011,
    // pushNotif: 11012012  // DISABLED
  };

  var CONFIG = {
    AD_PROVIDER: 'https://a.magsrv.com/ad-provider.js',
    FREQUENCY: {
      minBetweenAds: 40 * 1000,         // 40s between any ads
      popunderInterval: 25 * 60 * 1000,  // 25 min between popunders
      sessionMaxAds: 15,
      sessionWindowMs: 30 * 60 * 1000,
    },
    TIMING: {
      containerAdDelay: 3500,
      vignetteHubDelay: 20 * 1000,    // 20s on hub pages
      vignetteToolDelay: 35 * 1000,   // 35s on tool pages
      popunderInteractionDelay: 5000,  // 5s after first interaction
      adLoadTimeout: 5000,
    },
    STORAGE_PREFIX: 'gzt3_',
  };

  var state = {
    adTimestamps: [],
    popunderShown: false,
    isHubPage: false,
    isToolPage: false,
    firstInteraction: 0,
    loaded: {},
    channel: null,
  };

  function now() { return Date.now(); }
  function storageGet(k) { try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_PREFIX + k)); } catch(e) { return null; } }
  function storageSet(k, v) { try { localStorage.setItem(CONFIG.STORAGE_PREFIX + k, JSON.stringify(v)); } catch(e) {} }

  function canShowAd() {
    var ts = storageGet('ad_ts') || [];
    var n = now();
    ts = ts.filter(function(t) { return (n - t) < CONFIG.FREQUENCY.sessionWindowMs; });
    if (ts.length >= CONFIG.FREQUENCY.sessionMaxAds) return false;
    if (ts.length > 0 && (n - Math.max.apply(null, ts)) < CONFIG.FREQUENCY.minBetweenAds) return false;
    return true;
  }

  function markShown() {
    var ts = storageGet('ad_ts') || [];
    ts.push(now());
    storageSet('ad_ts', ts.slice(-50));
    if (state.channel) try { state.channel.postMessage(now()); } catch(e) {}
  }

  // BroadcastChannel
  try {
    state.channel = new BroadcastChannel('gz4-tools-sync');
    state.channel.onmessage = function(e) {
      var ts = storageGet('ad_ts') || [];
      ts.push(e.data);
      storageSet('ad_ts', ts.slice(-50));
    };
  } catch(e) {}

  function loadZone(zoneId, targetEl) {
    return new Promise(function(resolve, reject) {
      var timeout = setTimeout(function() { reject(new Error('timeout')); }, CONFIG.TIMING.adLoadTimeout);
      var s = document.createElement('script');
      s.src = CONFIG.AD_PROVIDER + '?zone=' + String(zoneId);
      s.async = true;
      s.setAttribute('data-zone', String(zoneId));
      s.setAttribute('data-cf-async', 'false');
      s.onload = function() { clearTimeout(timeout); resolve(true); };
      s.onerror = function() { clearTimeout(timeout); reject(new Error('err')); };
      if (targetEl) { targetEl.appendChild(s); } else { document.head.appendChild(s); }
    });
  }

  function detectPage() {
    var path = window.location.pathname;
    // Hub pages: / or /zh or index pages
    state.isHubPage = /^\/(zh\/?)?$/.test(path);
    state.isToolPage = !state.isHubPage && path.length > 1;
  }

  // Container ad (below tool results)
  function showContainerAd() {
    var container = document.getElementById('gz-tools-ad-below');
    if (!container) return;
    if (container.getAttribute('data-filled')) return;
    if (!canShowAd()) return;

    setTimeout(function() {
      if (container.getAttribute('data-filled')) return;
      loadZone(ZONES.inpagePush, container).then(function() {
        container.setAttribute('data-filled', '1');
        markShown();
      }).catch(function() {});
    }, CONFIG.TIMING.containerAdDelay);
  }

  // Vignette banner (delayed, non-blocking)
  function showVignette() {
    if (!canShowAd()) return;
    var delay = state.isHubPage ? CONFIG.TIMING.vignetteHubDelay : CONFIG.TIMING.vignetteToolDelay;
    setTimeout(function() {
      if (!canShowAd()) return;
      loadZone(ZONES.vignette).then(function() { markShown(); }).catch(function() {});
    }, delay);
  }

  // Popunder (click-triggered, with frequency control)
  function initPopunder() {
    var lastPopunder = storageGet('popunder_last') || 0;
    if (now() - lastPopunder < CONFIG.FREQUENCY.popunderInterval) return;

    function triggerPopunder() {
      if (state.popunderShown) return;
      if (!canShowAd()) return;
      var last = storageGet('popunder_last') || 0;
      if (now() - last < CONFIG.FREQUENCY.popunderInterval) return;
      
      state.popunderShown = true;
      storageSet('popunder_last', now());
      markShown();
      loadZone(ZONES.popunder).catch(function() {});
    }

    // Hub: first click triggers popunder
    if (state.isHubPage) {
      document.addEventListener('click', function() { triggerPopunder(); }, { once: true, passive: true });
    }
    // Tool pages: 5s after meaningful interaction
    if (state.isToolPage) {
      function onInteract() {
        if (state.firstInteraction) return;
        state.firstInteraction = now();
        setTimeout(triggerPopunder, CONFIG.TIMING.popunderInteractionDelay);
      }
      document.addEventListener('click', onInteract, { once: true, passive: true });
      document.addEventListener('keydown', onInteract, { once: true, passive: true });
    }
  }

  // In-Page Push (lightweight, all pages)
  function showInPagePush() {
    if (!canShowAd()) return;
    setTimeout(function() {
      if (!canShowAd()) return;
      loadZone(ZONES.inpagePush).then(function() { markShown(); }).catch(function() {});
    }, 3000);
  }

  // Init
  detectPage();
  showContainerAd();
  showVignette();
  initPopunder();
  showInPagePush();

})();
