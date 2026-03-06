#!/usr/bin/env python3
"""SEO/GEO batch update script for gamezipper-tools"""
import re, os

BASE = "/home/msdn/gamezipper-tools"
BASE_URL = "https://tools.gamezipper.com"

# Tool definitions: (relative_path, tool_name, description, url_path)
TOOLS = [
    # Text Tools
    ("text/case-converter.html", "Text Case Converter", "Convert text to uppercase, lowercase, title case, camelCase, snake_case and more. Free online case converter tool, no signup required.", "/text/case-converter.html"),
    ("text/letter-counter.html", "Letter & Word Counter", "Count characters, words, sentences and paragraphs instantly. Free online letter and word counter tool — no login needed.", "/text/letter-counter.html"),
    ("text/lorem-ipsum.html", "Lorem Ipsum Generator", "Generate Lorem Ipsum placeholder text for designs and mockups. Customize paragraph length and count. Free online lorem ipsum generator.", "/text/lorem-ipsum.html"),
    ("text/diff.html", "Text Diff Checker", "Compare two texts side by side with highlighted differences. Free online text diff and comparison tool — no signup required.", "/text/diff.html"),
    ("text/markdown.html", "Markdown Editor & Preview", "Write Markdown and see rendered HTML in real-time. Free online Markdown editor with syntax highlighting and live preview.", "/text/markdown.html"),
    ("text/slug.html", "URL Slug Generator", "Convert any text to SEO-friendly URL slugs instantly. Free online slug generator — create clean, readable URLs with one click.", "/text/slug.html"),
    ("text/bionic.html", "Bionic Reading Converter", "Convert text to bionic reading format for faster, easier reading. Free online bionic reading tool — improve your reading speed instantly.", "/text/bionic.html"),
    ("text/handwriting.html", "Handwriting Text Generator", "Convert typed text to beautiful handwriting-style fonts online. Free handwriting text generator — no installation or signup required.", "/text/handwriting.html"),

    # Dev Tools
    ("dev/json.html", "JSON Formatter & Viewer", "Format, validate, minify and beautify JSON data online. Free JSON formatter and viewer — paste JSON and get clean, readable output instantly.", "/dev/json.html"),
    ("dev/base64.html", "Base64 Encoder & Decoder", "Encode text to Base64 or decode Base64 strings online. Free Base64 encoder and decoder tool — fast, instant results, no signup required.", "/dev/base64.html"),
    ("dev/url-encode.html", "URL Encoder & Decoder", "Encode and decode URL components and query strings online. Free URL encoder and decoder — handles percent encoding and decoding instantly.", "/dev/url-encode.html"),
    ("dev/hash.html", "Hash Generator", "Generate MD5, SHA-1, SHA-256 and SHA-512 hashes online. Free cryptographic hash generator for text — instant results, no signup needed.", "/dev/hash.html"),
    ("dev/regex.html", "Regex Tester", "Test and debug regular expressions with real-time match highlighting. Free online regex tester supporting JavaScript and Python syntax.", "/dev/regex.html"),
    ("dev/jwt.html", "JWT Decoder", "Decode and inspect JWT tokens online for free. View header, payload and signature without any server calls. No signup required.", "/dev/jwt.html"),
    ("dev/timestamp.html", "Unix Timestamp Converter", "Convert Unix timestamps to human-readable dates and vice versa. Free timestamp converter supporting seconds, milliseconds and timezones.", "/dev/timestamp.html"),
    ("dev/cron.html", "Cron Expression Generator", "Build and explain cron expressions with a visual editor online. Free cron job scheduler and cron expression generator — no signup needed.", "/dev/cron.html"),
    ("dev/uuid.html", "UUID Generator", "Generate UUID v1 and v4 universally unique identifiers online. Free UUID generator — create random or time-based UUIDs instantly.", "/dev/uuid.html"),
    ("dev/sql.html", "SQL Formatter & Beautifier", "Format and beautify SQL queries online for free. Supports MySQL, PostgreSQL and SQLite syntax. Free SQL formatter — no signup required.", "/dev/sql.html"),
    ("dev/html-encode.html", "HTML Encode & Decode", "Encode and decode HTML entities online. Convert special characters to HTML entities and back. Free HTML encoder and decoder tool.", "/dev/html-encode.html"),
    ("dev/chmod.html", "Chmod Calculator", "Calculate Unix file permissions with chmod calculator online. Convert between numeric and symbolic permission modes. Free chmod tool.", "/dev/chmod.html"),
    ("dev/json-tree.html", "JSON Tree Viewer", "Visualize JSON data as an interactive tree structure online. Free JSON tree viewer for exploring nested objects and arrays instantly.", "/dev/json-tree.html"),

    # Color Tools
    ("color/picker.html", "Color Picker", "Pick colors with HSL, RGB and HEX modes using an interactive color wheel. Free online color picker tool — choose and convert colors instantly.", "/color/picker.html"),
    ("color/palette.html", "Color Palette Generator", "Generate harmonious color palettes for your designs online. Free color palette generator with complementary, analogous and triadic schemes.", "/color/palette.html"),
    ("color/contrast.html", "Color Contrast Checker", "Check WCAG color contrast ratios for accessibility compliance. Free color contrast checker — test AA and AAA standards online.", "/color/contrast.html"),
    ("color/hex-rgb.html", "HEX to RGB Color Converter", "Convert HEX to RGB and RGB to HEX color codes instantly online. Free color format converter — quick and accurate, no signup required.", "/color/hex-rgb.html"),
    ("color/mixer.html", "Color Mixer", "Mix two colors together and preview the blended result instantly. Free online color mixer — supports RGB and HEX formats.", "/color/mixer.html"),
    ("color/blindness.html", "Color Blindness Simulator", "Simulate how colors appear with protanopia, deuteranopia and tritanopia. Free color blindness simulator for accessible design testing.", "/color/blindness.html"),
    ("color/shades.html", "Color Shades Generator", "Generate tints and shades from any base color for design systems. Free online color shades generator — create UI color palettes instantly.", "/color/shades.html"),

    # Image Tools
    ("image/compressor.html", "Image Compressor", "Compress PNG, JPG and WebP images online with quality control. Free image compressor — reduce file size without losing visual quality.", "/image/compressor.html"),
    ("image/cropper.html", "Image Cropper", "Crop images to exact dimensions online for free. Free image cropping tool — select area, adjust aspect ratio and download instantly.", "/image/cropper.html"),
    ("image/resizer.html", "Image Resizer", "Resize images to any dimension online for free. Free image resizer — change width and height while maintaining aspect ratio.", "/image/resizer.html"),
    ("image/converter.html", "Image Format Converter", "Convert images between PNG, JPG, WebP and GIF formats online. Free image format converter — batch convert images in your browser.", "/image/converter.html"),
    ("image/color-extractor.html", "Image Color Extractor", "Extract dominant colors and color palettes from any image online. Free image color extractor — get HEX codes from photos instantly.", "/image/color-extractor.html"),
    ("image/watermark.html", "Image Watermark Tool", "Add text or image watermarks to photos online for free. Free watermark tool — protect your images with custom text or logo.", "/image/watermark.html"),
    ("image/svg-to-png.html", "SVG to PNG Converter", "Convert SVG vector files to PNG images with custom dimensions online. Free SVG to PNG converter — high quality export, no signup required.", "/image/svg-to-png.html"),
    ("image/filters.html", "Image Filters Editor", "Apply filters and effects to images online. Adjust brightness, contrast, saturation and blur. Free image filter editor — no upload needed.", "/image/filters.html"),
    ("image/censor.html", "Image Censor Tool", "Blur or pixelate parts of images to censor sensitive content online. Free image censoring tool — protect privacy in photos easily.", "/image/censor.html"),
    ("image/blob.html", "Image to Blob Converter", "Convert images to Blob URLs and Base64 data URIs online. Free image blob converter for web developers — no server required.", "/image/blob.html"),
    ("image/tweet-to-image.html", "Tweet to Image Generator", "Convert tweets and social media posts to beautiful shareable images. Free tweet to image generator — create screenshot cards instantly.", "/image/tweet-to-image.html"),
    ("image/code-to-image.html", "Code to Image Generator", "Convert code snippets to beautiful syntax-highlighted images for sharing. Free code to image tool — create shareable code screenshots online.", "/image/code-to-image.html"),

    # CSS Tools
    ("css-tools/gradient.html", "CSS Gradient Generator", "Create beautiful linear, radial and conic CSS gradients with live preview. Free CSS gradient generator — copy the code instantly.", "/css-tools/gradient.html"),
    ("css-tools/shadow.html", "CSS Box Shadow Generator", "Create CSS box-shadow effects with visual controls and live preview. Free box shadow generator — customize and copy CSS code instantly.", "/css-tools/shadow.html"),
    ("css-tools/minify.html", "CSS Minifier", "Minify and compress CSS code to reduce file size online. Free CSS minifier — remove whitespace and comments for faster page loads.", "/css-tools/minify.html"),
    ("css-tools/flexbox.html", "CSS Flexbox Generator", "Build flexbox layouts visually with live preview and generated CSS code. Free flexbox generator — master CSS flexbox properties online.", "/css-tools/flexbox.html"),
    ("css-tools/border-radius.html", "CSS Border Radius Generator", "Create custom CSS border-radius shapes with visual controls. Free border radius generator — generate rounded corners and blob shapes.", "/css-tools/border-radius.html"),
    ("css-tools/bezier.html", "CSS Cubic Bezier Generator", "Create and preview CSS cubic bezier animation timing curves online. Free bezier generator — customize easing functions for CSS animations.", "/css-tools/bezier.html"),
    ("css-tools/loader.html", "CSS Loader Generator", "Generate CSS loading animations and spinners with pure CSS. Free CSS loader generator — create animated loaders without JavaScript.", "/css-tools/loader.html"),
    ("css-tools/glitch.html", "CSS Glitch Effect Generator", "Create CSS glitch text and image effects with live preview online. Free CSS glitch generator — add retro glitch effects to your designs.", "/css-tools/glitch.html"),
    ("css-tools/pattern.html", "CSS Pattern Generator", "Generate CSS background patterns and textures with custom colors. Free CSS pattern generator — create geometric patterns for web designs.", "/css-tools/pattern.html"),
    ("css-tools/glassmorphism.html", "CSS Glassmorphism Generator", "Create frosted glass UI effects with CSS glassmorphism online. Free glassmorphism generator — backdrop blur, transparency and border styles.", "/css-tools/glassmorphism.html"),
    ("css-tools/triangle.html", "CSS Triangle Generator", "Generate CSS triangles and arrows using pure CSS border tricks. Free CSS triangle generator — any direction, custom colors and size.", "/css-tools/triangle.html"),

    # Converter Tools
    ("convert/qrcode.html", "QR Code Generator", "Generate QR codes for URLs, text and contacts instantly online. Free QR code generator — high-quality PNG download, no signup required.", "/convert/qrcode.html"),
    ("convert/unit.html", "Unit Converter", "Convert length, weight, temperature, volume and more measurement units. Free online unit converter — accurate conversions across 50+ units.", "/convert/unit.html"),
    ("convert/number-base.html", "Number Base Converter", "Convert between binary, octal, decimal and hexadecimal number systems. Free number base converter — supports base 2, 8, 10 and 16 instantly.", "/convert/number-base.html"),
    ("convert/color.html", "Color Format Converter", "Convert colors between HEX, RGB, HSL, HSV and CMYK formats online. Free color format converter — supports all major CSS color formats.", "/convert/color.html"),
    ("convert/password.html", "Password Generator", "Generate strong, secure random passwords online. Free password generator — customize length, uppercase letters, symbols and numbers.", "/convert/password.html"),
    ("convert/barcode.html", "Barcode Generator", "Generate barcodes in Code128, EAN-13 and QR Code formats online. Free barcode generator — download SVG or PNG instantly.", "/convert/barcode.html"),
    ("convert/instagram.html", "Instagram Font Generator", "Generate fancy Instagram bio fonts and Unicode symbols online. Free Instagram font generator — convert text to aesthetic fonts for bios.", "/convert/instagram.html"),
    ("convert/randomizer.html", "Random Number Generator", "Generate random numbers within any range online for free. Free randomizer tool — dice roller, list randomizer and random picker.", "/convert/randomizer.html"),

    # Social Tools
    ("social/og-meta.html", "Open Graph Meta Generator", "Generate Open Graph meta tags for better social media sharing. Free OG meta generator — preview how your page looks on Facebook and Twitter.", "/social/og-meta.html"),
    ("social/youtube-thumb.html", "YouTube Thumbnail Downloader", "Download YouTube video thumbnails in HD, SD and maxres quality. Free YouTube thumbnail downloader — get any video thumbnail instantly.", "/social/youtube-thumb.html"),

    # Fortune Index (only page needing update, others have good Chinese titles)
    ("fortune/index.html", "Fortune & Astrology Tools", "Free online fortune telling and astrology tools. Tarot reading, zodiac horoscope, MBTI personality test, numerology and more tools.", "/fortune/index.html"),
]

JSON_LD_TEMPLATE = '<script type="application/ld+json">{{"@context":"https://schema.org","@type":"WebApplication","name":"{name}","description":"{desc}","url":"{url}","applicationCategory":"Utility","operatingSystem":"Web Browser","offers":{{"@type":"Offer","price":"0"}}}}</script>'

updated_count = 0
schema_added = 0

for rel_path, tool_name, description, url_path in TOOLS:
    file_path = os.path.join(BASE, rel_path)
    if not os.path.exists(file_path):
        print(f"MISSING: {rel_path}")
        continue

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changed = False

    # 1. Update <title>
    new_title = f"{tool_name} - Free Online Tool | GameZipper Tools"
    content = re.sub(r'<title>[^<]*</title>', f'<title>{new_title}</title>', content, count=1)

    # 2. Update meta description
    new_desc_tag = f'<meta name="description" content="{description}">'
    if re.search(r'<meta name="description"', content, re.IGNORECASE):
        content = re.sub(r'<meta name="description"[^>]*>', new_desc_tag, content, count=1, flags=re.IGNORECASE)
    else:
        # Insert after <title>
        content = content.replace(f'<title>{new_title}</title>', f'<title>{new_title}</title>\n{new_desc_tag}', 1)

    # 3. Update og:title
    og_title_tag = f'<meta property="og:title" content="{new_title}">'
    if re.search(r'<meta property="og:title"', content, re.IGNORECASE):
        content = re.sub(r'<meta property="og:title"[^>]*>', og_title_tag, content, count=1, flags=re.IGNORECASE)

    # 4. Update og:description
    og_desc_tag = f'<meta property="og:description" content="{description}">'
    if re.search(r'<meta property="og:description"', content, re.IGNORECASE):
        content = re.sub(r'<meta property="og:description"[^>]*>', og_desc_tag, content, count=1, flags=re.IGNORECASE)

    # 5. Update twitter:title
    tw_title_tag = f'<meta name="twitter:title" content="{new_title}">'
    if re.search(r'<meta name="twitter:title"', content, re.IGNORECASE):
        content = re.sub(r'<meta name="twitter:title"[^>]*>', tw_title_tag, content, count=1, flags=re.IGNORECASE)

    # 6. Add JSON-LD schema if not present
    full_url = BASE_URL + url_path
    # Escape description for JSON
    desc_escaped = description.replace('"', '\\"')
    name_escaped = tool_name.replace('"', '\\"')
    json_ld = f'<script type="application/ld+json">{{"@context":"https://schema.org","@type":"WebApplication","name":"{name_escaped}","description":"{desc_escaped}","url":"{full_url}","applicationCategory":"Utility","operatingSystem":"Web Browser","offers":{{"@type":"Offer","price":"0"}}}}</script>'

    if 'application/ld+json' not in content:
        # Insert before </head>
        content = content.replace('</head>', f'{json_ld}\n</head>', 1)
        schema_added += 1

    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"UPDATED: {rel_path}")
        updated_count += 1
    else:
        print(f"unchanged: {rel_path}")

print(f"\nTotal updated: {updated_count}, JSON-LD schemas added: {schema_added}")
