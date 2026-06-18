/**
 * GameZipper Tools — Monetag Ad Manager v5.5-tools-pungent-kill (Poki-style)
 * ────────────────────────────────────────────────
 * Poki-model: Smart frequency control, glass overlay + progress bar
 *
 * v5.5-tools-pungent-kill Changes (2026-06-14):
 *   - DISABLE Pungent 10689345 (legacyEnabled=false). A/B test (6-12~6-14,
 *     2.5 days, 109 events) conclusively showed 0% fill: 0 fills, 24
 *     load_errors, 17 no_fills, 22 zone_backoff. Zone is dead — keeping
 *     it alive wastes ad-provider.js bandwidth + generates noise errors.
 *   - Superior 11012010 also at 0% fill (145 events, 0 fills, 25 load_errors)
 *     but kept as primary zone since Monetag token expired — may recover
 *     after manual token refresh.
 *
 * v5.4-tools-tuning Changes (2026-06-12):
 *   - Per-zone backoff raised: 30min → 60min → 24h (was 10→30→60min).
 *     Reason: v5.3's 10min streak-1 backoff was too aggressive — a real
 *     fill could land on attempt #2 within seconds, but streak-1 already
 *     blocked the zone for 10min. For tools.gamezipper.com 11012010
 *     (Superior) saw 49 events / 0 fills, the new curve gives Monetag
 *     30min breathing room before its first no_fill is even recorded.
 *   - Re-enable Pungent 10689345 (legacyEnabled=true) for 7-day trial.
 *     3-5月 showed 3-4 imp/day, so zone is not actually dead — just
 *     sporadically alive. Kill switch remains for easy revert.
 *   - Persist backoff state in localStorage (cross-tab) + window.gzZoneBackoff (debug).
 *
 * v5.3-zone-backoff Changes (2026-06-11):
 *   - Per-zone exponential backoff (10min → 30min → 60min) when loadZone returns no_fill.
 *     Stops wasting ad-provider.js bandwidth on broken Monetag zones.
 *     Data: last 3 days showed 36 attempts → 0 fills (0% fill rate).
 *   - Disable demonstrably-dead legacy zones (10689345, 10689346 — 0/6 and 0/1
 *     fills in 3 days). Re-enable via CONFIG.ZONES.legacyEnabled=true.
 *   - Persist backoff state in localStorage (cross-tab) + window.gzZoneBackoff (debug).
 *
 * v5.2-monetag-events Changes (2026-06-09):
 *   - 新增 ad events tracker (window.gzAdEvents + GTM dataLayer 推送)
 *     对齐 gamezipper.com v5.2: fill / no_fill / script_loaded /
 *     load_error / commercial_break_fill / commercial_break_no_fill
 *   - 替换 tools 站 v5.1 inline `gz_ad_fill` / `gz_ad_commercial_break`
 *     dataLayer push 为统一的 trackAdEvent() 调用
 *
 * v5.1 Changes (2026-06-09 优化):
 *   - AdSense + Monetag race 在 commercial break (工具完成最高价值广告位)
 *   - loadZone() 增加实际 DOM fill 检测 (不再以 script load 为 fill 标准)
 *   - 新增 GTM dataLayer 事件推送
 *   - 修复: data-filled="1" 仅在实际 ad 渲染后才设置
 *
 * v4 Changes (aligned with gamezipper.com v5):
 *   - Vignette → Poki-style glass overlay with progress bar + brand text
 *   - Frequency control aligned: 45s interval, 20/30min, 60/day
 *   - First ad delay 45s (new-user friendly)
 * 
 * Zones (MultiTag):
 *   - In-Page Push:     11012010 (banners, containers)
 *   - Vignette Banner:  11012011 (Poki-style overlay)
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
    // v5.4 (2026-06-12): Pungent 10689345 re-enabled for 7-day A/B test
    //   - Was disabled in v5.3 because of 0% fill. Pungent zones had 3-4 imp/天 in March 2026, but
    //     Superior 11012010 alone isn't filling tools.gamezipper.com.
    //   - Re-enable so visitors get a chance to see Pungent (which historically had higher
    //     eCPM in this vertical) instead of just AdSense + dead Superior zone.
    //   - Revert via legacyEnabled=false if 7-day data shows Pungent 10689345 still at 0% fill.
    inpagePushLegacy: 10689345,
    vignetteLegacy:   10689346,
    legacyEnabled: false,  // v5.5: A/B test failed — 0% fill in 2.5 days (109 events), disabled
  };

  var CONFIG = {
    AD_PROVIDER: 'https://a.magsrv.com/ad-provider.js',
    // 频率控制 — 对齐 gamezipper.com v5
    FREQUENCY: {
      minBetweenAds: 45 * 1000,         // 45s between any ads (对标 Poki 克制策略)
      firstAdDelay: 45 * 1000,          // 45s before first ad (新用户友好)
      popunderInterval: 25 * 60 * 1000,  // 25 min between popunders
      sessionMaxAds: 20,                 // max 20 per 30-min session (对标 Poki)
      sessionWindowMs: 30 * 60 * 1000,   // 30-min rolling window
      dailyMaxAds: 60,                   // max 60 per day (对标 Poki)
    },
    TIMING: {
      containerAdDelay: 3000,           // 3s
      vignetteHubDelay: 20 * 1000,      // 20s on hub pages
      vignetteToolDelay: 35 * 1000,     // 35s on tool pages
      vignetteSkipAfter: 5000,          // 5s skip countdown for Poki overlay
      vignetteMaxDuration: 8000,        // 8s auto-dismiss
      popunderInteractionDelay: 5000,  // 5s after first interaction
      adLoadTimeout: 5000,
    },
    STORAGE_PREFIX: 'gzt4_',
    BC_CHANNEL: 'gzt4-tools-sync',
    VERSION: '5.5.2-tools-preconnect-killswitch',  // 2026-06-18: a.magsrv.com preconnect + primary zone kill switch (fixes 530 Origin DNS Error)
    // v5.4: Monetag zone backoff — gentler curve for tools (was 10/30/60min).
    //   streak 1 → 30min (was 10): real fills often land on attempt 2, don't punish
    //   streak 2 → 60min (was 30): same logic
    //   streak 3+ → 24h (was 60min): if a zone misses 3 times, give it a full day
    ZONE_BACKOFF: {
      enabled: true,
      storageKey: 'gzt4_zone_backoff_v1',
      backoffs: [30 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000],
      minRecordIntervalMs: 60 * 1000,
    },
    // v5.5.2: Primary zone kill switch — manually disable a specific primary zone
    //   when its CDN edge is failing (e.g. 530 Origin DNS Error from a.magsrv.com).
    //   Set the zone's flag to false to skip loadZone() immediately. Falls back
    //   to the legacy zone (if legacyEnabled) or AdSense. Mirrors legacyEnabled
    //   pattern but for primary zones (inpagePush, vignette, popunder).
    //   Reset window state via: gzToolsAdsResetKillswitch() or just reload page.
    ZONE_KILLSWITCH: {
      inpagePush: true,  // 11012010 (Superior primary, 0% fill 14d, mostly 530 errors)
      vignette:   true,  // 11012011 (Superior primary, intermittent)
      popunder:   true,  // 11012009 (click-triggered only, never broke user-side)
    },
  };

  // ==================== SELF-CONTAINED VID/SID TRACKER (v5.5.1) ====================
  // tools.gamezipper.com previously depended on bi.gamezipper.com/t.js for visitor
  // tracking, but that endpoint serves Metabase HTML (not JS) so vid/sid was always
  // empty in monetag ad events. Generate IDs inline so monetag events carry proper
  // visitor IDs without depending on a working t.js endpoint. Mirrors the pattern
  // in adsense-auto.js v5.4.2 and the FastAPI /t.js tracker (bi server).
  // Skip if adsense-auto.js already populated window.gzVid / gzSid (it runs first
  // when present — common.js loads monetag-manager.js first so we may be the first
  // ad script; if a prior script set it, reuse it).
  (function ensureVidSid() {
    try {
      if (window.gzVid && window.gzSid) return;
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
      // localStorage may be disabled — fall back to empty
      if (!window.gzVid) window.gzVid = '';
      if (!window.gzSid) window.gzSid = '';
    }
  })();

  // ==================== AD EVENTS TRACKER (v5.2) ====================
  // Lightweight event log so we can see which network actually fires.
  // Each event: { type, network, zoneId, slotId, containerId, ts, meta }
  // Exposed as window.gzAdEvents for console inspection and external analytics.
  var adEvents = [];
  function trackAdEvent(type, data) {
    var ev = { type: type, ts: Date.now() };
    for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) ev[k] = data[k]; }
    adEvents.push(ev);
    // Cap at 200 events
    if (adEvents.length > 200) adEvents.shift();
    try {
      // Fire dataLayer event for GTM if available
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: 'gz_ad_' + type }, ev));
    } catch(e) {}
    // 2026-06-10: forward to BI server (matches gamezipper.com v5.2.1 fix).
    // tools.site has no gz-analytics.js, so window.gzAnalytics is undefined → use direct sendBeacon.
    // v5.5.1-tools-vidsid (2026-06-14): tools.gamezipper.com's t.js tracker endpoint
    // (bi.gamezipper.com/t.js) is broken — that subdomain points to a Metabase
    // dashboard, not the FastAPI analytics server. Now we generate vid/sid inline
    // (localStorage gz_vid / sessionStorage gz_sid) and include them in payloads.
    try {
      if (window.gzAnalytics && typeof window.gzAnalytics.sendAd === 'function') {
        window.gzAnalytics.sendAd(type, ev);
      } else if (window.GZ_COLLECT_ENDPOINT) {
        var payload = JSON.stringify([{
          site: location.hostname, path: location.pathname,
          e: 'gz_ad_event', d: Object.assign({ t: type }, ev), t: Date.now(),
          vid: window.gzVid || '', sid: window.gzSid || ''
        }]);
        if (navigator.sendBeacon) { navigator.sendBeacon(window.GZ_COLLECT_ENDPOINT, payload); }
      }
    } catch(e) {}
    if (window.GZAdDebug) {
      try { console.log('[gz-ad]', type, ev); } catch(e) {}
    }
  }
  window.gzAdEvents = adEvents;

  // v5.5.2: expose kill switch helper on window for ops console access.
  //   Usage in DevTools:
  //     gzToolsAdsKillswitch({inpagePush: false})  // disable primary inpagePush
  //     gzToolsAdsKillswitch({inpagePush: true})   // re-enable
  //   Persists to localStorage, takes effect immediately + on next page load.
  window.gzToolsAdsKillswitch = function(patch) {
    try {
      var KEY = 'gzt4_zone_killswitch_v1';
      var cur = {};
      try { cur = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e) {}
      for (var slot in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, slot)) {
          cur[slot] = !!patch[slot];
        }
      }
      localStorage.setItem(KEY, JSON.stringify(cur));
      // Apply to live CONFIG (takes effect on next loadZone call)
      for (var s2 in cur) {
        if (Object.prototype.hasOwnProperty.call(CONFIG.ZONE_KILLSWITCH, s2)) {
          CONFIG.ZONE_KILLSWITCH[s2] = cur[s2];
        }
      }
      console.log('[gz-ad] killswitch updated', JSON.stringify(CONFIG.ZONE_KILLSWITCH));
      return CONFIG.ZONE_KILLSWITCH;
    } catch(e) {
      console.error('[gz-ad] killswitch update failed', e);
      return null;
    }
  };
  // Load persisted killswitch on startup so it survives page reloads.
  try {
    var PERSIST = JSON.parse(localStorage.getItem('gzt4_zone_killswitch_v1') || '{}') || {};
    for (var slot3 in PERSIST) {
      if (Object.prototype.hasOwnProperty.call(CONFIG.ZONE_KILLSWITCH, slot3)) {
        CONFIG.ZONE_KILLSWITCH[slot3] = !!PERSIST[slot3];
      }
    }
  } catch(e) {}

  var state = {
    adTimestamps: [],
    popunderShown: false,
    isHubPage: false,
    isToolPage: false,
    firstInteraction: 0,
    loaded: {},
    channel: null,
    zoneBackoff: {},          // v5.3: per-zone backoff
  };

  function now() { return Date.now(); }
  function storageGet(k) { try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_PREFIX + k)); } catch(e) { return null; } }
  function storageSet(k, v) { try { localStorage.setItem(CONFIG.STORAGE_PREFIX + k, JSON.stringify(v)); } catch(e) {} }

  // ==================== ZONE BACKOFF (v5.3) ====================
  function loadZoneBackoff() {
    try {
      var raw = localStorage.getItem(CONFIG.ZONE_BACKOFF.storageKey);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      var n = now();
      var keep = {};
      for (var zid in parsed) {
        if (parsed[zid] && parsed[zid].until > n) keep[zid] = parsed[zid];
      }
      return keep;
    } catch(e) { return {}; }
  }
  function saveZoneBackoff() {
    try { localStorage.setItem(CONFIG.ZONE_BACKOFF.storageKey, JSON.stringify(state.zoneBackoff)); } catch(e) {}
  }
  function getZoneBackoffMs(zoneId) {
    if (!CONFIG.ZONE_BACKOFF.enabled) return 0;
    if (!state.zoneBackoff || !state.zoneBackoff[zoneId]) state.zoneBackoff = loadZoneBackoff();
    var entry = state.zoneBackoff[zoneId];
    if (!entry) return 0;
    var remaining = entry.until - now();
    if (remaining <= 0) { delete state.zoneBackoff[zoneId]; saveZoneBackoff(); return 0; }
    return remaining;
  }
  function isZoneInBackoff(zoneId) { return getZoneBackoffMs(zoneId) > 0; }
  function recordZoneNoFill(zoneId) {
    if (!CONFIG.ZONE_BACKOFF.enabled) return;
    if (!state.zoneBackoff[zoneId]) state.zoneBackoff[zoneId] = { until: 0, streak: 0, lastAt: 0 };
    var entry = state.zoneBackoff[zoneId];
    var n = now();
    if (n - entry.lastAt < CONFIG.ZONE_BACKOFF.minRecordIntervalMs) return;
    entry.streak = Math.min(entry.streak + 1, CONFIG.ZONE_BACKOFF.backoffs.length);
    var backoffMs = CONFIG.ZONE_BACKOFF.backoffs[entry.streak - 1];
    entry.until = n + backoffMs;
    entry.lastAt = n;
    saveZoneBackoff();
    trackAdEvent('zone_backoff', { zoneId: zoneId, streak: entry.streak, minutes: Math.round(backoffMs/60000) });
  }
  function clearZoneBackoff(zoneId) {
    if (state.zoneBackoff && state.zoneBackoff[zoneId]) {
      delete state.zoneBackoff[zoneId];
      saveZoneBackoff();
    }
  }
  function refreshDebugBackoff() { try { window.gzZoneBackoff = state.zoneBackoff; } catch(e) {} }

  // ==================== 频率控制 (Poki-model) ====================
  function canShowAd() {
    var ts = storageGet('ad_ts') || [];
    var n = now();
    // 清理超过24h的时间戳
    ts = ts.filter(function(t) { return (n - t) < 24 * 60 * 60 * 1000; });
    // 每日上限
    if (ts.length >= CONFIG.FREQUENCY.dailyMaxAds) return false;
    // 30分钟 session 上限
    var sessionTs = ts.filter(function(t) { return (n - t) < CONFIG.FREQUENCY.sessionWindowMs; });
    if (sessionTs.length >= CONFIG.FREQUENCY.sessionMaxAds) return false;
    // 最小间隔
    if (ts.length > 0) {
      var lastAd = Math.max.apply(null, ts);
      var minGap = ts.length <= 2 ? CONFIG.FREQUENCY.firstAdDelay : CONFIG.FREQUENCY.minBetweenAds;
      if (n - lastAd < minGap) return false;
    }
    return true;
  }

  function markShown() {
    var ts = storageGet('ad_ts') || [];
    ts.push(now());
    storageSet('ad_ts', ts.slice(-100));
    if (state.channel) try { state.channel.postMessage({ type: 'ad_shown', time: now() }); } catch(e) {}
  }

  // ==================== BroadcastChannel (跨标签页同步) ====================
  try {
    state.channel = new BroadcastChannel(CONFIG.BC_CHANNEL);
    state.channel.onmessage = function(e) {
      if (e.data && e.data.type === 'ad_shown') {
        var ts = storageGet('ad_ts') || [];
        ts.push(e.data.time);
        storageSet('ad_ts', ts.slice(-100));
      }
    };
  } catch(e) {}

  // ==================== 广告加载 ====================
  // v5.3: legacy zones (Pungent tag) have shown 0% fill for weeks. legacyEnabled kill switch.
  // v5.2: 实际 DOM fill 检测 (Monetag 脚本加载不等于有广告)
  //       全程 trackAdEvent() 上报 fill/script_loaded/no_fill/load_error
  function loadZone(zoneId, targetEl) {
    return new Promise(function(resolve, reject) {
      // v5.5.2: primary zone kill switch — manually disable a zone when its
      // CDN edge is failing (e.g. 530 Origin DNS Error from a.magsrv.com).
      // Look up which primary slot this zone corresponds to.
      if (zoneId === ZONES.inpagePush && CONFIG.ZONE_KILLSWITCH.inpagePush === false) {
        trackAdEvent('zone_killswitch_skip', { zoneId: zoneId, slot: 'inpagePush' });
        reject(new Error('killswitch_inpagePush'));
        return;
      }
      if (zoneId === ZONES.vignette && CONFIG.ZONE_KILLSWITCH.vignette === false) {
        trackAdEvent('zone_killswitch_skip', { zoneId: zoneId, slot: 'vignette' });
        reject(new Error('killswitch_vignette'));
        return;
      }
      if (zoneId === ZONES.popunder && CONFIG.ZONE_KILLSWITCH.popunder === false) {
        trackAdEvent('zone_killswitch_skip', { zoneId: zoneId, slot: 'popunder' });
        reject(new Error('killswitch_popunder'));
        return;
      }
      // v5.3: skip disabled legacy zones
      if (!ZONES.legacyEnabled && (zoneId === ZONES.inpagePushLegacy || zoneId === ZONES.vignetteLegacy)) {
        trackAdEvent('zone_legacy_disabled_skip', { zoneId: zoneId });
        reject(new Error('legacy_disabled'));
        return;
      }
      // v5.3: short-circuit if zone in backoff
      if (isZoneInBackoff(zoneId)) {
        trackAdEvent('zone_backoff_skip', { zoneId: zoneId, remainingMs: getZoneBackoffMs(zoneId) });
        reject(new Error('zone_in_backoff'));
        return;
      }

      var timeout = setTimeout(function() { reject(new Error('timeout')); }, CONFIG.TIMING.adLoadTimeout);
      var resolved = false;
      var observer = null;
      function checkFill() {
        if (resolved || !targetEl) return;
        var iframes = targetEl.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
          var f = iframes[i];
          var w = f.offsetWidth || parseInt(f.getAttribute('width') || '0');
          var h = f.offsetHeight || parseInt(f.getAttribute('height') || '0');
          if (w >= 50 && h >= 50) {
            resolved = true; clearTimeout(timeout);
            if (observer) observer.disconnect();
            clearZoneBackoff(zoneId);  // v5.3: zone just proved it fills
            trackAdEvent('fill', { network: 'monetag', zoneId: zoneId, containerId: targetEl.id || '' });
            resolve(true); return;
          }
        }
      }
      if (targetEl && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(checkFill);
        observer.observe(targetEl, { childList: true, subtree: true, attributes: true });
      }
      var s = document.createElement('script');
      s.src = CONFIG.AD_PROVIDER + '?zone=' + String(zoneId);
      s.async = true;
      s.setAttribute('data-zone', String(zoneId));
      s.setAttribute('data-cf-async', 'false');
      s.onload = function() {
        trackAdEvent('script_loaded', { network: 'monetag', zoneId: zoneId });
        // Monetag 脚本加载完成，等 1.5s 看是否注入内容
        setTimeout(function() {
          if (resolved) return;
          checkFill();
          if (!resolved) {
            setTimeout(function() {
              if (resolved) return;
              if (observer) observer.disconnect();
              clearTimeout(timeout);
              recordZoneNoFill(zoneId);  // v5.3: exponential backoff
              trackAdEvent('no_fill', { network: 'monetag', zoneId: zoneId });
              reject(new Error('no_visible_fill'));
            }, 1500);
          }
        }, 800);
      };
      s.onerror = function() {
        clearTimeout(timeout);
        if (observer) observer.disconnect();
        recordZoneNoFill(zoneId);  // v5.3: backoff on load_error too
        trackAdEvent('load_error', { network: 'monetag', zoneId: zoneId });
        reject(new Error('err'));
      };
      if (targetEl) { targetEl.appendChild(s); } else { document.head.appendChild(s); }
    });
  }

  function detectPage() {
    var path = window.location.pathname;
    // Hub pages: / or /zh or index pages
    state.isHubPage = /^\/(zh\/?)?$/.test(path);
    state.isToolPage = !state.isHubPage && path.length > 1;
  }

  // ==================== Container ad (工具结果下方) ====================
  function showContainerAd() {
    var container = document.getElementById('gz-tools-ad-below');
    if (!container) return;
    if (container.getAttribute('data-filled')) return;
    if (!canShowAd()) return;

    setTimeout(function() {
      if (container.getAttribute('data-filled')) return;
      // Try Superior first; fall back to Pungent (legacy) if Superior fails
      loadZone(ZONES.inpagePush, container).then(function() {
        container.setAttribute('data-filled', '1');
        markShown();
      }).catch(function() {
        if (container.getAttribute('data-filled')) return;
        loadZone(ZONES.inpagePushLegacy, container).then(function() {
          container.setAttribute('data-filled', '1');
          markShown();
        }).catch(function() {});
      });
    }, CONFIG.TIMING.containerAdDelay);
  }

  // ==================== Poki-style Glass Overlay (替代 Vignette) ====================
  // 对标 Poki: 毛玻璃 + 品牌文案 + 进度条
  function showPokiOverlay() {
    if (!canShowAd()) return;
    var delay = state.isHubPage ? CONFIG.TIMING.vignetteHubDelay : CONFIG.TIMING.vignetteToolDelay;

    setTimeout(function() {
      if (!canShowAd()) return;

      // 创建毛玻璃覆盖层 (Poki-style)
      var overlay = document.createElement('div');
      overlay.id = 'gz-tools-overlay';
      overlay.style.cssText = [
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999',
        'display:flex;flex-direction:column;align-items:center;justify-content:center',
        'background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)',
        'transition:opacity 0.4s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      ].join(';');

      // 品牌区域 — 顶部
      var brandDiv = document.createElement('div');
      brandDiv.style.cssText = 'position:absolute;top:24px;left:0;right:0;text-align:center;';
      var brandText = document.createElement('div');
      brandText.style.cssText = 'font-size:14px;font-weight:600;color:#4F8EFF;letter-spacing:0.5px;';
      brandText.textContent = '🛠️ GameZipper Tools';
      brandDiv.appendChild(brandText);
      overlay.appendChild(brandDiv);

      // 中央提示
      var centerDiv = document.createElement('div');
      centerDiv.style.cssText = 'text-align:center;margin-bottom:20px;';
      var msgLine1 = document.createElement('div');
      msgLine1.style.cssText = 'font-size:16px;font-weight:600;color:#fff;margin-bottom:8px;';
      msgLine1.textContent = "We'll be right back after this short break";
      var msgLine2 = document.createElement('div');
      msgLine2.style.cssText = 'font-size:12px;color:#5D6B84;';
      msgLine2.textContent = 'Loading...';
      centerDiv.appendChild(msgLine1);
      centerDiv.appendChild(msgLine2);
      overlay.appendChild(centerDiv);

      // 底部进度条 (Poki-style: 蓝色填充 #4F8EFF, 5px 高度)
      var progressContainer = document.createElement('div');
      progressContainer.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:5px;background:rgba(255,255,255,0.1);';
      var progressBar = document.createElement('div');
      progressBar.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#4F8EFF,#00D4FF);border-radius:0 3px 3px 0;transition:width 0.3s linear;';
      progressContainer.appendChild(progressBar);
      overlay.appendChild(progressContainer);

      // 跳过按钮 (倒计时后显示)
      var skipBtn = document.createElement('button');
      var skipSeconds = Math.ceil(CONFIG.TIMING.vignetteSkipAfter / 1000);
      skipBtn.style.cssText = [
        'position:absolute;bottom:20px;right:20px',
        'padding:8px 20px;background:rgba(255,255,255,0.12);color:#fff',
        'border:1px solid rgba(255,255,255,0.2);border-radius:20px;font-size:13px',
        'cursor:pointer;backdrop-filter:blur(4px);display:none;',
      ].join(';');
      skipBtn.textContent = 'Continue in ' + skipSeconds + 's...';
      overlay.appendChild(skipBtn);

      document.body.appendChild(overlay);

      // 进度条动画 (总时长 = vignetteMaxDuration)
      var progressStart = now();
      var progressInterval = setInterval(function() {
        var elapsed = now() - progressStart;
        var pct = Math.min(100, (elapsed / CONFIG.TIMING.vignetteMaxDuration) * 100);
        progressBar.style.width = pct + '%';
        if (pct >= 100) clearInterval(progressInterval);
      }, 100);

      // 倒计时
      var remaining = skipSeconds;
      var countdownTimer = setInterval(function() {
        remaining--;
        if (remaining > 0) {
          skipBtn.textContent = 'Continue in ' + remaining + 's...';
        } else {
          clearInterval(countdownTimer);
          skipBtn.textContent = '✕ Continue';
          skipBtn.style.display = 'block';
          skipBtn.onclick = function() { finishOverlay(); };
        }
      }, 1000);

      // 自动关闭
      var maxTimer = setTimeout(function() { finishOverlay(); }, CONFIG.TIMING.vignetteMaxDuration);

      // v5.2: AdSense + Monetag race — 最高价值广告位
      //       全程 trackAdEvent() 上报 commercial_break_fill / no_fill / load_error
      var adFilled = false;
      function onAdFilled(network) {
        if (adFilled) return;
        adFilled = true;
        trackAdEvent('commercial_break_fill', { network: network });
      }
      // Tier 1: AdSense (game 站 AdSense fill 5-10%)
      try {
        var adsenseIns = document.createElement('ins');
        adsenseIns.className = 'adsbygoogle';
        adsenseIns.style.cssText = 'display:block;width:336px;height:280px;margin:0 auto;';
        adsenseIns.setAttribute('data-ad-client', 'ca-pub-8346383990981353');
        adsenseIns.setAttribute('data-ad-slot', 'auto');
        adsenseIns.setAttribute('data-ad-format', 'rectangle');
        var adsenseScript = document.createElement('script');
        adsenseScript.async = true;
        adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        document.head.appendChild(adsenseScript);
        var statusEl2 = document.getElementById('gz-cb-status');
        // Insert ad below the message
        if (statusEl2 && statusEl2.parentNode) {
          statusEl2.parentNode.appendChild(adsenseIns);
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
          // Check fill
          var adStart = Date.now();
          var adTimer = setInterval(function() {
            if (adFilled) { clearInterval(adTimer); return; }
            var ifr = adsenseIns.querySelector('iframe');
            var status = adsenseIns.getAttribute('data-ad-status');
            if (ifr && (status === 'filled' || adsenseIns.offsetHeight > 100)) {
              onAdFilled('adsense');
              clearInterval(adTimer);
            }
            if (Date.now() - adStart > 4000) clearInterval(adTimer);
          }, 250);
        }
      } catch(e) {
        trackAdEvent('adsense_load_error', { error: String(e) });
      }
      // Tier 2: Monetag (race with AdSense)
      setTimeout(function() {
        if (adFilled) return;
        loadZone(ZONES.vignette).then(function() { onAdFilled('monetag_vignette'); }).catch(function() {
          if (adFilled) return;
          loadZone(ZONES.vignetteLegacy).then(function() { onAdFilled('monetag_vignette_legacy'); }).catch(function() {
            trackAdEvent('commercial_break_no_fill', {});
          });
        });
      }, 1500);

      function finishOverlay() {
        clearInterval(progressInterval);
        clearInterval(countdownTimer);
        clearTimeout(maxTimer);
        if (overlay.parentNode) overlay.remove();
        markShown();
      }
    }, delay);
  }

  // ==================== Popunder (点击触发, 频率控制) ====================
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

  // ==================== In-Page Push (轻量级, 所有页面) ====================
  function showInPagePush() {
    if (!canShowAd()) return;
    setTimeout(function() {
      if (!canShowAd()) return;
      // Try Superior first; fall back to Pungent (legacy)
      loadZone(ZONES.inpagePush).then(function() { markShown(); }).catch(function() {
        loadZone(ZONES.inpagePushLegacy).then(function() { markShown(); }).catch(function() {});
      });
    }, 3000);
  }

  // ==================== 初始化 ====================
  // v5.3: load zone backoff state on startup
  state.zoneBackoff = loadZoneBackoff();
  refreshDebugBackoff();

  // Preconnect to ad provider for faster loading
  ['https://a.magsrv.com', 'https://static.magsrv.com'].forEach(function(origin) {
    try {
      var l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = origin;
      l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    } catch(e) {}
  });

  detectPage();
  showContainerAd();
  showPokiOverlay();    // v4: Poki-style glass overlay 替代 vignette
  initPopunder();
  showInPagePush();

})();
