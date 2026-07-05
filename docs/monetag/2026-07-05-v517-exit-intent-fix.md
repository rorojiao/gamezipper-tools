# Monetag v5.17 — Tools Exit-Intent Cooldown Bug Fix

**Date:** 2026-07-05
**Author:** kanban t_a2cf7c6e (ops-gamezipper)
**Status:** DEPLOYED, awaiting 12h verify
**Commits:** `1c6daf0b9` (v5.17 fix) + `d49a837c6` (CDN cache bust via new file path)

## Problem Statement

**tools.gamezipper.com** had **0 exit_intent_detected events in 7 days**, vs gz.com baseline of 1-13/day (most recent: 7-04 = 3, 7-03 = 13, 7-02 = 1).

### Root Cause

`initExitIntent()` Guard 3 in `monetag-manager.js` was calling `canShowAd()` instead of `canShowAdExitIntent()`. The difference:

- `canShowAd()` — has 2-min `minBetweenAds` cooldown (designed for regular ad slots)
- `canShowAdExitIntent()` — bypasses type-specific cooldowns, keeps only global daily + session caps

Tools users run a tool → see a commercial break (popunder) → leave via mouseout. The mouseout triggers exit-intent, but the regular ad cooldown (2-min from the just-fired popunder) blocked it. Result: exit-intent silently failed for the most common exit pattern.

The function comment even claimed "Mirrors gamezipper.com v5.9's canShowAdExitIntent() implementation" — but the actual code didn't match the comment.

### Parity with gz.com

gz.com v5.9 (2026-06-24) already had the correct pattern. Tools v5.8+ claimed parity in comments but the implementation diverged.

## Fix

### v5.17 Changes

1. **Guard 3 fix**: `canShowAd()` → `canShowAdExitIntent()` (parity with gz.com v5.9)
2. **Observability fix**: `trackAdEvent('exit_intent_detected')` moved BEFORE the cap check (parity with gz.com v5.9) — BI now sees the full funnel: detected → blocked → fired
3. **Header documentation**: Updated Smart Guards comment to reflect new behavior

### Files Modified

- `monetag-manager.js` — v5.16 → v5.17 (Guard 3 swap + observability fix + version bump)
- `shared/common.js` — script src bump + cache version
- `monetag-manager.v517.js` — NEW file (duplicate with new path) for CDN cache bust
- 3650 HTML files — `common.js?v=` cache version bump

### Deployment

Two commits pushed:
1. `1c6daf0b9` — Initial v5.17 fix (monetag-manager.js + shared/common.js + 3650 HTML)
2. `d49a837c6` — CDN cache bust (duplicate file to `monetag-manager.v517.js` because `cache-control: max-age=14400` kept edge serving stale v5.16)

### CDN Deployment Verification

Direct hit on new path `https://tools.gamezipper.com/monetag-manager.v517.js`:
- Size: 86678 bytes (matches local v5.17)
- Header: `v5.17-exit-intent-cooldown-fix`
- Guard 3 area: `canShowAdExitIntent()` call present, `canShowAd()` call removed

## Acceptance Criteria (12h verification target)

| Event | Pre-fix (7d) | Target (post-fix) |
|---|---|---|
| `exit_intent_detected` | 0 (tools) | 5+ (gz.com baseline) |
| `exit_intent_blocked` | 0 (tools) | 1+ (observable global-cap blocks) |
| `exit_intent_fill` | 0 (tools) | 1+ (actual fills) |
| `exit_intent_guard_rejected` | 0 (tools) | 5+ (visible funnel) |

gz.com produces ~5 exit_intent_detected/day with similar mouseout volume. Expecting 2-8/day on tools given lower traffic (1038/hr gz.com vs tools' 1038/hr equivalent).

## Related Background

- v5.16 P0 (2026-07-05 morning): `gz-tools-ad-below` DOM position fix. Result today: 33.3% fill rate (target 30%+ ✅)
- v5.15 (2026-07-04): Container AdSense slot swap 7373732357 → 1099212472. Tools slot 1099212472 today: 38.5% fill rate.
- Overall tools fill rate today: 39.3% (11 fills / 17 no-fills)

## Side Discovery

Tools has 106 pageviews in last hour but only 0 `exit_mouse` events (vs gz.com with 103 PVs and 3 exit_mouse). Tools users navigate primarily via clicks (to other tools), not mouse-to-top gestures. This means exit-intent fix will likely yield lower absolute fills than gz.com, but each fill is valuable (no current monetization on tools exit-intent path).

## Files

- Fix: `monetag-manager.js` (lines 1465, 1486-1510)
- Duplicate: `monetag-manager.v517.js` (CDN cache bust)
- Common: `shared/common.js` (script src bump)
- This report: `docs/monetag/2026-07-05-v517-exit-intent-fix.md`

## Pending P0 (separate work)

- Monetag API token (c1b3db...2e) dead 25+ days — manual reCAPTCHA login by 老公 to refresh
- GSC OAuth missing 31+ days (task t_cd22f8ed)
- AdSense subdomain authorization for tools.gamezipper.com (deeper blocker — manual action by 老公)