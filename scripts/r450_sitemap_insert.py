#!/usr/bin/env python3
"""R450: insert 6 new URLs (3 tools x en+zh) into sitemap.xml in alphabetical position."""
import re, pathlib

p = pathlib.Path('sitemap.xml')
src = p.read_text(encoding='utf-8')

NEW = [
 ('https://tools.gamezipper.com/calc/long-division-calculator.html', '0.8'),
 ('https://tools.gamezipper.com/zh/calc/long-division-calculator.html', '0.6'),
 ('https://tools.gamezipper.com/calc/rounding-calculator.html', '0.8'),
 ('https://tools.gamezipper.com/zh/calc/rounding-calculator.html', '0.6'),
 ('https://tools.gamezipper.com/calc/poisson-distribution-calculator.html', '0.8'),
 ('https://tools.gamezipper.com/zh/calc/poisson-distribution-calculator.html', '0.6'),
]

for url in [u for u,_ in NEW]:
    if url in src:
        print('already present:', url); continue

def entry(url, prio):
    return ('  <url>\n    <loc>%s</loc>\n    <lastmod>2026-11-28</lastmod>\n'
            '    <changefreq>monthly</changefreq>\n    <priority>%s</priority>\n  </url>\n' % (url, prio))

# insert each new entry just before the first existing URL that sorts after it
out = src
for url, prio in NEW:
    blocks = list(re.finditer(r'  <url>.*?</url>\n', out, re.S))
    pos = None
    for m in blocks:
        bu = re.search(r'<loc>(.*?)</loc>', m.group(0)).group(1)
        if bu > url:
            pos = m.start(); break
    if pos is None:
        pos = out.rindex('</urlset>')
    out = out[:pos] + entry(url, prio) + out[pos:]
p.write_text(out, encoding='utf-8')
print('total urls:', out.count('<loc>'))
