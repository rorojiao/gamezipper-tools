#!/usr/bin/env python3
"""R437: fix 46 production-broken tool pages (44 SyntaxError + 2 html-formatter fixed separately).
Two root causes:
 A) R449 global sed (bdbc8d831) corrupted regex/strings containing 'watch?v=' in 8 youtube files
    -> restore exact pre-R449 lines via difflib against bdbc8d831^
 B) pre-existing JS syntax bugs in tool families -> targeted content replacements (EN+zh)
Idempotent: --check reports, --apply writes.
"""
import re, sys, subprocess, difflib, os

APPLY = '--apply' in sys.argv
ROOT = '/home/msdn/gamezipper-tools'

# ---------- A) youtube files: restore corrupted lines from pre-R449 ----------
YT_FILES = [
 'text/youtube-embed.html','zh/text/youtube-embed.html',
 'text/youtube-transcript.html','zh/text/youtube-transcript.html',
 'text/youtube-thumbnail-downloader.html','zh/text/youtube-thumbnail-downloader.html',
 'social/youtube-thumb.html','zh/social/youtube-thumb.html',
]

def fix_youtube(f):
    old = subprocess.run(['git','-C',ROOT,'show',f'bdbc8d831^:{f}'], capture_output=True, text=True).stdout.splitlines()
    path = f"{ROOT}/{f}"
    txt0 = open(path, encoding='utf-8')
    trailing_nl = open(path, encoding='utf-8').read().endswith('\n')
    new = open(path, encoding='utf-8').read().splitlines()
    sm = difflib.SequenceMatcher(None, old, new)
    changes = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal': continue
        n_len, o_len = j2-j1, i2-i1
        if n_len == o_len:
            for k in range(n_len):
                nl, ol = new[j1+k], old[i1+k]
                if 'R449-flat' in nl and 'src=' not in nl and nl != ol:
                    changes.append((j1+k, ol))
    for idx, ol in changes:
        new[idx] = ol
    if changes and APPLY:
        open(path, 'w', encoding='utf-8').write('\n'.join(new) + ('\n' if trailing_nl else ''))
    return len(changes)

# ---------- B) targeted replacements (applied to EN + zh variants) ----------
REPL = [
 ('fun/wordle-solver.html', "$('#results'].innerHTML=''", "$('#results').innerHTML=''"),
 ('image/image-to-webp.html', "convertedBlobs[i]=b}done++};'image/webp',q)}", "convertedBlobs[i]=b;done++},'image/webp',q)}"),
 ('text/text-pad.html', "${t('width'}:", "${t('width')}:"),
 ('text/remove-html-tags.html', "GZ.renderToolPage({icon:'\U0001f4dd',href:'/text/word-counter.html',name:'Word Counter'}]});",
                             "GZ.renderToolPage({related:[{icon:'\U0001f4dd',href:'/text/word-counter.html',name:'Word Counter'}]});"),
 ('calc/pemdas-calculator.html', "${op==='+'?'+'.'-'}", "${op==='+'?'+':'-'}"),
 ('text/character-map.html', "\u201e\"\"''\u201a''\u00b4", "\u201e\"\"\\'\\'\u201a\\'\\'\u00b4"),
 ('text/mirror-text.html', "  ',','.',',':'.',", "  ',':',','.':'.',"),
 ('text/title-case-converter.html', "()[]{}/<>]", "()[]{}\\/<>]"),
 ('social/youtube-viral-title-generator.html', "${topic)}", "${topic}"),
 ('text/dialogue-generator.html', 'just saying—"], mid:', 'just saying—"\'], mid:'),
 ('image/image-to-webp.html', "convertedBlobs[i]=b}done++};'image/webp',q)}", "convertedBlobs[i]=b}done++},'image/webp',q)}"),
 ('dev/ini-editor.html', "/[:#\\[\\]{}&,*?|-<>=!%@`\"'\\n]/", "/[:#\\[\\]{}&,*?|\\-<>=!%@`\"'\\n]/"),
 ('text/award-certificate.html', "${sig1.includes('(')?sig1.match(/\\(([^)]+)\\)/)?.[1]||'':'':''}",
                                "${sig1.includes('(')?(sig1.match(/\\(([^)]+)\\)/)?.[1]||''):''}"),
 ('text/award-certificate.html', "${sig2.includes('(')?sig2.match(/\\(([^)]+)\\)/)?.[1]||'':'':''}",
                                "${sig2.includes('(')?(sig2.match(/\\(([^)]+)\\)/)?.[1]||''):''}"),
 ('dev/ini-editor.html', "!value.endsWith(\"''))", "!value.endsWith(\"'\"))"),
 ('css-tools/counter.html', "suffix='. ', separator:'.', depth:3", "suffix:'. ', separator:'.', depth:3"),
 ('text/spell-checker.html', '"writting":"writing"});', '"writting":"writing"};'),
 ('dev/cron-expression-parser.html', "    ',name:'JSON Formatter'},", "    {href:'/dev/json-formatter.html',icon:'\U0001f4cb',name:'JSON Formatter'},"),
 ('dev/punycode.html', "    const labels = domainPart.split('.');\n    const encoded = labels.map(",
                       "    const dLabels = domainPart.split('.');\n    const encoded = dLabels.map("),
 ('dev/og-image-debugger.html', "const { $, copyText, t } = GZ;", "const { copyText, t } = GZ;"),
]

def fix_repl(frag):
    hits = []
    for root, dirs, files in os.walk(ROOT):
        if '/.git' in root or 'node_modules' in root: continue
        for fn in files:
            if not fn.endswith('.html'): continue
            p = os.path.join(root, fn)
            rp = os.path.relpath(p, ROOT)
            if not (rp == frag or rp == 'zh/' + frag): continue
            txt = open(p, encoding='utf-8').read()
            orig = txt
            for (ff, old, new) in [r for r in REPL if r[0] == frag]:
                if old in txt:
                    txt = txt.replace(old, new)
            if txt != orig:
                hits.append(rp)
                if APPLY:
                    open(p, 'w', encoding='utf-8').write(txt)
    return hits

# regex-based: gpa-scale-converter unquoted hyphen keys
def fix_gpa():
    hits = []
    for f in ['calc/gpa-scale-converter.html', 'zh/calc/gpa-scale-converter.html']:
        p = f"{ROOT}/{f}"
        txt = open(p, encoding='utf-8').read()
        new = re.sub(r"(?m)^(\s*)th-(letter|40|43|50|10|pct):", r"\1'th-\2':", txt)
        if new != txt:
            hits.append(f)
            if APPLY: open(p, 'w', encoding='utf-8').write(new)
    return hits

# fortune/index.html: stray <div> inside script -> move to body after #grid
def fix_fortune(f):
    path = f"{ROOT}/{f}"
    txt = open(path, encoding='utf-8').read()
    stray = '<div id="gz-ad-banner" style="max-width:600px;margin:24px auto;text-align:center;min-height:90px"></div>'
    if stray not in txt: return 0
    txt2 = txt.replace(stray + '\n', '').replace(stray, '')
    m = re.search(r'(<div[^>]*id="grid"[^>]*>[^<]*</div>)', txt2)
    if m:
        txt2 = txt2[:m.end()] + '\n' + stray + txt2[m.end():]
    else:
        txt2 = txt2.replace('</body>', stray + '\n</body>')
    if APPLY: open(path, 'w', encoding='utf-8').write(txt2)
    return 1

total = 0
for f in YT_FILES:
    n = fix_youtube(f); total += n
    print(f"YT {f}: {n} lines restored")
for frag in sorted(set(r[0] for r in REPL)):
    hits = fix_repl(frag)
    total += len(hits)
    print(f"REPL {frag}: {hits}")
hits = fix_gpa(); total += len(hits)
print(f"GPA keys: {hits}")
for f in ['fortune/index.html', 'zh/fortune/index.html']:
    n = fix_fortune(f); total += n
    print(f"FORTUNE {f}: {n}")
print("TOTAL changes:", total, "(APPLIED)" if APPLY else "(check-only)")
