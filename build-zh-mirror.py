#!/usr/bin/env python3.12
"""Create /zh/ mirror for dual-URL bilingual SEO."""
import os, re, shutil

BASE = '/home/msdn/gamezipper-tools'
DOMAIN = 'https://tools.gamezipper.com'
DIRS = ['text','dev','color','image','css-tools','convert','fortune','calc','seo','social','fun']

os.chdir(BASE)

def extract_zh_translations(html):
    """Extract zh: translation block from HTML."""
    m = re.search(r"zh:\s*\{([^}]+)\}", html)
    if not m:
        return {}
    block = m.group(1)
    result = {}
    for pair in re.findall(r"(\w+)\s*:\s*'([^']*)'", block):
        result[pair[0]] = pair[1]
    return result

def process_file(src, dst):
    """Process a single HTML file for zh mirror."""
    with open(src, 'r') as f:
        html = f.read()
    
    zh = extract_zh_translations(html)
    
    # Replace lang
    html = html.replace('<html lang="en">', '<html lang="zh">')
    
    # Replace title
    zh_title = zh.get('toolTitle', '')
    if zh_title:
        # Extract format from existing title
        old_title = re.search(r'<title>(.*?)</title>', html)
        if old_title:
            html = html.replace(old_title.group(0), f'<title>{zh_title} - 免费在线工具 | GameZipper 工具箱</title>')
    
    # Replace meta description
    zh_desc = zh.get('toolDesc', '')
    if zh_desc:
        html = re.sub(
            r'<meta\s+name="description"\s+content="[^"]*"',
            f'<meta name="description" content="{zh_desc}"',
            html
        )
    
    # Replace canonical
    rel_path = dst.replace(BASE, '')
    html = re.sub(
        r'<link\s+rel="canonical"\s+href="[^"]*"',
        f'<link rel="canonical" href="{DOMAIN}{rel_path}"',
        html
    )
    
    # Fix shared resource paths (../shared/ or ./shared/ → /shared/)
    html = re.sub(r'(src|href)=["\']\.\.\/shared\/', r'\1="/shared/', html)
    html = re.sub(r'(src|href)=["\']\.\/shared\/', r'\1="/shared/', html)
    
    # Replace/add hreflang
    en_path = src.replace(BASE, '')
    hreflang_block = (
        f'<link rel="alternate" hreflang="en" href="{DOMAIN}{en_path}">\n'
        f'<link rel="alternate" hreflang="zh" href="{DOMAIN}{rel_path}">\n'
        f'<link rel="alternate" hreflang="x-default" href="{DOMAIN}{en_path}">'
    )
    # Remove existing hreflang
    html = re.sub(r'<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>\n?', '', html)
    # Insert before </head>
    html = html.replace('</head>', hreflang_block + '\n</head>')
    
    # Inject zh language preference before i18n register
    # Add localStorage override to force zh
    inject = "<script>localStorage.setItem('gz-lang','zh');</script>"
    if inject not in html:
        html = html.replace('</head>', inject + '\n</head>')
    
    # Fix schema.org URL
    html = re.sub(
        r'"@id"\s*:\s*"' + re.escape(DOMAIN) + r'[^"]*"',
        f'"@id": "{DOMAIN}{rel_path}"',
        html
    )
    html = re.sub(
        r'"url"\s*:\s*"' + re.escape(DOMAIN) + r'[^"]*"',
        f'"url": "{DOMAIN}{rel_path}"',
        html
    )
    
    # Replace og:url
    html = re.sub(
        r'<meta\s+property="og:url"\s+content="[^"]*"',
        f'<meta property="og:url" content="{DOMAIN}{rel_path}"',
        html
    )
    
    # Replace zh title in og:title
    if zh_title:
        html = re.sub(
            r'<meta\s+property="og:title"\s+content="[^"]*"',
            f'<meta property="og:title" content="{zh_title}"',
            html
        )
        html = re.sub(
            r'<meta\s+name="twitter:title"\s+content="[^"]*"',
            f'<meta name="twitter:title" content="{zh_title}"',
            html
        )
    if zh_desc:
        html = re.sub(
            r'<meta\s+property="og:description"\s+content="[^"]*"',
            f'<meta property="og:description" content="{zh_desc}"',
            html
        )
        html = re.sub(
            r'<meta\s+name="twitter:description"\s+content="[^"]*"',
            f'<meta name="twitter:description" content="{zh_desc}"',
            html
        )
    
    with open(dst, 'w') as f:
        f.write(html)

# Copy and process
for d in DIRS:
    src_dir = os.path.join(BASE, d)
    dst_dir = os.path.join(BASE, 'zh', d)
    if not os.path.isdir(src_dir):
        continue
    os.makedirs(dst_dir, exist_ok=True)
    for fname in os.listdir(src_dir):
        if not fname.endswith('.html'):
            continue
        src = os.path.join(src_dir, fname)
        dst = os.path.join(dst_dir, fname)
        try:
            process_file(src, dst)
        except Exception as e:
            print(f"ERROR {src}: {e}")
    print(f"✅ {d}/ → zh/{d}/ ({len([f for f in os.listdir(src_dir) if f.endswith('.html')])} files)")

# Process index.html
src = os.path.join(BASE, 'index.html')
dst = os.path.join(BASE, 'zh', 'index.html')
if os.path.exists(src):
    with open(src) as f:
        html = f.read()
    html = html.replace('<html lang="en">', '<html lang="zh">')
    html = html.replace('GameZipper Tools', 'GameZipper 工具箱')
    html = re.sub(r'<title>.*?</title>', '<title>免费在线工具集合 | GameZipper 工具箱</title>', html)
    html = html.replace('</head>', 
        '<link rel="alternate" hreflang="en" href="https://tools.gamezipper.com/">\n'
        '<link rel="alternate" hreflang="zh" href="https://tools.gamezipper.com/zh/">\n'
        '<link rel="alternate" hreflang="x-default" href="https://tools.gamezipper.com/">\n'
        '<script>localStorage.setItem("gz-lang","zh");</script>\n'
        '</head>')
    html = html.replace('localStorage.getItem(\'gz-lang\')', '"zh"')
    with open(dst, 'w') as f:
        f.write(html)
    print("✅ index.html → zh/index.html")

# Count
total = sum(len([f for f in os.listdir(os.path.join(BASE, 'zh', d)) if f.endswith('.html')]) for d in DIRS if os.path.isdir(os.path.join(BASE, 'zh', d)))
total += 1 if os.path.exists(os.path.join(BASE, 'zh', 'index.html')) else 0
print(f"\n🎉 Total zh pages created: {total}")
