
/*! lightweight i18n for Project Keva */
;(function(global){
  const I18N_KEY = 'keva.lang';
  let dict = {};
  let current = localStorage.getItem(I18N_KEY) || 'en';

  function deepGet(obj, path){
    return path.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, obj);
  }

  async function load(lang){
    const urlBases = [
      './locales/',        // renderer folder
      '../renderer/locales/', // wallet subpages
      '/locales/'
    ];
    let lastErr;
    for (const base of urlBases){
      try{
        const res = await fetch(base + lang + '.json', {cache:'no-cache'});
        if(res.ok){ return res.json(); }
      }catch(err){ lastErr = err; }
    }
    if (lastErr) console.warn('[i18n] load failed', lastErr);
    return {};
  }

  async function init(lang){
    current = lang || current || 'en';
    dict = await load(current);
    apply();
  }

  function t(key, fallback){
    const v = deepGet(dict, key);
    return (v===undefined) ? (fallback!==undefined ? fallback : key) : v;
  }

  function apply(root=document){
    const nodes = root.querySelectorAll('[data-i18n]');
    nodes.forEach(el=>{
      const key = el.getAttribute('data-i18n');
      const text = t(key, el.textContent.trim());
      el.textContent = text;
    });
  }

  async function setLang(lang){
    current = lang;
    localStorage.setItem(I18N_KEY, lang);
    dict = await load(lang);
    apply();
    // notify other windows
    try{ window.electronAPI && window.electronAPI.send && window.electronAPI.send('lang-changed', lang); }catch(e){}
  }

  function getLang(){ return current; }

  // expose
  global.KevaI18n = { init, t, setLang, getLang, apply };
  // auto-init
  document.addEventListener('DOMContentLoaded', ()=> init(current));
})(window);
