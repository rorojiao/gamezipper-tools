/**
 * GameZipper Tools — Google AdSense Auto Ads (with gz_ad_event tracking)
 * ──────────────────────────────────────────────────────────────────────
 * Loads AdSense auto ads on tools.gamezipper.com pages with safety:
 *   - Loads IMMEDIATELY on script execution (was: 1.5s post-interaction / 3s fallback)
 *     Reason: the old delay was causing load_error events when users navigated
 *     away within 1.5s. The script tag is created by JS and the request is
 *     aborted on page navigation, firing onerror. Now the script is created
 *     as the deferred ad-auto.js runs, which is early enough that even quick
 *     navigators get a successful load (browsers keep background fetches going
 *     for a few seconds after navigation).
 *   - CSS constraints relaxed: ins.adsbygoogle max-height 280px (was 100px).
 *   - z-index below tool inputs/results
 *   - Page-level limit: loads once per page (no session limit)
 *   - Self-contained vid/sid tracking (replaces broken bi.gamezipper.com/t.js):
 *     tools site used to depend on bi.gamezipper.com/t.js for tracking, but
 *     that endpoint serves Metabase HTML (not JS), so vid/sid was always empty
 *     in ad events. Now we generate IDs inline using localStorage/sessionStorage.
 *
 * v5.4.3-tools-mid-content-slots (2026-06-21):
 *   - BI server data 7d (2026-06-15 ~ 2026-06-21): tools.gamezipper.com has only
 *     1 explicit <ins class="adsbygoogle"> slot (at top of index.html) and 0
 *     commercial_break_fill events despite 614 successful script loads.
 *     gamezipper.com (with 3+ in-page banner injections + commercial break) has
 *     789 AdSense commercial_break_fill in same period. Adding 2 mid-content
 *     slots between tool-sections / featured-traffic-tools and tool-hub-seo-block /
 *     tool-hub-faq gives Google AdSense more inventory hints and explicitly marks
 *     high-engagement insertion points (after main tool list, after SEO block).
 *   - Slots are lazy-loaded via IntersectionObserver — only fetch when 200px from
 *     viewport (saves bandwidth on users who scroll fast or never reach footer).
 *   - Skip on pages <768px tall (mobile single-page) — already saturated.
 *   - Each slot fires adsense_commercial_break_fill / _no_fill via existing observer.
 *
 * v5.4.2-tools-load-error-fix (2026-06-14):
 *   - Add self-contained vid/sid tracking (localStorage gz_vid / sessionStorage gz_sid)
 *   - Load AdSense script immediately on IIFE execution (was: 1.5s after click /
 *     3s fallback). Eliminates the race condition where users clicking through
 *     tools would trigger load_error when the pagead2 request got aborted.
 *   - Add retry logic: on first onerror, retry once after 1s. On second failure,
 *     give up. Tracks retry count in gz_ad_event meta.
 *   - Send proper vid/sid in sendBeacon payload (was hardcoded empty)
 *   - Bump cache buster in shared/common.js from ?v=20260612a -> ?v=20260614b
 *
 * v5.4.1-tools-tracking (2026-06-12):
 *   - Add gz_ad_event pipeline (BI server visibility) — previously zero events sent
 *   - MutationObserver on ins.adsbygoogle[data-ad-status] → adsense_commercial_break_fill / _no_fill
 *   - script.onload → adsense_script_loaded; script.onerror → adsense_load_error
 *   - Reuses window.GZ_COLLECT_ENDPOINT + navigator.sendBeacon (matches monetag-manager.js fallback)
 *   - Defensive: if window.gzAnalytics.sendAd() exists, it takes priority
 *   - window.gzToolsAdSense debug handle: { events, fillCount, noFillCount, observer, loaded }
 *   - dataLayer push for GTM (parity with monetag-manager.js)
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

  /* ── AD ENABLED ── Set to false to pause */
  var ADS_ENABLED = true;
  if (!ADS_ENABLED) {
    console.log('[GZToolsAdSense] AdSense PAUSED — set ADS_ENABLED=true to resume');
    return;
  }

  var AD_CLIENT = 'ca-pub-8346383990981353';

  // ==================== SELF-CONTAINED VID/SID TRACKING (v5.4.2) ====================
  // tools.gamezipper.com previously depended on bi.gamezipper.com/t.js for visitor
  // tracking, but that endpoint serves Metabase HTML (not JS) so vid/sid was always
  // empty. Inline a minimal localStorage/sessionStorage pair so ad events carry
  // proper visitor IDs without depending on a working t.js endpoint.
  // Pattern matches the FastAPI /t.js tracker (bi server) so existing BI queries
  // can group by vid the same way.
  (function setupVidSid() {
    try {
      var VID_KEY = 'gz_vid';
      var SID_KEY = 'gz_sid';
      var VID = localStorage.getItem(VID_KEY);
      if (!VID) {
        VID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        try { localStorage.setItem(VID_KEY, VID); } catch(e) {}
      }
      var SID = sessionStorage.getItem(SID_KEY);
      if (!SID) {
        SID = Math.random().toString(36).substr(2);
        try { sessionStorage.setItem(SID_KEY, SID); } catch(e) {}
      }
      window.gzVid = VID;
      window.gzSid = SID;
    } catch(e) {
      // localStorage may be disabled (Safari private mode, etc.) — fall back to empty
      window.gzVid = '';
      window.gzSid = '';
    }
  })();

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
          vid: window.gzVid || '', sid: window.gzSid || ''
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
    loadAttempts: 0,
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
    window.gzToolsAdSense.loadAttempts++;

    injectSafetyCSS();

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + AD_CLIENT;
    s.crossOrigin = 'anonymous';
    s.onload = function() {
      trackAdEvent('adsense_script_loaded', { network: 'adsense', attempt: window.gzToolsAdSense.loadAttempts });
      console.log('[GZToolsAdSense] AdSense auto ads loaded');
      // Set up fill observer after script load — auto-ads starts injecting after this
      setupAdObserver();
    };
    s.onerror = function() {
      // v5.4.2: Retry once on failure (handles transient network issues + race with
      // very fast page navigations where first request gets aborted)
      if (window.gzToolsAdSense.loadAttempts < 2) {
        window.gzToolsAdSense.loaded = false; // allow retry
        trackAdEvent('adsense_load_retry', { network: 'adsense', attempt: 1, error: 'script_load_failed' });
        console.warn('[GZToolsAdSense] AdSense script failed, retrying once after 1s');
        setTimeout(function() { loadAdSense(); }, 1000);
        return;
      }
      trackAdEvent('adsense_load_error', { network: 'adsense', error: 'script_load_failed', attempts: window.gzToolsAdSense.loadAttempts });
      console.warn('[GZToolsAdSense] AdSense script failed to load after ' + window.gzToolsAdSense.loadAttempts + ' attempts');
    };
    document.head.appendChild(s);
  }

  // v5.4.2: Load IMMEDIATELY on IIFE execution (was: 1.5s after click / 3s fallback).
  // Reason: deferred scripts run after HTML parse, so this is "page ready" timing.
  // Loading later than this was causing load_error events when users clicked through
  // tools pages quickly — the script tag was created but the user navigated away
  // before the pagead2 request finished, triggering onerror.
  //
  // If we want to wait for some interaction to ensure real engagement, we can do it
  // here, but the data shows the 1.5s/3s delays were net negative: 13 load_errors in
  // 7d vs 19 successful loads, and the errors all came from sequential page visits.
  loadAdSense();
})();
