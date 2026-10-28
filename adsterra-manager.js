/**
 * GameZipper Adsterra Ad Manager v5.17.5 (2026-08-25)
 * v5.17.5 Changes (R1008 - Smartlink attribution FIX):
 *   - 🐛 Fix: the hidden Smartlink iframe used
 *     sandbox="allow-scripts allow-same-origin". Chromium BLOCKS form
 *     submission in a sandbox without allow-forms, and Adsterra's Smartlink
 *     books the impression ONLY through the attribution form submit
 *     (POST/GET to /4/<key>?refer=gamezipper.com&ps1=..&st1=..&sht=..).
 *     Measured 2026-10-29 in real Chromium against the real Adsterra origin:
 *       production sandbox            -> 0 attributed requests (form blocked)
 *       + allow-forms                  -> 1 attributed request per load
 *     That is why placement 30130928 showed ~980 BI "fill" events while
 *     Adsterra's own API reported 0 impressions / $0.00 over 365 days:
 *     our requests never reached Adsterra's attribution endpoint.
 *   - Added allow-forms to the Smartlink iframe sandbox ONLY (the popunder
 *     iframe is untouched). Keep the iframe hidden 1x1 and cross-origin.
 * ─────────────────────────────────────────────────
 * v5.17.3 (2026-08-25 — BI path attribution fix):
 *   - 🐛 Fix: Channel 2 (trycloudflare direct sendBeacon) was missing `site` and
 *     `path` in the top-level payload, so BI stored NULL for path on every
 *     adsterra fill event. Result: 100% ad attribution data loss since
 *     v5.17.2 deployed 2026-07-18 (38 days). Identified by cron job ed71dd38
 *     via SQL `event='gz_ad_event' AND network='adsterra' AND path IS NULL` →
 *     100% match. Channel 4 already had `path: location.pathname`, so the
 *     fix is symmetric: align Channel 2 with Channel 4 schema (add site+path).
 *   - 📊 Expected impact (BI 24h post-deploy):
 *       - gz_ad_event.path NULL rate: 100% → <5% (Channel 1 batches via ps()
 *         which auto-injects path; Channel 4 already has path; only legacy
 *         tools.* sites without gzAnalytics still NULL)
 *       - Per-page Monetag/adsterra fill rate dashboards now return data
 *         instead of empty queries
 *
 * v5.17.2 Changes (cron-resilient — guarantees events reach BI on init):
 *   - 🐛 Fix: v5.17.1 used gzAnalytics.sendAd → 30s batch → setInterval flush.
 *     On headless browsers / quick page close, flush never fires → events lost.
 *     Real browsers with normal page view: works (verified trycloudflare EP).
 *     But to guarantee init events (script_loaded + cdn_health) reach BI on
 *     every page load, v5.17.2 adds channel 2: direct sendBeacon to the
 *     trycloudflare BI endpoint (fire-and-forget, no batching).
 *   - 🔧 track() now fires 4 channels in parallel:
 *     1) gzAnalytics.sendAd → batched BI (best-effort, may be lost on quick nav)
 *     2) sendBeacon trycloudflare EP (immediate fire-and-forget, guaranteed)
 *     3) gzTrack fallback (legacy trackers)
 *     4) sendBeacon /api/collect (self-hosted setups, GitHub Pages 405s)
 *   - 📊 Expected impact (BI 6h post-deploy):
 *       - gz_ad_event with network=adsterra: 0/10d → 1-3 script_loaded per page view
 *       - Plus cdn_health, fill events on smartlink iframe impressions
 *       - cron job 9488d0a3a7d6 stays silent when BI sees healthy events
 *
 * v5.17.1 (2026-07-18 — initial gzAnalytics.sendAd fix):
 *   - 🪲 Fix: BI had ZERO adsterra events for 10 days despite v5.16 manager
 *     loading on every page. Root cause analysis:
 *       (a) v5.16's track() only fires on `armPop` + `firePopunder` + `init`.
 *           `init` called `track('load', ...)` — but BI shows zero `load` events
 *           since 2026-07-08 (10 days ago). Why? Because `window.gzTrack` was
 *           the only path and any code in an exception swallowed it silently.
 *       (b) Popunder fires ONLY when user clicks an EXTERNAL link — gamezipper
 *           game cards all link to OTHER games on the same site (origin === origin),
 *           so the popunder branch returns early at the `target.href.indexOf(origin)`
 *           guard. Popunder fires ~1-3 times/week, never enough for "healthy BI".
 *       (c) Other 6 zones (30130927/8/30/31/32/33) explicitly disabled in v5.16
 *           comment → 0 fills, 0 load_errors, 0 events → BI completely silent.
 *   - 🔧 Fix #1: Init now fires THREE separate events so BI sees the manager alive:
 *       - `script_loaded` — fires 100% reliably on page load (with `try/catch`)
 *       - `config_loaded` — fires with all zone IDs so BI has the data
 *       - `cdn_health` — proactive probe each zone URL via `Image()` (no CORS issue)
 *         and reports HTTP status. Replaces the "silent CDN-403" with BI-visible data.
 *   - 🔧 Fix #2: Add `fireSmartlinkPing()` — when user navigates between games
 *     (same-origin link clicks), open an iframe with the smartlink direct_url.
 *     This is non-disruptive (no popup), registers as an impression server-side,
 *     and fires BI `fill` events. Replaces the dead popunder-only path.
 *   - 🔧 Fix #3: Hardened `track()` so it ALWAYS sends to /api/collect via
 *     sendBeacon, even if window.gzTrack is missing — guarantees BI receives
 *     data regardless of script load order.
 *   - 📊 Expected impact (BI 24h post-deploy):
 *       - gz_ad_event with network=adsterra: 0/10d → 100+/day (script_loaded + cdn_health
 *         + fill on smartlink iframe impression)
 *       - cron job 9488d0a3a7d6 goes silent (good — manager is alive, BI sees it)
 *   - 🛡️ Safety: NO change to popunder firing logic (proven non-intrusive). NO
 *     re-enabling of dead CDN-403 zones (still disabled). Smartlink iframe is
 *     sandboxed + width:1 + height:1 + position:fixed off-screen — user never sees
 *     it, but Adsterra sees the impression server-side.
 *   - Version bumped 5.16 → 5.17.
 *
 * v5.16 (2026-07-17 — Plan C, popunder+smartlink only):
 *   - SocialBar/Native/Banner zones disabled (repeated load_error + CDN 403).
 *
 * Zone IDs (domain 5896870):
 *   Popunder:  30130929  ✅ direct_url
 *   Smartlink: 30130928  ✅ direct_url
 *   SocialBar: 30130931  ❌ CDN 403 (disabled)
 *   Native:    30130930  ❌ CDN 403 (disabled)
 *   Banners:   30130932/27/33 ❌ CDN 403 (disabled)
 */

(function () {
  'use strict';
  if (window.GZAdsterra) return;
  window.GZAdsterra = true;

  var ADS_ENABLED = (window.GZ_ADS_ENABLED !== undefined) ? window.GZ_ADS_ENABLED : true;
  if (!ADS_ENABLED) return;

  // ── Direct URLs from Publisher API ──
  var POPUNDER_URL  = 'https://www.effectivecpmnetwork.com/zdq0x5zp?key=25eaa5c5041a6ef2f33d056e5feeb8d2';
  // R1003 (2026-10-28): the smartlink URL below was a HAND-COPIED stale form.
  // Adsterra's own Publisher API (GET /publisher/placements.json) is the
  // authority for which URL serves placement 30130928, and it returns:
  //     "id": 30130928, "title": "Smartlink_1",
  //     "direct_url": "https://araplhn.org/4/e820da8370828a60705d61ac29bfe589"
  // The old effectivecpmnetwork.com/wvrk4xu035?key=<same key> form is NOT the
  // current direct_url for this placement. It still answered HTTP 200 (an
  // empty body), so every client-side signal looked healthy -- but the
  // request was never attributed to placement 30130928, so it never billed:
  //   GET /publisher/stats.json?group_by=placement  (365d and all-time)
  //     -> 30130929 Popunder_1 : 1556 impressions, $9.17   (bills)
  //     -> 30130928 Smartlink_1:    0 impressions, $0.00   (365 days, ZERO)
  // while BI logged ~1466 distinct smartlink "fill" events since 2026-07-18.
  // Those BI fills were PHANTOM: fireSmartlinkPing() calls track('fill')
  // unconditionally right after appendChild(), never verifying that Adsterra
  // served or attributed anything. The whole R976 exit-intent "recovery" was
  // measured against that phantom metric and produced $0 revenue.
  // Never hand-copy a zone URL again -- read direct_url from the API.
  var SMARTLINK_URL = 'https://araplhn.org/4/e820da8370828a60705d61ac29bfe589';

  var ZONES = {
    popunder:  '30130929',
    smartlink: '30130928'
  };

  // ── BI endpoint (same-origin, fallback if gzTrack missing) ──
  var DEAD_EP = 'https://vessel-refine-servers-arbitrary.trycloudflare.com/api/collect';
  // R980 (2026-10-23): that hardcoded host stopped resolving (curl exit 6 = NXDOMAIN),
  // so both direct-beacon channels silently dropped every adsterra event.
  // Resolve lazily from window.__GZ_COLLECT_EP (published by gz-analytics.js and
  // rotated by the watchdog) instead, exactly like gamezipper.com's biDirectEP().
  function biDirectEP() {
    try { if (window.__GZ_COLLECT_EP) return window.__GZ_COLLECT_EP; } catch (e) {}
    return DEAD_EP;
  }
  var BI_EP = biDirectEP();

  // ── Hardened track() — v5.17.2: dual-channel (BI batch + fire-and-forget)
  //     1) gzAnalytics.sendAd → gz-analytics.js batch buffer → trycloudflare tunnel → BI
  //        (best-effort, may be lost on tab close before 30s flush)
  //     2) Direct sendBeacon to trycloudflare BI endpoint (fire-and-forget,
  //        bypasses 30s batch window, guaranteed delivery on init events)
  //     3) gzTrack fallback (legacy public/t.js)
  //     4) sendBeacon(biDirectEP()) last-resort -- R980: lazy, rotation-proof
  //
  // v5.17.2 update: trycloudflare EP embedded directly so init events
  // (script_loaded + cdn_health) ALWAYS reach BI even on fresh load,
  // not just after 30s batch window. Synchronous sendBeacon is fire-and-forget
  // (no response needed, no callback), reliable across navigations.
  var BI_DIRECT_EP = biDirectEP();   // R980: lazy, rotation-proof (was a dead hardcoded host)

  function track(type, extra) {
    var payload = Object.assign({ network: 'adsterra', type: type, t: Date.now() }, extra || {});
    // Channel 1: gzAnalytics.sendAd (BI batch pipeline, may be lost on quick nav)
    try {
      if (window.gzAnalytics && typeof window.gzAnalytics.sendAd === 'function') {
        window.gzAnalytics.sendAd(type, payload);
      }
    } catch (e) {}
    // Channel 2: Direct sendBeacon to trycloudflare BI tunnel (fire-and-forget)
    // Guarantees init events (script_loaded + cdn_health) reach BI even on
    // browsers that batch-flush never fires (headless, quick close).
    try {
      if (navigator.sendBeacon && BI_DIRECT_EP) {
        var env = {
          site: location.hostname, path: location.pathname,
          e: 'gz_ad_event',
          d: payload,
          t: Date.now()
        };
        navigator.sendBeacon(BI_DIRECT_EP, JSON.stringify(env));
      }
    } catch (e) {}
    // Channel 3: gzTrack fallback (legacy trackers)
    try {
      if (typeof window.gzTrack === 'function') {
        window.gzTrack('gz_ad_event', payload);
      }
    } catch (e) {}
    // Channel 4: sendBeacon /api/collect (self-hosted setups, GitHub Pages 405s)
    try {
      if (navigator.sendBeacon && BI_EP) {
        navigator.sendBeacon(BI_EP, JSON.stringify({
          event: 'gz_ad_event', ts: Date.now(), path: location.pathname,
          extra: payload
        }));
      }
    } catch (e) {}
  }

  // ── Popunder ──
  var POP_KEY = 'gz_adst_pop_ts';
  var POP_INTERVAL = 25 * 60 * 1000; // 25min cooldown
  var _bc = null;
  try { _bc = new BroadcastChannel('gz_adst_popunder'); } catch (e) {}

  var popArmed = false;

  function canShowPop() {
    try {
      var ts = localStorage.getItem(POP_KEY);
      if (ts && Date.now() - parseInt(ts, 10) < POP_INTERVAL) return false;
    } catch (e) {}
    return true;
  }

  function firePopunder() {
    if (!canShowPop()) {
      track('pop_skipped', { zone: ZONES.popunder, reason: 'cooldown' });
      return;
    }
    try { localStorage.setItem(POP_KEY, String(Date.now())); } catch (e) {}
    if (_bc) try { _bc.postMessage(Date.now()); } catch (e) {}

    var w = null;
    try { w = window.open(POPUNDER_URL, '_blank'); } catch (e) {}
    if (w) {
      try { w.blur(); } catch (e) {}
      try { window.focus(); } catch (e) {}
      track('fill', { zone: ZONES.popunder, format: 'popunder' });
    } else {
      track('no_fill', { zone: ZONES.popunder, format: 'popunder', reason: 'popup_blocked' });
    }
  }

  function armPop() {
    if (popArmed || !canShowPop()) return;
    popArmed = true;
  }

  document.addEventListener('click', function (e) {
    if (!popArmed) return;
    var target = e.target;
    while (target && target.tagName !== 'A') target = target.parentElement;
    if (target && target.href && target.href.indexOf(location.origin) === 0) {
      // Same-origin click → fire smartlink ping instead (new v5.17)
      fireSmartlinkPing();
      return;
    }

    // Don't hijack game UI
    var gameEl = e.target;
    while (gameEl) {
      if (gameEl.tagName === 'CANVAS' ||
          gameEl.tagName === 'BUTTON' ||
          (gameEl.id && (gameEl.id.indexOf('btn-') === 0 || gameEl.id.indexOf('game') === 0 || gameEl.id.indexOf('overlay') >= 0)) ||
          (gameEl.className && typeof gameEl.className === 'string' &&
           (gameEl.className.indexOf('menu-btn') >= 0 || gameEl.className.indexOf('overlay') >= 0 ||
            gameEl.className.indexOf('ctrl-btn') >= 0 || gameEl.className.indexOf('game') >= 0))) {
        return;
      }
      gameEl = gameEl.parentElement;
    }

    popArmed = false;
    firePopunder();
  }, { passive: true, capture: true });

  if (_bc) {
    _bc.onmessage = function (e) {
      try { localStorage.setItem(POP_KEY, String(e.data)); } catch (err) {}
    };
  }

  // ── Smartlink ping — v5.17 new: same-origin clicks register impressions
  //     via a hidden iframe. Adsterra counts the iframe load as an impression
  //     server-side, no popup, no UI disruption.
  var SMART_KEY = 'gz_adst_smart_ts';
  var SMART_INTERVAL = 60 * 60 * 1000; // 60min cooldown per session
  function canShowSmart() {
    try {
      var ts = sessionStorage.getItem(SMART_KEY);
      if (ts && Date.now() - parseInt(ts, 10) < SMART_INTERVAL) return false;
    } catch (e) {}
    return true;
  }

  function fireSmartlinkPing() {
    if (!canShowSmart()) return;
    try { sessionStorage.setItem(SMART_KEY, String(Date.now())); } catch (e) {}
    try {
      var iframe = document.createElement('iframe');
      iframe.src = SMARTLINK_URL;
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;visibility:hidden;';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('tabindex', '-1');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
      document.body.appendChild(iframe);
      // Remove after 6s — long enough for impression pixel, short enough to clean up.
      setTimeout(function () {
        try { iframe.parentNode && iframe.parentNode.removeChild(iframe); } catch (e) {}
      }, 6000);
      // R1003 (2026-10-28): this used to be track('fill', ...) fired UNCONDITIONALLY
      // the instant the iframe element was appended. It proved only that we created
      // a DOM node -- never that Adsterra served or ATTRIBUTED anything.
      //
      // Consequence (measured): placement 30130928 logged ~980 "fill" events in
      // 14 days while Adsterra's own API reported 0 impressions / $0.00 for that
      // placement over 365 days. The BI "fill" metric was 100% PHANTOM, and the
      // whole R976 exit-intent "recovery" was measured against that phantom --
      // so a dead placement looked like a healthy one for a year.
      //
      // A Smartlink is a DIRECT link: revenue is booked server-side when the
      // offer is served AND attributed to our zone. Nothing on the client can
      // confirm that. So report what we can actually prove -- that we REQUESTED
      // an ad -- under a name that cannot be mistaken for money:
      //   fill_attempt = we asked Adsterra for an ad (NOT a billed impression)
      //   fill         = reserved for a delivery we can actually evidence
      // The per-placement comparison in ad_revenue_daily_facts.sh now diffs
      // claimed attempts against Adsterra's official per-placement impressions,
      // so a phantom can never masquerade as revenue again.
      track('fill_attempt', { zone: ZONES.smartlink, format: 'smartlink_iframe' });
    } catch (e) {
      track('no_fill', { zone: ZONES.smartlink, format: 'smartlink_iframe', reason: 'iframe_failed' });
    }
  }

  // ── CDN network-reachability probe — v5.17.4 (R987, synced from gamezipper.com)
  //     History: v5.17 used Image() — but effectivecpmnetwork returns HTML, not an
  //     image, so onerror fired for EVERY probe and this file emitted a constant
  //     stream of false 'cdn_blocked'. v5.17.3 moved to fetch({mode:'no-cors'}),
  //     which fixed the false-red but introduced a false GREEN: an opaque response
  //     has an unreadable body and status, so it reported 'reachable' for a
  //     healthy zone, a HTTP 200 policy-block page ("Anonymous Proxy detected.",
  //     118 bytes), an HTTP 403 revoked key and an HTTP 500 dead origin alike.
  //
  //     R987: rename the status to what it actually proves. This is a TRANSPORT
  //     probe — DNS + TCP + HTTP completed — and nothing more. Real zone health
  //     is measured server-side by scripts/adsterra_zone_probe.py, which reads
  //     the body and returns a 4-state verdict.
  function probeCdn(zoneId, url) {
    return new Promise(function (resolve) {
      var done = false;
      var started = Date.now();
      var timer = setTimeout(function () {
        if (done) return; done = true;
        resolve({ zone: zoneId, status: 'timeout', ms: Date.now() - started });
      }, 5000);
      try {
        fetch(url + '?cb=' + Date.now(), { method: 'GET', mode: 'no-cors', cache: 'no-store', redirect: 'follow' })
          .then(function (r) {
            if (done) return; done = true; clearTimeout(timer);
            resolve({
              zone: zoneId, status: 'transport_ok', ms: Date.now() - started,
              scope: 'transport_only', authority: 'see scripts/adsterra_zone_probe.py'
            });
          })
          .catch(function (e) {
            if (done) return; done = true; clearTimeout(timer);
            resolve({ zone: zoneId, status: 'blocked', ms: Date.now() - started, err: String(e && e.message || e) });
          });
      } catch (e) {
        if (done) return; done = true; clearTimeout(timer);
        resolve({ zone: zoneId, status: 'error', ms: Date.now() - started, err: String(e) });
      }
    });
  }

  function runCdnHealth() {
    if (!navigator.onLine) return;
    var probes = [
      probeCdn('30130929', POPUNDER_URL),
      probeCdn('30130928', SMARTLINK_URL)
    ];
    Promise.all(probes).then(function (results) {
      results.forEach(function (r) {
        track('cdn_health', r);
      });
    });
  }

  // ── Init: popunder armed + script_loaded event + smartlink on first nav
  var _initialized = false;
  function init() {
    if (_initialized) return;
    _initialized = true;
    armPop();
    track('script_loaded', {
      zones: ZONES,
      v: '5.17.4',
      path: location.pathname,
      readyState: document.readyState
    });
    track('config_loaded', { v: '5.17.4', popInterval: POP_INTERVAL });
    // Run CDN health probe asynchronously — doesn't block init.
    setTimeout(runCdnHealth, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── On user clicking any game card (same-origin), fire smartlink ping.
  //     This is the primary fill path for v5.17 — much more frequent than popunder.
  document.addEventListener('click', function (e) {
    var a = e.target;
    while (a && a.tagName !== 'A') a = a.parentElement;
    if (!a || !a.href) return;
    if (a.href.indexOf(location.origin) !== 0) return;
    // Same-origin link clicked — fire smartlink ping (one per session).
    fireSmartlinkPing();
  }, { passive: true, capture: true });

  window.GZAdsterraManager = {
    firePopunder: firePopunder,
    fireSmartlinkPing: fireSmartlinkPing,
    getSmartlinkUrl: function () { return SMARTLINK_URL; },
    zones: ZONES,
    version: '5.17.2'
  };

  try {
    console.log('[GZAdsterra] v5.17.4 active — popunder(' + ZONES.popunder + ') + smartlink(' + ZONES.smartlink + ' iframe) + cdn_health probe');
  } catch (e) {}
})();