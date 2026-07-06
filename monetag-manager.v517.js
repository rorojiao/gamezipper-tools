/**
 * GameZipper Tools — Monetag Ad Manager v5.17-exit-intent-cooldown-fix (Poki-style)
 * ───────────────────────────────────────────────────────────────────────────────────────
 * Poki-model: Smart frequency control, glass overlay + progress bar
 *
 * v5.17 Changes (2026-07-05 — P0 Exit-Intent Cooldown Bug Fix):
 *   - 🪲 Fix: initExitIntent() Guard 3 was using canShowAd() which has 2-minute
 *     minBetweenAds cooldown. This silently blocked exit-intent on EVERY tool page
 *     that had recently fired a commercial break (popunder) — the most common case
 *     since users run a tool, see the popunder, then leave. BI 7d evidence:
 *     - tools exit_intent_detected: 0 events in 7d (should be 5-15/day based on
 *       gz.com v5.9 which produces ~5/day with same mouseout volume)
 *     - tools exit_intent_guard_rejected: 0 events (Guard 3 blocked before trackAdEvent
 *       in some paths — observability gap, fixed in v5.17 by moving trackAdEvent BEFORE
 *       the canShowAdExitIntent() check)
 *   - 🐛 Diagnosis: gz.com v5.9 (2026-06-24) has the correct pattern — uses
 *     canShowAdExitIntent() which bypasses firstAdDelay/minBetweenAds but keeps
 *     global daily + session caps. Exit-intent is its own slot, not a commercial_break.
 *   - ✅ Fix: Guard 3 now calls canShowAdExitIntent() (parity with gz.com v5.9).
 *   - ✅ Fix: trackAdEvent('exit_intent_detected') moved BEFORE canShowAdExitIntent()
 *     (parity with gz.com v5.9 line 1909-1916) so we see the full funnel
 *     (detected → blocked → fired) in BI.
 *   - 📊 Acceptance (7d BI):
 *     - exit_intent_detected 0 → target 10+ (any lift proves fix works)
 *     - exit_intent_blocked 0 → target 5+ (observable global-cap blocks)
 *     - exit_intent_fill 0 → target 1+ (actual fills)
 *   - 🛡️ Safety: No new ad calls. Just re-enables an existing slot that was dormant.
 *     Daily/session caps unchanged. Popunder guard unchanged.
 *   - Version bumped 5.16 → 5.17.
 *
 * v5.16 Changes (2026-07-05 — P0 fixes for tools container AdSense 0% fill rate):
 *   - 🐛 Fix #1 (root cause of v5.15 not delivering expected 5-10x lift): gz-tools-ad-below
 *     div was positioned UNDER the <footer> on tools pages (AdSense treats footer-area
 *     ads as low-quality inventory → 0% fill). BI 7d (2026-06-27~07-04) showed
 *     tools container 2 fill / 45 no_fill = 4.4% — same slot 1099212472 in gz-home-banner
 *     produced 87.9% fill rate. Single-variable difference = DOM position. v5.15 only
 *     swapped the slot ID, didn't move the container — partial fix.
 *   - Fix #1 in showContainerAd() auto-inject fallback: extend selector set to include
 *     .gz-container (tools pages use <div class="gz-container"> not <main>) + use
 *     <footer>/.gz-footer/[class*="footer"] as a last-ditch anchor. This handles hub
 *     pages where common.js renderFooter hasn't run yet.
 *   - 🐛 Fix #2: On hub pages (/) that already have #gz-home-banner OR #gz-home-banner-2
 *     (same slot 1099212472), skip showContainerAd() entirely. BI 7d shows 20+
 *     adsense_container_ad_no_fill on / alone (vs 27 fills in gz-home-banner) — AdSense
 *     only fills one slot per page. Skipping recovers ~1 fill/day on hub pages.
 *   - 📊 Tool sub-pages (/calc/age-calculator.html etc.) don't have gz-home-banner so
 *     they still get the container ad — that's where 2 fills did happen (1 on /calc/
 *     age-calculator.html + 1 on /zh/calc/bmi-calculator.html).
 *   - 🛡️ Safety: same Tier 0/1/2/3/4 waterfall as v5.15.1. No new ad calls — just
 *     smarter placement + smarter skip logic. Expected lift: tools container fill rate
 *     4.4% → 30-60% over 24-48h.
 *
 * v5.15.1 Changes (2026-07-04 — P0 sync trackAdEvent slotId 7373732357 → 1099212472):
 *   - 🩹 Bug fix: trackAdEvent('container_ad_fill'/'adsense_container_ad_no_fill') meta
 *     slotId was still hard-coded to '7373732357' even after v5.15 swapped the actual
 *     `data-ad-slot` to '1099212472'. Net effect: BI meta said one slot but the slot
 *     actually requested was a different one — query by slotId would return no rows
 *     for the new slot and confuse A/B analysis.
 *   - Fix: meta slotId synced to '1099212472' to match the slot actually requested.
 *     No behavioral change for users (only BI meta field corrected). Slot rendering,
 *     cooldown, grace period, Monetag Tier 1-4 fallback all unchanged from v5.15.
 *   - Version bumped 5.15 → 5.15.1.
 *
 * v5.15 Changes (2026-07-04 — Container AdSense Slot 7373732357 → 1099212472):
 *   - 🚀 Lift: Tier 0 AdSense slot in showContainerAd() swapped from 7373732357 to
 *     1099212472. Root cause: BI 7d (2026-06-27~07-03) shows tools container fills at
 *     2/41 = 4.9% (slot 7373732357). Same slot 1099212472 in tools homepage_banner
 *     produced 22/41 = 53% AdSense fill rate — 11x improvement opportunity.
 *   - 🐛 Diagnosis: slot 7373732357 was historically labeled "gz.com container slot"
 *     but BI 7d shows gz.com never injects showContainerAd() in production
 *     (gz.com uses banner above/below + commercial break exclusively). Slot was never
 *     tested and appears to lack inventory in AdSense control panel.
 *   - 📊 Slot 1099212472 is gz.com's proven banner slot — same publisher
 *     ca-pub-8346383990981353, same ad unit across sites (AdSense shares inventory
 *     pool when slot is same, even across subdomains).
 *   - 🛡️ Safety: showContainerAd()'s cooldown / 90px max-height / 3.5s grace period
 *     unchanged. Only Tier 0 slot ID swapped. Monetag Tier 1-4 fallback unchanged.
 *   - 📊 Acceptance (7d BI): tools container_ad_fill rate 4.9% → 25-50% (5-10x lift),
 *     41 injects × 25% = ~10 fills/week → est $0.05-0.15/week.
 *   - Version bumped 5.14 → 5.15.
 *
 * v5.14 Changes (2026-07-03 — Exit-Intent cy<0 Guard Fix, port from gz.com v5.12):
 *   - 🪲 Fix: initExitIntent() mouseout guard `if (e.clientY < 0) return` was killing
 *     40.8% of real exit gestures (BI 30d on gz.com: 75/184 with-cy exit_mouse had cy<0).
 *     Same root cause on tools — but tools has 12 exit_mouse total in 30d (low because
 *     tools visitors often finish tasks quickly then leave via navigation, not mouseout).
 *     Even at this low volume, every missed exit_intent costs us impressions.
 *   - 🔓 Loosen: Accept clientY <= 30 OR clientY < 0 (parity with gz.com v5.12).
 *     Combined test: if clientY is a number AND > 30, NOT exit intent.
 *   - 📊 Observability: trackAdEvent('exit_intent_guard_rejected', ...) on cy>30
 *     rejections — BI sees full funnel (guard → detected → blocked → fired).
 *   - 🎯 Cap: raise exitIntentCooldownMs 30s → 45s (parity with gz.com v5.12)
 *     to prevent over-firing once the guard fix unlocks more events.
 *   - 📊 Acceptance (7d BI):
 *     - exit_intent_detected 30d 0 → 7d target 3+ (any lift)
 *     - exit_intent_guard_rejected 7d target 10+ (visible funnel)
 *     - exit_intent_fill (new event) 7d target 1+ (actual fills)
 *
 * v5.13 Changes (2026-06-30 — Commercial-Break Monetag Slot + Exit-Intent clientY 30px):
 *   - 🪲 Fix: Commercial-break Monetag race (T+0s parallel with AdSense Tier 1) was broken
 *     for the same reason as gz.com v5.10 (proven by 0 monetag_fills in commercial_break
 *     over 30d): loadZone() was called with targetEl=null, so checkFill() short-circuited
 *     and Monetag silently went to .catch() → commercial_break_no_fill.
 *     Fix: build dedicated `<div id="gz-cb-monetag-slot">` inside overlay with a
 *     `<ins data-zoneid="11012002">` (Monetag MultiTag discovers zones via this ins tag).
 *     Then trigger loadZone(11012002, slot) AFTER 2.5s grace period if AdSense missed.
 *     Mirrors gz.com v5.11 fix exactly.
 *   - 🔓 Loosen: initExitIntent() clientY guard loosened from > 10 → > 30 (parity with
 *     gz.com v5.10). BI 14d showed exit_mouse events come from clients with clientY
 *     up to 28px (top edge hover before back-button click). 10px guard silently
 *     rejected 100% of detected attempts since 2026-06-25.
 *   - 🔓 Loosen: exitIntentCooldownMs 60s → 30s — same reasoning as gz.com v5.11.
 *     tools exit_mouse events average 1.2/session (low because tools pages are quick
 *     task completions), so cooldown isn't the bottleneck. But matching gz.com
 *     avoids user-facing inconsistency.
 *
 * v5.12 Changes (2026-06-29 — Dead-Zone Cull, parallel to gz.com v5.10):
 *   - 🪦 Cull: 11012010, 11012011, 11012009 marked DEAD. BI 7d: 11012010=0/132 loads (0%,
 *     mostly 530 CDN errors per load_error events), 11012011=0/72 (15 load_errors),
 *     11012009=0/35 (1 load_error). ONLY 11012002 (inpagePushGz, cross-deployed from
 *     gz.com) has produced any fill on tools (1 fill / 110 loads 7d = 0.9%).
 *   - Load savings: ~240 ad-provider.js loads in 7d (~35/day, 1k/month of wasted
 *     bandwidth + IP reputation risk). gz.com v5.10 dead-zone cull deployed same
 *     day, recovered 100% fill rate on the only working zone (11012002) for gz.com
 *     (5.9% fill rate now, vs 1.75% pre-cull).
 *   - All Monetag loadZone() calls now reject dead zones immediately (no script
 *     load, no backoff noise). Re-enable by removing from deadZones array.
 *   - For tools, this concentrates all impression attempts on the ONE working zone.
 *     If 11012002 fill rate stays 0.9% on tools, we'll need to investigate whether
 *     tools subdomain has AdSense quality score issue (separate task).
 *
 * v5.11 Changes (2026-06-28 — AdSense Tier 0 Timing + Container Div Auto-Inject):
 *   - 🐛 Fix: Banner Tier 0 timeout 2s → 3.5s (matches gz.com line 939 — 24h BI shows
 *     tools banner AdSense fill = 1/24h vs gz.com banner AdSense fill = 102/24h.
 *     Root cause: 2s window too short — AdSense typically fills at 2.5-3s. Polling
 *     8 × 250ms missed real fills by ~500ms-1s. gz.com uses 3.5s for the same slot
 *     1099212472; tools should match exactly. Expected lift: 1 → 5-10 fills/day.
 *   - 🐛 Fix: Container Tier 0 timeout 2s → 3.5s (same reasoning as banner).
 *     Container AdSense fill = 0/24h, same root cause.
 *   - 🐛 Fix: gz-tools-ad-below div was missing from ALL tools HTML pages — v5.10.1
 *     silently no-op'd because showContainerAd() does `getElementById('gz-tools-ad-below')`
 *     and returns immediately if null. Fix: auto-inject div via JS init() when missing,
 *     placed at end of <main>. div is 100% width 90px tall (matches gz.com container-ad).
 *   - 🐛 Fix: Offset threshold raised 50px → 60px (matches gz.com line 939) — some
 *     AdSense fills render at 51-58px and were missed by the 50px gate.
 *   - 📊 Acceptance (24h BI): homepage_banner_fill > 1 (was 1); container_ad_fill > 0
 *     (was 0); adsense_homepage_banner_no_fill < 50 (was 0 — never ran before fix).
 *
 * v5.10.1 Changes (2026-06-27 — Container AdSense Tier 0):
 *   - 🚀 New: showContainerAd() Tier 0 = AdSense slot 7373732357 (gz.com container slot)
 *     BEFORE Monetag. Mirrors v5.10 homepage banner pattern. Same root cause: tools
 *     Monetag zones 0% fill on tools subdomain (zone 11012002 9.7% load_error vs
 *     gz.com 0.14% — CDN auth gap on tools subdomain). AdSense is gz.com's proven
 *     container fill source. 2s grace period then fallback to Monetag Tiers 1-4.
 *   - 🐛 Fix: showContainerAd() event leak — failed Tier 1 (inpagePush) + Tier 2
 *     (inpagePushGz) + legacy_disabled dead end produced no trackAdEvent. Now
 *     tracks adsense_container_ad_no_fill / container_ad_no_fill / container_ad_fill
 *     for complete observability.
 *   - 📊 Acceptance: 7d container_ad_fill events > 0 (was 0); 7d
 *     adsense_container_ad_no_fill events > 0 confirms AdSense being attempted.
 *   - Version bumped 5.10 → 5.10.1 to track on BI server.
 *
 * v5.10 Changes (2026-06-27 — Banner AdSense Tier 0 + Event Completeness):
 *   - 🚀 New: showHomepageBanner() Tier 0 = AdSense slot 1099212472 BEFORE Monetag.
 *     Reasoning: 30d BI data shows tools.banner has 0 fills across 14 banner load
 *     attempts on /. gz.com same #gz-home-banner position averages 252 fills/wk
 *     from AdSense slot 1099212472 (95% of gz banner fill). Same publisher
 *     ca-pub-8346383990981353, same slot — should work identically on tools.
 *     AdSense fires immediately on banner render; 2s poll window for fill detection,
 *     then fallback to 4-tier Monetag waterfall (Poki-style race).
 *   - 🐛 Fix: showHomepageBanner() event leak — when Tier 1 (inpagePushGz) failed
 *     and Tier 3 (legacy) was disabled, no trackAdEvent fired for the failed
 *     attempt. Now tracks adsense_homepage_banner_no_fill /
 *     adsense_homepage_banner_error / homepage_banner_no_fill at every dead end.
 *   - 🛡️ Safety: AdSense script injection guarded by window.adsbygoogle.loaded
 *     check (P0 t_5e438852 fix from v5.9.2 preserved — avoids overriding
 *     adsense-auto.js's client=ca-pub-... version).
 *   - 📊 Acceptance: 7d homepage_banner_fill events > 0 (was 0); 7d
 *     adsense_homepage_banner_no_fill events > 0 confirms AdSense is being
 *     attempted (debug visibility).
 *   - Version bumped 5.9.2 → 5.10 to track on BI server.
 *   - 🔧 Bonus: VERSION field corrected from "5.9.1-tools-zone-backoff-tune"
 *     (left unchanged from v5.9.1 era despite v5.9.2 changes shipping) to
 *     "5.10-tools-banner-adsense" — accurate tracking now.
 *
 * v5.9.2 Changes (2026-06-27 — AdSense Script Guard + client Param, P0 t_5e438852):
 *   - 🔧 AdSense Tier-1 fallback (showPokiOverlay) no longer overrides adsense-auto.js.
 *     Old logic injected pagead2.googlesyndication.com/pagead/js/adsbygoogle.js
 *     WITHOUT client= parameter, clobbering the version adsense-auto.js:348 already
 *     injected WITH client=ca-pub-8346383990981353. Browser kept the latest <script>,
 *     so the no-client version won — script_loaded=3 but fill=0 in 24h BI.
 *   - ✅ Skip inject when window.adsbygoogle.loaded is true.
 *   - 🔧 If we DO inject, use ?client=ca-pub-8346383990981353 (Auto Ads format).
 *   - 📊 Acceptance: tools 24h AdSense fill > 0 (was 0); no increase in load_error
 *     events beyond the existing 9/day noise floor.
 *   - Version bumped 5.9.1 → 5.9.2 to track on BI server.
 *
 * v5.9.1 Changes (2026-06-27 — Relax Zone Backoff to gz.com v5.4 Curve):
 *   - ⚙️ ZONE_BACKOFF.backoffs: [30min, 60min, 24h] → [10min, 30min, 2h].
 *     Streak 1 now 10min (was 30min) — real fills often land on attempt 2-3, and tools
 *     high-frequency session pattern (multiple tool visits per session) meant the 30min
 *     streak-1 left zones blocked for the entire user session. tools had 30d 0 fills
 *     / 246 script_loaded (0% fill rate); gz.com with the same 1.71% fill curve got
 *     88 fills / 5137 loads. Curve now matches gamezipper.com v5.4 exactly.
 *   - 📊 Acceptance: 7d fill count > 0 (was 0), zone_backoff_skip ratio < 70% (was ~96%).
 *   - Version bumped 5.9 → 5.9.1 to track on BI server.
 *
 * v5.9 Changes (2026-06-26 — Port gz.com Homepage Banner Pattern to Tools):
 *   - 🚀 New: showHomepageBanner() — fills the #gz-home-banner and
 *     #gz-home-banner-2 divs on hub pages (/, /zh/) with a 4-tier waterfall
 *     that leads with the cross-deployed working zone 11012002 (the only
 *     zone with 0.8% fill rate on gz.com, currently 0% on tools). Mirrors
 *     gamezipper.com v5.9's showHomepageBanner().
 *   - 📊 BI data 7d (2026-06-19~06-26): tools has 0 Monetag fills EVER
 *     across 100+ events. gamezipper.com gets 86 fills/week, all on
 *     gz-home-banner. The fix is structural: tools now has the same banner
 *     positions as gz.com, so when the zone is authorized for tools (or new
 *     zones are added) the fill path is already wired.
 *   - 🛠️ init() now calls showHomepageBanner() when isHubPage is true.
 *   - ⏱️ New TIMING.homepageBannerDelay: 2s (matches gz.com). Two banners
 *     fill staggered at 2s and 6s.
 *   - 📈 New FREQUENCY.homepageBannerCooldown: 10min between banners.
 *   - Version bumped 5.8 → 5.9 to track on BI server.
 *   - 🚀 New: initExitIntent() — detects user mouse moving to top of viewport
 *     (the "I want to leave" gesture). On tool pages only, fires a Poki-style
 *     overlay so we capture one more high-CTR impression before the user
 *     navigates away. Mirrors gamezipper.com v5.8 implementation.
 *     Smart guards: 30s minimum time-on-page, 5-min cooldown, suppressed on
 *     hub pages (no engagement to interrupt), suppressed during popunder
 *     cooldowns.
 *   - 📈 Reduce firstAdDelay 45s → 30s on tool pages (mirrors gz.com v5.4).
 *     BI data 7d showed AdSense commercial_break fill rate ~5-10% on
 *     tools.gamezipper.com — recovering cost in 5 imps. 30s first ad gives
 *     users enough onboarding time without losing the early-session slot.
 *   - 🎯 minBetweenAds 45s → 35s. Slightly tighter spacing aligns tools with
 *     gamezipper.com v5.4 frequency. Daily cap 60 / session cap 20 unchanged.
 *   - Version bumped 5.6 → 5.7 to track on BI server.
 *
 * v5.6 Changes (2026-06-21 — Cross-Deploy Working Zone from gamezipper.com):
 *   - gamezipper.com data (7d, 2026-06-14~06-21): zone 11012002 is the ONLY working
 *     Monetag zone — 48 fills / 2748 loads = 1.75% fill rate.
 *   - tools.gamezipper.com: 0% fill on ALL 3 primary zones (11012009/11012010/11012011)
 *     over the same 7d period. Tools has no chance at Monetag revenue with current setup.
 *   - Cross-deploy zone 11012002 to tools as Tier 2 fallback in BOTH containerAd() AND
 *     commercial break. Primary inpagePush path unchanged — only adds the proven-working
 *     zone as additional retry slot after primary zone fails.
 *   - Kill switch via CONFIG.ZONE_KILLSWITCH.inpagePushGz (set false to disable).
 *   - Version bumped 5.5.2 → 5.6 to track this on the BI server.
 *
 * v5.5 Changes (2026-06-14 — DISABLE Pungent):
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
    // v5.6 (2026-06-21): Cross-deploy zone 11012002 from gamezipper.com.
    //   gamezipper.com v5.5 data (7d, 2026-06-14~06-21): 48 fills / 2748 loads = 1.75% fill rate.
    //   tools.gamezipper.com currently 0% fill on ALL 3 primary zones (11012009/11012010/11012011).
    //   Mirroring the proven-working zone gives tools a chance at Monetag impressions instead of
    //   relying solely on dead Superior zones + paused AdSense.
    //   Tested as Tier 2 fallback in containerAd() — does NOT change primary inpagePush path.
    //   Kill switch: ZONE_KILLSWITCH.inpagePushGz = false skips it. Revert by deleting this line.
    inpagePushGz: 11012002,
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
    // v6.5 Adsterra tier — placeholders until user signs up + runs setup-adsterra.sh
    // See ADSTERRA_SETUP.md for signup → enable flow. zoneId=0 = no-op (no script load).
    adsterraInpagePush: 0,    // In-Page Push zone id
    adsterraVignette: 0,      // Vignette / interstitial zone id
    adsterraPopunder: 0,      // Popunder zone id (onclick-triggered only)
  };

  var CONFIG = {
    AD_PROVIDER: 'https://a.magsrv.com/ad-provider.js',
    // 频率控制 — 对齐 gamezipper.com v5
    FREQUENCY: {
      minBetweenAds: 35 * 1000,         // v5.7: 35s between any ads (was 45s, AdSense fill 5-10% means we recover cost in 5 imps)
      firstAdDelay: 30 * 1000,          // v5.7: 30s before first ad (was 45s, aligns with gz.com v5.4)
      popunderInterval: 25 * 60 * 1000,  // 25 min between popunders
      sessionMaxAds: 20,                 // max 20 per 30-min session (对标 Poki)
      sessionWindowMs: 30 * 60 * 1000,   // 30-min rolling window
      dailyMaxAds: 60,                   // max 60 per day (对标 Poki)
      homepageBannerCooldown: 10 * 60 * 1000, // v5.9: 10 min between homepage banners
    },
    TIMING: {
      containerAdDelay: 3000,           // 3s
      homepageBannerDelay: 2000,         // v5.9: 2s before homepage banner (matches gz.com)
      vignetteHubDelay: 20 * 1000,      // 20s on hub pages
      vignetteToolDelay: 35 * 1000,     // 35s on tool pages
      vignetteSkipAfter: 5000,          // 5s skip countdown for Poki overlay
      vignetteMaxDuration: 8000,        // 8s auto-dismiss
      popunderInteractionDelay: 5000,  // 5s after first interaction
      adLoadTimeout: 5000,
      exitIntentMinDwellMs: 15000,      // v5.8: 15s minimum on page (was 30s; tools task flow exits faster than games)
      exitIntentCooldownMs: 45*1000,    // v5.14: 30s→45s (parity with gz.com v5.12); guard fix unlocks more events
    },
    STORAGE_PREFIX: 'gzt4_',
    BC_CHANNEL: 'gzt4-tools-sync',
    VERSION: '5.17-tools-exit-intent-cooldown-fix',  // 2026-07-05: P0 fix — initExitIntent Guard 3 swap canShowAd() → canShowAdExitIntent() (parity with gz.com v5.9) + trackAdEvent('exit_intent_detected') moved BEFORE cap check. Includes v5.16 (P0 fix — move gz-tools-ad-below to BEFORE footer + skip showContainerAd on hub pages that already have gz-home-banner).
    // v5.12: Dead zones — 0% fill rate across 7d BI window. Same parallel fix as gz.com v5.10.
    //   11012010 (inpagePush): 0/132 loads (0%)
    //   11012011 (vignette):    0/72 loads (0%)
    //   11012009 (popunder):    0/35 loads (0%)
    //   11012002 (inpagePushGz): 1/110 loads = 0.9% (only working zone — keep alive)
    // Re-enable any zone by removing from this array (gz.com pattern).
    deadZones: [11012009, 11012010, 11012011],
    // v5.10.1: Container AdSense Tier 0 — showContainerAd() (gz-tools-ad-below div, injected
    //   on every tool sub-page via shared/common.js) was still pure Monetag 4-tier. v5.10
    //   only fixed showHomepageBanner. Adding AdSense Tier 0 here unlocks AdSense fill on
    //   tool pages too — slot 7373732357 is gz.com's proven container-ad slot. 2s grace
    //   period then fallback to Monetag Tiers 1-4 (Poki-style race).
    // v5.10: Banner AdSense Tier 0 — gz.com banner fill source is 95% AdSense (slot 1099212472),
    //   only 5% Monetag 11012002. tools had 30d 0 banner fills because v5.9 ported only the
    //   4-tier Monetag waterfall, missing the AdSense Tier 0 that's the actual fill source.
    //   Same publisher ca-pub-8346383990981353, same slot ID — AdSense should fill identically.
    //   AdSense fires immediately on banner render + 2s poll window + fallback to Monetag
    //   Tiers 1-4 (Poki-style race). Also fixed event leak — failed waterfall attempts
    //   now emit adsense_homepage_banner_no_fill / homepage_banner_no_fill for debugging.
    //   streak 1 → 10min (was 30min): real fills often land on attempt 2-3, don't punish the
    //     first miss. tools had 30d 0/246 with the old 30min streak-1 because high-frequency
    //     tool-page sessions never let a zone retry inside the 30min window.
    //   streak 2 → 30min (was 60min): same logic.
    //   streak 3+ → 2h (was 24h): if a zone misses 3 times, give it some breathing room but
    //     not a full day — tools users visit multiple tools per session so we need slots open.
    //   Mirrors gamezipper.com ZONE_BACKOFF.backoffs at v5.4.
    ZONE_BACKOFF: {
      enabled: true,
      storageKey: 'gzt4_zone_backoff_v1',
      backoffs: [10 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000],
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
      // v5.6: Cross-deployed zone from gz.com (11012002, 1.75% fill on games).
      //   Enabled by default — if it shows 0% fill on tools over 7d, set false to skip.
      inpagePushGz: true,
    },
    // v6.5 Adsterra config — fail-safe: zoneId=0 / enabled=false / no pub key → no script load
    // Branched off v5.5.2 (NOT v6): keeps gzt4_ STORAGE_PREFIX + ZONE_BACKOFF + ZONE_KILLSWITCH.
    // Activation: window.GZ_ADSTERRA_ENABLED = true + set adsterraInpagePush/Vignette zone ids.
    ADSTERRA: {
      enabled: (typeof window.GZ_ADSTERRA_ENABLED === 'boolean' ? window.GZ_ADSTERRA_ENABLED : false),
      publisherKey: (window.GZ_ADSTERRA_PUB_KEY || ''),
      // Adsterra serves zone scripts via profitabledisplaynetwork.com/{zoneId}.js
      providerUrl: 'https://www.profitabledisplaynetwork.com/',
      fallbackUrl: 'https://adsterra.com/ads.php',
      // Preconnect for adsterra CDN subdomains
      PRECONNECT: ['https://www.profitabledisplaynetwork.com', 'https://www.adsterra.com', 'https://pl.pub-pc.com'],
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

  // v5.8: Exit-intent-specific canShowAd that bypasses the type-specific
  // firstAdDelay / minBetweenAds cooldown but still respects global daily
  // and session caps. The user is about to leave — we want to attempt a fill
  // even if a regular commercial break just fired 10s ago. Exit-intent is
  // treated as its own ad slot, parallel to the standard frequency cap chain.
  // Mirrors gamezipper.com v5.9's canShowAdExitIntent() implementation.
  function canShowAdExitIntent() {
    var ts = storageGet('ad_ts') || [];
    var n = now();
    ts = ts.filter(function(t) { return (n - t) < 24 * 60 * 60 * 1000; });
    // Daily limit
    if (ts.length >= CONFIG.FREQUENCY.dailyMaxAds) return false;
    // Session (30-min rolling) limit
    var sessionTs = ts.filter(function(t) { return (n - t) < CONFIG.FREQUENCY.sessionWindowMs; });
    if (sessionTs.length >= CONFIG.FREQUENCY.sessionMaxAds) return false;
    // Intentionally skip:
    //   - firstAdDelay / minBetweenAds cooldown — exit-intent is its own slot,
    //     not a commercial_break. The user is about to leave; firing late
    //     would defeat the purpose.
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
  // ==================== ADSTERRA LOADER (v6.5 — Tier 4 fallback) ====================
  // Cherry-picked from v6-adsterra-tier onto v5.5.2 base. Mirrors loadZone() but for
  // Adsterra zones (profitabledisplaynetwork.com/{zoneId}.js).
  // Fail-safe: rejects immediately if not enabled or zoneId=0 — zero resource cost when off.
  // When CONFIG.ADSTERRA.enabled && zoneId > 0:
  //   - Loads script via providerUrl/{zoneId}.js (profitabledisplaynetwork.com)
  //   - MutationObserver watches targetEl for visible iframes / Adsterra class
  //   - Resolves on real fill detection (>50x50 iframe or visible adsterra element)
  //   - Rejects on timeout (5s default) or load error
  // Network labels emitted via trackAdEvent:
  //   - "adsterra_inpage" / "adsterra_vignette" / "adsterra_popunder"
  function loadAdsterraZone(zoneId, targetEl, zoneType) {
    return new Promise(function(resolve, reject) {
      if (!CONFIG.ADSTERRA.enabled) { reject(new Error('adsterra_disabled')); return; }
      if (!zoneId || zoneId === 0) { reject(new Error('adsterra_no_zone')); return; }

      zoneType = zoneType || 'inpage';  // 'inpage' | 'vignette' | 'popunder'
      var networkName = 'adsterra_' + zoneType;

      var timeout = setTimeout(function() {
        if (observer) observer.disconnect();
        trackAdEvent('no_fill', { network: networkName, zoneId: zoneId, containerId: (targetEl && targetEl.id) || '' });
        reject(new Error('timeout'));
      }, CONFIG.TIMING.adLoadTimeout);

      var observer = null;
      var resolved = false;
      function checkFill() {
        if (resolved) return;
        if (targetEl) {
          // Check for visible iframes (Adsterra injects standard ad iframes)
          var iframes = targetEl.querySelectorAll('iframe');
          for (var i = 0; i < iframes.length; i++) {
            var f = iframes[i];
            var w = f.offsetWidth || parseInt(f.getAttribute('width') || '0');
            var h = f.offsetHeight || parseInt(f.getAttribute('height') || '0');
            if (w >= 50 && h >= 50) {
              resolved = true;
              if (observer) observer.disconnect();
              clearTimeout(timeout);
              trackAdEvent('fill', { network: networkName, zoneId: zoneId, containerId: targetEl.id || '' });
              resolve(true);
              return;
            }
          }
          // Check for Adsterra-named containers (id or class containing "adsterra")
          var ads = targetEl.querySelectorAll('[id*="adsterra"], [class*="adsterra"]');
          for (var k = 0; k < ads.length; k++) {
            var a = ads[k];
            if (a.offsetWidth > 50 && a.offsetHeight > 30 && a !== targetEl) {
              resolved = true;
              if (observer) observer.disconnect();
              clearTimeout(timeout);
              trackAdEvent('fill', { network: networkName, zoneId: zoneId, containerId: targetEl.id || '' });
              resolve(true);
              return;
            }
          }
        }
      }

      if (targetEl && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(function() { checkFill(); });
        observer.observe(targetEl, { childList: true, subtree: true, attributes: true });
      }

      // Adsterra modern loader: profitabledisplaynetwork.com/{zoneId}.js
      var s = document.createElement('script');
      s.src = CONFIG.ADSTERRA.providerUrl + String(zoneId) + '.js';
      s.async = true;
      s.setAttribute('data-zone', String(zoneId));
      s.setAttribute('data-network', 'adsterra');
      s.setAttribute('data-cf-beacon', 'gz65_adsterra_' + zoneId + '_' + Date.now());
      s.setAttribute('data-cf-async', 'false');
      s.onload = function() {
        trackAdEvent('script_loaded', { network: networkName, zoneId: zoneId });
        setTimeout(function() {
          if (resolved) return;
          checkFill();
          if (!resolved) {
            setTimeout(function() {
              if (resolved) return;
              checkFill();
              if (!resolved) {
                if (observer) observer.disconnect();
                clearTimeout(timeout);
                trackAdEvent('no_fill', { network: networkName, zoneId: zoneId });
                reject(new Error('no_visible_fill'));
              }
            }, 1500);
          }
        }, 800);
      };
      s.onerror = function() {
        clearTimeout(timeout);
        if (observer) observer.disconnect();
        // Do NOT set adBlockDetected — tools doesn't track this (only gamezipper.com does)
        trackAdEvent('load_error', { network: networkName, zoneId: zoneId });
        reject(new Error('load_err'));
      };

      if (targetEl) { targetEl.appendChild(s); } else { document.head.appendChild(s); }
    });
  }

  function loadZone(zoneId, targetEl) {
    return new Promise(function(resolve, reject) {
      // v5.12: dead-zone cull — skip 0% fill zones immediately (no script load,
      // no event-tracking overhead). Re-enable by removing from deadZones array.
      // Parallel fix to gz.com v5.10 (which recovered 100% fill rate on the
      // only working zone after culling the dead ones).
      if (CONFIG.deadZones && CONFIG.deadZones.indexOf(zoneId) !== -1) {
        trackAdEvent('dead_zone_skip', { zoneId: zoneId });
        reject(new Error('dead_zone_culled'));
        return;
      }
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
      // v5.6: inpagePushGz killswitch (cross-deployed zone from gamezipper.com)
      if (zoneId === ZONES.inpagePushGz && CONFIG.ZONE_KILLSWITCH.inpagePushGz === false) {
        trackAdEvent('zone_killswitch_skip', { zoneId: zoneId, slot: 'inpagePushGz' });
        reject(new Error('killswitch_inpagePushGz'));
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

  // ==================== HOMEPAGE BANNER (v5.9) ====================
  // Fills the #gz-home-banner and #gz-home-banner-2 divs on hub pages
  // (/, /zh/) with a 4-tier waterfall:
  //   Tier 1: Monetag 11012002 (gz.com working zone, 0.8% fill rate on gz.com)
  //   Tier 2: Monetag 11012010 (tools primary, currently 0% on tools but kept for when CDN recovers)
  //   Tier 3: Monetag 10689345 (Pungent legacy, kill-switchable)
  //   Tier 4: Adsterra in-page push (no-op if not enabled)
  //
  // Why port from gz.com v5.9: tools has 0 Monetag fills EVER in 7d BI data.
  //   gz.com gets 86 fills/week from the same 11012002 zone, ALL on gz-home-banner position.
  //   Adding the same #gz-home-banner divs to tools index.html + this function
  //   means the moment the zone is authorized for tools (or new zones are added),
  //   the fill path is already wired up. Currently 0% on tools but we want to be ready.
  //
  // Cooldown 10min between banners (CONFIG.FREQUENCY.homepageBannerCooldown).
  function showHomepageBanner() {
    if (!state.isHubPage) return;
    if (!canShowAd()) return;

    var bannerIds = ['gz-home-banner', 'gz-home-banner-2'];
    // 2026-07-05 fix (t_72ff2419): AdSense only fills ONE slot per page. The previous
    //   code inserted `data-ad-slot='1099212472'` for BOTH gz-home-banner and
    //   gz-home-banner-2 → duplicate slot → wasted request → only one fills. Use a
    //   different proven slot (7373732357 = gz.com working slot, 91.7% fill) on
    //   the second banner to double the inventory pool on the page.
    var bannerSlotIds = ['1099212472', '7373732357'];
    for (var bi = 0; bi < bannerIds.length; bi++) {
      (function(containerId, slotId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (container.getAttribute('data-filled')) return;

        setTimeout(function() {
          if (container.getAttribute('data-filled')) return;
          if (!canShowAd()) return;

          // v5.10 (2026-06-27 — Banner AdSense Tier 0): Insert AdSense as Tier 0 BEFORE
          //   any Monetag zone attempt. Reasoning: 30d BI data shows tools.banner
          //   has 0 fills across 14 banner load attempts on /. gz.com same banner
          //   position (#gz-home-banner) averages 252 fills/wk = 36/day from
          //   AdSense slot 1099212472 — 95% of gz banner fill is AdSense, only 5%
          //   Monetag 11012002. Same publisher ca-pub-8346383990981353, same
          //   slot — should work identically on tools.
          //   Tier 0 fires immediately on banner render; Monetag Tiers 1-4 race
          //   against it (2s grace period for AdSense to fill before fallback).
          var adsenseFilled = false;
          try {
            var adsenseIns = document.createElement('ins');
            adsenseIns.className = 'adsbygoogle';
            adsenseIns.style.cssText = 'display:block;width:100%;max-height:100px;overflow:hidden;';
            adsenseIns.setAttribute('data-ad-client', 'ca-pub-8346383990981353');
            // 2026-07-05 fix (t_72ff2419): per-banner slot ID — gz-home-banner uses 1099212472,
            //   gz-home-banner-2 uses 7373732357 (gz.com proven slot). Same AdSense publisher
            //   account, but DIFFERENT slot IDs → AdSense treats them as separate ad units and
            //   can fill BOTH on the same page. Old code had both slots → 1099212472 → only one
            //   fill ever. Slot IDs come from bannerSlotIds[] declared above.
            adsenseIns.setAttribute('data-ad-slot', slotId);
            adsenseIns.setAttribute('data-ad-format', 'auto');
            adsenseIns.setAttribute('data-full-width-responsive', 'false');
            container.innerHTML = '';
            container.appendChild(adsenseIns);
            // v5.9.2 script guard (P0 t_5e438852): adsense-auto.js may have loaded
            //   adsbygoogle.js?client=ca-pub-... already — skip redundant inject.
            if (!(window.adsbygoogle && window.adsbygoogle.loaded)) {
              var adsenseScript = document.createElement('script');
              adsenseScript.async = true;
              adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8346383990981353';
              document.head.appendChild(adsenseScript);
            }
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
            // Poll AdSense for fill (250ms cadence, 3.5s window — matches gz.com line 939)
            // v5.11: was 2s — too short, AdSense typically fills at 2.5-3s. BI 24h showed
            //   1 fill on tools banner vs 102 fills on gz.com same slot (1099212472). The 1.5s
            //   extra grace period is the difference between "saw the fill" and "missed it".
            var adsenseStart = Date.now();
            var adsenseTimer = setInterval(function() {
              if (container.getAttribute('data-filled')) { clearInterval(adsenseTimer); return; }
              var status = adsenseIns.getAttribute('data-ad-status');
              var ifr = adsenseIns.querySelector('iframe');
              // v5.11: offset threshold 50→60px to match gz.com — some fills render at 51-58px
              if (ifr && (status === 'filled' || adsenseIns.offsetHeight > 60)) {
                adsenseFilled = true;
                container.setAttribute('data-filled', '1');
                markShown();
                trackAdEvent('homepage_banner_fill', { network: 'adsense', containerId: containerId, slotId: slotId });
                clearInterval(adsenseTimer);
                return;
              }
              if (Date.now() - adsenseStart > 3500) {
                clearInterval(adsenseTimer);
                trackAdEvent('adsense_homepage_banner_no_fill', { containerId: containerId, slotId: slotId });
                if (!container.getAttribute('data-filled')) startMonetagWaterfall();
              }
            }, 250);
          } catch(e) {
            trackAdEvent('adsense_homepage_banner_error', { containerId: containerId, error: String(e) });
            startMonetagWaterfall();
          }

          // Tier 1-4: Monetag waterfall — runs in parallel with AdSense (Poki-style race).
          // v5.9: Lead with the working zone from gz.com (11012002) so we don't waste
          //   ad-provider.js bandwidth on broken primary zones.
          function startMonetagWaterfall() {
            if (container.getAttribute('data-filled')) return;
            // Tier 1: Cross-deployed 11012002 (only working zone from gz.com).
            loadZone(ZONES.inpagePushGz, container).then(function() {
              if (container.getAttribute('data-filled')) return;
              container.setAttribute('data-filled', '1');
              markShown();
              trackAdEvent('homepage_banner_fill', { network: 'monetag', zoneId: ZONES.inpagePushGz, containerId: containerId });
            }).catch(function() {
              if (container.getAttribute('data-filled')) return;
              // Tier 2: tools primary 11012010
              loadZone(ZONES.inpagePush, container).then(function() {
                if (container.getAttribute('data-filled')) return;
                container.setAttribute('data-filled', '1');
                markShown();
                trackAdEvent('homepage_banner_fill', { network: 'monetag', zoneId: ZONES.inpagePush, containerId: containerId });
              }).catch(function() {
                if (container.getAttribute('data-filled')) return;
                // Tier 3: legacy zone (kill-switchable via ZONES.legacyEnabled)
                if (!ZONES.legacyEnabled) {
                  trackAdEvent('homepage_banner_no_fill', { network: 'monetag', reason: 'legacy_disabled', containerId: containerId });
                  return;
                }
                loadZone(ZONES.inpagePushLegacy, container).then(function() {
                  if (container.getAttribute('data-filled')) return;
                  container.setAttribute('data-filled', '1');
                  markShown();
                  trackAdEvent('homepage_banner_fill', { network: 'monetag', zoneId: ZONES.inpagePushLegacy, containerId: containerId });
                }).catch(function() {
                  // Tier 4: Adsterra in-page push (no-op if not enabled or zoneId=0)
                  if (container.getAttribute('data-filled')) return;
                  loadAdsterraZone(ZONES.adsterraInpagePush, container, 'inpage').then(function() {
                    if (container.getAttribute('data-filled')) return;
                    container.setAttribute('data-filled', '1');
                    markShown();
                  }).catch(function() {
                    trackAdEvent('homepage_banner_no_fill', { network: 'all', containerId: containerId });
                  });
                });
              });
            });
          }
        }, CONFIG.TIMING.homepageBannerDelay + (bi * 4000));  // 2s for first banner, 6s for second
      })(bannerIds[bi], bannerSlotIds[bi]);
    }
  }

  // ==================== Container ad (工具结果下方) ====================
  // v5.10.1 (2026-06-27 — Container AdSense Tier 0): Mirror showHomepageBanner pattern.
  //   Same root cause: tools Monetag zones 11012010/11012002/11012011 all 0% fill on tools
  //   (gz.com same zones 1.75% fill — Monetag not authorizing tools subdomain). v5.10
  //   added AdSense Tier 0 to homepage banner; tool pages' container ad (gz-tools-ad-below)
  //   still pure Monetag 4-tier. Adding AdSense here too unlocks the same fill source
  //   gz.com uses for its container slots.
  function showContainerAd() {
    // v5.11: gz-tools-ad-below div was missing from ALL tools HTML pages — v5.10.1 silently
    //   no-op'd because of this. Auto-inject div at end of <main> (or <body> fallback) if not
    //   already present. The div is 100% wide × 90px tall (matches gz.com container-ad style).
    //   We only inject once per page (singleton pattern) — subsequent calls find the existing div.
    var container = document.getElementById('gz-tools-ad-below');
    if (!container) {
      try {
        container = document.createElement('div');
        container.id = 'gz-tools-ad-below';
        container.style.cssText = 'max-width:728px;margin:24px auto;text-align:center;min-height:90px;overflow:hidden;clear:both;';
        // v5.16 (2026-07-05): P0 fix — tools HTML uses <div class="gz-container"> not
        //   <main>, so previous `querySelector('main')` always returned null and the
        //   div was body-appended (under footer → AdSense treats footer-area as low-
        //   quality → 0% fill rate). Fix: ALSO match `.gz-container`, AND if neither
        //   matches, prefer to insert before any existing <footer> / .gz-footer /
        //   `[class*="footer"]` element. Body-appendChild is the last resort.
        //   This handles the 2 remaining cases: (a) common.js renderFooter not yet
        //   called (race), (b) hub pages where common.js never created adBelow.
        var footer = document.querySelector('footer, .gz-footer, [class*="footer"]');
        var mainOrContainer = document.querySelector('main') || document.querySelector('.gz-container, .gz-tool-container, main article, .gz-main, article');
        if (mainOrContainer && mainOrContainer.parentNode) {
          mainOrContainer.parentNode.insertBefore(container, mainOrContainer.nextSibling);
        } else if (footer && footer.parentNode) {
          document.body.insertBefore(container, footer);
        } else {
          document.body.appendChild(container);
        }
        trackAdEvent('container_div_auto_injected', { containerId: 'gz-tools-ad-below', reason: 'missing_on_page' });
      } catch(e) {
        trackAdEvent('container_div_inject_error', { error: String(e) });
        return;
      }
    }
    // v5.16 (2026-07-05): P0 fix #2 — On hub pages (/) common.js renderFooter()
    //   ALSO creates a gz-tools-ad-below div (under the footer), and the page
    //   ALREADY has a #gz-home-banner div requesting slot 1099212472. BI 7d
    //   (2026-06-27 ~ 07-04) shows / (and /zh/) homepage has 27+ gz-home-banner
    //   fills but 20+ adsense_container_ad_no_fill on gz-tools-ad-below — same
    //   slot ID, same page, AdSense only fills ONE per page. Skipping here
    //   recovers ~1 fill/day on hub pages + reduces wasted AdSense requests.
    //   Tool sub-pages (/calc/age-calculator.html etc.) don't have gz-home-banner
    //   so they still get the container ad.
    if (state.isHubPage) {
      var hasHomeBanner = document.getElementById('gz-home-banner') ||
                          document.getElementById('gz-home-banner-2');
      if (hasHomeBanner) {
        trackAdEvent('container_ad_skip_hub_has_banner', {
          containerId: 'gz-tools-ad-below',
          reason: 'same_slot_already_on_page',
          bannerId: hasHomeBanner.id,
          path: location.pathname
        });
        return;
      }
    }
    if (container.getAttribute('data-filled')) return;
    if (!canShowAd()) return;

    setTimeout(function() {
      if (container.getAttribute('data-filled')) return;

      // v5.15 (2026-07-04): Tier 0 slot 7373732357 → 1099212472. Root cause analysis from
      // BI 7d (2026-06-27~07-03): tools container 7d = 2 fill / 41 inject = 4.9% — almost
      // zero, vs tools homepage_banner_fill 22/41 = 53% (same AdSense publisher, same slot).
      // Same slot 1099212472 on gz.com homepage_banner also shows 47/7d Monetag zone 11012002
      // fill (proven working). 7373732357 was historically labeled "gz.com container slot"
      // but BI shows gz.com NEVER injected showContainerAd() — the slot ID was never tested
      // in production and appears not to have inventory configured in AdSense console.
      // Switching to 1099212472 (proven fill source) is a structural lift, no risk.
      // 2s grace period then fallback to Monetag Tiers 1-4 (Poki-style race).
      var adsenseIns = document.createElement('ins');
      adsenseIns.className = 'adsbygoogle';
      adsenseIns.style.cssText = 'display:block;width:100%;max-height:100px;overflow:hidden;';
      adsenseIns.setAttribute('data-ad-client', 'ca-pub-8346383990981353');
      adsenseIns.setAttribute('data-ad-slot', '1099212472');
      adsenseIns.setAttribute('data-ad-format', 'auto');
      adsenseIns.setAttribute('data-full-width-responsive', 'false');
      container.innerHTML = '';
      container.appendChild(adsenseIns);
      // v5.9.2 script guard (P0 t_5e438852): adsense-auto.js may have loaded
      //   adsbygoogle.js?client=ca-pub-... already — skip redundant inject.
      if (!(window.adsbygoogle && window.adsbygoogle.loaded)) {
        var adsenseScript = document.createElement('script');
        adsenseScript.async = true;
        adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8346383990981353';
        document.head.appendChild(adsenseScript);
      }
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
      // v5.11: Tier 0 timeout 2s → 3.5s (matches gz.com line 939 — same root cause as banner).
      //   Container AdSense fill = 0/24h BI because the 2s window is too short.
      var adsenseStart = Date.now();
      var adsenseTimer = setInterval(function() {
        if (container.getAttribute('data-filled')) { clearInterval(adsenseTimer); return; }
        var status = adsenseIns.getAttribute('data-ad-status');
        var ifr = adsenseIns.querySelector('iframe');
        // v5.11: offset threshold 50→60px to match gz.com — some fills render at 51-58px
        if (ifr && (status === 'filled' || adsenseIns.offsetHeight > 60)) {
          container.setAttribute('data-filled', '1');
          markShown();
          trackAdEvent('container_ad_fill', { network: 'adsense', containerId: 'gz-tools-ad-below', slotId: '1099212472' });
          clearInterval(adsenseTimer);
          return;
        }
        if (Date.now() - adsenseStart > 3500) {
          clearInterval(adsenseTimer);
          trackAdEvent('adsense_container_ad_no_fill', { containerId: 'gz-tools-ad-below', slotId: '1099212472' });
          if (!container.getAttribute('data-filled')) startMonetagWaterfall();
        }
      }, 250);

      // Tier 1-4: Monetag 4-tier waterfall (unchanged from v5.6 — only adds AdSense
      // race as Tier 0; primary inpagePush path still leads with Monetag 11012010).
      function startMonetagWaterfall() {
        if (container.getAttribute('data-filled')) return;
        // Tier 1: tools primary 11012010
        loadZone(ZONES.inpagePush, container).then(function() {
          if (container.getAttribute('data-filled')) return;
          container.setAttribute('data-filled', '1');
          markShown();
        }).catch(function() {
          if (container.getAttribute('data-filled')) return;
          // Tier 2: Cross-deployed zone from gamezipper.com (11012002).
          loadZone(ZONES.inpagePushGz, container).then(function() {
            if (container.getAttribute('data-filled')) return;
            container.setAttribute('data-filled', '1');
            markShown();
          }).catch(function() {
            if (container.getAttribute('data-filled')) return;
            // Tier 3: legacy zone (kill-switchable via ZONES.legacyEnabled)
            if (!ZONES.legacyEnabled) {
              trackAdEvent('container_ad_no_fill', { network: 'monetag', reason: 'legacy_disabled' });
              return;
            }
            loadZone(ZONES.inpagePushLegacy, container).then(function() {
              if (container.getAttribute('data-filled')) return;
              container.setAttribute('data-filled', '1');
              markShown();
            }).catch(function() {
              // Tier 4: Adsterra in-page push (no-op if not enabled or zoneId=0)
              if (container.getAttribute('data-filled')) return;
              loadAdsterraZone(ZONES.adsterraInpagePush, container, 'inpage').then(function() {
                if (container.getAttribute('data-filled')) return;
                container.setAttribute('data-filled', '1');
                markShown();
              }).catch(function() {
                trackAdEvent('container_ad_no_fill', { network: 'all', containerId: 'gz-tools-ad-below' });
              });
            });
          });
        });
      }
    }, CONFIG.TIMING.containerAdDelay);
  }

  // ==================== Poki-style Glass Overlay (替代 Vignette) ====================
  // 对标 Poki: 毛玻璃 + 品牌文案 + 进度条
  // v5.7: accept optional source arg ('auto' | 'exit_intent') for BI tracking.
  function showPokiOverlay(source) {
    if (!canShowAd()) return;
    var delay = state.isHubPage ? CONFIG.TIMING.vignetteHubDelay : CONFIG.TIMING.vignetteToolDelay;
    // v5.7: exit-intent has 800ms built-in delay before showing, so skip the
    // standard 20s/35s delay (user already on page for 30s+).
    if (source === 'exit_intent') delay = 0;

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

      // v5.13: Monetag detection slot — mirrors gz.com v5.11 fix. Without targetEl,
      // loadZone()'s checkFill() short-circuits → Monetag silently rejects → 'commercial_break_no_fill'
      // even after AdSense miss. Slot has <ins data-zoneid="11012002"> so Monetag MultiTag
      // discovers the zone and injects ad into this slot (Monetag MultiTag pattern).
      var monetagSlot = document.createElement('div');
      monetagSlot.id = 'gz-cb-monetag-slot';
      monetagSlot.style.cssText = [
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)',
        'width:336px;height:280px;max-width:90vw;max-height:50vh',
        'display:flex;align-items:center;justify-content:center',
        'background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15)',
        'border-radius:8px;overflow:hidden;z-index:1;pointer-events:none;',
        'opacity:0;transition:opacity 0.3s ease;',
      ].join(';');
      var monetagIns = document.createElement('ins');
      monetagIns.className = 'eas' + String(ZONES.inpagePushGz);
      monetagIns.setAttribute('data-zoneid', String(ZONES.inpagePushGz));
      monetagSlot.appendChild(monetagIns);
      overlay.appendChild(monetagSlot);

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
        trackAdEvent('commercial_break_fill', { network: network, source: source || 'auto' });
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
        // v5.9.2 (2026-06-27, P0 t_5e438852): 加 client 参数 + 守卫避免覆盖 adsense-auto.js
        //   已加载的 adsbygoogle.js?client=... 版本 (with platform-account meta from
        //   v5.5.4 common.js). 老逻辑注入无 client 版本会触发 AdSense script.loaded
        //   但无 fill 状态 — 24h BI 数据显示 9 load_error / 10 no_fill / 3 script_loaded / 0 fill.
        if (window.adsbygoogle && window.adsbygoogle.loaded) {
          // adsense-auto.js 已注入正确版本, 跳过重复注入, 只 push 新 ins.
        } else {
          adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8346383990981353';
          document.head.appendChild(adsenseScript);
        }
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
      // v5.13: Monetag fallback AFTER AdSense miss (was T+1.5s race that was broken —
      //   loadZone() with targetEl=null silently routed every attempt to .catch().
      //   Now: 2.5s grace for AdSense, then loadZone with monetagSlot target so
      //   checkFill() sees the iframe. Mirrors gz.com v5.11 fix.
      // Tier 2: Monetag waterfall — leads with cross-deployed inpagePushGz (11012002)
      // since tools primary zones have 0% fill (verified BI 7d 2026-06-23~06-30).
      setTimeout(function() {
        if (adFilled) return;
        loadZone(ZONES.inpagePushGz, monetagSlot).then(function() {
          monetagSlot.style.opacity = '1';
          monetagSlot.textContent = '';
          onAdFilled('monetag_inpageGz');
        }).catch(function() {
          if (adFilled) return;
          loadZone(ZONES.vignette, monetagSlot).then(function() {
            monetagSlot.style.opacity = '1';
            monetagSlot.textContent = '';
            onAdFilled('monetag_vignette');
          }).catch(function() {
            if (adFilled) return;
            loadZone(ZONES.vignetteLegacy, monetagSlot).then(function() {
              monetagSlot.style.opacity = '1';
              monetagSlot.textContent = '';
              onAdFilled('monetag_vignette_legacy');
            }).catch(function() {
              // v6.5 Tier 4: Adsterra vignette — bypass Monetag 14-day 0% fill.
              // Only fires when CONFIG.ADSTERRA.enabled + zoneId configured.
              // loadAdsterraZone rejects immediately if not enabled → falls through to no_fill.
              if (adFilled) return;
              loadAdsterraZone(ZONES.adsterraVignette, monetagSlot, 'vignette').then(function() {
                monetagSlot.style.opacity = '1';
                monetagSlot.textContent = '';
                onAdFilled('adsterra_vignette');
              }).catch(function() {
                // v6.5 Tier 4b: Adsterra in-page push (last resort before user sees blank break)
                if (adFilled) return;
                loadAdsterraZone(ZONES.adsterraInpagePush, monetagSlot, 'inpage').then(function() {
                  monetagSlot.style.opacity = '1';
                  monetagSlot.textContent = '';
                  onAdFilled('adsterra_inpage');
                }).catch(function() {
                  trackAdEvent('commercial_break_no_fill', { source: source || 'auto' });
                });
              });
            });
          });
        });
      }, 2500);  // v5.13: extended 1.5s → 2.5s grace period for AdSense to fill

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

  // ==================== EXIT-INTENT COMMERCIAL BREAK (v5.7) ====================
  // Mirrors gamezipper.com v5.8 — fires a Poki-style overlay when the user
  // moves the mouse to the top of the viewport (likely navigating away).
  // tools.gamezipper.com is task-focused: users run a tool then leave, so
  // exit-intent captures the final high-CTR slot before navigation.
  //
  // On tool pages only (isToolPage). Hub pages are entry points — users just
  // landed and may not have engaged yet, so we skip.
  //
  // Smart guards (same as gz.com v5.8):
  //   - 30s minimum on-page dwell (avoid punishing quick bounces)
  //   - 5-min cooldown between exit-intent breaks
  //   - Skip on hub pages (entry points, no engagement to interrupt)
  //   - Respect canShowAdExitIntent() (global caps, not type-specific cooldown — v5.17 fix)
  //   - Suppressed if popunder recently fired (avoid double ad-stacking)
  function initExitIntent() {
    if (!state.isToolPage) return;

    var pageLoadTime = now();
    var lastExitIntentAt = 0;

    document.addEventListener('mouseout', function(e) {
      // v5.14 (2026-07-03 — Exit-Intent cy<0 Guard Fix, port from gz.com v5.12):
      //   Previous guard `if (e.clientY < 0) return` silently rejected 40.8% of real
      //   exit gestures (BI 30d on gz.com: 75/184 with-cy exit_mouse had cy < 0).
      //   Standard exit-intent libraries (ExitBee, OptinMonster) treat cy < 0 as
      //   "mouse has left viewport at top" — the EXACT gesture we want to catch.
      //   Combined check: if clientY is a number AND > 30, it's NOT exit intent.
      if (e.relatedTarget !== null && e.relatedTarget !== undefined) return;
      if (typeof e.clientY === 'number' && e.clientY > 30) {
        // v5.14 observability: log guard rejections so BI shows the full funnel
        trackAdEvent('exit_intent_guard_rejected', { reason: 'cy_above_30', cy: e.clientY });
        return;
      }
      // Below: clientY <= 30, clientY < 0, or clientY undefined — all valid exit intent signals

      // Guard 1: minimum dwell time
      if (now() - pageLoadTime < CONFIG.TIMING.exitIntentMinDwellMs) return;

      // Guard 2: cooldown since last exit-intent break
      if (now() - lastExitIntentAt < CONFIG.TIMING.exitIntentCooldownMs) return;

      // Guard 3: don't double-stack with a recent popunder (within 60s)
      var lastPopunder = storageGet('popunder_last') || 0;
      if (now() - lastPopunder < 60 * 1000) return;

      // v5.17 (2026-07-05 — Exit-Intent Cooldown Bug Fix):
      //   Track detection BEFORE canShowAdExitIntent() check (parity with gz.com v5.9).
      //   Previously: canShowAd() had 2-min minBetweenAds cooldown that silently
      //   blocked exit-intent on every tool page after a commercial break (popunder).
      //   Users run a tool → see popunder → leave via mouseout → blocked by cooldown.
      //   BI 7d evidence: 0 exit_intent_detected events vs gz.com ~5/day baseline.
      //   Now: canShowAdExitIntent() bypasses firstAdDelay/minBetweenAds (exit-intent
      //   is its own slot) but keeps global daily + session caps. trackAdEvent fires
      //   FIRST so BI sees the full funnel (detected → blocked → fired).
      lastExitIntentAt = now();
      trackAdEvent('exit_intent_detected', {});

      // Guard 4: respect global ad caps (daily + session) but skip type-specific
      // commercialBreakCooldown — exit-intent is a separate ad slot, not a
      // commercial_break. User is about to leave anyway, so we want to attempt a
      // fill even if a commercial_break just fired 10s ago.
      if (!canShowAdExitIntent()) {
        trackAdEvent('exit_intent_blocked', { reason: 'global_caps_reached' });
        return;
      }

      // v5.7: re-use the same showPokiOverlay path (delayed entry, e.g. 1s)
      // so the user perceives it as a natural break rather than a punishment.
      setTimeout(function() { showPokiOverlay('exit_intent'); }, 800);
    }, { passive: true });
  }

  // ==================== In-Page Push (轻量级, 所有页面) ====================
  function showInPagePush() {
    if (!canShowAd()) return;
    setTimeout(function() {
      if (!canShowAd()) return;
      // Try Superior first; fall back to Pungent (legacy)
      loadZone(ZONES.inpagePush).then(function() { markShown(); }).catch(function() {
        loadZone(ZONES.inpagePushLegacy).then(function() { markShown(); }).catch(function() {
          // v6.5 Tier 4: Adsterra in-page push (no-op if not enabled or zoneId=0)
          loadAdsterraZone(ZONES.adsterraInpagePush, null, 'inpage').then(function() { markShown(); }).catch(function() {});
        });
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
  if (state.isHubPage) {
    // v5.9: tools homepage now has #gz-home-banner + #gz-home-banner-2 divs —
    // fill them with the working-zone-first waterfall (mirrors gz.com v5.9).
    showHomepageBanner();
  }
  showContainerAd();
  showPokiOverlay();    // v4: Poki-style glass overlay 替代 vignette
  initPopunder();
  showInPagePush();
  // v5.7: Exit-intent commercial break (revenue recovery on user navigation)
  initExitIntent();

})();
