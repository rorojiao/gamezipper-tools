#!/usr/bin/env python3
"""R435: repair zh-mirror corruption — build-zh-mirror.py's global
replace('</head>', block) injected the hreflang+localStorage block INSIDE
JS string literals (any tool desc containing literal '</head>'), and the
inner </script> terminated the outer inline <script> early.

Fix: remove every injected block that appears AFTER <body (the legit one
sits in <head>). Restore the original '</head>' text inside the string.
Idempotent: --check reports, --apply writes.
"""
import os, re, sys

ROOT = '/home/msdn/gamezipper-tools'
APPLY = '--apply' in sys.argv

# The exact injected block (hreflang x3 + localStorage script), as emitted by
# build-zh-mirror.py. Match with flexible whitespace/quotes.
INJECT_RE = re.compile(
    r'<link rel="alternate" hreflang="en" href="https://tools\.gamezipper\.com/[^"]*">\s*\n?'
    r'<link rel="alternate" hreflang="zh" href="https://tools\.gamezipper\.com/zh/[^"]*">\s*\n?'
    r'<link rel="alternate" hreflang="x-default" href="https://tools\.gamezipper\.com/[^"]*">\s*\n?'
    r'<script>localStorage\.setItem\((?:"gz-lang","zh"|\'gz-lang\',\'zh\')\);</script>\s*\n?'
    r'</head>'
)
# variant without the localStorage script (hreflang-only injection)
INJECT_RE2 = re.compile(
    r'<link rel="alternate" hreflang="en" href="https://tools\.gamezipper\.com/[^"]*">\s*\n?'
    r'<link rel="alternate" hreflang="zh" href="https://tools\.gamezipper\.com/zh/[^"]*">\s*\n?'
    r'<link rel="alternate" hreflang="x-default" href="https://tools\.gamezipper\.com/[^"]*">\s*\n?'
    r'</head>'
)

fixed = 0
for dp, dn, fn in os.walk(ROOT):
    if '/.git' in dp: continue
    if not dp.endswith('/zh') and '/zh/' not in dp + '/': continue
    for f in fn:
        if not f.endswith('.html'): continue
        p = os.path.join(dp, f)
        html = open(p, encoding='utf-8').read()
        body = html.find('<body')
        if body < 0: continue
        head, rest = html[:body], html[body:]
        n1 = len(INJECT_RE.findall(rest))
        if n1:
            new_rest = INJECT_RE.sub('</head>', rest)
        else:
            n1 = len(INJECT_RE2.findall(rest))
            new_rest = INJECT_RE2.sub('</head>', rest) if n1 else rest
        if n1:
            print(f"FIX {p}: removed {n1} injected block(s) inside body/script")
            if APPLY:
                open(p, 'w', encoding='utf-8').write(head + new_rest)
            fixed += 1
print('files fixed:', fixed, '(apply)' if APPLY else '(check only)')
