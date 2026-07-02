#!/usr/bin/env python3
"""Fix裸露JS bug in ZH tool pages.

The i18n script injected <link> and <script>localStorage.setItem('gz-lang','zh');</script>
tags inside JS template literals (e.g., win.document.write()), causing </script> to
prematurely close the outer <script> block, leaking all subsequent JS as naked text.

Fix: Remove the injected i18n tags from inside <script> blocks while keeping them in <head>.
"""
import os
import re

def fix_file(path):
    with open(path) as f:
        content = f.read()
    
    original = content
    
    # Pattern: inside JS code (template literals), find the injected link/script tags
    # These appear as:
    # <link rel="alternate" hreflang="en" href="...">
    # <link rel="alternate" hreflang="zh" href="...">
    # <link rel="alternate" hreflang="x-default" href="...">
    # <script>localStorage.setItem('gz-lang','zh');</script>
    
    # Strategy: Find occurrences of these patterns that are INSIDE <script> JS blocks
    # We do this by finding them after a backtick or inside win.document.write()
    
    # Pattern 1: The tags appear right after </style> inside a template literal
    # e.g., ...</style><link rel="alternate" hreflang="en"...
    injection_pattern = re.compile(
        r'(</style>)'
        r'(<link rel="alternate" hreflang="en" href="[^"]*">\s*'
        r'<link rel="alternate" hreflang="zh" href="[^"]*">\s*'
        r'<link rel="alternate" hreflang="x-default" href="[^"]*">\s*'
        r'<script>localStorage\.setItem\(\'gz-lang\',\'zh\'\);</script>\s*)',
        re.MULTILINE
    )
    
    content = injection_pattern.sub(r'\1', content)
    
    # Pattern 2: The tags appear after other content in template literals
    # e.g., ...<title>XXX</title>\n<link rel="alternate"...
    injection_pattern2 = re.compile(
        r'(<title>[^<]*</title>)\s*'
        r'(<link rel="alternate" hreflang="en" href="[^"]*">\s*'
        r'<link rel="alternate" hreflang="zh" href="[^"]*">\s*'
        r'<link rel="alternate" hreflang="x-default" href="[^"]*">\s*'
        r'<script>localStorage\.setItem\(\'gz-lang\',\'zh\'\);</script>\s*)',
        re.MULTILINE
    )
    
    content = injection_pattern2.sub(r'\1\n', content)
    
    # Pattern 3: More generic - find <script>localStorage.setItem('gz-lang','zh');</script>
    # that appears inside a JS context (between backticks)
    # We look for backtick ... <script>localStorage ... </script> ... backtick
    
    # First, find all template literals
    def fix_template_literal(match):
        full = match.group(0)
        # Remove the injected tags from inside the template literal
        cleaned = re.sub(
            r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\s*',
            '',
            full
        )
        cleaned = re.sub(
            r"<script>localStorage\.setItem\('gz-lang','zh'\);</script>\s*",
            '',
            cleaned
        )
        return cleaned
    
    # Only apply to template literals that contain the injection
    content = re.sub(
        r'`[^`]*<link rel="alternate"[^`]*</script>[^`]*`',
        fix_template_literal,
        content,
        flags=re.DOTALL
    )
    
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        # Count changes
        removed_links = original.count('hreflang') - content.count('hreflang')
        removed_scripts = original.count("localStorage.setItem('gz-lang','zh')") - content.count("localStorage.setItem('gz-lang','zh')")
        return True, removed_links, removed_scripts
    return False, 0, 0

# Find all affected ZH files
fixed_count = 0
total_links_removed = 0
total_scripts_removed = 0

for root, dirs, files in os.walk('zh'):
    for f in files:
        if not f.endswith('.html'):
            continue
        path = os.path.join(root, f)
        
        # Quick check: does this file have multiple localStorage gz-lang injections?
        with open(path) as fh:
            txt = fh.read()
        count = txt.count("localStorage.setItem('gz-lang','zh')")
        
        if count > 1:
            fixed, links, scripts = fix_file(path)
            if fixed:
                fixed_count += 1
                total_links_removed += links
                total_scripts_removed += scripts
                print(f"  Fixed: {path} (removed {links} link tags, {scripts} script tags)")

print(f"\nTotal files fixed: {fixed_count}")
print(f"Total link tags removed: {total_links_removed}")
print(f"Total script tags removed: {total_scripts_removed}")
