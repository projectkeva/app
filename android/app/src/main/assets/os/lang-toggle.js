
(function(){
  const order = ['en','zh','zh-Hant'];
  function nextLang(current){
    const i = order.indexOf(current);
    return order[(i+1) % order.length];
  }
  function labelOf(lang){
    if (lang==='en') return 'EN';
    if (lang==='zh') return '中';
    if (lang==='zh-Hant') return '繁';
    return lang;
  }
  function ensureButton(){
    let btn = document.getElementById('keva-lang-toggle');
    if (!btn){
      btn = document.createElement('div');
      btn.id = 'keva-lang-toggle';
      document.body.appendChild(btn);
    }
    btn.textContent = labelOf(KevaI18n.getLang());
    btn.onclick = async ()=>{
      const lang = nextLang(KevaI18n.getLang());
      await KevaI18n.setLang(lang);
      btn.textContent = labelOf(lang);
    };
  }
  document.addEventListener('DOMContentLoaded', ensureButton);
})();
