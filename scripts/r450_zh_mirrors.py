#!/usr/bin/env python3
"""R450: build zh mirrors for the 3 new calc tools (check-digit pattern)."""
import re, pathlib

TOOLS = {
 'calc/long-division-calculator.html': {
   'zh_title': '长除法计算器 - 商与余数逐步演算 | GameZipper 工具箱',
   'zh_desc': '免费在线长除法计算器。输入被除数和除数，得到商、余数和完整的“除、乘、减、落位”逐步过程。免费、浏览器本地运行。',
   'og_title': '长除法计算器 - 商与余数逐步演算',
   'og_desc': '任意两数相除并展示完整长除步骤：每一步的除、乘、减、落位，以及商、余数和小数展开。免费、不上传。',
   'tw_title': '长除法计算器 - 商与余数逐步演算',
   'tw_desc': '展示每一步长除过程：除、乘、减、落位。商、余数和小数展开 - 免费、浏览器本地运行。',
 },
 'calc/rounding-calculator.html': {
   'zh_title': '四舍五入计算器 - 保留到十分位、百分位、整数 | GameZipper 工具箱',
   'zh_desc': '免费在线四舍五入计算器。将任意数字修约到整数、十分位、百分位、千分位、十位、百位或千位 — 并逐步解释修约规则。免费、浏览器本地运行。',
   'og_title': '四舍五入计算器 - 保留到十分位、百分位、整数',
   'og_desc': '修约到任意数位并高亮决定位，解释进位或舍去规则。免费、不上传。',
   'tw_title': '四舍五入计算器 - 保留到十分位、百分位、整数',
   'tw_desc': '修约到任意数位，高亮决定位并解释规则 - 免费、浏览器本地运行。',
 },
 'calc/poisson-distribution-calculator.html': {
   'zh_title': '泊松分布计算器 - P(X=k) 概率计算 | GameZipper 工具箱',
   'zh_desc': '免费在线泊松分布计算器。由平均发生率 λ 计算 P(X=k)、P(X≤k)、P(X≥k) 和 P(a≤X≤b)，附逐步公式演算、概率表以及均值和方差。免费、浏览器本地运行。',
   'og_title': '泊松分布计算器 - P(X=k) 概率计算',
   'og_desc': '计算精确和累积泊松概率，附逐步公式演算、概率表以及均值/方差。免费、不上传。',
   'tw_title': '泊松分布计算器 - P(X=k) 概率计算',
   'tw_desc': '精确与累积泊松概率，附逐步公式演算 - 免费、浏览器本地运行。',
 },
}

for rel, m in TOOLS.items():
    src = pathlib.Path(rel).read_text(encoding='utf-8')
    zh_rel = 'zh/' + rel
    url = 'https://tools.gamezipper.com/' + rel
    zh_url = 'https://tools.gamezipper.com/zh/' + rel
    s = src
    s = s.replace('<html lang="en">', '<html lang="zh">')
    s = s.replace('<title>' + re.search(r'<title>(.*?)</title>', src, re.S).group(1) + '</title>',
                  '<title>' + m['zh_title'] + '</title>')
    en_desc = re.search(r'<meta name="description" content="(.*?)">', src).group(1)
    s = s.replace('<meta name="description" content="' + en_desc + '">',
                  '<meta name="description" content="' + m['zh_desc'] + '">')
    s = s.replace('<link rel="canonical" href="' + url + '">',
                  '<link rel="canonical" href="' + zh_url + '">')
    # og/twitter titles & descriptions
    en_og_t = re.search(r'<meta property="og:title" content="(.*?)">', src).group(1)
    s = s.replace('<meta property="og:title" content="' + en_og_t + '">',
                  '<meta property="og:title" content="' + m['og_title'] + '">')
    en_og_d = re.search(r'<meta property="og:description" content="(.*?)">', src).group(1)
    s = s.replace('<meta property="og:description" content="' + en_og_d + '">',
                  '<meta property="og:description" content="' + m['og_desc'] + '">')
    s = s.replace('<meta property="og:url" content="' + url + '">',
                  '<meta property="og:url" content="' + zh_url + '">')
    en_tw_t = re.search(r'<meta name="twitter:title" content="(.*?)">', src).group(1)
    s = s.replace('<meta name="twitter:title" content="' + en_tw_t + '">',
                  '<meta name="twitter:title" content="' + m['tw_title'] + '">')
    en_tw_d = re.search(r'<meta name="twitter:description" content="(.*?)">', src).group(1)
    s = s.replace('<meta name="twitter:description" content="' + en_tw_d + '">',
                  '<meta name="twitter:description" content="' + m['tw_desc'] + '">')
    # hreflang en -> keep pointing to en; zh -> zh (already correct), add gz-lang script
    s = s.replace('</head>', '<script>localStorage.setItem(\'gz-lang\',\'zh\');</script>\n</head>')
    pathlib.Path(zh_rel).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(zh_rel).write_text(s, encoding='utf-8')
    print('wrote', zh_rel, len(s))
