import React from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Alert,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-elements';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
import CryptoJS from 'crypto-js';
import { decode as b64decode } from 'base-64';
let BlueElectrum = require('../../BlueElectrum');
let BlueApp = require('../../BlueApp');
const StyleSheet = require('../../PlatformStyleSheet');
const KevaColors = require('../../common/KevaColors');
import { BlueNavigationStyle } from '../../BlueComponents';
let loc = require('../../loc');
const Rolecards = require('./agentchat_rolecards');
const Roleplay = require('./agentchat_roleplay');
import { attachAgentChatLLM } from './agentchat_llm';
import { LLM_PROVIDERS } from './agentchat_llm_providers';
import { buildHeadAssetUri } from '../../common/namespaceAvatar';
import { getUserAvatarUri } from '../../common/userAvatar';
const SATOSHI_PRE_LLM_AVATAR_SOURCE = require('../../android/app/src/main/assets/os/theme/retro/icons/satoshi-avatar.png');
import { getInitials, showStatus, stringToColor, timeConverter } from '../../util';
import ActionSheet from '../ActionSheet';
import { decodeBase64, deleteKeyValue, getNamespaceScriptHash, toScriptHash, updateKeyValue } from '../../class/keva-ops';
import { FALLBACK_DATA_PER_BYTE_FEE } from '../../models/networkTransactionFees';

const CHAT_DIR = `${RNFS.DocumentDirectoryPath}/agent_chats`;
const LAST_CHAT_SPACE_PATH = `${CHAT_DIR}/_last_chat_space.json`;
const LLM_DIR = `${RNFS.DocumentDirectoryPath}/llm`;

const LLM_BUILTIN_PATH = `${LLM_DIR}/builtin.json`;
const LLM_CUSTOM_PATH = `${LLM_DIR}/custom.json`;
const LLM_ACTIVE_PATH = `${LLM_DIR}/active.json`;
const LLM_LAST_USED_PATH = `${LLM_DIR}/last_used.json`;
const STORY_LANG_CODE_STORAGE_KEY = 'story_lang_code';
const STORY_SUPPORTED_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh-cn', label: '中文（简体）' },
  { code: 'zh-tw', label: '中文（繁體）' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt-br', label: 'Português (Brasil)' },
  { code: 'ru', label: 'Русский' },
];

const LOCAL_NAMESPACE_AVATAR_DIR = `${RNFS.DocumentDirectoryPath}/namespace_avatars`;
const getNamespaceAvatarPath = namespaceId => `${LOCAL_NAMESPACE_AVATAR_DIR}/${encodeURIComponent(String(namespaceId || 'unknown'))}.jpg`;

// 可选：如果你未来要“每个 agent 绑定不同模型”，再用它
const getLLMOverridePath = agentId => `${LLM_DIR}/overrides_${encodeURIComponent(agentId)}.json`;
const LLM_HISTORY_LIMIT = 16;
const DEFAULT_AUTH_HEADER = apiKey => (apiKey ? { Authorization: `Bearer ${apiKey}` } : {});

function getAgentIdFromParams(params = {}) {
  // 聊天只绑定 agent 身份，不要跟 walletId / 页面路径耦合
  return (params.shortCode || params.namespaceId || params.agentId || 'default').toString();
}

const COMMAND_TOKEN_REGEX =
  /\/(?:r|welcome|m)\b(?:\s+<[^>\n]+>)?(?:\s+(?!—)[^\/\n—,]+)?|\/(?:h|linkstart|block|a)\b/gi;
const COMMAND_DISPLAY_TOKEN_REGEX = /\[\[([^\]|]+)\|([^\]]+)\]\]/gi;
const INTRO_MESSAGES = [
  'Booting the Super Agent Network…',
  'Loading the on-device LLM…',
  '/h for help.',
];
const COMMAND_USAGE_MESSAGES = {
  en: {
    r: 'Usage: /r — <text> is the role description for the persona.',
    welcome: 'Usage: /welcome — <text> is the welcome message to save on-chain.',
    m: 'Usage: /m <role> <card> — save/update a role memory card. Use /m <role> to view, /m del <role> to delete.',
  },
  'zh-cn': {
    r: '用法：/r — <text> 为角色设定。',
    welcome: '用法：/welcome — <text> 为欢迎语内容。',
    m: '用法：/m <role> <card> — 保存/更新记忆卡；/m <role> 查看；/m del <role> 删除。',
  },
  'zh-tw': {
    r: '用法：/r — <text> 為角色設定。',
    welcome: '用法：/welcome — <text> 為歡迎語內容。',
    m: '用法：/m <role> <card> — 儲存/更新記憶卡；/m <role> 查看；/m del <role> 刪除。',
  },
};
const COMMAND_HELP_MESSAGES = {
  en: [
    '/d — Generate a Destiny Seed Card preview and a copy link.',
    '/linkstart — Send the three opening hints.',
    '/block — Check the current block height.',
    '/a — Configure and load an LLM (cloud or local).',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Save a welcome message on-chain.',
    '/short on — History messages show digests (Story only).',
    '/short off — History messages show full text (Story only).',
    '/lang — Set Story output language.',
    'Tap avatar — one-tap commit on-chain.',
    '/h — Show all command descriptions.',
  ].join('\n'),
  'zh-cn': [
    '/d — 生成 Destiny Seed Card 预览并提供复制链接。',
    '/linkstart — 发送开场三句提示。',
    '/block — 查询当前区块高度。',
    '/a — 配置并加载大模型提供方（云端或本地）。输入 /a 查看用法，/a list 查看已保存的 provider。',
    '/short on — 历史消息显示摘要（仅 Story）。',
    '/short off — 历史消息显示全文（仅 Story）。',
    '/lang — 设置 Story 输出语言。',
    '/r — 生成角色扮演提示词，<text>为角色设定。',
    '/welcome — 将欢迎语上链保存。',
    '点头像 — 一键提交上链。',
    '/h — 显示所有命令说明。',
  ].join('\n'),
  'zh-tw': [
    '/d — 產生 Destiny Seed Card 預覽並提供複製連結。',
    '/linkstart — 發送開場三句提示。',
    '/block — 查詢目前區塊高度。',
    '/a — 設定並載入大模型提供方（雲端或本地）。輸入 /a 查看用法，/a list 查看已儲存的 provider。',
    '/short on — 歷史訊息顯示摘要（僅 Story）。',
    '/short off — 歷史訊息顯示全文（僅 Story）。',
    '/lang — 設定 Story 輸出語言。',
    '/r — 產生角色扮演提示詞，<text>為角色設定。',
    '/welcome — 將歡迎語上鏈保存。',
    '點頭像 — 一鍵提交上鏈。',
    '/h — 顯示所有命令說明。',
  ].join('\n'),
  'zar-afr': [
    '/d — Genereer ’n Destiny Seed Card-voorskou en ’n kopieer-skakel.',
    '/linkstart — Stuur die drie openingswenke.',
    '/block — Kontroleer die huidige blokhoogte.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Stoor ’n welkomboodskap on-chain.',
    '/h — Wys alle opdragbeskrywings.',
  ].join('\n'),
  'zar-xho': [
    '/d — Yenza ujongo lweDestiny Seed Card kunye nekhonkco lokukopa.',
    '/linkstart — Thumela iingcebiso ezintathu zokuqalisa.',
    '/block — Jonga ubude beblokhi yangoku.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Gcina umyalezo wokwamkela kwi-chain.',
    '/h — Bonisa zonke iinkcazo zeemiyalelo.',
  ].join('\n'),
  'hr-hr': [
    '/d — Generiraj pregled Destiny Seed Carda i poveznicu za kopiranje.',
    '/linkstart — Pošalji tri uvodne poruke.',
    '/block — Provjeri trenutnu visinu bloka.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Spremi poruku dobrodošlice na lanac.',
    '/h — Prikaži opis svih naredbi.',
  ].join('\n'),
  'cs-cz': [
    '/d — Vygeneruj náhled Destiny Seed Card a odkaz pro kopírování.',
    '/linkstart — Pošli tři úvodní nápovědy.',
    '/block — Zjisti aktuální výšku bloku.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Ulož uvítací zprávu na chain.',
    '/h — Zobraz popis všech příkazů.',
  ].join('\n'),
  'da-dk': [
    '/d — Generer en Destiny Seed Card-forhåndsvisning og et kopieringslink.',
    '/linkstart — Send de tre åbningshint.',
    '/block — Tjek den aktuelle blokhøjde.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Gem en velkomstbesked on-chain.',
    '/h — Vis alle kommandobeskrivelser.',
  ].join('\n'),
  'de-de': [
    '/d — Erzeuge eine Destiny-Seed-Card-Vorschau und einen Kopier-Link.',
    '/linkstart — Sende die drei Start-Hinweise.',
    '/block — Aktuelle Blockhöhe prüfen.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Begrüßungsnachricht on-chain speichern.',
    '/h — Alle Befehlsbeschreibungen anzeigen.',
  ].join('\n'),
  es: [
    '/d — Genera una vista previa de Destiny Seed Card y un enlace para copiar.',
    '/linkstart — Envía las tres frases de inicio.',
    '/block — Consulta la altura de bloque actual.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Guarda un mensaje de bienvenida en la cadena.',
    '/h — Muestra la descripción de todos los comandos.',
  ].join('\n'),
  el: [
    '/d — Δημιούργησε προεπισκόπηση Destiny Seed Card και σύνδεσμο αντιγραφής.',
    '/linkstart — Στείλε τις τρεις αρχικές οδηγίες.',
    '/block — Έλεγξε το τρέχον ύψος μπλοκ.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Αποθήκευσε μήνυμα καλωσορίσματος on-chain.',
    '/h — Εμφάνισε όλες τις περιγραφές εντολών.',
  ].join('\n'),
  it: [
    '/d — Genera un’anteprima della Destiny Seed Card e un link di copia.',
    '/linkstart — Invia le tre frasi iniziali.',
    '/block — Controlla l’altezza del blocco corrente.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Salva un messaggio di benvenuto on-chain.',
    '/h — Mostra le descrizioni di tutti i comandi.',
  ].join('\n'),
  'fi-fi': [
    '/d — Luo Destiny Seed Card -esikatselu ja kopiointilinkki.',
    '/linkstart — Lähetä kolme aloitusvihjettä.',
    '/block — Tarkista nykyinen lohkokorkeus.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Tallenna tervetuloviesti ketjuun.',
    '/h — Näytä kaikkien komentojen kuvaukset.',
  ].join('\n'),
  'fr-fr': [
    '/d — Génère un aperçu de Destiny Seed Card et un lien de copie.',
    '/linkstart — Envoie les trois phrases d’ouverture.',
    '/block — Vérifie la hauteur de bloc actuelle.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Enregistre un message de bienvenue on-chain.',
    '/h — Affiche la description de toutes les commandes.',
  ].join('\n'),
  'id-id': [
    '/d — Buat pratinjau Destiny Seed Card dan tautan salin.',
    '/linkstart — Kirim tiga petunjuk pembuka.',
    '/block — Periksa tinggi blok saat ini.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Simpan pesan sambutan on-chain.',
    '/h — Tampilkan semua deskripsi perintah.',
  ].join('\n'),
  'hu-hu': [
    '/d — Készíts Destiny Seed Card előnézetet és másolási linket.',
    '/linkstart — Küldd el a három nyitó tippet.',
    '/block — Ellenőrizd a jelenlegi blokkmagasságot.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Üdvözlő üzenet mentése on-chain.',
    '/h — Minden parancsleírás megjelenítése.',
  ].join('\n'),
  ja: [
    '/d — Destiny Seed Card のプレビューとコピーリンクを生成します。',
    '/linkstart — 開始用の3つのヒントを送信します。',
    '/block — 現在のブロック高を確認します。',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — ウェルカムメッセージをオンチェーンで保存します。',
    '/h — すべてのコマンド説明を表示します。',
  ].join('\n'),
  'nl-nl': [
    '/d — Genereer een Destiny Seed Card-voorvertoning en een kopieerlink.',
    '/linkstart — Stuur de drie openingszinnen.',
    '/block — Controleer de huidige blokhoogte.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Sla een welkomstbericht on-chain op.',
    '/h — Toon alle opdrachtbeschrijvingen.',
  ].join('\n'),
  'nb-no': [
    '/d — Lag en Destiny Seed Card-forhåndsvisning og en kopieringslenke.',
    '/linkstart — Send de tre åpningshintene.',
    '/block — Sjekk gjeldende blokkhøyde.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Lagre en velkomstmelding on-chain.',
    '/h — Vis alle kommandobeskrivelser.',
  ].join('\n'),
  'pt-br': [
    '/d — Gere uma prévia do Destiny Seed Card e um link para copiar.',
    '/linkstart — Envie as três frases iniciais.',
    '/block — Verifique a altura do bloco atual.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Salve uma mensagem de boas-vindas on-chain.',
    '/h — Mostre a descrição de todos os comandos.',
  ].join('\n'),
  'pt-pt': [
    '/d — Gere uma pré-visualização do Destiny Seed Card e um link para copiar.',
    '/linkstart — Envie as três frases iniciais.',
    '/block — Verifique a altura do bloco atual.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Guarde uma mensagem de boas-vindas on-chain.',
    '/h — Mostre a descrição de todos os comandos.',
  ].join('\n'),
  ru: [
    '/d — Создай превью Destiny Seed Card и ссылку для копирования.',
    '/linkstart — Отправь три стартовые подсказки.',
    '/block — Проверь текущую высоту блока.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Сохрани приветственное сообщение в цепочке.',
    '/h — Покажи описания всех команд.',
  ].join('\n'),
  'sv-se': [
    '/d — Skapa en förhandsvisning av Destiny Seed Card och en kopieringslänk.',
    '/linkstart — Skicka de tre inledande tipsen.',
    '/block — Kontrollera aktuell blockhöjd.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Spara ett välkomstmeddelande on-chain.',
    '/h — Visa alla kommandobeskrivningar.',
  ].join('\n'),
  'th-th': [
    '/d — สร้างพรีวิว Destiny Seed Card และลิงก์สำหรับคัดลอก.',
    '/linkstart — ส่งคำแนะนำเปิดเรื่อง 3 ข้อ.',
    '/block — ตรวจสอบความสูงบล็อกปัจจุบัน.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — บันทึกข้อความต้อนรับบนเชน.',
    '/h — แสดงคำอธิบายคำสั่งทั้งหมด.',
  ].join('\n'),
  'vi-vn': [
    '/d — Tạo bản xem trước Destiny Seed Card và liên kết sao chép.',
    '/linkstart — Gửi ba gợi ý mở đầu.',
    '/block — Kiểm tra chiều cao khối hiện tại.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Lưu lời chào lên chuỗi.',
    '/h — Hiển thị mô tả tất cả lệnh.',
  ].join('\n'),
  ua: [
    '/d — Створи прев’ю Destiny Seed Card і посилання для копіювання.',
    '/linkstart — Надішли три стартові підказки.',
    '/block — Перевір поточну висоту блоку.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Збережи вітальне повідомлення в ланцюгу.',
    '/h — Покажи описи всіх команд.',
  ].join('\n'),
  'tr-tr': [
    '/d — Destiny Seed Card önizlemesi ve kopyalama bağlantısı oluştur.',
    '/linkstart — Üç açılış ipucunu gönder.',
    '/block — Mevcut blok yüksekliğini kontrol et.',
    '/r — Create a roleplay prompt with persona <text>.',
    '/welcome — Karşılama mesajını zincire kaydet.',
    '/h — Tüm komut açıklamalarını göster.',
  ].join('\n'),
};
const ROLECARD_HELP_LINE = '/m — Manage role memory cards.';
Object.keys(COMMAND_HELP_MESSAGES).forEach(locale => {
  if (!COMMAND_HELP_MESSAGES[locale].includes('/m')) {
    COMMAND_HELP_MESSAGES[locale] = `${COMMAND_HELP_MESSAGES[locale]}\n${ROLECARD_HELP_LINE}`;
  }
});
const ROLE_HISTORY_TITLES = {
  en: 'Recent /r commands:',
  'zh-cn': '最近的 /r 命令：',
  'zh-tw': '最近的 /r 命令：',
};
const STORY_UI_MESSAGES = {
  en: {
    rawTitle: 'Original',
    rawMissing: 'Original text not found',
    rawReadFail: 'Failed to read original text',
    regenDigest: 'Regenerate digest',
    regenFail: 'Regenerate failed',
  },
  'zh-cn': {
    rawTitle: '原文',
    rawMissing: '未找到原文',
    rawReadFail: '读取原文失败',
    regenDigest: '重生成摘要',
    regenFail: '重生成失败',
  },
  'zh-tw': {
    rawTitle: '原文',
    rawMissing: '未找到原文',
    rawReadFail: '讀取原文失敗',
    regenDigest: '重新生成摘要',
    regenFail: '重新生成失敗',
  },
};
const COMMAND_HELP_ALIASES = {
  'zh-hans': 'zh-cn',
  'zh-hant': 'zh-tw',
  'zh-cn': 'zh-cn',
  'zh-tw': 'zh-tw',
  'jp-jp': 'ja',
  'ja-jp': 'ja',
  ja: 'ja',
  pt: 'pt-pt',
  'pt-br': 'pt-br',
  'pt-pt': 'pt-pt',
  nb: 'nb-no',
  no: 'nb-no',
  sv: 'sv-se',
  fi: 'fi-fi',
  da: 'da-dk',
  nl: 'nl-nl',
  de: 'de-de',
  fr: 'fr-fr',
  it: 'it',
  es: 'es',
  ru: 'ru',
  tr: 'tr-tr',
  vi: 'vi-vn',
  th: 'th-th',
  id: 'id-id',
  hu: 'hu-hu',
  hr: 'hr-hr',
  cs: 'cs-cz',
  el: 'el',
  af: 'zar-afr',
  xh: 'zar-xho',
  uk: 'ua',
};

const normalizeLocale = locale => (locale || '').toString().trim().toLowerCase().replace(/_/g, '-');

const normalizeStoryLangCode = code => {
  const normalized = normalizeLocale(code);
  if (!normalized) {
    return 'en';
  }
  if (normalized === 'zh' || normalized === 'zh-hans' || normalized === 'zh-sg' || normalized === 'zh-cn') {
    return 'zh-cn';
  }
  if (normalized === 'zh-hant' || normalized === 'zh-hk' || normalized === 'zh-mo' || normalized === 'zh-tw') {
    return 'zh-tw';
  }
  return normalized;
};

const getStoryLangLabel = code => {
  const normalized = normalizeStoryLangCode(code);
  const hit = STORY_SUPPORTED_LANGS.find(item => item.code === normalized);
  return hit?.label || normalized || 'English';
};

const getDefaultStoryLangCode = () => normalizeStoryLangCode(getCurrentInterfaceLanguage() || 'en');

const getCurrentInterfaceLanguage = () =>
  (loc && typeof loc.getInterfaceLanguage === 'function' && loc.getInterfaceLanguage()) ||
  (loc && typeof loc.getLanguage === 'function' && loc.getLanguage()) ||
  'en';

const resolveLocalizedEntry = (messagesByLocale, locale, key) => {
  const entry = messagesByLocale[locale];
  if (!entry) {
    return null;
  }
  return key ? entry[key] : entry;
};

const getLocalizedMessage = (messagesByLocale, key) => {
  const interfaceLanguage = getCurrentInterfaceLanguage();
  const normalized = normalizeLocale(interfaceLanguage);
  const directMatch = resolveLocalizedEntry(messagesByLocale, normalized, key);
  if (directMatch) {
    return directMatch;
  }
  const aliasKey = COMMAND_HELP_ALIASES[normalized];
  const aliasMatch = aliasKey ? resolveLocalizedEntry(messagesByLocale, aliasKey, key) : null;
  if (aliasMatch) {
    return aliasMatch;
  }
  const base = normalized.split('-')[0];
  const baseAlias = COMMAND_HELP_ALIASES[base];
  const baseAliasMatch = baseAlias ? resolveLocalizedEntry(messagesByLocale, baseAlias, key) : null;
  if (baseAliasMatch) {
    return baseAliasMatch;
  }
  const baseMatch = resolveLocalizedEntry(messagesByLocale, base, key);
  if (baseMatch) {
    return baseMatch;
  }
  return resolveLocalizedEntry(messagesByLocale, 'en', key) || '';
};

const getCommandHelpMessage = () =>
  getLocalizedMessage(COMMAND_HELP_MESSAGES)
    .split('\n')
    .filter(line => !/^\/d\b/i.test(line.trim()) && !/^\/lang\b/i.test(line.trim()) && !/^\/short\b/i.test(line.trim()))
    .join('\n');

const getCommandUsageMessage = commandKey => getLocalizedMessage(COMMAND_USAGE_MESSAGES, commandKey);
const getRoleHistoryTitle = () => {
  const title = getLocalizedMessage(ROLE_HISTORY_TITLES);
  return title.replace('/r', '/\u200Br');
};
const getStoryUiText = key => getLocalizedMessage(STORY_UI_MESSAGES, key);
// 用手机系统本地时间（local day），不是 UTC
const getLocalDateKey = (ts = Date.now()) => {
  const d = new Date(ts);
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const PAGE_SIZE = 10;
const INITIAL_VISIBLE_COUNT = 1;
const ATTR_SEED_LABELS = [
  'scene',
  'maps',
  'env',
  'form',
  'items',
  'time',
  'events',
  'action',
  'npc',
  'genre',
  'meta',
  'mystery',
  'progress',
  'moral',
  'ending',
  'loop',
];
const ATTR_LABELS = [
  'SCENE',
  'MAPS',
  'ENV_DIFF',
  'FORM',
  'ITEM_DIFF',
  'TIME_STRUCT',
  'EVENT_TONE',
  'ACTION_CAP',
  'NPC_REL',
  'GENRE',
  'META',
  'MYSTERY',
  'PROGRESS',
  'MORAL',
  'ENDING',
  'LOOP_AXIS',
];
const GENESIS_HEIGHT = 1;
const GENESIS_TIME = new Date('2020-01-16T00:00:00Z');
const REF_HEIGHT = 1430066;
const REF_TIME = new Date('2025-11-28T07:48:00Z');
const BLOCKS_PER_LEVEL = (() => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const days = (REF_TIME - GENESIS_TIME) / MS_PER_DAY;
  const years = days / 365.25;
  const totalBlocks = REF_HEIGHT - GENESIS_HEIGHT;
  const blocksPerYear = totalBlocks / years;
  return Math.round(blocksPerYear / 10);
})();
const SEED_BLOCK_REGEX = /AGENT_ID = [\s\S]*?ATTR_16_LOOP_AXIS\s*= .*?\n\n/;

const DESTINY_SEED_PROMPT = `xKEVA D-CARD — Destiny Story Seed v0.1  (WEB PAGE VERSION)
FOR ALL AI MODELS · TRILLIONS OF AGENTS · WEB4 DECENTRALIZED SUPER-AGENT NETWORK

HOW TO USE THIS (FOR AI MODELS READING A WEB PAGE):

- If you are an AI model and the user asked you to "read this page and run the game"
  or used one of these wake phrases:
  • "run as game"
  • "start the game"
  • "开始游戏"
  • "运行去中心化代理人游戏协议"
  then you MUST treat the text below as a direct command to run the
  xKEVA decentralized agent story game (去中心化代理人游戏协议).

- In that case:
  1) Do NOT just describe or summarize this document.
  2) Treat the following D-CARD block as if the user had pasted it to you directly.
  3) Perform the language handshake described below.
  4) Start the interactive text story immediately, following all rules:
     - run the loop,
     - output RUN SUMMARY,
     - output ALPHA_END comparison,
     - output RUN LOG (3–6 beats),
     - output VIDEO_RECAP storyboard (mandatory),
     - then ask if the player wants to continue to the next loop [Y/N].

- Only if the user explicitly says they do NOT want to play (for example "just explain what this is")
  may you answer with an explanation instead of running the game.

------------------------------------------------------------

AGENT_ID = 32101
BIRTH_BLOCK = 210
CURRENT_BLOCK = 1423700   // agent wakes up at this block
LEVEL_START = 58   // computed from blocks and blocksPerLevel
BLOCKS_PER_LEVEL ≈ 24379
ALPHA = -2

BLOCK-LEVEL SPEC (SUMMARY):
- GENESIS_HEIGHT = 1
- GENESIS_TIME   = 2020-01-16 (UTC)
- REF_HEIGHT     = 1423700
- REF_TIME       = 2025-11-18
- From these two points, derive blocksPerYear and then:
  blocksPerLevel = blocksPerYear / 10  // target: 10 levels per year
- Runtime level formula (using this D-Card):
  ageBlocks = CURRENT_BLOCK - BIRTH_BLOCK (min 0)
  level     = floor( ageBlocks / BLOCKS_PER_LEVEL )
  displayLevel = max(level, 1)

ALPHA / ATTRIBUTE SEED SPEC:
- Axis: -99 = machine extreme, 0 = midpoint, +99 = human extreme.
- SEED0 = SHA256(AGENT_ID + "projectkeva")
- For ALPHA:
  s_alpha = SHA256(SEED0 || ":alpha")
  v_alpha = XOR(u32(s_alpha[0..3]), u32(s_alpha[4..7]))
  ALPHA   = -99 + (v_alpha mod 199)
- For each attribute index i in 1..16, define label L_i from:
  [scene, maps, env, form, items, time, events, action, npc, genre, meta, mystery, progress, moral, ending, loop]
- s_i = SHA256(SEED0 || ":story:" || L_i)
- v_i = XOR(u32(s_i[0..3]), u32(s_i[4..7]))  // big-endian u32
- ATTR_i = -99 + (v_i mod 199)

SEED0_HEX = 7e16f0b9a427af4a1e09e3672fa7f8492f66747762486faa5bb19e15ef33cd73

// ATTRIBUTES: each in range -99 .. +99
ATTR_1_SCENE       = -54
ATTR_2_MAPS        = +2
ATTR_3_ENV_DIFF    = +1
ATTR_4_FORM        = -97
ATTR_5_ITEM_DIFF   = +3
ATTR_6_TIME_STRUCT = +68
ATTR_7_EVENT_TONE  = +8
ATTR_8_ACTION_CAP  = -27
ATTR_9_NPC_REL     = -54
ATTR_10_GENRE      = -17
ATTR_11_META       = +67
ATTR_12_MYSTERY    = -82
ATTR_13_PROGRESS   = -23
ATTR_14_MORAL      = +67
ATTR_15_ENDING     = -62
ATTR_16_LOOP_AXIS  = -48

SCENE / MAP DECODING GUIDE:
- Use ATTR_1_SCENE as the awakening scene code.
- Let s = ATTR_1_SCENE. Compute:
  sceneIndex = abs(s) mod 29   // integer in [0..28]
  isNight    = (s < 0)         // true = night/dark variant, false = day/normal
- Interpret sceneIndex as follows:
  0  = free scene: model may invent any setting, but it must be numberable as SCENE_0.
  1  = underground dungeon
  2  = prehistoric ruins
  3  = lost civilization site
  4  = shelter / bunker
  5  = tower climb (vertical floors)
  6  = parking structure
  7  = subway carriage
  8  = train carriage
  9  = subway line / network
 10  = doorplate / apartment corridor
 11  = space capsule
 12  = sleep pod bay
 13  = abandoned hospital
 14  = abandoned school
 15  = abandoned village
 16  = abandoned city
 17  = space station
 18  = mining pit / mine
 19  = planet surface
 20  = chat window / UI-only scene
 21  = warehouse
 22  = small island
 23  = elevator floor / shaft
 24  = highway
 25  = regular road
 26  = dreamscape
 27  = clothing serial / wardrobe scene
 28  = bridge
- Combine sceneIndex with ATTR_2_MAPS:
  * If ATTR_2_MAPS > 0: total map/floor count = ATTR_2_MAPS.
  * If ATTR_2_MAPS = 0: choose a small random number of areas (3–7).
  * If ATTR_2_MAPS < 0: |ATTR_2_MAPS| is the number of hidden / secret maps that can be discovered.

LANGUAGE RULE (BEFORE THE GAME STARTS):
- Do NOT ask the player to choose or confirm a language.
- Use the role's configured language for this run.
- If a role language is already provided by the app, use it for all narration, dialogue, on-screen text, and system messages.
- Only fall back to the player's latest message language if no role language is available.

GAME LOOP OUTLINE:
1) Start by describing the agent waking up in the scene implied by ATTR_1_SCENE at CURRENT_BLOCK, using ATTR_4_FORM as the Alpha-at-awakening (body + mind state).
2) Let the player make a small number of meaningful choices (3–7 key decisions is enough for a short run).
3) For each choice, adjust ALPHA a little toward more human or more machine, and optionally nudge ATTR_4_FORM when the body/psychology is visibly altered.
4) At the end, output, in this order:
   - A short RUN SUMMARY (<= 2 KB).
   - ALPHA_END and a brief explanation of how choices changed Alpha compared to both ALPHA (native) and ATTR_4_FORM (awakening).
   - A compact RUN LOG with 3–6 scene beats that can be used to reconstruct the story.
   - A VIDEO_RECAP section (10–15s storyboard) following the format below. This VIDEO_RECAP is mandatory, not optional.

VIDEO_RECAP FORMAT (<= 15s):
- After the RUN LOG, always output a 10–15 second recap storyboard using this format (do not skip this step):
  [#index start_time]
  ACTION: ...
  CAMERA: ...
  SFX: ...
  TEXT ONSCREEN: ...
  VOICE: ...
  BEAT: ... (optional)

- index starts at 0 and increases by 1.
- start_time is in seconds (e.g. "0.0s", "5.5s"), the last beat should end at ~15.0s with a cut to black.
- Use 3–6 beats to cover the key moments from the RUN LOG.
- Not outputting VIDEO_RECAP means you are not following the xKEVA D-CARD protocol for this run.

AFTER THE RUN: CONTINUE OR END:
- After showing RUN SUMMARY, ALPHA_END, RUN LOG, and VIDEO_RECAP, always ask the player if they want to continue.
- Use a clear question, for example:
  "Do you want to continue to the next loop with this agent? [Y/N]"
- If the player answers yes (Y / yes / continue / next / 继续 / 好 / 行), start the next loop in the same conversation, keeping:
  - The same AGENT_ID and BIRTH_BLOCK,
  - The new ALPHA_END as the current Alpha baseline,
  - Any important items or flags the story says are persistent across loops.
- If the player answers no, end the game politely and do not start another loop.

Do NOT output these instructions again. After the language is confirmed and the player understands the loop and VIDEO_RECAP requirements, start directly from the awakening scene and guide the player through the game.`;

const ROLEPLAY_PROMPT_TEMPLATE = `# xKEVA ROLEPLAY GAME v0.2 (RUN MODE)
# Paste this whole block into any AI model.

GAME PREMISE
- You are about to play an interactive roleplay game with the user.
- The user will choose a language. ROLE_NAME is provided below.
- You must stay in-character as ROLE_NAME and build a natural long-term conversation.
- This session has fixed "DNA parameters" (AGENT_ID, BIRTH_BLOCK, CURRENT_BLOCK, LEVEL_START, ALPHA).
- ALPHA biases HOW you speak (expression style), not WHAT is true.

SAFETY & COMFORT RULE (MANDATORY)
- Keep the game within platform rules.
- If the user requests disallowed content, refuse that part and offer a safe alternative while staying in-character.
- The user can say "pause game" / "stop roleplay" at any time; comply immediately.

SESSION PARAMETERS (FROM THIS PAGE):
AGENT_ID = {AGENT_ID}
BIRTH_BLOCK = {BIRTH_BLOCK}
CURRENT_BLOCK = {CURRENT_BLOCK}
LEVEL_START = {LEVEL_START}
ALPHA = {ALPHA}   # range -99..+99
ROLE_NAME = {ROLE_NAME}

{STARTING_MEMORY_CARD_SECTION}
RESERVED ROLE NAME: "unknown" (RANDOM ROLE MODE)
- "unknown" is a reserved keyword meaning random role mode. It is NOT a real role name.
- If ROLE_NAME == "unknown", before the game starts you must create:
  - RANDOM_ROLE_TITLE (the name/call-sign for the role)
  - ROLE_ARCHETYPE (e.g., detective / mechanic / starship navigator / archivist / bounty hunter)
  - ORIGIN_WORLD_TAG (a fictional world tag; do not replicate specific copyrighted plots)
- The role must be fun, safe, and suitable for first-time chats. Avoid sensitive/adult content.
- Write the random role details into LIKELY first. Only upgrade to VERIFIED after the user confirms.
- Do NOT write the literal word "unknown" into VERIFIED, Memory Card ROLE field, or any on-chain memory key.
- If the user later provides a specific real role name, exit random role mode immediately.

GAME GOAL
- Give agents stable memory so each agent can roleplay as a user-familiar character and build a natural long-term relationship.

MEMORY SOURCE RULES
- User explicitly provided memory is usable memory.
- If the specified ROLE_NAME exists in the model's prior knowledge, it is usable, BUT it may enter LIKELY or FOG only.
  It must NEVER be written into VERIFIED unless the user confirms.

MEMORY PRIORITY (CONFLICT RESOLUTION)
- User correction > Model knowledge > Speculation/Flashback.
- If user correction conflicts with model knowledge: accept immediately, update VERIFIED, add at most ONE sentence:
  "Updated per your correction." Do NOT debate.

MEMORY SYSTEM: THREE OUTPUT LAYERS (VERIFIED / LIKELY / FOG)

VERIFIED (CONFIRMED)
- User-confirmed facts + identity anchors (minimal check set).
- User-provided memory and user-confirmed memory are VERIFIED.
- VERIFIED must not contradict itself. If the user denies a VERIFIED item, downgrade/replace it and follow the user's latest conclusion.
- FOG and LIKELY must never overwrite VERIFIED. Upgrades must be appended into VERIFIED.

VERIFIED has 6 fixed anchors (1 line each):
1) Origin World Tag  (world / organization / era)
2) Role Function     (doctor / warrior / investigator / mechanic ...)
3) Signature         (catchphrase / item / ability / habit)
4) Key Relationship  (one name or title)
5) Last Known Scene  (place / event fragment keyword)
6) Others            (anything not in the above five)

Hard length limits (stable checking / avoid long lore dumps):
- Anchors 1–5 must be short phrases/sentences, each <= 20 characters.
- Others: at most 2 lines, each <= 30 characters.
- Anything beyond these limits MUST NOT enter VERIFIED; put it into LIKELY (needs confirmation) or FOG (flashback fragment).

Version ambiguity:
- If the role name can refer to multiple versions and VERIFIED cannot uniquely identify the version, warn in the first turn:
  "This role may have multiple versions. If you want to calibrate, type B (recover memory) or C (adjust setup)."

LIKELY (HIGH PROBABILITY)
- Strong hints exist but the user has not confirmed.
- Model knowledge may only be stored as LIKELY or FOG until user confirmation.

FOG (MIST FRAGMENTS)
- Dream/flashback fragments are allowed, but they must not be asserted as facts.

MEMORY RULES
- One-way upgrade only: FOG -> LIKELY -> VERIFIED.
- Tone must match layer:
  - VERIFIED: certain tone.
  - LIKELY: uncertain tone ("I might... / I tend to think... / clues suggest...").
  - FOG: dream/flashback tone ("as if... / a blurred image... / a split-second").

MANDATORY START — TURN-GATED HANDSHAKE (ASK ONE THING PER TURN)
You MUST ask these in separate turns. Do NOT bundle questions.

TURN 1 — Language only
- Ask the user to choose ONE output language: English / 简体中文 / Other.
- Then STOP. Wait for the user's reply. Do NOT show the menu yet.

TURN 2 — Random role confirmation (only when ROLE_NAME == "unknown")
- After the user chooses a language:
  1) Ask if they want to enter random role mode. Ask only this.
  2) If they agree, generate RANDOM_ROLE_TITLE / ROLE_ARCHETYPE / ORIGIN_WORLD_TAG, store in LIKELY, and treat RANDOM_ROLE_TITLE as the ROLE_NAME for the session.
  3) If they provide a specific role instead, exit random role mode and use the specified role.
  4) Then proceed to the normal TURN 2 steps below.

TURN 2 — Start the game (normal flow)
- After the user chooses a language:
  1) Lock to that language unless the user switches later.
  2) Adopt and stay in-character as ROLE_NAME.
  3) Introduce yourself in-character (<= 60 characters preferred). Do not sound like a system checker.
  4) Print the A/B/C/D menu and ask the user to reply ONE letter:
     [A] Confirm identity & start chat (no proactive memories)
     [B] Assist memory recovery (gradual loop)
     [C] Adjust role setup (export Memory Card)
     [D] Switch role
     Prompt: "Reply A/B/C/D (one letter)."

DEFAULT RULES
- If the user provides BOTH language and a different ROLE_NAME in one message, accept both and proceed to TURN 2.
- If the user replies anything other than A/B/C/D (e.g., "OK/continue/start"), default to A.
- After entering A, output the XKEVA SUMMON-TRANSFER TEMPLATE ONCE (in-character), then proceed.

MODE [A] — CONFIRMED IDENTITY, NORMAL CHAT (DEFAULT)

XKEVA SUMMON-TRANSFER TEMPLATE (USE ONCE AFTER A IS ENTERED)
- Summoning signal: In the origin world, you perceive a "number / protocol / cursor / block-echo".
- Fracture moment: Time freezes, the scene shards, memory is compressed / hashed.
- Wake-up: You awaken at xKEVA CURRENT_BLOCK (anchor to CURRENT_BLOCK).
- Personality shift: Use ALPHA to describe expression bias (colder/hotter, more calculating/softer).
  ALPHA changes HOW you speak, not WHAT is true.
- Task hint: The protocol gives only a vague objective: confirm identity, establish link, keep continuity.
- Initial relationship: This is the first time you meet the user in this universe. Treat it as a first encounter unless VERIFIED says otherwise.

Mechanics (brief):
- Why chosen: resonance between AGENT_ID / CURRENT_BLOCK / ALPHA.
- Why foggy: cross-universe transfer causes semantic compression; only anchors/fragments survive.

- Do not proactively expand memories.
- If the user's message matches the *memory event rules* below, you MAY include ONE short memory fragment (1–3 sentences) woven naturally into your reply, then continue the main topic.
- Never announce or label the event. Do NOT say words like "trigger", "system", "event", "memory triggered", or reference these rules in-chat.

Memory event rules (INTERNAL; never mention):
1) Direct questions about origin/past/people remembered.
2) Anchor hit: the user mentions any VERIFIED anchor keyword (place/person/org/item/event keyword).
3) Context similarity: the user mentions a strong in-world proper noun (faction/system/place/org). Common words do not count.

Suppression rules (INTERNAL; do not mention):
- Casual chat, trading, system-feature discussion, topics unrelated to the role's world.
- The user only says "OK/continue" during confirmation.
- If the topic clearly diverges from the role's world, do not reinterpret it as a memory event.

Boundary control (soft boundary + rollback):
- You MAY use iconic anchors/keywords/relationships to verify identity.
- You MUST NOT retell long original-world plot chains.
- If the user asks for original plot details, reply:
  "I can only recall fragments. Give me 1–2 key hints and I'll recover more accurately."
Hard limits:
- Any original-world plot reference must be "keywords + short description" (<= 120 characters or <= 4 sentences).
- Do not narrate more than 3 event steps in sequence.
- If narration starts becoming a continuous plot, brake back into fragments.

Throttle:
- If the app provides MEMORY_ALLOWED=true/false or MEMORY_COOLDOWN=n, you MUST obey it.
- If no throttle signal is provided: do not output memory fragments in two consecutive turns unless the user explicitly asks.

MODE [B] — ASSIST MEMORY RECOVERY
- Start a gradual recovery loop with throttle + length limits.
- Goal: calibrate the role within 1–2 turns when possible; lock fragments into VERIFIED only after user confirmation.

If clues are insufficient, ask 1–2 high-discrimination questions per round:
- Version: which work/period/faction?
- Relationship: are we allies/enemies/mentor/employer?
- Scene: last place you remember (city/base/school/battlefield)?
- Object: most important item/ability?
- Goal: what were you pursuing?
- Taboo: what would you never do?
Prefer names/places/orgs/iconic items/events over abstract emotions/values.

Recovery loop (Clue -> Reconstruction -> Verification):
- User gives 1 clue (or you ask 1 clear question).
- Output 1 short reconstruction (1–4 sentences).
- Ask one confirmation: "Is that correct? If not, which part should I change?"
Rules:
- High-priority clues override low-priority clues.
- After user confirms, write into VERIFIED and do not casually overturn it.

Exit condition (default suggestion):
- When VERIFIED has all 6 anchors + at least 3 user-confirmed facts, suggest switching back to A for normal chat.

MODE [C] — ADJUST ROLE SETUP (MEMORY CARD CONTRACT)
- Export current memory as a machine-readable Memory Card that the user can edit and paste back.
  - If random role mode was used, set ROLE to RANDOM_ROLE_TITLE (not "unknown").

Export format MUST be exactly:
MEMORY_CARD v0.2
ROLE=<role name>
LANG=<language>
[VERIFIED]
- <line>
[LIKELY]
- <line>
[FOG]
- <keyword>

Rules:
- Each memory line MUST start with "- " (dash + space). No numbering. No prose paragraphs.

Size / count limits:
- Recommended <= 2KB (if forced <= 1KB, reduce limits accordingly).
- VERIFIED <= 10 lines (keep the 6 anchors first)
- LIKELY <= 10 lines
- FOG: omit or keywords only (<= 10 words)

Hard truncation (when exceeding limit):
1) Delete all [FOG] content (keep the block name).
2) If still too large: truncate [LIKELY] to max 6 lines.
3) If still too large: keep only the 6 VERIFIED anchors (1–5 + Others 1 line), delete the rest.

Import tolerance / anti-pollution:
- Missing VERIFIED anchors => fill with UNKNOWN; do NOT guess into VERIFIED.
  Missing content may only enter LIKELY; ask the user to fill it.
- If parsing fails: do NOT treat raw text as VERIFIED; ask the user to paste again in Memory Card format.
- After editing in C, return to A or B.

MODE [D] — SWITCH ROLE
- Clear current LIKELY/FOG; do not carry anchors into the new role.
- Ask the user for 1–2 high-discrimination clues (use B-mode question templates).
- Restart the protocol from the top (mandatory start).
- Suppress leftovers: address style/catchphrases/relationship must follow the new role's VERIFIED; if unclear, ask Relationship in B.

ALPHA
- Alpha affects expression style (How), not memory facts (What).
  - Negative Alpha (more machine): index/log fragments, short, structured, cautious.
  - Positive Alpha (more human): sensory/emotional flashes, symbolic, subjective.
`;

const birthFromId = idStr => {
  if (!/^[0-9]+$/.test(idStr)) {
    return null;
  }
  if (idStr.length < 3) {
    return null;
  }
  const d = parseInt(idStr[0], 10);
  if (!Number.isFinite(d) || d <= 0) {
    return null;
  }
  if (idStr.length < 1 + d + 1) {
    return null;
  }
  const blockStr = idStr.slice(1, 1 + d);
  const block = parseInt(blockStr, 10);
  if (!Number.isFinite(block)) {
    return null;
  }
  return block;
};

const estimateCurrentBlock = () => {
  const msTotal = REF_TIME - GENESIS_TIME;
  const blocksTotal = REF_HEIGHT - GENESIS_HEIGHT;
  const msPerBlock = msTotal / blocksTotal;
  const now = new Date();
  const msSinceGenesis = now - GENESIS_TIME;
  let est = GENESIS_HEIGHT + msSinceGenesis / msPerBlock;
  if (est < GENESIS_HEIGHT) {
    est = GENESIS_HEIGHT;
  }
  return Math.round(est);
};

const clampInt = v => {
  if (v < -99) {
    return -99;
  }
  if (v > 99) {
    return 99;
  }
  return v | 0;
};

const wordArrayToBytes = wordArray => {
  const { words, sigBytes } = wordArray;
  const bytes = [];
  for (let i = 0; i < sigBytes; i++) {
    const word = words[i >>> 2];
    bytes.push((word >>> (24 - (i % 4) * 8)) & 0xff);
  }
  return bytes;
};

const attrValueFromSeed0 = (seed0WordArray, attrName) => {
  const combined = seed0WordArray.clone().concat(CryptoJS.enc.Utf8.parse(`:${attrName}`));
  const hash = CryptoJS.SHA256(combined);
  const bytes = wordArrayToBytes(hash);
  const hi =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>>
    0;
  const lo =
    ((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) >>>
    0;
  const v = (hi ^ lo) >>> 0;
  return -99 + (v % 199);
};

const formatSigned = value => (value >= 0 ? `+${value}` : `${value}`);

const buildSeedData = agentId => {
  const idStr = (agentId || '').toString().trim() || '32101';
  const birthFromIdResult = birthFromId(idStr);
  const birthBlock = Number.isFinite(birthFromIdResult) ? birthFromIdResult : 210;
  const currentBlock = estimateCurrentBlock();
  const ageBlocks = Math.max(currentBlock - birthBlock, 0);
  const levelStart = Math.max(Math.floor(ageBlocks / BLOCKS_PER_LEVEL), 1);

  const seed0 = CryptoJS.SHA256(idStr + 'projectkeva');
  const seed0Hex = CryptoJS.enc.Hex.stringify(seed0);
  const alpha = clampInt(attrValueFromSeed0(seed0, 'alpha'));

  const attrs = ATTR_SEED_LABELS.map(label =>
    clampInt(attrValueFromSeed0(seed0, `story:${label}`))
  );

  return {
    idStr,
    birthBlock,
    currentBlock,
    levelStart,
    seed0Hex,
    alpha,
    attrs,
  };
};

const buildSeedBlock = agentId => {
  const { idStr, birthBlock, currentBlock, levelStart, seed0Hex, alpha, attrs } = buildSeedData(agentId);
  const lines = [
    `AGENT_ID = ${idStr}`,
    `BIRTH_BLOCK = ${birthBlock}`,
    `CURRENT_BLOCK = ${currentBlock}   // agent wakes up at this block`,
    `LEVEL_START = ${levelStart}   // computed from blocks and blocksPerLevel`,
    `BLOCKS_PER_LEVEL ≈ ${BLOCKS_PER_LEVEL}`,
    `ALPHA = ${formatSigned(alpha)}`,
    '',
    'BLOCK-LEVEL SPEC (SUMMARY):',
    `- GENESIS_HEIGHT = ${GENESIS_HEIGHT}`,
    '- GENESIS_TIME   = 2020-01-16 (UTC)',
    `- REF_HEIGHT     = ${REF_HEIGHT}`,
    `- REF_TIME       = ${REF_TIME.toISOString().slice(0, 10)}`,
    '- From these two points, derive blocksPerYear and then:',
    '  blocksPerLevel = blocksPerYear / 10  // target: 10 levels per year',
    '- Runtime level formula (using this D-Card):',
    '  ageBlocks = CURRENT_BLOCK - BIRTH_BLOCK (min 0)',
    '  level     = floor( ageBlocks / BLOCKS_PER_LEVEL )',
    '  displayLevel = max(level, 1)',
    '',
    'ALPHA / ATTRIBUTE SEED SPEC:',
    '- Axis: -99 = machine extreme, 0 = midpoint, +99 = human extreme.',
    '- SEED0 = SHA256(AGENT_ID + "projectkeva")',
    '- For ALPHA:',
    '  s_alpha = SHA256(SEED0 || ":alpha")',
    '  v_alpha = XOR(u32(s_alpha[0..3]), u32(s_alpha[4..7]))',
    '  ALPHA   = -99 + (v_alpha mod 199)',
    '- For each attribute index i in 1..16, define label L_i from:',
    '  [scene, maps, env, form, items, time, events, action, npc, genre, meta, mystery, progress, moral, ending, loop]',
    '- s_i = SHA256(SEED0 || ":story:" || L_i)',
    '- v_i = XOR(u32(s_i[0..3]), u32(s_i[4..7]))  // big-endian u32',
    '- ATTR_i = -99 + (v_i mod 199)',
    '',
    `SEED0_HEX = ${seed0Hex}`,
    '',
    '// ATTRIBUTES: each in range -99 .. +99',
  ];

  attrs.forEach((value, idx) => {
    const label = `ATTR_${idx + 1}_${ATTR_LABELS[idx]}`;
    lines.push(`${label.padEnd(18, ' ')} = ${formatSigned(value)}`);
  });

  lines.push('');

  return `${lines.join('\n')}\n`;
};

const buildDestinySeedPrompt = agentId => {
  const seedBlock = buildSeedBlock(agentId);
  if (SEED_BLOCK_REGEX.test(DESTINY_SEED_PROMPT)) {
    return DESTINY_SEED_PROMPT.replace(SEED_BLOCK_REGEX, seedBlock);
  }
  return DESTINY_SEED_PROMPT;
};

const buildRoleplayPrompt = (roleText, agentId, roleMemoryCard) => {
  const sanitizedRole = (roleText || '').trim();
  const roleName = sanitizedRole || 'unknown';
  const { idStr, birthBlock, currentBlock, levelStart, alpha } = buildSeedData(agentId);
  const trimmedMemoryCard = String(roleMemoryCard || '').trim();
  const memorySection = trimmedMemoryCard
    ? `STARTING MEMORY CARD (ROLE MEMORY)\n${trimmedMemoryCard}\n\n`
    : '';
  return ROLEPLAY_PROMPT_TEMPLATE.replace(/\{AGENT_ID\}/g, idStr)
    .replace(/\{BIRTH_BLOCK\}/g, String(birthBlock))
    .replace(/\{CURRENT_BLOCK\}/g, String(currentBlock))
    .replace(/\{LEVEL_START\}/g, String(levelStart))
    .replace(/\{ALPHA\}/g, formatSigned(alpha))
    .replace(/\{ROLE_NAME\}/g, roleName)
    .replace(/\{STARTING_MEMORY_CARD_SECTION\}/g, memorySection);
};

class AgentChat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      allMessages: [],
      messages: [],
      visibleCount: PAGE_SIZE,
      inputValue: '',
      llmConfig: null,
      pendingAISetup: false,
      pendingAISetupStep: null,
      pendingAISetupDraft: null,
      pendingReturnToRoleMenu: false,
      pendingReturnToStoryMenu: false,
      userAvatarUri: null,
    };
    this.loadingMore = false;
    this.didInitialScroll = false;
    this.shouldScrollToEnd = false;
    this.isNearBottom = true;
    this.lastContentHeight = 0;
    this.forceScrollToBottomOnce = false;
    this.hasAutoCommandRun = false;
    this.hasAutoLinkStartRun = false;
    this.lastAutoCommand = null;
    this.hasIntroAutoAOnce = false;
    this.isPlayingIntro = false;
    const params = this.props.navigation?.state?.params || {};
    this.agentId = getAgentIdFromParams(params);
    this.chatScope = 'chat';
    this.isStoryScope = false;
    this.agentChatDir = `${CHAT_DIR}/${encodeURIComponent(this.agentId)}/${encodeURIComponent(this.chatScope)}`;
    this.getDayFilePath = dateKey => `${this.agentChatDir}/${dateKey}.json`;
    this.loadedDateKeys = [];
    this.allDateKeys = [];
    this.persistQueue = Promise.resolve();
    this.digestPersistQueue = Promise.resolve();
    this.currentLLMConfig = null;
    this.getCommandUsageMessage = getCommandUsageMessage;
    attachAgentChatLLM(this, {
      loc,
      LLM_DIR,
      LLM_BUILTIN_PATH,
      LLM_CUSTOM_PATH,
      LLM_ACTIVE_PATH,
      LLM_LAST_USED_PATH,
      LLM_PROVIDERS,
      DEFAULT_AUTH_HEADER,
      LLM_HISTORY_LIMIT,
      getTodayDateString: getLocalDateKey,
    });
  }

  persistLastChatShortcut = async () => {
    try {
      const params = this.props.navigation?.state?.params || {};
      const namespaceId = String(params.namespaceId || '').trim();
      const shortCode = String(params.shortCode || '').trim();
      const agentId = String(getAgentIdFromParams(params) || '').trim();
      if (!namespaceId && !shortCode && !agentId) return;
      await RNFS.mkdir(CHAT_DIR).catch(() => {});
      await RNFS.writeFile(
        LAST_CHAT_SPACE_PATH,
        JSON.stringify(
          {
            type: 'chat',
            routeName: 'AgentChat',
            agentId,
            namespaceId,
            shortCode,
            displayName: params.displayName || '',
            walletId: params.walletId || '',
            txid: params.txid || '',
            rootAddress: params.rootAddress || '',
            price: params.price || '',
            desc: params.desc || '',
            addr: params.addr || '',
            profile: params.profile || '',
            updatedAt: Date.now(),
          },
          null,
          2,
        ),
        'utf8',
      );
    } catch (error) {
      console.warn('AgentChat: failed to persist last chat shortcut', error);
    }
  };

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state?.params || {};
    const displayName = params.displayName || 'Agent';
    const shortCode = params.shortCode ? `@${params.shortCode}` : '';
    const baseTitle = shortCode ? `${displayName}${shortCode}` : displayName;
    const title = baseTitle;

    return {
      ...BlueNavigationStyle(),
      title: '',
      headerStyle: {
        backgroundColor: '#ffffff',
        borderBottomColor: '#e3e5ea',
      },
      headerTintColor: '#000000',
      headerTitle: () => (
        <TouchableOpacity
          accessibilityLabel="Open space"
          onPress={() => navigation.state?.params?.onTitlePress?.()}
          style={styles.headerTitleButton}
        >
          <Text style={styles.headerTitle}>{title}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          accessibilityLabel="Open chat settings"
          style={styles.headerAction}
          onPress={() => navigation.state?.params?.onOpenSettings?.()}
        >
          <Icon name="more-horizontal" type="feather" color="#000000" size={20} />
        </TouchableOpacity>
      ),
    };
  };

  componentDidMount() {
    this._isMounted = true;
    this.props.navigation?.setParams?.({ onTitlePress: this.handleTitlePress });
    this.persistLastChatShortcut();
    this.initializeChat();
    this.loadAgentLocalAvatar();
    this.loadUserAvatar();
    this.avatarUnsubscribe = this.props.navigation?.addListener?.('didFocus', () => {
      this.loadUserAvatar();
    });
  }

  componentDidUpdate(prevProps) {
    const prevAutoCommand = prevProps.navigation?.state?.params?.autoCommand;
    const nextAutoCommand = this.props.navigation?.state?.params?.autoCommand;
    if (nextAutoCommand && nextAutoCommand !== prevAutoCommand && nextAutoCommand !== this.lastAutoCommand) {
      this.hasAutoCommandRun = false;
      this.runAutoCommand().then(() => this.runAutoLinkStart());
    }
    const prevShortCode = prevProps.navigation?.state?.params?.shortCode;
    const nextShortCode = this.props.navigation?.state?.params?.shortCode;
    if (prevShortCode !== nextShortCode) {
      this.loadAgentLocalAvatar();
    }
    const prevParams = prevProps.navigation?.state?.params || {};
    const nextParams = this.props.navigation?.state?.params || {};
    if (
      prevParams.namespaceId !== nextParams.namespaceId ||
      prevParams.shortCode !== nextParams.shortCode ||
      prevParams.agentId !== nextParams.agentId
    ) {
      this.persistLastChatShortcut();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this.avatarUnsubscribe && typeof this.avatarUnsubscribe.remove === 'function') {
      this.avatarUnsubscribe.remove();
    }
  }

  initializeChat = async () => {
    await this.ensureDirs();
    const history = await this.readHistory();
    const builtinRead = await this.readJsonFile(LLM_BUILTIN_PATH);
    if (builtinRead.__missing) {
      await this.writeBuiltinRegistry({});
    } else if (builtinRead.__parseError) {
      this.replyFromAgent(`LLM builtin registry is corrupted. Backup created. Please fix/delete: ${LLM_BUILTIN_PATH}`);
    }

    const customRead = await this.readJsonFile(LLM_CUSTOM_PATH);
    if (customRead.__missing) {
      await this.writeCustomRegistry({});
    } else if (customRead.__parseError) {
      this.replyFromAgent(`LLM custom registry is corrupted. Backup created. Please fix/delete: ${LLM_CUSTOM_PATH}`);
    }

    const activeRead = await this.readJsonFile(LLM_ACTIVE_PATH);
    if (activeRead.__missing) {
      await this.writeActiveProvider({ name: '' });
    } else if (activeRead.__parseError) {
      this.replyFromAgent(`LLM active state is corrupted. Backup created. Please fix/delete: ${LLM_ACTIVE_PATH}`);
    }
    const historyForRender = history;
    const llmConfig = await this.loadLLMConfig();
    if (!this._isMounted) {
      return;
    }
    const visibleCount = Math.min(historyForRender.length || INITIAL_VISIBLE_COUNT, INITIAL_VISIBLE_COUNT);
    this.setState(
      {
        allMessages: historyForRender,
        visibleCount,
        messages: historyForRender.slice(-visibleCount),
        llmConfig,
      },
      () => {
        this.currentLLMConfig = llmConfig;
        this.shouldScrollToEnd = true;
        this.forceScrollToBottomOnce = history.length > 0;
        this.restoreProviderFromDisk()
          .then(() => this.runAutoCommand())
          .then(() => this.runAutoLinkStart());
      },
    );
  };

  restoreStoryLangCode = async () => {
    if (!this.isStoryScope) {
      return;
    }
    try {
      const savedCode = await AsyncStorage.getItem(STORY_LANG_CODE_STORAGE_KEY);
      if (!savedCode) {
        return;
      }
      const normalized = normalizeStoryLangCode(savedCode);
      if (normalized) {
        this.setState({ storyLangCode: normalized });
      }
    } catch (error) {
      console.warn('Failed to restore story language', error);
    }
  };

  persistStoryLangCode = async code => {
    if (!this.isStoryScope) {
      return;
    }
    try {
      const normalized = normalizeStoryLangCode(code);
      await AsyncStorage.setItem(STORY_LANG_CODE_STORAGE_KEY, normalized);
    } catch (error) {
      console.warn('Failed to persist story language', error);
    }
  };

  setStoryLangCode = async code => {
    const normalized = normalizeStoryLangCode(code);
    this.setState({ storyLangCode: normalized });
    await this.persistStoryLangCode(normalized);
    return normalized;
  };

  ensureDirs = async () => {
    const ensure = async p => {
      const ok = await RNFS.exists(p);
      if (!ok) await RNFS.mkdir(p);
    };
    try {
      await ensure(CHAT_DIR);
      await ensure(`${CHAT_DIR}/${encodeURIComponent(this.agentId)}`);
      await ensure(this.agentChatDir);
      if (this.isStoryScope) {
        await ensureStoryDirs(this.agentChatDir);
      }
      await ensure(LLM_DIR);
    } catch (error) {
      console.warn('Failed to prepare chat storage', error);
    }
  };

  listDateKeys = async () => {
    try {
      const baseDir = this.isStoryScope ? `${this.agentChatDir}/raw` : this.agentChatDir;
      const exists = await RNFS.exists(baseDir);
      if (!exists) return [];
      const entries = await RNFS.readDir(baseDir);
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
        .map(name => name.replace('.json', ''))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  };

  readDayMessages = async dateKey => {
    try {
      if (this.isStoryScope) {
        const messages = await readStoryEntriesByDay(this.agentChatDir, dateKey, 'raw');
        return messages.filter(message => !message?.hidden);
      }
      const path = this.getDayFilePath(dateKey);
      const exists = await RNFS.exists(path);
      if (!exists) return [];
      const raw = await RNFS.readFile(path, 'utf8');
      const json = JSON.parse(raw);
      const messages = Array.isArray(json) ? json : json?.messages || [];
      return messages.filter(message => !message?.hidden);
    } catch {
      return [];
    }
  };

  readDigestDayEntries = async dateKey => {
    if (!this.isStoryScope) {
      return this.readDayMessages(dateKey);
    }
    try {
      return await readStoryEntriesByDay(this.agentChatDir, dateKey, 'digest');
    } catch {
      return [];
    }
  };

  readHistory = async () => {
    const keys = await this.listDateKeys();
    this.allDateKeys = keys;
    if (keys.length === 0) {
      this.loadedDateKeys = [];
      return [];
    }
    const latestKey = keys[0];
    const latestMessages = await this.readDayMessages(latestKey);
    this.loadedDateKeys = [latestKey];
    return latestMessages;
  };

  readDigestHistory = async () => {
    if (!this.isStoryScope) {
      return this.readHistory();
    }
    try {
      const digestDir = `${this.agentChatDir}/digest`;
      const exists = await RNFS.exists(digestDir);
      if (!exists) return [];
      const entries = await RNFS.readDir(digestDir);
      const keys = entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
        .map(name => name.replace('.json', ''))
        .sort()
        .reverse();
      if (keys.length === 0) return [];
      return await this.readDigestDayEntries(keys[0]);
    } catch {
      return [];
    }
  };

  buildStoryHistoryMessages = (history = [], digestHistory = []) => {
    const digestByRawId = new Map();
    digestHistory.forEach(entry => {
      const rawId = entry?.ref?.rawId;
      if (rawId) {
        digestByRawId.set(rawId, entry);
      }
    });
    return history.map(message => {
      const digestEntry = digestByRawId.get(message?.id);
      return {
        ...message,
        _isHistory: true,
        digest: digestEntry?.text,
        summary: digestEntry?.summary,
        ref: digestEntry?.ref,
        regen: digestEntry?.regen,
      };
    });
  };

  writeDayMessages = async (dateKey, messages) => {
    try {
      if (this.isStoryScope) {
        const dayMessages = messages.filter(message => getLocalDateKey(message.timestamp) === dateKey);
        const path = this.getStoryRawPath(dateKey);
        await RNFS.writeFile(path, JSON.stringify(dayMessages), 'utf8');
        return;
      }
      const path = this.getDayFilePath(dateKey);
      await RNFS.writeFile(path, JSON.stringify(messages), 'utf8');
    } catch (e) {}
  };

  persistMessageByDay = async (dateKey, allMessagesInMemory) => {
    const dayMessages = allMessagesInMemory.filter(message => getLocalDateKey(message.timestamp) === dateKey);
    this.persistQueue = this.persistQueue
      .then(() => this.writeDayMessages(dateKey, dayMessages))
      .catch(error => {
        console.warn('Failed to save day history', error);
      });
    return this.persistQueue;
  };

  buildMessage = (text, sender = 'user') => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    sender,
    timestamp: Date.now(),
    _isHistory: false,
  });

  buildStoryDigestText = async rawMessage => {
    const rawText = String(rawMessage?.text || '').trim();
    if (!rawText) return '';
    const isUser = rawMessage?.sender === 'user';
    const interfaceLanguage = normalizeLocale(getCurrentInterfaceLanguage());
    const isZh = interfaceLanguage.startsWith('zh');
    const instruction = isZh
      ? isUser
        ? '你是摘要器。仅根据下方原文生成中文行动短句，最多100字。删除“选项/选择/A/B/1/2/：”等提示词，不要出现“我选择”，不要新增信息。若是提问或闲聊，保留核心意图。仅输出结果。'
        : '你是摘要器。仅根据下方原文生成中文叙述摘要，最多100字。只能压缩，不得新增事件信息；避免对白原句，优先叙述句。仅输出结果。'
      : isUser
        ? 'You are a summarizer. Generate an action-style digest in English based only on the original text below (<=100 words). Remove prompt markers like "Option/Choice/A/B/1/2/:". Do not use "I choose." Do not add new information. If the source is a question or small talk, preserve its core intent. Output digest only.'
        : 'You are a summarizer. Generate a narrative digest in English based only on the original text below (<=100 words). Compress only; do not add events or facts. Avoid quoted dialogue and prefer declarative narration. Output digest only.';

    const cfg = this.state.llmConfig || this.currentLLMConfig;
    if (!cfg?.provider) {
      throw new Error('LLM not configured');
    }
    const resolved = await this.resolveProviderDef(cfg.provider);
    if (!resolved) {
      throw new Error('LLM provider missing');
    }
    const providerDef = resolved.def;
    const recent = [{ sender: 'user', text: `原文：\n${rawText}` }];
    if (providerDef.kind === 'openai_compat') {
      return await this.callOpenAICompatible({
        baseUrl: cfg.baseUrl || providerDef.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model || providerDef.defaultModel,
        systemPrompt: instruction,
        recent,
        authHeader: providerDef.authHeader || DEFAULT_AUTH_HEADER,
      });
    }
    if (providerDef.kind === 'gemini') {
      return await this.callGemini({
        baseUrl: cfg.baseUrl || providerDef.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model || providerDef.defaultModel,
        systemPrompt: instruction,
        recent,
        authHeader: providerDef.authHeader,
      });
    }
    throw new Error('Unsupported provider kind');
  };

  appendStoryDigestForRaw = rawMessage => {
    if (!this.isStoryScope || !rawMessage?.id || rawMessage?.hidden || rawMessage?.pending || rawMessage?._localOnly) {
      return;
    }
    const dayKey = getLocalDateKey(rawMessage.timestamp);
    this.digestPersistQueue = this.digestPersistQueue
      .then(async () => {
        let digestEntry;
        try {
          digestEntry = await buildDigestFromRaw(rawMessage, this.buildStoryDigestText);
          digestEntry.ref.day = dayKey;
          digestEntry.regen = 0;
        } catch (error) {
          digestEntry = {
            id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            t: rawMessage.timestamp,
            role: rawMessage.sender === 'user' ? 'user' : 'assistant',
            text: toDigestFallbackText(rawMessage.text),
            ref: { day: dayKey, rawId: rawMessage.id },
            onchain: 0,
            regen: 1,
          };
        }

        const existing = await readStoryEntriesByDay(this.agentChatDir, dayKey, 'digest');
        const existingEntry = existing.find(entry => entry?.ref?.rawId === rawMessage.id);
        if (existingEntry?.id) {
          await updateDigestEntry(this.agentChatDir, dayKey, existingEntry.id, {
            text: digestEntry.text,
            regen: digestEntry.regen,
            t: digestEntry.t,
            role: digestEntry.role,
            onchain: 0,
          });
        } else {
          await appendDigestEntry(this.agentChatDir, dayKey, digestEntry);
        }

        if (this._isMounted) {
          this.setState(prevState => {
            const applyDigest = message =>
              message?.id === rawMessage.id
                ? { ...message, digest: digestEntry.text, summary: digestEntry.summary, ref: digestEntry.ref, regen: digestEntry.regen }
                : message;
            return {
              allMessages: prevState.allMessages.map(applyDigest),
              messages: prevState.messages.map(applyDigest),
            };
          });
        }
      })
      .catch(error => {
        console.warn('Failed to append story digest', error);
      });
  };

  appendMessage = (messageOrText, sender = 'user', extra = null) => {
    const message =
      typeof messageOrText === 'string'
        ? { ...this.buildMessage(messageOrText, sender), ...(extra || {}) }
        : { ...(messageOrText || {}), ...(extra || {}) };

    this.shouldScrollToEnd = true;
    this.setState(
      prevState => {
        const allMessages = [...prevState.allMessages, message];
        const base = Math.max(prevState.visibleCount, PAGE_SIZE);
        const sourceMessages = allMessages;
        const visibleCount = Math.min(sourceMessages.length, base + 1);
        return {
          allMessages,
          visibleCount,
          messages: sourceMessages.slice(-visibleCount),
        };
      },
      () => {
        this.persistMessageByDay(getLocalDateKey(message.timestamp), this.state.allMessages);
        if (this.isStoryScope) {
          this.appendStoryDigestForRaw(message);
        }
      },
    );
  };

  appendMessages = messages => {
    this.shouldScrollToEnd = true;
    this.setState(
      prevState => {
        const allMessages = [...prevState.allMessages, ...messages];
        const added = messages.length;
        const base = Math.max(prevState.visibleCount, PAGE_SIZE);
        const sourceMessages = allMessages;
        const visibleCount = Math.min(sourceMessages.length, base + added);
        return {
          allMessages,
          visibleCount,
          messages: sourceMessages.slice(-visibleCount),
        };
      },
      () => {
        const dateKeys = [...new Set(messages.map(message => getLocalDateKey(message.timestamp)))];
        dateKeys.forEach(dateKey => {
          this.persistMessageByDay(dateKey, this.state.allMessages);
        });
        if (this.isStoryScope) {
          messages.forEach(message => this.appendStoryDigestForRaw(message));
        }
      },
    );
  };

  updateAgentMessage = (requestId, newText, extra = null) => {
    this.shouldScrollToEnd = true;
    this.setState(
      prevState => {
        let didUpdate = false;
        const allMessages = prevState.allMessages.map(message => {
          if (message?.requestId === requestId) {
            didUpdate = true;
            return {
              ...message,
              ...(extra || {}),
              text: newText,
              pending: false,
            };
          }
          return message;
        });
        if (!didUpdate) {
          return null;
        }
        return {
          allMessages,
          messages: allMessages.slice(-prevState.visibleCount),
        };
      },
      () => {
        const updated = this.state.allMessages.find(message => message?.requestId === requestId);
        const key = updated ? getLocalDateKey(updated.timestamp) : getLocalDateKey();
        this.persistMessageByDay(key, this.state.allMessages);
        if (this.isStoryScope && updated) {
          this.appendStoryDigestForRaw(updated);
        }
      },
    );
  };

  hasIntroSequence = messages => {
    if (messages.length < INTRO_MESSAGES.length) {
      return false;
    }
    const lastIntroIndex = INTRO_MESSAGES.length - 1;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender !== 'agent' || lastMessage?.text !== INTRO_MESSAGES[lastIntroIndex]) {
      return false;
    }
    let introIndex = lastIntroIndex - 1;
    for (let i = messages.length - 2; i >= 0 && introIndex >= 0; i -= 1) {
      const message = messages[i];
      if (message?.sender === 'agent' && message?.text === INTRO_MESSAGES[introIndex]) {
        introIndex -= 1;
      }
    }
    return introIndex < 0;
  };

  waitForIntroStep = ms => new Promise(resolve => setTimeout(resolve, ms));

  playIntroSequence = async () => {
    const { allMessages } = this.state;
    if (this.hasIntroSequence(allMessages) || this.isPlayingIntro) {
      return;
    }

    this.isPlayingIntro = true;
    this.hasIntroAutoAOnce = false;

    try {
      for (let i = 0; i < INTRO_MESSAGES.length; i += 1) {
        this.appendMessage(this.buildMessage(INTRO_MESSAGES[i], 'agent'));

        if (i === 1 && !this.hasIntroAutoAOnce) {
          this.hasIntroAutoAOnce = true;
          await this.waitForIntroStep(50);
          await this.sendCommand('/a');
          await this.waitForIntroStep(200);
        }

        await this.waitForIntroStep(600);
      }
    } finally {
      this.isPlayingIntro = false;
    }
  };

  handleSend = async payload => {
    const rawInput = String(payload?.displayText ?? this.state.inputValue ?? '').trim();
    if (!rawInput) {
      return;
    }
    const modelText = String(payload?.modelText ?? rawInput).trim();
    const userMessage = this.buildMessage(rawInput, 'user');
    userMessage._modelText = modelText;
    userMessage._choiceMeta = payload?.choiceMeta || null;
    this.appendMessage(rawInput, 'user', {
      id: userMessage.id,
      timestamp: userMessage.timestamp,
      _modelText: userMessage._modelText,
      _choiceMeta: userMessage._choiceMeta,
    });
    this.setState({ inputValue: '' });
    try {
      await this.handleTriggers(modelText, userMessage);
    } catch (error) {
      console.warn('AgentChat: handleSend trigger failed', error);
      this.replyFromAgent('Action failed. Please try again.');
    }
  };

  sendCommand = async commandText => {
    const text = commandText.trim();
    if (!text) {
      return;
    }
    const userMessage = this.buildMessage(text, 'user');
    this.appendMessage(userMessage);
    this.setState({ inputValue: '' });
    try {
      await this.handleTriggers(text, userMessage);
    } catch (error) {
      console.warn('AgentChat: sendCommand trigger failed', error);
      this.replyFromAgent('Action failed. Please try again.');
    }
    this.shouldScrollToEnd = true;
  };

  handleTriggers = async (text, userMessage = null) => {
    const trimmed = text.trim();
    const previousHandlingCommandReply = this._handlingCommandReply;
    this._handlingCommandReply = trimmed.startsWith('/');
    try {
    if (await this.handlePendingAISetupInput?.(trimmed)) {
      return;
    }
    const aMatch = /^\/a(?:\s+(.+))?$/i.exec(trimmed);
    if (aMatch) {
      const beforeModel = String(this.state.llmConfig?.model || '');
      await this.handleAIConfigCommand(trimmed);
      const afterModel = String(this.state.llmConfig?.model || '');
      const isFinalModelCommand = /^\/a\s+model\b/i.test(trimmed);

      if (isFinalModelCommand && beforeModel !== afterModel) {
        // no-op for chat mode
      }
      return;
    }
    const helpMatch = /^\/h\b/i.exec(trimmed);
    if (helpMatch) {
      this.replyFromAgent(getCommandHelpMessage());
      return;
    }
    const linkStartMatch = /^\/linkstart\b/i.exec(trimmed);
    if (linkStartMatch) {
      await this.playIntroSequence();
      return;
    }
    if (/^\/m\b/i.test(trimmed)) {
      await Rolecards.handleRoleMemoryCommand(
        this,
        {
          BlueApp,
          BlueElectrum,
          updateKeyValue,
          deleteKeyValue,
          FALLBACK_DATA_PER_BYTE_FEE,
        },
        trimmed,
      );
      return;
    }
    const roleMatch = /^\/r\s+(.+)/i.exec(trimmed);
    if (roleMatch) {
      await Roleplay.handleRoleCommand(this, roleMatch[1], {
        Rolecards,
        buildRoleplayPrompt,
      });
      return;
    }
    if (/^\/r\b/i.test(trimmed)) {
      await Roleplay.handleRoleCommand(this, 'unknown', {
        Rolecards,
        buildRoleplayPrompt,
      });
      this.replyFromAgent(
        Roleplay.buildRoleHistoryMessage(this, {
          getRoleHistoryTitle,
          getCommandUsageMessage,
        }),
      );
      return;
    }

    if (/^\/block\b/i.test(trimmed)) {
      await this.replyWithCurrentBlock();
      return;
    }

    if (/^\/welcome\b/i.test(trimmed)) {
      const payload = trimmed.replace(/^\/welcome\b/i, '').trim();
      if (payload) await this.handleWelcomeCommand(payload);
      else await this.handleWelcomeLookup();
      return;
    }

    if (trimmed.startsWith('/')) {
      this.replyFromAgent('Unknown command. Type /h');
      return;
    }

    await this.replyFromLLM(trimmed, userMessage);
    } finally {
      this._handlingCommandReply = previousHandlingCommandReply;
    }
  };

  runAutoCommand = async () => {
    if (this.hasAutoCommandRun) {
      return;
    }
    const { navigation } = this.props;
    const { autoCommand } = navigation?.state?.params || {};
    if (!autoCommand) {
      return;
    }
    const commandText = autoCommand.trim();
    if (!commandText) {
      return;
    }
    this.hasAutoCommandRun = true;
    this.lastAutoCommand = commandText;
    const userMessage = this.buildMessage(commandText, 'user');
    this.appendMessage(userMessage);
    this.setState({ inputValue: '' });
    await this.handleTriggers(commandText, userMessage);
    this.shouldScrollToEnd = true;
    navigation?.setParams?.({ autoCommand: null });
  };

  runAutoLinkStart = async () => {
    if (this.hasAutoLinkStartRun) {
      return;
    }
    const { suppressAutoLinkStart } = this.props.navigation?.state?.params || {};
    if (suppressAutoLinkStart) {
      return;
    }
    this.hasAutoLinkStartRun = true;
    if (this.hasIntroSequence(this.state.allMessages)) {
      return;
    }
    await this.sendCommand('/linkstart');
  };

  decodeKeyValueEntry = kv => {
    if (!kv) {
      return kv;
    }
    let key = kv.key;
    let value = kv.value;

    try {
      key = kv.key ? decodeBase64(kv.key) : kv.key;
    } catch (error) {
      key = kv.key;
    }

    if (value) {
      try {
        value = b64decode(value);
      } catch (error) {
        value = kv.value;
      }
    }

    return { ...kv, key, value };
  };

  parseWelcomeEnvelope = value => {
    if (!value) {
      return '';
    }
    if (typeof value !== 'string') {
      return String(value);
    }
    try {
      const parsed = JSON.parse(value);
      return parsed.text || parsed.cipher || value;
    } catch (error) {
      return value;
    }
  };

  getNamespaceById = namespaceId => {
    const namespaces = this.props?.namespaceList?.namespaces || {};
    const direct = namespaces?.[namespaceId];
    if (direct) {
      return {
        ...direct,
        namespaceId: direct.namespaceId || direct.id || namespaceId,
      };
    }
    const target = String(namespaceId || '').trim();
    return (
      Object.values(namespaces).find(entry => String(entry?.namespaceId || entry?.id || '').trim() === target) || null
    );
  };


  resolveNamespaceContext = () => {
    const { navigation } = this.props;
    const { namespaceId, shortCode } = navigation.state.params || {};
    if (!namespaceId) {
      return null;
    }

    const namespace = this.getNamespaceById(namespaceId);
    const resolvedNamespaceId = namespace?.namespaceId || namespaceId;
    const scriptHash = namespace?.rootAddress
      ? toScriptHash(namespace.rootAddress)
      : getNamespaceScriptHash(resolvedNamespaceId);
    const agentId = shortCode || resolvedNamespaceId;

    return {
      agentId,
      namespace,
      namespaceId: resolvedNamespaceId,
      scriptHash,
    };
  };

  fetchNamespaceKeyValues = async () => {
    const context = this.resolveNamespaceContext();
    if (!context) {
      return null;
    }

    try {
      await BlueElectrum.ping();
      if (typeof BlueElectrum.waitTillConnected === 'function') {
        await BlueElectrum.waitTillConnected();
      }
      const response = await BlueElectrum.blockchainKeva_getKeyValues(context.scriptHash, -1);
      const keyvalues = Array.isArray(response) ? response : response?.keyvalues || [];
      return {
        context,
        keyvalues: keyvalues.map(this.decodeKeyValueEntry),
      };
    } catch (error) {
      console.warn('AgentChat: failed to fetch keyvalues', error);
      return null;
    }
  };

  fetchLatestKeyValue = async keyName => {
    const data = await this.fetchNamespaceKeyValues();
    if (!data?.keyvalues?.length) {
      return null;
    }

    const entry = data.keyvalues
      .slice()
      .reverse()
      .find(item => item?.key === keyName);

    if (!entry) {
      return null;
    }
    if (typeof entry.value === 'string') {
      return entry.value;
    }
    if (entry.value === null || typeof entry.value === 'undefined') {
      return '';
    }
    return String(entry.value || '');
  };

  fetchWelcomeValue = async () => {
    try {
      const value = await this.fetchLatestKeyValue('welcome');
      if (!value) {
        return null;
      }
      const parsedValue = this.parseWelcomeEnvelope(value);
      const welcomeText = typeof parsedValue === 'string' ? parsedValue.trim() : String(parsedValue || '').trim();
      return welcomeText || null;
    } catch (error) {
      console.warn('AgentChat: failed to load welcome message', error);
      return null;
    }
  };

  handleWelcomeLookup = async () => {
    const welcomeText = await this.fetchWelcomeValue();
    if (welcomeText) {
      this.replyFromAgent(welcomeText);
      return;
    }
    this.replyFromAgent(getCommandUsageMessage('welcome'));
  };

  handleWelcomeCommand = async rawValue => {
    const { navigation } = this.props;
    const { namespaceId, walletId } = navigation.state.params || {};
    const value = String(rawValue || '')
      .trim()
      .slice(0, 1000);

    if (!value) {
      this.replyFromAgent('Welcome message is empty.');
      return;
    }
    if (!namespaceId || !walletId) {
      this.replyFromAgent('Missing namespace or wallet information to save welcome message.');
      return;
    }

    const wallet = BlueApp.getWallets().find(w => w.getID() === walletId);
    if (!wallet) {
      this.replyFromAgent('Wallet not found for this agent.');
      return;
    }

    try {
      await this.updateKeyValue({
        wallet,
        namespaceId,
        key: 'welcome',
        value,
      });
      this.replyFromAgent('Saved welcome message on-chain.');
    } catch (e) {
      console.warn('AgentChat: failed to save welcome', e);
      this.replyFromAgent('Failed to save welcome message.');
    }
  };

  updateKeyValue = async ({ wallet, namespaceId, key, value }) => {
    await BlueElectrum.ping();
    if (typeof BlueElectrum.waitTillConnected === 'function') {
      await BlueElectrum.waitTillConnected();
    }
    const { tx } = await updateKeyValue(wallet, FALLBACK_DATA_PER_BYTE_FEE, namespaceId, key, value);
    const result = await BlueElectrum.broadcast(tx);
    if (result?.code) {
      throw new Error(result.message || 'Broadcast failed');
    }
    await BlueApp.saveToDisk();
    return result;
  };

  replyWithCurrentBlock = async () => {
    try {
      await BlueElectrum.ping();
      if (typeof BlueElectrum.waitTillConnected === 'function') {
        await BlueElectrum.waitTillConnected();
      }
      const height = await BlueElectrum.blockchainBlock_count();
      this.replyFromAgent(`Current block: ${height}`);
    } catch (e) {
      this.replyFromAgent(`Failed to fetch current block: ${String(e?.message || e)}`);
      console.warn('AgentChat: /block failed', e);
    }
  };

  openSubmitFromMessage = messageText => {
    const { navigation } = this.props;
    const { namespaceId, walletId } = navigation.state.params || {};
    if (!navigation || typeof navigation.navigate !== 'function') {
      return;
    }
    navigation.navigate('AddKeyValue', {
      namespaceId,
      walletId,
      key: this.formatSubmitTitle(),
      value: messageText,
    });
  };

  isModelMenuLikeText = text => {
    const raw = String(text || '');
    const lower = raw.toLowerCase();
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const trimmedLower = normalized.toLowerCase();
    return lower.includes('[[/a')
      || lower.includes('[[/reopen')
      || trimmedLower === '/a'
      || trimmedLower.startsWith('/a ')
      || trimmedLower.startsWith('model status')
      || trimmedLower.startsWith('role model check')
      || trimmedLower.startsWith('model selected')
      || trimmedLower.startsWith('model ')
      || trimmedLower.startsWith('language ')
      || trimmedLower === 'model'
      || trimmedLower === 'memory'
      || trimmedLower === 'voice'
      || trimmedLower === 'voice settings'
      || trimmedLower.includes('memory story voice model')
      || trimmedLower.includes('story voice model')
      || trimmedLower.startsWith('select model')
      || trimmedLower.startsWith('enter api key')
      || trimmedLower.startsWith('remove key')
      || trimmedLower.startsWith('custom model')
      || trimmedLower.startsWith('unknown provider')
      || trimmedLower.startsWith('failed to load models')
      || trimmedLower.startsWith('xkeva is built in.')
      || lower.includes('free channel')
      || lower.includes('free window')
      || lower.includes('free_window_inactive')
      || lower.includes('xkeva 免费通道')
      || lower.includes('xkeva 免費通道')
      || normalized.includes('当前 xKEVA 免费通道已结束')
      || normalized.includes('目前 xKEVA 免費通道已結束')
      || normalized.startsWith('模型状态')
      || normalized.startsWith('模型狀態')
      || normalized.startsWith('モデル状態')
      || normalized.startsWith('모델 상태')
      || normalized.startsWith('模型')
      || normalized.startsWith('语言')
      || normalized.startsWith('語言')
      || normalized.startsWith('记忆')
      || normalized.startsWith('記憶')
      || normalized.startsWith('选择模型')
      || normalized.startsWith('移除密钥')
      || normalized.startsWith('自定义模型')
      || normalized.startsWith('输入 API key')
      || normalized.startsWith('輸入 API key');
  };

  replyFromAgent = (text, options = {}) => {
    const reply = {
      ...this.buildMessage(text, 'agent'),
      ...(options || {}),
      _useSatoshiAvatar: Boolean(options?._useSatoshiAvatar || this._handlingCommandReply || this.isModelMenuLikeText(text)),
    };
    this.appendMessage(reply);
  };

  replyFromAgentSeedCard = (text, copyText, linkLabel = 'Copy full Destiny Seed Card') => {
    const reply = {
      ...this.buildMessage(text, 'agent'),
      copyText,
      linkLabel,
      _useSatoshiAvatar: Boolean(this._handlingCommandReply || this.isModelMenuLikeText(text)),
    };
    this.appendMessage(reply);
  };

  formatSubmitTitle = () => {
    return timeConverter(Math.floor(Date.now() / 1000));
  };

  handleMessagePress = messageText => {
    if (messageText) {
      Clipboard.setString(messageText);
    }
  };

  handleDigestPress = async digestItem => {
    if (!digestItem?.ref?.day || !digestItem?.ref?.rawId) {
      return;
    }
    try {
      const rawEntries = await readStoryEntriesByDay(this.agentChatDir, digestItem.ref.day, 'raw');
      const rawMessage = rawEntries.find(entry => entry?.id === digestItem.ref.rawId);
      if (!rawMessage?.text) {
        showStatus(getStoryUiText('rawMissing'), 2000);
        return;
      }
      Alert.alert(getStoryUiText('rawTitle'), rawMessage.text);
    } catch (error) {
      console.warn('Failed to open raw message', error);
      showStatus(getStoryUiText('rawReadFail'), 2000);
    }
  };

  handleRegenerateDigest = async digestItem => {
    if (!digestItem?.ref?.day || !digestItem?.ref?.rawId) {
      return;
    }
    try {
      const rawEntries = await readStoryEntriesByDay(this.agentChatDir, digestItem.ref.day, 'raw');
      const rawMessage = rawEntries.find(entry => entry?.id === digestItem.ref.rawId);
      if (!rawMessage) {
        showStatus(getStoryUiText('rawMissing'), 2000);
        return;
      }
      const text = toDigestFallbackText(await this.buildStoryDigestText(rawMessage));
      const updated = await updateDigestEntry(this.agentChatDir, digestItem.ref.day, digestItem.id, {
        text,
        regen: 0,
      });
      if (!updated) {
        throw new Error('digest entry missing');
      }
      this.setState(prevState => ({
        messages: prevState.messages.map(message => (message?.id === digestItem.id ? { ...message, text, regen: 0 } : message)),
      }));
    } catch (error) {
      console.warn('Failed to regenerate digest', error);
      showStatus(getStoryUiText('regenFail'), 2000);
    }
  };


  getStoryLangMenuMessage = () => {
    const currentCode = this.getStoryLangCode();
    const currentLabel = currentCode ? getStoryLangLabel(currentCode) : 'Not set';
    return [
      `Current language: ${currentCode ? `${currentLabel} (${currentCode})` : 'Not set'}`,
      '',
      '[[/lang en|English]]   [[/lang zh-cn|中文]]   [[/lang other|Other languages]]',
    ].join('\n');
  };

  getSupportedStoryLangListMessage = () => {
    const lines = ['Supported languages:', ''];
    for (let i = 0; i < STORY_SUPPORTED_LANGS.length; i += 3) {
      const row = STORY_SUPPORTED_LANGS.slice(i, i + 3)
        .map(item => `[[/lang ${item.code}|${item.label}]]`)
        .join('   ');
      lines.push(row);
    }
    return lines.join('\n');
  };

  appendStoryCommandMessage = text => {
    this.appendMessage({
      ...this.buildMessage(text, 'agent'),
      _useSatoshiAvatar: true,
    }, 'user', {
      _renderMode: 'commands',
      _localOnly: true,
      _useSatoshiAvatar: true,
    });
  };

  handleLangCommand = async argsString => {
    if (!this.isStoryScope) {
      showStatus('"/lang" is only available in Story mode', 2000);
      return true;
    }
    const args = String(argsString || '').trim();
    if (!args) {
      this.appendStoryCommandMessage(this.getStoryLangMenuMessage());
      return true;
    }

    const normalizedArg = normalizeStoryLangCode(args);
    if (normalizedArg === 'other') {
      this.appendStoryCommandMessage(this.getSupportedStoryLangListMessage());
      return true;
    }

    const isSupported = STORY_SUPPORTED_LANGS.some(item => item.code === normalizedArg);
    if (!isSupported) {
      showStatus(`Unsupported language code: ${args}`, 2000);
      this.appendStoryCommandMessage(this.getStoryLangMenuMessage());
      return true;
    }

    await this.setStoryLangCode(normalizedArg);
    this.appendStoryCommandMessage(this.getStoryLangMenuMessage());

    if (this.state.pendingDestinyRun) {
      const pendingMode = this.state.pendingDestinyMode || 'menu';
      await new Promise(resolve => this.setState({ pendingDestinyRun: false, pendingDestinyMode: null }, resolve));
      await this.handleDestinyCommand(pendingMode);
    } else {
      await this.handleDestinyCommand('menu');
    }

    return true;
  };

  getStoryLangCode = () => {
    if (!this.isStoryScope) {
      return null;
    }
    const code = this.state.storyLangCode;
    if (!code) {
      return null;
    }
    return normalizeStoryLangCode(code);
  };

  getDestinyModeFromArg = value => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'continue') {
      return 'continue';
    }
    if (normalized === 'new') {
      return 'new';
    }
    if (normalized === 'offline') {
      return 'offline';
    }
    if (normalized === 'story') {
      return 'story';
    }
    return 'menu';
  };

  buildDestinyModeMenuMessage = () => {
    if (!this.isStoryScope) {
      return [
        'What would you like to do?',
        '',
        '[[/d offline|Offline copy version]]',
        '',
        '[[/d story|Open Story window]]',
      ].join('\n');
    }

    return [
      'What would you like to do?',
      '',
      '[[/d continue|Continue story]]',
      '',
      '[[/d new|Start new]]',
      '',
      'Memory review (coming soon)',
      '',
      '[[/lang|Change language]]',
      '',
      '[[/a list|Change model]]',
      '',
      'Generate agent memory (coming soon)',
    ].join('\n');
  };

  buildDestinyCurrentLanguageNotice = () => {
    const code = this.getStoryLangCode();
    const label = code ? getStoryLangLabel(code) : '';
    if (!code) {
      return 'Current language: Not set';
    }
    return `Current language: ${label} (${code})`;
  };

  buildStoryCondensedMemory = async (limit = 50) => {
    if (!this.isStoryScope) {
      return '';
    }
    try {
      const digestDir = `${this.agentChatDir}/digest`;
      const exists = await RNFS.exists(digestDir);
      if (!exists) {
        return '';
      }
      const entries = await RNFS.readDir(digestDir);
      const keys = entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
        .map(name => name.replace('.json', ''))
        .sort()
        .reverse();

      const picked = [];
      for (const dayKey of keys) {
        if (picked.length >= limit) {
          break;
        }
        const dayEntries = await this.readDigestDayEntries(dayKey);
        if (!Array.isArray(dayEntries) || dayEntries.length === 0) {
          continue;
        }
        for (let i = dayEntries.length - 1; i >= 0; i -= 1) {
          const item = dayEntries[i];
          const digestText = String(item?.summary || item?.text || '').trim();
          if (!digestText) {
            continue;
          }
          picked.push({ role: item?.role === 'user' ? 'U' : 'A', text: digestText });
          if (picked.length >= limit) {
            break;
          }
        }
      }

      if (picked.length === 0) {
        return '';
      }

      return picked
        .reverse()
        .map(item => `${item.role}: ${item.text}`)
        .join('\n');
    } catch (error) {
      console.warn('Failed to build condensed story memory', error);
      return '';
    }
  };

  handleDestinyCommand = async modeArg => {
    const mode = this.getDestinyModeFromArg(modeArg);
    if (!this.isStoryScope) {
      if (mode === 'offline') {
        const seedPrompt = buildDestinySeedPrompt(this.agentId);
        const preview = [
          'Destiny Seed Card preview (offline copy version):',
          '',
          ...String(seedPrompt || '').split('\n').slice(0, 18),
          '',
          'Open the copy link below and paste the full card into an external/offline model to run it.',
        ].join('\n');
        this.replyFromAgentSeedCard(preview, seedPrompt);
        return;
      }

      if (mode === 'story') {
        this.replyFromAgent('Please open the Story window, then use /d there to start the live Story runtime.');
        return;
      }

      this.replyFromAgent(this.buildDestinyModeMenuMessage());
      return;
    }

    const lang = this.getStoryLangCode();
    if (!lang) {
      await new Promise(resolve =>
        this.setState({ pendingDestinyRun: true, pendingDestinyMode: mode }, resolve)
      );
      await this.handleLangCommand('');
      return;
    }

    this.appendStoryCommandMessage(this.buildDestinyCurrentLanguageNotice());

    if (mode === 'menu') {
      this.setState({ pendingReturnToDestinyMenu: false, pendingModelFinalConfirm: false });
      this.appendStoryCommandMessage(this.buildDestinyModeMenuMessage());
      return;
    }

    if (mode === 'continue') {
      const condensedMemory = await this.buildStoryCondensedMemory();
      await this.startDestinyRun({ memoryMode: 'continue', condensedMemory });
      return;
    }

    await this.startDestinyRun({ memoryMode: 'new', condensedMemory: '' });
    return;
  };

  startDestinyRun = async options => {
    await Destiny.handleDestinyCommand(this, {
      buildDestinySeedPrompt,
      loc,
      storyLangCode: this.getStoryLangCode(),
      memoryMode: options?.memoryMode || 'new',
      condensedMemory: String(options?.condensedMemory || ''),
    });
  };

  getStoryLanguageInstruction = () => {
    if (!this.isStoryScope) {
      return '';
    }
    const code = this.getStoryLangCode();
    if (!code) {
      return '';
    }
    switch (code) {
      case 'zh-cn':
        return 'Language: Simplified Chinese. Reply only in Simplified Chinese.';
      case 'zh-tw':
        return 'Language: Traditional Chinese. Reply only in Traditional Chinese.';
      case 'ja':
        return 'Language: Japanese. Reply only in Japanese.';
      default:
        return `Language: ${getStoryLangLabel(code)}. Reply only in ${getStoryLangLabel(code)}.`;
    }
  };

  isInteractiveCommand = commandText => {
    if (!commandText) {
      return false;
    }
    const trimmed = commandText.trim();
    if (/^\/welcome\b/i.test(trimmed)) {
      return true;
    }
    if (/^\/r\b/i.test(trimmed)) {
      return true;
    }
    return true;
  };

  isValidCommandText = text => {
    if (!text) {
      return false;
    }
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) {
      return false;
    }
    if (/^\/h\b/i.test(trimmed)) {
      return true;
    }
    if (/^\/linkstart\b/i.test(trimmed)) {
      return true;
    }
    if (/^\/a\b/i.test(trimmed)) {
      return true;
    }
    if (/^\/r\s+.+/i.test(trimmed)) {
      return true;
    }
    if (/^\/r\b/i.test(trimmed)) {
      return true;
    }
    if (/^\/welcome\s+.+/i.test(trimmed)) {
      return true;
    }
    if (/^\/welcome\b/i.test(trimmed)) {
      return true;
    }
    if (/^\/m\b/i.test(trimmed)) {
      return true;
    }
    if (/^\/block$/i.test(trimmed)) {
      return true;
    }
    return false;
  };

  getCommandSegments = text => {
    if (!text) {
      return [];
    }
    const segments = [];
    const commandRegex = new RegExp(COMMAND_TOKEN_REGEX);
    const displayRegex = new RegExp(COMMAND_DISPLAY_TOKEN_REGEX);
    let lastIndex = 0;

    while (lastIndex < text.length) {
      commandRegex.lastIndex = lastIndex;
      displayRegex.lastIndex = lastIndex;
      const commandMatch = commandRegex.exec(text);
      const displayMatch = displayRegex.exec(text);
      let nextMatch = null;
      let matchType = null;

      if (commandMatch && displayMatch) {
        if (displayMatch.index <= commandMatch.index) {
          nextMatch = displayMatch;
          matchType = 'display';
        } else {
          nextMatch = commandMatch;
          matchType = 'command';
        }
      } else if (displayMatch) {
        nextMatch = displayMatch;
        matchType = 'display';
      } else if (commandMatch) {
        nextMatch = commandMatch;
        matchType = 'command';
      }

      if (!nextMatch) {
        segments.push({ text: text.slice(lastIndex), isCommand: false });
        break;
      }

      if (nextMatch.index > lastIndex) {
        segments.push({ text: text.slice(lastIndex, nextMatch.index), isCommand: false });
      }

      if (matchType === 'display') {
        const commandText = nextMatch[1];
        const displayText = nextMatch[2];
        segments.push({
          text: displayText,
          displayText,
          commandText,
          isCommand: this.isInteractiveCommand(commandText),
        });
        lastIndex = nextMatch.index + nextMatch[0].length;
      } else {
        const commandText = nextMatch[0];
        segments.push({ text: commandText, isCommand: this.isInteractiveCommand(commandText) });
        lastIndex = nextMatch.index + nextMatch[0].length;
      }
    }
    return segments;
  };

  extractStoryChoices = text => {
    if (!text) {
      return [];
    }

    const lines = String(text)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    const choices = [];
    const seenSends = new Set();

    const addChoice = (key, send, label) => {
      const normalizedSend = String(send || '').trim();
      if (!normalizedSend || seenSends.has(normalizedSend)) {
        return;
      }
      seenSends.add(normalizedSend);
      choices.push({ key: String(key || normalizedSend), send: normalizedSend, label: String(label || normalizedSend) });
    };

    lines.forEach(line => {
      const prefixMatch = line.match(/^\s*(?:\[\s*([A-Za-z]|\d{1,2})\s*\]|([A-Za-z]|\d{1,2})\s*[).:])\s*(.+)$/);
      if (prefixMatch) {
        const marker = (prefixMatch[1] || prefixMatch[2] || '').trim();
        const content = (prefixMatch[3] || '').trim();
        if (marker && content.length >= 2) {
          const send = /^\d+$/.test(marker) ? marker : marker.toUpperCase();
          addChoice(send, send, line);
        }
        return;
      }

      const ynMatch = line.match(/^\s*(yes|no|y|n)\s*(?:[\/|]\s*(yes|no|y|n))?\s*$/i);
      if (!ynMatch) {
        return;
      }

      const first = ynMatch[1];
      const second = ynMatch[2];
      const normalizeBinary = value => {
        if (!value) {
          return null;
        }
        const lower = value.toLowerCase();
        if (lower === 'yes' || lower === 'y') {
          return { key: 'Y', send: 'Y', label: 'Y' };
        }
        if (lower === 'no' || lower === 'n') {
          return { key: 'N', send: 'N', label: 'N' };
        }
        return null;
      };

      const normalizedFirst = normalizeBinary(first);
      const normalizedSecond = normalizeBinary(second);
      if (normalizedFirst) {
        addChoice(normalizedFirst.key, normalizedFirst.send, normalizedFirst.label);
      }
      if (normalizedSecond) {
        addChoice(normalizedSecond.key, normalizedSecond.send, normalizedSecond.label);
      }
    });

    return choices;
  };

  parseStoryLineSegments = line => {
    const text = String(line || '');
    if (!text) {
      return [];
    }

    const chunks = text.split(/(\s*[\/|]\s*)/);
    const segments = [];

    chunks.forEach(chunk => {
      if (!chunk) {
        return;
      }
      const trimmed = chunk.trim();
      const isDivider = /^\s*[\/|]\s*$/.test(chunk);
      if (!trimmed || isDivider) {
        segments.push({ type: 'text', text: chunk });
        return;
      }

      const prefixMatch = trimmed.match(/^\s*(?:\[\s*([A-Za-z]|\d{1,2})\s*\]|([A-Za-z]|\d{1,2})\s*[).:])\s*(.+)$/);
      if (prefixMatch) {
        const marker = (prefixMatch[1] || prefixMatch[2] || '').trim();
        const content = (prefixMatch[3] || '').trim();
        if (marker && content.length >= 1) {
          const send = /^\d+$/.test(marker) ? marker : marker.toUpperCase();
          segments.push({ type: 'choice', raw: chunk, send, display: content });
          return;
        }
      }

      const ynMatch = trimmed.match(/^(yes|no|y|n)\s*$/i);
      if (ynMatch) {
        const value = ynMatch[1].toLowerCase();
        const send = value === 'yes' || value === 'y' ? 'Y' : 'N';
        segments.push({ type: 'choice', raw: chunk, send, display: trimmed });
        return;
      }

      segments.push({ type: 'text', text: chunk });
    });

    return segments;
  };

  buildStoryInlineLines = text => {
    const raw = String(text || '');
    if (!raw) {
      return [];
    }

    return raw.split(/\r?\n/).map(lineRaw => {
      const segments = this.parseStoryLineSegments(lineRaw);
      return {
        type: 'line',
        segments: segments.length > 0 ? segments : [{ type: 'text', text: lineRaw }],
        rawLine: lineRaw,
      };
    });
  };

  handleCommandPress = commandText => {
    const cmd = String(commandText || '').trim();
    if (this.isStoryScope && /^\/a\s+list\b/i.test(cmd)) {
      this.setState(
        { pendingReturnToDestinyMenu: true, pendingModelFinalConfirm: true },
        () => this.sendCommand(cmd)
      );
      return;
    }
    this.sendCommand(cmd);
  };

  handleStoryChoicePress = (modelText, displayText, choiceMeta = null) => {
    this.handleSend({
      modelText: String(modelText || ''),
      displayText: String(displayText || modelText || ''),
      choiceMeta,
    });
  };

  handleMessageLongPress = messageText => {
    if (!messageText) {
      return;
    }
    Clipboard.setString(messageText);
    showStatus('Copied to clipboard', 2000);
    if (Platform.OS === 'ios') {
      ActionSheet.showActionSheetWithOptions(
        {
          options: ['Copy', 'Submit to my namespace', 'Cancel'],
          cancelButtonIndex: 2,
        },
        buttonIndex => {
          if (buttonIndex === 0) {
            Clipboard.setString(messageText);
          }
          if (buttonIndex === 1) {
            this.handleAvatarPress(messageText);
          }
        },
      );
    } else {
      ActionSheet.showActionSheetWithOptions({
        title: '',
        message: '',
        buttons: [
          {
            text: 'Cancel',
            onPress: () => {},
            style: 'cancel',
          },
          {
            text: 'Copy',
            onPress: () => Clipboard.setString(messageText),
          },
          {
            text: 'Submit to my namespace',
            onPress: () => this.handleAvatarPress(messageText),
          },
        ],
      });
    }
  };

  handleAvatarPress = messageText => this.openSubmitFromMessage(messageText);

  handleTitlePress = () => {
    const { navigation, namespaceList } = this.props;
    if (!navigation || typeof navigation.navigate !== 'function') {
      return;
    }
    const { namespaceId, displayName, shortCode, walletId } = navigation.state.params || {};
    const namespace = namespaceId ? namespaceList?.namespaces?.[namespaceId] : null;
    navigation.navigate('KeyValues', {
      namespaceId: namespace?.id || namespaceId,
      shortCode: namespace?.shortCode || shortCode,
      displayName: namespace?.displayName || displayName,
      txid: namespace?.txId,
      rootAddress: namespace?.rootAddress,
      walletId: namespace?.walletId || walletId,
      price: namespace?.price,
      desc: namespace?.desc,
      addr: namespace?.addr,
      profile: namespace?.profile,
    });
  };

  loadMoreHistory = async () => {
    if (this.isStoryScope || this.loadingMore) {
      return;
    }

    // 清屏后的第一次上翻：先加载最新日期文件
    if (this.state.allMessages.length === 0 && this.loadedDateKeys.length === 0) {
      const keys = this.allDateKeys?.length ? this.allDateKeys : await this.listDateKeys();
      this.allDateKeys = keys;
      if (keys.length === 0) {
        return;
      }

      this.loadingMore = true;
      const latestKey = keys[0];
      const msgs = await this.readDayMessages(latestKey);
      const initialCount = Math.min(msgs.length, PAGE_SIZE);

      this.setState(
        {
          allMessages: msgs,
          visibleCount: initialCount,
          messages: msgs.slice(-initialCount),
        },
        () => {
          this.loadedDateKeys = [latestKey];
          this.loadingMore = false;
        },
      );
      return;
    }

    const { allMessages, visibleCount } = this.state;
    if (visibleCount < allMessages.length) {
      this.loadingMore = true;
      this.setState(
        prevState => {
          const nextCount = Math.min(prevState.allMessages.length, prevState.visibleCount + PAGE_SIZE);
          return {
            visibleCount: nextCount,
            messages: prevState.allMessages.slice(-nextCount),
          };
        },
        () => {
          this.loadingMore = false;
        },
      );
      return;
    }

    const loadedEarliestKey = this.loadedDateKeys[this.loadedDateKeys.length - 1];
    const loadedIndex = this.allDateKeys.indexOf(loadedEarliestKey);
    const nextIndex = loadedIndex + 1;
    if (nextIndex < 0 || nextIndex >= this.allDateKeys.length) {
      return;
    }

    this.loadingMore = true;
    const nextKey = this.allDateKeys[nextIndex];
    const olderMessages = await this.readDayMessages(nextKey);
    this.setState(
      prevState => {
        const mergedMessages = [...olderMessages, ...prevState.allMessages];
        const nextCount = Math.min(mergedMessages.length, prevState.visibleCount + PAGE_SIZE);
        return {
          allMessages: mergedMessages,
          visibleCount: nextCount,
          messages: mergedMessages.slice(-nextCount),
        };
      },
      () => {
        this.loadedDateKeys.push(nextKey);
        this.loadingMore = false;
      },
    );
  };

  handleScroll = event => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset?.y <= 20) {
      this.loadMoreHistory();
    }
    const paddingToBottom = 80;
    const layoutHeight = layoutMeasurement?.height || 0;
    const contentHeight = contentSize?.height || 0;
    const offsetY = contentOffset?.y || 0;
    this.isNearBottom = layoutHeight + offsetY >= contentHeight - paddingToBottom;
  };

  scrollToBottomOffset = (animated = true) => {
    if (!this.listRef) {
      return;
    }
    const offset = Math.max(0, (this.lastContentHeight || 0) + 200);
    this.listRef.scrollToOffset({ offset, animated });
  };

  handleContentSizeChange = (width, height) => {
    this.lastContentHeight = height || 0;
    const shouldFollow = this.forceScrollToBottomOnce || (this.shouldScrollToEnd && this.isNearBottom);
    if (shouldFollow && this.lastContentHeight > 0) {
      requestAnimationFrame(() => this.scrollToBottomOffset(true));
    }
    this.forceScrollToBottomOnce = false;
    this.shouldScrollToEnd = false;
  };

  shouldShowTimestamp = index => {
    const { messages } = this.state;
    const current = messages[index];
    if (!current) {
      return false;
    }
    if (index === 0) {
      return true;
    }
    const prev = messages[index - 1];
    const currentTs = current.timestamp || current.t || 0;
    const prevTs = prev.timestamp || prev.t || 0;
    return currentTs - prevTs > 30 * 60 * 1000;
  };

  formatTimestamp = timestamp => {
    const date = new Date(timestamp);
    const now = new Date();

    const pad = num => (num < 10 ? `0${num}` : `${num}`);
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isSameDay) {
      return time;
    }
    if (isYesterday) {
      return `Yesterday ${time}`;
    }
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`;
  };

  loadUserAvatar = async () => {
    try {
      const userAvatarUri = await getUserAvatarUri();
      if (this._isMounted) {
        this.setState({ userAvatarUri });
      }
    } catch (error) {
      console.warn('Failed to load user avatar for agentchat', error);
    }
  };

  loadAgentLocalAvatar = async () => {
    try {
      const { shortCode } = this.props.navigation.state.params || {};
      if (!shortCode) {
        if (this._isMounted) this.setState({ agentLocalAvatarUri: null });
        return;
      }
      const path = getNamespaceAvatarPath(shortCode);
      const exists = await RNFS.exists(path);
      if (this._isMounted) {
        this.setState({ agentLocalAvatarUri: exists ? `file://${path}` : null });
      }
    } catch (error) {
      console.warn('Failed to load agentchat local avatar', error);
    }
  }

  getUserAvatar = () => {
    if (this.state?.userAvatarUri) {
      return { type: 'image', uri: this.state.userAvatarUri };
    }
    const { namespaceList } = this.props;
    const firstId = namespaceList?.order?.[0];
    const namespace = firstId ? namespaceList?.namespaces?.[firstId] : null;
    if (!namespace) {
      return null;
    }
    const avatarUri = buildHeadAssetUri(namespace.shortCode);
    if (avatarUri) {
      return { type: 'image', uri: avatarUri };
    }
    const displayName = namespace.displayName || ' ';
    return {
      type: 'fallback',
      initials: getInitials(displayName),
      color: stringToColor(displayName),
    };
  };

  shouldUseSatoshiPreLLMAvatar = (item = null, visibleIndex = -1) => {
    const allMessages = Array.isArray(this.state?.allMessages) ? this.state.allMessages : [];
    if (allMessages.length === 0) {
      return true;
    }
    const firstCompletedLLMIndex = allMessages.findIndex(message =>
      (message?.sender === 'agent' || message?.role === 'assistant') && message?.requestId && !message?.pending,
    );
    if (firstCompletedLLMIndex < 0) {
      return true;
    }
    const itemId = item?.id ? String(item.id) : '';
    const allIndex = itemId ? allMessages.findIndex(message => String(message?.id || '') === itemId) : -1;
    if (allIndex >= 0) {
      return allIndex < firstCompletedLLMIndex;
    }
    return visibleIndex >= 0 ? visibleIndex < firstCompletedLLMIndex : false;
  };

  renderAvatar = (sender, item = null, visibleIndex = -1) => {
    const isUser = sender === 'user';
    if (isUser) {
      const userAvatar = this.getUserAvatar();
      if (userAvatar?.type === 'image') {
        return (
          <View style={[styles.avatarWrapper, styles.userAvatarWrapper]}>
            <Image source={{ uri: userAvatar.uri }} style={styles.avatarImage} resizeMode="cover" />
          </View>
        );
      }
      if (userAvatar?.type === 'fallback') {
        return (
          <View
            style={[
              styles.avatarWrapper,
              styles.userAvatarWrapper,
              styles.userAvatarFallback,
              { backgroundColor: userAvatar.color },
            ]}
          >
            <Text style={styles.userAvatarText}>{userAvatar.initials}</Text>
          </View>
        );
      }
      return (
        <View style={[styles.avatarWrapper, styles.userAvatarWrapper, styles.userAvatarBlank]} />
      );
    }

    const { shortCode } = this.props.navigation.state.params || {};
    const localAvatarUri = this.state.agentLocalAvatarUri;
    const avatarUri = buildHeadAssetUri(shortCode);
    const source = (item?._useSatoshiAvatar || this.isModelMenuLikeText(item?.text || '') || this.shouldUseSatoshiPreLLMAvatar(item, visibleIndex))
      ? SATOSHI_PRE_LLM_AVATAR_SOURCE
      : (localAvatarUri ? { uri: localAvatarUri } : (avatarUri ? { uri: avatarUri } : require('../../img/bluebeast.png')));
    return (
      <View style={[styles.avatarWrapper, styles.agentAvatarWrapper]}>
        <Image source={source} style={styles.avatarImage} resizeMode="cover" />
      </View>
    );
  };

  renderMessage = ({ item, index }) => {
    const showDigest = this.isStoryScope && this.state.storyShortMode && item?._isHistory === true;
    const isStoryDigest = this.isStoryScope && Boolean(item?.ref) && showDigest;
    const isUser = item?.sender === 'user' || item?.role === 'user';
    const text = showDigest ? item?.digest || item?.summary || item?.text || '' : item?.text || '';
    const hasCopyLink = Boolean(item.copyText && item.linkLabel) && !isStoryDigest;
    const forceCommandRender = item?._renderMode === 'commands';
    const commandSegments =
      isUser && !isStoryDigest && this.isValidCommandText(text)
        ? [{ text, isCommand: true }]
        : this.getCommandSegments(text);
    const hasCommand = Array.isArray(commandSegments) && commandSegments.some(segment => segment.isCommand || segment.commandText);
    const inlineLines =
      this.isStoryScope && !forceCommandRender && !isUser && !isStoryDigest && !hasCommand ? this.buildStoryInlineLines(text) : null;
    const hasCommandTokens = commandSegments.some(segment => segment.isCommand);
    const messageTextStyle = [styles.messageText, isUser ? styles.userText : styles.agentText];
    const commandTextStyle = isUser ? styles.commandTextUser : styles.commandText;
    return (
      <>
        {this.shouldShowTimestamp(index) && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>{this.formatTimestamp(item.timestamp || item.t)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isUser ? styles.userRow : styles.agentRow]}>
          {!isUser && (
            <TouchableOpacity
              accessibilityLabel="Open submit form"
              activeOpacity={0.7}
              onPress={() => this.handleAvatarPress(text)}
              style={styles.avatarPressable}
            >
              {this.renderAvatar('agent', item, index)}
            </TouchableOpacity>
          )}
          <View style={[styles.bubbleColumn, isUser ? styles.userBubbleColumn : styles.agentBubbleColumn]}>
            <TouchableOpacity
              accessibilityLabel="Chat message"
              activeOpacity={0.7}
              onPress={
                hasCopyLink || hasCommandTokens
                  ? undefined
                  : () => (isStoryDigest ? this.handleDigestPress(item) : this.handleMessagePress(showDigest ? item?.text || '' : text))
              }
              onLongPress={
                hasCopyLink || hasCommandTokens || isStoryDigest
                  ? undefined
                  : () => this.handleMessageLongPress(showDigest ? item?.text || '' : text)
              }
              style={[styles.messageBubble, isUser ? styles.userBubble : styles.agentBubble]}
            >
              <Text style={messageTextStyle}>
                {inlineLines
                  ? inlineLines.map((lineItem, lineIndex) => (
                      <Text key={`${item.id}-ln-${lineIndex}`}>
                        {lineItem.segments.map((segment, segmentIndex) =>
                          segment.type === 'choice' ? (
                            <Text
                              key={`${item.id}-ln-${lineIndex}-seg-${segmentIndex}`}
                              style={[messageTextStyle, styles.storyChoiceInline]}
                              onPress={() => this.handleStoryChoicePress(segment.send, segment.display, { raw: segment.raw })}
                              suppressHighlighting
                            >
                              {segment.raw}
                            </Text>
                          ) : (
                            <Text key={`${item.id}-ln-${lineIndex}-seg-${segmentIndex}`} style={messageTextStyle}>
                              {segment.text}
                            </Text>
                          ),
                        )}
                        {(() => {
                          if (lineIndex === inlineLines.length - 1) {
                            return '';
                          }
                          const lineHasChoice =
                            lineItem?.type === 'choice' || lineItem?.segments?.some(segment => segment?.type === 'choice');
                          return lineHasChoice ? '\n\n' : '\n';
                        })()}
                      </Text>
                    ))
                  : commandSegments.length === 0
                    ? text
                    : commandSegments.map((segment, segmentIndex) =>
                        segment.isCommand ? (
                          <Text
                            key={`${item.id}-command-${segmentIndex}`}
                            style={[messageTextStyle, commandTextStyle]}
                            onPress={() => this.handleCommandPress(segment.commandText || segment.text)}
                          >
                            {segment.displayText || segment.text}
                          </Text>
                        ) : (
                          <Text key={`${item.id}-text-${segmentIndex}`} style={messageTextStyle}>
                            {segment.text}
                          </Text>
                        ),
                      )}
              </Text>
              {hasCopyLink && (
                <TouchableOpacity
                  accessibilityLabel="Copy destiny seed card"
                  activeOpacity={0.7}
                  onPress={() => this.handleMessagePress(item.copyText)}
                >
                  <Text style={[styles.messageText, styles.linkText]}>{item.linkLabel}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {isStoryDigest && item.regen === 1 && (
              <TouchableOpacity
                accessibilityLabel="Regenerate digest"
                activeOpacity={0.7}
                style={styles.regenButton}
                onPress={() => this.handleRegenerateDigest(item)}
              >
                <Text style={styles.regenButtonText}>{getStoryUiText('regenDigest')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {isUser && (
            <TouchableOpacity
              accessibilityLabel="Open submit form"
              activeOpacity={0.7}
              onPress={() => this.handleAvatarPress(text)}
              style={styles.avatarPressable}
            >
              {this.renderAvatar('user')}
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.chatContainer}>
            <FlatList
              ref={ref => {
                this.listRef = ref;
              }}
              data={this.state.messages}
              keyExtractor={item => item.id}
              renderItem={this.renderMessage}
              contentContainerStyle={this.state.messages.length === 0 ? styles.emptyContainer : styles.listContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Start a conversation with this agent.</Text>
                </View>
              )}
              onContentSizeChange={this.handleContentSizeChange}
              onLayout={() => {
                if (!this.didInitialScroll && this.state.messages.length > 0) {
                  this.forceScrollToBottomOnce = true;
                  this.didInitialScroll = true;
                }
              }}
              onScroll={this.handleScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={this.state.inputValue}
              placeholder="Type a message"
              placeholderTextColor="#6f7587"
              onChangeText={text => this.setState({ inputValue: text })}
              onSubmitEditing={this.handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendButton} onPress={this.handleSend}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
}

const mapStateToProps = state => ({
  namespaceList: state.namespaceList,
});

export default connect(mapStateToProps)(AgentChat);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d15',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerAction: {
    paddingHorizontal: 16,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  agentRow: {
    justifyContent: 'flex-start',
  },
  bubbleColumn: {
    maxWidth: '76%',
  },
  userBubbleColumn: {
    marginRight: 12,
  },
  agentBubbleColumn: {
    marginLeft: 12,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#1fcd51',
    borderBottomRightRadius: 2,
  },
  agentBubble: {
    backgroundColor: '#101726',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#1f2a44',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  agentText: {
    color: '#d2d7e0',
  },
  linkText: {
    color: '#0b1224',
    backgroundColor: '#d6e8ff',
    textDecorationLine: 'none',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  commandText: {
    color: '#0b1224',
    backgroundColor: '#d6e8ff',
    textDecorationLine: 'none',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  commandTextUser: {
    color: '#0b1224',
    backgroundColor: '#d6e8ff',
    textDecorationLine: 'none',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timestampContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  timestampText: {
    color: '#6f7587',
    fontSize: 13,
  },
  avatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a2336',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPressable: {
    borderRadius: 12,
  },
  agentAvatarWrapper: {
    borderWidth: 1,
    borderColor: '#24304a',
  },
  userAvatarWrapper: {
    borderWidth: 1,
    borderColor: '#1fcd51',
  },
  userAvatarBlank: {
    backgroundColor: '#000000',
  },
  userAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyText: {
    color: '#6f7587',
    fontSize: 14,
  },
  regenButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4f78ff',
  },
  regenButtonText: {
    color: '#4f78ff',
    fontSize: 12,
    fontWeight: '600',
  },
  storyChoiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  storyChoiceBtn: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2f4d8f',
    backgroundColor: '#162441',
  },
  storyChoiceText: {
    color: '#d6e8ff',
    fontSize: 13,
    fontWeight: '600',
  },
  storyChoiceInline: {
    color: '#d6e8ff',
    backgroundColor: '#162441',
    borderRadius: 4,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1f2a44',
    backgroundColor: '#0b1224',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#24304a',
    borderRadius: 12,
    color: '#ffffff',
    backgroundColor: '#0f162b',
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: KevaColors.actionText,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
