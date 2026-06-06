#!/usr/bin/env python3.12
"""Build sitemap.xml from all HTML files."""
import os, re, glob
from datetime import date

BASE = '/home/msdn/gamezipper-tools'
DOMAIN = 'https://tools.gamezipper.com'
DIRS = ['text','dev','color','image','css-tools','convert','fortune','calc','seo','social','fun']

os.chdir(BASE)
today = date.today().isoformat()

urls = []
# Index
urls.append(('/index.html', '1.0', 'weekly', today))
# Category pages
for d in DIRS:
    for f in sorted(glob.glob(f'{d}/*.html')):
        if 'index.html' in f: continue
        rel = f'/{f}'
        urls.append((rel, '0.8', 'monthly', today))
        # zh mirror
        zh_rel = f'/zh/{f}'
        if os.path.exists(f'zh/{f}'):
            urls.append((zh_rel, '0.6', 'monthly', today))

with open('sitemap.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n')
    for url, prio, freq, lm in urls:
        f.write('  <url>\n')
        f.write(f'    <loc>{DOMAIN}{url}</loc>\n')
        f.write(f'    <lastmod>{lm}</lastmod>\n')
        f.write(f'    <changefreq>{freq}</changefreq>\n')
        f.write(f'    <priority>{prio}</priority>\n')
        f.write('  </url>\n')
    f.write('</urlset>\n')

print(f'✅ sitemap.xml updated: {len(urls)} URLs')
