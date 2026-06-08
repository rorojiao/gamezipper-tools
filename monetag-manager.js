/**
 * GameZipper Tools — Monetag Ad Manager v4 (Poki-style)
 * ────────────────────────────────────────────────
 * Poki-model: Smart frequency control, glass overlay + progress bar
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
    // Legacy fallback (Pungent tag - was filling in March 2026)
    // Re-activated 2026-06-08 after Superior zones showed 0 imp for 14 days
    inpagePushLegacy: 10689345,
    vignetteLegacy:   10689346,
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
  // v5.1: 实际 DOM fill 检测 (Monetag 脚本加载不等于有广告)
  function loadZone(zoneId, targetEl) {
    return new Promise(function(resolve, reject) {
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
            try { (window.dataLayer = window.dataLayer || []).push({event: 'gz_ad_fill', network: 'monetag', zoneId: zoneId}); } catch(e){}
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
        // Monetag 脚本加载完成，等 1.5s 看是否注入内容
        setTimeout(function() {
          if (resolved) return;
          checkFill();
          if (!resolved) {
            setTimeout(function() {
              if (resolved) return;
              if (observer) observer.disconnect();
              clearTimeout(timeout);
              reject(new Error('no_visible_fill'));
            }, 1500);
          }
        }, 800);
      };
      s.onerror = function() { clearTimeout(timeout); if (observer) observer.disconnect(); reject(new Error('err')); };
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

      // v5.1: AdSense + Monetag race — 最高价值广告位
      var adFilled = false;
      function onAdFilled(network) {
        if (adFilled) return;
        adFilled = true;
        try { (window.dataLayer = window.dataLayer || []).push({event: 'gz_ad_commercial_break', network: network}); } catch(e){}
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
      } catch(e) {}
      // Tier 2: Monetag (race with AdSense)
      setTimeout(function() {
        if (adFilled) return;
        loadZone(ZONES.vignette).then(function() { onAdFilled('monetag_vignette'); }).catch(function() {
          if (adFilled) return;
          loadZone(ZONES.vignetteLegacy).then(function() { onAdFilled('monetag_vignette_legacy'); }).catch(function() {});
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
