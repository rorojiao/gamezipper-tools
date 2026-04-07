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

# zh mirror translations for static HTML sections (rendered before JS/i18n loads)
ZH_STATIC = {
    'Popular tools with real traffic': '热门工具（真实流量）',
    'Start with the most useful online tools': '从最有用的在线工具开始',
    'Practical browser tools for developers, designers, creators, text editing, color workflows, image processing, CSS generation, quick converters, and lightweight utility tasks — all free and instant to use.': '为开发者、设计师、创作者提供的实用浏览器工具，涵盖文本编辑、配色工作流、图片处理、CSS生成、快速转换和轻量级实用工具——全部免费，即开即用。',
    'Format JSON, test regex, decode Base64 or JWT, generate hashes, and convert timestamps during real debugging work.': '格式化 JSON、测试正则、解码 Base64 或 JWT、生成哈希值、转换时间戳——真实调试工作中的得力助手。',
    'Pick colors, convert HEX/RGB/HSL, build palettes, generate shades, and check WCAG contrast for design systems.': '选取颜色、转换 HEX/RGB/HSL、构建调色板、生成色阶、检查设计系统的 WCAG 对比度。',
    'Compress images, crop or resize assets, extract colors, compare text, generate slugs, and handle markdown or handwriting effects.': '压缩图片、裁剪或调整图片尺寸、提取颜色、对比文本、生成 slug，处理 Markdown 或手写效果。',
    'Use QR generators, unit converters, social helpers, and small single-purpose tools without sign-up or installation friction.': '使用二维码生成器、单位转换器、社交助手和各种单一用途的小工具，无需注册或安装。',
    'FAQ': '常见问题',
    'What kinds of tools are on Tools.GameZipper?': 'Tools.GameZipper 上有哪些工具？',
    'You can find developer tools, text tools, color tools, CSS generators, image utilities, converters, social helpers, and lightweight browser tools for everyday workflows.': '包括开发者工具、文本工具、颜色工具、CSS 生成器、图片工具、转换器、社交助手以及日常工作中用得到的轻量级浏览器工具。',
    'Do these tools work without sign-up?': '这些工具需要注册吗？',
    'Yes. Most tools open instantly in the browser and are designed for quick single-task use without registration.': '不需要。大多数工具在浏览器中即时打开，为快速单一任务设计，无需注册。',
    'Recommended Games': '精选游戏',
    'Take a break and play free online games — no downloads, no signups.': '休息一下，玩点免费网络游戏——无需下载，无需注册。',
    'Browse all free games': '浏览全部免费游戏',
}

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
    # Replace static section texts with Chinese
    for en_str, zh_str in ZH_STATIC.items():
        html = html.replace(en_str, zh_str)
    html = html.replace('</head>', 
        '<link rel="alternate" hreflang="en" href="https://tools.gamezipper.com/">\n'
        '<link rel="alternate" hreflang="zh" href="https://tools.gamezipper.com/zh/">\n'
        '<link rel="alternate" hreflang="x-default" href="https://tools.gamezipper.com/">\n'
        '<script>localStorage.setItem("gz-lang","zh");</script>\n'
        '</head>')
    html = html.replace("localStorage.getItem('gz-lang')", '"zh"')
    with open(dst, 'w') as f:
        f.write(html)
    print("✅ index.html → zh/index.html")

# Count
total = sum(len([f for f in os.listdir(os.path.join(BASE, 'zh', d)) if f.endswith('.html')]) for d in DIRS if os.path.isdir(os.path.join(BASE, 'zh', d)))
total += 1 if os.path.exists(os.path.join(BASE, 'zh', 'index.html')) else 0
print(f"\n🎉 Total zh pages created: {total}")
