/* GameZipper Tools — i18n system */
const GZI18n = (function(){
  const T = { en: {}, zh: {} };
  let lang = localStorage.getItem('gz-lang') || (navigator.language && navigator.language.startsWith('zh') ? 'zh' : 'en');

  function t(k) { return (T[lang] && T[lang][k]) || T.en[k] || k; }
  function setLang(l) { lang = l; localStorage.setItem('gz-lang', l); document.documentElement.lang = l; location.reload(); }
  function getLang() { return lang; }
  function register(translations) {
    for (const [l, entries] of Object.entries(translations)) {
      if (!T[l]) T[l] = {};
      Object.assign(T[l], entries);
    }
  }

  // Set html lang attribute on load
  document.documentElement.lang = lang;

  // Auto-redirect: if browser is zh and we're on en URL (and no manual override)
  if (!localStorage.getItem('gz-lang') && navigator.language && navigator.language.startsWith('zh')) {
    var p = location.pathname;
    if (!p.startsWith('/zh/') && p !== '/zh') {
      var zhUrl = '/zh' + (p === '/' ? '/' : p);
      location.replace(zhUrl);
    }
  }

  // Common strings
  register({
    en: {
      brand: 'GameZipper Tools',
      home: 'Home',
      allTools: 'All Tools',
      search: 'Search tools...',
      textTools: 'Text Tools',
      devTools: 'Dev Tools',
      colorTools: 'Color Tools',
      imageTools: 'Image Tools',
      cssTools: 'CSS Tools',
      convertTools: 'Converters',
      fortuneTools: 'Fortune',
      calcTools: 'Calculators',
      seoTools: 'SEO Tools',
      funTools: 'Fun Tools',
      input: 'Input', output: 'Output',
      copy: 'Copy', copied: 'Copied!',
      clear: 'Clear', paste: 'Paste',
      download: 'Download', upload: 'Upload',
      generate: 'Generate', convert: 'Convert',
      encode: 'Encode', decode: 'Decode',
      format: 'Format', validate: 'Validate', minify: 'Minify',
      example: 'Load Example',
      howToUse: 'How to Use',
      relatedTools: 'Related Tools',
      madeWith: 'Made with ❤️ by',
      gamesAt: 'Play games at',
      privacyNote: 'All processing happens in your browser. No data is sent to any server.',
      tryIt: 'Try it',
      step: 'Step',
      // Static homepage sections
      popularTools: 'Popular tools with real traffic',
      startWith: 'Start with the most useful online tools',
      startWithDesc: 'Practical browser tools for developers, designers, creators, text editing, color workflows, image processing, CSS generation, quick converters, and lightweight utility tasks — all free and instant to use.',
      devToolsDesc: 'Format JSON, test regex, decode Base64 or JWT, generate hashes, and convert timestamps during real debugging work.',
      colorToolsDesc: 'Pick colors, convert HEX/RGB/HSL, build palettes, generate shades, and check WCAG contrast for design systems.',
      imgTextToolsDesc: 'Compress images, crop or resize assets, extract colors, compare text, generate slugs, and handle markdown or handwriting effects.',
      quickToolsDesc: 'Use QR generators, unit converters, social helpers, and small single-purpose tools without sign-up or installation friction.',
      faqTitle: 'FAQ',
      faqQ1: 'What kinds of tools are on Tools.GameZipper?',
      faqA1: 'You can find developer tools, text tools, color tools, CSS generators, image utilities, converters, social helpers, and lightweight browser tools for everyday workflows.',
      faqQ2: 'Do these tools work without sign-up?',
      faqA2: 'Yes. Most tools open instantly in the browser and are designed for quick single-task use without registration.',
      faqQ3: 'Are my files or data stored anywhere?',
      faqA3: 'No. All processing happens locally in your browser. No files are uploaded to any server, and nothing is stored after you close the tab.',
      recommendedGames: 'Recommended Games',
      gamesTagline: 'Take a break and play free online games — no downloads, no signups.',
      browseAllGames: 'Browse all free games',
    },
    zh: {
      brand: 'GameZipper 工具箱',
      home: '首页',
      allTools: '全部工具',
      search: '搜索工具...',
      textTools: '文本工具',
      devTools: '开发者工具',
      colorTools: '颜色工具',
      imageTools: '图片工具',
      cssTools: 'CSS工具',
      convertTools: '转换工具',
      fortuneTools: '占卜命理',
      calcTools: '计算工具',
      seoTools: 'SEO工具',
      funTools: '趣味工具',
      input: '输入', output: '输出',
      copy: '复制', copied: '已复制！',
      clear: '清空', paste: '粘贴',
      download: '下载', upload: '上传',
      generate: '生成', convert: '转换',
      encode: '编码', decode: '解码',
      format: '格式化', validate: '校验', minify: '压缩',
      example: '加载示例',
      howToUse: '使用方法',
      relatedTools: '相关工具',
      madeWith: '用 ❤️ 制作',
      gamesAt: '来玩游戏',
      privacyNote: '所有处理在浏览器本地完成，不向服务器发送任何数据。',
      tryIt: '试一试',
      step: '步骤',
      // Static homepage sections
      popularTools: '热门工具（真实流量）',
      startWith: '从最有用的在线工具开始',
      startWithDesc: '为开发者、设计师、创作者提供的实用浏览器工具，涵盖文本编辑、配色工作流、图片处理、CSS生成、快速转换和轻量级实用工具——全部免费，即开即用。',
      devToolsDesc: '格式化 JSON、测试正则、解码 Base64 或 JWT、生成哈希值、转换时间戳——真实调试工作中的得力助手。',
      colorToolsDesc: '选取颜色、转换 HEX/RGB/HSL、构建调色板、生成色阶、检查设计系统的 WCAG 对比度。',
      imgTextToolsDesc: '压缩图片、裁剪或调整图片尺寸、提取颜色、对比文本、生成 slug，处理 Markdown 或手写效果。',
      quickToolsDesc: '使用二维码生成器、单位转换器、社交助手和各种单一用途的小工具，无需注册或安装。',
      faqTitle: '常见问题',
      faqQ1: 'Tools.GameZipper 上有哪些工具？',
      faqA1: '包括开发者工具、文本工具、颜色工具、CSS 生成器、图片工具、转换器、社交助手以及日常工作中用得到的轻量级浏览器工具。',
      faqQ2: '这些工具需要注册吗？',
      faqA2: '不需要。大多数工具在浏览器中即时打开，为快速单一任务设计，无需注册。',
      faqQ3: '我的文件或数据会存储在哪里？',
      faqA3: '不会。所有处理都在本地浏览器中完成，不会上传到任何服务器，关闭标签页后不会保留任何数据。',
      recommendedGames: '精选游戏',
      gamesTagline: '休息一下，玩点免费网络游戏——无需下载，无需注册。',
      browseAllGames: '浏览全部免费游戏',
    }
  });

  return { t, setLang, getLang, register };
})();
