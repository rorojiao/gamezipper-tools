#!/usr/bin/env python3
"""Build sitemap.xml from all HTML files (R637c fix).

Includes:
- Root files (css-cheat-sheet.html, markdown-viewer.html, etc.) → priority 0.8
- All subdirectory HTML files (text/, dev/, color/, image/, css/, css-tools/,
  convert/, fortune/, calc/, seo/, social/, fun/, network/) → priority 0.8
- zh/ mirror for each subdirectory file (priority 0.6) IF zh/<file> exists
- 404.html EXCLUDED (it's a system error page)
- index.html in subdirs EXCLUDED (would be duplicates of category pages)
- Top-level index.html INCLUDED (priority 1.0)

Lastmod: today (build date)
"""
import os, glob
from datetime import date

DOMAIN = 'https://tools.gamezipper.com'
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
today = date.today().isoformat()

DIRS = ['text','dev','color','image','css','css-tools','convert',
        'fortune','calc','seo','social','fun','network']

urls = []

# 1. Top-level index.html (priority 1.0)
if os.path.exists('index.html'):
    urls.append(('/index.html', '1.0', 'weekly', today))

# 2. Root-level non-index HTML files (priority 0.8)
for f in sorted(glob.glob('*.html')):
    base = os.path.basename(f)
    if base == 'index.html' or base == '404.html':
        continue
    # Skip AdSense site-verification files (googleaf*.html)
    if base.startswith('google'):
        continue
    # Skip sitemap.xml, README, etc. - only HTML goes here
    rel = f'/{base}'
    urls.append((rel, '0.8', 'monthly', today))

# 3. All subdirectory HTML files (priority 0.8) + zh/ mirror (priority 0.6)
for d in DIRS:
    if not os.path.isdir(d):
        continue
    for f in sorted(glob.glob(f'{d}/*.html')):
        base = os.path.basename(f)
        if base == 'index.html':
            continue
        rel = f'/{f}'
        urls.append((rel, '0.8', 'monthly', today))
        # zh mirror if exists
        zh_rel = f'/zh/{f}'
        if os.path.exists(f'zh/{f}'):
            urls.append((zh_rel, '0.6', 'monthly', today))

# Write sitemap
with open('sitemap.xml', 'w') as out:
    out.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    out.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n')
    for url, prio, freq, lm in urls:
        out.write('  <url>\n')
        out.write(f'    <loc>{DOMAIN}{url}</loc>\n')
        out.write(f'    <lastmod>{lm}</lastmod>\n')
        out.write(f'    <changefreq>{freq}</changefreq>\n')
        out.write(f'    <priority>{prio}</priority>\n')
        out.write('  </url>\n')
    out.write('</urlset>\n')

print(f'OK sitemap.xml updated: {len(urls)} URLs (was 4780)')

# Sanity check
from collections import Counter
cats = Counter()
for u, p, f, lm in urls:
    parts = u.strip('/').split('/')
    if len(parts) == 1:
        cats['_root'] += 1
    elif parts[0] == 'zh':
        cats[f'zh/{parts[1]}'] += 1
    else:
        cats[parts[0]] += 1
print('By category:')
for c, n in sorted(cats.items(), key=lambda x: -x[1]):
    print(f'  {c}: {n}')
