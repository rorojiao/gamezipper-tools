# 📈 Monetag 收益优化 — 2026-06-27 Session Report

## 诊断结论（30d 数据）

**gamezipper.com 30d**:
- AdSense fill rate: ~32% (1603 fills / 5000 script_loaded)
- Monetag zone 11012002 fill rate: 1.71% (88 fills / 5137 script_loaded)
- 总体 revenue OK, AdSense 是主力变现

**tools.gamezipper.com 30d (修复前)**:
- AdSense fill rate: **0%** (0 fills / 665 script_loaded)
- Monetag fill rate: **0%** (0 fills / 246 script_loaded)
- 总收入 **$0** — 这是最大优化机会

## 根因

1. **v5.4.3 mid slot 范围太窄**: adsense-auto.js 的 `injectMidContentSlots()` 只在 `index.html` (hub pages) 找 `#featured-traffic-tools` 和 `#tool-hub-faq` 元素 — 2/2915 页面 (0.07%)。子工具页面 (1435 个有 `.gz-related` div, 97%) 完全没有 mid slot。

2. **Monetag zone backoff 过激**: v5.4 zone backoff 30min/60min/24h — 一次失败就跳过 30 分钟。在 tools 高频访问（每个用户多次访问不同 tool）下，可能一整天都被 backoff。

3. **Monetag API token 死锁** (9 天): `/api/ads?period=30d` 返回 `token_dead_since: 2026-06-18T18:00:31`。本地 token 文件显示 token_updated=2026-06-26 (server-side 早已无效)。

## 实施的修复 (本次 session)

### ✅ v5.4.4 tools toolpage-fill (已 deploy 2026-06-27 07:10 CST)
- 改 `injectMidContentSlots()`: 新增 `{ before: '.gz-related', slotId: 'gz-tool-mid-slot' }` — 在 1435 个 tools 子页面的 related-tools section 前注入 lazy-loaded AdSense mid slot
- 改 anchor 查找逻辑支持 class selector (`#foo` / `.foo`)
- bump common.js cache to `?v=20260627444` (2913 HTML files + common.js + adsense-auto.js)
- 验证: real browser 渲染 `gz-tool-mid-slot` ins 在 `.gz-related` 之前
- 预期: tools AdSense fill rate 0% → ~5-10% (匹配 gamezipper.com baseline)

### ⏸️ 待处理 (本次未做)

- **Monetag API token 刷新** — 需要手动登录。Skill `monetag-debug` 明确说 Kachilu/Camoufox 自 2026-06-23 起无法自动化（reCAPTCHA 持续触发）。需用户手动登录 publishers.monetag.com + 更新 `/home/msdn/.openclaw/secrets/monetag.json`
- **Monetag zone backoff 调优** — 30min 第一次太激进，建议改为 10min + 缩窄 streak 阈值
- **Adsterra zone ID 配置** — adsterra-manager.js 仍是 placeholder (`YOUR_PUBLISHER_ID_HERE`)

## Commits (已 push to origin/main)
1. `ab5526af` feat(adsense): v5.4.4 tools toolpage-fill — inject mid-slot before .gz-related (1435 tool pages)
2. `d8094259` chore: bump common.js cache to v=20260627444 (deploy adsense-auto v5.4.4)

## 监控
- 24h 后检查 tools.gamezipper.com AdSense fill rate
- 如果 fill 仍然 0: 检查 AdSense 后台 tools.gamezipper.com 域名状态 + ads.txt
