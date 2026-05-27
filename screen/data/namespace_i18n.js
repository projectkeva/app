import AsyncStorage from '@react-native-community/async-storage';
import RNFS from 'react-native-fs';

let loc = require('../../loc');

const CHAT_DIR = `${RNFS.DocumentDirectoryPath}/agent_chats`;
const LAST_ROLE_SPACE_PATH = `${CHAT_DIR}/_last_role_space.json`;
const LAST_STORY_SPACE_PATH = `${CHAT_DIR}/_last_story_space.json`;
const LAST_CHAT_SPACE_PATH = `${CHAT_DIR}/_last_chat_space.json`;

const SUPPORTED_LANGS = ['en', 'zh-cn', 'zh-tw', 'ja', 'ko', 'es', 'fr', 'zar-afr', 'hr-hr', 'cs-cz', 'da-dk', 'de', 'el', 'it', 'fi-fi', 'id-id', 'hu-hu', 'nl-nl', 'nb-no', 'pt-br', 'pt-pt', 'ru', 'sv-se', 'th-th', 'vi', 'ua', 'tr', 'zar-xho'];
const CACHE_TTL_MS = 1000;

export const normalizeNamespaceLang = lang => {
  const raw = String(lang || '').trim().toLowerCase().replace(/_/g, '-');
  const aliased = raw === 'zh' || raw === 'zh-hans'
    ? 'zh-cn'
    : raw === 'zh-hant'
      ? 'zh-tw'
      : raw === 'id'
        ? 'id-id'
        : raw === 'th'
          ? 'th-th'
          : raw;
  if (SUPPORTED_LANGS.includes(aliased)) return aliased;
  const base = aliased.split('-')[0];
  return SUPPORTED_LANGS.includes(base) ? base : 'en';
};


const getCurrentInterfaceLanguage = () =>
  (loc && typeof loc.getInterfaceLanguage === 'function' && loc.getInterfaceLanguage()) ||
  (loc && typeof loc.getLanguage === 'function' && loc.getLanguage()) ||
  'en';

const getDefaultNamespaceLang = () => normalizeNamespaceLang(getCurrentInterfaceLanguage() || 'en');

let cachedFallbackLang = getDefaultNamespaceLang();
let cachedFallbackAt = 0;
let pendingFallbackResolve = null;
const namespaceLangCache = new Map();

export const getRoleLangStorageKey = agentId => `role_lang_code_${encodeURIComponent(String(agentId || 'default'))}`;

const readLastSpaceRecord = async path => {
  try {
    const exists = await RNFS.exists(path);
    if (!exists) return null;
    return JSON.parse(await RNFS.readFile(path, 'utf8'));
  } catch (_) {
    return null;
  }
};

const normalizeNamespaceId = namespace => {
  const ns = namespace || {};
  return String(ns.shortCode || ns.namespaceId || ns.id || ns.agentId || '').trim();
};

const getNamespaceCandidates = namespace => {
  const ns = namespace || {};
  return [ns.shortCode, ns.namespaceId, ns.id, ns.agentId, ns.peerShortCode, ns.peerNamespaceId]
    .map(value => String(value || '').trim())
    .filter(Boolean);
};

export const NAMESPACE_UI_MESSAGES = {
  en: {
    profile: 'Profile',
    role: 'Role',
    chat: 'Chat',
    story: 'Story',
    message: 'Message',
    task: 'Task',
    room: 'Room',
    dna: 'DNA',
    wallet: 'Wallet',
    market: 'Market',
    asset: 'Asset',
    game: 'Game',
    link: 'Link',
    log: 'Log',
    more: 'More',
    agent: 'AGENT',
    roleSection: 'ROLE',
    storySection: 'STORY',
    avatar: 'Avatar',
    transfer: 'Transfer',
    sell: 'Trade',
    language: 'Language',
    model: 'Model',
    voice: 'Voice',
    memory: 'Memory',
    save: 'Save',
    load: 'Load',
    clone: 'Clone',
    clear: 'Clear',
    records: 'Records',
    timeline: 'Timeline',
    roleActionsOwnOnly: 'Role actions are available on your own namespaces.',
    openStory: 'Open Story',
  },
  'zh-cn': {
    profile: '档案',
    role: '角色',
    chat: '聊天',
    story: '故事',
    message: '消息',
    task: '任务',
    room: '房间',
    dna: 'DNA',
    wallet: '钱包',
    market: '市场',
    asset: '资产',
    game: '游戏',
    link: '链接',
    log: '日志',
    more: '更多',
    agent: '智能体',
    roleSection: '角色',
    storySection: '故事',
    avatar: '头像',
    transfer: '转移',
    sell: '交易',
    language: '语言',
    model: '模型',
    voice: '语音',
    memory: '记忆',
    save: '保存',
    load: '读取',
    clone: '克隆',
    clear: '清除',
    records: '记录',
    timeline: '时间线',
    roleActionsOwnOnly: '角色操作仅可用于自己的 namespace。',
    openStory: '打开故事',
  },
  'zh-tw': {
    profile: '檔案',
    role: '角色',
    chat: '聊天',
    story: '故事',
    message: '訊息',
    task: '任務',
    room: '房間',
    dna: 'DNA',
    wallet: '錢包',
    market: '市場',
    asset: '資產',
    game: '遊戲',
    link: '連結',
    log: '日誌',
    more: '更多',
    agent: '智能體',
    roleSection: '角色',
    storySection: '故事',
    avatar: '頭像',
    transfer: '轉移',
    sell: '交易',
    language: '語言',
    model: '模型',
    voice: '語音',
    memory: '記憶',
    save: '儲存',
    load: '讀取',
    clone: '複製',
    clear: '清除',
    records: '記錄',
    timeline: '時間線',
    roleActionsOwnOnly: '角色操作僅可用於自己的 namespace。',
    openStory: '打開故事',
  },
  ja: {
    profile: 'プロフィール',
    role: 'ロール',
    chat: 'チャット',
    story: 'ストーリー',
    message: 'メッセージ',
    task: 'タスク',
    room: 'ルーム',
    dna: 'DNA',
    wallet: 'ウォレット',
    market: '市場',
    asset: '資産',
    game: 'ゲーム',
    link: 'リンク',
    log: 'ログ',
    more: 'もっと',
    agent: 'エージェント',
    roleSection: 'ロール',
    storySection: 'ストーリー',
    avatar: 'Avatar',
    transfer: '転送',
    sell: '取引',
    language: '言語',
    model: 'モデル',
    voice: '音声',
    memory: '記憶',
    save: '保存',
    load: '読込',
    clone: 'クローン',
    clear: '消去',
    records: '記録',
    timeline: '時間線',
    roleActionsOwnOnly: 'ロール操作は自分の namespace でのみ使えます。',
    openStory: 'ストーリーを開く',
  },
  ko: {
    profile: '프로필',
    role: '역할',
    chat: '채팅',
    story: '스토리',
    message: '메시지',
    task: '작업',
    room: '방',
    dna: 'DNA',
    wallet: '지갑',
    market: '시장',
    asset: '자산',
    game: '게임',
    link: '링크',
    log: '로그',
    more: '더보기',
    agent: '에이전트',
    roleSection: '역할',
    storySection: '스토리',
    avatar: 'Avatar',
    transfer: '이전',
    sell: '거래',
    language: '언어',
    model: '모델',
    voice: '음성',
    memory: '기억',
    save: '저장',
    load: '불러오기',
    clone: '복제',
    clear: '초기화',
    records: '기록',
    timeline: '타임라인',
    roleActionsOwnOnly: '역할 작업은 내 namespace에서만 사용할 수 있습니다.',
    openStory: '스토리 열기',
  },
  es: {
    profile: 'Perfil',
    role: 'Rol',
    chat: 'Chat',
    story: 'Historia',
    message: 'Mensaje',
    task: 'Tarea',
    room: 'Sala',
    dna: 'DNA',
    wallet: 'Cartera',
    market: 'Mercado',
    asset: 'Activo',
    game: 'Juego',
    link: 'Enlace',
    log: 'Registro',
    more: 'Más',
    agent: 'AGENTE',
    roleSection: 'ROL',
    storySection: 'HISTORIA',
    avatar: 'Avatar',
    transfer: 'Transferir',
    sell: 'Intercambiar',
    language: 'Idioma',
    model: 'Modelo',
    voice: 'Voz',
    memory: 'Memoria',
    save: 'Guardar',
    load: 'Cargar',
    clone: 'Clonar',
    clear: 'Borrar',
    records: 'Registros',
    timeline: 'Línea',
    roleActionsOwnOnly: 'Las acciones de rol solo están disponibles en tus namespaces.',
    openStory: 'Abrir historia',
  },
  fr: {
    profile: 'Profil',
    role: 'Rôle',
    chat: 'Chat',
    story: 'Histoire',
    message: 'Message',
    task: 'Tâche',
    room: 'Salon',
    dna: 'ADN',
    wallet: 'Wallet',
    market: 'Marché',
    asset: 'Actif',
    game: 'Jeu',
    link: 'Lien',
    log: 'Journal',
    more: 'Plus',
    agent: 'AGENT',
    roleSection: 'RÔLE',
    storySection: 'HISTOIRE',
    avatar: 'Avatar',
    transfer: 'Transférer',
    sell: 'Échanger',
    language: 'Langue',
    model: 'Modèle',
    voice: 'Voix',
    memory: 'Mémoire',
    save: 'Sauver',
    load: 'Charger',
    clone: 'Cloner',
    clear: 'Effacer',
    records: 'Archives',
    timeline: 'Chronologie',
    roleActionsOwnOnly: 'Les actions de rôle sont disponibles sur vos propres namespaces.',
    openStory: 'Ouvrir l’histoire',
  },
};

export const NAMESPACE_ACTION_KEYS = {
  Profile: 'profile',
  Role: 'role',
  Chat: 'chat',
  Story: 'story',
  Message: 'message',
  Task: 'task',
  Room: 'room',
  DNA: 'dna',
  Wallet: 'wallet',
  Market: 'market',
  Asset: 'asset',
  Game: 'game',
  Link: 'link',
  Log: 'log',
  More: 'more',
};

export const NAMESPACE_FILTER_MESSAGES = {
  en: { TEXT: 'Text', ROLE: 'Role', STORY: 'Story', ALL: 'All', COMMENT: 'Comment', SHARE: 'Share' },
  'zh-cn': { TEXT: '文本', ROLE: '角色', STORY: '故事', ALL: '全部', COMMENT: '评论', SHARE: '分享' },
  'zh-tw': { TEXT: '文本', ROLE: '角色', STORY: '故事', ALL: '全部', COMMENT: '評論', SHARE: '分享' },
  ja: { TEXT: 'テキスト', ROLE: 'ロール', STORY: 'ストーリー', ALL: 'すべて', COMMENT: 'コメント', SHARE: '共有' },
  ko: { TEXT: '텍스트', ROLE: '역할', STORY: '스토리', ALL: '전체', COMMENT: '댓글', SHARE: '공유' },
  es: { TEXT: 'Texto', ROLE: 'Rol', STORY: 'Historia', ALL: 'Todo', COMMENT: 'Comentario', SHARE: 'Compartir' },
  fr: { TEXT: 'Texte', ROLE: 'Rôle', STORY: 'Histoire', ALL: 'Tout', COMMENT: 'Commentaire', SHARE: 'Partager' },
  'zar-afr': { TEXT: 'Teks', ROLE: 'Rol', STORY: 'Storie', ALL: 'Alles', COMMENT: 'Kommentaar', SHARE: 'Deel' },
  'hr-hr': { TEXT: 'Tekst', ROLE: 'Uloga', STORY: 'Priča', ALL: 'Sve', COMMENT: 'Komentar', SHARE: 'Podijeli' },
  'cs-cz': { TEXT: 'Text', ROLE: 'Role', STORY: 'Příběh', ALL: 'Vše', COMMENT: 'Komentář', SHARE: 'Sdílet' },
  'da-dk': { TEXT: 'Tekst', ROLE: 'Rolle', STORY: 'Historie', ALL: 'Alle', COMMENT: 'Kommentar', SHARE: 'Del' },
  de: { TEXT: 'Text', ROLE: 'Rolle', STORY: 'Geschichte', ALL: 'Alle', COMMENT: 'Kommentar', SHARE: 'Teilen' },
  el: { TEXT: 'Κείμενο', ROLE: 'Ρόλος', STORY: 'Ιστορία', ALL: 'Όλα', COMMENT: 'Σχόλιο', SHARE: 'Κοινοποίηση' },
  it: { TEXT: 'Testo', ROLE: 'Ruolo', STORY: 'Storia', ALL: 'Tutti', COMMENT: 'Commento', SHARE: 'Condividi' },
  'fi-fi': { TEXT: 'Teksti', ROLE: 'Rooli', STORY: 'Tarina', ALL: 'Kaikki', COMMENT: 'Kommentti', SHARE: 'Jaa' },
  'id-id': { TEXT: 'Teks', ROLE: 'Peran', STORY: 'Cerita', ALL: 'Semua', COMMENT: 'Komentar', SHARE: 'Bagikan' },
  'hu-hu': { TEXT: 'Szöveg', ROLE: 'Szerep', STORY: 'Történet', ALL: 'Összes', COMMENT: 'Megjegyzés', SHARE: 'Megosztás' },
  'nl-nl': { TEXT: 'Tekst', ROLE: 'Rol', STORY: 'Verhaal', ALL: 'Alles', COMMENT: 'Reactie', SHARE: 'Delen' },
  'nb-no': { TEXT: 'Tekst', ROLE: 'Rolle', STORY: 'Historie', ALL: 'Alle', COMMENT: 'Kommentar', SHARE: 'Del' },
  'pt-br': { TEXT: 'Texto', ROLE: 'Papel', STORY: 'História', ALL: 'Tudo', COMMENT: 'Comentário', SHARE: 'Compartilhar' },
  'pt-pt': { TEXT: 'Texto', ROLE: 'Papel', STORY: 'História', ALL: 'Tudo', COMMENT: 'Comentário', SHARE: 'Partilhar' },
  ru: { TEXT: 'Текст', ROLE: 'Роль', STORY: 'История', ALL: 'Все', COMMENT: 'Комментарий', SHARE: 'Поделиться' },
  'sv-se': { TEXT: 'Text', ROLE: 'Roll', STORY: 'Berättelse', ALL: 'Alla', COMMENT: 'Kommentar', SHARE: 'Dela' },
  'th-th': { TEXT: 'ข้อความ', ROLE: 'บทบาท', STORY: 'เรื่องราว', ALL: 'ทั้งหมด', COMMENT: 'ความคิดเห็น', SHARE: 'แชร์' },
  vi: { TEXT: 'Văn bản', ROLE: 'Vai trò', STORY: 'Câu chuyện', ALL: 'Tất cả', COMMENT: 'Bình luận', SHARE: 'Chia sẻ' },
  ua: { TEXT: 'Текст', ROLE: 'Роль', STORY: 'Історія', ALL: 'Усе', COMMENT: 'Коментар', SHARE: 'Поділитися' },
  tr: { TEXT: 'Metin', ROLE: 'Rol', STORY: 'Hikâye', ALL: 'Tümü', COMMENT: 'Yorum', SHARE: 'Paylaş' },
  'zar-xho': { TEXT: 'Umbhalo', ROLE: 'Indima', STORY: 'Ibali', ALL: 'Zonke', COMMENT: 'Izimvo', SHARE: 'Yabelana' },
};

export const getCachedNamespaceUiLang = namespace => {
  const id = normalizeNamespaceId(namespace);
  if (id && namespaceLangCache.has(id)) return namespaceLangCache.get(id).lang;
  return cachedFallbackLang;
};

export const getNamespaceText = (key, lang) => {
  const messageKey = NAMESPACE_ACTION_KEYS[key] || key;
  const normalized = normalizeNamespaceLang(lang || cachedFallbackLang);
  const messages = NAMESPACE_UI_MESSAGES[normalized] || NAMESPACE_UI_MESSAGES.en;
  return messages[messageKey] || NAMESPACE_UI_MESSAGES.en[messageKey] || key;
};

export const getNamespaceFilterText = (mode, lang) => {
  const normalized = normalizeNamespaceLang(lang || cachedFallbackLang);
  const messages = NAMESPACE_FILTER_MESSAGES[normalized] || NAMESPACE_FILTER_MESSAGES.en;
  return messages[mode] || NAMESPACE_FILTER_MESSAGES.en[mode] || mode;
};

const resolveFallbackLanguage = async (force = false) => {
  const now = Date.now();
  if (!force && now - cachedFallbackAt < CACHE_TTL_MS) return cachedFallbackLang;
  if (pendingFallbackResolve) return pendingFallbackResolve;

  pendingFallbackResolve = (async () => {
    try {
      const records = await Promise.all([
        readLastSpaceRecord(LAST_ROLE_SPACE_PATH),
        readLastSpaceRecord(LAST_CHAT_SPACE_PATH),
        readLastSpaceRecord(LAST_STORY_SPACE_PATH),
      ]);
      const candidates = records
        .filter(Boolean)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
        .flatMap(record => [record.agentId, record.shortCode, record.namespaceId, record.peerShortCode, record.peerNamespaceId])
        .filter(Boolean);
      candidates.push('default');

      const seen = new Set();
      for (const candidate of candidates) {
        const key = String(candidate || '').trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const stored = await AsyncStorage.getItem(getRoleLangStorageKey(key));
        if (stored) {
          cachedFallbackLang = normalizeNamespaceLang(stored);
          cachedFallbackAt = Date.now();
          return cachedFallbackLang;
        }
      }
    } catch (_) {}

    cachedFallbackLang = getDefaultNamespaceLang();
    cachedFallbackAt = Date.now();
    return cachedFallbackLang;
  })();

  try {
    return await pendingFallbackResolve;
  } finally {
    pendingFallbackResolve = null;
  }
};

export const resolveNamespaceUiLanguage = async (namespace, force = false) => {
  const id = normalizeNamespaceId(namespace);
  const now = Date.now();
  const cached = id ? namespaceLangCache.get(id) : null;
  if (!force && cached && now - cached.at < CACHE_TTL_MS) return cached.lang;

  try {
    const candidates = getNamespaceCandidates(namespace);
    candidates.push('default');
    const seen = new Set();
    for (const candidate of candidates) {
      const key = String(candidate || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const stored = await AsyncStorage.getItem(getRoleLangStorageKey(key));
      if (stored) {
        const lang = normalizeNamespaceLang(stored);
        if (id) namespaceLangCache.set(id, { lang, at: Date.now() });
        cachedFallbackLang = lang;
        cachedFallbackAt = Date.now();
        return lang;
      }
    }
  } catch (_) {}

  const fallback = await resolveFallbackLanguage(force);
  if (id) namespaceLangCache.set(id, { lang: fallback, at: Date.now() });
  return fallback;
};
