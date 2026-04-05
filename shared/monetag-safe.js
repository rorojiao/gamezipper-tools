(function(){
  'use strict';
  if (window.GZToolAds) return;
  var state = { loaded:false, loading:false, zone:10689347, meaningful:false, firstActionAt:0 };

  function inject(){
    if (state.loaded || state.loading) return false;
    state.loading = true;
    var s = document.createElement('script');
    s.src = 'https://quge5.com/88/tag.min.js';
    s.async = true;
    s.setAttribute('data-zone', String(state.zone));
    s.setAttribute('data-cfasync', 'false');
    s.onload = function(){ state.loaded = true; state.loading = false; };
    s.onerror = function(){ state.loading = false; };
    document.head.appendChild(s);
    return true;
  }

  function hasActiveEditorFocus(){
    var el = document.activeElement;
    if (!el) return false;
    return /^(TEXTAREA|INPUT|SELECT)$/i.test(el.tagName) || el.isContentEditable;
  }

  function isHubPage(){
    return location.pathname === '/' || /\/$/.test(location.pathname);
  }

  function markMeaningfulAction(){
    state.meaningful = true;
    if (!state.firstActionAt) state.firstActionAt = Date.now();
    setTimeout(function(){
      if (state.meaningful && !hasActiveEditorFocus()) inject();
    }, 8000);
  }

  function setup(){
    if (isHubPage()) {
      setTimeout(function(){ if (!hasActiveEditorFocus()) inject(); }, 10000);
      window.addEventListener('scroll', function(){ if (window.scrollY > 500) inject(); }, { passive:true, once:true });
      return;
    }

    document.addEventListener('click', function(e){
      if (e.target.closest('.gz-btn, button')) markMeaningfulAction();
      if (state.meaningful && e.target.closest('.gz-related a, .gz-related-card, footer a')) {
        inject();
      }
    }, { capture:true });

    document.addEventListener('change', function(e){
      var t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/i.test(t.tagName)) markMeaningfulAction();
    }, { capture:true });
  }

  window.GZToolAds = { init: setup, markMeaningfulAction: markMeaningfulAction, loadNow: inject };
})();
