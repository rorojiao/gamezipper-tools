/* GameZipper Tools — i18n system */
const GZI18n = (function(){
  const T = { en: {}, zh: {} };
  let lang = localStorage.getItem('gz-lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

  function t(k) { return (T[lang] && T[lang][k]) || T.en[k] || k; }
  function setLang(l) { lang = l; localStorage.setItem('gz-lang', l); location.reload(); }
  function getLang() { return lang; }
  function register(translations) {
    for (const [l, entries] of Object.entries(translations)) {
      if (!T[l]) T[l] = {};
      Object.assign(T[l], entries);
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
    }
  });

  return { t, setLang, getLang, register };
})();
