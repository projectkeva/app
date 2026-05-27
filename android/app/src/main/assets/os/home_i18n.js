// Home desktop i18n. Defaults to English and follows the Role language pushed by HomeScreen.
(function(global){
  const DEFAULT_LANG = 'en';

  const TEXT = {
    en: {
        apps: {
            keva: "Node",
            wallet: "Wallet",
            chat: "Chat",
            message: "Message",
            download: "Download",
            role: "Role",
            story: "Story",
            room: "Room",
            id: "Agent ID",
            getagents: "Get ID",
            alpha: "Alpha",
            setting: "Setting",
            blog: "Blog",
            pool: "Pool",
            exchange: "Exchange",
            satoshi: "Satoshi",
            bitcoin: "Bitcoin",
            dogecoin: "Dogecoin",
            ethereum: "Ethereum",
            chia: "Chia",
            monero: "Monero",
            kevacoin: "KevaCoin",
            ravencoin: "Ravencoin",
            readme: "Read me!"
        },
        ui: {
            start: "Start",
            settingsIntro: "Choose language:",
            languageApply: "Apply",
            languageApplied: "Applied",
            customWebsites: "Custom websites",
            customNamePlaceholder: "Name",
            customUrlPlaceholder: "https://example.com",
            add: "Add",
            delete: "Delete",
            noCustomWebsites: "No custom websites yet.",
            downloadsTitle: "Downloads",
            readmeTitle: "README",
            agentsTitle: "Project KEVA Agents",
            nodeCurrent: "Current: {address}",
            nodeHeight: "height: {height}",
            nodeUsing: "Using",
            nodeUse: "Use",
            nodeRefresh: "Refresh",
            nodeRefreshCooldown: "Refresh ({seconds}s)"
        },
        languageNames: {
            en: "English",
            "zh-cn": "Simplified Chinese",
            "zh-tw": "Traditional Chinese",
            ja: "Japanese",
            ko: "Korean",
            es: "Spanish",
            fr: "French"
        },
        alerts: {
            roleShortcutNativeOnly: "Role shortcut is only available inside the Kevacoin app.",
            storyShortcutNativeOnly: "Story shortcut is only available inside the Kevacoin app.",
            getAgentsNativeOnly: "Get ID is only available inside the Kevacoin app.",
            guestMessagesNativeOnly: "Guest messages are only available inside the Kevacoin app.",
            chatShortcutNativeOnly: "Chat shortcut is only available inside the Kevacoin app.",
            walletsNativeOnly: "Wallets are only available inside the Kevacoin app."
        }
    },
    "zh-cn": {
        apps: {
            keva: "节点",
            wallet: "钱包",
            chat: "聊天",
            message: "消息",
            download: "下载",
            role: "角色",
            story: "故事",
            room: "房间",
            id: "Agent ID",
            getagents: "获取 ID",
            alpha: "Alpha",
            setting: "设置",
            blog: "博客",
            pool: "矿池",
            exchange: "交易所",
            satoshi: "Satoshi",
            bitcoin: "Bitcoin",
            dogecoin: "Dogecoin",
            ethereum: "Ethereum",
            chia: "Chia",
            monero: "Monero",
            kevacoin: "KevaCoin",
            ravencoin: "Ravencoin",
            readme: "读我"
        },
        ui: {
            start: "开始",
            settingsIntro: "选择语言：",
            languageApply: "应用",
            languageApplied: "已应用",
            customWebsites: "自定义网站",
            customNamePlaceholder: "名称",
            customUrlPlaceholder: "https://example.com",
            add: "添加",
            delete: "删除",
            noCustomWebsites: "还没有自定义网站。",
            downloadsTitle: "下载",
            readmeTitle: "读我",
            agentsTitle: "Project KEVA Agents",
            nodeCurrent: "当前：{address}",
            nodeHeight: "高度：{height}",
            nodeUsing: "使用中",
            nodeUse: "使用",
            nodeRefresh: "刷新",
            nodeRefreshCooldown: "刷新（{seconds}s）"
        },
        languageNames: {
            en: "英文",
            "zh-cn": "简体中文",
            "zh-tw": "繁体中文",
            ja: "日文",
            ko: "韩文",
            es: "西班牙文",
            fr: "法文"
        },
        alerts: {
            roleShortcutNativeOnly: "Role 快捷方式只能在 Kevacoin app 内使用。",
            storyShortcutNativeOnly: "Story 快捷方式只能在 Kevacoin app 内使用。",
            getAgentsNativeOnly: "Get Agents 只能在 Kevacoin app 内使用。",
            guestMessagesNativeOnly: "访客消息只能在 Kevacoin app 内使用。",
            chatShortcutNativeOnly: "Chat 快捷方式只能在 Kevacoin app 内使用。",
            walletsNativeOnly: "钱包只能在 Kevacoin app 内使用。"
        }
    },
    "zh-tw": {
        apps: {
            keva: "節點",
            wallet: "錢包",
            chat: "聊天",
            message: "訊息",
            download: "下載",
            role: "角色",
            story: "故事",
            room: "房間",
            id: "Agent ID",
            getagents: "取得 ID",
            alpha: "Alpha",
            setting: "設定",
            blog: "部落格",
            pool: "礦池",
            exchange: "交易所",
            satoshi: "Satoshi",
            bitcoin: "Bitcoin",
            dogecoin: "Dogecoin",
            ethereum: "Ethereum",
            chia: "Chia",
            monero: "Monero",
            kevacoin: "KevaCoin",
            ravencoin: "Ravencoin",
            readme: "讀我"
        },
        ui: {
            start: "開始",
            settingsIntro: "選擇語言：",
            languageApply: "套用",
            languageApplied: "已套用",
            customWebsites: "自訂網站",
            customNamePlaceholder: "名稱",
            customUrlPlaceholder: "https://example.com",
            add: "新增",
            delete: "刪除",
            noCustomWebsites: "還沒有自訂網站。",
            downloadsTitle: "下載",
            readmeTitle: "讀我",
            agentsTitle: "Project KEVA Agents",
            nodeCurrent: "目前：{address}",
            nodeHeight: "高度：{height}",
            nodeUsing: "使用中",
            nodeUse: "使用",
            nodeRefresh: "重新整理",
            nodeRefreshCooldown: "重新整理（{seconds}s）"
        },
        languageNames: {
            en: "英文",
            "zh-cn": "簡體中文",
            "zh-tw": "繁體中文",
            ja: "日文",
            ko: "韓文",
            es: "西班牙文",
            fr: "法文"
        },
        alerts: {
            roleShortcutNativeOnly: "Role 捷徑只能在 Kevacoin app 內使用。",
            storyShortcutNativeOnly: "Story 捷徑只能在 Kevacoin app 內使用。",
            getAgentsNativeOnly: "Get Agents 只能在 Kevacoin app 內使用。",
            guestMessagesNativeOnly: "訪客訊息只能在 Kevacoin app 內使用。",
            chatShortcutNativeOnly: "Chat 捷徑只能在 Kevacoin app 內使用。",
            walletsNativeOnly: "錢包只能在 Kevacoin app 內使用。"
        }
    },
    ja: {
        apps: {
            keva: "ノード",
            wallet: "ウォレット",
            chat: "チャット",
            message: "メッセージ",
            download: "ダウンロード",
            role: "ロール",
            story: "ストーリー",
            room: "ルーム",
            id: "Agent ID",
            getagents: "Get ID",
            alpha: "Alpha",
            setting: "設定",
            satoshi: "Satoshi",
            readme: "Read me!",
            blog: "ブログ",
            pool: "プール",
            exchange: "取引所",
            bitcoin: "Bitcoin",
            dogecoin: "Dogecoin",
            ethereum: "Ethereum",
            chia: "Chia",
            monero: "Monero",
            kevacoin: "KevaCoin",
            ravencoin: "Ravencoin"
        },
        ui: {
            start: "開始",
            settingsIntro: "言語を選択：",
            languageApply: "適用",
            languageApplied: "適用済み",
            customWebsites: "カスタムサイト",
            customNamePlaceholder: "名前",
            add: "追加",
            delete: "削除",
            noCustomWebsites: "カスタムサイトはまだありません。",
            downloadsTitle: "ダウンロード",
            readmeTitle: "README",
            agentsTitle: "Project KEVA Agents",
            nodeCurrent: "現在: {address}",
            nodeHeight: "height: {height}",
            nodeUsing: "使用中",
            nodeUse: "使用",
            nodeRefresh: "更新",
            nodeRefreshCooldown: "更新 ({seconds}s)",
            customUrlPlaceholder: "https://example.com"
        },
        languageNames: {
            en: "英語",
            "zh-cn": "簡体字中国語",
            "zh-tw": "繁体字中国語",
            ja: "日本語",
            ko: "韓国語",
            es: "スペイン語",
            fr: "フランス語"
        },
        alerts: {
            roleShortcutNativeOnly: "Role ショートカットは Kevacoin app 内でのみ使用できます。",
            storyShortcutNativeOnly: "Story ショートカットは Kevacoin app 内でのみ使用できます。",
            getAgentsNativeOnly: "Get ID は Kevacoin app 内でのみ使用できます。",
            guestMessagesNativeOnly: "ゲストメッセージは Kevacoin app 内でのみ使用できます。",
            chatShortcutNativeOnly: "Chat ショートカットは Kevacoin app 内でのみ使用できます。",
            walletsNativeOnly: "ウォレットは Kevacoin app 内でのみ使用できます。"
        }
    },
    ko: {
        apps: {
            keva: "노드",
            wallet: "지갑",
            chat: "채팅",
            message: "메시지",
            download: "다운로드",
            role: "역할",
            story: "스토리",
            room: "Room",
            id: "Agent ID",
            getagents: "Get ID",
            alpha: "Alpha",
            setting: "설정",
            satoshi: "Satoshi",
            readme: "Read me!",
            blog: "블로그",
            pool: "풀",
            exchange: "거래소",
            bitcoin: "Bitcoin",
            dogecoin: "Dogecoin",
            ethereum: "Ethereum",
            chia: "Chia",
            monero: "Monero",
            kevacoin: "KevaCoin",
            ravencoin: "Ravencoin"
        },
        ui: {
            start: "시작",
            settingsIntro: "언어 선택:",
            languageApply: "적용",
            languageApplied: "적용됨",
            customWebsites: "사용자 웹사이트",
            customNamePlaceholder: "이름",
            add: "추가",
            delete: "삭제",
            noCustomWebsites: "사용자 웹사이트가 없습니다.",
            downloadsTitle: "다운로드",
            readmeTitle: "README",
            agentsTitle: "Project KEVA Agents",
            nodeCurrent: "현재: {address}",
            nodeHeight: "height: {height}",
            nodeUsing: "사용 중",
            nodeUse: "사용",
            nodeRefresh: "새로고침",
            nodeRefreshCooldown: "새로고침 ({seconds}s)",
            customUrlPlaceholder: "https://example.com"
        },
        languageNames: {
            en: "영어",
            "zh-cn": "중국어 간체",
            "zh-tw": "중국어 번체",
            ja: "일본어",
            ko: "한국어",
            es: "스페인어",
            fr: "프랑스어"
        },
        alerts: {
            roleShortcutNativeOnly: "Role 바로가기는 Kevacoin app 안에서만 사용할 수 있습니다.",
            storyShortcutNativeOnly: "Story 바로가기는 Kevacoin app 안에서만 사용할 수 있습니다.",
            getAgentsNativeOnly: "Get ID는 Kevacoin app 안에서만 사용할 수 있습니다.",
            guestMessagesNativeOnly: "게스트 메시지는 Kevacoin app 안에서만 사용할 수 있습니다.",
            chatShortcutNativeOnly: "Chat 바로가기는 Kevacoin app 안에서만 사용할 수 있습니다.",
            walletsNativeOnly: "지갑은 Kevacoin app 안에서만 사용할 수 있습니다."
        }
    },
    es: {
        apps: {
            keva: "Nodo",
            wallet: "Wallet",
            chat: "Chat",
            message: "Mensaje",
            download: "Descargas",
            role: "Rol",
            story: "Historia",
            room: "Room",
            id: "Agent ID",
            getagents: "Get ID",
            alpha: "Alpha",
            setting: "Ajustes",
            satoshi: "Satoshi",
            readme: "Read me!",
            blog: "Blog",
            pool: "Pool",
            exchange: "Exchange",
            bitcoin: "Bitcoin",
            dogecoin: "Dogecoin",
            ethereum: "Ethereum",
            chia: "Chia",
            monero: "Monero",
            kevacoin: "KevaCoin",
            ravencoin: "Ravencoin"
        },
        ui: {
            start: "Inicio",
            settingsIntro: "Elige idioma:",
            languageApply: "Aplicar",
            languageApplied: "Aplicado",
            customWebsites: "Sitios personalizados",
            customNamePlaceholder: "Nombre",
            add: "Añadir",
            delete: "Eliminar",
            noCustomWebsites: "Aún no hay sitios personalizados.",
            downloadsTitle: "Descargas",
            readmeTitle: "README",
            agentsTitle: "Project KEVA Agents",
            nodeCurrent: "Actual: {address}",
            nodeHeight: "altura: {height}",
            nodeUsing: "En uso",
            nodeUse: "Usar",
            nodeRefresh: "Actualizar",
            nodeRefreshCooldown: "Actualizar ({seconds}s)",
            customUrlPlaceholder: "https://example.com"
        },
        languageNames: {
            en: "Inglés",
            "zh-cn": "Chino simplificado",
            "zh-tw": "Chino tradicional",
            ja: "Japonés",
            ko: "Coreano",
            es: "Español",
            fr: "Francés"
        },
        alerts: {
            roleShortcutNativeOnly: "El acceso directo Role solo está disponible dentro de Kevacoin app.",
            storyShortcutNativeOnly: "El acceso directo Story solo está disponible dentro de Kevacoin app.",
            getAgentsNativeOnly: "Get ID solo está disponible dentro de Kevacoin app.",
            guestMessagesNativeOnly: "Los mensajes de invitados solo están disponibles dentro de Kevacoin app.",
            chatShortcutNativeOnly: "El acceso directo Chat solo está disponible dentro de Kevacoin app.",
            walletsNativeOnly: "Wallets solo está disponible dentro de Kevacoin app."
        }
    },
    fr: {
        apps: {
            keva: "Nœud",
            wallet: "Wallet",
            chat: "Chat",
            message: "Message",
            download: "Téléchargements",
            role: "Rôle",
            story: "Histoire",
            room: "Room",
            id: "Agent ID",
            getagents: "Get ID",
            alpha: "Alpha",
            setting: "Réglages",
            satoshi: "Satoshi",
            readme: "Read me!",
            blog: "Blog",
            pool: "Pool",
            exchange: "Exchange",
            bitcoin: "Bitcoin",
            dogecoin: "Dogecoin",
            ethereum: "Ethereum",
            chia: "Chia",
            monero: "Monero",
            kevacoin: "KevaCoin",
            ravencoin: "Ravencoin"
        },
        ui: {
            start: "Démarrer",
            settingsIntro: "Choisir la langue :",
            languageApply: "Appliquer",
            languageApplied: "Appliqué",
            customWebsites: "Sites personnalisés",
            customNamePlaceholder: "Nom",
            add: "Ajouter",
            delete: "Supprimer",
            noCustomWebsites: "Aucun site personnalisé.",
            downloadsTitle: "Téléchargements",
            readmeTitle: "README",
            agentsTitle: "Project KEVA Agents",
            nodeCurrent: "Actuel : {address}",
            nodeHeight: "hauteur : {height}",
            nodeUsing: "Utilisé",
            nodeUse: "Utiliser",
            nodeRefresh: "Actualiser",
            nodeRefreshCooldown: "Actualiser ({seconds}s)",
            customUrlPlaceholder: "https://example.com"
        },
        languageNames: {
            en: "Anglais",
            "zh-cn": "Chinois simplifié",
            "zh-tw": "Chinois traditionnel",
            ja: "Japonais",
            ko: "Coréen",
            es: "Espagnol",
            fr: "Français"
        },
        alerts: {
            roleShortcutNativeOnly: "Le raccourci Role est disponible uniquement dans Kevacoin app.",
            storyShortcutNativeOnly: "Le raccourci Story est disponible uniquement dans Kevacoin app.",
            getAgentsNativeOnly: "Get ID est disponible uniquement dans Kevacoin app.",
            guestMessagesNativeOnly: "Les messages invités sont disponibles uniquement dans Kevacoin app.",
            chatShortcutNativeOnly: "Le raccourci Chat est disponible uniquement dans Kevacoin app.",
            walletsNativeOnly: "Wallets est disponible uniquement dans Kevacoin app."
        }
    }
};

  const ALIASES = {
    zh: 'zh-cn',
    'zh-hans': 'zh-cn',
    'zh_cn': 'zh-cn',
    'zh-hant': 'zh-tw',
    'zh_tw': 'zh-tw',
    pt: 'pt-br',
  };

  let current = DEFAULT_LANG;

  const FIXED_LANGUAGE_NAMES = {
    en: 'English',
    'zh-cn': '简体中文',
    'zh-tw': '繁體中文',
    ja: '日本語',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
  };

  function normalizeLanguage(lang){
    const raw = String(lang || '').trim().toLowerCase();
    const aliased = ALIASES[raw] || raw;
    if (TEXT[aliased]) return aliased;
    const base = aliased.split('-')[0];
    return TEXT[base] ? base : DEFAULT_LANG;
  }

  function deepGet(obj, path){
    return String(path || '').split('.').reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), obj);
  }

  function format(text, vars){
    let out = String(text || '');
    Object.keys(vars || {}).forEach(key => {
      out = out.replace(new RegExp('\\{' + key + '\\}', 'g'), String(vars[key]));
    });
    return out;
  }

  function t(key, vars){
    const langText = TEXT[current] || TEXT[DEFAULT_LANG];
    const fallbackText = TEXT[DEFAULT_LANG];
    const value = deepGet(langText, key);
    const fallback = deepGet(fallbackText, key);
    return format(value === undefined ? (fallback === undefined ? key : fallback) : value, vars || {});
  }

  function replaceLabelText(label, text){
    if (!label) return;
    const input = label.querySelector('input');
    label.textContent = '';
    if (input) label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + text));
  }

  function apply(root){
    const doc = root || document;
    doc.documentElement.lang = current;

    doc.querySelectorAll('.icon[data-app]:not([data-custom="true"])').forEach(icon => {
      const app = icon.getAttribute('data-app');
      const span = icon.querySelector('span');
      if (span) span.textContent = t('apps.' + app);
    });

    doc.querySelectorAll('[data-visibility-toggle]').forEach(input => {
      const app = input.getAttribute('data-app');
      const label = input.closest('label');
      if (label) replaceLabelText(label, t('apps.' + app));
    });

    const start = doc.querySelector('.taskbar .start');
    if (start) start.textContent = t('ui.start');

    const settingsTitle = doc.querySelector('#settingsWindow .title-bar span');
    if (settingsTitle) settingsTitle.textContent = t('apps.setting');
    const settingsIntro = doc.querySelector('#settingsWindow .content > p');
    if (settingsIntro) settingsIntro.textContent = t('ui.settingsIntro');
    const customTitle = doc.querySelector('.custom-links-section h4');
    if (customTitle) customTitle.textContent = t('ui.customWebsites');
    const nameInput = doc.getElementById('customNameInput');
    if (nameInput) nameInput.setAttribute('placeholder', t('ui.customNamePlaceholder'));
    const urlInput = doc.getElementById('customUrlInput');
    if (urlInput) urlInput.setAttribute('placeholder', t('ui.customUrlPlaceholder'));
    const customSubmit = doc.querySelector('#customLinkForm button[type="submit"]');
    if (customSubmit) customSubmit.textContent = t('ui.add');
    doc.querySelectorAll('[data-language-label]').forEach(span => {
      const code = span.getAttribute('data-language-label');
      span.textContent = FIXED_LANGUAGE_NAMES[code] || code;
    });
    const languageApply = doc.getElementById('homeLanguageApply');
    if (languageApply) languageApply.textContent = t('ui.languageApply');
    doc.querySelectorAll('button[data-remove]').forEach(button => {
      button.textContent = t('ui.delete');
    });
    doc.querySelectorAll('.custom-link-empty').forEach(empty => {
      empty.textContent = t('ui.noCustomWebsites');
    });
    const nodeRefresh = doc.getElementById('nodeRefresh');
    if (nodeRefresh && !nodeRefresh.disabled) nodeRefresh.textContent = t('ui.nodeRefresh');

    const readmeTitle = doc.querySelector('#readmeWindow .title-bar span');
    if (readmeTitle) readmeTitle.textContent = t('ui.readmeTitle');
    const downloadTitle = doc.querySelector('#downloadWindow .title-bar span');
    if (downloadTitle) downloadTitle.textContent = t('ui.downloadsTitle');
    const agentsTitle = doc.querySelector('#agentsWindow .title-bar span');
    if (agentsTitle) agentsTitle.textContent = t('ui.agentsTitle');
    const alphaTitle = doc.querySelector('#alphaWindow .title-bar span');
    if (alphaTitle) alphaTitle.textContent = t('apps.alpha');
    const nodeTitle = doc.querySelector('#nodeWindow .title-bar span');
    if (nodeTitle) nodeTitle.textContent = t('apps.keva');
  }

  function setLanguage(lang){
    current = normalizeLanguage(lang);
    apply(document);
    try { window.dispatchEvent(new CustomEvent('home-language-changed', { detail: { lang: current } })); } catch (_) {}
  }

  function getLanguage(){ return current; }

  global.HomeI18n = { setLanguage, getLanguage, normalizeLanguage, t, apply };
  document.addEventListener('DOMContentLoaded', () => setLanguage(DEFAULT_LANG));
})(window);
