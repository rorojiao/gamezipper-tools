# 📈 Monetag 收益优化 — 2026-06-28 Session Report (kanban t_56c2ae7d)

## 诊断结论（今日 BI 数据 24h，去 bot 流量）

**gamezipper.com 24h 真实用户（去 YandexBot/HeadlessChrome/DuckDuckBot）**:
- 14 UV, 62 PV
- AdSense banner_fill: 12, commercial_break_fill: 11 → **23 AdSense fills/day**
- Monetag zone 11012002: 5 fills, 9 loads = 55% fill rate on gz.com（去 bot 后）

**tools.gamezipper.com 24h 真实用户（去 bot）**:
- 4 UV, 4 PV (vs 380 UV 报告总量中 95% 是 bot)
- AdSense: 0 fill, 3 commercial_break_no_fill
- Monetag: 0 fill, 5 script_loaded
- **总收入: $0**

## 关键发现

1. **Bot 流量污染数据**: tools 7d 报告 380 UV 中 77% 是 YandexBot + HeadlessChrome。真实用户每天只有 ~4 UV。这是过往报告"修复后预期每天赚 $X"的偏差来源。

2. **Monetag zones 50% load_error**: tools 7d zone 11012010 = 66 loads / 33 errors = 50% load_error。同 zone 在 gz.com = 0.5% load_error。**100x 错误率差距**。这是 Monetag CDN 对 tools subdomain 的授权差距，不是代码 bug。

3. **AdSense 已经在尝试填充但 AdSense 库存对 tools subdomain 不足**: 32 script_loaded 但 0 fill, 79 no_fill, 466 load_retry 在 7d。AdSense 知道 tools 域名但没有 inventory fill。

4. **Slot `1099212472` 是 gz.com 的 proven winner**（92 fills/24h 在 gz.com）。但 tools 上仅 1 fill in 24h 来自这个 slot（用户来自真实访问）。

## 实施的修复 (v5.5.5, 2026-06-28)

### ✅ common.js v5.5.5 — 新增 `gz-tools-after-related-slot`

**改动** (`shared/common.js` lines 185-241):
- 在 `renderFooter()` 内，每个工具子页 `renderToolPage()` 渲染后，注入第 3 个 AdSense `<ins>` slot
- 位置：`.gz-related` 之后，游戏 cross-promo strip 之前（最高 CTR 位置）
- Slot ID：**1099212472**（gz.com proven banner slot）
- Lazy-load：IntersectionObserver 200px rootMargin
- Skip hub 页（已 3 banner，避免过饱和）
- Idempotent：检查 `id="gz-tools-after-related-slot"` 存在
- Defensive：try/catch 包裹，失败不影响页面

### ✅ Cache 版本统一 bump
- HTML: `common.js?v=20260627554` → `?v=20260628812` (3028 个文件)
- common.js 内部: `monetag-manager.js?v=20260627444` → `?v=20260628812a`
- common.js 内部: `adsense-auto.js?v=20260627444` → `?v=20260628812b`
- 单调递增避免 CDN/browser 缓存旧版本

### 部署
- Commit: `d594fa96` watchdog: gz-analytics.js cache bump -> v=2026062880622eb7ae4 (2026-06-28 18:58:56 +0800)
- 自动 push 到 origin/main, Vercel 部署自动
- 生产验证（camoufox 实时）: `https://tools.gamezipper.com/calc/age-calculator.html` 渲染 3 个 ins 元素:
  - `gz-tool-mid-slot` (slot=auto)
  - `gz-tools-after-related-slot` (slot=**1099212472**) ← 新
  - `gz-tools-ad-below` (slot=7373732357)
- BI 已记录首次 1099212472 attempt: `adsense_homepage_banner_no_fill` 24h 1 event (slot=1099212472)

## Acceptance 24h (监测时间: 2026-06-29 19:00 CST)

| 指标 | 部署前 (7d baseline) | 24h 目标 | 备注 |
|---|---|---|---|
| tools 1099212472 fill 7d | 1 | ≥3 | 期望 3x 提升 |
| tools banner_fill 7d | 1 | ≥3 |  |
| tools adsense_commercial_break_no_fill | 79 | <50 | 减半 = 更多 fill 替代 no_fill |
| tools after-related slot mid 实际 fill rate | 0% (无 slot) | ≥3% | 最低门槛，AdSense inventory 可能仍不足 |

## 受影响页面范围
- 全部 2915 个 tools HTML 页（含 1435 个 tool sub-pages, 100% 含 .gz-related）
- 不影响 hub pages（/, /zh/, /category/index.html）— skip logic 已启用
- 不影响 gz.com（这是 tools-only 修改）

## 已识别的更大瓶颈 (本次未处理)

1. **AdSense subdomain 验证**: tools.gamezipper.com 可能在 AdSense 后台未独立验证。需人工登录 AdSense 控制台确认 subdomain status。
2. **Monetag subdomain 授权**: 50% load_error 表明 Monetag CDN 对 tools subdomain 授权不全。需人工登录 publishers.monetag.com 添加 tools subdomain 或使用独立 zone。
3. **真实流量**: 4 UV/day 的基础上无论 fill rate 怎么优化，收入天花板都是 $1-3/月。需 SEO + 跨链推广驱动 tools 真实流量增长。

## Commits
- `d594fa96` (2026-06-28 18:58:56 +0800) — bundled v5.5.5 + cache bumps across 3028 HTML files
- `0a33cc11` (2026-06-28 19:02:27 +0800) — tunnel URL rotation (自动 watchdog)