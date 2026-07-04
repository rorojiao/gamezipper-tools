# Monetag 24h Verify Report — 2026-07-05 — v5.16 P0 fix FAILED

## TL;DR — Verdict: ❌ Targets NOT met. Regression detected.

v5.16 P0 fix (commit c0bc06e57, 2026-07-04 12:28 CST) deployed 12.7h ago.
**gz-tools-ad-below fill rate REGRESSED 4.3% → 0.0%** (0 fills / 7 no_fills).
Pre-deploy 7d: 2 fills / 37 no_fills = 4.3%. Post-deploy 12.7h: 0/7 = 0%.
Expected post-fix (per c0bc06e57 report): 30-60%. **Actual: 0%.**

## Acceptance Criteria Status

| # | Criterion | Result | Detail |
|---|---|---|---|
| 1 | gz-tools-ad-below fill 4.3% → 30%+ | ❌ FAIL | 0/7 = 0% (regression -4.3pp) |
| 2 | wasted AdSense requests <5/7d | ❌ FAIL | 7/12.7h → ~37/7d (target was 0) |
| 3 | `container_ad_skip_hub_has_banner` > 0 | ❌ FAIL | 0 events (code deployed, BI ingest likely broken) |
| 4 | No JS console errors | ⚠️ n/a | live page structure OK; cannot remote-check console |
| 5 | `/tmp/hermes-verify-monetag-v516.py` all 19 PASS | ✅ PASS | All structural/deployment checks pass |

## What worked (v5.16 fix DID land)

### Fix #1 — DOM position (common.js renderFooter) ✅ APPLIED
- Live browser verify: `gz-tools-ad-below` div now sits as **immediate previous sibling of `<main>`** (height 90px, parent=BODY, prevSibling=MAIN#main-content). NOT under footer.
- structural integrity confirmed by browser DOM inspection of / 

### Fix #2 — auto-inject fallback (.gz-container) ✅ APPLIED
- 2 `container_div_auto_injected` events post-deploy (vs 0 pre-deploy)
- Selector chain `main, .gz-container, .gz-tool-container, main article, .gz-main, article` correctly matches tools pages

### Fix #3 — hub-skip (showContainerAd isHubPage check) ✅ CODE APPLIED
- 1050-line check `if (state.isHubPage && hasHomeBanner)` present in monetag-manager.js
- BUT: 0 skip events recorded in BI
- Possible cause: gz-analytics.js EP dead (see below)

## Root Cause of Regression

**Three findings, in priority order:**

### 1. 🚨 CRITICAL — gz-analytics.js EP `emma-somehow-fan-them.trycloudflare.com` is DEAD
- `curl` test 2026-07-05 01:15: returns HTML error page (Cloudflare "no such page")
- Was the active EP at v5.16 fix deploy time (c0bc06e57, 7-04 12:28)
- watchdog later rotated to `api.trycloudflare.com` (d5cfa8615, ~7-04 17:09) and most recent `cornwall-bigger-charges-sought.trycloudflare.com` (f53cb3408, 7-05 01:15) — both alive
- **Impact: all browser-side BI events (trackAdEvent / sendBeacon) for ~12h failed silently**. The 5 `adsense_container_ad_no_fill` events on / came from a vid (dc1c7d60) that hit / via a cached old version of gz-analytics.js pointing to a live EP at the time (per-event rotation), OR the events are stale data from before EP died.
- **This breaks ALL BI observability for tools.gamezipper.com since ~7-04 17:00**. Cannot trust BI numbers until EP fix + cache flush is verified.

### 2. AdSense slot 1099212472 has zero inventory on tools subdomain
- Even when gz-home-banner (same slot) gets fills (e.g. 12:33:57, 18:34:28), gz-tools-ad-below never fills
- Same AdSense publisher, same slot ID, same script — but tools subdomain never gets the impression into the auction
- Most likely: AdSense account ca-pub-8346383990981353 is not configured to serve tools.gamezipper.com in the AdSense UI. Need to verify in AdSense console → Sites → tools.gamezipper.com is "Ready" status.
- **Without AdSense authorization, no DOM position / selector / hub-skip fix will help**

### 3. `gz-home-banner` and `gz-home-banner-2` both use slot 1099212472 → only one fills
- Live / has BOTH divs, both with `data-ad-slot="1099212472"`
- AdSense only fills ONE per page, the other gets `adsense_homepage_banner_no_fill`
- This means ~1 fill/request on / page is wasted (50% waste)
- **Should switch gz-home-banner-2 to a different slot ID (7373732357 from gz.com) or use AdSense Auto Ads for it**

## Data — Pre vs Post Deploy (12.7h snapshot)

### gz-tools-ad-below container
| Window | Fills | No-fills | Auto-injected | Rate |
|---|---|---|---|---|
| Pre (7-27 ~ 7-04 12:28, 7.5d) | 2 | 37 | 43 | 4.3% |
| Post (7-04 12:28 ~ 7-05 01:11, 12.7h) | 0 | 7 | 2 | **0.0%** |
| **Delta** | **-2** | **-30** | **-41** | **-4.3pp** |

### Hub page (/) — homepage_banner fill rate
| Window | homepage_banner_fill | adsense_homepage_banner_no_fill | Rate |
|---|---|---|---|
| Pre (7d) | 22 | 2 | 91.7% |
| Post (12.7h) | 5 | 1 | 83.3% |
| 7d projected | 5*13.2=66 | 1*13.2=13 | 83.5% (slight regression) |

### Hub page (/) wasted AdSense
| Window | adsense_container_ad_no_fill | Projected to 7d |
|---|---|---|
| Pre (7d) | 16 | 16 |
| Post (12.7h) | 5 | ~37 |

## Iteration Plan

### 🚨 P0 Immediate (next 30 min)
1. **Force CDN cache flush of gz-analytics.js** to pick up latest EP `cornwall-bigger-charges-sought.trycloudflare.com`
   - Use cloudflare-cache-busting skill to ensure all HTML files point to latest cache version AND CDN is purged
   - Add a watchdog rule: don't bump cache version without flushing CDN
2. **Verify BI ingest works** — hit / from a real browser, confirm events arrive in BI
3. **Check AdSense console for tools.gamezipper.com site status** — manual or via API (oauth needed, separate task t_cd22f8ed)

### P1 Next 24h (this task)
1. **Switch gz-home-banner-2 slot from 1099212472 to 7373732357** (or remove gz-home-banner-2 entirely on / — only 1 banner needed on hub)
2. **Iterate on gz-tool-mid-slot**: replace `data-ad-slot="auto"` (invalid) with 1099212472 or 7373732357 — should give 0% → 5-10% on tool sub-pages
3. **Monetag zones 11012010/11012011 on tools**: dead zone, remove from waterfall OR get Monetag auth (separate work, requires 老公 manual)
4. **Re-verify in 24h**: all 5 acceptance criteria must pass before declaring fix done

### P2 Background
- Establish stable BI endpoint that doesn't require trycloudflare.com URL rotation
- Set up AdSense Auto Ads for tools subdomain (alternative to manual slot management)
- Audit gz-mid-slot-1 (used `data-ad-slot="auto"` — invalid, 0% fill inevitable)

## Open P0 Blockers (unchanged from 7-04 report)

- Monetag publisher API token (c1b3db...2e) dead 25+ days — manual reCAPTCHA login required
- GSC OAuth token missing 31+ days (task t_cd22f8ed)
- **NEW**: gz-analytics.js EP rotation cadence too aggressive — causes 12h BI blackout when Cloudflare cache lag meets domain expiry. Need stable permanent endpoint.
