/**
 * GameZipper Tools — Google AdSense Auto Ads (with gz_ad_event tracking)
 * ──────────────────────────────────────────────────────────────────────
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
 *
 * v5.4.1-tools-tracking (2026-06-12):
 *   - Add gz_ad_event pipeline (BI server visibility) — previously zero events sent
 *   - MutationObserver on ins.adsbygoogle[data-ad-status] → adsense_commercial_break_fill / _no_fill
 *   - script.onload → adsense_script_loaded; script.onerror → adsense_load_error
 *   - Reuses window.GZ_COLLECT_ENDPOINT + navigator.sendBeacon (matches monetag-manager.js fallback)
 *   - Defensive: if window.gzAnalytics.sendAd() exists, use it first (parity with monetag)
 *   - window.gzToolsAdSense debug handle: { events, fillCount, noFillCount, observer, loaded }
 *   - dataLayer push for GTM (parity with monetag-manager.js)
 */
(function(){
  'use strict';
  if (window.GZToolsAdSense) return;

  /* ── AD ENABLED ── Set to false to pause */
  var ADS_ENABLED = true;
  if (!ADS_ENABLED) {
    console.log('[GZToolsAdSense] AdSense PAUSED — set ADS_ENABLED=true to resume');
    return;
  }

  var AD_CLIENT = 'ca-pub-8346383990981353';

  // ==================== AD EVENT TRACKER (v5.4.1) ====================
  // Lightweight event log so we can see AdSense actual fill rate in BI server.
  // Mirrors monetag-manager.js trackAdEvent() shape: dataLayer push + sendBeacon to GZ_COLLECT_ENDPOINT.
  // Each event: { type, network, containerId, insClasses, ts }
  var adEvents = [];
  function trackAdEvent(type, data) {
    var ev = { type: type, ts: Date.now() };
    if (data) for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) ev[k] = data[k]; }
    adEvents.push(ev);
    // Cap at 200 events
    if (adEvents.length > 200) adEvents.shift();
    // Fire dataLayer event for GTM if available
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: 'gz_ad_' + type }, ev));
    } catch(e) {}
    // Forward to BI server. tools.site has no gz-analytics.js → direct sendBeacon fallback.
    try {
      if (window.gzAnalytics && typeof window.gzAnalytics.sendAd === 'function') {
        window.gzAnalytics.sendAd(type, ev);
      } else if (window.GZ_COLLECT_ENDPOINT && navigator.sendBeacon) {
        var payload = JSON.stringify([{
          site: location.hostname, path: location.pathname,
          e: 'gz_ad_event', d: Object.assign({ t: type }, ev), t: Date.now(),
          vid: '', sid: ''
        }]);
        navigator.sendBeacon(window.GZ_COLLECT_ENDPOINT, payload);
      }
    } catch(e) {}
    if (window.GZAdDebug) {
      try { console.log('[gz-tools-adsense]', type, ev); } catch(e) {}
    }
  }

  // Expose debug handle BEFORE the script loads so the rest of the page can attach listeners.
  window.gzToolsAdSense = {
    events: adEvents,
    loaded: false,
    fillCount: 0,
    noFillCount: 0,
    observer: null,
  };

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

  // Watch all ins.adsbygoogle elements for data-ad-status transitions to fill/no-fill.
  // AdSense auto-ads can inject ins elements anywhere in the body, so we observe document.body.
  function setupAdObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body) {
      // Body not ready — retry after a tick
      setTimeout(setupAdObserver, 50);
      return;
    }
    var handled = Object.create(null); // dedup by ins element identity (via stamp)

    function stamp(ins) {
      if (!ins.__gzId) {
        ins.__gzId = 'ins_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      }
      return ins.__gzId;
    }

    function checkIns(ins) {
      if (!ins || ins.nodeType !== 1) return;
      if (!ins.classList || !ins.classList.contains('adsbygoogle')) return;
      var id = stamp(ins);
      if (handled[id]) return;
      var status = ins.getAttribute('data-ad-status');
      if (status === 'filled') {
        handled[id] = true;
        window.gzToolsAdSense.fillCount++;
        trackAdEvent('adsense_commercial_break_fill', {
          network: 'adsense',
          containerId: ins.id || '',
          insClasses: ins.className || '',
        });
      } else if (status === 'unfilled') {
        handled[id] = true;
        window.gzToolsAdSense.noFillCount++;
        trackAdEvent('adsense_commercial_break_no_fill', {
          network: 'adsense',
          containerId: ins.id || '',
          insClasses: ins.className || '',
        });
      }
    }

    // First pass: existing ins elements (race: AdSense may have set status before we attached)
    try {
      var existing = document.querySelectorAll('ins.adsbygoogle');
      for (var i = 0; i < existing.length; i++) checkIns(existing[i]);
    } catch(e) {}

    var obs = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'attributes') {
          if (m.target && m.target.classList && m.target.classList.contains('adsbygoogle')) {
            checkIns(m.target);
          }
        } else if (m.type === 'childList') {
          var added = m.addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (!n || n.nodeType !== 1) continue;
            if (n.classList && n.classList.contains('adsbygoogle')) checkIns(n);
            try {
              var nested = n.querySelectorAll && n.querySelectorAll('ins.adsbygoogle');
              if (nested) for (var k = 0; k < nested.length; k++) checkIns(nested[k]);
            } catch(e) {}
          }
        }
      }
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ad-status'],
    });
    window.gzToolsAdSense.observer = obs;
  }

  function loadAdSense() {
    if (window.gzToolsAdSense.loaded) return;
    window.gzToolsAdSense.loaded = true;

    injectSafetyCSS();

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + AD_CLIENT;
    s.crossOrigin = 'anonymous';
    s.onload = function() {
      trackAdEvent('adsense_script_loaded', { network: 'adsense' });
      console.log('[GZToolsAdSense] AdSense auto ads loaded');
      // Set up fill observer after script load — auto-ads starts injecting after this
      setupAdObserver();
    };
    s.onerror = function() {
      trackAdEvent('adsense_load_error', { network: 'adsense', error: 'script_load_failed' });
      console.warn('[GZToolsAdSense] AdSense script failed to load');
    };
    document.head.appendChild(s);
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
    if (!window.gzToolsAdSense.loaded) {
      console.log('[GZToolsAdSense] No interaction detected, loading after fallback');
      loadAdSense();
    }
  }, 3000);
})();
