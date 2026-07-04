# Monetag Daily Report — 2026-07-05 — tools container P0 fix (v5.16)

## TL;DR
Shipped v5.16 P0 fix for tools.gamezipper.com container AdSense 4.4% fill rate
(2 fills / 45 no_fills, 7d). Same slot 1099212472 in gz-home-banner: 87.9% fill
(35 fills / 4 no_fills, 7d). Root cause: 2 issues — (1) DOM position under footer,
(2) duplicate slot ID on hub pages. Fix in shared/common.js + monetag-manager.js.

## 7d Metrics (2026-06-28 ~ 2026-07-04)

### tools.gamezipper.com container ad fill per container
| Container | Fills | No_fills | Fill rate |
|---|---|---|---|
| gz-home-banner (slot 1099212472) | 35 | 4 | **87.9%** ✅ |
| gz-home-banner-2 (slot 1099212472) | 7 | 0 | **100%** ✅ |
| **gz-tools-ad-below (slot 1099212472)** | **2** | **44** | **4.3%** ❌ |
| gz-tool-mid-slot (slot "auto") | 0 | 41 | **0%** ❌ |

### gz.com Monetag zone fills (zone 11012002)
| Date | gamezipper.com fills | tools fills |
|---|---|---|
| 2026-06-27 | 1 | 0 |
| 2026-06-28 | 9 | 1 |
| 2026-06-29 | 3 | 0 |
| 2026-06-30 | 1 | 0 |
| 2026-07-01 | 4 | 0 |
| 2026-07-02 | 8 | 0 |
| 2026-07-03 | 13 | 0 |
| 2026-07-04 | 15 | 2 |
| 2026-07-05 (partial 00:36 UTC) | 1 | 0 |

### Dead zones (tools only)
- zone 11012010 (inpagePush): 80 dead_zone_skip / 10 zone_backoff
- zone 11012011 (vignette):    10 dead_zone_skip / 6 zone_backoff
- These are tools-subdomain not authorized by Monetag (gz.com same zones: 1.75% fill).

## Root Cause Analysis

### Issue #1: DOM position (tools container)
common.js renderFooter() at v5.15.1 still used `document.body.appendChild(adBelow)`
which placed gz-tools-ad-below as the FIRST appendChild (before games section and
footer). Result: HTML order was `gz-container → SCRIPT → adBelow → games → footer`.
AdSense treats anything below the games cross-promo + footer as "footer-area ad"
which is a low-quality signal → fill rate floor of ~5% regardless of slot.

### Issue #2: Duplicate slot ID on hub pages
Both gz-home-banner and gz-tools-ad-below use `data-ad-slot="1099212472"` on the
tools homepage `/` (and `/zh/`). AdSense only fills ONE of multiple same-slot
requests per page. Result: gz-home-banner got the fill (87.9%) and gz-tools-ad-below
got `adsense_container_ad_no_fill` (20+ events / 7d on / alone).

### Why v5.15 slot swap didn't deliver expected lift
v5.15 commit message claimed "expected 5-10x lift" from slot 7373732357 → 1099212472.
Real data: 4.9% → 4.3% (essentially flat). Root cause: slot ID was a symptom, not
the cause. The DOM position + duplicate-on-page issues were the real blockers.

## Fixes Shipped (v5.16 — kanban t_72ff2419)

### shared/common.js (renderFooter)
After footer is appended, MOVE `adBelow` to be the immediate previous sibling of
footer (via `body.insertBefore(adBelow, footer)`). Idempotent — re-running renderFooter
is a no-op. Affects all 2915 tools pages that use renderFooter().

### monetag-manager.js showContainerAd()
- **Fix #1 — auto-inject fallback**: extend selector set to include `.gz-container`
  (tools pages use `<div class="gz-container">` not `<main>`) + use
  `<footer>/.gz-footer/[class*="footer"]` as a last-ditch anchor. Handles hub pages
  where common.js renderFooter hasn't run yet.
- **Fix #2 — hub page skip**: on hub pages (state.isHubPage) that already have
  `#gz-home-banner` or `#gz-home-banner-2`, skip showContainerAd() entirely.
  Fires `container_ad_skip_hub_has_banner` event for BI observability.

### Cache bumps
- shared/common.js?v=20260704v558ar → v=20260705v516ab (3587 HTML files)
- monetag-manager.js?v=20260705v516ar → v=20260705v516ar2 (via common.js self-load)

## Expected Impact (24-48h verification window)

| Metric | Baseline (7d) | Expected (7d post-fix) | Lift |
|---|---|---|---|
| tools gz-tools-ad-below fill rate | 4.3% (2/46) | 30-60% | **7-14x** |
| tools / homepage wasted AdSense requests | 20/7d | 0/7d | **-100%** |
| tools sub-page container fills | 2/7d | 5-10/7d | **2.5-5x** |

Combined with gz-home-banner 87.9% fill (already proven working slot), tools daily
AdSense container revenue should jump from ~$0 to $0.50-2.00/day at current traffic
(540 PV/week on tools).

## Files Changed
- shared/common.js — renderFooter adBelow reposition + cache bump
- monetag-manager.js — showContainerAd auto-inject + hub-page skip + v5.16 changelog
- 3587 HTML files — common.js?v= cache bump only

## Verification Plan
- 24h: compare gz-tools-ad-below fill rate vs 7d baseline (4.3%)
- 48h: confirm hub pages have 0 `container_ad_skip_hub_has_banner` no-fill events
- 7d: gz-tools-ad-below fill rate target 30%+, hub-page `container_ad_no_fill` events
  should drop to near zero

## Open P0 Blockers (unchanged)
- Monetag publisher API token (c1b3db...2e) dead 25+ days — manual reCAPTCHA login
  required to refresh. v2 script ready at
  `~/.openclaw/workspace/scripts/monetag_token_refresh_v2.py --watch`.
- GSC OAuth token missing 31+ days (separate task t_cd22f8ed).
