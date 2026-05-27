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
  NativeModules,
  NativeEventEmitter,
  Linking,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { buildHeadAssetUri, buildHeadAssetUriCandidates } from '../../common/namespaceAvatar';
import { getUserAvatarUri } from '../../common/userAvatar';
const SATOSHI_PRE_LLM_AVATAR_SOURCE = require('../../android/app/src/main/assets/os/theme/retro/icons/satoshi-avatar.png');
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-community/async-storage';
import DocumentPicker from 'react-native-document-picker';
import Slider from '@react-native-community/slider';
import { connect } from 'react-redux';
import { decode as b64decode } from 'base-64';
let BlueElectrum = require('../../BlueElectrum');
let BlueApp = require('../../BlueApp');
import { BlueNavigationStyle } from '../../BlueComponents';
let loc = require('../../loc');
const Rolecards = require('./agentchat_rolecards');
const Roleplay = require('./agentchat_roleplay');
import { attachAgentChatLLM } from './agentchat_llm';
import { LLM_PROVIDERS } from './agentchat_llm_providers';
import { buildOfflineDestinySeedPrompt } from './agentrole_destiny_offline';
import { buildRoleMemoryCloneFilename, buildRoleMemoryClonePrompt, getRoleMemoryCloneDir } from './agentrole_clone_memory';
import { buildRoleFragmentImportPrompt, parseRoleFragmentImportResult } from './agentrole_fragment_import';
import { buildRoleStoryFragmentImportPrompt, parseRoleStoryFragmentImportResult } from './agentrole_story_fragment_import';
import { fetchDoppelOnChainMemory, normalizeDoppelMemoryId } from './agentrole_doppel_memory';
import { fetchDoppelOnChainStorySummary, fetchLocalOnChainStorySummary, normalizeOnChainStoryId } from './agentrole_onchain_story';
import { buildOfflineStoryClonePrompt, buildStoryCloneFilename, getStoryCloneDir } from './agentstory_clone';
import { evaluateRoleModelConfig } from './rolemodel_check';
import { createAgentRoleMemoryStore, normalizeRoleMemoryLayerKey } from './agentrole_memory';
import {
  buildRoleMemorySnapshotListMessage,
  buildRoleMemorySnapshotMenuMessage,
  createRoleMemorySnapshot,
  importRoleMemorySnapshot,
  roleDataHasMemory,
} from './agentrole_memory_snapshots';
import { buildRoleSnapshot, normalizeRoleSnapshot, parseRoleSnapshotPayload, serializeRoleSnapshotToLegacyText } from './role_snapshot';
import {
  STORY_MENU_MESSAGES,
  STORY_SUPPORTED_LANGS as ROLE_I18N_SUPPORTED_LANGS,
  ROLE_UI_MESSAGES,
  COMMAND_USAGE_MESSAGES,
  ROLE_HISTORY_TITLES,
  STORY_UI_MESSAGES,
  COMMAND_HELP_ALIASES,
} from './agentrole_i18n';
import {
  appendDigestEntry,
  buildDigestFromRaw,
  ensureStoryDirs,
  getStoryDigestPath,
  getStoryRawPath,
  readStoryEntriesByDay,
  toDigestFallbackText,
  updateDigestEntry,
} from './agentchat_story_storage';
import {
  buildRoleAdventureRecordsMenuMessage as buildRoleAdventureRecordsMenuMessageHelper,
  buildRoleStoryMenuMessage as buildRoleStoryMenuMessageHelper,
  exportRoleStoryRecord as exportRoleStoryRecordHelper,
  getRoleCurrentStoryPath as getRoleCurrentStoryPathHelper,
  getRoleCurrentStorySummaryPath as getRoleCurrentStorySummaryPathHelper,
  getRoleStoryChoicesPath as getRoleStoryChoicesPathHelper,
  getStoryChatDir as getStoryChatDirHelper,
  importRoleStoryRecord as importRoleStoryRecordHelper,
  openRoleStorySpace as openRoleStorySpaceHelper,
} from './agentrole_story_menu';
import {
  buildRoleStorySnapshotListMessage,
  buildRoleStorySnapshotMenuMessage,
  createRoleStorySnapshot,
  importRoleStorySnapshot,
} from './agentrole_story_snapshots';
import { buildStoryRecordSnapshot, restoreStoryRecordSnapshot } from './story_record_io';
import {
  buildMemoryAdjustConfirmMessage as buildMemoryAdjustConfirmMessageHelper,
  buildMemoryLanguageMenuMessage as buildMemoryLanguageMenuMessageHelper,
  buildRoleEditLayerChoiceMessage as buildRoleEditLayerChoiceMessageHelper,
  buildRoleMemoryCardMessage as buildRoleMemoryCardMessageHelper,
  buildRoleMemoryFullConsoleMessage as buildRoleMemoryFullConsoleMessageHelper,
  buildRoleMemoryQuickConsoleMessage as buildRoleMemoryQuickConsoleMessageHelper,
  buildRoleMemoryRecoverMenuMessage as buildRoleMemoryRecoverMenuMessageHelper,
  getMemoryActionLabel as getMemoryActionLabelHelper,
  getMemoryLayerLabel as getMemoryLayerLabelHelper,
  getRoleMemoryLayerShortCode as getRoleMemoryLayerShortCodeHelper,
} from './agentrole_memory_menu';
import { getInitials, showStatus, stringToColor, timeConverter } from '../../util';
import Toast from 'react-native-root-toast';
import ActionSheet from '../ActionSheet';
import { decodeBase64, deleteKeyValue, getNamespaceScriptHash, toScriptHash, updateKeyValue } from '../../class/keva-ops';
import { FALLBACK_DATA_PER_BYTE_FEE } from '../../models/networkTransactionFees';
import {
  ROLE_TALK_STATES,
  bindRoleTalkEvents,
  cancelRoleTalkRecognition,
  destroyRoleTalkRecognition,
  ensureRoleTalkPermission,
  isRoleTalkAvailable,
  startRoleTalkRecognition,
  stopRoleTalkRecognition,
} from './role_talk_speech';
import {
  filterPersistableMessages,
  filterRoleHistoryMessages,
  isReaderExcludedText,
  shouldExcludeFromSummary,
  shouldHideHistoryText,
  shouldPersistRoleMessage,
} from './role_message_filters';

import styles from './agentrole_styles';
import {
  CHAT_DIR,
  LAST_ROLE_SPACE_PATH,
  LAST_STORY_SPACE_PATH,
  LAST_CHAT_SPACE_PATH,
  LLM_DIR,
  ROLE_RECOVERY_BASELINE_FILE,
  STORY_BLOCK_CACHE_PATH,
  getLlmActivePath,
  getLlmBuiltinPath,
  getLlmCustomPath,
  getLlmLastUsedPath,
  getNamespaceAvatarPath,
  getRoleLangStorageKey,
  getRoleLastSelectedStorageKey,
  getRolePendingNewStorageKey,
  getStoryLangStorageKey,
} from './agentrole_paths';
import {
  buildAccessibleMessageText as buildAccessibleRoleMessageText,
  buildStoryInlineLines as buildStoryInlineLinesFromText,
  extractStoryChoices as extractStoryChoicesFromText,
  getCommandSegments as parseCommandSegments,
  isInteractiveCommand as isInteractiveCommandText,
  isSystemCallMessage as isSystemCallMessageText,
  isValidCommandText as isValidRoleCommandText,
  parseStoryLineSegments as parseStoryLineSegmentsFromText,
  stripStoryChoiceLines as stripStoryChoiceLinesFromText,
} from './agentrole_message_parser';
import {
  buildConversationSummaryPromptBlock,
  buildConversationSummaryRewritePrompt,
  buildConversationSummaryUpdatePrompt,
  buildInitialRoleMemoryCardPrompt,
  buildMemoryLayerEditPrompt,
  buildMemoryLayerUpdatePrompt,
  buildRoleChatPrompt,
  buildRoleLanguageInstruction,
  buildRoleResolverPrompt,
  buildStoryDigestInstruction,
} from './agentrole_prompts';
import {
  DEFAULT_CONVERSATION_SUMMARY,
  normalizeConversationSummary,
} from './agentrole_conversation_summary';

const selectHeaderAvatarCandidateUri = (candidateUris = [], failedUris = [], generatedUri = null) => {
  if (generatedUri) return null;
  for (const candidate of candidateUris) {
    if (!candidate) continue;
    if (failedUris && failedUris.includes(candidate)) continue;
    return candidate;
  }
  return null;
};
const sanitizeDialogText = value => String(value || '')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/[\x00-\x1F\x7F]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const ensureRenderableText = (value, label = 'unknown') => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const keys = value && typeof value === 'object' ? Object.keys(value).join(',') : typeof value;
    console.warn(`[agentrole] non-renderable text for ${label}`, keys, value);
  } catch {}
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return '[invalid text]';
    }
  }
};

const safeJsonStringify = value => {
  const seen = new WeakSet();
  try {
    return JSON.stringify(value, (key, val) => {
      if (typeof val === 'bigint') return String(val);
      if (typeof val === 'function') return `[function ${val.name || 'anonymous'}]`;
      if (val instanceof Error) {
        return { name: val.name, message: val.message, stack: val.stack };
      }
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[circular]';
        seen.add(val);
      }
      return val;
    });
  } catch (error) {
    try {
      return `[unserializable: ${String(error?.message || error || 'unknown error')}]`;
    } catch {
      return '[unserializable]';
    }
  }
};

const normalizeInjectedCommandText = value => {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/') || raw.indexOf('%') === -1) {
    return raw;
  }
  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded.startsWith('/') ? decoded : raw;
  } catch {
    return raw;
  }
};

const sanitizeProviderKey = value => sanitizeDialogText(value)
  .toLowerCase()
  .replace(/[^a-z0-9._:/-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const sanitizeUrlInput = value => sanitizeDialogText(value).replace(/\/$/, '');

const STORY_SUPPORTED_LANGS = ROLE_I18N_SUPPORTED_LANGS;
const STORY_COMMON_LANG_CODES = ['en', 'zh-cn', 'zh-tw', 'ja', 'ko', 'es', 'fr'];

const LLM_HISTORY_LIMIT = 32;
const DEFAULT_AUTH_HEADER = apiKey => (apiKey ? { Authorization: `Bearer ${apiKey}` } : {});

const buildLlmSelectionKey = cfg => {
  const safe = v => (v === undefined || v === null ? '' : String(v));
  const version =
    safe(cfg?.modelVersion) ||
    safe(cfg?.version) ||
    safe(cfg?.variant) ||
    safe(cfg?.revision) ||
    safe(cfg?.release) ||
    safe(cfg?.tag) ||
    safe(cfg?.engine) ||
    '';
  return [safe(cfg?.provider), safe(cfg?.model), version].join('|');
};

function getAgentIdFromParams(params = {}) {

  return (params.shortCode || params.namespaceId || params.agentId || 'default').toString();
}

const buildDefaultRoleMemoryCard = (roleName, roleLangCode = 'en') => {
  const safeRole = String(roleName || 'unknown').trim();
  const code = normalizeStoryLangCode(roleLangCode || 'en');

  const messages = getRoleLocaleTable(ROLE_UI_MESSAGES, code);
  const fallback = ROLE_UI_MESSAGES.en || {};
  const label = key => String(messages[key] || fallback[key] || key).trim();
  return [
    `ROLE=${safeRole}`,
    '[VERIFIED]',
    `- ${label('defaultMemoryOriginWorldTag')}: unknown`,
    `- ${label('defaultMemoryRoleFunction')}: unknown`,
    `- ${label('defaultMemorySignature')}: unknown`,
    `- ${label('defaultMemoryKeyRelationship')}: unknown`,
    `- ${label('defaultMemoryLastKnownScene')}: unknown`,
    `- ${label('defaultMemoryOthers')}: unknown`,
    '',
    '[LIKELY]',
    '- unknown',
    '',
    '[FOG]',
    '- unknown',
  ].join('\n');
};
const INTRO_MESSAGES = [
  'Booting the Super Agent Network…',
  'Loading the on-device LLM…',
];
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

const getRoleLocaleTable = (messagesByLocale, locale) => {
  const normalized = normalizeStoryLangCode(locale || 'en');
  const alias = COMMAND_HELP_ALIASES[normalized] || normalized;
  const base = normalized.split('-')[0];
  const baseAlias = COMMAND_HELP_ALIASES[base] || base;
  return messagesByLocale?.[normalized] || messagesByLocale?.[alias] || messagesByLocale?.[baseAlias] || messagesByLocale?.[base] || messagesByLocale?.en || {};
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

const getCommandUsageMessage = commandKey => getLocalizedMessage(COMMAND_USAGE_MESSAGES, commandKey);
const getRoleHistoryTitle = () => {
  const title = getLocalizedMessage(ROLE_HISTORY_TITLES);
  return title.replace('/r', '/\u200Br');
};
const getStoryUiText = key => getLocalizedMessage(STORY_UI_MESSAGES, key);

const getLocalDateKey = (ts = Date.now()) => {
  const d = new Date(ts);
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const PAGE_SIZE = 10;
const INITIAL_VISIBLE_COUNT = 8;
const isRoleExportSystemMessage = message => {
  const text = String(message?.text || message?.content || '').trim();
  if (!text) return true;
  if (/^\/(?:summary|role|r)\b/i.test(text)) return true;
  if (/\[\[\/summary\s+talk\b/i.test(text)) return true;
  if (/\[\[\/role\s+(?:export|import|importfragment|s|memory|card|talkmenu|openexport)\b/i.test(text)) return true;
  if (/\u5bfc\u51fa(?:\u8bb0\u5f55|\u8bb0\u5fc6)|\u5bfc\u5165(?:\u8bb0\u5f55|\u6587\u4ef6|\u8bb0\u5fc6|\u788e\u7247)|\u8bfb\u53d6\u8bb0\u5f55/.test(text)) return true;
  if (/^\u5bfc\u51fa\u8bb0\u5f55\u6210\u529f[:：]/.test(text)) return true;
  if (/^\u5bfc\u5165(?:\u8bb0\u5f55|\u6587\u4ef6|\u8bb0\u5fc6|\u788e\u7247)\u6210\u529f\.?$/.test(text)) return true;
  if (/^\u5bfc\u5165(?:\u8bb0\u5f55|\u6587\u4ef6|\u8bb0\u5fc6|\u788e\u7247)\u5931\u8d25[:：]/.test(text)) return true;
  if (/^\u5df2\u590d\u5236\u5bfc\u51fa(?:\u6587\u4ef6|\u76ee\u5f55)\u8def\u5f84[:：]/.test(text)) return true;
  if (/^\u8bb0\u5fc6[:：]/.test(text)) return true;
  if (/^\u89c9\u9192\u5386\u7a0b[:：]?/.test(text)) return true;
  if (/^Awakening Journey[:：]?/i.test(text)) return true;
  if (/^Role data initialized\.?$/i.test(text)) return true;
  if (/^\u6682\u65e0\u89d2\u8272\u5361/.test(text)) return true;
  if (/^No active role/i.test(text)) return true;
  if (/^(?:VERIFIED|LIKELY|FOG)\b/i.test(text)) return true;
  return false;
};

class AgentChat extends React.Component {

  persistLastSpaceShortcut = async type => {
    try {
      const params = this.props.navigation?.state?.params || {};
      const namespaceId = String(params.namespaceId || '').trim();
      const shortCode = String(params.shortCode || '').trim();
      const agentId = String(getAgentIdFromParams(params) || '').trim();
      const path = type === 'role' ? LAST_ROLE_SPACE_PATH : type === 'chat' ? LAST_CHAT_SPACE_PATH : LAST_STORY_SPACE_PATH;
      const debugPath = `${RNFS.DocumentDirectoryPath}/agent_chats/_last_space_debug.log`;
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/agent_chats`).catch(() => {});
      if (!namespaceId && !shortCode && !agentId) {
        await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist skip type=${type} reason=no namespaceId/shortCode/agentId docDir=${RNFS.DocumentDirectoryPath}\n`, 'utf8').catch(() => {});
        return;
      }
      const isChatShortcut = type === 'chat';
      const payload = {
        type,
        routeName: isChatShortcut ? 'AgentRole' : undefined,
        agentId,
        namespaceId,
        shortCode,
        displayName: params.displayName || '',
        walletId: params.walletId || '',
        txid: params.txid || '',
        agentCreatedTxid: params.agentCreatedTxid || params.txid || '',
        agentCreatedTxTime: params.agentCreatedTxTime || '',
        agentCreatedHeight: params.agentCreatedHeight || '',
        namespaceCreateTxid: params.namespaceCreateTxid || params.namespace_create_txid || '',
        rootAddress: params.rootAddress || '',
        price: params.price || '',
        desc: params.desc || '',
        addr: params.addr || '',
        profile: params.profile || '',
        updatedAt: Date.now(),
        autoCommand: isChatShortcut ? '/role chat' : '/role',
        roleEntrySource: this.props.navigation?.state?.params?.roleEntrySource || (isChatShortcut ? 'chat' : 'role'),
        pureChatMode: isChatShortcut ? true : undefined,
        suppressAutoLinkStart: true,
      };
      const tempPath = `${path}.tmp`;
      const payloadText = JSON.stringify(payload, null, 2);
      await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist type=${type} docDir=${RNFS.DocumentDirectoryPath} path=${path} tempPath=${tempPath} payload=${safeJsonStringify(payload)}\n`, 'utf8').catch(() => {});
      await RNFS.writeFile(tempPath, payloadText, 'utf8');
      let directRecreateOk = false;
      try {
        if (await RNFS.exists(path)) {
          await RNFS.unlink(path);
        }
        await RNFS.writeFile(path, payloadText, 'utf8');
        directRecreateOk = true;
        await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist direct-recreate ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
        await RNFS.unlink(tempPath).catch(() => {});
      } catch (directError) {
        await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist direct-recreate fail type=${type} path=${path} error=${String(directError?.message || directError || 'unknown')}\n`, 'utf8').catch(() => {});
      }
      if (!directRecreateOk) {
        try {
          await RNFS.moveFile(tempPath, path);
          await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist fallback-move ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
        } catch (moveError) {
          await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist fallback-move fail type=${type} path=${path} error=${String(moveError?.message || moveError || 'unknown')}\n`, 'utf8').catch(() => {});
          await RNFS.writeFile(path, payloadText, 'utf8');
          await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist fallback-overwrite ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
          await RNFS.unlink(tempPath).catch(() => {});
        }
      }
      await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
    } catch (error) {
      const debugPath = `${RNFS.DocumentDirectoryPath}/agent_chats/_last_space_debug.log`;
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/agent_chats`).catch(() => {});
      await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentrole persist fail type=${type} docDir=${RNFS.DocumentDirectoryPath} error=${String(error?.message || error || 'unknown')}\n`, 'utf8').catch(() => {});
      console.warn('Failed to persist last space shortcut', error);
    }
  };


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
      pendingReturnToStoryMenu: false,
      storyShortMode: true,
      storyLangCode: null,
      roleLangCode: null,
      pendingDestinyRun: false,
      pendingDestinyMode: null,
      pendingReturnToDestinyMenu: false,
      pendingModelFinalConfirm: false,
      pendingRoleCall: false,
      pendingRoleSuggest: false,
      pendingRoleSuggestOriginal: '',
      pendingRoleSuggestOptions: [],
      pendingRoleFragmentImport: false,
      pendingRoleStoryFragmentImport: false,
      pendingRoleStoryFragmentAnalyzeConfirm: false,
      pendingRoleStoryFragmentText: '',
      pendingRoleStoryFragmentExplore: false,
      pendingRoleStoryFragmentSeed: null,
      pendingDoppelStoryInput: false,
      pendingMemoryAdjust: false,
      pendingMemoryRoleSlug: null,
      pendingMemoryAdjustDraft: null,
      pendingMemoryAdjustLayer: null,
      pendingMemoryRebuildConfirm: false,
      pendingMemoryRebuildRoleSlug: null,
      pendingLastMemoryRecoverConfirm: false,
      pendingLastMemoryRecoverRoleSlug: null,
      pendingDoppelMemoryInput: false,
      pendingDoppelMemoryDraft: null,
      pendingMemoryDeleteConfirm: false,
      pendingMemoryDeleteRoleSlug: null,
      currentSummonedRole: null,
      activeRoleState: null,
      activeRoleSlug: null,
      roleCardOffset: 0,
      roleCardPage: [],
      pendingReturnToRoleMenu: false,
      lastSelectedRole: null,
      pendingNewRole: null,
      pendingDuplicateRoleName: null,
      pendingRoleModelStep: null,
      pendingRoleModelBuiltinProvider: '',
      pendingRoleModelCustomName: '',
      pendingRoleModelCustomBaseUrl: '',
      pendingRoleModelReturnToRole: false,
      talkEnabled: false,
      talkState: ROLE_TALK_STATES.OFF,
      speechAvailable: null,
      speechTextDraft: '',
      speechFinalText: '',
      speechError: null,
      speechLocale: 'zh-CN',
      isViewHistoryMode: false,
      historyViewMode: null,
      isSwitchWorldlineMode: false,
      isHistorySpeaking: false,
      isStorySummaryCommitPending: false,
      isAutoVoiceSpeak: false,
      isContinuousTalkEnabled: false,
      isRoleSpeaking: false,
      historyPageIndex: 0,
      historyPages: [],
      historyReaderBlocks: [],
      historyRawMessages: [],
      switchWorldlineBlockContext: null,
      userAvatarUri: null,
    };
    this.loadingMore = false;
    this.didInitialScroll = false;
    this.shouldScrollToEnd = false;
    this.isNearBottom = true;
    this.lastContentHeight = 0;
    this.forceScrollToBottomOnce = false;
    this.pendingScrollBottomTimeouts = [];
    this.hasAutoCommandRun = false;
    this.hasAutoLinkStartRun = false;
    this.lastAutoCommand = null;
    this.hasIntroAutoAOnce = false;
    this.isPlayingIntro = false;
    this.hasRoleStartupRun = false;
    this._lastAutoDAt = 0;
    this._latestStoryBlockHeight = null;
    const params = this.props.navigation?.state?.params || {};
    this.agentId = getAgentIdFromParams(params);
    this.llmBuiltinPath = getLlmBuiltinPath(this.agentId);
    this.llmCustomPath = getLlmCustomPath(this.agentId);
    this.llmActivePath = getLlmActivePath(this.agentId);
    this.llmLastUsedPath = getLlmLastUsedPath(this.agentId);
    this.chatScope = 'role';
    this.isStoryScope = false;
    this.agentChatDir = `${CHAT_DIR}/${encodeURIComponent(this.agentId)}/${encodeURIComponent(this.chatScope)}`;
    this.roleFilesDir = `${this.agentChatDir}/roles`;
    this.roleIndexPath = `${this.agentChatDir}/role_index.json`;
    this.currentRolePath = `${this.agentChatDir}/current_role.json`;
    this.getDayFilePath = dateKey => `${this.agentChatDir}/${dateKey}.json`;
    this.getStoryRawPath = dateKey => getStoryRawPath(this.agentChatDir, dateKey);
    this.getStoryDigestPath = dateKey => getStoryDigestPath(this.agentChatDir, dateKey);
    this.loadedDateKeys = [];
    this.allDateKeys = [];
    this.persistQueue = Promise.resolve();
    this.digestPersistQueue = Promise.resolve();
    this.focusUnsubscribe = null;
    this.blurWillUnsubscribe = null;
    this.blurDidUnsubscribe = null;
    this.currentLLMConfig = null;
    this.activeRoleSlug = null;
    this._continuousTalkToken = 0;
    this._continuousTalkTimer = null;
    this.roleMemoryStore = createAgentRoleMemoryStore({
      getRoleDirPath: roleSlug => this.getRoleDirPath(roleSlug),
      getRoleFilePath: roleSlug => this.getRoleFilePath(roleSlug),
      getLegacyRoleFilePath: roleSlug => this.getLegacyRoleFilePath(roleSlug),
      normalizeMemoryLayerText: text => this.normalizeMemoryLayerText(text),
      normalizeMemoryCardText: text => this.normalizeMemoryCardText(text),
      parseRoleMemoryLayers: text => this.parseRoleMemoryLayers(text),
      composeRoleMemoryCard: (roleName, layers) => this.composeRoleMemoryCard(roleName, layers),
      captureLastMemorySnapshot: (roleSlug, roleData, meta) => createRoleMemorySnapshot(this, { roleSlug, roleData, meta }),
    });
    this.getCommandUsageMessage = getCommandUsageMessage;
    attachAgentChatLLM(this, {
      loc,
      LLM_DIR,
      LLM_BUILTIN_PATH: this.llmBuiltinPath,
      LLM_CUSTOM_PATH: this.llmCustomPath,
      LLM_ACTIVE_PATH: this.llmActivePath,
      LLM_LAST_USED_PATH: this.llmLastUsedPath,
      LLM_PROVIDERS,
      DEFAULT_AUTH_HEADER,
      LLM_HISTORY_LIMIT,
      getTodayDateString: getLocalDateKey,
    });
  }

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state?.params || {};
    const displayName = params.displayName || 'Agent';
    const shortCode = params.shortCode ? `@${params.shortCode}` : '';
    const baseTitle = shortCode ? `${displayName}${shortCode}` : displayName;
    const modeTitle = params.headerModeTitle || (params.pureChatMode ? 'Chat' : 'Role');
    const title = `${baseTitle} · ${modeTitle}`;

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
    const paramsDebugPath = `${RNFS.DocumentDirectoryPath}/agent_chats/_params_debug.log`;
    RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/agent_chats`).catch(() => {});
    const safeParamsText = safeJsonStringify(this.props.navigation?.state?.params || {});
    RNFS.appendFile(paramsDebugPath, `${new Date().toISOString()} agentrole componentDidMount params=${safeParamsText}\n`, 'utf8').catch(() => {});
    this.props.navigation?.setParams?.({ onTitlePress: this.handleTitlePress });
    this.roleEntrySource = this.props.navigation?.state?.params?.roleEntrySource || 'role';
    this.initRoleTalk().catch(error => console.warn('[agentrole] initRoleTalk failed', error));
    this.focusUnsubscribe = this.props.navigation?.addListener?.('didFocus', () => {
      this.forceScrollToBottomOnce = true;
      this.loadUserAvatar().catch(error => console.warn('[agentrole] loadUserAvatar on focus failed', error));
      requestAnimationFrame(() => this.scrollToBottomOffset(false));
    });
    this.blurWillUnsubscribe = this.props.navigation?.addListener?.('willBlur', () => {
      this.flushPersistQueue('willBlur');
    });
    this.blurDidUnsubscribe = this.props.navigation?.addListener?.('didBlur', () => {
      this.flushPersistQueue('didBlur');
    });
    this.initializeChat().catch(error => {
      console.warn('[agentrole] initializeChat uncaught', error);
    });
    this.loadAgentLocalAvatar().catch(error => console.warn('[agentrole] loadAgentLocalAvatar failed', error));
    this.loadUserAvatar().catch(error => console.warn('[agentrole] loadUserAvatar failed', error));
    this.persistLastSpaceShortcut('role').catch(error => console.warn('[agentrole] persistLastSpaceShortcut failed', error));
    if (this.isPureChatMode()) {
      this.persistLastSpaceShortcut('chat').catch(error => console.warn('[agentrole] persistLastChatShortcut failed', error));
    }
  }

  componentDidUpdate(prevProps) {
    const prevAutoCommand = prevProps.navigation?.state?.params?.autoCommand;
    const nextAutoCommand = this.props.navigation?.state?.params?.autoCommand;
    if (nextAutoCommand && nextAutoCommand !== prevAutoCommand && nextAutoCommand !== this.lastAutoCommand) {
      this.hasAutoCommandRun = false;
      this.runAutoCommand()
        .then(() => this.runAutoLinkStart())
        .catch(error => console.warn('[agentrole] auto command update failed', error));
    }
    const prevParams = prevProps.navigation?.state?.params || {};
    const nextParams = this.props.navigation?.state?.params || {};
    const prevShortCode = prevParams.shortCode;
    const nextShortCode = nextParams.shortCode;
    if (prevShortCode !== nextShortCode) {
      this.loadAgentLocalAvatar().catch(error => console.warn('[agentrole] loadAgentLocalAvatar update failed', error));
    }
    if (
      prevParams.namespaceId !== nextParams.namespaceId ||
      prevParams.shortCode !== nextParams.shortCode ||
      prevParams.agentId !== nextParams.agentId
    ) {
      this.persistLastSpaceShortcut('role').catch(error => console.warn('[agentrole] persistLastSpaceShortcut update failed', error));
      if (this.isPureChatMode()) {
        this.persistLastSpaceShortcut('chat').catch(error => console.warn('[agentrole] persistLastChatShortcut update failed', error));
      }
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    void this.stopRoleSpeech();
    this.cleanupRoleTalk();
    this.flushPersistQueue('componentWillUnmount');
    if (Array.isArray(this.pendingScrollBottomTimeouts)) {
      this.pendingScrollBottomTimeouts.forEach(timer => clearTimeout(timer));
      this.pendingScrollBottomTimeouts = [];
    }
    if (this._continuousTalkTimer) {
      clearTimeout(this._continuousTalkTimer);
      this._continuousTalkTimer = null;
    }
    if (typeof this.focusUnsubscribe === 'function') {
      this.focusUnsubscribe();
      this.focusUnsubscribe = null;
    }
    if (typeof this.blurWillUnsubscribe === 'function') {
      this.blurWillUnsubscribe();
      this.blurWillUnsubscribe = null;
    }
    if (typeof this.blurDidUnsubscribe === 'function') {
      this.blurDidUnsubscribe();
      this.blurDidUnsubscribe = null;
    }
  }

  initRoleTalk = async () => {
    bindRoleTalkEvents({
      onStart: () => {
        if (!this._isMounted) return;
        this.setState({ talkState: ROLE_TALK_STATES.LISTENING, speechError: null, speechFinalText: '' });
      },
      onPartial: text => {
        if (!this._isMounted) return;
        this.setState(prev => ({
          speechTextDraft: text,
          inputValue: prev.talkEnabled && prev.talkState === ROLE_TALK_STATES.LISTENING ? text : prev.inputValue,
        }));
      },
      onFinal: text => {
        if (!this._isMounted) return;
        this.setState({ speechFinalText: text, speechTextDraft: text, talkState: ROLE_TALK_STATES.SUBMITTING }, () => {
          this.submitRecognizedRoleText(text);
        });
      },
      onEnd: () => {
        if (!this._isMounted) return;
        this.setState(prev =>
          prev.talkState === ROLE_TALK_STATES.LISTENING ? { talkState: ROLE_TALK_STATES.RECOGNIZING } : null,
        );
      },
      onError: error => {
        if (!this._isMounted) return;
        const rawError = String(error || 'speech_error');
        const friendlyError = /no match|\b7\/No match\b|\"code\":\s*7|speech_error/i.test(rawError)
          ? this.getRoleUiText('noVoiceDetected')
          : rawError;
        this.setState({ talkState: ROLE_TALK_STATES.ERROR, speechError: friendlyError });
      },
    });
    const available = await isRoleTalkAvailable().catch(() => false);
    if (!this._isMounted) return;
    this.setState({ speechAvailable: available });
  };

  cleanupRoleTalk = async () => {
    await destroyRoleTalkRecognition();
  };

  enableRoleTalk = async () => {
    if (this.state.talkEnabled && this.state.talkState !== ROLE_TALK_STATES.OFF) {
      return true;
    }
    this.setState({ talkState: ROLE_TALK_STATES.REQUESTING_PERMISSION, speechError: null });
    const hasPermission = await ensureRoleTalkPermission();
    const available = await isRoleTalkAvailable().catch(() => null);
    if (!hasPermission) {
      this.setState({ talkEnabled: false, talkState: ROLE_TALK_STATES.ERROR, speechAvailable: available === null ? false : available, speechError: this.getRoleUiText('roleTalkPermissionDenied') });
      this.replyFromAgent(this.getRoleUiText('roleTalkPermissionDenied'));
      return false;
    }
    this.setState({ talkEnabled: true, talkState: ROLE_TALK_STATES.IDLE, speechAvailable: available !== false, speechError: null, speechTextDraft: '', speechFinalText: '' });
    return true;
  };

  disableRoleTalk = async (notify = true) => {
    await cancelRoleTalkRecognition();
    if (!this._isMounted) return true;
    this.setState({
      talkEnabled: false,
      talkState: ROLE_TALK_STATES.OFF,
      speechTextDraft: '',
      speechFinalText: '',
      speechError: null,
    });
    if (notify) {
      this.replyFromAgent(this.getRoleUiText('roleTalkDisabled'));
    }
    return true;
  };

  startRoleTalkOnce = async () => {
    const enabled = this.state.talkEnabled ? true : await this.enableRoleTalk();
    if (!enabled) return false;
    if (this.state.talkState === ROLE_TALK_STATES.LISTENING) {
      return true;
    }
    try {
      this.setState({ talkState: ROLE_TALK_STATES.STARTING, speechError: null, speechTextDraft: '', speechFinalText: '' });
      await startRoleTalkRecognition(this.state.speechLocale || 'zh-CN');
      if (this._isMounted) {
        this.setState(prev =>
          prev.talkState === ROLE_TALK_STATES.STARTING ? { talkState: ROLE_TALK_STATES.LISTENING } : null,
        );
      }
      return true;
    } catch (error) {
      this.setState({ talkState: ROLE_TALK_STATES.ERROR, speechError: String(error?.message || error || 'speech_start_failed') });
      this.replyFromAgent(this.getRoleUiText('roleTalkStartFailed'));
      return false;
    }
  };

  stopRoleTalkOnce = async () => {
    try {
      this.setState({ talkState: ROLE_TALK_STATES.RECOGNIZING });
      await stopRoleTalkRecognition();
      return true;
    } catch (error) {
      this.setState({ talkState: ROLE_TALK_STATES.ERROR, speechError: String(error?.message || error || 'speech_stop_failed') });
      this.replyFromAgent(this.getRoleUiText('roleTalkStopFailed'));
      return false;
    }
  };

  submitRecognizedRoleText = async text => {
    const transcript = String(text || '').trim();
    if (!transcript) {
      this.setState({ talkState: this.state.talkEnabled ? ROLE_TALK_STATES.IDLE : ROLE_TALK_STATES.OFF, speechTextDraft: '', speechFinalText: '' });
      return;
    }
    try {
      await this.handleSend({ displayText: transcript, modelText: transcript });
      if (!this._isMounted) return;
      this.setState({ talkState: this.state.talkEnabled ? ROLE_TALK_STATES.IDLE : ROLE_TALK_STATES.OFF, speechTextDraft: '', speechFinalText: '', speechError: null });
    } catch (error) {
      if (!this._isMounted) return;
      this.setState({ talkState: ROLE_TALK_STATES.ERROR, speechError: String(error?.message || error || 'speech_submit_failed') });
    }
  };

  handleRoleTalkPress = async () => {
    if (this.state.isContinuousTalkEnabled) {
      this._continuousTalkToken += 1;
      if (this._continuousTalkTimer) {
        clearTimeout(this._continuousTalkTimer);
        this._continuousTalkTimer = null;
      }
    }
    if (this.state.isRoleSpeaking || this.state.isHistorySpeaking) {
      await this.stopRoleSpeech(false);
      return;
    }
    if (!this.state.talkEnabled || this.state.talkState === ROLE_TALK_STATES.OFF || this.state.talkState === ROLE_TALK_STATES.ERROR) {
      await this.startRoleTalkOnce();
      return;
    }
    if (this.state.talkState === ROLE_TALK_STATES.IDLE) {
      await this.startRoleTalkOnce();
      return;
    }
    if (this.state.talkState === ROLE_TALK_STATES.STARTING) {
      await cancelRoleTalkRecognition();
      if (this._isMounted) {
        this.setState({ talkState: ROLE_TALK_STATES.IDLE, speechTextDraft: '', speechFinalText: '' });
      }
      return;
    }
    if (this.state.talkState === ROLE_TALK_STATES.LISTENING) {
      await this.stopRoleTalkOnce();
    }
  };

  getRoleTalkStatusText = () => {
    switch (this.state.talkState) {
      case ROLE_TALK_STATES.STARTING:
      case ROLE_TALK_STATES.LISTENING:
        return this.getRoleUiText('roleTalkListening');
      case ROLE_TALK_STATES.RECOGNIZING:
      case ROLE_TALK_STATES.SUBMITTING:
        return this.getRoleUiText('roleTalkRecognizing');
      case ROLE_TALK_STATES.ERROR:
        return this.state.speechError || this.getRoleUiText('roleTalkUnavailable');
      case ROLE_TALK_STATES.IDLE:
        return this.getRoleUiText('roleTalkReady');
      case ROLE_TALK_STATES.OFF:
      default:
        return '';
    }
  };

  initializeChat = async () => {
    try {
      await this.ensureDirs();
      await RNFS.appendFile(`${RNFS.DocumentDirectoryPath}/agent_chats/_params_debug.log`, `${new Date().toISOString()} agentrole initializeChat after ensureDirs agentId=${this.agentId} source=${this.roleEntrySource || ''}\n`, 'utf8').catch(() => {});
      await this.restoreStoryLangCode();
      const storedRoleLang = await AsyncStorage.getItem(getRoleLangStorageKey(this.agentId));
      if (storedRoleLang) {
        await new Promise(resolve => this.setState({ roleLangCode: normalizeStoryLangCode(storedRoleLang) }, resolve));
      }
      await this.restoreLastSelectedRole();
      await this.restoreActiveRoleState();
      await this.restoreCurrentSummonedRole();
      await RNFS.appendFile(`${RNFS.DocumentDirectoryPath}/agent_chats/_params_debug.log`, `${new Date().toISOString()} agentrole initializeChat after restore roles agentId=${this.agentId} active=${this.state.activeRoleSlug || ''}\n`, 'utf8').catch(() => {});
      const history = await this.readHistory();
      const builtinRead = await this.readJsonFile(this.llmBuiltinPath);
      if (builtinRead.__missing) {
        await this.writeBuiltinRegistry({});
      } else if (builtinRead.__parseError) {
        this.replyFromAgent(`LLM builtin registry is corrupted. Backup created. Please fix/delete: ${this.llmBuiltinPath}`);
      }

      const customRead = await this.readJsonFile(this.llmCustomPath);
      if (customRead.__missing) {
        await this.writeCustomRegistry({});
      } else if (customRead.__parseError) {
        this.replyFromAgent(`LLM custom registry is corrupted. Backup created. Please fix/delete: ${this.llmCustomPath}`);
      }

      const activeRead = await this.readJsonFile(this.llmActivePath);
      if (activeRead.__missing) {
        await this.writeActiveProvider({ name: '' });
      } else if (activeRead.__parseError) {
        this.replyFromAgent(`LLM active state is corrupted. Backup created. Please fix/delete: ${this.llmActivePath}`);
      }
      const digestHistory = this.isStoryScope ? await this.readDigestHistory() : [];
      const historyForRenderRaw = this.isStoryScope ? this.buildStoryHistoryMessages(history, digestHistory) : history;
      const historyForRender = this.sanitizeMessagesForList(historyForRenderRaw, 'initial-render');
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
            .then(() => this.runAutoLinkStart())
            .then(() => this.runRoleStartupFlow())
            .catch(error => {
              console.warn('[agentrole] startup flow failed', error);
            });
        },
      );
    } catch (error) {
      console.warn('[agentrole] initializeChat failed', error);
      if (this._isMounted) {
        const fallbackMessage = {
          id: `init-fallback-${Date.now()}`,
          sender: 'agent',
          text: this.getRoleUiText?.('chatMessage') || 'Role initialization failed. Please reopen role.',
          timestamp: Date.now(),
          _localOnly: true,
        };
        this.setState({ allMessages: [fallbackMessage], messages: [fallbackMessage], visibleCount: 1 });
      }
    }
  };

  runRoleStartupFlow = async () => {
    if (this.hasRoleStartupRun) {
      return;
    }
    this.hasRoleStartupRun = true;
    if (this.hasAutoCommandRun) {
      return;
    }
    const params = this.props.navigation?.state?.params || {};
    const autoStoryFragmentText = String(params.autoStoryFragmentText || '').trim();
    if (autoStoryFragmentText) {
      await this.confirmRoleStoryFragmentAnalyze(autoStoryFragmentText);
      this.props.navigation?.setParams?.({ autoStoryFragmentText: null });
      return;
    }
    await this.handleTriggers('/role', null);
  };

  restoreStoryLangCode = async () => {
    if (!this.isStoryScope) {
      return;
    }
    try {
      const savedCode = await AsyncStorage.getItem(getStoryLangStorageKey(this.agentId));
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
      await AsyncStorage.setItem(getStoryLangStorageKey(this.agentId), normalized);
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
      await ensure(this.roleFilesDir);
    } catch (error) {
      console.warn('Failed to prepare chat storage', error);
    }
  };

  getSpaceRoleKey = () => String(this.agentId || 'default').trim() || 'default';

  getRoleDirPath = roleSlug => {
    const safeSlug = this.getSpaceRoleKey();
    return `${this.roleFilesDir}/${safeSlug}`;
  };

  getLegacyRoleFilePath = roleSlug => {
    const safeSlug = this.getSpaceRoleKey();
    return `${this.roleFilesDir}/${safeSlug}.json`;
  };

  getRoleFilePath = roleSlug => `${this.getRoleDirPath(roleSlug)}/role.json`;

  getRoleRecoveryBaselinePath = roleSlug => `${this.getRoleDirPath(roleSlug)}/${ROLE_RECOVERY_BASELINE_FILE}`;

  getRoleLastMemoryPath = roleSlug => `${this.getRoleDirPath(roleSlug)}/lastmemory.v1.json`;

  getRoleMemoryLayerPath = (roleSlug, layer, kind = 'memory') => this.roleMemoryStore.getLayerPath(roleSlug, layer, kind);

  getRoleInitialMemoryStatus = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    try {
      const baselinePath = this.getRoleRecoveryBaselinePath(safeRoleSlug);
      const baselineExists = await RNFS.exists(baselinePath);
      const initialVerifiedExists = await RNFS.exists(this.getRoleMemoryLayerPath(safeRoleSlug, 'verified', 'initial'));
      const initialLikelyExists = await RNFS.exists(this.getRoleMemoryLayerPath(safeRoleSlug, 'likely', 'initial'));
      const initialFogExists = await RNFS.exists(this.getRoleMemoryLayerPath(safeRoleSlug, 'fog', 'initial'));
      return {
        baselineExists,
        initialVerifiedExists,
        initialLikelyExists,
        initialFogExists,
      };
    } catch (error) {
      console.warn('Failed to inspect initial memory status', { roleSlug: safeRoleSlug, error });
      return {
        baselineExists: false,
        initialVerifiedExists: false,
        initialLikelyExists: false,
        initialFogExists: false,
      };
    }
  };

  readRoleLastMemory = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const path = this.getRoleLastMemoryPath(safeRoleSlug);
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      const parsed = normalizeRoleSnapshot(JSON.parse(raw));
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        version: Number(parsed.version || 1) || 1,
        schema: String(parsed.schema || 'role_snapshot').trim(),
        roleSlug: String(parsed?.role?.roleSlug || safeRoleSlug).trim(),
        roleName: String(parsed?.role?.roleName || safeRoleSlug).trim(),
        agentId: String(parsed?.role?.agentId || '').trim(),
        capturedAt: Number(parsed.capturedAt || Date.now()) || Date.now(),
        source: parsed.source && typeof parsed.source === 'object' ? parsed.source : null,
        memory: {
          verified: String(parsed?.memoryLayers?.verified || '').trim(),
          likely: String(parsed?.memoryLayers?.likely || '').trim(),
          fog: String(parsed?.memoryLayers?.fog || '').trim(),
        },
      };
    } catch (error) {
      console.warn('Failed to read role last memory', { roleSlug: safeRoleSlug, path, error });
      return null;
    }
  };

  writeRoleLastMemory = async (roleSlug, options = {}) => {
    const safeRoleSlug = this.getSpaceRoleKey();
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      const roleData = options?.roleData || (await this.readRoleFile(safeRoleSlug));
      if (!roleData) return false;
      const data = buildRoleSnapshot({
        kind: 'lastmemory',
        roleSlug: safeRoleSlug,
        roleName: String(roleData.roleName || safeRoleSlug).trim() || safeRoleSlug,
        agentId: this.agentId,
        roleData,
        capturedAt: Date.now(),
        source: {
          kind: String(options?.kind || 'before-edit').trim() || 'before-edit',
          trigger: String(options?.trigger || '').trim(),
        },
      });
      await RNFS.writeFile(this.getRoleLastMemoryPath(safeRoleSlug), JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.warn('Failed to write role last memory', { roleSlug: safeRoleSlug, error });
      return false;
    }
  };

  captureExistingRoleMemorySnapshot = async (roleSlug, meta = {}) => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || this.getSpaceRoleKey?.() || 'unknown') || 'unknown';
    try {
      const roleData = await this.readRoleFile(safeRoleSlug);
      if (!roleDataHasMemory(roleData)) return null;
      return await createRoleMemorySnapshot(this, { roleSlug: safeRoleSlug, roleData, meta });
    } catch (error) {
      console.warn('Failed to capture existing role memory snapshot', { roleSlug: safeRoleSlug, error });
      return null;
    }
  };

  getRoleLastMemoryStatus = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    try {
      const lastMemory = await this.readRoleLastMemory(safeRoleSlug);
      const roleData = await this.readRoleFile(safeRoleSlug);
      const baselineExists = await RNFS.exists(this.getRoleRecoveryBaselinePath(safeRoleSlug));
      return {
        roleReadable: !!roleData,
        baselineExists,
        lastMemoryExists: !!lastMemory,
        capturedAt: lastMemory?.capturedAt || 0,
        verifiedReady: !!String(lastMemory?.memory?.verified || '').trim(),
        likelyReady: !!String(lastMemory?.memory?.likely || '').trim(),
        fogReady: !!String(lastMemory?.memory?.fog || '').trim(),
      };
    } catch (error) {
      console.warn('Failed to inspect last memory status', { roleSlug: safeRoleSlug, error });
      return {
        roleReadable: false,
        baselineExists: false,
        lastMemoryExists: false,
        capturedAt: 0,
        verifiedReady: false,
        likelyReady: false,
        fogReady: false,
      };
    }
  };

  restoreRoleFromLastMemory = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const currentRoleData = await this.readRoleFile(safeRoleSlug);
    if (!currentRoleData) return null;

    const path = this.getRoleLastMemoryPath(safeRoleSlug);
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      const snapshot = normalizeRoleSnapshot(JSON.parse(raw));
      if (!snapshot || typeof snapshot !== 'object') return null;
      const lastRoleSlug = String(snapshot?.role?.roleSlug || snapshot?.roleData?.roleSlug || '').trim();
      if (lastRoleSlug && lastRoleSlug !== safeRoleSlug) {
        console.warn('Last memory role slug mismatch', { roleSlug: safeRoleSlug, lastMemoryRoleSlug: lastRoleSlug });
        return null;
      }

      await this.writeRoleLastMemory(safeRoleSlug, { roleData: currentRoleData, kind: 'before-lastmemory-restore', trigger: '/role recover' });

      const roleName = String(snapshot?.role?.roleName || snapshot?.roleData?.roleName || currentRoleData.roleName || safeRoleSlug).trim() || safeRoleSlug;
      const rolePayload = {
        ...(currentRoleData || {}),
        ...(snapshot?.roleData || {}),
        roleSlug: safeRoleSlug,
        roleName,
        memoryLayers: snapshot?.memoryLayers,
        initialMemoryLayers: snapshot?.initialMemoryLayers,
        updatedAt: Date.now(),
        lastRestoredFromLastMemoryAt: Date.now(),
        lastMemoryVersion: Number(snapshot?.version || 1) || 1,
      };

      await this.writeRoleFile(safeRoleSlug, rolePayload, { createBackups: false });
      const restoredRoleData = await this.readRoleFile(safeRoleSlug);
      if (!restoredRoleData) return null;
      return {
        roleData: restoredRoleData,
        restoredFrom: 'lastmemory',
        source: {
          roleName,
          roleSlug: lastRoleSlug || safeRoleSlug,
          capturedAt: Number(snapshot?.capturedAt || Date.now()) || Date.now(),
          version: Number(snapshot?.version || 1) || 1,
        },
      };
    } catch (error) {
      console.warn('Failed to restore role from last memory', { roleSlug: safeRoleSlug, path, error });
      return null;
    }
  };

  fetchNamespaceKeyValueMap = async namespaceId => {
    if (!namespaceId) return {};
    await BlueElectrum.ping();
    if (typeof BlueElectrum.waitTillConnected === 'function') {
      await BlueElectrum.waitTillConnected();
    }
    const history = await BlueElectrum.blockchainKeva_getKeyValues(getNamespaceScriptHash(namespaceId), -1);
    const keyValues = Array.isArray(history?.keyvalues) ? history.keyvalues : [];
    const result = {};
    const resultMeta = {};
    const getKvOrder = (kv, index) => {
      const height = Number(kv?.height || kv?.block_height || kv?.confirmed_height || 0) || 0;
      const time = Number(kv?.time || kv?.timestamp || 0) || 0;
      const txNum = Number(kv?.tx_num || kv?.txNum || kv?.n || 0) || 0;
      return { height, time, txNum, index };
    };
    const isNewerKv = (next, prev) => {
      if (!prev) return true;
      if (next.height !== prev.height) return next.height > prev.height;
      if (next.time !== prev.time) return next.time > prev.time;
      if (next.txNum !== prev.txNum) return next.txNum > prev.txNum;
      return next.index < prev.index;
    };
    keyValues.forEach((kv, index) => {
      const key = kv?.key ? decodeBase64(kv.key) : '';
      const normalizedKey = String(key || '').trim();
      if (!normalizedKey) return;
      const meta = getKvOrder(kv, index);
      if (!isNewerKv(meta, resultMeta[normalizedKey])) return;
      const value = kv?.value ? Buffer.from(kv.value, 'base64').toString('utf-8') : '';
      result[normalizedKey] = String(value || '');
      resultMeta[normalizedKey] = meta;
    });
    return result;
  };

  readSingleOnChainMemoryValue = async (namespaceId, targetKey) => {
    const normalizedTargetKey = String(targetKey || '').trim();
    if (!namespaceId || !normalizedTargetKey) return '';
    const kvMap = await this.fetchNamespaceKeyValueMap(namespaceId);
    return String(kvMap[normalizedTargetKey] || '').trim();
  };

  getOnChainMemoryStatus = async () => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const namespaceId = this.props?.navigation?.state?.params?.namespaceId;
    if (!namespaceId) {
      return {
        nameExists: false,
        verifiedExists: false,
        likelyExists: false,
        fogExists: false,
      };
    }
    try {
      const nameValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.name`);
      const verifiedValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.verified`);
      const likelyValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.likely`);
      const fogValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.fog`);
      return {
        nameExists: !!nameValue,
        verifiedExists: !!verifiedValue,
        likelyExists: !!likelyValue,
        fogExists: !!fogValue,
      };
    } catch (error) {
      console.warn('Failed to read on-chain memory status', { roleSlug: safeRoleSlug, error });
      return {
        nameExists: false,
        verifiedExists: false,
        likelyExists: false,
        fogExists: false,
      };
    }
  };

  buildDoppelMemoryConfirmMessage = draft => {
    const roleName = String(draft?.roleName || draft?.sourceRoleSlug || draft?.inputId || '').trim();
    return [
      this.getRoleUiText('doppelMemoryConfirm'),
      `${this.getRoleUiText('doppelMemorySourceId') || 'Source ID'}：${draft?.inputId || '-'}`,
      `${this.getRoleUiText('doppelMemorySourceNamespace') || 'Namespace'}：${draft?.namespaceId || '-'}`,
      roleName,
      '',
      `NAME：${draft?.nameExists ? '✅' : '-'}`,
      `VERIFIED：${draft?.verifiedExists ? '✅' : '-'}`,
      `LIKELY：${draft?.likelyExists ? '✅' : '-'}`,
      `FOG：${draft?.fogExists ? '✅' : '-'}`,
      '',
      `[[/role onchainmemory doppel do|${this.getRoleUiText('confirm') || 'Confirm'}]]   [[/role onchainmemory|${this.getRoleUiText('back')}]]`,
    ].join('\n');
  };

  restoreRoleFromDoppelMemory = async draft => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const currentRoleData = await this.readRoleFile(safeRoleSlug);
    const memoryLayers = {
      verified: String(draft?.memoryLayers?.verified || '').trim(),
      likely: String(draft?.memoryLayers?.likely || '').trim(),
      fog: String(draft?.memoryLayers?.fog || '').trim(),
    };
    const roleName = String(draft?.roleName || currentRoleData?.roleName || safeRoleSlug).trim() || safeRoleSlug;
    if (!roleName && !memoryLayers.verified && !memoryLayers.likely && !memoryLayers.fog) return null;

    if (currentRoleData) {
      await this.writeRoleLastMemory(safeRoleSlug, { roleData: currentRoleData, kind: 'before-doppel-onchain-restore', trigger: '/role onchainmemory doppel' });
      await this.captureExistingRoleMemorySnapshot(safeRoleSlug, { kind: 'before-doppel-onchain-restore', trigger: '/role onchainmemory doppel' });
    }

    const snapshot = buildRoleSnapshot({
      kind: 'doppel-onchain-memory',
      roleSlug: safeRoleSlug,
      roleName,
      agentId: this.agentId,
      roleData: {
        ...(currentRoleData || {}),
        roleSlug: safeRoleSlug,
        roleName,
        memoryLayers,
        initialMemoryLayers: memoryLayers,
        memory: this.composeRoleMemoryCard(roleName, memoryLayers),
        initialMemory: this.composeRoleMemoryCard(roleName, memoryLayers),
        updatedAt: Date.now(),
      },
      memoryLayers,
      initialMemoryLayers: memoryLayers,
      capturedAt: Date.now(),
      source: {
        kind: 'doppel-onchain-memory',
        trigger: '/role onchainmemory doppel',
        inputId: draft?.inputId,
        namespaceId: draft?.namespaceId,
        sourceRoleSlug: draft?.sourceRoleSlug,
      },
      state: {
        roleLangCode: this.getRoleLangCode?.() || this.state?.roleLangCode || 'en',
      },
      conversationSummary: currentRoleData ? await this.readConversationSummary(safeRoleSlug) : DEFAULT_CONVERSATION_SUMMARY,
      conversationBuffer: currentRoleData ? await this.readConversationBuffer(safeRoleSlug) : '',
    });
    await this.applyRoleSnapshot(snapshot);
    const restoredRoleData = await this.readRoleFile(safeRoleSlug);
    if (!restoredRoleData) return null;
    return {
      roleData: restoredRoleData,
      restoredFrom: 'doppel-onchain-memory',
      source: {
        roleName,
        roleSlug: safeRoleSlug,
        inputId: draft?.inputId,
        namespaceId: draft?.namespaceId,
        capturedAt: Date.now(),
        version: 1,
      },
    };
  };

  restoreRoleFromOnChainMemory = async () => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const currentRoleData = await this.readRoleFile(safeRoleSlug);
    const namespaceId = this.props?.navigation?.state?.params?.namespaceId;
    if (!namespaceId) return null;

    try {
      const nameValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.name`);
      const verifiedValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.verified`);
      const likelyValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.likely`);
      const fogValue = await this.readSingleOnChainMemoryValue(namespaceId, `role.memory.${safeRoleSlug}.fog`);
      const memoryLayers = {
        verified: String(verifiedValue || '').trim(),
        likely: String(likelyValue || '').trim(),
        fog: String(fogValue || '').trim(),
      };
      const hasOnChainMemory = !!String(nameValue || '').trim() || !!memoryLayers.verified || !!memoryLayers.likely || !!memoryLayers.fog;
      if (!hasOnChainMemory) {
        return { notFound: true };
      }
      const roleName = String(nameValue || currentRoleData?.roleName || safeRoleSlug).trim() || safeRoleSlug;

      if (currentRoleData) {
        await this.writeRoleLastMemory(safeRoleSlug, { roleData: currentRoleData, kind: 'before-onchain-restore', trigger: '/role onchainmemory' });
        await this.captureExistingRoleMemorySnapshot(safeRoleSlug, { kind: 'before-onchain-restore', trigger: '/role onchainmemory' });
      }
      const snapshot = buildRoleSnapshot({
        kind: 'onchain-memory',
        roleSlug: safeRoleSlug,
        roleName,
        agentId: this.agentId,
        roleData: {
          ...(currentRoleData || {}),
          roleSlug: safeRoleSlug,
          roleName,
          memoryLayers,
          initialMemoryLayers: memoryLayers,
          memory: this.composeRoleMemoryCard(roleName, memoryLayers),
          initialMemory: this.composeRoleMemoryCard(roleName, memoryLayers),
          updatedAt: Date.now(),
        },
        memoryLayers,
        initialMemoryLayers: memoryLayers,
        capturedAt: Date.now(),
        source: { kind: 'onchain-memory', trigger: '/role onchainmemory' },
        state: {
          roleLangCode: this.getRoleLangCode?.() || this.state?.roleLangCode || 'en',
        },
        conversationSummary: currentRoleData ? await this.readConversationSummary(safeRoleSlug) : DEFAULT_CONVERSATION_SUMMARY,
        conversationBuffer: currentRoleData ? await this.readConversationBuffer(safeRoleSlug) : '',
      });
      await this.applyRoleSnapshot(snapshot);
      const restoredRoleData = await this.readRoleFile(safeRoleSlug);
      if (!restoredRoleData) return null;
      return {
        roleData: restoredRoleData,
        restoredFrom: 'onchain-memory',
        source: {
          roleName,
          roleSlug: safeRoleSlug,
          capturedAt: Date.now(),
          version: 1,
        },
      };
    } catch (error) {
      console.warn('Failed to restore role from on-chain memory', { roleSlug: safeRoleSlug, error });
      return null;
    }
  };


  getConversationSummaryPath = roleSlug => `${this.getRoleDirPath(roleSlug)}/conversation_summary.json`;

  readConversationSummary = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    const path = this.getConversationSummaryPath(safeRoleSlug);
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return normalizeConversationSummary(DEFAULT_CONVERSATION_SUMMARY, safeRoleSlug);
      const raw = await RNFS.readFile(path, 'utf8');
      return normalizeConversationSummary(JSON.parse(raw), safeRoleSlug);
    } catch (error) {
      console.warn('Failed to read conversation summary', { roleSlug: safeRoleSlug, error });
      try {
        const brokenPath = `${path}.broken`;
        const raw = await RNFS.readFile(path, 'utf8');
        await RNFS.writeFile(brokenPath, raw || '', 'utf8');
      } catch {}
      return normalizeConversationSummary(DEFAULT_CONVERSATION_SUMMARY, safeRoleSlug);
    }
  };

  writeConversationSummary = async (roleSlug, summary) => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    const path = this.getConversationSummaryPath(safeRoleSlug);
    const tmpPath = `${path}.tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      const normalized = normalizeConversationSummary(summary, safeRoleSlug);
      await RNFS.writeFile(tmpPath, JSON.stringify(normalized, null, 2), 'utf8');
      if (await RNFS.exists(path)) {
        try { await RNFS.unlink(path); } catch {}
      }
      await RNFS.moveFile(tmpPath, path);
      return true;
    } catch (error) {
      console.warn('Failed to write conversation summary', { roleSlug: safeRoleSlug, error });
      try { await RNFS.unlink(tmpPath); } catch {}
      return false;
    }
  };

  getConversationBufferPath = roleSlug => `${this.getRoleDirPath(roleSlug)}/conversation_buffer.jsonl`;

  appendConversationBufferEntry = async (roleSlug, entry) => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    const path = this.getConversationBufferPath(safeRoleSlug);
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      const line = `${JSON.stringify({
        ts: Number(entry?.ts || Date.now()),
        role: String(entry?.role || '').trim() || 'unknown',
        content: String(entry?.content || '').trim(),
        messageId: String(entry?.messageId || '').trim(),
      })}\n`;
      await RNFS.appendFile(path, line, 'utf8');
      return true;
    } catch (error) {
      console.warn('Failed to append conversation buffer entry', { roleSlug: safeRoleSlug, error });
      return false;
    }
  };

  readConversationBuffer = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    const path = this.getConversationBufferPath(safeRoleSlug);
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return '';
      return String(await RNFS.readFile(path, 'utf8') || '');
    } catch (error) {
      console.warn('Failed to read conversation buffer raw', { roleSlug: safeRoleSlug, error });
      return '';
    }
  };

  readConversationBufferEntries = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    try {
      const raw = await this.readConversationBuffer(safeRoleSlug);
      if (!raw) return [];
      return String(raw || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          try {
            const obj = JSON.parse(line);
            return {
              ts: Number(obj?.ts || 0),
              role: String(obj?.role || '').trim() || 'unknown',
              content: String(obj?.content || '').trim(),
              messageId: String(obj?.messageId || '').trim(),
            };
          } catch {
            return null;
          }
        })
        .filter(item => item && item.content);
    } catch (error) {
      console.warn('Failed to read conversation buffer', { roleSlug: safeRoleSlug, error });
      return [];
    }
  };

  consumeConversationBufferEntries = async (roleSlug, consumedCount = 0) => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    const path = this.getConversationBufferPath(safeRoleSlug);
    try {
      const entries = await this.readConversationBufferEntries(safeRoleSlug);
      const remain = consumedCount > 0 ? entries.slice(consumedCount) : entries;
      if (!remain.length) {
        if (await RNFS.exists(path)) {
          await RNFS.writeFile(path, '', 'utf8');
        }
        return true;
      }
      const nextRaw = remain.map(item => JSON.stringify(item)).join('\n') + '\n';
      await RNFS.writeFile(path, nextRaw, 'utf8');
      return true;
    } catch (error) {
      console.warn('Failed to consume conversation buffer', { roleSlug: safeRoleSlug, error });
      return false;
    }
  };

  clearConversationBuffer = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    const path = this.getConversationBufferPath(safeRoleSlug);
    try {
      if (await RNFS.exists(path)) {
        await RNFS.writeFile(path, '', 'utf8');
      }
      return true;
    } catch (error) {
      console.warn('Failed to clear conversation buffer', { roleSlug: safeRoleSlug, error });
      return false;
    }
  };

  clearConversationSummary = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    const path = this.getConversationSummaryPath(safeRoleSlug);
    try {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
      return true;
    } catch (error) {
      console.warn('Failed to clear conversation summary', { roleSlug: safeRoleSlug, error });
      return false;
    }
  };

  exportRoleRecord = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || this.state.activeRoleSlug || '') || '';
    if (!safeRoleSlug) {
      this.replyFromAgent(this.getRoleUiText('noActiveRole'));
      return false;
    }
    const roleData = await this.readRoleFile(safeRoleSlug);
    if (!roleData) {
      this.replyFromAgent(this.getRoleUiText('noActiveRole'));
      return false;
    }
    const summary = await this.readConversationSummary(safeRoleSlug);
    const bufferEntriesRaw = await this.readConversationBufferEntries(safeRoleSlug);
    const bufferEntriesExport = Array.isArray(bufferEntriesRaw)
      ? bufferEntriesRaw
          .filter(entry => {
            const role = String(entry?.role || '').toLowerCase();
            const sender = role === 'user' ? 'user' : 'agent';
            const text = String(entry?.content || '').trim();
            if (!text) return false;
            if (isRoleExportSystemMessage({ text, sender })) return false;
            if (sender === 'user' && /^\//.test(text)) return false;
            return true;
          })
          .map(entry => JSON.stringify({
            ts: Number(entry?.ts || Date.now()),
            role: String(entry?.role || '').toLowerCase() === 'user' ? 'user' : 'assistant',
            content: String(entry?.content || '').trim(),
            messageId: String(entry?.messageId || ''),
          }))
          .join('\n')
      : '';
    const todayKey = getLocalDateKey();
    const todayRaw = await this.readDayMessages(todayKey);
    const todayConversationMessages = (Array.isArray(todayRaw) ? todayRaw : [])
      .filter(message => ['user', 'agent'].includes(String(message?.sender || '').trim().toLowerCase()))
      .filter(message => {
        const sender = String(message?.sender || '').trim().toLowerCase();
        const text = String(message?.text || '').trim();
        if (!text) return false;
        if (isRoleExportSystemMessage({ text, sender })) return false;
        if (sender === 'user' && /^\//.test(text)) return false;
        return true;
      })
      .map(message => ({
        ts: Number(message?.timestamp || message?.ts || Date.now()),
        role: String(message?.sender || '').toLowerCase() === 'user' ? 'user' : 'assistant',
        text: String(message?.text || '').trim(),
        messageId: String(message?.id || message?.requestId || message?.messageId || ''),
      }))
      .filter(item => item.text);
    const snapshot = buildRoleSnapshot({
      kind: 'export',
      roleSlug: safeRoleSlug,
      roleName: String(roleData?.roleName || safeRoleSlug).trim() || safeRoleSlug,
      agentId: this.agentId,
      roleData,
      state: {
        currentRole: this.state.activeRoleSlug === safeRoleSlug,
        roleLangCode: this.getRoleLangCode?.() || this.state.roleLangCode || 'en',
        lastSelectedRoleName: this.state.lastSelectedRole,
      },
      conversationSummary: summary,
      conversationBuffer: bufferEntriesExport,
      todayConversationMessages,
      capturedAt: Date.now(),
      source: { kind: 'manual-export', trigger: '/role export' },
    });
    const payload = serializeRoleSnapshotToLegacyText(snapshot);
    const downloadsRoot = RNFS.DownloadDirectoryPath || RNFS.ExternalStorageDirectoryPath || RNFS.ExternalDirectoryPath;
    const exportDir = `${downloadsRoot}/xkeva`;
    if (!(await RNFS.exists(exportDir))) {
      await RNFS.mkdir(exportDir);
    }
    const safeRoleNameForFile = String(roleData?.roleName || safeRoleSlug)
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ');
    const now = new Date();
    const compactLabel = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const preferredPath = `${exportDir}/${safeRoleNameForFile}-${this.agentId}-xkeva-${compactLabel}.txt`;
    const fallbackPath = `${exportDir}/role-export-${safeRoleSlug}-${this.agentId}-${compactLabel}.txt`;
    let filePath = preferredPath;
    try {
      await RNFS.writeFile(preferredPath, payload, 'utf8');
      const ok = await RNFS.exists(preferredPath);
      if (!ok) {
        throw new Error('preferred_export_missing_after_write');
      }
    } catch (error) {
      filePath = fallbackPath;
      await RNFS.writeFile(fallbackPath, payload, 'utf8');
      const fallbackOk = await RNFS.exists(fallbackPath);
      if (!fallbackOk) {
        throw new Error(`export_write_failed:${String(error?.message || error || 'unknown')}`);
      }
    }
    this._lastExportedRoleRecordPath = filePath;
    this.replyFromAgent(`${this.getRoleUiText('exportRecordSuccess', { path: filePath })}\n\n[[/role openexport|${this.getRoleUiText('openRecord')}]]   [[/role|${this.getRoleUiText('continueChat')}]]`);
    return true;
  };

  parseRoleRecordPayload = raw => parseRoleSnapshotPayload(raw);

  parseRoleRecordText = raw => parseRoleSnapshotPayload(raw);

  applyRoleSnapshot = async snapshotInput => {
    const snapshot = normalizeRoleSnapshot(snapshotInput);
    const safeRoleSlug = this.getSpaceRoleKey();
    const roleName = String(snapshot?.role?.roleName || snapshot?.roleData?.roleName || safeRoleSlug).trim() || safeRoleSlug;
    const roleDir = this.getRoleDirPath(safeRoleSlug);
    await this.ensureRoleFilesDir();
    if (!(await RNFS.exists(roleDir))) {
      await RNFS.mkdir(roleDir);
    }
    const rolePayload = {
      ...(snapshot?.roleData || {}),
      roleSlug: safeRoleSlug,
      roleName,
      memoryLayers: snapshot?.memoryLayers,
      initialMemoryLayers: snapshot?.initialMemoryLayers,
    };
    await this.writeRoleFile(safeRoleSlug, rolePayload);
    await this.writeConversationSummary(safeRoleSlug, snapshot?.artifacts?.conversationSummary || DEFAULT_CONVERSATION_SUMMARY);
    await RNFS.writeFile(this.getConversationBufferPath(safeRoleSlug), String(snapshot?.artifacts?.conversationBuffer || ''), 'utf8');

    const todayMessages = Array.isArray(snapshot?.artifacts?.todayConversationMessages)
      ? snapshot.artifacts.todayConversationMessages
      : [];
    if (todayMessages.length) {
      const dateKey = getLocalDateKey();
      const mappedMessages = todayMessages
        .map(item => {
          const timestamp = Number(item?.ts || item?.timestamp || Date.now()) || Date.now();
          const sender = String(item?.role || item?.sender || '').toLowerCase() === 'user' ? 'user' : 'agent';
          const text = String(item?.text || item?.content || '').trim();
          if (!text) return null;
          return {
            id: String(item?.messageId || item?.id || `${timestamp}-${Math.random().toString(36).slice(2, 8)}`),
            text,
            sender,
            timestamp,
            _isHistory: false,
          };
        })
        .filter(Boolean)
        .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
      await RNFS.writeFile(this.getDayFilePath(dateKey), JSON.stringify(mappedMessages), 'utf8');
    }

    await this.upsertRoleIndexEntry({
      roleName,
      roleSlug: safeRoleSlug,
      updatedAt: Number(snapshot?.role?.updatedAt || snapshot?.roleData?.updatedAt || Date.now()),
    });
    await this.saveLastSelectedRole(roleName);
    await this.saveActiveRoleState(roleName, safeRoleSlug);
    await this.saveCurrentSummonedRole(roleName, safeRoleSlug);
    this.activeRoleSlug = safeRoleSlug;
    await new Promise(resolve => this.setState({ activeRoleSlug: safeRoleSlug, currentSummonedRole: { roleSlug: safeRoleSlug, roleName } }, resolve));
    return { roleSlug: safeRoleSlug, roleName };
  };

  importRoleRecord = async () => {
    try {
      const picked = await DocumentPicker.pick({
        type: [DocumentPicker.types.plainText],
        copyTo: 'cachesDirectory',
      });
      const file = Array.isArray(picked) ? picked[0] : picked;
      const readPath = file?.fileCopyUri || file?.uri;
      if (!readPath) return false;
      const raw = await RNFS.readFile(readPath, 'utf8');
      const snapshot = normalizeRoleSnapshot(this.parseRoleRecordPayload(raw));
      const safeRoleSlug = Rolecards.normalizeRoleSlug(snapshot?.role?.roleSlug || snapshot?.roleData?.roleSlug || snapshot?.roleData?.roleName || '') || '';
      if (!safeRoleSlug) {
        throw new Error('invalid_role_export');
      }
      await this.captureExistingRoleMemorySnapshot(this.getSpaceRoleKey(), { kind: 'before-record-import', trigger: '/role import' });
      await this.applyRoleSnapshot(snapshot);
      await this.writeRoleRecoveryBaseline(this.getSpaceRoleKey());
      this.replyFromAgent(this.getRoleUiText('importRecordSuccess'));
      await this.handleTriggers('/role', null);
      return true;
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        this.replyFromAgent(this.getRoleUiText('importRecordFailed', { error: String(error?.message || error || 'unknown') }));
      }
      return false;
    }
  };

  replyFromAgentLocal = text => this.replyFromAgent(text, { _localOnly: true, _useSatoshiAvatar: true });

  beginRoleFragmentImport = async () => {
    await new Promise(resolve => this.setState({ pendingRoleFragmentImport: true }, resolve));
    this.replyFromAgentLocal(this.getRoleUiText('importFragmentPrompt') || 'Paste a character fragment, and I will analyze it into a role.');
    return true;
  };

  importRoleFragment = async fragmentText => {
    const fragment = String(fragmentText || '').trim();
    if (!fragment) {
      this.replyFromAgentLocal(this.getRoleUiText('importFragmentEmpty') || 'Please enter a character fragment first.');
      await this.beginRoleFragmentImport();
      return false;
    }

    const roleModelStatus = await this.ensureRoleModelReady({ source: this.roleEntrySource || 'role' });
    if (!roleModelStatus?.ok) {
      return false;
    }

    this.replyFromAgentLocal(this.getRoleUiText('importFragmentAnalyzing') || 'Analyzing fragment...');
    const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
    const languageInstruction = buildRoleLanguageInstruction(roleLang);
    const prompt = buildRoleFragmentImportPrompt({ fragment, roleLang, languageInstruction });
    let raw = '';
    try {
      raw = await this.callLLMSilent(prompt, { skipRoleContext: true });
    } catch (error) {
      raw = '';
    }

    const parsed = parseRoleFragmentImportResult({ raw, fragment, fallbackName: this.getRoleUiText('importedRoleName') || 'Imported Role' });
    const roleName = String(parsed?.roleName || '').trim() || (this.getRoleUiText('importedRoleName') || 'Imported Role');
    const roleSlug = this.getSpaceRoleKey();
    const memoryLayers = parsed?.memoryLayers || {};
    const memory = this.composeRoleMemoryCard(roleName, memoryLayers);
    const now = Date.now();
    const writeOk = await this.writeRoleFile(roleSlug, {
      roleName,
      roleSlug,
      memory,
      initialMemory: memory,
      memoryLayers,
      initialMemoryLayers: memoryLayers,
      generationStatus: raw ? 'fragment_import' : 'fragment_import_fallback',
      importFragment: fragment,
      createdAt: now,
      updatedAt: now,
    });
    const readBack = writeOk ? await this.readRoleFile(roleSlug) : null;
    if (!writeOk || !readBack) {
      this.replyFromAgentLocal(this.getRoleUiText('importFragmentFailed', { error: 'write_failed' }) || 'Import fragment failed: write_failed');
      return false;
    }

    await this.writeRoleRecoveryBaseline(roleSlug);
    await this.upsertRoleIndexEntry({ roleName, roleSlug, updatedAt: now });
    const refreshedCards = await this.loadLocalRoleCardsPage(0);
    this.replyFromAgentLocal(this.getRoleUiText('importFragmentSuccess', { name: roleName }) || `Fragment imported: ${roleName}`);
    await this.finalizeRoleActivation({ name: roleName, roleSlug, refreshedCards, clearDuplicate: true });
    return true;
  };

  beginRoleStoryFragmentImport = async () => {
    await new Promise(resolve => this.setState({ pendingRoleStoryFragmentImport: true }, resolve));
    this.replyFromAgentLocal(this.getRoleUiText('importStoryFragmentPrompt') || '请输入一些文字，系统将分析是否有可恢复的全生成宇宙碎片。');
    return true;
  };

  confirmRoleStoryFragmentAnalyze = async fragmentText => {
    const fragment = String(fragmentText || '').trim();
    if (!fragment) {
      this.replyFromAgentLocal(this.getRoleUiText('importStoryFragmentEmpty') || 'Please enter some text first.');
      await this.beginRoleStoryFragmentImport();
      return false;
    }
    await new Promise(resolve => this.setState({
      pendingRoleStoryFragmentAnalyzeConfirm: true,
      pendingRoleStoryFragmentText: fragment,
    }, resolve));
    this.replyFromAgentLocal([
      this.getRoleUiText('storyFragmentDataReceived') || '收到数据。',
      '',
      this.getRoleUiText('storyFragmentAnalyzePrompt') || '是否开始分析？',
      '',
      `[[/role story fragment analyze yes|${this.getRoleUiText('yes') || '是'}]]   [[/role story fragment analyze no|${this.getRoleUiText('no') || '否'}]]`,
    ].join('\n'));
    return true;
  };

  getStorySummaryTagsPath = () => {
    const storyDir = String(this.getStoryChatDir() || '').replace(/\/+$/, '');
    const baseDir = storyDir.replace(/\/story$/, '');
    return `${baseDir || storyDir}/story_summary_tags.json`;
  };

  normalizeStorySummaryTag = tag => {
    const raw = String(tag || '').trim();
    const match = /^#?story([A-Za-z0-9_]+)$/i.exec(raw);
    if (!match) return '';
    return `#story${match[1]}`;
  };

  captureStorySummaryTagFromFragment = async fragmentText => {
    const text = String(fragmentText || '');
    if (!/(?:^|\s)#agentstory\b/i.test(text)) {
      return '';
    }
    const match = /(?:^|\s)(#story[A-Za-z0-9_]+)\b/i.exec(text);
    const storyTag = this.normalizeStorySummaryTag(match?.[1] || '');
    if (!storyTag) {
      return '';
    }
    const payload = {
      schema: 'story_summary_tags.v1',
      storyTag,
      updatedAt: Date.now(),
    };
    try {
      await RNFS.mkdir(this.getStoryChatDir()).catch(() => {});
      await RNFS.writeFile(this.getStorySummaryTagsPath(), JSON.stringify(payload, null, 2), 'utf8');
      return storyTag;
    } catch (error) {
      console.warn('Failed to save story summary tag from fragment', error);
      return '';
    }
  };

  readSavedStorySummaryTag = async () => {
    try {
      const path = this.getStorySummaryTagsPath();
      if (!(await RNFS.exists(path))) {
        return '';
      }
      const raw = await RNFS.readFile(path, 'utf8');
      const parsed = JSON.parse(raw);
      return this.normalizeStorySummaryTag(parsed?.storyTag || '');
    } catch (error) {
      console.warn('Failed to read saved story summary tag', error);
      return '';
    }
  };

  stripStoryFragmentTagsForGeneration = fragmentText => String(fragmentText || '')
    .replace(/(^|\s)#(?:\[[^\]]+\]|[\p{L}\p{N}\p{Pc}\p{M}_-]+)/gu, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  openRoleStoryOnChainMenu = async () => {
    this.replyFromAgent([
      this.getRoleUiText('onchainStoryMenuTitle') || this.getRoleUiText('onchainStory') || 'On-chain Story',
      '',
      `[[/role story onchain local|${this.getRoleUiText('localOnchainStory') || 'Local Story'}]]`,
      '',
      `[[/role story onchain doppel|${this.getRoleUiText('doppelStory') || 'Doppel Story'}]]`,
      '',
      `[[/role story|${this.getRoleUiText('back')}]]`,
    ].join('\n'));
    return true;
  };

  importLocalOnChainStorySummary = async () => {
    const namespaceId = this.props?.navigation?.state?.params?.namespaceId;
    const roleSlug = this.getSpaceRoleKey();
    if (!namespaceId) {
      this.replyFromAgent(this.getRoleUiText('missingNamespace'));
      return false;
    }
    this.replyFromAgentLocal(this.getRoleUiText('onchainStoryReading') || 'Reading on-chain story summary...');
    try {
      const result = await fetchLocalOnChainStorySummary({ BlueElectrum, namespaceId, roleSlug });
      const summaryText = String(result?.summary || '').trim();
      if (!summaryText) {
        this.replyFromAgentLocal(this.getRoleUiText('onchainStoryFailed') || '(on-chain story failed)');
        return false;
      }
      return await this.importRoleStoryFragment(summaryText, { analyzingText: this.getRoleUiText('onchainStoryAnalyzing') || this.getRoleUiText('importStoryFragmentAnalyzing') });
    } catch (error) {
      console.warn('Failed to read local on-chain story summary', error);
      this.replyFromAgentLocal(this.getRoleUiText('onchainStoryFailed') || '(on-chain story failed)');
      return false;
    }
  };

  beginDoppelOnChainStoryImport = async () => {
    await new Promise(resolve => this.setState({ pendingDoppelStoryInput: true }, resolve));
    this.replyFromAgentLocal(this.getRoleUiText('doppelStoryPrompt') || 'Enter the doppel ID to read story summary from:');
    return true;
  };

  importDoppelOnChainStorySummary = async rawId => {
    const inputId = normalizeOnChainStoryId(rawId);
    if (!inputId) {
      this.replyFromAgentLocal(this.getRoleUiText('doppelStoryEmpty') || 'Please enter an ID.');
      await this.beginDoppelOnChainStoryImport();
      return false;
    }
    this.replyFromAgentLocal(this.getRoleUiText('doppelStoryReading') || 'Reading doppel story summary...');
    try {
      const result = await fetchDoppelOnChainStorySummary({ BlueElectrum, rawId: inputId });
      const summaryText = String(result?.summary || '').trim();
      if (!summaryText) {
        this.replyFromAgentLocal(this.getRoleUiText('doppelStoryFailed') || '(doppel story failed)');
        return false;
      }
      return await this.importRoleStoryFragment(summaryText, { analyzingText: this.getRoleUiText('onchainStoryAnalyzing') || this.getRoleUiText('importStoryFragmentAnalyzing') });
    } catch (error) {
      console.warn('Failed to read doppel on-chain story summary', error);
      this.replyFromAgentLocal(this.getRoleUiText('doppelStoryFailed') || '(doppel story failed)');
      return false;
    }
  };

  importRoleStoryFragment = async (fragmentText, options = {}) => {
    const fragment = String(fragmentText || '').trim();
    if (!fragment) {
      this.replyFromAgentLocal(this.getRoleUiText('importStoryFragmentEmpty') || 'Please enter a story fragment first.');
      await this.beginRoleStoryFragmentImport();
      return false;
    }

    const roleModelStatus = await this.ensureRoleModelReady({ source: this.roleEntrySource || 'role' });
    if (!roleModelStatus?.ok) {
      return false;
    }

    await this.captureStorySummaryTagFromFragment(fragment);
    const fragmentForGeneration = this.stripStoryFragmentTagsForGeneration(fragment) || fragment;

    this.replyFromAgentLocal(options.analyzingText || this.getRoleUiText('importStoryFragmentAnalyzing') || 'Analyzing story fragment...');
    const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
    const languageInstruction = buildRoleLanguageInstruction(roleLang);
    const prompt = buildRoleStoryFragmentImportPrompt({ fragment: fragmentForGeneration, roleLang, languageInstruction });
    let raw = '';
    try {
      raw = await this.callLLMSilent(prompt, { skipRoleContext: true });
    } catch (error) {
      raw = '';
    }

    const storySeed = parseRoleStoryFragmentImportResult({
      raw,
      fragment: fragmentForGeneration,
      fallbackTitle: this.getRoleUiText('importedStoryFragmentTitle') || 'Imported Story Fragment',
    });
    if (!storySeed?.premise) {
      this.replyFromAgentLocal(this.getRoleUiText('importStoryFragmentFailed', { error: 'empty_seed' }) || 'Story fragment import failed: empty_seed');
      return false;
    }

    await this.confirmImportedRoleStoryFragmentExplore(storySeed);
    return true;
  };

  getCurrentRoleNameForStoryExplore = async () => {
    const currentRole = await this.getCurrentSummonedRoleData().catch(() => null);
    const roleName = String(
      currentRole?.roleName ||
      currentRole?.roleData?.roleName ||
      this.state.currentSummonedRole?.roleName ||
      this.state.lastSelectedRole?.roleName ||
      '',
    ).trim();
    if (roleName) {
      return roleName;
    }
    const params = this.props.navigation?.state?.params || {};
    return String(params.displayName || params.shortCode || this.agentId || 'Agent').trim() || 'Agent';
  };

  openImportedRoleStoryFragment = async storySeed => {
    const hasCurrentStory = await this.hasRoleCurrentStory();
    if (hasCurrentStory) {
      try {
        await createRoleStorySnapshot(this);
      } catch (error) {
        console.warn('Failed to capture story snapshot before fragment import clear', error);
        this.replyFromAgentLocal(
          this.getRoleUiText('storySnapshotFailed', { error: String(error?.message || error || 'unknown') }) || 'Story snapshot failed',
        );
        return false;
      }
    }
    await this.openRoleStorySpace({
      suppressAutoLinkStart: false,
      clearStoryOnMount: true,
      autoCommand: '/d new',
      autoCommandSource: 'story-fragment-import',
      storyFragmentImport: storySeed,
    });
    return true;
  };

  confirmImportedRoleStoryFragmentExplore = async storySeed => {
    const agentName = await this.getCurrentRoleNameForStoryExplore();
    await new Promise(resolve => this.setState({
      pendingRoleStoryFragmentExplore: true,
      pendingRoleStoryFragmentSeed: storySeed,
    }, resolve));
    this.replyFromAgentLocal([
      this.getRoleUiText('importStoryFragmentSuccess') || '故事碎片已恢复',
      '',
      this.getRoleUiText('storyFragmentExplorePrompt', { agentName }) || `是否派遣${agentName}继续探索？`,
      '',
      `[[/role story fragment explore yes|${this.getRoleUiText('yes') || '是'}]]   [[/role story fragment explore no|${this.getRoleUiText('no') || '否'}]]`,
    ].join('\n'));
  };

  appendConversationBufferMessage = async (message, forcedRoleSlug = '') => {
    if (this.chatScope !== 'role') return false;
    if (!this.shouldPersistRoleMessage(message) || shouldExcludeFromSummary(message)) {
      return false;
    }
    const safeRoleSlug = Rolecards.normalizeRoleSlug(
      forcedRoleSlug || this.state.activeRoleSlug || this.activeRoleSlug || this.state.currentSummonedRole?.roleSlug || ''
    ) || '';
    if (!safeRoleSlug) return false;
    return this.appendConversationBufferEntry(safeRoleSlug, {
      ts: Number(message.timestamp || Date.now()),
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: String(message.text || '').trim(),
      messageId: message.id || message.requestId || '',
    });
  };

  getSummarizableRoleMessages = (messages = []) => {
    return (Array.isArray(messages) ? messages : []).filter(message => {
      if (!message) return false;
      if (shouldExcludeFromSummary(message)) return false;
      return (
        (message.sender === 'user' || message.sender === 'agent') &&
        message.text &&
        !message.pending &&
        !message._localOnly &&
        message._renderMode !== 'commands'
      );
    });
  };

  readAllRoleChatMessages = async () => {
    const keys = await this.listDateKeys();
    this.allDateKeys = keys;
    if (!keys.length) return [];
    const dayBuckets = await Promise.all(keys.slice().reverse().map(dateKey => this.readDayMessages(dateKey)));
    return dayBuckets.reduce((acc, items) => acc.concat(Array.isArray(items) ? items : []), []);
  };

  scheduleConversationSummaryUpdate = async roleSlug => {
    if (this.chatScope !== 'role') return;
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || this.activeRoleSlug || this.state.activeRoleSlug || '') || '';
    if (!safeRoleSlug) return;
    if (this.isUpdatingConversationSummary) {
      this.pendingConversationSummaryRoleSlug = safeRoleSlug;
      return;
    }
    this.isUpdatingConversationSummary = true;
    try {
      await this.updateConversationSummary(safeRoleSlug);
    } finally {
      this.isUpdatingConversationSummary = false;
      const pendingRoleSlug = this.pendingConversationSummaryRoleSlug;
      this.pendingConversationSummaryRoleSlug = null;
      if (pendingRoleSlug && pendingRoleSlug !== safeRoleSlug) {
        this.scheduleConversationSummaryUpdate(pendingRoleSlug);
      }
    }
  };

  updateConversationSummary = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || '') || '';
    if (!safeRoleSlug || typeof this.callLLMSilent !== 'function' || !this.state.llmConfig?.provider) {
      return false;
    }

    const bufferEntriesRaw = await this.readConversationBufferEntries(safeRoleSlug);
    const bufferEntries = Array.isArray(bufferEntriesRaw)
      ? bufferEntriesRaw.filter(entry => {
          if (!entry || !entry.content) return false;
          return !shouldExcludeFromSummary({
            text: String(entry.content || ''),
            sender: String(entry.role || '').toLowerCase() === 'user' ? 'user' : 'assistant',
            _localOnly: false,
            _renderMode: '',
          });
        })
      : [];
    if (bufferEntries.length < LLM_HISTORY_LIMIT) {
      return false;
    }

    const consumedEntries = bufferEntries.slice(0, LLM_HISTORY_LIMIT);
    const summary = await this.readConversationSummary(safeRoleSlug);
    const transcript = consumedEntries
      .map(entry => `${entry.role === 'user' ? 'USER' : 'ROLE'}: ${String(entry.content || '').trim()}`)
      .join('\n\n');

    const prompt = buildConversationSummaryUpdatePrompt({
      summary,
      transcript,
    });

    let parsed = null;
    try {
      const raw = await this.callLLMSilent(prompt, { skipRoleContext: true });
      parsed = JSON.parse(String(raw || '').trim());
    } catch (error) {
      console.warn('Conversation summary update failed', { roleSlug: safeRoleSlug, error });
      return false;
    }

    const nextSummary = normalizeConversationSummary({
      ...summary,
      roleSlug: safeRoleSlug,
      updatedAt: Date.now(),
      lastSummarizedAt: Number(consumedEntries[consumedEntries.length - 1]?.ts || summary.lastSummarizedAt || 0),
      summaryEpoch: Number(summary.summaryEpoch || 0) + 1,
      facts: [...(summary.facts || []), ...(Array.isArray(parsed?.facts) ? parsed.facts : [])],
      open_loops: Array.isArray(parsed?.open_loops) && parsed.open_loops.length ? parsed.open_loops : (summary.open_loops || []),
      recent_arc: Array.isArray(parsed?.recent_arc) ? parsed.recent_arc : (summary.recent_arc || []),
    }, safeRoleSlug);

    const writeOk = await this.writeConversationSummary(safeRoleSlug, nextSummary);
    if (!writeOk) {
      return false;
    }
    await this.consumeConversationBufferEntries(safeRoleSlug, consumedEntries.length);
    return true;
  };


  getRoleCardPath = roleSlug => this.getRoleFilePath(roleSlug);

  readRoleIndex = async () => {
    try {
      const exists = await RNFS.exists(this.roleIndexPath);
      if (!exists) return [];
      const raw = await RNFS.readFile(this.roleIndexPath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to read role index', { path: this.roleIndexPath, error });
      return [];
    }
  };

  writeRoleIndex = async items => {
    const json = JSON.stringify(Array.isArray(items) ? items : [], null, 2);
    const tmpPath = `${this.roleIndexPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await RNFS.writeFile(tmpPath, json, 'utf8');
      if (await RNFS.exists(this.roleIndexPath)) {
        await RNFS.unlink(this.roleIndexPath);
      }
      await RNFS.moveFile(tmpPath, this.roleIndexPath);
      return true;
    } catch (error) {
      try {
        if (await RNFS.exists(tmpPath)) await RNFS.unlink(tmpPath);
      } catch {}
      console.warn('Failed to write role index', { path: this.roleIndexPath, error });
      this.replyFromAgent(`Role index write failed:\n${this.roleIndexPath}\n${String(error?.message || error || 'unknown error')}`);
      return false;
    }
  };

  upsertRoleIndexEntry = async ({ roleName, roleSlug, updatedAt = Date.now(), isOnChain = false } = {}) => {
    const safeRoleName = String(roleName || '').trim();
    const safeRoleSlug = this.getSpaceRoleKey();
    if (!safeRoleName || !safeRoleSlug) return false;
    const entry = {
      roleName: safeRoleName,
      roleSlug: safeRoleSlug,
      updatedAt: Number(updatedAt || Date.now()),
      lastSummonedAt: Number(updatedAt || Date.now()),
      isOnChain: !!isOnChain,
      hasMemory: true,
    };
    return this.writeRoleIndex([entry]);
  };

  removeRoleIndexEntry = async roleSlug => {
    return this.writeRoleIndex([]);
  };

  readRoleFilesIndexEntries = async () => {
    try {
      const roleData = await this.readRoleFile(this.getSpaceRoleKey());
      if (!roleData) return [];
      return [{
        roleName: String(roleData.roleName || this.getSpaceRoleKey()).trim() || this.getSpaceRoleKey(),
        roleSlug: this.getSpaceRoleKey(),
        updatedAt: Number(roleData.updatedAt || roleData.createdAt || Date.now()),
        lastSummonedAt: Number(roleData.updatedAt || roleData.createdAt || Date.now()),
        isOnChain: false,
        hasMemory: true,
      }];
    } catch (error) {
      console.warn('Failed to read role files index entries', error);
      return [];
    }
  };

  getReconciledRoleIndex = async () => {
    const indexItems = await this.readRoleIndex();
    const fileItems = await this.readRoleFilesIndexEntries();
    const bySlug = new Map();

    for (const item of Array.isArray(indexItems) ? indexItems : []) {
      const roleSlug = Rolecards.normalizeRoleSlug(item?.roleSlug || item?.roleName || '') || '';
      if (!roleSlug) continue;
      bySlug.set(roleSlug, {
        roleName: String(item?.roleName || roleSlug).trim() || roleSlug,
        roleSlug,
        updatedAt: Number(item?.updatedAt || item?.lastSummonedAt || 0),
        lastSummonedAt: Number(item?.lastSummonedAt || item?.updatedAt || 0),
        isOnChain: !!item?.isOnChain,
        hasMemory: item?.hasMemory !== false,
      });
    }

    for (const item of fileItems) {
      const roleSlug = Rolecards.normalizeRoleSlug(item?.roleSlug || item?.roleName || '') || '';
      if (!roleSlug) continue;
      const prev = bySlug.get(roleSlug);
      if (!prev) {
        bySlug.set(roleSlug, { ...item, roleSlug, hasMemory: true });
        continue;
      }
      bySlug.set(roleSlug, {
        ...prev,
        roleName: prev.roleName || item.roleName || roleSlug,
        updatedAt: Math.max(Number(prev.updatedAt || 0), Number(item.updatedAt || 0)),
        lastSummonedAt: Math.max(Number(prev.lastSummonedAt || 0), Number(item.lastSummonedAt || item.updatedAt || 0)),
        hasMemory: true,
      });
    }

    const reconciled = Array.from(bySlug.values()).sort((a, b) => Number(b?.lastSummonedAt || b?.updatedAt || 0) - Number(a?.lastSummonedAt || a?.updatedAt || 0));
    const indexJson = JSON.stringify((Array.isArray(indexItems) ? indexItems : []).map(item => ({
      roleName: String(item?.roleName || '').trim(),
      roleSlug: Rolecards.normalizeRoleSlug(item?.roleSlug || item?.roleName || '') || '',
      updatedAt: Number(item?.updatedAt || 0),
      lastSummonedAt: Number(item?.lastSummonedAt || item?.updatedAt || 0),
      isOnChain: !!item?.isOnChain,
      hasMemory: item?.hasMemory !== false,
    })).filter(item => item.roleSlug), null, 2);
    const reconciledJson = JSON.stringify(reconciled, null, 2);
    if (reconciled.length && indexJson !== reconciledJson) {
      await this.writeRoleIndex(reconciled);
    }
    return reconciled;
  };

  ensureRoleFilesDir = async () => {
    try {
      const baseExists = await RNFS.exists(this.agentChatDir);
      if (!baseExists) {
        await RNFS.mkdir(this.agentChatDir);
      }
      const roleExists = await RNFS.exists(this.roleFilesDir);
      if (!roleExists) {
        await RNFS.mkdir(this.roleFilesDir);
      }
      const indexExists = await RNFS.exists(this.roleIndexPath);
      if (!indexExists) {
        await RNFS.writeFile(this.roleIndexPath, '[]', 'utf8');
      }
      return true;
    } catch (error) {
      console.warn('Failed to ensure role files dir', {
        agentChatDir: this.agentChatDir,
        roleFilesDir: this.roleFilesDir,
        error,
      });
      this.replyFromAgent([
        'Role card dir prepare failed.',
        `chatDir=${this.agentChatDir}`,
        `roleDir=${this.roleFilesDir}`,
        String(error?.message || error || 'unknown error'),
      ].join('\n'));
      return false;
    }
  };

  readRoleFile = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return null;
      return await this.roleMemoryStore.readRoleFile(safeRoleSlug);
    } catch (error) {
      console.warn('Failed to read role file', { roleSlug: safeRoleSlug, path: this.getRoleFilePath(safeRoleSlug), error });
      return null;
    }
  };

  getRoleRecoveryBaselineData = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const roleData = await this.readRoleFile(safeRoleSlug);
    if (!roleData) return null;

    return buildRoleSnapshot({
      kind: 'baseline',
      roleSlug: safeRoleSlug,
      roleName: String(roleData.roleName || safeRoleSlug).trim() || safeRoleSlug,
      agentId: this.agentId,
      roleData,
      capturedAt: Date.now(),
      state: {
        roleLangCode: this.getRoleLangCode?.() || this.state?.roleLangCode || 'en',
      },
      source: { kind: 'initial-create', trigger: 'writeRoleRecoveryBaseline' },
    });
  };

  readRoleRecoveryBaseline = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const path = this.getRoleRecoveryBaselinePath(safeRoleSlug);
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      const parsed = normalizeRoleSnapshot(JSON.parse(raw));
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        version: Number(parsed.version || 1) || 1,
        schema: String(parsed.schema || 'role_snapshot').trim(),
        roleSlug: String(parsed?.role?.roleSlug || safeRoleSlug).trim(),
        roleName: String(parsed?.role?.roleName || safeRoleSlug).trim(),
        agentId: String(parsed?.role?.agentId || '').trim(),
        capturedAt: Number(parsed.capturedAt || Date.now()) || Date.now(),
        roleLangCode: String(parsed?.artifacts?.state?.roleLangCode || 'en'),
        memory: {
          verified: String(parsed?.memoryLayers?.verified || '').trim(),
          likely: String(parsed?.memoryLayers?.likely || '').trim(),
          fog: String(parsed?.memoryLayers?.fog || '').trim(),
        },
      };
    } catch (error) {
      console.warn('Failed to read role recovery baseline', { roleSlug: safeRoleSlug, path, error });
      return null;
    }
  };

  writeRoleRecoveryBaseline = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      const roleFileData = await this.readRoleFile(safeRoleSlug);
      if (!roleFileData) return false;

      const baselinePath = this.getRoleRecoveryBaselinePath(safeRoleSlug);
      if (await RNFS.exists(baselinePath)) {
        return true;
      }

      const data = await this.getRoleRecoveryBaselineData(safeRoleSlug);
      if (!data) return false;
      await RNFS.writeFile(baselinePath, JSON.stringify(data, null, 2), 'utf8');

      await this.writeRoleFile(safeRoleSlug, {
        ...roleFileData,
        hasRecoveryBaseline: true,
        recoveryBaselineCreatedAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.warn('Failed to write role recovery baseline', { roleSlug: safeRoleSlug, error });
      return false;
    }
  };

  restoreRoleFromRecoveryBaseline = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const currentRoleData = await this.readRoleFile(safeRoleSlug);
    if (!currentRoleData) return null;

    const path = this.getRoleRecoveryBaselinePath(safeRoleSlug);
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      const snapshot = normalizeRoleSnapshot(JSON.parse(raw));
      if (!snapshot || typeof snapshot !== 'object') return null;
      const baselineRoleSlug = String(snapshot?.role?.roleSlug || snapshot?.roleData?.roleSlug || '').trim();
      if (baselineRoleSlug && baselineRoleSlug !== safeRoleSlug) {
        console.warn('Recovery baseline role slug mismatch', { roleSlug: safeRoleSlug, baselineRoleSlug });
        return null;
      }

      await this.writeRoleLastMemory(safeRoleSlug, { roleData: currentRoleData, kind: 'before-baseline-restore', trigger: '/r memory rebuild' });

      const roleName = String(snapshot?.role?.roleName || snapshot?.roleData?.roleName || currentRoleData.roleName || safeRoleSlug).trim() || safeRoleSlug;
      const rolePayload = {
        ...(currentRoleData || {}),
        ...(snapshot?.roleData || {}),
        roleSlug: safeRoleSlug,
        roleName,
        memoryLayers: snapshot?.memoryLayers,
        initialMemoryLayers: snapshot?.initialMemoryLayers,
        updatedAt: Date.now(),
        hasRecoveryBaseline: true,
        lastRestoredFromBaselineAt: Date.now(),
        lastRecoveryBaselineVersion: Number(snapshot?.version || 1) || 1,
      };

      await this.writeRoleFile(safeRoleSlug, rolePayload, { createBackups: false });
      const restoredRoleData = await this.readRoleFile(safeRoleSlug);
      if (!restoredRoleData) return null;
      return {
        roleData: restoredRoleData,
        restoredFrom: 'baseline',
        source: {
          roleName,
          roleSlug: baselineRoleSlug || safeRoleSlug,
          capturedAt: Number(snapshot?.capturedAt || Date.now()) || Date.now(),
          version: Number(snapshot?.version || 1) || 1,
        },
      };
    } catch (error) {
      console.warn('Failed to restore role from recovery baseline', { roleSlug: safeRoleSlug, path, error });
      return null;
    }
  };

  restoreRoleFromInitialMemory = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    let result = null;
    const layers = ['verified', 'likely', 'fog'];
    for (let i = 0; i < layers.length; i += 1) {
      const layer = layers[i];
      result = await this.roleMemoryStore.rebuildRoleLayer({ roleSlug: safeRoleSlug, layer });
      if (!result?.roleData) return null;
    }
    return result;
  };

  writeRoleFile = async (roleSlug, data, options = {}) => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      return await this.roleMemoryStore.writeRoleFile(safeRoleSlug, data, options);
    } catch (error) {
      console.warn('Failed to write role file', { roleSlug: safeRoleSlug, path: this.getRoleFilePath(safeRoleSlug), error });
      return false;
    }
  };

  deleteRoleFile = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || 'unknown') || 'unknown';
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      const roleDirPath = this.getRoleDirPath(safeRoleSlug);
      const legacyPath = this.getLegacyRoleFilePath(safeRoleSlug);
      if (await RNFS.exists(roleDirPath)) {
        const entries = await RNFS.readDir(roleDirPath);
        for (const entry of entries) {
          if (entry.name === 'memory_snapshots') {
            continue;
          }
          try { await RNFS.unlink(entry.path); } catch {}
        }
      }
      if (await RNFS.exists(legacyPath)) {
        await RNFS.unlink(legacyPath);
      }
      return true;
    } catch (error) {
      console.warn('Failed to delete role file', error);
      return false;
    }
  };

  readRoleAlphaForPrompt = async () => {
    try {
      const storyAlphaPath = `${getStoryChatDirHelper(this.agentId, CHAT_DIR)}/alpha.json`;
      const exists = await RNFS.exists(storyAlphaPath);
      if (!exists) {
        return null;
      }
      const raw = await RNFS.readFile(storyAlphaPath, 'utf8');
      const data = JSON.parse(raw);
      const value = Number(data?.currentAlpha);
      return Number.isFinite(value) ? value : null;
    } catch (error) {
      console.warn('Failed to read role alpha for prompt', error);
      return null;
    }
  };

  buildRoleContextSystemPrompt = async ({ options = {} } = {}) => {
    if (this.chatScope !== 'role' || options?.skipRoleContext) {
      return '';
    }

    const active = await this.getCurrentSummonedRoleData();
    const roleData = active?.roleData || null;
    if (!roleData?.roleName) {
      return '';
    }

    const ctx = typeof this.resolveNamespaceContext === 'function' ? this.resolveNamespaceContext() : null;
    const agentId = ctx?.agentId || this.agentId || 'unknown';
    const roleLang = this.getRoleLangCode() || this.state.roleLangCode || 'en';
    const alphaOverride = await this.readRoleAlphaForPrompt();
    const rolePrompt = buildRoleChatPrompt(roleData.roleName, agentId, roleData.memory || '', roleLang, {
      isContinue: true,
      alphaOverride,
    });
    const conversationSummary = await this.readConversationSummary(active?.roleSlug || roleData?.roleSlug || this.activeRoleSlug || this.state.activeRoleSlug || '');
    const summaryBlock = buildConversationSummaryPromptBlock(conversationSummary);
    if (!summaryBlock) {
      return rolePrompt;
    }
    return [rolePrompt, 'LONG-TERM CONVERSATION MEMORY', summaryBlock].filter(Boolean).join('\n\n');
  };

  getCurrentSummonedRoleData = async () => {
    let roleName = String(this.state.currentSummonedRole?.roleName || '').trim();
    let roleSlug = String(this.state.currentSummonedRole?.roleSlug || '').trim() || this.getSpaceRoleKey();
    let roleCardPath = String(this.state.currentSummonedRole?.roleCardPath || '').trim();

    if (!roleSlug && !roleCardPath) {
      try {
        const exists = await RNFS.exists(this.currentRolePath);
        if (exists) {
          const raw = await RNFS.readFile(this.currentRolePath, 'utf8');
          const obj = JSON.parse(raw);
          roleName = String(obj?.roleName || '').trim();
          roleSlug = String(obj?.roleSlug || '').trim() || this.getSpaceRoleKey();
          roleCardPath = String(obj?.roleCardPath || '').trim();
          if (roleName || roleSlug || roleCardPath) {
            await new Promise(resolve => this.setState({ currentSummonedRole: obj, activeRoleState: obj, activeRoleSlug: roleSlug || null }, resolve));
            this.activeRoleSlug = roleSlug || null;
          }
        }
      } catch {}
    }

    if (roleCardPath) {
      const byPath = await this.getRoleDataByPath(roleCardPath);
      if (byPath) {
        return byPath;
      }
    }

    if (!roleSlug) return null;
    return await this.getRoleDataBySlug(roleSlug);
  };

  getActiveRoleData = async () => this.getCurrentSummonedRoleData();

  getRoleDataBySlug = async roleSlug => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const roleData = await this.readRoleFile(safeRoleSlug);
    if (!roleData) return null;
    return {
      roleSlug: safeRoleSlug,
      roleCardPath: this.getRoleCardPath(safeRoleSlug),
      roleData,
      roleName: roleData.roleName || safeRoleSlug,
    };
  };

  getRoleDataByPath = async roleCardPath => {
    const safePath = String(roleCardPath || '').trim();
    if (!safePath) return null;
    try {
      const exists = await RNFS.exists(safePath);
      if (!exists) return null;
      let roleSlug = '';
      let manifestPath = safePath;
      if (!safePath.endsWith('.json')) {
        manifestPath = `${safePath.replace(/\/$/, '')}/role.json`;
      }
      const manifestExists = await RNFS.exists(manifestPath);
      if (manifestExists) {
        const raw = await RNFS.readFile(manifestPath, 'utf8');
        const parsed = JSON.parse(raw);
        roleSlug = String(parsed?.roleSlug || '').trim() || Rolecards.normalizeRoleSlug(parsed?.roleName || '') || '';
      } else {
        const raw = await RNFS.readFile(safePath, 'utf8');
        const parsed = JSON.parse(raw);
        roleSlug = String(parsed?.roleSlug || '').trim() || Rolecards.normalizeRoleSlug(parsed?.roleName || '') || '';
      }
      if (!roleSlug) return null;
      const roleData = await this.readRoleFile(roleSlug);
      if (!roleData) return null;
      return {
        roleSlug,
        roleCardPath: this.getRoleCardPath(roleSlug),
        roleData,
        roleName: roleData.roleName || roleSlug,
      };
    } catch {
      return null;
    }
  };

  getCurrentRoleMemoryTarget = async () => {
    const safeRoleSlug = this.getSpaceRoleKey();
    const roleData = await this.readRoleFile(safeRoleSlug);
    if (!roleData) return null;
    return {
      roleSlug: safeRoleSlug,
      roleCardPath: this.getRoleCardPath(safeRoleSlug),
      roleData,
      roleName: roleData.roleName || safeRoleSlug,
    };
  };

  normalizeMemoryCardText = text => {
    return String(text || '')
      .replace(/\\\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  normalizeMemoryLayerText = text => {
    return this.normalizeMemoryCardText(text)
      .split('\n')
      .map(line => String(line || '').trim())
      .filter(Boolean)
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean)
      .map(line => `- ${line}`)
      .join('\n')
      .trim();
  };

  parseRoleMemoryLayers = text => {
    const normalized = this.normalizeMemoryCardText(text);
    const roleMatch = normalized.match(/^ROLE=(.*)$/m);
    const roleName = String(roleMatch?.[1] || '').trim();
    const sectionValue = name => {
      const pattern = new RegExp(`\\[${name}\\]\\s*([\\s\\S]*?)(?=\\n\\[(?:VERIFIED|LIKELY|FOG)\\]|$)`, 'i');
      const match = normalized.match(pattern);
      return this.normalizeMemoryLayerText(match?.[1] || '');
    };
    return {
      roleName,
      verified: sectionValue('VERIFIED'),
      likely: sectionValue('LIKELY'),
      fog: sectionValue('FOG'),
    };
  };

  composeRoleMemoryCard = (roleName, layers = {}) => {
    const safeRoleName = String(roleName || '').trim() || 'unknown';
    const verified = this.normalizeMemoryLayerText(layers?.verified || '');
    const likely = this.normalizeMemoryLayerText(layers?.likely || '');
    const fog = this.normalizeMemoryLayerText(layers?.fog || '');
    return this.normalizeMemoryCardText([
      `ROLE=${safeRoleName}`,
      '[VERIFIED]',
      verified,
      '',
      '[LIKELY]',
      likely,
      '',
      '[FOG]',
      fog,
    ].join('\n'));
  };

  readTextFileIfExists = async path => {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return '';
      return String((await RNFS.readFile(path, 'utf8')) || '');
    } catch {
      return '';
    }
  };

  buildInitialRoleMemoryFullTextWithLLM = async roleName => {
    const safeRole = String(roleName || '').trim() || 'unknown';
    const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
    const languageInstruction = buildRoleLanguageInstruction(roleLang);
    if (!(!!this.state.llmConfig?.provider && typeof this.callLLMSilent === 'function')) {
      return '';
    }

    const prompt = buildInitialRoleMemoryCardPrompt({
      roleName: safeRole,
      roleLang,
      languageInstruction,
    });

    try {
      return this.normalizeMemoryCardText(await this.callLLMSilent(prompt));
    } catch {
      return '';
    }
  };

  parseDeterministicMemoryCardA = fullText => {
    const normalized = this.normalizeMemoryCardText(fullText);
    const roleName = String((normalized.match(/^ROLE=(.*)$/m) || [])[1] || '').trim();
    const lang = String((normalized.match(/^LANG=(.*)$/m) || [])[1] || '').trim() || 'en';
    const getSection = name => {
      const match = normalized.match(new RegExp(`\\[${name}\\]\\s*([\\s\\S]*?)(?=\\n\\[(?:VERIFIED|LIKELY|FOG|MANIFEST)\\]|$)`, 'i'));
      return String(match?.[1] || '').trim();
    };
    const verifiedLines = getSection('VERIFIED').split('\n').map(s => s.trim()).filter(Boolean);
    const likelyLines = getSection('LIKELY').split('\n').map(s => s.trim()).filter(Boolean);
    const fogLines = getSection('FOG').split('\n').map(s => s.trim()).filter(Boolean);
    const verifiedRecords = verifiedLines.map(line => {
      const m = line.match(/^-\s*V\|([^|]+)\|(.+)$/);
      return m ? { key: String(m[1] || '').trim(), value: String(m[2] || '').trim() } : null;
    }).filter(Boolean);
    const likelyRecords = likelyLines.map(line => {
      const m = line.match(/^-\s*L\|([^|]+)\|([^|]+)\|(.+)$/);
      return m ? { id: String(m[1] || '').trim(), type: String(m[2] || '').trim(), text: String(m[3] || '').trim() } : null;
    }).filter(Boolean);
    const fogRecords = fogLines.map(line => {
      const m = line.match(/^-\s*F\|([^|]+)\|([^|]+)\|(.+)$/);
      return m ? { id: String(m[1] || '').trim(), type: String(m[2] || '').trim(), text: String(m[3] || '').trim() } : null;
    }).filter(Boolean);
    const labelMessages = getRoleLocaleTable(ROLE_UI_MESSAGES, lang);
    const labelFallback = ROLE_UI_MESSAGES.en || {};
    const labelText = key => String(labelMessages[key] || labelFallback[key] || key).trim();
    const labels = {
      origin_world_tag: labelText('defaultMemoryOriginWorldTag'),
      role_function: labelText('defaultMemoryRoleFunction'),
      signature: labelText('defaultMemorySignature'),
      key_relationship: labelText('defaultMemoryKeyRelationship'),
      last_known_scene: labelText('defaultMemoryLastKnownScene'),
      others: labelText('defaultMemoryOthers'),
    };
    const verified = this.normalizeMemoryLayerText(verifiedRecords.map(record => `${labels[record.key] || record.key}: ${record.value}`).join('\n'));
    const likely = this.normalizeMemoryLayerText(likelyRecords.map(record => record.text).join('\n'));
    const fog = this.normalizeMemoryLayerText(fogRecords.map(record => record.text).join('\n'));
    return { roleName, lang, verifiedRecords, likelyRecords, fogRecords, memoryLayers: { verified, likely, fog } };
  };

  parseDeterministicMemoryManifestB = fullText => {
    const normalized = this.normalizeMemoryCardText(fullText);
    const manifestBlock = String((normalized.match(/\[MANIFEST\]\s*([\s\S]*)$/i) || [])[1] || '').trim();
    const lines = manifestBlock.split('\n').map(s => s.trim()).filter(Boolean);
    const map = {};
    lines.forEach(line => {
      const idx = line.indexOf('=');
      if (idx <= 0) return;
      map[line.slice(0, idx)] = line.slice(idx + 1);
    });
    return {
      verifiedKeys: String(map.verified_keys || '').split(',').map(s => s.trim()).filter(Boolean),
      likelyIds: String(map.likely_ids || '').split(',').map(s => s.trim()).filter(Boolean),
      fogIds: String(map.fog_ids || '').split(',').map(s => s.trim()).filter(Boolean),
      verifiedCount: Number(map.verified_count || 0),
      likelyCount: Number(map.likely_count || 0),
      fogCount: Number(map.fog_count || 0),
    };
  };

  validateSplitResultWithRuleB = (parsedA, manifestB) => {
    const requiredVerifiedKeys = ['origin_world_tag', 'role_function', 'signature', 'key_relationship', 'last_known_scene', 'others'];
    const actualVerifiedKeys = parsedA.verifiedRecords.map(record => record.key);
    const actualLikelyIds = parsedA.likelyRecords.map(record => record.id);
    const actualFogIds = parsedA.fogRecords.map(record => record.id);
    const sameSet = (a, b) => a.length === b.length && a.every(item => b.includes(item));
    const pass =
      sameSet(requiredVerifiedKeys, actualVerifiedKeys) &&
      sameSet(manifestB.verifiedKeys, actualVerifiedKeys) &&
      sameSet(manifestB.likelyIds, actualLikelyIds) &&
      sameSet(manifestB.fogIds, actualFogIds) &&
      manifestB.verifiedCount === actualVerifiedKeys.length &&
      manifestB.likelyCount === actualLikelyIds.length &&
      manifestB.fogCount === actualFogIds.length;
    return {
      pass,
      errors: [
        !sameSet(requiredVerifiedKeys, actualVerifiedKeys) ? 'verified_keys_required_mismatch' : '',
        !sameSet(manifestB.verifiedKeys, actualVerifiedKeys) ? 'manifest_verified_mismatch' : '',
        !sameSet(manifestB.likelyIds, actualLikelyIds) ? 'manifest_likely_mismatch' : '',
        !sameSet(manifestB.fogIds, actualFogIds) ? 'manifest_fog_mismatch' : '',
        manifestB.verifiedCount !== actualVerifiedKeys.length ? 'verified_count_mismatch' : '',
        manifestB.likelyCount !== actualLikelyIds.length ? 'likely_count_mismatch' : '',
        manifestB.fogCount !== actualFogIds.length ? 'fog_count_mismatch' : '',
      ].filter(Boolean),
    };
  };

  validateAndRepairRoleLayer = async ({ layer, text }) => {
    const normalized = this.normalizeMemoryLayerText(text);
    if (String(layer || '').toLowerCase() === 'verified' && !normalized) {
      return { pass: false, text: '- unknown', reason: 'verified_empty' };
    }
    return { pass: !!normalized || String(layer || '').toLowerCase() !== 'verified', text: normalized, reason: '' };
  };

  buildValidatedInitialRoleMemory = async roleName => {
    const safeRole = String(roleName || '').trim() || 'unknown';
    const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
    const fallback = buildDefaultRoleMemoryCard(safeRole, roleLang);
    const tryBuild = async fullText => {
      if (!fullText) return { pass: false };
      const parsedA = this.parseDeterministicMemoryCardA(fullText);
      const manifestB = this.parseDeterministicMemoryManifestB(fullText);
      const verdict = this.validateSplitResultWithRuleB(parsedA, manifestB);
      return {
        pass: verdict.pass,
        parsedA,
        manifestB,
        verdict,
      };
    };

    let fullText = await this.buildInitialRoleMemoryFullTextWithLLM(safeRole);
    let result = await tryBuild(fullText);
    let generationStatus = 'validated';
    if (!result.pass) {
      fullText = await this.buildInitialRoleMemoryFullTextWithLLM(safeRole);
      result = await tryBuild(fullText);
      generationStatus = result.pass ? 'validated_retried' : 'fallback';
    }
    if (!result.pass || !result.parsedA) {
      const parsedFallback = this.parseRoleMemoryLayers(fallback);
      return {
        memory: fallback,
        initialMemory: fallback,
        memoryLayers: { verified: parsedFallback.verified, likely: parsedFallback.likely, fog: parsedFallback.fog },
        initialMemoryLayers: { verified: parsedFallback.verified, likely: parsedFallback.likely, fog: parsedFallback.fog },
        generationStatus: 'fallback',
      };
    }
    const layers = result.parsedA.memoryLayers;
    const memory = this.composeRoleMemoryCard(safeRole, layers);
    return {
      memory,
      initialMemory: memory,
      memoryLayers: {
        verified: layers.verified,
        likely: layers.likely,
        fog: layers.fog,
      },
      initialMemoryLayers: {
        verified: layers.verified,
        likely: layers.likely,
        fog: layers.fog,
      },
      generationStatus,
      memoryFormat: 'ROLE_MEMORY_CARD_V2',
      memoryFullText: fullText,
      memoryManifest: result.manifestB,
    };
  };

  buildInitialRoleMemoryCardWithLLM = async roleName => {
    const built = await this.buildValidatedInitialRoleMemory(roleName);
    return String(built?.memory || buildDefaultRoleMemoryCard(String(roleName || '').trim() || 'unknown', this.getRoleLangCode?.() || this.state.roleLangCode || 'en'));
  };

  isRoleMemoryLanguageValid = (text, roleLang) => {
    const normalized = this.normalizeMemoryCardText(text);
    if (!normalized || !normalized.includes('ROLE=') || !normalized.includes('[VERIFIED]')) {
      return false;
    }
    if (roleLang === 'en') {
      return /Origin World Tag|Role Function|Key Relationship|Last Known Scene|Others/.test(normalized);
    }
    if (roleLang === 'zh-cn') {
      return /\u8d77\u6e90\u4e16\u754c\u6807\u7b7e|\u89d2\u8272\u804c\u80fd|\u5173\u952e\u5173\u7cfb|\u6700\u540e\u5df2\u77e5\u573a\u666f|\u5176\u4ed6/.test(normalized);
    }
    return true;
  };

  waitRoleSummonRitualDelay = (delayMs = 1000) => new Promise(resolve => setTimeout(resolve, delayMs));

  waitAfterRoleSummonLoading = async (minDelayMs = 2000) => {
    const elapsed = Date.now() - Number(this.lastRoleSummonLoadingAt || 0);
    const remaining = Math.max(0, minDelayMs - elapsed);
    if (remaining > 0) {
      await this.waitRoleSummonRitualDelay(remaining);
    }
  };

  waitAfterRoleSummonSuccess = async (delayMs = 1000) => {
    await this.waitRoleSummonRitualDelay(delayMs);
  };

  replyRoleSummonRitual = async (roleName = '') => {
    this.replyFromAgent(this.getRoleUiText('summonSystemCall'), { _useSatoshiAvatar: true });
    await this.waitRoleSummonRitualDelay(1000);
    this.replyFromAgent(this.getRoleUiText('summonLoading'), { _useSatoshiAvatar: true });
    this.lastRoleSummonLoadingAt = Date.now();
    const normalizedRoleName = String(roleName || '').trim();
    if (normalizedRoleName) {
      await this.waitAfterRoleSummonLoading(2000);
      this.replyFromAgent(this.buildRoleSummonSuccessMessage(normalizedRoleName), { _useSatoshiAvatar: true });
      await this.waitAfterRoleSummonSuccess(1000);
    }
  };

  getRoleMemoryFilesSignature = async roleSlug => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || this.getSpaceRoleKey()) || this.getSpaceRoleKey();
    const roleDir = this.getRoleDirPath(safeRoleSlug);
    const paths = ['role.json', 'verified.md', 'likely.md', 'fog.md'].map(name => `${roleDir}/${name}`);
    const parts = [`lang:${this.getRoleLangCode?.() || this.state.roleLangCode || ''}`];
    for (const path of paths) {
      try {
        const exists = await RNFS.exists(path);
        if (!exists) {
          parts.push(`${path}:missing`);
          continue;
        }
        const stat = await RNFS.stat(path);
        const mtime = stat?.mtime ? new Date(stat.mtime).getTime() : 0;
        parts.push(`${path}:${Number(stat?.size || 0)}:${mtime}`);
      } catch {
        parts.push(`${path}:error`);
      }
    }
    return parts.join('|');
  };

  getRoleLanguageFilePath = roleSlug => `${this.getRoleDirPath(roleSlug)}/role_language.json`;

  writeRoleLanguageFile = async (roleSlug, code) => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || this.getSpaceRoleKey()) || this.getSpaceRoleKey();
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      const path = this.getRoleLanguageFilePath(safeRoleSlug);
      const tmpPath = `${path}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await RNFS.writeFile(tmpPath, JSON.stringify({ code: normalizeStoryLangCode(code || 'en'), updatedAt: Date.now() }, null, 2), 'utf8');
      if (await RNFS.exists(path)) await RNFS.unlink(path);
      await RNFS.moveFile(tmpPath, path);
      return true;
    } catch (error) {
      console.warn('Failed to write role language file', { roleSlug: safeRoleSlug, error });
      return false;
    }
  };

  getRecentRoleLanguageFileChangeSignature = async (roleSlug, windowMs = 10000) => {
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || this.getSpaceRoleKey()) || this.getSpaceRoleKey();
    const path = this.getRoleLanguageFilePath(safeRoleSlug);
    try {
      if (!(await RNFS.exists(path))) return '';
      const stat = await RNFS.stat(path);
      const mtime = stat?.mtime ? new Date(stat.mtime).getTime() : 0;
      const ctime = stat?.ctime ? new Date(stat.ctime).getTime() : 0;
      const changedAt = Math.max(mtime || 0, ctime || 0);
      const now = Date.now();
      if (changedAt > 0 && now - changedAt >= 0 && now - changedAt <= windowMs) {
        return `${path}:${Number(stat?.size || 0)}:${changedAt}`;
      }
    } catch {}
    return '';
  };

  markRoleSummonRitualMemoryBaseline = async roleSlug => {
    // Creation/random summon paths call this after their own ritual. Keep a light in-memory marker only;
    // normal Role entry must not trigger from stale baselines.
    const safeRoleSlug = Rolecards.normalizeRoleSlug(roleSlug || this.getSpaceRoleKey()) || this.getSpaceRoleKey();
    const signature = await this.getRoleMemoryFilesSignature(safeRoleSlug);
    this.roleSummonRitualMemorySignatures = {
      ...(this.roleSummonRitualMemorySignatures || {}),
      [safeRoleSlug]: signature,
    };
    return signature;
  };

  ensureRoleSummonRitualFreshBeforeLLM = async () => {
    if (this.chatScope !== 'role' || this.isPureChatMode()) return false;
    const active = await this.getCurrentSummonedRoleData();
    const roleSlug = Rolecards.normalizeRoleSlug(active?.roleSlug || this.activeRoleSlug || this.state.activeRoleSlug || this.getSpaceRoleKey()) || this.getSpaceRoleKey();
    const roleName = String(active?.roleName || active?.roleData?.roleName || roleSlug).trim();
    if (!roleSlug || !roleName) return false;
    const recentSignature = await this.getRecentRoleLanguageFileChangeSignature(roleSlug, 10000);
    if (!recentSignature) return false;
    const lastEmitted = this.lastRoleRecentRitualSignature?.[roleSlug];
    if (lastEmitted === recentSignature) return false;
    await this.replyRoleSummonRitual(roleName);
    this.lastRoleRecentRitualSignature = {
      ...(this.lastRoleRecentRitualSignature || {}),
      [roleSlug]: recentSignature,
    };
    return true;
  };

  handleRoleCallWithName = async (name, userMessage = null, opts = {}) => {
    this.forceScrollToBottomOnce = true;
    this.shouldScrollToEnd = true;
    const normalizedName = String(name || '').trim();
    if (!opts?.isContinue) {
      await this.replyRoleSummonRitual();
    }
    const roleSlug = this.getSpaceRoleKey();
    const now = Date.now();
    const existingRoleData = await this.readRoleFile(roleSlug);
    const wasNewRole = !existingRoleData;
    let roleData = existingRoleData;
    if (!roleData) {
      const initialMemoryBundle = await this.buildValidatedInitialRoleMemory(normalizedName || roleSlug);
      const normalizedInitialMemory = this.normalizeMemoryCardText(initialMemoryBundle?.memory || '');
      roleData = {
        roleName: normalizedName || roleSlug,
        roleSlug,
        memory: normalizedInitialMemory,
        initialMemory: this.normalizeMemoryCardText(initialMemoryBundle?.initialMemory || normalizedInitialMemory),
        memoryLayers: initialMemoryBundle?.memoryLayers,
        initialMemoryLayers: initialMemoryBundle?.initialMemoryLayers,
        generationStatus: initialMemoryBundle?.generationStatus || 'validated',
        memorySeed: initialMemoryBundle?.memorySeed || null,
        createdAt: now,
      };
    }
    roleData.roleName = roleData.roleName || normalizedName || roleSlug;
    roleData.roleSlug = roleSlug;
    roleData.memory = this.normalizeMemoryCardText(roleData.memory);
    roleData.initialMemory = this.normalizeMemoryCardText(roleData.initialMemory || roleData.memory);
    roleData.updatedAt = now;
    const writeOk = await this.writeRoleFile(roleSlug, roleData);
    const readBack = writeOk ? await this.readRoleFile(roleSlug) : null;
    if (!writeOk || !readBack) {
      return;
    }
    await this.upsertRoleIndexEntry({ roleName: roleData.roleName, roleSlug, updatedAt: now });
    await this.saveLastSelectedRole(roleData.roleName);
    await this.saveActiveRoleState(roleData.roleName, roleSlug);
    await this.saveCurrentSummonedRole(roleData.roleName, roleSlug);

    this.activeRoleSlug = roleSlug;
    await new Promise(resolve => this.setState({ activeRoleSlug: roleSlug }, resolve));

    const first = await this.loadLocalRoleCardsPage(0);
    await new Promise(resolve => this.setState({ roleCardOffset: 0, roleCardPage: first.items }, resolve));

    const roleModelStatus = await this.ensureRoleModelReady({ source: this.roleEntrySource || 'role' });
    if (!roleModelStatus?.ok) {
      return;
    }

    if (!opts?.isContinue) {
      await this.waitAfterRoleSummonLoading(2000);
      this.replyFromAgent(this.buildRoleSummonSuccessMessage(roleData.roleName), { _useSatoshiAvatar: true });
      await this.waitAfterRoleSummonSuccess(1000);
      await this.markRoleSummonRitualMemoryBaseline(roleSlug);
      if (!this.isPureChatMode()) {
        await this.handleTriggers('/role menu', null);
      }
      if (wasNewRole) {
        try {
          await this.writeRoleRecoveryBaseline(roleSlug);
        } catch (error) {
          console.warn('Failed to write recovery baseline', { roleSlug, error });
        }
      }
      await this.handleTriggers('/role chat', null);
      return;
    }

    const ctx = typeof this.resolveNamespaceContext === 'function' ? this.resolveNamespaceContext() : null;
    const agentId = ctx?.agentId || this.agentId || 'unknown';
    const roleLang = this.getRoleLangCode() || 'en';
    const alphaOverride = await this.readRoleAlphaForPrompt();
    const rolePrompt = buildRoleChatPrompt(roleData.roleName, agentId, roleData.memory || '', roleLang, {
      isContinue: !!opts?.isContinue,
      alphaOverride,
    });

    await this.replyFromLLM(rolePrompt, userMessage, { silentUser: true });

    this.forceScrollToBottomOnce = true;
    this.shouldScrollToEnd = true;
    setTimeout(() => {
      if (!this._isMounted) return;
      this.forceScrollToBottomOnce = true;
      this.scrollToBottomOffset(false);
      requestAnimationFrame(() => this.scrollToBottomOffset(false));
    }, 80);
  };

  handleRoleSuggestWithName = async (name, userMessage = null) => {
    const original = String(name || '').trim();
    const containsOriginal = (candidateName, originalName) => {
      const a = String(candidateName || '').toLowerCase();
      const b = String(originalName || '')
        .toLowerCase()
        .trim();
      if (!b) return true;
      return a.includes(b);
    };
    if (!original) {
      await new Promise(resolve => this.setState({ pendingRoleCall: true }, resolve));
      return;
    }

    const hasLLM = !!this.state.llmConfig?.provider && typeof this.callLLMSilent === 'function';
    if (!hasLLM) {
      await this.handleRoleCallWithName(original, userMessage);
      return;
    }

    await new Promise(resolve =>
      this.setState(
        {
          pendingRoleSuggest: true,
          pendingRoleSuggestOriginal: original,
          pendingRoleSuggestOptions: [],
        },
        resolve,
      ),
    );

    const prompt = buildRoleResolverPrompt({ inputName: original });

    let raw = '';
    try {
      raw = await this.callLLMSilent(prompt);
    } catch (error) {
      raw = '';
    }

    let options = [];
    try {
      const parsed = JSON.parse(String(raw || '').trim());
      if (parsed && Array.isArray(parsed.options)) {
        options = parsed.options.map(item => ({
          name: String(item?.name || '').trim(),
        }));
      }
    } catch {}

    options = options.filter(o => o.name && containsOriginal(o.name, original));

    if (!options.length) {
      options = [{ name: original }];
    }

    const seen = new Set();
    const cleaned = [];
    options.forEach(option => {
      const key = option.name.toLowerCase();
      if (!seen.has(key) && cleaned.length < 6) {
        seen.add(key);
        cleaned.push(option);
      }
    });

    await new Promise(resolve =>
      this.setState(
        {
          pendingRoleSuggestOptions: cleaned,
        },
        resolve,
      ),
    );
    this.replyFromAgent(this.buildRoleSuggestMenuMessage(original, cleaned));
  };

  buildRoleSuggestMenuMessage = (original, options) => {
    const lines = [];
    lines.push(this.getRoleUiText('summonableRoles'));
    lines.push('');

    options.forEach(option => {
      const nameBtn = `[[/role summon ${option.name}|${option.name}]]`;
      lines.push(nameBtn);
      lines.push('');
    });

    const directName = String(original || '').trim();
    lines.push(`[[${directName ? `/role create ${directName}` : '/role new'}|${this.getRoleUiText('useNameDirectly')}]]`);
    lines.push('');
    lines.push(`[[/role new|${this.getRoleUiText('reselect')}]]`);
    return lines.join('\n');
  };

  buildRoleSummonSuccessMessage = roleName => {
    return this.getRoleUiText('roleSummonedSuccess', { name: String(roleName || '').trim() });
  };

  buildRoleMemoryQuickConsoleMessage = () => buildRoleMemoryQuickConsoleMessageHelper({
    getRoleUiText: this.getRoleUiText,
  });

  buildMemoryLanguageMenuMessage = () => buildMemoryLanguageMenuMessageHelper({
    getRoleUiText: this.getRoleUiText,
  });

  inferMemoryAdjustIntent = text => {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const upper = raw.toUpperCase();
    let layer = null;
    if (/^V\b/.test(upper)) layer = 'VERIFIED';
    else if (/^L\b/.test(upper)) layer = 'LIKELY';
    else if (/^F\b/.test(upper)) layer = 'FOG';

    let action = null;
    if (/[\u589e\u52a0\u65b0\u589e\u52a0\u5165ADD]/i.test(raw)) action = 'add';
    else if (/[\u5220\u9664\u53bb\u6389\u79fb\u9664DELETE]/i.test(raw)) action = 'delete';
    else if (/[\u4fee\u6539\u6539\u6210\u66ff\u6362EDIT]/i.test(raw)) action = 'edit';

    const content = raw
      .replace(/^[VLFvlf]\s*/, '')
      .replace(/^(\u8bb0\u5fc6)?\s*(\u589e\u52a0|\u65b0\u589e|\u52a0\u5165|\u4fee\u6539|\u6539\u6210|\u66ff\u6362|\u5220\u9664|\u53bb\u6389|\u79fb\u9664|add|edit|delete)\s*/i, '')
      .trim();

    return {
      layer: layer || 'VERIFIED',
      action: action || 'edit',
      content: content || raw,
      raw,
    };
  };

  getMemoryLayerLabel = layer => getMemoryLayerLabelHelper({
    layer,
    getRoleUiText: this.getRoleUiText,
  });

  getMemoryActionLabel = action => getMemoryActionLabelHelper({
    action,
    getRoleUiText: this.getRoleUiText,
  });

  buildMemoryAdjustConfirmMessage = draft => buildMemoryAdjustConfirmMessageHelper({
    draft,
    getRoleUiText: this.getRoleUiText,
  });

  buildRoleMemoryCardMessage = roleRef => buildRoleMemoryCardMessageHelper({
    roleRef,
    normalizeMemoryCardText: this.normalizeMemoryCardText,
    getRoleUiText: this.getRoleUiText,
  });

  buildAwakeningJourneyMessage = (roleRef, summary) => {
    const roleSlug = String(roleRef?.roleSlug || roleRef?.roleData?.roleSlug || roleRef?.roleName || '').trim();
    const normalized = normalizeConversationSummary(summary || {}, roleSlug);
    const editCmd = roleSlug ? `/role s ${roleSlug}` : '/role s';
    const historyCmd = roleSlug ? `/summary talk ${roleSlug}` : '/summary talk';
    const cloneCmd = roleSlug ? `/role summary clone ${roleSlug}` : '/role summary clone';
    const snapshotCmd = roleSlug ? `/role snapshot ${roleSlug}` : '/role snapshot';
    const exportCmd = roleSlug ? `/role export ${roleSlug}` : '/role export';
    const importCmd = roleSlug ? `/role import ${roleSlug}` : '/role import';
    const lines = [this.getRoleUiText('awakeningJourneyTitle')];
    if (!normalized.facts.length && !normalized.open_loops.length && !normalized.recent_arc.length) {
      lines.push(this.getRoleUiText('awakeningJourneyEmpty'));
    } else {
      lines.push('');
      lines.push(this.getRoleUiText('awakeningFactsTitle'));
      if (normalized.facts.length) normalized.facts.forEach(item => lines.push(`- ${item}`));
      else lines.push(this.getRoleUiText('empty'));
      lines.push('');
      lines.push(this.getRoleUiText('awakeningOpenLoopsTitle'));
      if (normalized.open_loops.length) normalized.open_loops.forEach(item => lines.push(`- ${item}`));
      else lines.push(this.getRoleUiText('empty'));
      lines.push('');
      lines.push(this.getRoleUiText('awakeningRecentArcTitle'));
      if (normalized.recent_arc.length) normalized.recent_arc.forEach(item => lines.push(`- ${item}`));
      else lines.push(this.getRoleUiText('empty'));
    }
    lines.push('');
    lines.push(`[[${editCmd}|${this.getRoleUiText('editAwakeningJourney')}]]`);
    lines.push('');
    lines.push(`[[${historyCmd}|${this.getRoleUiText('viewHistoryRecords')}]]`);
    lines.push('');
    lines.push(`[[${cloneCmd}|${this.getRoleUiText('cloneMemory')}]]`);
    lines.push('');
    lines.push(`[[${snapshotCmd}|${this.getRoleUiText('memorySnapshot')}]]`);
    lines.push('');
    lines.push(`[[${exportCmd}|${this.getRoleUiText('exportRecord')}]]`);
    lines.push('');
    lines.push(`[[${importCmd}|${this.getRoleUiText('importRecord')}]]`);
    lines.push('');
    lines.push(`[[/role memory|${this.getRoleUiText('back')}]]`);
    return lines.join('\n');
  };

  rewriteConversationSummaryFromUserRequest = async (roleSlug, requestText) => {
    const safeRoleSlug = String(roleSlug || '').trim();
    if (!safeRoleSlug) {
      throw new Error('missing role slug');
    }
    const summary = await this.readConversationSummary(safeRoleSlug);
    const roleRef = await this.getRoleDataBySlug(safeRoleSlug);
    const roleName = String(roleRef?.roleData?.roleName || roleRef?.roleName || safeRoleSlug).trim() || safeRoleSlug;
    if (!this.state.llmConfig?.provider || typeof this.callLLMSilent !== 'function') {
      throw new Error('llm unavailable');
    }
    const prompt = buildConversationSummaryRewritePrompt({
      roleName,
      summary,
      requestText,
    });
    const raw = await this.callLLMSilent(prompt, { skipRoleContext: true });
    const parsed = JSON.parse(String(raw || '').trim());
    const nextSummary = normalizeConversationSummary({
      ...summary,
      roleSlug: safeRoleSlug,
      updatedAt: Date.now(),
      summaryEpoch: Number(summary.summaryEpoch || 0) + 1,
      facts: Array.isArray(parsed?.facts) ? parsed.facts : (summary.facts || []),
      open_loops: Array.isArray(parsed?.open_loops) ? parsed.open_loops : (summary.open_loops || []),
      recent_arc: Array.isArray(parsed?.recent_arc) ? parsed.recent_arc : (summary.recent_arc || []),
    }, safeRoleSlug);
    const ok = await this.writeConversationSummary(safeRoleSlug, nextSummary);
    if (!ok) {
      throw new Error('write failed');
    }
    return nextSummary;
  };

  getRoleMemoryLayerShortCode = layer => getRoleMemoryLayerShortCodeHelper(layer);

  buildRoleMemoryRecoverMenuMessage = async roleRef => buildRoleMemoryRecoverMenuMessageHelper({
    roleRef,
    getRoleUiText: this.getRoleUiText,
    getSpaceRoleKey: this.getSpaceRoleKey,
    getRoleInitialMemoryStatus: this.getRoleInitialMemoryStatus,
    getRoleLastMemoryStatus: this.getRoleLastMemoryStatus,
  });

  buildRoleEditLayerChoiceMessage = roleRef => buildRoleEditLayerChoiceMessageHelper({
    roleRef,
    getRoleUiText: this.getRoleUiText,
  });


  buildRoleMemoryFullConsoleMessage = roleRef => buildRoleMemoryFullConsoleMessageHelper({
    roleRef,
    getRoleUiText: this.getRoleUiText,
  });

  runRoleMemoryUpdate = async (roleSlug, assistantReplyText) => {
    if (!roleSlug || !assistantReplyText || typeof this.callLLMSilent !== 'function') {
      return;
    }

    const roleData = (await this.readRoleFile(roleSlug)) || {};
    const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
    const parsedCurrentLayers = this.parseRoleMemoryLayers(roleData.memory || '');
    const currentLayers = {
      verified: this.normalizeMemoryLayerText(roleData.memoryLayers?.verified || parsedCurrentLayers.verified || ''),
      likely: this.normalizeMemoryLayerText(roleData.memoryLayers?.likely || parsedCurrentLayers.likely || ''),
      fog: this.normalizeMemoryLayerText(roleData.memoryLayers?.fog || parsedCurrentLayers.fog || ''),
    };

    for (const layer of ['likely', 'fog']) {
      const currentText = currentLayers[layer] || '';
      const prompt = buildMemoryLayerUpdatePrompt({
        roleName: roleData.roleName || roleSlug,
        layer,
        currentLayerText: currentText,
        assistantReplyText,
      });
      try {
        const raw = await this.callLLMSilent(prompt);
        const cleaned = this.normalizeMemoryLayerText(raw || currentText);
        const repaired = await this.validateAndRepairRoleLayer({
          roleName: roleData.roleName || roleSlug,
          roleLang,
          layer,
          text: cleaned,
          request: assistantReplyText,
        });
        currentLayers[layer] = repaired.text;
      } catch {}
    }

    await this.writeRoleLastMemory(roleSlug, { roleData, kind: 'before-auto-update', trigger: 'runRoleMemoryUpdate' });
    roleData.memoryLayers = currentLayers;
    roleData.memory = this.composeRoleMemoryCard(roleData.roleName || roleSlug, currentLayers);
    roleData.updatedAt = Date.now();
    await this.writeRoleFile(roleSlug, roleData);
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

  sanitizeMessageForList = (message, index = 0, dateKey = 'unknown') => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return null;
    }
    if (message.hidden === true) {
      return null;
    }

    const timestamp = Number(message.timestamp || message.t || message.ts || 0) || 0;
    const rawId = message.id || message.messageId || message.requestId || message?.ref?.rawId || '';
    const id = String(rawId || `msg-${dateKey}-${index}-${timestamp || 'no-ts'}`);
    const text = ensureRenderableText(message.text ?? message.content ?? '', `message.${dateKey}.${index}.text`);
    const digest = message.digest == null ? message.digest : ensureRenderableText(message.digest, `message.${dateKey}.${index}.digest`);
    const summary = message.summary == null ? message.summary : ensureRenderableText(message.summary, `message.${dateKey}.${index}.summary`);
    const copyText = message.copyText == null ? message.copyText : ensureRenderableText(message.copyText, `message.${dateKey}.${index}.copyText`);
    const linkLabel = message.linkLabel == null ? message.linkLabel : ensureRenderableText(message.linkLabel, `message.${dateKey}.${index}.linkLabel`);
    const hasRenderableContent = Boolean(
      String(text || '').trim() ||
      String(digest || '').trim() ||
      String(summary || '').trim() ||
      String(copyText || '').trim() ||
      String(linkLabel || '').trim(),
    );

    if (!hasRenderableContent && !message.pending) {
      return null;
    }

    const next = {
      ...message,
      id,
      text,
    };
    if (digest != null) next.digest = digest;
    if (summary != null) next.summary = summary;
    if (copyText != null) next.copyText = copyText;
    if (linkLabel != null) next.linkLabel = linkLabel;
    if (!next.timestamp && timestamp) {
      next.timestamp = timestamp;
    }

    const sender = String(next.sender || '').trim().toLowerCase();
    const role = String(next.role || '').trim().toLowerCase();
    const direction = String(next.direction || next.side || '').trim().toLowerCase();
    const isExplicitUserSide =
      next.isUser === true ||
      next.user === true ||
      direction === 'out' ||
      direction === 'outgoing';
    if (sender === 'assistant') {
      next.sender = 'agent';
    } else if (sender === 'user' || sender === 'agent') {
      next.sender = sender;
    } else if (!sender && (role === 'user' || role === 'agent' || role === 'assistant')) {
      next.sender = role === 'assistant' ? 'agent' : role;
    } else if (!sender && isExplicitUserSide) {
      next.sender = 'user';
    } else if (!sender) {
      next.sender = 'agent';
    }

    return next;
  };

  sanitizeMessagesForList = (messages = [], dateKey = 'unknown') => (Array.isArray(messages) ? messages : [])
    .map((message, index) => this.sanitizeMessageForList(message, index, dateKey))
    .filter(Boolean);

  readDayMessages = async dateKey => {
    try {
      if (this.isStoryScope) {
        const messages = await readStoryEntriesByDay(this.agentChatDir, dateKey, 'raw');
        const filtered = this.sanitizeMessagesForList(messages, dateKey);
        console.warn('[hist/readDay] scope=story', { dateKey, count: filtered.length, rawCount: Array.isArray(messages) ? messages.length : 0 });
        return filtered;
      }
      const path = this.getDayFilePath(dateKey);
      const exists = await RNFS.exists(path);
      console.warn('[hist/readDay] start', { dateKey, path, exists, scope: this.isStoryScope ? 'story' : 'role' });
      if (!exists) {
        return [];
      }
      const raw = await RNFS.readFile(path, 'utf8');
      const json = JSON.parse(raw);
      const messages = Array.isArray(json) ? json : json?.messages || [];
      const filtered = this.sanitizeMessagesForList(messages, dateKey);
      const persistable = this.chatScope === 'role' ? this.filterPersistableMessages(filtered) : filtered;
      console.warn('[hist/readDay] parsed', { dateKey, path, type: Array.isArray(json) ? 'array' : typeof json, count: Array.isArray(messages) ? messages.length : 0, filteredCount: persistable.length });
      return persistable;
    } catch (error) {
      console.warn('[hist/readDay] failed', { dateKey, error: String(error?.message || error) });
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

  sanitizeRoleHistoryMessages = (messages = []) => {
    const safeMessages = this.sanitizeMessagesForList(messages, 'role-history');
    if (this.chatScope !== 'role') {
      return safeMessages;
    }
    const persistableMessages = this.filterPersistableMessages(safeMessages);
    const localizedModelLabel = this.getRoleMenuText('changeModel') || this.getRoleUiText('model') || 'Model';
    return persistableMessages.map(message => {
      const rawText = String(message?.text || '');
      if (!rawText.includes('[[/a list|')) {
        return message;
      }
      return {
        ...message,
        text: rawText.replace(/\[\[\/a\s+list\|[^\]]+\]\]/g, `[[/rolemodel|${localizedModelLabel}]]`),
      };
    });
  };

  readHistory = async () => {
    const history = await this.readHistoryForScope(this.chatScope);
    console.warn('[hist/readHistory] keys', {
      keysCount: Array.isArray(this.allDateKeys) ? this.allDateKeys.length : 0,
      pickedCount: Array.isArray(this.loadedDateKeys) ? this.loadedDateKeys.length : 0,
      pickedKeys: this.loadedDateKeys,
      todayKey: getLocalDateKey(),
      mergedCount: Array.isArray(history) ? history.length : 0,
      scope: this.chatScope,
    });
    console.warn('[hist/readHistory] sanitized', { count: Array.isArray(history) ? history.length : 0 });
    return history;
  };
  shouldHideHistoryText = rawText => shouldHideHistoryText(rawText);
  filterViewHistoryRecords = messages => filterRoleHistoryMessages(messages);
  isReaderExcludedText = raw => isReaderExcludedText(raw);
  estimateStoryBlockHeightForTimestamp = (timestamp, currentHeight, nowTs = Date.now()) => {
    const numericHeight = Number(currentHeight);
    const numericTs = Number(timestamp);
    const numericNowTs = Number(nowTs);
    if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericTs) || !Number.isFinite(numericNowTs)) {
      return null;
    }
    const deltaBlocks = Math.round((numericNowTs - numericTs) / 120000);
    const estimatedHeight = numericHeight - deltaBlocks;
    return Math.max(0, estimatedHeight);
  };

  formatSwitchWorldlineUserMessage = (message, blockContext = null) => {
    const role = String(message?.sender || message?.role || '').trim().toLowerCase() === 'user' ? 'user' : 'agent';
    const rawText = String(message?.text || '');
    if (role !== 'user') {
      return { ...message, sender: role, text: rawText };
    }
    const estimatedHeight = this.estimateStoryBlockHeightForTimestamp(
      message?.timestamp || message?.t || Date.now(),
      blockContext?.currentHeight,
      blockContext?.currentTs,
    );
    return {
      ...message,
      sender: role,
      text: rawText,
      estimatedBlockHeight: estimatedHeight,
      switchWorldlinePrefix: estimatedHeight === null ? '[rewind point unavailable]' : `[rewind point ${estimatedHeight}]`,
    };
  };

  buildViewHistoryReaderBlocks = (messages = [], options = {}) => {
    const source = Array.isArray(messages) ? messages : [];
    const shouldPrefixSwitchWorldlineUserBlocks = !!options?.prefixSwitchWorldlineUserBlocks;
    const blocks = [];
    let skippedInBlock = 0;
    let current = null;
    const getReaderText = message => {
      const role = String(message?.sender || message?.role || '').trim().toLowerCase() === 'user' ? 'user' : 'agent';
      const rawText = String(message?.text || '').trim();
      if (!rawText) {
        return '';
      }
      const prefix = shouldPrefixSwitchWorldlineUserBlocks && role === 'user' ? String(message?.switchWorldlinePrefix || '').trim() : '';
      if (prefix) {
        return rawText ? `${prefix}\n${rawText}`.trim() : prefix;
      }
      return rawText;
    };

    const pushCurrent = () => {
      if (!current || !String(current.text || '').trim()) {
        current = null;
        return;
      }
      blocks.push({
        id: current.id,
        role: current.role,
        text: String(current.text || '').trim(),
        startTs: current.startTs,
        endTs: current.endTs,
      });
      current = null;
    };

    source.forEach((message, index) => {
      const role = String(message?.sender || message?.role || '').trim().toLowerCase() === 'user' ? 'user' : 'agent';
      const rawText = String(message?.text || '').trim();
      const text = getReaderText(message);
      const ts = message?.timestamp || message?.t || Date.now();
      if (!rawText || this.isReaderExcludedText(rawText)) {
        if (rawText) {
          skippedInBlock += 1;
        }
        pushCurrent();
        return;
      }

      if (!current) {
        current = {
          id: message?.id || `history-block-${index}`,
          role,
          text,
          startTs: ts,
          endTs: ts,
        };
        return;
      }

      const sameRole = current.role === role;
      const withinMergeWindow = Math.abs(Number(ts || 0) - Number(current.endTs || 0)) <= 15 * 60 * 1000;
      if (sameRole && withinMergeWindow) {
        current.text = `${current.text}\n\n${text}`;
        current.endTs = ts;
        return;
      }

      pushCurrent();
      current = {
        id: message?.id || `history-block-${index}`,
        role,
        text,
        startTs: ts,
        endTs: ts,
      };
    });

    pushCurrent();
    console.warn('[hist/blocks] result', { sourceCount: source.length, skippedInBlock, blocksCount: blocks.length });
    return blocks;
  };

  estimateHistoryReaderUnits = text => {
    const raw = String(text || '').trim();
    if (!raw) return 0;
    const charsPerLine = 18;
    const lineHeight = 24;
    const paragraphGap = 10;
    return raw
      .split(/\r?\n/)
      .reduce((sum, line) => {
        const len = String(line || '').trim().length;
        const lineCount = Math.max(1, Math.ceil(len / charsPerLine));
        return sum + lineCount * lineHeight + paragraphGap;
      }, 0);
  };

  splitHistoryReaderBlockForScreen = (block, maxUnitsPerPage = 650) => {
    const rawText = String(block?.text || '').trim();
    if (!rawText) return [];
    if (this.estimateHistoryReaderUnits(rawText) <= maxUnitsPerPage) {
      return [{ ...block, text: rawText }];
    }

    const chunks = [];
    let current = '';
    const pushCurrent = () => {
      const text = String(current || '').trim();
      if (!text) return;
      chunks.push({
        ...block,
        id: `${block?.id || 'history-block'}-chunk-${chunks.length}`,
        text,
      });
      current = '';
    };
    const appendPiece = piece => {
      const clean = String(piece || '').trim();
      if (!clean) return;
      const candidate = current ? `${current}\n\n${clean}` : clean;
      if (current && this.estimateHistoryReaderUnits(candidate) > maxUnitsPerPage) {
        pushCurrent();
        current = clean;
        return;
      }
      current = candidate;
    };

    rawText.split(/\n{2,}/).forEach(paragraph => {
      const cleanParagraph = String(paragraph || '').trim();
      if (!cleanParagraph) return;
      if (this.estimateHistoryReaderUnits(cleanParagraph) <= maxUnitsPerPage) {
        appendPiece(cleanParagraph);
        return;
      }

      const sentences = [];
      let sentenceBuffer = '';
      cleanParagraph.split('').forEach(char => {
        sentenceBuffer += char;
        if ('。！？!?；;'.includes(char)) {
          const text = sentenceBuffer.trim();
          if (text) sentences.push(text);
          sentenceBuffer = '';
        }
      });
      if (sentenceBuffer.trim()) {
        sentences.push(sentenceBuffer.trim());
      }
      if (sentences.length <= 1) {
        const chunkSize = Math.max(120, maxUnitsPerPage - 80);
        for (let i = 0; i < cleanParagraph.length; i += chunkSize) {
          appendPiece(cleanParagraph.slice(i, i + chunkSize));
        }
        return;
      }
      sentences.forEach(sentence => appendPiece(sentence));
    });
    pushCurrent();
    return chunks;
  };

  buildHistoryPages = (blocks = [], maxUnitsPerPage = 650, minUnitsPerPage = 360) => {
    const source = Array.isArray(blocks) ? blocks : [];
    const screenBlocks = source.reduce((items, block) => items.concat(this.splitHistoryReaderBlockForScreen(block, maxUnitsPerPage)), []);
    const pages = [];
    let currentPage = [];
    let currentUnits = 0;

    const pushPage = () => {
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentUnits = 0;
      }
    };

    screenBlocks.forEach(block => {
      const blockText = String(block?.text || '').trim();
      if (!blockText) return;
      const estimatedUnits = this.estimateHistoryReaderUnits(blockText) + 18;

      if (currentPage.length === 0) {
        currentPage.push(block);
        currentUnits = estimatedUnits;
        return;
      }

      const wouldOverflow = currentUnits + estimatedUnits > maxUnitsPerPage;
      const pageTooSmallToSplit = currentUnits < minUnitsPerPage;

      if (wouldOverflow && !pageTooSmallToSplit) {
        pushPage();
        currentPage.push(block);
        currentUnits = estimatedUnits;
        return;
      }

      currentPage.push(block);
      currentUnits += estimatedUnits;
    });

    pushPage();
    if ((pages || []).length) {
      const first = pages[0]?.[0];
      const lastPage = pages[pages.length - 1] || [];
      const last = lastPage[lastPage.length - 1];
      console.warn('[hist/pages] order probe', {
        pagesLen: pages.length,
        pagesFirst: first ? { id: first.id, startTs: first.startTs, endTs: first.endTs, role: first.role } : null,
        pagesLast: last ? { id: last.id, startTs: last.startTs, endTs: last.endTs, role: last.role } : null,
        globalSpanFirst: pages[0]?.[0]?.startTs,
        globalSpanLast: lastPage[lastPage.length - 1]?.endTs,
      });
    }
    return pages;
  };

  buildViewHistorySpeechText = (messages = []) => {
    return this.buildViewHistoryReaderBlocks(messages)
      .map(block => String(block?.text || '').trim())
      .filter(Boolean)
      .join('。\n');
  };

  goHistoryPageTo = targetIndex => {
    const pageCount = Array.isArray(this.state.historyPages) ? this.state.historyPages.length : 0;
    if (pageCount <= 0) return;
    const numericIndex = Number(targetIndex);
    if (!Number.isFinite(numericIndex)) return;
    const nextIndex = Math.max(0, Math.min(pageCount - 1, Math.round(numericIndex)));
    this.clearPendingBottomScrolls();
    this.forceScrollToBottomOnce = false;
    this.shouldScrollToEnd = false;
    this._historyPageChanging = true;
    this.setState(
      { historyPageIndex: nextIndex },
      () => this.scrollHistoryReaderToTop(false),
    );
  };

  goHistoryPage = delta => {
    this.goHistoryPageTo((this.state.historyPageIndex || 0) + delta);
  };

  scrollHistoryReaderToTop = (animated = false) => {
    const run = () => {
      try {
        this.listRef?.scrollToOffset?.({ offset: 0, animated });
      } catch {}
    };
    requestAnimationFrame(() => run());
    requestAnimationFrame(() => requestAnimationFrame(() => run()));
    setTimeout(() => run(), 80);
    setTimeout(() => {
      run();
      this._historyPageChanging = false;
    }, 180);
  };

  renderHistoryReaderItem = ({ item }) => {
    const paragraphText = String(item?.text || '').trim();
    if (this._histRenderDebugTs !== this.state.historyPageIndex) {
      console.warn('[hist/render] current page render sample', {
        pageIndex: this.state.historyPageIndex,
        pageLen: (this.state.historyPages[this.state.historyPageIndex] || []).length,
        filtered: {
          role: String(item?.role || ''),
          textLen: String(item?.text || '').length,
          isFiltered: !paragraphText || this.shouldHideHistoryText(paragraphText) || this.isReaderExcludedText(paragraphText),
        },
      });
      this._histRenderDebugTs = this.state.historyPageIndex;
    }
    if (!paragraphText || this.shouldHideHistoryText(paragraphText) || this.isReaderExcludedText(paragraphText)) {
      console.warn('[hist/render] filtered', {
        textLen: String(paragraphText || '').length,
        hide: !paragraphText ? false : this.shouldHideHistoryText(paragraphText),
        readerExcluded: !paragraphText ? false : this.isReaderExcludedText(paragraphText),
      });
      return null;
    }
    const isSwitchWorldlineMode = this.state.isSwitchWorldlineMode;
    const isRewindPoint = isSwitchWorldlineMode && String(item?.role || '').trim().toLowerCase() === 'user' && String(item?.id || '').trim();
    return (
      <View
        style={[
          styles.historyReaderBlock,
          isSwitchWorldlineMode ? styles.warningHistoryReaderBlock : null,
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={paragraphText}
      >
        {isRewindPoint ? (
          <TouchableOpacity
            style={styles.switchWorldlineRewindButton}
            accessibilityRole="button"
            accessibilityLabel={paragraphText}
            onPress={() => this.confirmSwitchWorldlineRewind(item)}
          >
            <Text style={styles.switchWorldlineRewindButtonText}>{paragraphText}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.historyReaderText, isSwitchWorldlineMode ? styles.warningHistoryReaderText : null]}>{paragraphText}</Text>
        )}
      </View>
    );
  };

  handleStopViewHistorySpeak = async () => {
    const tts = NativeModules?.RoleHistoryTts;
    try {
      if (tts && typeof tts.stop === 'function') {
        await tts.stop();
      }
    } catch {}
    this.setState({ isHistorySpeaking: false });
  };

  exitViewHistoryMode = async () => {
    await this.stopRoleSpeech();
    await this.handleStopViewHistorySpeak();
    this.setState({
      isViewHistoryMode: false,
      historyViewMode: null,
      isSwitchWorldlineMode: false,
      historyPageIndex: 0,
      historyPages: [],
      historyReaderBlocks: [],
      historyRawMessages: [],
      switchWorldlineBlockContext: null,
    });
    await this.handleTriggers('/role', null);
  };

  cleanupRoleTtsEventSubscription = () => {
    if (this._roleTtsEventSubscription && typeof this._roleTtsEventSubscription.remove === 'function') {
      this._roleTtsEventSubscription.remove();
    }
    this._roleTtsEventSubscription = null;
  };

  ensureRoleTtsEventSubscription = () => {
    const tts = NativeModules?.RoleHistoryTts;
    if (!tts || this._roleTtsEventSubscription) {
      return;
    }
    try {
      const emitter = new NativeEventEmitter(tts);
      this._roleTtsEventSubscription = emitter.addListener('roleHistoryTtsEvent', async event => {
        const type = String(event?.type || '').trim().toLowerCase();
        const utteranceId = String(event?.utteranceId || '').trim();
        const activeUtteranceId = String(this._activeRoleTtsUtteranceId || '').trim();
        if (!type || !utteranceId || !activeUtteranceId || utteranceId !== activeUtteranceId) {
          return;
        }
        if (type === 'start') {
          return;
        }
        this._activeRoleTtsUtteranceId = null;
        this.setState({ isRoleSpeaking: false, isHistorySpeaking: false });
        if ((type === 'done' || type === 'stop') && this._pendingContinuousAutoListenToken) {
          const speakToken = this._pendingContinuousAutoListenToken;
          this._pendingContinuousAutoListenToken = 0;
          if (!this._isMounted || speakToken !== this._continuousTalkToken) {
            return;
          }
          if (!this.state.isContinuousTalkEnabled) {
            return;
          }
          try {
            await this.startRoleTalkOnce();
          } catch (error) {
            console.warn('[role-speech] auto listen after speech failed', String(error?.message || error || 'role_auto_listen_failed'));
          }
          return;
        }
        this._pendingContinuousAutoListenToken = 0;
      });
    } catch (error) {
      console.warn('[role-speech] failed to subscribe tts events', String(error?.message || error || 'tts_event_subscribe_failed'));
    }
  };

  stopRoleSpeech = async (invalidateToken = true) => {
    if (invalidateToken) {
      this._continuousTalkToken += 1;
    }
    this._pendingContinuousAutoListenToken = 0;
    if (this._continuousTalkTimer) {
      clearTimeout(this._continuousTalkTimer);
      this._continuousTalkTimer = null;
    }
    const tts = NativeModules?.RoleHistoryTts;
    try {
      if (tts && typeof tts.stop === 'function') {
        await tts.stop();
      }
    } catch {}
    this._activeRoleTtsUtteranceId = null;
    this.setState({ isRoleSpeaking: false, isHistorySpeaking: false });
  };

  startRoleSpeechFromText = async text => {
    const tts = NativeModules?.RoleHistoryTts;
    const speakText = String(text || '').trim();
    if (!speakText) return false;
    if (!tts || typeof tts.speak !== 'function') {
      return false;
    }
    this.ensureRoleTtsEventSubscription();
    const speakToken = ++this._continuousTalkToken;
    if (this.state.talkState === ROLE_TALK_STATES.LISTENING) {
      try {
        await this.stopRoleTalkOnce();
      } catch {}
    }
    try {
      await this.stopRoleSpeech(false);
      await new Promise(resolve => this.setState({ isRoleSpeaking: true }, resolve));
      const utteranceId = await tts.speak(speakText);
      this._activeRoleTtsUtteranceId = String(utteranceId || '').trim();
      this._pendingContinuousAutoListenToken = this.state.isContinuousTalkEnabled ? speakToken : 0;
      return true;
    } catch (error) {
      console.warn('[role-speech] speak failed', String(error?.message || error || 'tts_failed'));
      this._activeRoleTtsUtteranceId = null;
      this._pendingContinuousAutoListenToken = 0;
      this.setState({ isRoleSpeaking: false });
      return false;
    }
  };

  handleSpeakViewHistory = async () => {
    const tts = NativeModules?.RoleHistoryTts;
    if (!tts || typeof tts.speak !== 'function') {
      Alert.alert(this.getRoleUiText('fullReadUnavailable'), this.getRoleUiText('fullReadUnavailableBody'));
      return;
    }
    const currentPageBlocks = Array.isArray(this.state.historyPages)
      ? this.state.historyPages[this.state.historyPageIndex] || []
      : [];
    const text = this.buildViewHistorySpeechText(
      currentPageBlocks.length
        ? currentPageBlocks.map(block => ({ text: block?.text, sender: block?.role }))
        : this.state.historyRawMessages,
    );
    if (!text.trim()) {
      Alert.alert(this.getRoleUiText('noReadableContent'));
      return;
    }
    if (this.state.talkState === ROLE_TALK_STATES.LISTENING) {
      try {
        await this.stopRoleTalkOnce();
      } catch {}
    }
    try {
      await new Promise(resolve => this.setState({ isHistorySpeaking: true }, resolve));
      await tts.speak(text);
    } catch (error) {
      Alert.alert(this.getRoleUiText('fullReadFailed'), String(error?.message || error || 'tts_failed'));
      this.setState({ isHistorySpeaking: false });
    }
  };

  openViewHistoryRecords = async (roleSlugArg, options = {}) => {
    try {
      await this.persistQueue;
    } catch {}

    const historyScope = options?.scope === 'story' ? 'story' : this.chatScope;
    const targetRoleSlug = historyScope === 'story'
      ? ''
      : String(
          roleSlugArg ||
          this.state.activeRoleSlug ||
          this.activeRoleSlug ||
          this.state.currentSummonedRole?.roleSlug ||
          ''
        ).trim().toLowerCase();

    const rawHistory = await this.readHistoryForScope(historyScope);
    const scopeDateKeys = historyScope === this.chatScope ? this.allDateKeys : this._storyHistoryDateKeys;
    const keysForWindow = (scopeDateKeys || []).slice(0, historyScope === 'role' ? 7 : 1);
    const fallbackWindowMs = historyScope === 'role' ? 3 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
    const fallbackCutoffTs = Date.now() - fallbackWindowMs;

    const inMemoryCandidates = historyScope === 'story'
      ? []
      : (Array.isArray(this.state.allMessages) ? this.state.allMessages : [])
          .filter(item => !item?.pending)
          .filter(item => {
            const ts = Number(item?.timestamp || item?.t || 0);
            if (!ts) return false;
            if (!keysForWindow.length) {
              return ts >= fallbackCutoffTs;
            }
            const key = getLocalDateKey(ts);
            return keysForWindow.includes(key) || ts >= fallbackCutoffTs;
          });

    const dedupedHistory = [];
    const seen = new Set();
    const pick = msg => {
      if (!msg) return;
      const id = msg.id;
      if (id) {
        if (seen.has(id)) return;
        seen.add(id);
      }
      dedupedHistory.push(msg);
    };

    const inferMessageRoleSlug = msg => {
      const explicit = String(msg?._roleSlug || msg?.roleSlug || msg?.role || '').trim().toLowerCase();
      if (explicit && explicit !== 'user' && explicit !== 'agent' && explicit !== 'assistant') {
        return explicit;
      }
      const text = String(msg?.text || '').trim();
      const roleEq = text.match(/^\u8bb0\u5fc6：\s*\n?ROLE=([^\n\r]+)/i) || text.match(/^ROLE=([^\n\r]+)/i);
      if (roleEq && roleEq[1]) {
        return String(roleEq[1]).trim().toLowerCase();
      }
      const summaryCmd = /\[\[\/summary\s+talk\s+([^|\]\s]+).*?\]\]/i.exec(text);
      if (summaryCmd && summaryCmd[1]) {
        return String(summaryCmd[1]).trim().toLowerCase();
      }
      const importExportCmd = /\[\[\/role\s+(?:export|import|s)\s+([^|\]\s]+).*?\]\]/i.exec(text);
      if (importExportCmd && importExportCmd[1]) {
        return String(importExportCmd[1]).trim().toLowerCase();
      }
      const rawSummaryCmd = /^\/summary\s+talk\s+(.+)$/i.exec(text);
      if (rawSummaryCmd && rawSummaryCmd[1]) {
        return String(rawSummaryCmd[1]).trim().toLowerCase();
      }
      return '';
    };

    const merged = [...rawHistory, ...inMemoryCandidates]
      .slice()
      .sort((a, b) => Number(a?.timestamp || a?.t || 0) - Number(b?.timestamp || b?.t || 0));
    merged.forEach(pick);

    const scopedHistory = !targetRoleSlug
      ? dedupedHistory
      : dedupedHistory.filter(msg => {
          const inferred = inferMessageRoleSlug(msg);
          if (inferred) {
            return inferred === targetRoleSlug;
          }
          const text = String(msg?.text || '').trim();
          if (!text) return false;
          if (String(msg?.sender || '').trim().toLowerCase() === 'user') {
            return !/^\//.test(text);
          }
          if (String(msg?.sender || '').trim().toLowerCase() === 'agent') {
            return true;
          }
          return false;
        });

    const cleanedHistory = historyScope === 'story' ? scopedHistory : this.filterViewHistoryRecords(scopedHistory);
    console.warn('[hist/open] counts', {
      targetRoleSlug,
      rawHistory: rawHistory.length,
      keysForWindow,
      inMemoryCount: inMemoryCandidates.length,
      dedupedCount: dedupedHistory.length,
      scopedCount: scopedHistory.length,
      cleanedCount: cleanedHistory.length,
      scopedSample: scopedHistory.slice(0, 6).map(item => ({
        sender: item?.sender,
        roleSlug: inferMessageRoleSlug(item),
        text: String(item?.text || '').slice(0, 80),
      })),
    });
    const historyBlocks = this.buildViewHistoryReaderBlocks(cleanedHistory);
    const historyPages = this.buildHistoryPages(historyBlocks);
    console.warn('[hist/open] blocks/pages', {
      targetRoleSlug,
      blocksCount: historyBlocks.length,
      pageCount: historyPages.length,
      pageLens: historyPages.map(page => page.length),
      mergedSample: historyBlocks.slice(0, 3).map(item => ({ id: item?.id, role: item?.role, textLen: String(item?.text || '').length })),
    });
    const latestPageIndex = Math.max(0, historyPages.length - 1);
    const ts = arr => {
      const first = arr?.[0] || null;
      const last = arr?.[arr.length - 1] || null;
      return {
        len: arr?.length || 0,
        firstTs: first ? Number(first.startTs || first.endTs || 0) : 0,
        lastTs: last ? Number(last.endTs || last.startTs || 0) : 0,
        firstRole: first?.role || '',
        lastRole: last?.role || '',
      };
    };
    console.warn('[hist/open] pageIndex decision', {
      pagesLen: historyPages.length,
      latestPageIndex,
      firstPageLen: (historyPages[0] || []).length,
      lastPageLen: (historyPages[historyPages.length - 1] || []).length,
    });
    console.warn('[hist/open] first vs latest page spans', {
      first: ts(historyPages[0]),
      latest: ts(historyPages[Math.max(0, historyPages.length - 1)] || []),
    });
    console.warn('[hist/open] time direction', {
      mergedCount: merged.length,
      mergedFirstTs: merged[0]?.timestamp || 0,
      mergedLastTs: merged[merged.length - 1]?.timestamp || 0,
      cleanedCount: cleanedHistory.length,
      cleanedFirstTs: cleanedHistory[0]?.timestamp || 0,
      cleanedLastTs: cleanedHistory[cleanedHistory.length - 1]?.timestamp || 0,
      isAscending: (merged?.length || 0) > 1 ? Number(merged[0].timestamp || 0) <= Number(merged[merged.length - 1].timestamp || 0) : true,
    });
    const firstPage = historyPages[latestPageIndex] || [];
    const visibleCount = Math.min(firstPage.length || PAGE_SIZE, PAGE_SIZE);
    await new Promise(resolve =>
      this.setState(
        {
          visibleCount,
          inputValue: '',
          isViewHistoryMode: true,
          isHistorySpeaking: false,
          historyPageIndex: latestPageIndex,
          historyPages,
          historyReaderBlocks: historyBlocks,
          historyRawMessages: cleanedHistory,
        },
        resolve,
      ),
    );
    this.forceScrollToBottomOnce = true;
    requestAnimationFrame(() => this.scrollToBottomOffset(false));
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

  flushPersistQueue = async (reason = 'unknown') => {
    const startedAt = Date.now();
    try {
      await this.persistQueue;
      const elapsed = Date.now() - startedAt;
      console.warn('[persist] queue flushed', { reason, elapsed });
      return true;
    } catch (error) {
      console.warn('[persist] queue flush failed', { reason, error: String(error?.message || error) });
      return false;
    }
  };

  writeDayMessages = async (dateKey, messages) => {
    const startedAt = Date.now();
    const path = this.isStoryScope ? this.getStoryRawPath(dateKey) : this.getDayFilePath(dateKey);
    try {
      let payload = messages;
      if (this.isStoryScope) {
        payload = messages.filter(message => getLocalDateKey(message.timestamp) === dateKey);
      } else {
        payload = this.filterPersistableMessages(messages);
      }
      const text = JSON.stringify(payload);
      console.warn('[persist] write begin', {
        scope: this.isStoryScope ? 'story' : 'role',
        dateKey,
        path,
        count: Array.isArray(payload) ? payload.length : 0,
        bytes: text.length,
      });
      await RNFS.writeFile(path, text, 'utf8');
      const verify = await RNFS.readFile(path, 'utf8');
      const parsed = JSON.parse(verify);
      const verifiedCount = Array.isArray(parsed) ? parsed.length : 0;
      console.warn('[persist] write success', {
        dateKey,
        path,
        expectedCount: Array.isArray(payload) ? payload.length : 0,
        verifiedCount,
        elapsed: Date.now() - startedAt,
      });
      return true;
    } catch (error) {
      console.warn('[persist] write failed', {
        dateKey,
        path,
        error: String(error?.message || error),
        elapsed: Date.now() - startedAt,
      });
      throw error;
    }
  };

  persistMessageByDay = async (dateKey, allMessagesInMemory) => {
    const inMemoryDayMessages = this.filterPersistableMessages((Array.isArray(allMessagesInMemory) ? allMessagesInMemory : []).filter(message => getLocalDateKey(message.timestamp) === dateKey));
    const requestAt = Date.now();
    console.warn('[persist] enqueue', {
      dateKey,
      candidateCount: Array.isArray(allMessagesInMemory) ? allMessagesInMemory.length : 0,
      filteredCount: Array.isArray(inMemoryDayMessages) ? inMemoryDayMessages.length : 0,
      requestAt,
    });
    this.persistQueue = this.persistQueue
      .then(async () => {
        if (this.chatScope !== 'role') {
          return this.writeDayMessages(dateKey, inMemoryDayMessages);
        }
        const existingDayMessages = this.filterPersistableMessages(await this.readDayMessages(dateKey));
        const mergedMap = new Map();
        [...(Array.isArray(existingDayMessages) ? existingDayMessages : []), ...inMemoryDayMessages].forEach(message => {
          const timestamp = Number(message?.timestamp || 0) || Date.now();
          const text = String(message?.text || '').trim();
          const sender = String(message?.sender || '').trim().toLowerCase() || 'agent';
          if (!text) return;
          const id = String(message?.id || '');
          const key = id || `${timestamp}|${sender}|${text}`;
          mergedMap.set(key, {
            ...message,
            id: id || key,
            text,
            sender,
            timestamp,
          });
        });
        const mergedMessages = Array.from(mergedMap.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
        return this.writeDayMessages(dateKey, mergedMessages);
      })
      .then(() => {
        console.warn('[persist] flush segment complete', {
          dateKey,
          requestAt,
          elapsed: Date.now() - requestAt,
        });
      })
      .catch(error => {
        console.warn('[persist] segment failed', { dateKey, error: String(error?.message || error) });
      });
    return this.persistQueue;
  };
  shouldPersistRoleMessage = message => shouldPersistRoleMessage(message, { chatScope: this.chatScope });

  filterPersistableMessages = messages => filterPersistableMessages(messages, { chatScope: this.chatScope });

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
    const targetLanguage = getStoryLangLabel(this.getStoryLangCode?.() || normalizeLocale(getCurrentInterfaceLanguage()) || 'en');
    const instruction = buildStoryDigestInstruction({
      isUser,
      targetLanguage,
    });

    const cfg = this.state.llmConfig || this.currentLLMConfig;
    if (!cfg?.provider) {
      throw new Error('LLM not configured');
    }
    const resolved = await this.resolveProviderDef(cfg.provider);
    if (!resolved) {
      throw new Error('LLM provider missing');
    }
    const providerDef = resolved.def;
    const recent = [{ sender: 'user', text: `Original text:
\n${rawText}` }];
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
    if (!this._isMounted) {
      return;
    }
    const message =
      typeof messageOrText === 'string'
        ? { ...this.buildMessage(messageOrText, sender), ...(extra || {}) }
        : { ...(messageOrText || {}), ...(extra || {}) };

    if (message.sender === 'user' && this.shouldSuppressUserInputRecord(message._modelText || message.text || '')) {
      return;
    }

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
        if (this.chatScope === 'role') {
          this.appendConversationBufferMessage(message);
        }
      },
    );
  };

  appendMessages = messages => {
    if (!this._isMounted) {
      return;
    }
    messages = (messages || []).filter(message => !(message?.sender === 'user' && this.shouldSuppressUserInputRecord(message._modelText || message.text || '')));
    if (!messages.length) return;

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
        if (this.chatScope === 'role' && updated && !String(newText || '').includes('LLM call failed')) {
          this.appendConversationBufferMessage({ ...updated, text: newText, pending: false });
          if (this.state.isAutoVoiceSpeak) {
            this.startRoleSpeechFromText(newText);
          }
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
          await this.sendCommand('/rolemodel check');
          await this.waitForIntroStep(200);
        }

        await this.waitForIntroStep(600);
      }
    } finally {
      this.isPlayingIntro = false;
    }
  };

  shouldSuppressUserInputRecord = text => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return false;

    const roleModelStep = String(this.state.pendingRoleModelStep || '').trim();
    if ((roleModelStep === 'builtin_api_key' || roleModelStep === 'custom_api_key') && !trimmed.startsWith('/')) {
      return true;
    }

    if ((this.state.pendingRoleFragmentImport || this.state.pendingRoleStoryFragmentImport || this.state.pendingRoleStoryFragmentAnalyzeConfirm || this.state.pendingDoppelStoryInput) && !trimmed.startsWith('/')) {
      return true;
    }

    const aiSetupStep = String(this.state.pendingAISetupStep || '').trim();
    if (this.state.pendingAISetup && (aiSetupStep === 'builtin_key' || aiSetupStep === 'custom_key') && !trimmed.startsWith('/')) {
      return true;
    }

    if (/^\/a\s+(?:add\s+\S+\s+https?:\/\/\S+\s+\S+|(?:gpt|grok|claude|gemini|deepseek|kimi|qwen|xkeva)\s+\S+)/i.test(trimmed)) {
      return true;
    }

    return false;
  };

  handleSend = async payload => {
    const displayText = String(payload?.displayText ?? this.state.inputValue ?? '');
    const rawInput = displayText.trim();
    const modelText = String(payload?.modelText ?? rawInput).trim();

    if (!modelText) {
      return;
    }

    if (this.state.isRoleSpeaking) {
      await this.stopRoleSpeech();
    }

    if (!rawInput) {
      this.setState({ inputValue: '' });
      try {
        await this.handleTriggers(modelText, null);
      } catch (error) {
        console.warn('AgentRole: handleSend trigger failed', error);
        this.replyFromAgent('Action failed. Please try again.');
      }
      return;
    }

    const suppressUserRecord = this.shouldSuppressUserInputRecord(rawInput) || this.shouldSuppressUserInputRecord(modelText);
    const userMessage = suppressUserRecord ? null : this.buildMessage(rawInput, 'user');
    if (userMessage) {
      userMessage._modelText = modelText;
      userMessage._choiceMeta = payload?.choiceMeta || null;

      this.appendMessage(rawInput, 'user', {
        id: userMessage.id,
        timestamp: userMessage.timestamp,
        _modelText: userMessage._modelText,
        _choiceMeta: userMessage._choiceMeta,
      });
    }

    this.setState({ inputValue: '' });
    try {
      await this.handleTriggers(modelText, userMessage);
    } catch (error) {
      console.warn('AgentRole: handleSend trigger failed', error);
      this.replyFromAgent('Action failed. Please try again.');
    }
  };

  sendCommand = async commandText => {
    const text = normalizeInjectedCommandText(commandText);
    if (!text) {
      return;
    }
    const shouldHideLocalCommand = /^\/r\s+memory\s+confirm\b/i.test(text) || this.shouldSuppressUserInputRecord(text);
    const userMessage = shouldHideLocalCommand ? null : this.buildMessage(text, 'user');
    if (userMessage) {
      this.appendMessage(userMessage);
    }
    this.setState({ inputValue: '' });
    try {
      await this.handleTriggers(text, userMessage);
    } catch (error) {
      console.warn('AgentRole: sendCommand trigger failed', error);
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

    if (/^\/summary\s+talk\b/i.test(trimmed)) {
      const roleSlug = trimmed.replace(/^\/summary\s+talk\b/i, '').trim();
      await this.openViewHistoryRecords(roleSlug);
      return true;
    }

    if (/^\/role\s+export\b/i.test(trimmed)) {
      const roleSlug = trimmed.replace(/^\/role\s+export\b/i, '').trim();
      await this.exportRoleRecord(roleSlug);
      return true;
    }

    if (/^\/role\s+(?:importfragment|importfragments|importfrag)\b/i.test(trimmed) || /^\/role\s+import\s+(?:fragment|fragments|frag)\b/i.test(trimmed)) {
      await this.beginRoleFragmentImport();
      return true;
    }

    if (/^\/role\s+import\b/i.test(trimmed)) {
      await this.importRoleRecord();
      return true;
    }

    if (/^\/role\s+(?:openexport|openstoryexport|openstoryclone|openmemoryclone|copystoryclone|copymemoryclone)\b/i.test(trimmed)) {
      const commandName = (/^\/role\s+(\S+)/i.exec(trimmed)?.[1] || '').toLowerCase();
      const commandPath = trimmed.replace(/^\/role\s+\S+\s*/i, '').trim();
      const rawPath = String(
        commandPath ||
          (commandName === 'openstoryexport'
            ? this._lastExportedStoryRecordPath
            : commandName === 'openstoryclone' || commandName === 'copystoryclone'
              ? this._lastStoryClonePath
              : commandName === 'openmemoryclone' || commandName === 'copymemoryclone'
                ? this._lastMemoryClonePath
                : this._lastExportedRoleRecordPath),
      ).trim();
      if (!rawPath) {
        this.replyFromAgent(this.getRoleUiText('recentExportMissing'));
        return true;
      }
      const normalizedPath = rawPath.replace(/^file:\/\//i, '');
      if (!(await RNFS.exists(normalizedPath).catch(() => false))) {
        this.replyFromAgent(this.getRoleUiText('exportFileMissing'));
        return true;
      }
      if (/^copy/i.test(commandName)) {
        const content = await RNFS.readFile(normalizedPath, 'utf8');
        Clipboard.setString(content);
        showStatus(this.getRoleUiText('copiedToClipboard'), 2000);
        return true;
      }
      await this.openLocalRoleFile(normalizedPath);
      return true;
    }

    if (/^\/r\s+memory\s+regen\b/i.test(trimmed)) {
      const roleSlug = this.state.pendingMemoryRoleSlug || this.state.pendingMemoryAdjustDraft?.roleSlug;
      const roleData = roleSlug ? await this.readRoleFile(roleSlug) : null;
      if (!roleSlug || !roleData) {
        this.replyFromAgent(this.getRoleUiText('memoryAdjustFailed'));
        return true;
      }
      const rebuiltBundle = await this.buildValidatedInitialRoleMemory(roleData.roleName || roleSlug);
      const normalizedRebuilt = this.normalizeMemoryCardText(
        rebuiltBundle?.memory || buildDefaultRoleMemoryCard(roleData.roleName || roleSlug, this.getRoleLangCode?.() || this.state.roleLangCode || 'en'),
      );
      await createRoleMemorySnapshot(this, { roleSlug, roleData, meta: { kind: 'before-regen', trigger: '/r memory regen' } });
      roleData.memory = normalizedRebuilt;
      roleData.initialMemory = this.normalizeMemoryCardText(roleData.initialMemory || rebuiltBundle?.initialMemory || normalizedRebuilt);
      roleData.memoryLayers = rebuiltBundle?.memoryLayers;
      roleData.initialMemoryLayers = roleData.initialMemoryLayers || rebuiltBundle?.initialMemoryLayers;
      roleData.generationStatus = rebuiltBundle?.generationStatus || 'validated';
      roleData.memorySeed = rebuiltBundle?.memorySeed || null;
      roleData.updatedAt = Date.now();
      await this.writeRoleFile(roleSlug, roleData);
      await new Promise(resolve =>
        this.setState({ pendingMemoryAdjust: true, pendingMemoryRoleSlug: roleSlug, pendingMemoryAdjustDraft: null, pendingMemoryAdjustLayer: null }, resolve),
      );
      await this.handleTriggers('/role edit', null);
      return true;
    }

    if (/^\/r\s+memory\s+keep\b/i.test(trimmed)) {
      const roleSlug = this.state.pendingMemoryRoleSlug || this.state.pendingMemoryAdjustDraft?.roleSlug;
      if (!roleSlug) {
        this.replyFromAgent(this.getRoleUiText('memoryAdjustFailed'));
        return true;
      }
      await new Promise(resolve =>
        this.setState({ pendingMemoryAdjust: true, pendingMemoryRoleSlug: roleSlug, pendingMemoryAdjustDraft: null, pendingMemoryAdjustLayer: null }, resolve),
      );
      this.replyFromAgent([
        this.getRoleUiText('askAdjustMemory'),
        this.getRoleUiText('describeAdjustMemory'),
        this.getRoleUiText('verifiedExplain'),
        this.getRoleUiText('likelyExplain'),
        this.getRoleUiText('fogExplain'),
      ].join('\n'));
      return true;
    }

    if (/^\/r\s+memory\s+confirm\b/i.test(trimmed)) {
      let draft = this.state.pendingMemoryAdjustDraft;
      if (!draft?.roleSlug) {
        const encoded = trimmed.replace(/^\/r\s+memory\s+confirm\b/i, '').trim();
        if (encoded) {
          try {
            draft = JSON.parse(decodeURIComponent(encoded));
          } catch {}
        }
      }
      if (!draft?.roleSlug) {
        this.replyFromAgent(this.getRoleUiText('memoryAdjustFailed'));
        return true;
      }

      const roleData = await this.readRoleFile(draft.roleSlug);
      if (!roleData) {
        await new Promise(resolve => this.setState({ pendingMemoryAdjustDraft: null }, resolve));
        this.replyFromAgent(this.getRoleUiText('memoryAdjustFailed'));
        return true;
      }

      this.replyFromAgent(this.getRoleUiText('memoryUpdating'));

      const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
      const parsedCurrentLayers = this.parseRoleMemoryLayers(roleData.memory || '');
      const currentLayers = {
        verified: this.normalizeMemoryLayerText(roleData.memoryLayers?.verified || parsedCurrentLayers.verified || ''),
        likely: this.normalizeMemoryLayerText(roleData.memoryLayers?.likely || parsedCurrentLayers.likely || ''),
        fog: this.normalizeMemoryLayerText(roleData.memoryLayers?.fog || parsedCurrentLayers.fog || ''),
      };
      const stableInitialLayers = {
        verified: this.normalizeMemoryLayerText(roleData.initialMemoryLayers?.verified || ''),
        likely: this.normalizeMemoryLayerText(roleData.initialMemoryLayers?.likely || ''),
        fog: this.normalizeMemoryLayerText(roleData.initialMemoryLayers?.fog || ''),
      };
      const targetLayer = String(draft.layer || 'VERIFIED').trim().toLowerCase();
      let nextLayerText = currentLayers[targetLayer] || '';

      if (!!this.state.llmConfig?.provider && typeof this.callLLMSilent === 'function') {
        const prompt = buildMemoryLayerEditPrompt({
          roleName: roleData.roleName || draft.roleSlug || 'unknown',
          layer: draft.layer || 'VERIFIED',
          currentLayerText: nextLayerText,
          requestText: draft.raw || draft.content || '',
        });
        try {
          const raw = await this.callLLMSilent(prompt);
          const cleaned = this.normalizeMemoryLayerText(raw);
          if (cleaned) nextLayerText = cleaned;
        } catch {}
      } else {
        this.replyFromAgent(this.getRoleUiText('memoryAdjustNeedsLlm'));
      }

      const repairedLayer = await this.validateAndRepairRoleLayer({
        roleName: roleData.roleName || draft.roleSlug,
        roleLang,
        layer: targetLayer,
        text: nextLayerText,
        request: draft.raw || draft.content || '',
      });

      currentLayers[targetLayer] = repairedLayer.text;
      roleData.memoryLayers = currentLayers;
      roleData.initialMemoryLayers = stableInitialLayers;
      await createRoleMemorySnapshot(this, { roleSlug: draft.roleSlug, roleData, meta: { kind: 'before-edit', trigger: '/r memory confirm' } });
      roleData.memory = this.composeRoleMemoryCard(roleData.roleName || draft.roleSlug, currentLayers);
      roleData.initialMemory = this.composeRoleMemoryCard(roleData.roleName || draft.roleSlug, stableInitialLayers);
      roleData.roleSlug = roleData.roleSlug || draft.roleSlug;
      roleData.roleName = String(roleData.roleName || draft.roleSlug).trim();
      roleData.updatedAt = Date.now();

      const afterSnapshot = buildRoleSnapshot({
        kind: 'memory-edit',
        roleSlug: draft.roleSlug,
        roleName: roleData.roleName || draft.roleSlug,
        agentId: this.agentId,
        roleData,
        capturedAt: Date.now(),
        source: { kind: 'memory-edit', trigger: '/r memory confirm' },
        state: {
          roleLangCode: this.getRoleLangCode?.() || this.state?.roleLangCode || 'en',
        },
        conversationSummary: await this.readConversationSummary(draft.roleSlug),
        conversationBuffer: await this.readConversationBuffer(draft.roleSlug),
      });
      await this.applyRoleSnapshot(afterSnapshot);
      const refreshedCards = await this.loadLocalRoleCardsPage(0);
      await new Promise(resolve => this.setState({ roleCardOffset: 0, roleCardPage: refreshedCards.items }, resolve));
      await new Promise(resolve =>
        this.setState({
          activeRoleSlug: draft.roleSlug,
          pendingMemoryAdjust: false,
          pendingMemoryRoleSlug: null,
          pendingMemoryAdjustDraft: null,
          pendingMemoryAdjustLayer: null,
        }, resolve),
      );

      this.replyFromAgent(this.getRoleUiText('memoryUpdated'));
      await this.handleTriggers('/role memory', null);
      return true;
    }

    if (this.state.pendingMemoryAdjust && trimmed.startsWith('/')) {
      const allowWhileAdjusting = /^\/(?:role\s+(?:edit|[vlf])\b|r\s+memory\s+(?:adjust|regen|keep|confirm)\b)/i.test(trimmed);
      if (!allowWhileAdjusting) {
        await new Promise(resolve =>
          this.setState({ pendingMemoryAdjust: false, pendingMemoryRoleSlug: null, pendingMemoryAdjustDraft: null, pendingMemoryAdjustLayer: null }, resolve),
        );
        this.replyFromAgent(this.getRoleUiText('memoryAdjustCancelled'));
      }
    }

    if (this.state.pendingMemoryAdjust && userMessage) {
      const adjustText = String(trimmed || '').trim();

      if (adjustText && !adjustText.startsWith('/')) {
        const roleSlug = this.state.pendingMemoryRoleSlug;
        const roleData = roleSlug ? await this.readRoleFile(roleSlug) : null;

        if (!roleSlug || !roleData) {
          await new Promise(resolve =>
            this.setState({ pendingMemoryAdjust: false, pendingMemoryRoleSlug: null, pendingMemoryAdjustDraft: null, pendingMemoryAdjustLayer: null }, resolve),
          );
          this.replyFromAgent(this.getRoleUiText('memoryAdjustFailed'));
          return true;
        }

        const selectedLayer = normalizeRoleMemoryLayerKey(this.state.pendingMemoryAdjustLayer || this.state.pendingMemoryAdjustDraft?.layer || '');
        if (selectedLayer) {
          await this.handleTriggers(`/role ${this.getRoleMemoryLayerShortCode(selectedLayer)} ${roleSlug} ${adjustText}`, userMessage);
          return true;
        }

        const draft = { ...this.inferMemoryAdjustIntent(adjustText), roleSlug };
        await new Promise(resolve =>
          this.setState({ pendingMemoryAdjustDraft: draft }, resolve),
        );
        this.replyFromAgent(this.buildMemoryAdjustConfirmMessage(draft));
        return true;
      }
    }

    if (this.state.pendingDoppelMemoryInput && trimmed.startsWith('/')) {
      await new Promise(resolve => this.setState({ pendingDoppelMemoryInput: false, pendingDoppelMemoryDraft: null }, resolve));
      this.replyFromAgent(this.getRoleUiText('doppelMemoryCancelled') || '(doppel memory cancelled)');
    }

    if (this.state.pendingDoppelMemoryInput && userMessage && !trimmed.startsWith('/')) {
      const inputId = normalizeDoppelMemoryId(trimmed);
      if (!inputId) {
        this.replyFromAgent(this.getRoleUiText('doppelMemoryEmpty') || 'Please enter an ID.');
        return true;
      }
      this.replyFromAgent(this.getRoleUiText('doppelMemoryReading') || 'Reading doppel memory…');
      try {
        const draft = await fetchDoppelOnChainMemory({ BlueElectrum, rawId: inputId });
        if (!draft?.hasAnyMemory) {
          await new Promise(resolve => this.setState({ pendingDoppelMemoryInput: false, pendingDoppelMemoryDraft: null }, resolve));
          this.replyFromAgent(this.getRoleUiText('doppelRestoreFailed') || '(doppel memory restore failed)');
          return true;
        }
        await new Promise(resolve => this.setState({ pendingDoppelMemoryInput: false, pendingDoppelMemoryDraft: draft }, resolve));
        this.replyFromAgent(this.buildDoppelMemoryConfirmMessage(draft));
      } catch (error) {
        console.warn('Failed to read doppel memory', error);
        await new Promise(resolve => this.setState({ pendingDoppelMemoryInput: false, pendingDoppelMemoryDraft: null }, resolve));
        this.replyFromAgent(this.getRoleUiText('doppelRestoreFailed') || '(doppel memory restore failed)');
      }
      return true;
    }

    if (this.state.pendingRoleModelStep && trimmed.startsWith('/')) {
      await this.clearRoleModelPendingState();
      this.replyFromAgent(this.getRoleUiText('roleModelSetupCancelled'));
    }

    if (this.state.pendingRoleModelStep && !trimmed.startsWith('/')) {
      const value = sanitizeDialogText(trimmed);
      if (!value) {
        this.replyFromAgent(this.getRoleUiText('emptyInput'));
        return true;
      }

      if (this.state.pendingRoleModelStep === 'builtin_api_key') {
        const provider = sanitizeProviderKey(this.state.pendingRoleModelBuiltinProvider);
        if (!provider || !LLM_PROVIDERS[provider]) {
          await this.clearRoleModelPendingState();
          this.replyFromAgent(this.getRoleUiText('builtinProviderNotFound'));
          return true;
        }

        const builtin = (await this.readBuiltinRegistry?.()) || {};
        builtin[provider] = {
          ...(builtin[provider] || {}),
          baseUrl: LLM_PROVIDERS[provider].baseUrl || '',
          apiKey: value,
          model: builtin?.[provider]?.model || LLM_PROVIDERS[provider].defaultModel || 'default',
          updatedAt: Date.now(),
        };
        await this.writeBuiltinRegistry(builtin);
        await this.clearRoleModelPendingState();
        await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
        await this.handleTriggers(`/a ${provider}`, null);
        return true;
      }

      if (this.state.pendingRoleModelStep === 'custom_name') {
        await new Promise(resolve =>
          this.setState(
            {
              pendingRoleModelStep: 'custom_base_url',
              pendingRoleModelCustomName: value,
              pendingRoleModelCustomBaseUrl: '',
            },
            resolve,
          ),
        );
        this.replyFromAgent(this.getRoleUiText('enterBaseUrl'));
        return true;
      }

      if (this.state.pendingRoleModelStep === 'custom_base_url') {
        await new Promise(resolve =>
          this.setState({ pendingRoleModelStep: 'custom_api_key', pendingRoleModelCustomBaseUrl: value }, resolve),
        );
        this.replyFromAgent(this.getRoleUiText('enterApiKey'));
        return true;
      }

      if (this.state.pendingRoleModelStep === 'custom_api_key') {
        const nameRaw = sanitizeDialogText(this.state.pendingRoleModelCustomName);
        const provider = sanitizeProviderKey(nameRaw);
        const baseUrl = sanitizeUrlInput(this.state.pendingRoleModelCustomBaseUrl);
        if (!nameRaw || !provider || !baseUrl) {
          await this.clearRoleModelPendingState();
          this.replyFromAgent(this.getRoleUiText('customModelSetupFailed'));
          return true;
        }

        const custom = (await this.readCustomRegistry?.()) || {};
        custom[provider] = {
          ...(custom[provider] || {}),
          baseUrl,
          apiKey: value,
          model: custom?.[provider]?.model || 'default',
          label: nameRaw,
          updatedAt: Date.now(),
        };
        await this.writeCustomRegistry(custom);
        await this.clearRoleModelPendingState();
        await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
        await this.handleTriggers(`/a ${provider}`, null);
        return true;
      }
    }

    const apiUrlMatch = trimmed.match(/^\/rolemodel\s+apiurl\s+([^\s]+)\s*$/i);
    if (apiUrlMatch) {
      await this.openModelApiUsageUrl(apiUrlMatch[1]);
      return true;
    }

    if (/^\/rolemodel\s+apiusage\b/i.test(trimmed)) {
      this.replyFromAgent(this.buildModelApiUsageMessage());
      return true;
    }

    if (/^\/rolemodel\s+remove\b$/i.test(trimmed)) {
      const menu = await this.buildRoleModelRemoveMenuMessage();
      this.replyFromAgent(menu);
      return true;
    }

    if (/^\/rolemodel\s+remove\s+builtin\b/i.test(trimmed)) {
      const provider = trimmed.replace(/^\/rolemodel\s+remove\s+builtin\b/i, '').trim().toLowerCase();
      if (!provider) {
        const menu = await this.buildRoleModelRemoveMenuMessage();
        this.replyFromAgent(menu);
        return true;
      }

      if (provider === 'xkeva') {
        this.replyFromAgent('xkeva is built in.');
        await this.handleTriggers('/role menu', null);
        return true;
      }

      const builtin = (await this.readBuiltinRegistry?.()) || {};
      if (!builtin?.[provider]) {
        this.replyFromAgent(this.getRoleUiText('builtinProviderNotFound'));
        await this.handleTriggers('/role menu', null);
        return true;
      }

      delete builtin[provider];
      await this.writeBuiltinRegistry(builtin);

      const activeProvider = String(this.state.llmConfig?.provider || this.currentLLMConfig?.provider || '')
        .trim()
        .toLowerCase();
      if (activeProvider === provider) {
        await this.writeActiveProvider({ name: '', updatedAt: Date.now() });
        this.currentLLMConfig = null;
        await new Promise(resolve => this.setState({ llmConfig: null }, resolve));
      }

      this.replyFromAgent(`Key removed: ${provider}`);
      await this.handleTriggers('/role menu', null);
      return true;
    }

    if (/^\/rolemodel\s+remove\s+custom\b/i.test(trimmed)) {
      const name = trimmed.replace(/^\/rolemodel\s+remove\s+custom\b/i, '').trim();
      if (!name) {
        const menu = await this.buildRoleModelRemoveMenuMessage();
        this.replyFromAgent(menu);
        return true;
      }

      const provider = String(name || '').toLowerCase();
      const custom = (await this.readCustomRegistry?.()) || {};
      if (!custom?.[provider]) {
        this.replyFromAgent(this.getRoleUiText('customModelNotFound'));
        await this.handleTriggers('/role menu', null);
        return true;
      }

      delete custom[provider];
      await this.writeCustomRegistry(custom);

      const activeProvider = String(this.state.llmConfig?.provider || this.currentLLMConfig?.provider || '')
        .trim()
        .toLowerCase();
      if (activeProvider === provider || activeProvider === `custom:${provider}`) {
        await this.writeActiveProvider({ name: '', updatedAt: Date.now() });
        this.currentLLMConfig = null;
        await new Promise(resolve => this.setState({ llmConfig: null }, resolve));
      }

      this.replyFromAgent(`Custom model removed: ${name}`);
      await this.handleTriggers('/role menu', null);
      return true;
    }

    if (/^\/rolemodel\s+builtin\b/i.test(trimmed)) {
      const provider = trimmed.replace(/^\/rolemodel\s+builtin\b/i, '').trim().toLowerCase();
      if (!provider || !LLM_PROVIDERS[provider]) {
        const menu = await this.buildRoleModelMenuMessage();
        this.replyFromAgent(menu);
        return true;
      }

      const builtin = (await this.readBuiltinRegistry?.()) || {};
      const currentModel = String(this.state.llmConfig?.provider === provider ? (this.state.llmConfig?.model || '') : '').trim();
      const lastUsedModel = String(this.currentLLMConfig?.provider === provider ? (this.currentLLMConfig?.model || '') : '').trim();
      const hasKey = !!String(builtin?.[provider]?.apiKey || '').trim();
      const noKeyRequired = LLM_PROVIDERS[provider]?.noKeyRequired === true;
      const hasSavedModel = !!String(builtin?.[provider]?.model || currentModel || lastUsedModel).trim();
      if (hasKey && hasSavedModel) {
        if (!String(builtin?.[provider]?.model || '').trim() && (currentModel || lastUsedModel)) {
          builtin[provider] = { ...(builtin[provider] || {}), model: (currentModel || lastUsedModel) };
          await this.writeBuiltinRegistry?.(builtin);
        }
      }
      if (provider === 'xkeva' && noKeyRequired) {
        const selected = await this.activateRoleModelProvider(provider);
        if (!selected) return true;
        this.replyFromAgent('Model selected: xkeva');
        if (typeof this.appendRoleCommandMessage === 'function') {
          this.appendRoleCommandMessage('/role');
        }
        await new Promise(resolve =>
          this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve),
        );
        await this.handleTriggers('/role', null);
        return true;
      }

      if (hasKey || noKeyRequired) {
        await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
        await this.handleTriggers(`/a ${provider}`, null);
        return true;
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingRoleModelStep: 'builtin_api_key',
            pendingRoleModelBuiltinProvider: provider,
            pendingRoleModelCustomName: '',
            pendingRoleModelCustomBaseUrl: '',
          },
          resolve,
        ),
      );
      this.replyFromAgent(`Enter API key for ${provider}:`);
      return true;
    }

    if (/^\/rolemodel\s+custom\b/i.test(trimmed)) {
      const rawName = trimmed.replace(/^\/rolemodel\s+custom\b/i, '').trim();
      if (!rawName) {
        const menu = await this.buildRoleModelCustomMenuMessage();
        this.replyFromAgent(menu);
        return true;
      }

      if (/^new$/i.test(rawName)) {
        await new Promise(resolve =>
          this.setState(
            {
              pendingRoleModelStep: 'custom_name',
              pendingRoleModelBuiltinProvider: '',
              pendingRoleModelCustomName: '',
              pendingRoleModelCustomBaseUrl: '',
            },
            resolve,
          ),
        );
        this.replyFromAgent(this.getRoleUiText('enterCustomModelName'));
        return true;
      }

      const provider = rawName.toLowerCase();
      const custom = (await this.readCustomRegistry?.()) || {};
      if (custom?.[provider]) {
        const currentModel = String(this.state.llmConfig?.provider === provider ? (this.state.llmConfig?.model || '') : '').trim();
        const lastUsedModel = String(this.currentLLMConfig?.provider === provider ? (this.currentLLMConfig?.model || '') : '').trim();
        const hasKey = !!String(custom?.[provider]?.apiKey || '').trim();
        const hasSavedModel = !!String(custom?.[provider]?.model || currentModel || lastUsedModel).trim();
        if (hasKey && hasSavedModel) {
          if (!String(custom?.[provider]?.model || '').trim() && (currentModel || lastUsedModel)) {
            custom[provider] = { ...(custom[provider] || {}), model: (currentModel || lastUsedModel) };
            await this.writeCustomRegistry?.(custom);
          }
        }
        if (hasKey) {
          await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
          await this.handleTriggers(`/a ${provider}`, null);
          return true;
        }
        await new Promise(resolve =>
          this.setState(
            {
              pendingRoleModelStep: 'custom_api_key',
              pendingRoleModelBuiltinProvider: '',
              pendingRoleModelCustomName: rawName,
              pendingRoleModelCustomBaseUrl: String(custom?.[provider]?.baseUrl || '').trim(),
            },
            resolve,
          ),
        );
        this.replyFromAgent(this.getRoleUiText('enterApiKey'));
        return true;
      }

      const menu = await this.buildRoleModelCustomMenuMessage();
      this.replyFromAgent(menu);
      return true;
    }

    if (/^\/rolemodel\s+check\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
      await this.runRoleModelCheck({ source: this.roleEntrySource || 'role', showSuccess: true });
      return true;
    }

    if (/^\/rolemodel\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
      await this.startRoleModelSetup();
      return true;
    }

    if (this.state.pendingRoleFragmentImport) {
      await new Promise(resolve => this.setState({ pendingRoleFragmentImport: false }, resolve));
      if (!trimmed.startsWith('/')) {
        await this.importRoleFragment(trimmed);
        return true;
      }
    }

    if (this.state.pendingRoleStoryFragmentImport) {
      await new Promise(resolve => this.setState({ pendingRoleStoryFragmentImport: false }, resolve));
      if (!trimmed.startsWith('/')) {
        await this.confirmRoleStoryFragmentAnalyze(trimmed);
        return true;
      }
    }

    if (/^\/role\s+story\s+fragment\s+analyze\s+yes\b/i.test(trimmed)) {
      const fragmentText = String(this.state.pendingRoleStoryFragmentText || '').trim();
      await new Promise(resolve => this.setState({ pendingRoleStoryFragmentAnalyzeConfirm: false, pendingRoleStoryFragmentText: '' }, resolve));
      if (fragmentText) {
        await this.importRoleStoryFragment(fragmentText);
      } else {
        this.replyFromAgentLocal(this.getRoleUiText('importStoryFragmentEmpty') || 'Please enter some text first.');
        await this.beginRoleStoryFragmentImport();
      }
      return true;
    }

    if (/^\/role\s+story\s+fragment\s+analyze\s+no\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ pendingRoleStoryFragmentAnalyzeConfirm: false, pendingRoleStoryFragmentText: '' }, resolve));
      this.replyFromAgentLocal(this.getRoleUiText('storyFragmentAnalyzeCancelled') || '(story fragment analysis cancelled)');
      return true;
    }

    if (/^\/role\s+story\s+fragment\s+explore\s+yes\b/i.test(trimmed)) {
      const storySeed = this.state.pendingRoleStoryFragmentSeed;
      await new Promise(resolve => this.setState({ pendingRoleStoryFragmentExplore: false, pendingRoleStoryFragmentSeed: null }, resolve));
      if (storySeed?.premise) {
        await this.openImportedRoleStoryFragment(storySeed);
      } else {
        this.replyFromAgentLocal(this.getRoleUiText('importStoryFragmentFailed', { error: 'empty_seed' }) || 'Story fragment import failed: empty_seed');
      }
      return true;
    }

    if (/^\/role\s+story\s+fragment\s+explore\s+no\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ pendingRoleStoryFragmentExplore: false, pendingRoleStoryFragmentSeed: null }, resolve));
      this.replyFromAgentLocal(this.getRoleUiText('storyFragmentExploreCancelled') || '(story exploration cancelled)');
      return true;
    }

    if (this.state.pendingDoppelStoryInput) {
      await new Promise(resolve => this.setState({ pendingDoppelStoryInput: false }, resolve));
      if (!trimmed.startsWith('/')) {
        await this.importDoppelOnChainStorySummary(trimmed);
        return true;
      }
      this.replyFromAgentLocal(this.getRoleUiText('doppelStoryCancelled') || '(doppel story cancelled)');
    }

    if (this.state.pendingRoleCall && !trimmed.startsWith('/')) {
      const name = trimmed.trim();
      await new Promise(resolve => this.setState({ pendingRoleCall: false }, resolve));
      const existingRoleData = await this.readRoleFile(this.getSpaceRoleKey());
      if (existingRoleData) {
        await this.handleRoleCallWithName(name, userMessage);
      } else {
        await this.handleRoleSuggestWithName(name, userMessage);
      }
      return true;
    }

    if (/^\/role\s+lang\s+check\b/i.test(trimmed)) {
      const status = await this.runRoleLangCheck({ showSuccess: true });
      if (!status?.ok) {
        return true;
      }
      return true;
    }

    if (/^\/role\s+lang\s+list\b/i.test(trimmed)) {
      this.appendRoleCommandMessage(this.getRoleLangMenuMessage());
      return true;
    }

    if (/^\/role\s+lang\b/i.test(trimmed)) {
      const args = trimmed.replace(/^\/role\s+lang\b/i, '').trim();
      if (!args) {
        this.appendRoleCommandMessage(this.getRoleLangMenuMessage());
        return true;
      }
      if (/^list\b/i.test(args)) {
        this.appendRoleCommandMessage(this.getRoleLangMenuMessage());
        return true;
      }

      const normalizedArg = normalizeStoryLangCode(args);
      if (normalizedArg === 'other' || normalizedArg === 'more') {
        this.appendRoleCommandMessage(this.getRoleMoreLangMenuMessage());
        return true;
      }

      const isSupported = STORY_SUPPORTED_LANGS.some(item => item.code === normalizedArg);
      if (!isSupported) {
        showStatus(this.getRoleMenuText('unsupportedLang', { code: args }), 2000);
        this.appendRoleCommandMessage(this.getRoleLangMenuMessage());
        return true;
      }

      await this.setRoleLangCode(normalizedArg);
      if (!this.isPureChatMode()) {
        this.appendRoleCommandMessage(this.buildRoleLangStatusMessage());
        await this.handleTriggers('/role', null);
      }
      return true;
    }

    if (/^\/role\s+cards\s+start\b/i.test(trimmed)) {
      await this.handleTriggers('/role cards', null);
      return true;
    }

    if (/^\/role\s+cards\b/i.test(trimmed)) {
      const selected = await this.getCurrentSummonedRoleData();
      if (!selected?.roleName) {
        await this.handleTriggers('/role new', null);
        return true;
      }
      this.replyFromAgent(this.buildLocalRoleCardsMessage([selected], 0, false));
      return true;
    }

    if (/^\/role\s+morecards\b/i.test(trimmed)) {
      await this.handleTriggers('/role cards', null);
      return true;
    }

    if (/^\/role\s+menu\b/i.test(trimmed)) {
      this.replyFromAgent(await this.buildRoleMenuMessage());
      return true;
    }

    if (/^\/role\s+story\s+(?:open|new|continue)\b/i.test(trimmed)) {
      await this.openRoleStorySpace();
      return true;
    }

    if (/^\/role\s+story\s+(?:importfragment|fragment)\b/i.test(trimmed)) {
      await this.beginRoleStoryFragmentImport();
      return true;
    }

    if (/^\/role\s+story\s+onchain\s+local\b/i.test(trimmed)) {
      await this.importLocalOnChainStorySummary();
      return true;
    }

    if (/^\/role\s+story\s+onchain\s+doppel\b/i.test(trimmed)) {
      await this.beginDoppelOnChainStoryImport();
      return true;
    }

    if (/^\/role\s+story\s+onchain\b/i.test(trimmed)) {
      await this.openRoleStoryOnChainMenu();
      return true;
    }

    if (/^\/role\s+story\s+import\b/i.test(trimmed)) {
      await this.importRoleStoryRecord();
      return true;
    }

    if (/^\/role\s+story\s+export\b/i.test(trimmed)) {
      await this.exportRoleStoryRecord();
      return true;
    }

    if (/^\/role\s+story\s+(?:switch-worldline|switch_worldline|worldline)\b/i.test(trimmed)) {
      const hasCurrentStory = await this.hasRoleCurrentStory();
      if (!hasCurrentStory) {
        this.replyFromAgent(await this.buildRoleAdventureRecordsMenuMessage());
        return true;
      }
      await this.openViewCurrentStoryRecords({ viewMode: 'switch-worldline' });
      return true;
    }

    if (/^\/role\s+story\s+(?:clear|delete|reset)\b/i.test(trimmed)) {
      await this.confirmClearRoleStoryRecord();
      return true;
    }

    if (/^\/role\s+story\s+summary\b/i.test(trimmed)) {
      const hasCurrentStory = await this.hasRoleCurrentStory();
      if (!hasCurrentStory) {
        this.replyFromAgent(await this.buildRoleAdventureRecordsMenuMessage());
        return true;
      }
      await this.openRoleStorySummaryRecords();
      return true;
    }

    if (/^\/role\s+story\s+clone\b/i.test(trimmed)) {
      const hasCurrentStory = await this.hasRoleCurrentStory();
      if (!hasCurrentStory) {
        this.replyFromAgent(await this.buildRoleAdventureRecordsMenuMessage());
        return true;
      }
      await this.cloneRoleStoryRecord();
      return true;
    }

    if (/^\/role\s+story\s+snapshot\b/i.test(trimmed)) {
      const rest = trimmed.replace(/^\/role\s+story\s+snapshot\b/i, '').trim();
      const parts = rest.split(/\s+/).filter(Boolean);
      const sub = String(parts[0] || '').toLowerCase();
      try {
        if (!sub) {
          this.replyFromAgent(buildRoleStorySnapshotMenuMessage({ getRoleUiText: this.getRoleUiText }));
          return true;
        }
        if (sub === 'list') {
          this.replyFromAgent(await buildRoleStorySnapshotListMessage(this));
          return true;
        }
        if (sub === 'import') {
          await importRoleStorySnapshot(this, parts[1] || '');
          this.replyFromAgent(this.getRoleUiText('storySnapshotImported') || 'Story snapshot imported.');
          await this.handleTriggers('/role story records', null);
          return true;
        }
        if (sub === 'create') {
          const hasCurrentStory = await this.hasRoleCurrentStory();
          if (!hasCurrentStory) {
            this.replyFromAgent(this.getRoleUiText('storyReaderEmpty') || '(no story content available)');
            return true;
          }
          const result = await createRoleStorySnapshot(this);
          this.replyFromAgent(this.getRoleUiText('storySnapshotCreated', { time: new Date(result.capturedAt).toLocaleString(), path: result.path }) || `Story snapshot created: ${result.path}`);
          this.replyFromAgent(buildRoleStorySnapshotMenuMessage({ getRoleUiText: this.getRoleUiText }));
          return true;
        }
      } catch (error) {
        this.replyFromAgent(this.getRoleUiText('storySnapshotFailed', { error: String(error?.message || error || 'unknown') }) || `Story snapshot failed: ${String(error?.message || error || 'unknown')}`);
        return true;
      }
      this.replyFromAgent(buildRoleStorySnapshotMenuMessage({ getRoleUiText: this.getRoleUiText }));
      return true;
    }

    if (/^\/role\s+story\s+view\s+(?:older|previous|page10)\b/i.test(trimmed)) {
      const hasCurrentStory = await this.hasRoleCurrentStory();
      if (!hasCurrentStory) {
        this.replyFromAgent(await this.buildRoleAdventureRecordsMenuMessage());
        return true;
      }
      await this.openViewCurrentStoryRecords({ viewMode: 'story-view', pageOffsetFromLatest: 1 });
      return true;
    }

    if (/^\/role\s+story\s+view\b/i.test(trimmed)) {
      const hasCurrentStory = await this.hasRoleCurrentStory();
      if (!hasCurrentStory) {
        this.replyFromAgent(await this.buildRoleAdventureRecordsMenuMessage());
        return true;
      }
      await this.openViewCurrentStoryRecords({ viewMode: 'story-view' });
      return true;
    }

    if (/^\/role\s+story\s+records\b/i.test(trimmed)) {
      this.replyFromAgent(await this.buildRoleAdventureRecordsMenuMessage());
      return true;
    }

    if (/^\/role\s+story\b/i.test(trimmed)) {
      this.replyFromAgent(await this.buildRoleStoryMenuMessage());
      return true;
    }

    if (/^\/role\s+talkmenu\b/i.test(trimmed)) {
      this.replyFromAgent(this.buildRoleTalkMenuMessage());
      return true;
    }

    if (/^\/role\s+chat\b/i.test(trimmed)) {
      const selected = await this.getCurrentSummonedRoleData();
      if (!selected?.roleName) {
        return true;
      }

      await this.handleTriggers('/r continue', null);
      return true;
    }

    if (/^\/role\s+summon\b/i.test(trimmed)) {
      const name = trimmed.replace(/^\/role\s+summon\b/i, '').trim();
      if (!name) {
        await this.handleTriggers('/role new', null);
        return true;
      }
      await this.handleRoleCallWithName(name, userMessage);
      return true;
    }

    if (/^\/role\s+create\b/i.test(trimmed)) {
      const name = trimmed.replace(/^\/role\s+create\b/i, '').trim();
      if (!name) {
        await this.handleTriggers('/role new', null);
        return true;
      }
      const roleSlug = this.getSpaceRoleKey();
      const now = Date.now();
      const existingRoleData = await this.readRoleFile(roleSlug);
      if (!existingRoleData) {
        const writeOk = await this.writeRoleFile(roleSlug, {
          roleName: name,
          roleSlug,
          memory: '',
          initialMemory: '',
          createdAt: now,
          updatedAt: now,
        });
        const readBack = writeOk ? await this.readRoleFile(roleSlug) : null;
        if (!writeOk || !readBack) {
          this.replyFromAgent('(role create failed)');
          return true;
        }
      }
      await this.upsertRoleIndexEntry({ roleName: name, roleSlug, updatedAt: now });
      await this.finalizeRoleActivation({ name, roleSlug, refreshedCards: null, clearDuplicate: true });
      return true;
    }

    if (/^\/role\s+voice\s+on\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ isAutoVoiceSpeak: true }, resolve));
      await this.handleTriggers('/role', null);
      return true;
    }

    if (/^\/role\s+voice\s+off\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ isAutoVoiceSpeak: false }, resolve));
      await this.handleTriggers('/role', null);
      return true;
    }

    if (/^\/role\s+talk\s+status\b/i.test(trimmed)) {
      const statusText = this.getRoleTalkStatusText() || this.getRoleUiText('roleTalkDisabled');
      const autoText = `${this.getRoleUiText('autoVoice')}：${this.state.isAutoVoiceSpeak ? `🟩 ${this.getRoleUiText('toggleOn')}` : `🟥 ${this.getRoleUiText('toggleOff')}`}`;
      const liveText = `${this.getRoleUiText('liveVoice')}：${this.state.isContinuousTalkEnabled ? `🟩 ${this.getRoleUiText('toggleOn')}` : `🟥 ${this.getRoleUiText('toggleOff')}`}`;
      this.replyFromAgent([statusText, autoText, liveText].filter(Boolean).join('\n'));
      return true;
    }

    if (/^\/role\s+talk\s+off\b/i.test(trimmed)) {
      await this.stopRoleSpeech();
      await this.stopRoleTalkOnce().catch(() => {});
      this._continuousTalkToken += 1;
      if (this._continuousTalkTimer) {
        clearTimeout(this._continuousTalkTimer);
        this._continuousTalkTimer = null;
      }
      await new Promise(resolve => this.setState({ isContinuousTalkEnabled: false }, resolve));
      await this.handleTriggers('/role', null);
      return true;
    }

    if (/^\/role\s+talk\s+on\b/i.test(trimmed)) {
      const ok = await this.enableRoleTalk();
      if (ok) {
        await this.stopRoleSpeech();
        await new Promise(resolve => this.setState({
          isContinuousTalkEnabled: true,
          isAutoVoiceSpeak: true,
        }, resolve));
        await this.handleTriggers('/role', null);
      }
      return true;
    }

    if (/^\/role\s+new\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ pendingRoleCall: true }, resolve));
      this.replyFromAgent(this.buildRoleSummonPromptMessage(), { _useSatoshiAvatar: true });
      return true;
    }

    if (/^\/role\s+random\b/i.test(trimmed)) {
      const randomName = await this.generateRandomRoleName();
      await new Promise(resolve => this.setState({ pendingRoleCall: false }, resolve));
      await this.handleTriggers(`/role summon ${randomName}`, null);
      return true;
    }

    if (/^\/role\s+clear\b/i.test(trimmed)) {
      const currentRoleSlug =
        String(this.state.activeRoleSlug || this.activeRoleSlug || this.state.currentSummonedRole?.roleSlug || '').trim() || '';
      await new Promise(resolve =>
        this.setState(
          {
            activeRoleSlug: null,
            lastSelectedRole: null,
            pendingRoleSuggest: false,
            pendingRoleSuggestOriginal: '',
            pendingRoleSuggestOptions: [],
            pendingRoleFragmentImport: false,
            pendingRoleStoryFragmentImport: false,
            pendingRoleCall: false,
            pendingNewRole: null,
          },
          resolve,
        ),
      );
      this.activeRoleSlug = null;
      await this.clearActiveRoleState();
      await this.clearCurrentSummonedRole();
      await this.clearPendingNewRole();
      if (currentRoleSlug) {
        await this.clearConversationBuffer(currentRoleSlug);
        await this.clearConversationSummary(currentRoleSlug);
      }
      await this.handleTriggers('/role cards', null);
      await this.handleTriggers('/role menu', null);
      return true;
    }

    if (/^\/r\s+call\b/i.test(trimmed)) {
      const args = trimmed.replace(/^\/r\s+call\b/i, '').trim();

      if (!args) {
        await this.handleTriggers('/role new', null);
        return true;
      }

      await this.beginRoleCreateConfirmFlow(args);
      return true;
    }


    if (/^\/r\s+select\b/i.test(trimmed)) {
      const selectedName = trimmed.replace(/^\/r\s+select\b/i, '').trim();
      if (!selectedName) {
        await this.handleTriggers('/role cards', null);
        await this.handleTriggers('/role menu', null);
        return true;
      }

      await this.handleTriggers(`/role summon ${selectedName}`, userMessage);
      return true;
    }

    if (/^\/r\s+summon\b/i.test(trimmed)) {
      const picked = trimmed.replace(/^\/r\s+summon\b/i, '').trim();
      const name = picked || '';
      const original = this.state.pendingRoleSuggestOriginal || '';

      await new Promise(resolve =>
        this.setState({ pendingRoleSuggest: false, pendingRoleSuggestOriginal: '', pendingRoleSuggestOptions: [] }, resolve),
      );

      if (!name) {
        if (original) {
          await this.handleTriggers(`/role create ${original}`, userMessage);
        } else {
          await this.handleTriggers('/role new', null);
        }
        return true;
      }

      await this.handleTriggers(`/role summon ${name}`, userMessage);
      return true;
    }

    if (/^\/r\s+useonly\b/i.test(trimmed)) {
      const original = String(this.state.pendingRoleSuggestOriginal || '').trim();
      await new Promise(resolve =>
        this.setState({ pendingRoleSuggest: false, pendingRoleSuggestOriginal: '', pendingRoleSuggestOptions: [] }, resolve),
      );
      if (!original) {
        await this.handleTriggers('/role cards', null);
        await this.handleTriggers('/role menu', null);
        return true;
      }
      await this.handleTriggers(`/role create ${original}`, userMessage);
      return true;
    }

    if (/^\/(?:r|role)\s+card\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      this.replyFromAgent(this.buildRoleMemoryCardMessage(active));
      this.replyFromAgent(this.buildRoleMemoryFullConsoleMessage(active));
      return true;
    }

    if (/^\/r\s+recall\s+adjust\b/i.test(trimmed)) {
      await this.handleTriggers(trimmed.replace(/^\/r\s+recall\s+adjust\b/i, '/role edit'), userMessage);
      return true;
    }

    if (/^\/r\s+recall\b/i.test(trimmed)) {
      await this.handleTriggers('/role memory', userMessage);
      return true;
    }

    if (/^\/role\s+memory\s+rebuild\b/i.test(trimmed)) {
      const roleSlug = this.getSpaceRoleKey();
      const roleData = await this.readRoleFile(roleSlug);
      this.replyFromAgent(await this.buildRoleMemoryRecoverMenuMessage(roleData ? {
        roleSlug,
        roleName: roleData.roleName || roleSlug,
        roleData,
      } : null));
      return true;
    }

    if (/^\/role\s+memory\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      this.replyFromAgent(this.buildRoleMemoryFullConsoleMessage(active));
      return true;
    }

    if (/^\/role\s+summary\s+clone\b/i.test(trimmed) || /^\/r\s+summary\s+clone\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }
      await this.cloneRoleMemoryRecord(active);
      return true;
    }

    if (/^\/role\s+snapshot\b/i.test(trimmed)) {
      const rest = trimmed.replace(/^\/role\s+snapshot\b/i, '').trim();
      const parts = rest.split(/\s+/).filter(Boolean);
      const sub = String(parts[0] || '').toLowerCase();
      try {
        if (!sub) {
          this.replyFromAgent(buildRoleMemorySnapshotMenuMessage({ getRoleUiText: this.getRoleUiText }));
          return true;
        }
        if (sub === 'list') {
          this.replyFromAgent(await buildRoleMemorySnapshotListMessage(this, null));
          return true;
        }
        if (sub === 'import') {
          await importRoleMemorySnapshot(this, null, parts[1] || '');
          this.replyFromAgent(this.getRoleUiText('memorySnapshotImported'));
          await this.handleTriggers('/role', null);
          return true;
        }

        const active = await this.getCurrentRoleMemoryTarget();
        if (!active) {
          this.replyFromAgent(this.getRoleUiText('noActiveRole'));
          return true;
        }
        if (sub === active.roleSlug || sub === String(active.roleName || '').toLowerCase()) {
          this.replyFromAgent(buildRoleMemorySnapshotMenuMessage({ getRoleUiText: this.getRoleUiText }));
          return true;
        }
        if (sub === 'create') {
          const result = await createRoleMemorySnapshot(this, active);
          this.replyFromAgent(this.getRoleUiText('memorySnapshotCreated', { time: new Date(result.capturedAt).toLocaleString(), path: result.path }));
          this.replyFromAgent(buildRoleMemorySnapshotMenuMessage({ getRoleUiText: this.getRoleUiText }));
          return true;
        }
      } catch (error) {
        this.replyFromAgent(this.getRoleUiText('memorySnapshotFailed', { error: String(error?.message || error || 'unknown') }));
        return true;
      }
      this.replyFromAgent(buildRoleMemorySnapshotMenuMessage({ getRoleUiText: this.getRoleUiText }));
      return true;
    }

    if (/^\/role\s+summary\b/i.test(trimmed) || /^\/r\s+summary\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }
      const summary = await this.readConversationSummary(active.roleSlug);
      this.replyFromAgent(this.buildAwakeningJourneyMessage(active, summary));
      return true;
    }

    if (/^\/role\s+s\b/i.test(trimmed)) {
      const requestText = trimmed.replace(/^\/role\s+s\b/i, '').trim();
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }
      if (!requestText) {
        this.replyFromAgent(this.getRoleUiText('awakeningJourneyEditUsage'));
        return true;
      }
      this.replyFromAgent(this.getRoleUiText('awakeningJourneyUpdating'));
      try {
        const nextSummary = await this.rewriteConversationSummaryFromUserRequest(active.roleSlug, requestText);
        this.replyFromAgent(this.getRoleUiText('awakeningJourneyUpdated'));
        this.replyFromAgent(this.buildAwakeningJourneyMessage(active, nextSummary));
      } catch (error) {
        this.replyFromAgent(this.getRoleUiText('awakeningJourneyUpdateFailed'));
        const fallbackSummary = await this.readConversationSummary(active.roleSlug);
        this.replyFromAgent(this.buildAwakeningJourneyMessage(active, fallbackSummary));
      }
      return true;
    }

    if (/^\/role\s+edit\b/i.test(trimmed) || /^\/r\s+memory\s+adjust\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingMemoryAdjust: true,
            pendingMemoryRoleSlug: active.roleSlug,
            pendingMemoryAdjustDraft: null,
            pendingMemoryAdjustLayer: null,
          },
          resolve,
        ),
      );

      const currentMemoryText = this.normalizeMemoryCardText(String(active.roleData.memory || '').trim()) || '(empty)';
      this.replyFromAgent([
        this.getRoleUiText('memoryTitle'),
        currentMemoryText,
      ].join('\n'));

      this.replyFromAgent(this.buildRoleEditLayerChoiceMessage(active));
      return true;
    }

    if (/^\/role\s+[vlf]\b/i.test(trimmed)) {
      const match = /^\/role\s+([vlf])\b/i.exec(trimmed);
      const layer = normalizeRoleMemoryLayerKey(match?.[1] || '');
      const requestText = trimmed.replace(/^\/role\s+[vlf]\b/i, '').trim();
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active || !layer) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      if (!requestText) {
        await new Promise(resolve =>
          this.setState(
            {
              pendingMemoryAdjust: true,
              pendingMemoryRoleSlug: active.roleSlug,
              pendingMemoryAdjustLayer: layer,
              pendingMemoryAdjustDraft: {
                layer: String(layer || '').toUpperCase(),
                action: 'edit',
                roleSlug: active.roleSlug,
              },
            },
            resolve,
          ),
        );
        this.replyFromAgent(`${this.getMemoryLayerLabel(layer)}\n\n${this.getRoleUiText('askAdjustMemory')}`);
        return true;
      }

      const roleData = await this.readRoleFile(active.roleSlug);
      if (!roleData) {
        this.replyFromAgent(this.getRoleUiText('memoryAdjustFailed'));
        return true;
      }

      this.replyFromAgent(this.getRoleUiText('memoryUpdating'));
      const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
      const currentLayerText = this.normalizeMemoryLayerText(roleData.memoryLayers?.[layer] || '');
      let nextLayerText = currentLayerText;
      if (!!this.state.llmConfig?.provider && typeof this.callLLMSilent === 'function') {
        const prompt = buildMemoryLayerEditPrompt({
          roleName: roleData.roleName || active.roleSlug || 'unknown',
          layer,
          currentLayerText,
          requestText,
        });
        try {
          const raw = await this.callLLMSilent(prompt);
          const cleaned = this.normalizeMemoryLayerText(raw);
          if (cleaned) nextLayerText = cleaned;
        } catch {}
      } else {
        this.replyFromAgent(this.getRoleUiText('memoryAdjustNeedsLlm'));
      }

      const repairedLayer = await this.validateAndRepairRoleLayer({
        roleName: roleData.roleName || active.roleSlug,
        roleLang,
        layer,
        text: nextLayerText,
        request: requestText,
      });
      const result = await this.roleMemoryStore.updateRoleLayer({
        roleSlug: active.roleSlug,
        layer,
        nextText: repairedLayer.text,
        backupReason: `edit-${this.getRoleMemoryLayerShortCode(layer)}`,
      });
      if (!result?.roleData) {
        this.replyFromAgent(this.getRoleUiText('memoryAdjustFailed'));
        return true;
      }

      await this.upsertRoleIndexEntry({
        roleName: result.roleData.roleName || active.roleSlug,
        roleSlug: active.roleSlug,
        updatedAt: result.roleData.updatedAt,
      });
      const refreshedCards = await this.loadLocalRoleCardsPage(0);
      await new Promise(resolve =>
        this.setState({
          roleCardOffset: 0,
          roleCardPage: refreshedCards.items,
          activeRoleSlug: active.roleSlug,
          pendingMemoryAdjust: false,
          pendingMemoryRoleSlug: null,
          pendingMemoryAdjustDraft: null,
          pendingMemoryAdjustLayer: null,
        }, resolve),
      );
      await this.saveLastSelectedRole(result.roleData.roleName || active.roleSlug);
      await this.saveActiveRoleState(result.roleData.roleName || active.roleSlug, active.roleSlug);
      await this.saveCurrentSummonedRole(result.roleData.roleName || active.roleSlug, active.roleSlug);
      this.activeRoleSlug = active.roleSlug;
      this.replyFromAgent(this.getRoleUiText('memoryUpdated'));
      await this.handleTriggers(`/role card ${active.roleSlug}`, null);
      return true;
    }

    if (/^\/r\s+continuechat\b/i.test(trimmed)) {
      const active = await this.getCurrentSummonedRoleData();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      const { roleData } = active;
      const ctx = typeof this.resolveNamespaceContext === 'function' ? this.resolveNamespaceContext() : null;
      const agentId = ctx?.agentId || this.agentId || 'unknown';
      const roleLang = this.getRoleLangCode() || 'en';
      const alphaOverride = await this.readRoleAlphaForPrompt();
      const rolePrompt = buildRoleChatPrompt(roleData.roleName, agentId, roleData.memory || '', roleLang, { alphaOverride });

      await this.replyFromLLM(rolePrompt, null, { silentUser: true });
      return true;
    }

    if (/^\/r\s+memory\s+commit\s+do\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      const { roleSlug, roleData } = active;
      const layers = {
        verified: String(roleData?.memoryLayers?.verified || '').trim(),
        likely: String(roleData?.memoryLayers?.likely || '').trim(),
        fog: String(roleData?.memoryLayers?.fog || '').trim(),
      };
      if (!layers.verified && !layers.likely && !layers.fog) {
        this.replyFromAgent(this.getRoleUiText('memoryEmpty'));
        return true;
      }

      this.replyFromAgent(this.getRoleUiText('memoryCommitPreparing') || 'Preparing memory for permanent on-chain commit…');

      try {
        const namespaceId = this.props?.navigation?.state?.params?.namespaceId;
        if (!namespaceId) {
          this.replyFromAgent(this.getRoleUiText('missingNamespace'));
          return true;
        }

        const walletId = this.props?.navigation?.state?.params?.walletId;
        const wallet = BlueApp.getWallets().find(w => w.getID() === walletId);
        if (!wallet) {
          this.replyFromAgent(this.getRoleUiText('walletNotFound'));
          return true;
        }

        const roleNameResult = await this.commitSingleMemoryLayerOnChain({
          wallet,
          namespaceId,
          roleSlug,
          layer: 'name',
          value: String(roleData?.roleName || '').trim(),
        });
        this.replyFromAgent(roleNameResult?.skipped ? this.getRoleUiText('commitSkipped', { label: 'NAME' }) : `[[/role openkey ${roleNameResult.key}|NAME]] ${this.getRoleUiText('commitSucceeded')}`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        const verifiedResult = await this.commitSingleMemoryLayerOnChain({
          wallet,
          namespaceId,
          roleSlug,
          layer: 'verified',
          value: layers.verified,
        });
        this.replyFromAgent(verifiedResult?.skipped ? this.getRoleUiText('commitSkipped', { label: 'VERIFIED' }) : `[[/role openkey ${verifiedResult.key}|VERIFIED]] ${this.getRoleUiText('commitSucceeded')}`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        const likelyResult = await this.commitSingleMemoryLayerOnChain({
          wallet,
          namespaceId,
          roleSlug,
          layer: 'likely',
          value: layers.likely,
        });
        this.replyFromAgent(likelyResult?.skipped ? this.getRoleUiText('commitSkipped', { label: 'LIKELY' }) : `[[/role openkey ${likelyResult.key}|LIKELY]] ${this.getRoleUiText('commitSucceeded')}`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        const fogResult = await this.commitSingleMemoryLayerOnChain({
          wallet,
          namespaceId,
          roleSlug,
          layer: 'fog',
          value: layers.fog,
        });
        this.replyFromAgent(fogResult?.skipped ? this.getRoleUiText('commitSkipped', { label: 'FOG' }) : `[[/role openkey ${fogResult.key}|FOG]] ${this.getRoleUiText('commitSucceeded')}`);

        this.replyFromAgent(this.getRoleUiText('commitCompletePoetic'));
      } catch (e) {
        console.warn('Memory commit failed', e);
        this.replyFromAgent(this.getRoleUiText('memoryCommitFailed'));
      }
      return true;
    }

    if (/^\/r\s+memory\s+commit\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      const { roleData } = active;
      const roleNameText = String(roleData?.roleName || '').trim();
      const layers = {
        verified: String(roleData?.memoryLayers?.verified || '').trim(),
        likely: String(roleData?.memoryLayers?.likely || '').trim(),
        fog: String(roleData?.memoryLayers?.fog || '').trim(),
      };
      if (!roleNameText && !layers.verified && !layers.likely && !layers.fog) {
        this.replyFromAgent(this.getRoleUiText('memoryEmpty'));
        return true;
      }

      this.replyFromAgent([
        this.getRoleUiText('memoryCommitPrompt') || 'Commit current memory on-chain? NAME / VERIFIED / LIKELY / FOG will be submitted separately.',
        '',
        `${this.getRoleUiText('memoryCommitNameStatus') || 'NAME'}：${roleNameText ? '✅' : '-'}`,
        `${this.getRoleUiText('memoryCommitVerifiedStatus') || 'VERIFIED'}：${layers.verified ? '✅' : '-'}`,
        `${this.getRoleUiText('memoryCommitLikelyStatus') || 'LIKELY'}：${layers.likely ? '✅' : '-'}`,
        `${this.getRoleUiText('memoryCommitFogStatus') || 'FOG'}：${layers.fog ? '✅' : '-'}`,
        '',
        `[[/r memory commit do|${this.getRoleUiText('confirm') || 'Confirm'}]]   [[/role memory|${this.getRoleUiText('back')}]]`,
      ].join('\n'));
      return true;
    }

    if (/^\/role\s+openkey\b/i.test(trimmed)) {
      const key = trimmed.replace(/^\/role\s+openkey\b/i, '').trim();
      const navigation = this.props?.navigation;
      const namespaceId = navigation?.state?.params?.namespaceId;
      const walletId = navigation?.state?.params?.walletId;
      if (!navigation || typeof navigation.navigate !== 'function' || !namespaceId) {
        this.replyFromAgent(this.getRoleUiText('missingNamespace'));
        return true;
      }
      navigation.navigate('KeyValues', {
        namespaceId,
        walletId,
        focusKey: key,
      });
      return true;
    }

    if (/^\/role\s+onchainmemory\s+do\b/i.test(trimmed)) {
      const result = await this.restoreRoleFromOnChainMemory();
      if (result?.notFound) {
        this.replyFromAgent(this.getRoleUiText('onchainMemoryNotFound') || 'No on-chain memory found.');
        return true;
      }
      if (!result?.roleData) {
        this.replyFromAgent(this.getRoleUiText('onchainRestoreFailed'));
        return true;
      }
      this.replyFromAgent(this.getRoleUiText('onchainRestoreSuccess'));
      await this.handleTriggers('/role memory', null);
      return true;
    }

    const directDoppelRestoreMatch = /^\/role\s+onchainmemory\s+doppel\s+(.+?)\s+do\b/i.exec(trimmed);
    if (directDoppelRestoreMatch) {
      const inputId = normalizeDoppelMemoryId(directDoppelRestoreMatch[1]);
      this.replyFromAgent(this.getRoleUiText('doppelMemoryReading') || 'Reading doppel memory…');
      const draft = inputId ? await fetchDoppelOnChainMemory({ BlueElectrum, rawId: inputId }) : null;
      if (!draft?.hasAnyMemory) {
        this.replyFromAgent(this.getRoleUiText('doppelRestoreFailed') || '(doppel memory restore failed)');
        return true;
      }
      const result = await this.restoreRoleFromDoppelMemory(draft);
      if (!result?.roleData) {
        this.replyFromAgent(this.getRoleUiText('doppelRestoreFailed') || '(doppel memory restore failed)');
        return true;
      }
      await this.upsertRoleIndexEntry({
        roleName: result.roleData.roleName || this.getSpaceRoleKey(),
        roleSlug: this.getSpaceRoleKey(),
        updatedAt: result.roleData.updatedAt || Date.now(),
      });
      await this.saveLastSelectedRole(result.roleData.roleName || this.getSpaceRoleKey());
      await this.saveActiveRoleState(result.roleData.roleName || this.getSpaceRoleKey(), this.getSpaceRoleKey());
      await this.saveCurrentSummonedRole(result.roleData.roleName || this.getSpaceRoleKey(), this.getSpaceRoleKey());
      this.replyFromAgent(this.getRoleUiText('doppelRestoreSuccess') || 'Doppel memory restored.');
      const params = this.props.navigation?.state?.params || {};
      if (params.autoRestoreDoneStorageKey) {
        await AsyncStorage.setItem(String(params.autoRestoreDoneStorageKey), String(params.autoRestoreDoneStorageValue || inputId || 'done'));
      }
      if (params.autoOpenNamespaceAfterAutoDoppelRestore) {
        this.props.navigation?.navigate?.('Namespaces', { initialTab: 'me' });
      } else {
        await this.handleTriggers('/role memory', null);
      }
      return true;
    }

    if (/^\/role\s+onchainmemory\s+doppel\s+do\b/i.test(trimmed)) {
      const draft = this.state.pendingDoppelMemoryDraft;
      if (!draft?.hasAnyMemory) {
        this.replyFromAgent(this.getRoleUiText('doppelRestoreFailed') || '(doppel memory restore failed)');
        return true;
      }
      const result = await this.restoreRoleFromDoppelMemory(draft);
      await new Promise(resolve => this.setState({ pendingDoppelMemoryInput: false, pendingDoppelMemoryDraft: null }, resolve));
      if (!result?.roleData) {
        this.replyFromAgent(this.getRoleUiText('doppelRestoreFailed') || '(doppel memory restore failed)');
        return true;
      }
      await this.upsertRoleIndexEntry({
        roleName: result.roleData.roleName || this.getSpaceRoleKey(),
        roleSlug: this.getSpaceRoleKey(),
        updatedAt: result.roleData.updatedAt || Date.now(),
      });
      await this.saveLastSelectedRole(result.roleData.roleName || this.getSpaceRoleKey());
      await this.saveActiveRoleState(result.roleData.roleName || this.getSpaceRoleKey(), this.getSpaceRoleKey());
      await this.saveCurrentSummonedRole(result.roleData.roleName || this.getSpaceRoleKey(), this.getSpaceRoleKey());
      this.replyFromAgent(this.getRoleUiText('doppelRestoreSuccess') || 'Doppel memory restored.');
      await this.handleTriggers('/role memory', null);
      return true;
    }

    if (/^\/role\s+onchainmemory\s+doppel\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ pendingDoppelMemoryInput: true, pendingDoppelMemoryDraft: null }, resolve));
      this.replyFromAgent(this.getRoleUiText('doppelMemoryPrompt') || 'Enter the doppel ID to read:');
      return true;
    }

    if (/^\/role\s+onchainmemory\s+local\b/i.test(trimmed)) {
      this.replyFromAgent(this.getRoleUiText('onchainMemoryReading') || 'Reading on-chain memory…');
      const roleSlug = this.getSpaceRoleKey();
      const roleData = await this.readRoleFile(roleSlug);
      const status = await this.getOnChainMemoryStatus();
      const hasOnChainMemory = !!(status?.nameExists || status?.verifiedExists || status?.likelyExists || status?.fogExists);
      if (!hasOnChainMemory) {
        this.replyFromAgent(this.getRoleUiText('onchainMemoryNotFound') || 'No on-chain memory found.');
        return true;
      }
      this.replyFromAgent([
        this.getRoleUiText('onchainRestoreConfirm'),
        String(roleData?.roleName || roleSlug || '').trim(),
        '',
        `NAME：${status?.nameExists ? '✅' : '-'}`,
        `VERIFIED：${status?.verifiedExists ? '✅' : '-'}`,
        `LIKELY：${status?.likelyExists ? '✅' : '-'}`,
        `FOG：${status?.fogExists ? '✅' : '-'}`,
        '',
        `[[/role onchainmemory do|${this.getRoleUiText('confirm') || 'Confirm'}]]   [[/role onchainmemory|${this.getRoleUiText('back')}]]`,
      ].join('\n'));
      return true;
    }

    if (/^\/role\s+onchainmemory\b/i.test(trimmed)) {
      this.replyFromAgent([
        this.getRoleUiText('onchainMemoryMenuTitle') || this.getRoleUiText('onchainMemory') || 'On-chain memory',
        '',
        `[[/role onchainmemory local|${this.getRoleUiText('localOnchainMemory') || 'Local memory'}]]`,
        '',
        `[[/role onchainmemory doppel|${this.getRoleUiText('doppelMemory') || 'Doppel memory'}]]`,
        '',
        `[[/role memory rebuild|${this.getRoleUiText('back')}]]`,
      ].join('\n'));
      return true;
    }

    if (/^\/role\s+recover\s+do\b/i.test(trimmed)) {
      const roleSlug = this.state.pendingLastMemoryRecoverRoleSlug || this.getSpaceRoleKey();

      if (!roleSlug) {
        await new Promise(resolve =>
          this.setState(
            {
              pendingLastMemoryRecoverConfirm: false,
              pendingLastMemoryRecoverRoleSlug: null,
            },
            resolve,
          ),
        );
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingLastMemoryRecoverConfirm: false,
            pendingLastMemoryRecoverRoleSlug: null,
          },
          resolve,
        ),
      );

      const result = await this.restoreRoleFromLastMemory(roleSlug);
      if (!result?.roleData) {
        this.replyFromAgent(this.getRoleUiText('lastMemoryRecoverFailed') || '(last memory recover failed)');
        return true;
      }

      await this.upsertRoleIndexEntry({
        roleName: result.roleData.roleName || roleSlug,
        roleSlug,
        updatedAt: result.roleData.updatedAt,
      });
      const refreshedCards = await this.loadLocalRoleCardsPage(0);
      await new Promise(resolve =>
        this.setState({
          roleCardOffset: 0,
          roleCardPage: refreshedCards.items,
          activeRoleSlug: roleSlug,
          pendingMemoryAdjust: false,
          pendingMemoryRoleSlug: null,
          pendingMemoryAdjustDraft: null,
          pendingMemoryAdjustLayer: null,
          pendingLastMemoryRecoverConfirm: false,
          pendingLastMemoryRecoverRoleSlug: null,
        }, resolve),
      );
      await this.saveLastSelectedRole(result.roleData.roleName || roleSlug);
      await this.saveActiveRoleState(result.roleData.roleName || roleSlug, roleSlug);
      await this.saveCurrentSummonedRole(result.roleData.roleName || roleSlug, roleSlug);
      this.activeRoleSlug = roleSlug;

      this.replyFromAgent(this.getRoleUiText('lastMemoryRecoverSuccess') || 'Restored this role to the memory before the most recent edit.');
      await this.handleTriggers('/role memory', null);
      return true;
    }

    if (/^\/role\s+recover\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingLastMemoryRecoverConfirm: true,
            pendingLastMemoryRecoverRoleSlug: active.roleSlug,
          },
          resolve,
        ),
      );

      const lastStatus = await this.getRoleLastMemoryStatus(active.roleSlug);
      const capturedAtText = lastStatus.capturedAt ? new Date(lastStatus.capturedAt).toLocaleString() : '-';
      const statusLines = [
        `${this.getRoleUiText('lastMemoryFileStatus') || 'Last memory file'}：${lastStatus.lastMemoryExists ? '✅' : '❌'}`,
        `${this.getRoleUiText('lastMemoryRoleStatus') || 'Role file'}：${lastStatus.roleReadable ? '✅' : '❌'}`,
        `${this.getRoleUiText('lastMemoryCapturedAt') || 'Saved at'}：${capturedAtText}`,
        `${this.getRoleUiText('lastMemoryVerifiedStatus') || 'Last VERIFIED'}：${lastStatus.verifiedReady ? '✅' : '❌'}`,
        `${this.getRoleUiText('lastMemoryLikelyStatus') || 'Last LIKELY'}：${lastStatus.likelyReady ? '✅' : '❌'}`,
        `${this.getRoleUiText('lastMemoryFogStatus') || 'Last FOG'}：${lastStatus.fogReady ? '✅' : '❌'}`,
        `${this.getRoleUiText('initialMemoryBaselineStatus') || 'Baseline file'}：${lastStatus.baselineExists ? '✅' : '❌'}`,
      ];

      this.replyFromAgent([
        this.getRoleUiText('lastMemoryPrompt') || 'Restore this role to its last memory before the most recent edit? The current memory will be backed up first.',
        String(active.roleName || active.roleSlug || '').trim(),
        '',
        ...statusLines,
        '',
        `[[/role recover do|${this.getRoleUiText('confirm') || 'Confirm'}]]   [[/role memory|${this.getRoleUiText('back')}]]`,
      ].join('\n'));
      return true;
    }

    if (/^\/r\s+memory\s+rebuild\s+confirm\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingMemoryRebuildConfirm: true,
            pendingMemoryRebuildRoleSlug: active.roleSlug,
          },
          resolve,
        ),
      );

      const initialStatus = await this.getRoleInitialMemoryStatus(active.roleSlug);
      const statusLines = [
        `${this.getRoleUiText('initialMemoryBaselineStatus') || 'Baseline'}：${initialStatus.baselineExists ? '✅' : '❌'}`,
        `${this.getRoleUiText('initialMemoryVerifiedStatus') || 'Initial VERIFIED'}：${initialStatus.initialVerifiedExists ? '✅' : '❌'}`,
        `${this.getRoleUiText('initialMemoryLikelyStatus') || 'Initial LIKELY'}：${initialStatus.initialLikelyExists ? '✅' : '❌'}`,
        `${this.getRoleUiText('initialMemoryFogStatus') || 'Initial FOG'}：${initialStatus.initialFogExists ? '✅' : '❌'}`,
      ];

      this.replyFromAgent([
        this.getRoleUiText('initialMemoryPrompt') || 'Restore this role to its initial memory? Current memory will be backed up first.',
        String(active.roleName || active.roleSlug || '').trim(),
        '',
        ...statusLines,
        '',
        `[[/r memory rebuild do|${this.getRoleUiText('confirm') || 'Confirm'}]]   [[/role memory|${this.getRoleUiText('back')}]]`,
      ].join('\n'));
      return true;
    }

    if (/^\/r\s+memory\s+rebuild\s+do\b/i.test(trimmed)) {
      const roleSlug = this.state.pendingMemoryRebuildRoleSlug || this.getSpaceRoleKey();

      if (!roleSlug) {
        await new Promise(resolve =>
          this.setState(
            {
              pendingMemoryRebuildConfirm: false,
              pendingMemoryRebuildRoleSlug: null,
            },
            resolve,
          ),
        );
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingMemoryRebuildConfirm: false,
            pendingMemoryRebuildRoleSlug: null,
          },
          resolve,
        ),
      );

      await this.handleTriggers(`/r memory rebuild ${roleSlug}`, userMessage);
      return true;
    }

    if (/^\/r\s+memory\s+delete\s+confirm\b/i.test(trimmed)) {
      const roleSlug = this.state.pendingMemoryDeleteRoleSlug || this.getSpaceRoleKey();

      if (!roleSlug) {
        await new Promise(resolve =>
          this.setState(
            {
              pendingMemoryDeleteConfirm: false,
              pendingMemoryDeleteRoleSlug: null,
            },
            resolve,
          ),
        );
        this.replyFromAgent(this.getRoleUiText('noRoleSelectedForDeletion'));
        return true;
      }

      await this.captureExistingRoleMemorySnapshot(roleSlug, { kind: 'before-memory-delete', trigger: '/r memory delete confirm' });
      const ok = await this.deleteRoleFile(roleSlug);
      if (ok) {
        await this.removeRoleIndexEntry(roleSlug);
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingMemoryRebuildConfirm: false,
            pendingMemoryRebuildRoleSlug: null,
            pendingMemoryDeleteConfirm: false,
            pendingMemoryDeleteRoleSlug: null,
            activeRoleSlug: null,
            pendingMemoryAdjust: false,
            pendingMemoryRoleSlug: null,
            pendingMemoryAdjustDraft: null,
            pendingMemoryAdjustLayer: null,
            pendingRoleSuggest: false,
            pendingRoleSuggestOriginal: '',
            pendingRoleSuggestOptions: [],
            pendingRoleFragmentImport: false,
            pendingRoleStoryFragmentImport: false,
            pendingRoleCall: false,
            pendingNewRole: null,
          },
          resolve,
        ),
      );
      this.activeRoleSlug = null;

      await this.clearLastSelectedRole();
      await this.clearActiveRoleState();
      await this.clearCurrentSummonedRole();
      await this.clearPendingNewRole();

      const first = await this.loadLocalRoleCardsPage(0);
      await new Promise(resolve =>
        this.setState({ roleCardOffset: 0, roleCardPage: first.items }, resolve),
      );

      if (!ok) {
        this.replyFromAgent(this.getRoleUiText('deleteMemoryFailed'));
        return true;
      }

      this.replyFromAgent(this.getRoleUiText('deleteMemorySuccess'));
      await this.handleTriggers('/role cards', null);
      await this.handleTriggers('/role menu', null);
      return true;
    }

    if (/^\/r\s+memory\s+reset\b/i.test(trimmed)) {
      await this.handleTriggers(trimmed.replace(/^\/r\s+memory\s+reset\b/i, '/r memory rebuild v'), userMessage);
      return true;
    }

        if (/^\/r\s+memory\s+rebuild\b/i.test(trimmed)) {
      const args = trimmed.replace(/^\/r\s+memory\s+rebuild\b/i, '').trim().split(/\s+/).filter(Boolean);
      const layer = normalizeRoleMemoryLayerKey(args[0]);
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      let result = null;
      if (!layer) {
        const initialStatus = await this.getRoleInitialMemoryStatus(active.roleSlug);
        if (initialStatus?.baselineExists) {
          result = await this.restoreRoleFromRecoveryBaseline(active.roleSlug);
        } else {
          result = await this.restoreRoleFromInitialMemory(active.roleSlug);
        }
      } else {
        result = await this.roleMemoryStore.rebuildRoleLayer({ roleSlug: active.roleSlug, layer });
      }

      if (!result?.roleData) {
        this.replyFromAgent(this.getRoleUiText('memoryRebuildFailed') || '(memory rebuild failed)');
        return true;
      }

      await this.upsertRoleIndexEntry({
        roleName: result.roleData.roleName || active.roleSlug,
        roleSlug: active.roleSlug,
        updatedAt: result.roleData.updatedAt,
      });
      const refreshedCards = await this.loadLocalRoleCardsPage(0);
      await new Promise(resolve =>
        this.setState({
          roleCardOffset: 0,
          roleCardPage: refreshedCards.items,
          activeRoleSlug: active.roleSlug,
          pendingMemoryAdjust: false,
          pendingMemoryRoleSlug: null,
          pendingMemoryAdjustDraft: null,
          pendingMemoryAdjustLayer: null,
          pendingMemoryRebuildConfirm: false,
          pendingMemoryRebuildRoleSlug: null,
        }, resolve),
      );
      await this.saveLastSelectedRole(result.roleData.roleName || active.roleSlug);
      await this.saveActiveRoleState(result.roleData.roleName || active.roleSlug, active.roleSlug);
      await this.saveCurrentSummonedRole(result.roleData.roleName || active.roleSlug, active.roleSlug);
      this.activeRoleSlug = active.roleSlug;

      if (layer) {
        this.replyFromAgent(this.getRoleUiText('memoryRebuildSuccess', { layer: String(layer).toUpperCase(), backup: result?.backup?.fileName || '-' }));
      } else {
        this.replyFromAgent(this.getRoleUiText('memoryRebuildFullSuccess') || 'Memory restored to its initial state.');
      }

      await this.handleTriggers('/role memory', null);
      return true;
    }

if (/^\/r\s+memory\s+recover\b/i.test(trimmed)) {
      const rawArgs = trimmed.replace(/^\/r\s+memory\s+recover\b/i, '').trim();
      const args = rawArgs.split(/\s+/).filter(Boolean);
      let layer = '';
      let backupFileName = '';

      if (args.length) layer = normalizeRoleMemoryLayerKey(args.shift());
      if (args.length) backupFileName = args.join(' ');

      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }
      if (!layer || !backupFileName) {
        this.replyFromAgent(await this.buildRoleMemoryRecoverMenuMessage(active));
        return true;
      }

      const result = await this.roleMemoryStore.recoverRoleLayer({ roleSlug: active.roleSlug, layer, backupFileName });
      if (!result?.roleData) {
        this.replyFromAgent(this.getRoleUiText('memoryRecoverFailed') || '(memory recover failed)');
        return true;
      }

      await this.upsertRoleIndexEntry({
        roleName: result.roleData.roleName || active.roleSlug,
        roleSlug: active.roleSlug,
        updatedAt: result.roleData.updatedAt,
      });
      const refreshedCards = await this.loadLocalRoleCardsPage(0);
      await new Promise(resolve =>
        this.setState({
          roleCardOffset: 0,
          roleCardPage: refreshedCards.items,
          activeRoleSlug: active.roleSlug,
          pendingMemoryAdjust: false,
          pendingMemoryRoleSlug: null,
          pendingMemoryAdjustDraft: null,
          pendingMemoryAdjustLayer: null,
        }, resolve),
      );
      await this.saveLastSelectedRole(result.roleData.roleName || active.roleSlug);
      await this.saveActiveRoleState(result.roleData.roleName || active.roleSlug, active.roleSlug);
      await this.saveCurrentSummonedRole(result.roleData.roleName || active.roleSlug, active.roleSlug);
      this.activeRoleSlug = active.roleSlug;

      this.replyFromAgent(this.getRoleUiText('memoryRecoverSuccess', {
        layer: String(layer).toUpperCase(),
        backup: backupFileName,
        created: result?.backup?.fileName || '-',
      }));
      this.replyFromAgent(await this.buildRoleMemoryRecoverMenuMessage({ ...active, roleData: result.roleData }));
      await this.handleTriggers('/role memory', null);
      return true;
    }

    if (/^\/r\s+memory\s+delete\b/i.test(trimmed)) {
      const active = await this.getCurrentRoleMemoryTarget();
      if (!active) {
        this.replyFromAgent(this.getRoleUiText('noActiveRole'));
        return true;
      }

      await new Promise(resolve =>
        this.setState(
          {
            pendingMemoryDeleteConfirm: true,
            pendingMemoryDeleteRoleSlug: active.roleSlug,
          },
          resolve,
        ),
      );

      this.replyFromAgent([
        this.getRoleUiText('deleteRoleMemoryPrompt'),
        '',
        `[[/r memory delete confirm|${this.getRoleUiText('confirmDelete')}]]`,
        '',
        `[[/role memory|${this.getRoleUiText('back')}]]`,
      ].join('\n'));
      return true;
    }

    if (/^\/r\s+create\b/i.test(trimmed)) {
      const name = trimmed.replace(/^\/r\s+create\b/i, '').trim();
      await this.beginRoleCreateConfirmFlow(name);
      return true;
    }

    if (/^\/r\s+setname\b/i.test(trimmed)) {
      const name = trimmed.replace(/^\/r\s+setname\b/i, '').trim();
      await this.beginRoleCreateConfirmFlow(name);
      return true;
    }

    if (/^\/(?:r|role)\s+clearall\b/i.test(trimmed)) {
      await this.clearAllRoleDatas();
      return true;
    }

    if (/^\/r\s+duplicate\s+load\b/i.test(trimmed)) {
      const name = String(this.state.pendingDuplicateRoleName || '').trim() || (await this.getPendingNewRole());
      if (!name) {
        await this.showRoleCreateWizard();
        return true;
      }
      await this.handleRoleCallWithName(name, userMessage, { isContinue: true });
      return true;
    }

    if (/^\/r\s+duplicate\s+overwrite\b/i.test(trimmed)) {
      const name = String(this.state.pendingDuplicateRoleName || '').trim() || (await this.getPendingNewRole());
      if (!name) {
        await this.showRoleCreateWizard();
        return true;
      }
      const roleSlug = this.getSpaceRoleKey();
      const now = Date.now();
      const initialMemoryBundle = await this.buildValidatedInitialRoleMemory(name);
      const normalizedInitialMemory = this.normalizeMemoryCardText(initialMemoryBundle?.memory || '');
      await this.writeRoleFile(roleSlug, {
        roleName: name,
        roleSlug,
        memory: normalizedInitialMemory,
        initialMemory: this.normalizeMemoryCardText(initialMemoryBundle?.initialMemory || normalizedInitialMemory),
        memoryLayers: initialMemoryBundle?.memoryLayers,
        initialMemoryLayers: initialMemoryBundle?.initialMemoryLayers,
        generationStatus: initialMemoryBundle?.generationStatus || 'validated',
        memorySeed: initialMemoryBundle?.memorySeed || null,
        createdAt: now,
        updatedAt: now,
      });
      await this.upsertRoleIndexEntry({ roleName: name, roleSlug, updatedAt: Date.now() });
      await this.finalizeRoleActivation({ name, roleSlug, refreshedCards: null, clearDuplicate: true });
      return true;
    }

    if (/^\/r\s+confirm\b/i.test(trimmed)) {
      const name = await this.getPendingNewRole();
      if (!name) {
        await this.showRoleCreateWizard();
        return true;
      }
      await this.handleTriggers(`/role summon ${name}`, userMessage);
      return true;
    }

    if (/^\/r\s+cancel\b/i.test(trimmed)) {
      await new Promise(resolve => this.setState({ pendingDuplicateRoleName: null }, resolve));
      await this.clearPendingNewRole();
      await this.handleTriggers('/role clear', null);
      return true;
    }

    if (/^\/r\s+continue\b/i.test(trimmed)) {
      const selected = await this.getCurrentSummonedRoleData();
      if (!selected?.roleName) {
        await this.handleTriggers('/role clear', null);
        return true;
      }

      await this.handleRoleCallWithName(selected.roleName, userMessage, { isContinue: true });
      return true;
    }

    if (/^\/role\s+chat\b/i.test(trimmed)) {
      const selected = await this.getCurrentSummonedRoleData();
      if (!selected?.roleName) {
        await this.handleTriggers('/role menu', null);
        return true;
      }

      await this.handleRoleCallWithName(selected.roleName, userMessage, { isContinue: true });
      return true;
    }

    if (/^\/role\s*$/i.test(trimmed)) {
      const langStatus = await this.runRoleLangCheck({ showSuccess: true });
      if (!langStatus?.ok) {
        await this.handleTriggers('/role lang list', null);
        return true;
      }

      if (!this.state.lastSelectedRole) {
        await this.restoreLastSelectedRole();
      }

      if (!this.isPureChatMode()) {
        await this.handleTriggers('/role menu', null);
      }

      const selected = await this.getCurrentSummonedRoleData();
      if (selected && selected.roleName) {
        const roleModelStatus = await this.ensureRoleModelReady({ source: this.roleEntrySource || 'role' });
        if (!roleModelStatus?.ok) {
          return true;
        }
        await this.handleTriggers('/role chat', null);
      }
      return true;
    }

    if (/^\/rolelang\b/i.test(trimmed)) {
      const args = trimmed.replace(/^\/rolelang\b/i, '').trim();
      await this.handleTriggers(args ? `/role lang ${args}` : '/role lang', null);
      return true;
    }
    const aMatch = /^\/a(?:\s+(.+))?$/i.exec(trimmed);
    if (aMatch) {
      const isFinalModelCommand = /^\/a\s+model\b/i.test(trimmed);
      const beforeKey = buildLlmSelectionKey(this.state.llmConfig);

      if (!this.isStoryScope) {
        if (isFinalModelCommand) {
          await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: true, pendingModelFinalConfirm: true, pendingRoleModelReturnToRole: true }, resolve));
        } else if (this.state.pendingModelFinalConfirm || this.state.pendingRoleModelReturnToRole) {
          await new Promise(resolve => this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
        }
      }

      await this.handleAIConfigCommand(trimmed);

      let reloadedConfig = null;
      if (isFinalModelCommand) {
        try {
          reloadedConfig = await this.loadLLMConfig();
        } catch (e) {
          reloadedConfig = null;
        }

        if (reloadedConfig && this._isMounted) {
          this.currentLLMConfig = reloadedConfig;
          this.setState({ llmConfig: reloadedConfig });
        }
      }

      const afterKey = buildLlmSelectionKey(reloadedConfig || this.state.llmConfig);

      if (this.isStoryScope && isFinalModelCommand && beforeKey !== afterKey) {
        if (this.state.pendingReturnToDestinyMenu && this.state.pendingModelFinalConfirm) {
          await new Promise(resolve =>
            this.setState({ pendingReturnToDestinyMenu: false, pendingModelFinalConfirm: false }, resolve)
          );
        }
        // do NOT call /d here; replyFromAgent("model selected") will trigger /d once
      }

      // Role auto-return is intentionally not handled here for generic /a commands,
      // because provider selection (e.g. /a deepseek) also changes config before final model version is chosen.
      return;
    }
    const shortMatch = /^\/short(?:\s+(on|off))?\s*$/i.exec(trimmed);
    if (shortMatch) {
      if (!this.isStoryScope) {
        showStatus(this.getRoleUiText('shortOnlyStory'), 2000);
        return;
      }
      const nextMode = (shortMatch[1] || '').toLowerCase();
      if (!nextMode) {
        showStatus(this.getRoleUiText('shortUsage'), 2000);
        return;
      }
      const enabled = nextMode === 'on';
      this.setState({ storyShortMode: enabled });
      showStatus(enabled ? this.getRoleUiText('shortOn') : this.getRoleUiText('shortOff'), 2000);
      return;
    }
    const langMatch = /^\/lang(?:\s+(.+))?\s*$/i.exec(trimmed);
    if (langMatch) {
      await this.handleLangCommand(langMatch[1] || '');
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
    if (/^\/r\s+new\b/i.test(trimmed)) {
      await this.handleTriggers('/role clear', null);
      return true;
    }
    const roleMatch = /^\/r\s+(.+)/i.exec(trimmed);
    if (roleMatch) {
      await Roleplay.handleRoleCommand(this, roleMatch[1], { Rolecards });
      return;
    }
    if (/^\/r\b/i.test(trimmed)) {
      await Roleplay.handleRoleCommand(this, 'unknown', { Rolecards });
      this.replyFromAgent(
        Roleplay.buildRoleHistoryMessage(this, {
          getRoleHistoryTitle,
          getCommandUsageMessage,
        }),
      );
      return;
    }
    const destinyMatch = /^\/d(?:\s+(.+))?$/i.exec(trimmed);
    if (destinyMatch) {
      await this.handleDestinyCommand(destinyMatch[1] || '');
      return;
    }

    if (/^\/reopen\b/i.test(trimmed)) {
      await this.handleReopenCurrentWindow();
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
      this.replyFromAgent(this.getRoleUiText('unknownCommand'));
      return;
    }

    await this.replyFromLLM(trimmed, userMessage);
    } finally {
      this._handlingCommandReply = previousHandlingCommandReply;
    }
  };

  prunePureChatAutoMessages = baselineCount => {
    this.setState(prevState => {
      const baseCount = Number.isFinite(baselineCount) ? baselineCount : 0;
      const before = prevState.allMessages.slice(0, baseCount);
      const added = prevState.allMessages.slice(baseCount);
      const keepAdded = added.filter(message => {
        if (!message) return false;
        const raw = String(message.text || '').trim();
        if (!raw) return false;
        if (message._renderMode === 'commands') return false;
        if (message.sender === 'user') return false;
        const t = raw.toLowerCase();
        const noisy = /^\/role\b/i.test(raw)
          || /^\/linkstart\b/i.test(raw)
          || /checking role/i.test(t)
          || /checking model/i.test(t)
          || /select role/i.test(t)
          || /choose role/i.test(t)
          || /set model/i.test(t)
          || /choose model/i.test(t)
          || /^model selected(?::|\s|$)/i.test(t)
          || /^role selected(?::|\s|$)/i.test(t)
          || /^\u6a21\u578b\s+/i.test(raw)
          || /^\u8bed\u8a00\s+/i.test(raw)
          || raw === '\u8bb0\u5fc6'
          || raw === '\u8bed\u97f3'
          || raw === '\u8bed\u97f3\u8bbe\u7f6e'
          || raw === '\u6a21\u578b'
          || /^memory$/i.test(raw)
          || /^voice$/i.test(raw)
          || /^voice settings$/i.test(raw)
          || /^model$/i.test(raw)
          || /^language\s+/i.test(raw)
          || /^\/h\b/i.test(raw)
          || /help\.$/i.test(t);
        return !noisy;
      });
      return {
        allMessages: [...before, ...keepAdded],
        messages: [...before, ...keepAdded].slice(-Math.min([...before, ...keepAdded].length, Math.max(prevState.visibleCount, PAGE_SIZE))),
      };
    });
  }

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
    if (commandText === '/role chat') {
      const roleData = await this.readRoleFile(this.getSpaceRoleKey());
      const llmConfig = await this.loadLLMConfig();
      const activeProvider = String(llmConfig?.provider || llmConfig?.activeProvider || '').trim();
      const hasRole = !!roleData;
      const hasModel = !!activeProvider;
      if (!hasRole || !hasModel) {
        navigation?.setParams?.({ autoCommand: null });
        return;
      }
    }
    this.hasAutoCommandRun = true;
    this.lastAutoCommand = commandText;
    const roleEntrySource = navigation?.state?.params?.roleEntrySource;
    const silentAutoChat = roleEntrySource === 'namespace-chat-button' && commandText === '/role chat';
    const baselineCount = this.state.allMessages.length;
    const silentAutoStoryClone = commandText === '/role story clone';
    const userMessage = silentAutoChat || silentAutoStoryClone ? null : this.buildMessage(commandText, 'user');
    if (userMessage) {
      this.appendMessage(userMessage);
    }
    this.setState({ inputValue: '' });
    const prevSuppress = this._suppressSystemMessages === true;
    if (silentAutoChat) {
      this._suppressSystemMessages = true;
    }
    try {
      await this.handleTriggers(commandText, userMessage);
    } finally {
      this._suppressSystemMessages = prevSuppress;
    }
    if (silentAutoChat) {
      this.prunePureChatAutoMessages(baselineCount);
    }
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
      this.replyFromAgent(this.getRoleUiText('welcomeEmpty'));
      return;
    }
    if (!namespaceId || !walletId) {
      this.replyFromAgent(this.getRoleUiText('missingNamespaceOrWallet'));
      return;
    }

    const wallet = BlueApp.getWallets().find(w => w.getID() === walletId);
    if (!wallet) {
      this.replyFromAgent(this.getRoleUiText('walletNotFoundForAgent'));
      return;
    }

    try {
      await this.updateKeyValue({
        wallet,
        namespaceId,
        key: 'welcome',
        value,
      });
      this.replyFromAgent(this.getRoleUiText('welcomeSaved'));
    } catch (e) {
      console.warn('AgentChat: failed to save welcome', e);
      this.replyFromAgent(this.getRoleUiText('welcomeSaveFailed'));
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

  waitForNamespaceKeyVisible = async (namespaceId, targetKey, { attempts = 8, intervalMs = 1500 } = {}) => {
    const normalizedTargetKey = String(targetKey || '').trim();
    if (!namespaceId || !normalizedTargetKey) return false;
    for (let i = 0; i < attempts; i += 1) {
      try {
        await BlueElectrum.ping();
        if (typeof BlueElectrum.waitTillConnected === 'function') {
          await BlueElectrum.waitTillConnected();
        }
        const history = await BlueElectrum.blockchainKeva_getKeyValues(getNamespaceScriptHash(namespaceId), -1);
        const keyValues = Array.isArray(history?.keyvalues) ? history.keyvalues : [];
        const found = keyValues.some(kv => {
          const decodedKey = kv?.key ? decodeBase64(kv.key) : '';
          return String(decodedKey || '').trim() === normalizedTargetKey;
        });
        if (found) {
          return true;
        }
      } catch (error) {
        console.warn('waitForNamespaceKeyVisible failed', { namespaceId, targetKey: normalizedTargetKey, attempt: i + 1, error: String(error?.message || error) });
      }
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    return false;
  };

  commitSingleMemoryLayerOnChain = async ({ wallet, namespaceId, roleSlug, layer, value }) => {
    const safeLayer = String(layer || '').trim().toLowerCase();
    const safeValue = String(value || '').trim();
    if (!safeLayer) {
      throw new Error('invalid_layer');
    }
    if (!safeValue) {
      return { skipped: true, layer: safeLayer };
    }
    const key = `role.memory.${roleSlug}.${safeLayer}`;
    await this.updateKeyValue({
      wallet,
      namespaceId,
      key,
      value: safeValue,
    });
    const visible = await this.waitForNamespaceKeyVisible(namespaceId, key);
    if (!visible) {
      throw new Error(`key_not_visible:${key}`);
    }
    return { skipped: false, layer: safeLayer, key };
  };

  readStoryBlockCache = async () => {
    try {
      const exists = await RNFS.exists(STORY_BLOCK_CACHE_PATH);
      if (!exists) return null;
      const raw = await RNFS.readFile(STORY_BLOCK_CACHE_PATH, 'utf8');
      const json = JSON.parse(raw);
      if (!json || !Number.isFinite(Number(json.height))) return null;
      return { height: Number(json.height), ts: Number(json.ts) || 0 };
    } catch {
      return null;
    }
  };

  writeStoryBlockCache = async height => {
    try {
      const payload = { height: Number(height), ts: Date.now() };
      await RNFS.writeFile(STORY_BLOCK_CACHE_PATH, JSON.stringify(payload), 'utf8');
    } catch (e) {
      console.warn('Failed to write story block cache', e);
    }
  };

  getCachedOrFetchBlockHeight = async () => {
    const TTL_MS = 120000;
    const cached = await this.readStoryBlockCache();
    if (cached && Date.now() - cached.ts < TTL_MS && cached.height > 0) {
      return cached.height;
    }
    await BlueElectrum.ping();
    if (typeof BlueElectrum.waitTillConnected === 'function') {
      await BlueElectrum.waitTillConnected();
    }
    const height = await BlueElectrum.blockchainBlock_count();
    await this.writeStoryBlockCache(height);
    return height;
  };

  getFreshOrCachedBlockHeight = async () => {
    try {
      await BlueElectrum.ping();
      if (typeof BlueElectrum.waitTillConnected === 'function') {
        await BlueElectrum.waitTillConnected();
      }
      const height = await BlueElectrum.blockchainBlock_count();
      await this.writeStoryBlockCache(height);
      return Number.isFinite(Number(height)) ? Number(height) : null;
    } catch (error) {
      const cached = await this.readStoryBlockCache();
      if (cached && cached.height > 0) {
        return Number(cached.height);
      }
      console.warn('Failed to fetch fresh role story block height', error);
      return null;
    }
  };

  getBlockEstimateContext = async () => {
    const cachedBeforeFetch = await this.readStoryBlockCache();
    const fetchedHeight = await this.getFreshOrCachedBlockHeight();
    const cachedAfterFetch = await this.readStoryBlockCache();
    const activeCache = cachedAfterFetch && cachedAfterFetch.height > 0 ? cachedAfterFetch : cachedBeforeFetch;
    if (Number.isFinite(Number(fetchedHeight)) && fetchedHeight > 0) {
      const usedFreshFetch = !cachedBeforeFetch
        || !Number.isFinite(Number(cachedBeforeFetch?.height))
        || Number(cachedBeforeFetch.height) !== Number(fetchedHeight)
        || Number(cachedAfterFetch?.ts || 0) > Number(cachedBeforeFetch?.ts || 0);
      return {
        currentHeight: Number(fetchedHeight),
        currentTs: Number(activeCache?.ts || Date.now()) || Date.now(),
        source: usedFreshFetch ? 'live' : 'cache',
      };
    }
    return {
      currentHeight: null,
      currentTs: Number(activeCache?.ts || Date.now()) || Date.now(),
      source: 'none',
    };
  };

  replyWithCurrentBlock = async (opts = {}) => {
    try {
      const height = await this.getCachedOrFetchBlockHeight();
      const resultText = `Current block: ${height}`;
      if (!opts?.silent) {
        this.replyFromAgent(resultText);
      }
      return height;
    } catch (e) {
      const errText = `Failed to fetch current block: ${String(e?.message || e)}`;
      if (!opts?.silent) {
        this.replyFromAgent(errText);
      }
      console.warn('AgentChat: /block failed', e);
      return null;
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

  isRoleMenuLikeText = text => {
    const raw = String(text || '');
    const lower = raw.toLowerCase();
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const trimmedLower = normalized.toLowerCase();
    return lower.includes('[[/role')
      || lower.includes('[[/r')
      || lower.includes('[[/a')
      || lower.includes('[[/reopen')
      || trimmedLower.startsWith('/role menu')
      || trimmedLower.startsWith('role menu')
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
    const raw = String(text || '');
    if (this._suppressSystemMessages || this.isPureChatMode()) {
      const t = raw.trim().toLowerCase();
      const normalized = raw.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1').replace(/\s+/g, ' ').trim();
      const internalLike = /^\/role\b/i.test(t)
        || /checking role/i.test(t)
        || /checking model/i.test(t)
        || /select role/i.test(t)
        || /choose role/i.test(t)
        || /set model/i.test(t)
        || /choose model/i.test(t)
        || /role chat/i.test(t)
        || /^model selected(?::|\s|$)/i.test(t)
        || /^role selected(?::|\s|$)/i.test(t)
        || /restore memory/i.test(t)
        || /^\u6a21\u578b\s+/i.test(normalized)
        || /^\u8bed\u8a00\s+/i.test(normalized)
        || /^\u8bb0\u5fc6$/i.test(normalized)
        || /^\u8bed\u97f3$/i.test(normalized)
        || /^\u8bed\u97f3\u8bbe\u7f6e$/i.test(normalized)
        || /^\u6a21\u578b$/i.test(normalized)
        || /^memory$/i.test(normalized)
        || /^voice$/i.test(normalized)
        || /^voice settings$/i.test(normalized)
        || /^model$/i.test(normalized)
        || /^language\s+/i.test(normalized);
      if (internalLike) {
        return;
      }
    }
    const reply = {
      ...this.buildMessage(text, 'agent'),
      ...(options || {}),
      _useSatoshiAvatar: Boolean(options?._useSatoshiAvatar || this._handlingCommandReply || this.isRoleMenuLikeText(text)),
    };
    this.forceScrollToBottomOnce = true;
    this.shouldScrollToEnd = true;
    this.appendMessage(reply);
    if (this.chatScope === 'role') {
      this.scheduleBottomFollow();
    }

    if (this.state.pendingReturnToRoleMenu) {
      const t = String(text || '')
        .trim()
        .toLowerCase();
      const isSelectingModelMsg = t.includes('select model:');
      if (isSelectingModelMsg) {
        return;
      }
      const isModelSelectedMsg = /^model selected(?::|\s|$)/.test(t);

      if (isModelSelectedMsg) {
        if (this.state.pendingRoleModelReturnToRole) {
          return;
        }
        if (!this.isPureChatMode()) {
          this.appendRoleCommandMessage('/role menu');
          this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, () => this.handleTriggers('/role menu', null));
        } else {
          this.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false });
        }
        return;
      }
    }

    // Story: after "model selected" -> auto /d menu
    if (this.isStoryScope) {
      const t = String(text || '')
        .trim()
        .toLowerCase();

      // Trigger when text contains "model selected" (compatible with custom/builtin)
      const isModelSelectedMsg = t.includes('model selected');

      if (isModelSelectedMsg) {
        // 1s debounce to avoid repeated hints causing chained triggers
        const now = Date.now();
        if (this._lastAutoDAt && now - this._lastAutoDAt < 1000) return;
        this._lastAutoDAt = now;

        // Do not append a user message "/d"; go back to the /d menu directly
        requestAnimationFrame(() => this.handleDestinyCommand('menu'));
      }
    }
  };

  replyFromAgentSeedCard = (text, copyText, linkLabel = this.getRoleUiText('copyFullDestinySeedCard')) => {
    const reply = {
      ...this.buildMessage(text, 'agent'),
      copyText,
      linkLabel,
      _useSatoshiAvatar: Boolean(this._handlingCommandReply || this.isRoleMenuLikeText(text)),
    };
    this.appendMessage(reply);
  };

  formatSubmitTitle = () => {
    return timeConverter(Math.floor(Date.now() / 1000));
  };

  openLocalRoleFile = async rawPath => {
    const path = String(rawPath || '').trim();
    if (!path) return false;
    const normalizedPath = path.replace(/^file:\/\//i, '');
    try {
      const exists = await RNFS.exists(normalizedPath);
      if (!exists) return false;
      const opener = NativeModules?.RoleExportOpen;
      if (opener && typeof opener.openFile === 'function') {
        await opener.openFile(normalizedPath);
        return true;
      }
      const fileUrl = path.startsWith('file://') ? path : `file://${normalizedPath}`;
      const canOpen = await Linking.canOpenURL(fileUrl);
      if (canOpen) {
        await Linking.openURL(fileUrl);
        return true;
      }
    } catch (error) {
      console.warn('Failed to open local role file', { path, error });
    }
    Clipboard.setString(path);
    this.replyFromAgent(this.getRoleUiText('exportFileCopied', { path }));
    return true;
  };

  handleMessagePress = async messageText => {
    const text = String(messageText || '').trim();
    if (!text) {
      return;
    }

    const exportMatch = /^\u5bfc\u51fa\u8bb0\u5f55\u6210\u529f[:：]\s*(.+)$/i.exec(text);
    if (exportMatch && exportMatch[1]) {
      const rawPath = String(exportMatch[1] || '').trim();
      const normalizedPath = rawPath.replace(/^file:\/\//i, '');
      if (await this.openLocalRoleFile(normalizedPath)) {
        return;
      }
    }

    Clipboard.setString(text);
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
    const currentLabel = currentCode ? getStoryLangLabel(currentCode) : '';
    const current = currentCode
      ? this.getStoryMenuText('currentLanguage', { label: currentLabel, code: currentCode })
      : this.getStoryMenuText('currentLanguageNotSet');

    const commonLines = [];
    const commonItems = this.getCommonStoryLangItems();
    for (let i = 0; i < commonItems.length; i += 3) {
      commonLines.push(commonItems.slice(i, i + 3).map(item => `[[/lang ${item.code}|${item.label}]]`).join('   '));
    }
    commonLines.push(`[[/lang other|${this.getStoryMenuText('moreLanguages')}]]`);

    return [
      this.getStoryMenuText('langMenuTitle', { current }),
      '',
      this.getStoryMenuText('supportedLangs'),
      '',
      commonLines.join('\n\n'),
    ].join('\n');
  };

  getSupportedStoryLangListMessage = (items = STORY_SUPPORTED_LANGS) => {
    const normalizedItems = (items || []).map(item => (item && item.code ? item : null)).filter(Boolean);
    const groups = [];

    for (let i = 0; i < normalizedItems.length; i += 3) {
      groups.push(normalizedItems.slice(i, i + 3));
    }

    const lines = [this.getStoryMenuText('supportedLangs'), ''];
    groups.forEach((group, index) => {
      lines.push(group.map(item => `[[/lang ${item.code}|${item.label}]]`).join('   '));
      if (index !== groups.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n');
  };

  getCommonStoryLangItems = () => {
    const itemMap = new Map((STORY_SUPPORTED_LANGS || []).map(item => [item.code, item]));
    return STORY_COMMON_LANG_CODES.map(code => itemMap.get(code)).filter(Boolean);
  };

  getMoreStoryLangItems = () => {
    const commonCodes = new Set(this.getCommonStoryLangItems().map(item => item.code));
    return (STORY_SUPPORTED_LANGS || []).filter(item => item && item.code && !commonCodes.has(item.code));
  };

  isPureChatMode = () => this.props.navigation?.state?.params?.pureChatMode === true;

  appendStoryCommandMessage = text => {
    if (this._suppressSystemMessages || this.isPureChatMode()) {
      return;
    }
    this.forceScrollToBottomOnce = true;
    this.shouldScrollToEnd = true;
    this.appendMessage({
      ...this.buildMessage(text, 'agent'),
      _useSatoshiAvatar: true,
    }, 'user', {
      _renderMode: 'commands',
      _localOnly: true,
      _useSatoshiAvatar: true,
    });
    if (this.chatScope === 'role') {
      this.scheduleBottomFollow();
    }
  };

  getRoleLangCode = () => {
    const code = this.state.roleLangCode;
    if (!code) return null;
    return normalizeStoryLangCode(code);
  };

  getRoleLocale = () => normalizeStoryLangCode(this.getRoleLangCode() || 'en');

  getRoleLocalizedText = (messagesByLocale, key, vars = {}) => {
    const table = getRoleLocaleTable(messagesByLocale, this.getRoleLocale());
    let text = (table && table[key]) || (messagesByLocale?.en && messagesByLocale.en[key]) || '';
    Object.keys(vars).forEach(k => {
      text = text.replace(new RegExp(`\{${k}\}`, 'g'), String(vars[k]));
    });
    return text;
  };

  getRoleMenuText = (key, vars = {}) => this.getRoleLocalizedText(STORY_MENU_MESSAGES, key, vars);

  getRoleUiText = (key, vars = {}) => this.getRoleLocalizedText(ROLE_UI_MESSAGES, key, vars);


  setRoleLangCode = async code => {
    const normalized = normalizeStoryLangCode(code);
    await AsyncStorage.setItem(getRoleLangStorageKey(this.agentId), normalized);
    await new Promise(resolve => this.setState({ roleLangCode: normalized }, resolve));
    await this.writeRoleLanguageFile(this.activeRoleSlug || this.state.activeRoleSlug || this.getSpaceRoleKey(), normalized);
  };

  restoreLastSelectedRole = async () => {
    try {
      const raw = await AsyncStorage.getItem(getRoleLastSelectedStorageKey(this.agentId));
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && obj.roleName) {
        await new Promise(resolve => this.setState({ lastSelectedRole: obj }, resolve));
      }
    } catch (error) {
      console.warn('[agentrole] restoreLastSelectedRole failed', error);
    }
  };

  saveLastSelectedRole = async roleName => {
    const obj = { roleName: String(roleName || '').trim(), updatedAt: Date.now() };
    if (!obj.roleName) return;
    await AsyncStorage.setItem(getRoleLastSelectedStorageKey(this.agentId), JSON.stringify(obj));
    await new Promise(resolve => this.setState({ lastSelectedRole: obj }, resolve));
  };

  clearLastSelectedRole = async () => {
    await AsyncStorage.removeItem(getRoleLastSelectedStorageKey(this.agentId));
    await new Promise(resolve => this.setState({ lastSelectedRole: null }, resolve));
  };

  restoreActiveRoleState = async () => {
    try {
      const exists = await RNFS.exists(this.currentRolePath);
      if (!exists) return;
      const raw = await RNFS.readFile(this.currentRolePath, 'utf8');
      const obj = JSON.parse(raw);
      if (obj && obj.roleName) {
        this.activeRoleSlug = obj.roleSlug || Rolecards.normalizeRoleSlug(obj.roleName) || null;
        await new Promise(resolve =>
          this.setState({ activeRoleState: obj, activeRoleSlug: this.activeRoleSlug || null }, resolve),
        );
      }
    } catch {}
  };

  restoreCurrentSummonedRole = async () => {
    try {
      const exists = await RNFS.exists(this.currentRolePath);
      if (!exists) return;
      const raw = await RNFS.readFile(this.currentRolePath, 'utf8');
      const obj = JSON.parse(raw);
      if (obj && obj.roleName) {
        await new Promise(resolve => this.setState({ currentSummonedRole: obj }, resolve));
      }
    } catch {}
  };

  saveActiveRoleState = async (roleName, roleSlug = null) => {
    const name = String(roleName || '').trim();
    if (!name) return;
    const resolvedRoleSlug = this.getSpaceRoleKey();
    const obj = {
      roleName: name,
      roleSlug: resolvedRoleSlug,
      roleCardPath: resolvedRoleSlug ? this.getRoleCardPath(resolvedRoleSlug) : null,
      updatedAt: Date.now(),
    };
    try {
      await this.ensureRoleFilesDir();
      await RNFS.writeFile(this.currentRolePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch {}
    this.activeRoleSlug = obj.roleSlug || null;
    await new Promise(resolve => this.setState({ activeRoleState: obj, activeRoleSlug: obj.roleSlug || null }, resolve));
  };

  clearActiveRoleState = async () => {
    try {
      const exists = await RNFS.exists(this.currentRolePath);
      if (exists) {
        await RNFS.unlink(this.currentRolePath);
      }
    } catch {}
    this.activeRoleSlug = null;
    await new Promise(resolve => this.setState({ activeRoleState: null, activeRoleSlug: null }, resolve));
  };

  saveCurrentSummonedRole = async (roleName, roleSlug = null) => {
    const name = String(roleName || '').trim();
    if (!name) return;
    const resolvedRoleSlug = this.getSpaceRoleKey();
    const obj = {
      roleName: name,
      roleSlug: resolvedRoleSlug,
      roleCardPath: resolvedRoleSlug ? this.getRoleCardPath(resolvedRoleSlug) : null,
      updatedAt: Date.now(),
    };
    try {
      await this.ensureRoleFilesDir();
      await RNFS.writeFile(this.currentRolePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch {}
    await new Promise(resolve => this.setState({ currentSummonedRole: obj }, resolve));
  };

  clearCurrentSummonedRole = async () => {
    try {
      const exists = await RNFS.exists(this.currentRolePath);
      if (exists) {
        await RNFS.unlink(this.currentRolePath);
      }
    } catch {}
    await new Promise(resolve => this.setState({ currentSummonedRole: null }, resolve));
  };

  clearAllRoleDatas = async () => {
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return false;
      const roleDirExists = await RNFS.exists(this.roleFilesDir);
      if (roleDirExists) {
        const entries = await RNFS.readDir(this.roleFilesDir);
        for (const entry of entries) {
          if (entry.isDirectory()) {
            try { await RNFS.unlink(entry.path); } catch {}
            continue;
          }
          if (entry.isFile() && entry.name.endsWith('.json')) {
            try { await RNFS.unlink(entry.path); } catch {}
          }
        }
      }
      const chatDirExists = await RNFS.exists(this.agentChatDir);
      if (chatDirExists) {
        const entries = await RNFS.readDir(this.agentChatDir);
        for (const entry of entries) {
          if (entry.isFile() && /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name)) {
            try { await RNFS.unlink(entry.path); } catch {}
          }
        }
        const digestDir = `${this.agentChatDir}/digest`;
        const digestExists = await RNFS.exists(digestDir);
        if (digestExists) {
          const digestEntries = await RNFS.readDir(digestDir);
          for (const entry of digestEntries) {
            if (entry.isFile() && /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name)) {
              try { await RNFS.unlink(entry.path); } catch {}
            }
          }
        }
      }
      await this.writeRoleIndex([]);
      await AsyncStorage.removeItem(getRoleLangStorageKey(this.agentId));
      await this.clearLastSelectedRole();
      await this.clearActiveRoleState();
      await this.clearCurrentSummonedRole();
      await this.clearPendingNewRole();
      this.activeRoleSlug = null;
      this.loadedDateKeys = [];
      this.allDateKeys = [];

      const initMessage = this.buildMessage('Role data initialized.', 'agent');
      const todayKey = getLocalDateKey(initMessage.timestamp);
      await this.writeDayMessages(todayKey, [initMessage]);

      await new Promise(resolve => this.setState({
        allMessages: [initMessage],
        messages: [initMessage],
        digestMessages: [],
        roleLangCode: null,
        roleCardOffset: 0,
        roleCardPage: [],
        pendingMemoryAdjust: false,
        pendingMemoryRoleSlug: null,
        pendingMemoryAdjustDraft: null,
        pendingMemoryAdjustLayer: null,
        pendingMemoryDeleteConfirm: false,
        pendingMemoryDeleteRoleSlug: null,
        pendingRoleSuggest: false,
        pendingRoleSuggestOriginal: '',
        pendingRoleSuggestOptions: [],
        pendingRoleFragmentImport: false,
      pendingRoleStoryFragmentImport: false,
        pendingRoleCall: false,
        pendingDuplicateRoleName: null,
      }, resolve));
      await this.handleTriggers('/role', null);
      return true;
    } catch (error) {
      this.replyFromAgent(`Clear role datas failed:\n${String(error?.message || error || 'unknown error')}`);
      return false;
    }
  };

  confirmClearRoleDatas = () => {
    Alert.alert(
      'Initialize role data?',
      'This will clear current role state, role index, and all role cards.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear role datas', style: 'destructive', onPress: () => this.clearAllRoleDatas() },
      ],
    );
  };

  setPendingNewRole = async roleName => {
    const name = String(roleName || '').trim();
    if (!name) return false;
    await AsyncStorage.setItem(getRolePendingNewStorageKey(this.agentId), name);
    await new Promise(resolve => this.setState({ pendingNewRole: name }, resolve));
    return true;
  };

  showRoleDuplicateMenu = async name => {
    await new Promise(resolve => this.setState({ pendingDuplicateRoleName: name }, resolve));
    const lines = [
      this.getRoleUiText('roleName', { name }),
      '',
      this.getRoleUiText('roleAlreadyExists'),
      '',
      `[[/role summon ${name}|${this.getRoleUiText('yes')}]]`,
      '',
      `[[/role clear|${this.getRoleUiText('no')}]]`,
    ];
    this.replyFromAgent(lines.join('\n'));
  };

  clearPendingNewRole = async () => {
    await AsyncStorage.removeItem(getRolePendingNewStorageKey(this.agentId));
    await new Promise(resolve => this.setState({ pendingNewRole: null }, resolve));
  };

  getPendingNewRole = async () => {
    const inState = String(this.state.pendingNewRole || '').trim();
    if (inState) return inState;
    const stored = await AsyncStorage.getItem(getRolePendingNewStorageKey(this.agentId));
    return String(stored || '').trim();
  };

  getRandomRoleFallbackPool = roleLang => {
    const normalized = String(roleLang || 'en').toLowerCase();
    const pools = {
      'zh-cn': [
        '灰烬', '岚', '镜', '青岚', '星砂', '雾灯', '空河', '夜弦', '白鹭', '玄枝',
        '云栖', '烛影', '墨衡', '霜河', '归鸿', '潮生', '星澜', '听雪', '远舟', '青砚',
      ],
      'zh-tw': [
        '灰燼', '嵐', '鏡', '青嵐', '星砂', '霧燈', '空河', '夜弦', '白鷺', '玄枝',
        '雲棲', '燭影', '墨衡', '霜河', '歸鴻', '潮生', '星瀾', '聽雪', '遠舟', '青硯',
      ],
      ja: [
        'アカリ', 'ハル', 'ミオ', 'ソラ', 'レン', 'ユイ', 'カイ', 'ナギ', 'シオン', 'ツバキ',
        'ホタル', 'ルカ', 'アオイ', 'ヒナタ', 'ユキ', 'セナ', 'リツ', 'マコト', 'カナメ', 'ミズキ',
      ],
      ko: [
        '하린', '서윤', '도윤', '지우', '민준', '유나', '시온', '아린', '태오', '나린',
        '하늘', '별하', '서하', '이안', '유진', '라온', '지안', '도하', '가온', '수아',
      ],
      es: [
        'Luna', 'Sol', 'Nilo', 'Ari', 'Vega', 'Noa', 'Iria', 'Leo', 'Mara', 'Senda',
        'Brisa', 'Nara', 'Elio', 'Alba', 'Río', 'Cielo', 'Nube', 'Luz', 'Sombra', 'Aren',
      ],
      fr: [
        'Lune', 'Étoile', 'Noé', 'Mira', 'Élan', 'Aube', 'Ciel', 'Rune', 'Iris', 'Sable',
        'Brume', 'Lior', 'Nacre', 'Solène', 'Éole', 'Nuit', 'Azur', 'Clair', 'Ondine', 'Rive',
      ],
      en: [
        'Ashen', 'Mira', 'Kite', 'Lumen', 'Nyra', 'Aster', 'Sable', 'Iris', 'Rune', 'Vera',
        'Ember', 'Nova', 'Orion', 'Lyra', 'Vale', 'Echo', 'Riven', 'Sora', 'Halo', 'Wren',
      ],
    };
    return pools[normalized] || pools.en;
  };

  generateRandomRoleName = async () => {
    const roleLang = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
    const fallbackPool = this.getRandomRoleFallbackPool(roleLang);
    const used = new Set();
    try {
      const index = await this.getReconciledRoleIndex();
      (index || []).forEach(item => {
        const raw = String(item?.roleName || item?.roleSlug || '').trim().toLowerCase();
        if (raw) used.add(raw);
      });
    } catch {}

    const pickFallback = () => {
      const available = fallbackPool.filter(name => !used.has(String(name).trim().toLowerCase()));
      const pool = available.length ? available : fallbackPool;
      return pool[Math.floor(Math.random() * pool.length)] || 'Mira';
    };

    const hasLLM = !!this.state.llmConfig?.provider && typeof this.callLLMSilent === 'function';
    if (!hasLLM) {
      return pickFallback();
    }

    try {
      const index = await this.getReconciledRoleIndex();
      const recentNames = (index || []).slice(0, 12).map(item => String(item?.roleName || item?.roleSlug || '').trim()).filter(Boolean);
      const prompt = `Generate exactly ONE short role name for xKEVA role summon.\nLanguage: ${roleLang}\nRequirements:\n- short and memorable\n- suitable for role creation\n- avoid duplicates with existing names\n- output name only, no quotes, no explanation\nExisting names:\n${recentNames.join(', ') || '(none)'}`;
      const raw = String(await this.callLLMSilent(prompt) || '').trim().split(/\r?\n/)[0].trim();
      const cleaned = raw.replace(/^[-*\d.\s"'`]+/, '').replace(/["'`]/g, '').trim();
      const safe = Rolecards.normalizeRoleSlug(cleaned) ? cleaned : '';
      if (safe && !used.has(safe.trim().toLowerCase())) {
        return safe;
      }
    } catch {}

    return pickFallback();
  };

  buildRoleSummonPromptMessage = () => {
    const prompt = String(this.getRoleUiText('summonPrompt') || '').trim();
    const label = String(this.getRoleUiText('randomSummon') || '').trim();
    if (!prompt || !label) {
      return prompt;
    }
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return prompt
      .replace(new RegExp(`\\s*(?:,|，|、)?\\s*(?:or|或|或者)?\\s*${escapedLabel}\\s*[。.!！?？]?`, 'i'), '')
      .replace(/(?:,|，|、|;|；|or|或|或者)\s*[。.!！?？]?$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  showRoleCreateWizard = async () => {
    const sampleName = 'MyRole';
    const lines = [
      this.getRoleUiText('createRoleTitle'),
      '',
      this.buildRoleSummonPromptMessage(),
      '',
      this.getRoleUiText('example'),
      `[[/role new|${this.getRoleUiText('useName', { name: sampleName })}]]`,
      '',
      `[[/role clear|${this.getRoleUiText('cancel')}]]`,
    ];
    this.replyFromAgent(lines.join('\n'));
  };

  showRoleCreateConfirm = async name => {
    const roleSlug = Rolecards.normalizeRoleSlug(name) || null;
    const existing = roleSlug ? await this.readRoleFile(roleSlug) : null;
    if (existing) {
      await this.showRoleDuplicateMenu(name);
      return;
    }

    const lines = [
      this.getRoleUiText('roleName', { name }),
      '',
      this.getRoleUiText('confirmSelectRole'),
      '',
      `[[/role summon ${name}|${this.getRoleUiText('confirm')}]]`,
      '',
      `[[/role new|${this.getRoleUiText('change')}]]`,
      '',
      `[[/role clear|${this.getRoleUiText('resummon')}]]`,
    ];
    this.replyFromAgent(lines.join('\n'));
  };

  beginRoleCreateConfirmFlow = async name => {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
      await this.handleTriggers('/role new', null);
      return false;
    }
    const ok = await this.setPendingNewRole(normalizedName);
    if (!ok) {
      await this.handleTriggers('/role new', null);
      return false;
    }
    await this.showRoleCreateConfirm(normalizedName);
    return true;
  };

  finalizeRoleActivation = async ({ name, roleSlug, refreshedCards = null, clearDuplicate = true } = {}) => {
    await this.saveLastSelectedRole(name);
    await this.saveActiveRoleState(name, roleSlug);
    await this.saveCurrentSummonedRole(name, roleSlug);
    await new Promise(resolve =>
      this.setState(
        {
          activeRoleSlug: roleSlug,
          roleCardOffset: refreshedCards ? 0 : this.state.roleCardOffset,
          roleCardPage: refreshedCards ? refreshedCards.items : this.state.roleCardPage,
          pendingDuplicateRoleName: clearDuplicate ? null : this.state.pendingDuplicateRoleName,
        },
        resolve,
      ),
    );
    await this.clearPendingNewRole();
    await this.waitAfterRoleSummonLoading(2000);
    this.replyFromAgent(this.buildRoleSummonSuccessMessage(name), { _useSatoshiAvatar: true });
    await this.waitAfterRoleSummonSuccess(1000);
    if (!this.isPureChatMode()) {
      await this.handleTriggers('/role menu', null);
    }
    await this.handleTriggers('/role chat', null);
  };

  createGeneratedRoleAndActivate = async name => {
    await this.replyRoleSummonRitual();
    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
      await this.handleTriggers('/role new', null);
      return false;
    }
    const roleSlug = this.getSpaceRoleKey();
    const roleModelStatus = await this.ensureRoleModelReady({ source: this.roleEntrySource || 'role' });
    if (!roleModelStatus?.ok) {
      return false;
    }
    const now = Date.now();
    const existingRoleData = await this.readRoleFile(roleSlug);
    let readyRoleData = existingRoleData;
    if (!readyRoleData) {
      const initialMemoryBundle = await this.buildValidatedInitialRoleMemory(normalizedName);
      const normalizedInitialMemory = this.normalizeMemoryCardText(initialMemoryBundle?.memory || '');
      const writeOk = await this.writeRoleFile(roleSlug, {
        roleName: normalizedName,
        roleSlug,
        memory: normalizedInitialMemory,
        initialMemory: this.normalizeMemoryCardText(initialMemoryBundle?.initialMemory || normalizedInitialMemory),
        memoryLayers: initialMemoryBundle?.memoryLayers,
        initialMemoryLayers: initialMemoryBundle?.initialMemoryLayers,
        generationStatus: initialMemoryBundle?.generationStatus || 'validated',
        memorySeed: initialMemoryBundle?.memorySeed || null,
        createdAt: now,
        updatedAt: now,
      });
      readyRoleData = writeOk ? await this.readRoleFile(roleSlug) : null;
      if (!writeOk || !readyRoleData) {
        this.replyFromAgent('(role summon failed: memory card not ready)');
        return false;
      }
      try {
        await this.writeRoleRecoveryBaseline(roleSlug);
      } catch (error) {
        console.warn('Failed to write recovery baseline', { roleSlug, error });
      }
    }
    await this.upsertRoleIndexEntry({ roleName: normalizedName, roleSlug, updatedAt: readyRoleData?.updatedAt || now });
    const refreshedCards = await this.loadLocalRoleCardsPage(0);
    await this.finalizeRoleActivation({ name: normalizedName, roleSlug, refreshedCards, clearDuplicate: true });
    return true;
  };

  getRoleLangMenuMessage = () => {
    const currentCode = this.getRoleLangCode();
    const unsetLabel = String(this.getRoleMenuText('currentLanguageNotSet') || 'Not set').replace(/^.*?[:：]\s*/, '') || 'Not set';
    const current = currentCode ? getStoryLangLabel(currentCode) : unsetLabel;
    const commonItems = this.getCommonStoryLangItems();
    const commonLines = [];
    for (let i = 0; i < commonItems.length; i += 3) {
      commonLines.push(commonItems.slice(i, i + 3).map(item => `[[/role lang ${item.code}|${item.label}]]`).join('   '));
    }
    commonLines.push(`[[/role lang other|${this.getRoleMenuText('moreLanguages')}]]`);
    const lines = [
      `[[/role lang list|${this.getRoleMenuText('changeLanguage')}]]  ${current}`,
      '',
      this.getRoleMenuText('supportedLangs'),
      '',
      commonLines.join('\n\n'),
    ];
    return lines.join('\n');
  };

  getRoleMoreLangMenuMessage = () => {
    const items = this.getMoreStoryLangItems();
    const currentCode = this.getRoleLangCode();
    const unsetLabel = String(this.getRoleMenuText('currentLanguageNotSet') || 'Not set').replace(/^.*?[:：]\s*/, '') || 'Not set';
    const current = currentCode ? getStoryLangLabel(currentCode) : unsetLabel;
    const lines = [`[[/role lang list|${this.getRoleMenuText('changeLanguage')}]]  ${current}`, '', this.getRoleMenuText('supportedLangs'), ''];
    for (let i = 0; i < items.length; i += 3) {
      lines.push(items.slice(i, i + 3).map(item => `[[/role lang ${item.code}|${item.label}]]`).join('   '));
      if (i + 3 < items.length) {
        lines.push('');
      }
    }
    return lines.join('\n');
  };

  buildRoleLangStatusMessage = () => {
    const code = this.getRoleLangCode();
    const label = getStoryLangLabel(code || 'en');

    return `[[/role lang list|${this.getRoleMenuText('changeLanguage')}]]  ${label}`;
  };

  buildRoleMenuMessage = async () => {
    const roleData = await this.readRoleFile(this.getSpaceRoleKey());
    const hasRole = !!roleData;
    const primaryCommand = hasRole ? '/role memory' : '/role new';
    const primaryLabel = hasRole ? this.getRoleUiText('memory') : this.getRoleUiText('startSummon');
    const lines = [
      `[[${primaryCommand}|${primaryLabel}]]`,
      '',
    ];
    if (!hasRole) {
      lines.push(`[[/role random|${this.getRoleUiText('randomSummon')}]]`);
      lines.push('');
      lines.push(`[[/role memory rebuild|${this.getRoleUiText('restoreMemoryMenu')}]]`);
      lines.push('');
    }
    lines.push(`[[/role story|${this.getRoleUiText('storyMenu')}]]`);
    lines.push('');
    lines.push(`[[/role talkmenu|${this.getRoleUiText('voiceMenu')}]]`);
    lines.push('');
    lines.push(`[[/rolemodel|${this.getRoleMenuText('changeModel')}]]`);
    lines.push('');
    return lines.join('\n');
  };

  getStoryChatDir = () => getStoryChatDirHelper(this.agentId, CHAT_DIR);

  getRoleStoryChoicesPath = () => getRoleStoryChoicesPathHelper(this.agentId, CHAT_DIR);

  getRoleCurrentStoryPath = () => getRoleCurrentStoryPathHelper(this.agentId, CHAT_DIR);

  getRoleCurrentStorySummaryPath = () => getRoleCurrentStorySummaryPathHelper(this.agentId, CHAT_DIR);

  openRoleStorySpace = async extraParams => openRoleStorySpaceHelper({
    persistLastSpaceShortcut: this.persistLastSpaceShortcut,
    navigation: this.props.navigation,
    extraParams,
  });

  exportRoleStoryRecord = async () => {
    const hasCurrentStory = await this.hasRoleCurrentStory();
    if (!hasCurrentStory) {
      this.replyFromAgent(this.getRoleUiText('storyReaderEmpty') || '(no story content available)');
      return null;
    }
    const params = this.props.navigation?.state?.params || {};
    const roleNameForFile = await this.getCurrentRoleNameForStoryExplore().catch(() => '');
    const result = await exportRoleStoryRecordHelper({
      namespace: {
        namespaceId: params.namespaceId,
        shortCode: params.shortCode,
        displayName: params.displayName,
        exportDisplayName: roleNameForFile,
      },
    });
    const filePath = String(result?.filePath || '').trim();
    if (filePath) {
      this._lastExportedStoryRecordPath = filePath;
      const successText = this.getRoleUiText('storyExportSuccess', { path: filePath }) || `Story saved: ${filePath}`;
      this.replyFromAgent(`${successText}\n\n[[/role openstoryexport|${this.getRoleUiText('openRecord')}]]\n\n${await this.buildRoleStoryMenuMessage()}`);
    }
    return result;
  };

  hasRoleCurrentStory = async () => {
    const messages = await this.readRoleCurrentStoryMessages();
    return messages.some(message => String(message?.text || '').trim());
  };

  importRoleStoryRecord = async () => {
    const params = this.props.navigation?.state?.params || {};
    return importRoleStoryRecordHelper({
      namespace: {
        namespaceId: params.namespaceId,
        shortCode: params.shortCode,
        displayName: params.displayName,
      },
      onOpenStory: () => this.openRoleStorySpace(),
    });
  };

  confirmClearRoleStoryRecord = async () => {
    const hasCurrentStory = await this.hasRoleCurrentStory();
    if (!hasCurrentStory) {
      this.replyFromAgent(this.getRoleUiText('storyReaderEmpty') || '(no story content available)');
      return false;
    }

    Alert.alert(
      this.getRoleUiText('deleteStoryTitle') || 'Delete story?',
      this.getRoleUiText('deleteStoryPrompt') || 'This will clear current story data and local story cache. A story snapshot will be created before clearing.',
      [
        { text: this.getRoleUiText('cancel') || 'Cancel', style: 'cancel' },
        {
          text: this.getRoleUiText('deleteStoryConfirm') || this.getRoleUiText('deleteStory') || 'Delete story',
          style: 'destructive',
          onPress: async () => {
            try {
              await createRoleStorySnapshot(this);
            } catch (error) {
              console.warn('Failed to capture story snapshot before clear', error);
              Alert.alert(
                this.getRoleUiText('storySnapshotFailed', { error: String(error?.message || error || 'unknown') }) || 'Story snapshot failed',
                this.getRoleUiText('deleteStorySnapshotRequired') || 'Story was not deleted because the backup snapshot failed.',
              );
              return;
            }
            await this.openRoleStorySpace({
              clearStoryOnMount: true,
              suppressAutoLinkStart: true,
            });
          },
        },
      ],
    );
    return true;
  };

  getRoleStoryCloneDir = () => getStoryCloneDir(this.getStoryChatDir());

  buildRoleStoryClonePrompt = async () => {
    const currentStoryState = await this.readRoleCurrentStoryState();
    const messages = Array.isArray(currentStoryState?.messages) ? currentStoryState.messages : [];
    const choices = Array.isArray(currentStoryState?.lastChoiceSet) ? currentStoryState.lastChoiceSet : [];
    return buildOfflineStoryClonePrompt({
      messages,
      choices,
      agentId: this.agentId || 'unknown',
      roleName: currentStoryState?.roleName || this.state.currentRoleName || '',
      fallbackRoleName: 'This role',
      langCode: this.getRoleLangCode?.() || this.state.roleLangCode || this.getStoryLangCode?.() || 'en',
      storySessionId: currentStoryState?.storySessionId || '',
      storyState: currentStoryState,
      title: this.getRoleUiText('cloneStoryPromptTitle') || 'xKEVA Agentstory offline clone prompt',
      stripStoryChoiceLines: stripStoryChoiceLinesFromText,
      cleanStoryChoiceLabel: text => String(text || '').replace(/^\s*\d+[.)、:-]?\s*/, '').trim(),
    });
  };

  cloneRoleStoryRecord = async () => {
    const promptText = await this.buildRoleStoryClonePrompt();
    if (!promptText) {
      this.replyFromAgent(this.getRoleUiText('storyReaderEmpty') || 'No story content available.');
      return null;
    }
    try {
      const cloneDir = this.getRoleStoryCloneDir();
      await RNFS.mkdir(cloneDir);
      const filename = buildStoryCloneFilename(Date.now());
      const path = `${cloneDir}/${filename}`;
      await RNFS.writeFile(path, promptText, 'utf8');
      this._lastStoryClonePath = path;
      const messageText = this.getRoleUiText('cloneStoryGenerated', { path }) || `Clone file generated:\n${path}`;
      this.replyFromAgent(`${messageText}\n\n[[/role openstoryclone ${path}|${this.getRoleUiText('openRecord')}]]      [[/role copystoryclone ${path}|${this.getRoleUiText('copyClonePrompt') || 'Copy prompt'}]]`);
      return path;
    } catch (error) {
      console.warn('Failed to generate role story clone prompt', error);
      this.replyFromAgent(this.getRoleUiText('cloneStoryFailed') || 'Failed to generate clone file.');
      return null;
    }
  };

  cloneRoleMemoryRecord = async active => {
    const roleRef = active || (await this.getCurrentRoleMemoryTarget());
    if (!roleRef) {
      this.replyFromAgent(this.getRoleUiText('noActiveRole'));
      return null;
    }
    const summary = await this.readConversationSummary(roleRef.roleSlug);
    const promptText = buildRoleMemoryClonePrompt({
      roleRef,
      summary,
      roleLangCode: this.getRoleLangCode?.() || this.state.roleLangCode || 'en',
    });
    if (!promptText) {
      this.replyFromAgent(this.getRoleUiText('cloneMemoryEmpty') || '(no memory content available)');
      return null;
    }
    try {
      const cloneDir = getRoleMemoryCloneDir(this.getRoleDirPath(roleRef.roleSlug));
      await RNFS.mkdir(cloneDir);
      const filename = buildRoleMemoryCloneFilename(Date.now());
      const path = `${cloneDir}/${filename}`;
      await RNFS.writeFile(path, promptText, 'utf8');
      this._lastMemoryClonePath = path;
      const messageText = this.getRoleUiText('cloneMemoryGenerated', { path }) || `Memory clone file generated:\n${path}`;
      this.replyFromAgent(`${messageText}\n\n[[/role openmemoryclone ${path}|${this.getRoleUiText('openRecord')}]]      [[/role copymemoryclone ${path}|${this.getRoleUiText('copyClonePrompt') || 'Copy prompt'}]]`);
      return path;
    } catch (error) {
      console.warn('Failed to generate role memory clone prompt', error);
      this.replyFromAgent(this.getRoleUiText('cloneMemoryFailed') || 'Failed to generate memory clone file.');
      return null;
    }
  };

  buildRoleStoryMenuMessage = async () => {
    const hasChoices = await RNFS.exists(this.getRoleStoryChoicesPath());
    const hasCurrentStory = await this.hasRoleCurrentStory();
    return buildRoleStoryMenuMessageHelper({
      hasChoices,
      hasCurrentStory,
      getRoleUiText: this.getRoleUiText,
    });
  };

  buildRoleAdventureRecordsMenuMessage = async () => {
    const hasCurrentStory = await this.hasRoleCurrentStory();
    return buildRoleAdventureRecordsMenuMessageHelper({
      hasCurrentStory,
      getRoleUiText: this.getRoleUiText,
    });
  };

  readRoleCurrentStoryState = async () => {
    const path = this.getRoleCurrentStoryPath();
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      const json = JSON.parse(raw);
      return json && typeof json === 'object' ? json : null;
    } catch (error) {
      console.warn('Failed to read role current story state', { path, error });
      return null;
    }
  };

  writeRoleCurrentStoryState = async state => {
    const path = this.getRoleCurrentStoryPath();
    await RNFS.writeFile(path, JSON.stringify(state), 'utf8');
    return state;
  };

  persistRoleCurrentChoices = async choices => {
    const path = this.getRoleStoryChoicesPath();
    const safeChoices = Array.isArray(choices) ? choices.filter(Boolean) : [];
    if (!safeChoices.length) {
      const exists = await RNFS.exists(path);
      if (exists) {
        await RNFS.unlink(path).catch(() => {});
      }
      return [];
    }
    await RNFS.writeFile(path, JSON.stringify({ choices: safeChoices, updatedAt: Date.now() }), 'utf8');
    return safeChoices;
  };

  readRoleStoryJsonFile = async path => {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to read role story json file', { path, error });
      return null;
    }
  };

  writeRoleStoryJsonFile = async (path, value) => {
    await RNFS.writeFile(path, JSON.stringify(value), 'utf8');
    return value;
  };

  getRoleStoryDirPath = () => getStoryChatDirHelper(this.agentId, CHAT_DIR);

  getRoleStoryAlphaPath = () => `${this.getRoleStoryDirPath()}/alpha.json`;

  getRoleStoryCurrentAlphaLogPath = () => `${this.getRoleStoryDirPath()}/alpha_log/current_run.json`;

  truncateSwitchWorldlineStoryRuntimeFiles = async ({ keepMessages = [], targetMessage = null, currentStoryState = null } = {}) => {
    const targetTs = Number(targetMessage?.timestamp || targetMessage?.t || 0) || 0;
    const targetId = String(targetMessage?.id || '').trim();

    const restoredChoices = await this.syncRoleStoryChoicesFromMessages(keepMessages);

    const alphaLogPath = this.getRoleStoryCurrentAlphaLogPath();
    const alphaStatePath = this.getRoleStoryAlphaPath();
    const alphaLog = await this.readRoleStoryJsonFile(alphaLogPath);
    const alphaEntries = Array.isArray(alphaLog?.entries) ? alphaLog.entries : [];
    const keptAlphaEntries = targetTs > 0
      ? alphaEntries.filter(entry => Number(entry?.ts || 0) < targetTs)
      : alphaEntries;

    if (alphaLog && Array.isArray(alphaLog.entries)) {
      await this.writeRoleStoryJsonFile(alphaLogPath, {
        ...alphaLog,
        entries: keptAlphaEntries,
      });
    }

    const alphaState = await this.readRoleStoryJsonFile(alphaStatePath);
    const fallbackBaseAlpha = Number.isFinite(Number(currentStoryState?.baseAlpha))
      ? Number(currentStoryState.baseAlpha)
      : Number.isFinite(Number(alphaState?.baseAlpha))
      ? Number(alphaState.baseAlpha)
      : null;
    const restoredAlpha = keptAlphaEntries.length > 0
      ? Number(keptAlphaEntries[keptAlphaEntries.length - 1]?.alphaAfter)
      : fallbackBaseAlpha;

    if (alphaState && Number.isFinite(Number(restoredAlpha))) {
      await this.writeRoleStoryJsonFile(alphaStatePath, {
        ...alphaState,
        currentAlpha: Number(restoredAlpha),
        updatedAt: Date.now(),
      });
    }

    const lastKeptUserMessage = [...(Array.isArray(keepMessages) ? keepMessages : [])]
      .reverse()
      .find(message => String(message?.sender || '').trim().toLowerCase() === 'user');

    return {
      restoredChoices,
      restoredAlpha: Number.isFinite(Number(restoredAlpha)) ? Number(restoredAlpha) : null,
      lastKeptMessageId: String(lastKeptUserMessage?.id || targetId || ''),
      lastKeptMessageTs: Number(lastKeptUserMessage?.timestamp || lastKeptUserMessage?.t || 0) || 0,
    };
  };

  buildRoleBootstrapStoryChoices = () => [
    {
      key: '1',
      send: '1',
      label: this.getRoleUiText('storyDefaultChoiceScout'),
      source: 'bootstrap-choice-fallback',
    },
    {
      key: '2',
      send: '2',
      label: this.getRoleUiText('storyDefaultChoiceSearch'),
      source: 'bootstrap-choice-fallback',
    },
    {
      key: '3',
      send: '3',
      label: this.getRoleUiText('storyDefaultChoiceLead'),
      source: 'bootstrap-choice-fallback',
    },
  ];

  extractRoleStoryChoicesFromMessages = messages => {
    const sourceMessages = Array.isArray(messages) ? messages : [];
    for (let i = sourceMessages.length - 1; i >= 0; i -= 1) {
      const message = sourceMessages[i];
      const sender = String(message?.sender || '').trim().toLowerCase();
      if (sender !== 'agent') {
        continue;
      }
      const rawText = String(message?.text || '').trim();
      if (!rawText) {
        continue;
      }
      const choices = extractStoryChoicesFromText(rawText);
      if (choices.length > 0) {
        return choices;
      }
    }
    return [];
  };

  resolveRoleStoryChoicesForRewind = ({ messages = [], targetMessage = null } = {}) => {
    const parsedChoices = this.extractRoleStoryChoicesFromMessages(messages);
    if (parsedChoices.length > 0) {
      return parsedChoices;
    }

    const sourceMessages = Array.isArray(messages) ? messages : [];
    const hasKeptUserMessage = sourceMessages.some(message => String(message?.sender || '').trim().toLowerCase() === 'user');
    const hasKeptAgentMessage = sourceMessages.some(message => String(message?.sender || '').trim().toLowerCase() === 'agent' && String(message?.text || '').trim());
    const targetChoiceRaw = String(targetMessage?._choiceMeta?.raw || '').trim();
    const bootstrapScoutLabel = this.getRoleUiText('storyDefaultChoiceScout');
    if (!hasKeptUserMessage && hasKeptAgentMessage && targetChoiceRaw === bootstrapScoutLabel) {
      return this.buildRoleBootstrapStoryChoices();
    }

    return [];
  };

  syncRoleStoryChoicesFromMessages = async messages => {
    const choices = this.extractRoleStoryChoicesFromMessages(messages);
    await this.persistRoleCurrentChoices(choices);
    return choices;
  };

  getRoleStoryNamespace = () => {
    const params = this.props.navigation?.state?.params || {};
    return {
      namespaceId: params.namespaceId,
      shortCode: params.shortCode,
      displayName: params.displayName,
    };
  };

  readRoleStorySnapshotJson = (snapshot, relativePath, fallbackValue = null) => {
    const file = (Array.isArray(snapshot?.files) ? snapshot.files : []).find(item => String(item?.path || '') === relativePath);
    if (!file) return fallbackValue;
    try {
      return JSON.parse(String(file?.content || ''));
    } catch (error) {
      console.warn('Failed to parse role story snapshot json', { relativePath, error });
      return fallbackValue;
    }
  };

  writeRoleStorySnapshotJson = (snapshot, relativePath, value) => {
    const files = Array.isArray(snapshot?.files) ? snapshot.files.slice() : [];
    const nextContent = JSON.stringify(value);
    const index = files.findIndex(item => String(item?.path || '') === relativePath);
    const nextFile = { path: relativePath, encoding: 'utf8', content: nextContent };
    if (index >= 0) {
      files[index] = nextFile;
    } else {
      files.push(nextFile);
      files.sort((a, b) => String(a?.path || '').localeCompare(String(b?.path || '')));
    }
    return {
      ...(snapshot || {}),
      files,
      storage: {
        ...(snapshot?.storage || {}),
        fileCount: files.length,
      },
    };
  };

  removeRoleStorySnapshotFile = (snapshot, relativePath) => {
    const files = (Array.isArray(snapshot?.files) ? snapshot.files : []).filter(item => String(item?.path || '') !== relativePath);
    return {
      ...(snapshot || {}),
      files,
      storage: {
        ...(snapshot?.storage || {}),
        fileCount: files.length,
      },
    };
  };

  truncateSwitchWorldlineFromMessage = async targetItem => {
    const targetId = String(targetItem?.id || '').trim();
    if (!targetId) {
      return false;
    }
    const namespace = this.getRoleStoryNamespace();
    const snapshot = await buildStoryRecordSnapshot(namespace);
    const currentStoryState = this.readRoleStorySnapshotJson(snapshot, 'current_story.json', null);
    const sourceMessages = Array.isArray(currentStoryState?.messages) ? currentStoryState.messages : [];
    const targetIndex = sourceMessages.findIndex(message => String(message?.id || '').trim() === targetId);
    if (targetIndex < 0) {
      Alert.alert(this.getRoleUiText('storySwitchWorldlineFailedTitle'), this.getRoleUiText('storySwitchWorldlineNotFound'));
      return false;
    }

    const targetMessage = sourceMessages[targetIndex] || null;
    const truncatedMessages = sourceMessages.slice(0, targetIndex);
    const restoredChoices = this.resolveRoleStoryChoicesForRewind({
      messages: truncatedMessages,
      targetMessage,
    });
    const lastKeptUserMessage = [...truncatedMessages]
      .reverse()
      .find(message => String(message?.sender || '').trim().toLowerCase() === 'user');

    const alphaLog = this.readRoleStorySnapshotJson(snapshot, 'alpha_log/current_run.json', null);
    const alphaEntries = Array.isArray(alphaLog?.entries) ? alphaLog.entries : [];
    const targetTs = Number(targetMessage?.timestamp || targetMessage?.t || 0) || 0;
    const keptAlphaEntries = targetTs > 0
      ? alphaEntries.filter(entry => Number(entry?.ts || 0) < targetTs)
      : alphaEntries;
    const alphaState = this.readRoleStorySnapshotJson(snapshot, 'alpha.json', null);
    const fallbackBaseAlpha = Number.isFinite(Number(currentStoryState?.baseAlpha))
      ? Number(currentStoryState.baseAlpha)
      : Number.isFinite(Number(alphaState?.baseAlpha))
      ? Number(alphaState.baseAlpha)
      : null;
    const restoredAlpha = keptAlphaEntries.length > 0
      ? Number(keptAlphaEntries[keptAlphaEntries.length - 1]?.alphaAfter)
      : fallbackBaseAlpha;

    const shouldWaitForChoice = restoredChoices.length > 0;
    const hasKeptUserTurn = !!lastKeptUserMessage;
    const nextStoryState = {
      ...(currentStoryState || {}),
      messages: truncatedMessages,
      lastChoiceSet: restoredChoices,
      awaitingChoice: shouldWaitForChoice,
      shouldResumeGeneration: false,
      status: shouldWaitForChoice ? 'waiting_user' : truncatedMessages.length > 0 ? 'exploring' : 'idle',
      phase: truncatedMessages.length > 0 ? 'exploring' : 'boot',
      entryMode: hasKeptUserTurn ? 'continue' : 'new',
      lastSubmittedChoiceAt: Number(lastKeptUserMessage?.timestamp || lastKeptUserMessage?.t || 0) || 0,
      lastSubmittedChoiceUserMessageId: String(lastKeptUserMessage?.id || ''),
      lastAutoFallbackReplyId: '',
      currentAlpha: Number.isFinite(Number(restoredAlpha)) ? Number(restoredAlpha) : null,
      updatedAt: Date.now(),
    };

    let nextSnapshot = this.writeRoleStorySnapshotJson(snapshot, 'current_story.json', nextStoryState);
    nextSnapshot = shouldWaitForChoice
      ? this.writeRoleStorySnapshotJson(nextSnapshot, 'current_choices.json', {
          choices: restoredChoices,
          updatedAt: Date.now(),
        })
      : this.removeRoleStorySnapshotFile(nextSnapshot, 'current_choices.json');
    if (alphaLog && Array.isArray(alphaLog.entries) && keptAlphaEntries.length > 0) {
      nextSnapshot = this.writeRoleStorySnapshotJson(nextSnapshot, 'alpha_log/current_run.json', {
        ...alphaLog,
        entries: keptAlphaEntries,
      });
    } else {
      nextSnapshot = this.removeRoleStorySnapshotFile(nextSnapshot, 'alpha_log/current_run.json');
    }
    if (alphaState && Number.isFinite(Number(restoredAlpha))) {
      nextSnapshot = this.writeRoleStorySnapshotJson(nextSnapshot, 'alpha.json', {
        ...alphaState,
        currentAlpha: Number(restoredAlpha),
        updatedAt: Date.now(),
      });
    }

    await restoreStoryRecordSnapshot(nextSnapshot, namespace);
    await this.writeRoleCurrentStoryState(nextStoryState);
    if (shouldWaitForChoice) {
      await this.persistRoleCurrentChoices(restoredChoices);
    } else {
      await RNFS.unlink(this.getRoleStoryChoicesPath()).catch(() => {});
    }
    if (alphaLog && Array.isArray(alphaLog.entries) && keptAlphaEntries.length > 0) {
      await this.writeRoleStoryJsonFile(this.getRoleStoryCurrentAlphaLogPath(), {
        ...alphaLog,
        entries: keptAlphaEntries,
      });
    } else {
      await RNFS.unlink(this.getRoleStoryCurrentAlphaLogPath()).catch(() => {});
    }
    if (alphaState && Number.isFinite(Number(restoredAlpha))) {
      await this.writeRoleStoryJsonFile(this.getRoleStoryAlphaPath(), {
        ...alphaState,
        currentAlpha: Number(restoredAlpha),
        updatedAt: Date.now(),
      });
    }
    await this.stopRoleSpeech();
    await this.handleStopViewHistorySpeak();
    await new Promise(resolve =>
      this.setState(
        {
          isViewHistoryMode: false,
          historyViewMode: null,
          isSwitchWorldlineMode: false,
          historyPageIndex: 0,
          historyPages: [],
          historyReaderBlocks: [],
          historyRawMessages: [],
          switchWorldlineBlockContext: null,
        },
        resolve,
      ),
    );
    await this.openRoleStorySpace();
    showStatus(this.getRoleUiText('storySwitchWorldlineReturned'));
    return true;
  };

  confirmSwitchWorldlineRewind = item => {
    Alert.alert(
      this.getRoleUiText('storySwitchWorldlineConfirmTitle'),
      this.getRoleUiText('storySwitchWorldlineConfirmBody'),
      [
        { text: this.getRoleUiText('cancel'), style: 'cancel' },
        {
          text: this.getRoleUiText('storySwitchWorldlineConfirmAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await this.truncateSwitchWorldlineFromMessage(item);
            } catch (error) {
              console.warn('Failed to rewind switch worldline', error);
              Alert.alert(this.getRoleUiText('storySwitchWorldlineFailedTitle'), String(error?.message || error || 'unknown'));
            }
          },
        },
      ],
    );
  };

  readRoleCurrentStoryMessages = async () => {
    const currentStoryState = await this.readRoleCurrentStoryState();
    const messages = Array.isArray(currentStoryState?.messages) ? currentStoryState.messages : [];
    try {
      return messages
        .map((message, index) => {
          const sender = String(message?.sender || '').trim().toLowerCase() === 'user' ? 'user' : 'agent';
          const rawText = String(message?.text || '').trim();
          const text = sender === 'agent' ? stripStoryChoiceLinesFromText(rawText) : rawText;
          if (!text) return null;
          return {
            id: message?.id || `current-story-${index}`,
            sender,
            text,
            timestamp: Number(message?.timestamp || message?.t || Date.now()) || Date.now(),
            _choiceMeta: message?._choiceMeta || null,
            _modelText: message?._modelText || '',
          };
        })
        .filter(Boolean)
        .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
    } catch (error) {
      console.warn('Failed to read role current story', error);
      return [];
    }
  };

  readRoleCurrentStorySummary = async () => {
    const path = this.getRoleCurrentStorySummaryPath();
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      const parsed = JSON.parse(String(raw || '{}'));
      const text = String(parsed?.text || '').trim();
      if (!text) return null;
      return {
        text,
        updatedAt: Number(parsed?.updatedAt || 0) || Date.now(),
        sourceMessageCount: Number(parsed?.sourceMessageCount || 0) || 0,
        roleName: String(parsed?.roleName || '').trim(),
        roleSlug: String(parsed?.roleSlug || '').trim(),
        startBlockDelta: parsed?.startBlockDelta === null || parsed?.startBlockDelta === undefined ? null : Number(parsed.startBlockDelta),
        startBlockHeight: parsed?.startBlockHeight === null || parsed?.startBlockHeight === undefined ? null : Number(parsed.startBlockHeight),
        latestBlockHeight: parsed?.latestBlockHeight === null || parsed?.latestBlockHeight === undefined ? null : Number(parsed.latestBlockHeight),
      };
    } catch (error) {
      console.warn('Failed to read role current story summary', error);
      return null;
    }
  };

  writeRoleCurrentStorySummary = async payload => {
    const path = this.getRoleCurrentStorySummaryPath();
    await RNFS.writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
    return payload;
  };

  getRoleStorySummaryOnChainKey = summary => {
    const roleSlug = String(summary?.roleSlug || this.state.activeRoleSlug || this.agentId || 'default').trim() || 'default';
    return `story.summary.${roleSlug}`;
  };

  hasNamespaceKey = async (namespaceId, targetKey) => {
    const normalizedTargetKey = String(targetKey || '').trim();
    if (!namespaceId || !normalizedTargetKey) return false;
    const kvMap = await this.fetchNamespaceKeyValueMap(namespaceId);
    return Object.prototype.hasOwnProperty.call(kvMap || {}, normalizedTargetKey);
  };

  openNamespaceKeyValuePage = key => {
    const navigation = this.props?.navigation;
    const params = navigation?.state?.params || {};
    const { namespaceId, walletId, displayName, shortCode } = params;
    if (!navigation || typeof navigation.navigate !== 'function' || !namespaceId || !key) {
      return false;
    }
    navigation.navigate('KeyValues', {
      namespaceId,
      walletId,
      displayName,
      shortCode,
      focusKey: key,
    });
    return true;
  };

  buildRoleStorySummaryOnChainValue = async summaryText => {
    const params = this.props.navigation?.state?.params || {};
    const shortCode = String(params.shortCode || '').trim().replace(/^@+/, '');
    const safeShortCode = shortCode.replace(/[^A-Za-z0-9_]/g, '');
    const savedStoryTag = await this.readSavedStorySummaryTag();
    const tags = ['#agentstory'];
    if (savedStoryTag) {
      tags.push(savedStoryTag);
    } else if (safeShortCode) {
      tags.push(`#story${safeShortCode}`);
    }
    const uniqueTags = [];
    const seenTags = new Set();
    tags.forEach(tag => {
      const normalized = String(tag || '').trim();
      const key = normalized.toLowerCase();
      if (!normalized || seenTags.has(key)) {
        return;
      }
      seenTags.add(key);
      uniqueTags.push(normalized);
    });
    const body = String(summaryText || '').trim();
    const existing = new Set(
      String(body || '')
        .match(/#[A-Za-z0-9_]+/g)?.map(tag => tag.toLowerCase()) || [],
    );
    const missingTags = uniqueTags.filter(tag => !existing.has(tag.toLowerCase()));
    if (!missingTags.length) {
      return body;
    }
    return `${body}\n\n${missingTags.join(' ')}`;
  };

  commitRoleStorySummaryOnChain = async summary => {
    const params = this.props.navigation?.state?.params || {};
    const { namespaceId, walletId } = params;
    const summaryText = String(summary?.text || '').trim();
    if (!summaryText) {
      throw new Error(this.getRoleUiText('storySummaryEmpty') || 'No summary available yet.');
    }
    if (!namespaceId || !walletId) {
      throw new Error(this.getRoleUiText('missingNamespaceOrWallet') || 'missing namespace or wallet');
    }
    const wallet = BlueApp.getWallets().find(w => w.getID() === walletId);
    if (!wallet) {
      throw new Error(this.getRoleUiText('walletNotFoundForAgent') || 'wallet not found');
    }
    const key = this.getRoleStorySummaryOnChainKey(summary);
    const taggedSummaryText = await this.buildRoleStorySummaryOnChainValue(summaryText);
    await this.updateKeyValue({ wallet, namespaceId, key, value: taggedSummaryText });
    const visible = await this.waitForNamespaceKeyVisible(namespaceId, key);
    if (!visible) {
      throw new Error(`key_not_visible:${key}`);
    }
    return key;
  };

  handleCopyRoleStorySummaryPress = async summary => {
    const summaryText = String(summary?.text || '').trim();
    if (!summaryText) {
      showStatus(this.getRoleUiText('storySummaryEmpty') || 'No summary available yet.', 2000);
      return;
    }
    Clipboard.setString(await this.buildRoleStorySummaryOnChainValue(summaryText));
    showStatus(this.getRoleUiText('copiedToClipboard'), 2000);
  };

  handleCommitRoleStorySummaryPress = async summary => {
    if (this.state.isStorySummaryCommitPending) {
      return false;
    }
    const params = this.props.navigation?.state?.params || {};
    const { namespaceId } = params;
    const key = this.getRoleStorySummaryOnChainKey(summary);
    const exists = await this.hasNamespaceKey(namespaceId, key);
    const title = this.getRoleUiText('storySummaryCommit') || 'Upload block';
    const message = exists
      ? (this.getRoleUiText('storySummaryCommitOverwriteConfirm') || 'An on-chain record already exists. Overwrite it?')
      : (this.getRoleUiText('storySummaryCommitCreateConfirm') || 'No on-chain key found yet. Upload now?');

    return new Promise(resolve => {
      Alert.alert(
        title,
        message,
        [
          { text: this.getRoleUiText('back') || 'Back', style: 'cancel', onPress: () => resolve(false) },
          ...(exists ? [{ text: this.getRoleUiText('view') || 'View', onPress: () => { this.openNamespaceKeyValuePage(key); resolve(false); } }] : []),
          {
            text: this.getRoleUiText('confirm') || 'Confirm',
            onPress: async () => {
              try {
                await new Promise(done => this.setState({ isStorySummaryCommitPending: true }, done));
                await this.commitRoleStorySummaryOnChain(summary);
                showStatus(this.getRoleUiText('storySummaryCommitDone') || 'Story summary committed on-chain.');
                resolve(true);
              } catch (error) {
                Alert.alert(this.getRoleUiText('storySummaryCommitFailed') || 'Story summary on-chain failed', String(error?.message || error || 'unknown'));
                resolve(false);
              } finally {
                this.setState({ isStorySummaryCommitPending: false });
              }
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  };

  getStorySummaryLanguageSpec = roleLangCode => {
    const code = normalizeStoryLangCode(roleLangCode || 'en');
    const specs = {
      'zh-cn': {
        outputLabel: 'Simplified Chinese',
        emptyLabel: '(none)',
        sectionLabels: ['EARLY (light)', 'MIDDLE (medium)', 'LATE (heavy)'],
        speakerUser: 'User',
        speakerNarrator: 'Narrator',
        formatDelta: value => Number.isFinite(Number(value)) ? `${Number(value)} blocks ago` : 'some blocks ago',
        anchor: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from the story's starting point.`,
        anchorHint: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from [place Y].`,
        compressHint: 'Keep the first sentence in Simplified Chinese while following the English semantic template above.',
        firstLineCheck: /\u82cf\u9192|awakened/i,
      },
      'zh-tw': {
        outputLabel: 'Traditional Chinese',
        emptyLabel: '(none)',
        sectionLabels: ['EARLY (light)', 'MIDDLE (medium)', 'LATE (heavy)'],
        speakerUser: 'User',
        speakerNarrator: 'Narrator',
        formatDelta: value => Number.isFinite(Number(value)) ? `${Number(value)} blocks ago` : 'some blocks ago',
        anchor: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from the story's starting point.`,
        anchorHint: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from [place Y].`,
        compressHint: 'Keep the first sentence in Traditional Chinese while following the English semantic template above.',
        firstLineCheck: /\u7526\u9192|\u82cf\u9192|awakened/i,
      },
      es: {
        outputLabel: 'Spanish',
        emptyLabel: '(none)',
        sectionLabels: ['EARLY (light)', 'MIDDLE (medium)', 'LATE (heavy)'],
        speakerUser: 'User',
        speakerNarrator: 'Narrator',
        formatDelta: value => Number.isFinite(Number(value)) ? `hace ${Number(value)} bloques` : 'hace algunos bloques',
        anchor: ({ roleName, deltaLabel }) => `${roleName} despertó ${deltaLabel} y empezó a explorar desde el punto inicial de la historia.`,
        anchorHint: ({ roleName, deltaLabel }) => `${roleName} despertó ${deltaLabel} y empezó a explorar desde 【lugar Y】.`,
        compressHint: 'Keep the first sentence in the same Spanish format and preserve the current situation plus the next suspense.',
        firstLineCheck: /despertó/i,
      },
      fr: {
        outputLabel: 'French',
        emptyLabel: '(none)',
        sectionLabels: ['EARLY (light)', 'MIDDLE (medium)', 'LATE (heavy)'],
        speakerUser: 'User',
        speakerNarrator: 'Narrator',
        formatDelta: value => Number.isFinite(Number(value)) ? `il y a ${Number(value)} blocs` : 'il y a quelques blocs',
        anchor: ({ roleName, deltaLabel }) => `${roleName} s’est éveillé ${deltaLabel} et a commencé à explorer depuis le point de départ de l’histoire.`,
        anchorHint: ({ roleName, deltaLabel }) => `${roleName} s’est éveillé ${deltaLabel} et a commencé à explorer depuis 【le lieu Y】.`,
        compressHint: 'Keep the first sentence in the same French format and preserve the current situation plus the next suspense.',
        firstLineCheck: /éveillé|eveillé|éveillée/i,
      },
      ko: {
        outputLabel: 'Korean',
        emptyLabel: '(none)',
        sectionLabels: ['EARLY (light)', 'MIDDLE (medium)', 'LATE (heavy)'],
        speakerUser: 'User',
        speakerNarrator: 'Narrator',
        formatDelta: value => Number.isFinite(Number(value)) ? `${Number(value)} blocks ago` : 'some blocks ago',
        anchor: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from the story's starting point.`,
        anchorHint: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from [place Y].`,
        compressHint: 'Keep the first sentence in Korean while following the English semantic template above.',
        firstLineCheck: /\uae68\uc5b4\ub0ac|awakened/i,
      },
      ja: {
        outputLabel: 'Japanese',
        emptyLabel: '(none)',
        sectionLabels: ['EARLY (light)', 'MIDDLE (medium)', 'LATE (heavy)'],
        speakerUser: 'User',
        speakerNarrator: 'Narrator',
        formatDelta: value => Number.isFinite(Number(value)) ? `${Number(value)} blocks ago` : 'some blocks ago',
        anchor: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from the story's starting point.`,
        anchorHint: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from [place Y].`,
        compressHint: 'Keep the first sentence in Japanese while following the English semantic template above.',
        firstLineCheck: /\u76ee\u899a\u3081|awakened/i,
      },
      en: {
        outputLabel: 'English',
        emptyLabel: '(none)',
        sectionLabels: ['EARLY (light)', 'MIDDLE (medium)', 'LATE (heavy)'],
        speakerUser: 'User',
        speakerNarrator: 'Narrator',
        formatDelta: value => Number.isFinite(Number(value)) ? `${Number(value)} blocks ago` : 'some blocks ago',
        anchor: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from the story's starting point.`,
        anchorHint: ({ roleName, deltaLabel }) => `${roleName} awakened ${deltaLabel} and began exploring from [place Y].`,
        compressHint: 'Keep the first sentence in the same English format and preserve the current situation plus the next suspense.',
        firstLineCheck: /awakened/i,
      },
    };
    return specs[code] || specs.en;
  };

  buildStorySummaryPrompt = ({ messages = [], roleName = '', roleLangCode = 'en', startBlockDelta = null, startBlockHeight = null, latestBlockHeight = null }) => {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const langSpec = this.getStorySummaryLanguageSpec(roleLangCode);
    const deltaLabel = langSpec.formatDelta(startBlockDelta);
    const normalized = safeMessages
      .map((message, index) => {
        const role = String(message?.sender || message?.role || '').trim().toLowerCase() === 'user' ? langSpec.speakerUser : langSpec.speakerNarrator;
        const text = String(message?.text || '').replace(/\s+/g, ' ').trim().slice(0, 160);
        if (!text) return null;
        return { index, role, text };
      })
      .filter(Boolean);
    const total = normalized.length;
    const earlyEnd = total <= 3 ? total : Math.max(1, Math.ceil(total * 0.3));
    const middleEnd = total <= 6 ? total : Math.max(earlyEnd + 1, Math.ceil(total * 0.7));
    const pickSegmentItems = (items, maxItems, mode = 'tail') => {
      if (items.length <= maxItems) return items;
      if (mode === 'head-tail') {
        const headCount = Math.max(1, Math.ceil(maxItems / 2));
        const tailCount = Math.max(1, maxItems - headCount);
        return items.slice(0, headCount).concat(items.slice(-tailCount));
      }
      return items.slice(-maxItems);
    };
    const joinSegment = items => items.map(item => `- ${item.role}: ${item.text}`).join('\n');
    const early = joinSegment(pickSegmentItems(normalized.slice(0, earlyEnd), 6, 'head-tail'));
    const middle = joinSegment(pickSegmentItems(normalized.slice(earlyEnd, middleEnd), 8, 'tail'));
    const late = joinSegment(pickSegmentItems(normalized.slice(middleEnd), 12, 'tail'));
    return [
      'You are a story-summary editor.',
      `Write the final summary in ${langSpec.outputLabel}.`,
      'Output plain text only. No title, no bullet list in the final answer, no Markdown.',
      'Hard requirements:',
      '1. Target roughly 450-520 Chinese characters worth of density, and keep the final result under 1800 UTF-8 bytes.',
      `2. The first line must start with this meaning and structure in ${langSpec.outputLabel}: ${langSpec.anchorHint({ roleName: String(roleName || 'this role'), deltaLabel })}`,
      '3. If the exact starting place is uncertain, infer the closest plausible starting location from the opening story beats. Do not say "unknown place".',
      '4. Use weighting scheme A: early section light (1-2 sentences), middle section medium (2-3 sentences), late section heavy (4-6 sentences), with later events getting more concrete detail.',
      '5. Keep only the main plotline, key places, key characters, goal changes, major turns, current situation, and the next suspense. Remove repetitive dialogue, side actions, and decorative prose.',
      '6. The ending must clearly state what situation the story is currently paused at and what problem comes next.',
      `7. Use the role name "${String(roleName || 'this role')}". current_story started around block ${Number.isFinite(Number(startBlockHeight)) ? Number(startBlockHeight) : 'unknown'}; current reference block is about ${Number.isFinite(Number(latestBlockHeight)) ? Number(latestBlockHeight) : 'unknown'}; delta is about ${Number.isFinite(Number(startBlockDelta)) ? Number(startBlockDelta) : 'unknown'}.`,
      '',
      `[${langSpec.sectionLabels[0]}]`,
      early || langSpec.emptyLabel,
      '',
      `[${langSpec.sectionLabels[1]}]`,
      middle || langSpec.emptyLabel,
      '',
      `[${langSpec.sectionLabels[2]}]`,
      late || langSpec.emptyLabel,
    ].join('\n');
  };

  normalizeStorySummaryText = (text, { roleName = '', roleLangCode = 'en', startBlockDelta = null } = {}) => {
    const cleaned = String(text || '').replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean).join('\n').trim();
    if (!cleaned) return '';
    const lines = cleaned.split('\n').filter(Boolean);
    if (lines.length === 0) return '';
    const langSpec = this.getStorySummaryLanguageSpec(roleLangCode);
    const first = lines[0];
    if (langSpec.firstLineCheck.test(first)) {
      return lines.join('\n').trim();
    }
    const safeRoleName = String(roleName || 'this role').trim() || 'this role';
    const deltaLabel = langSpec.formatDelta(startBlockDelta);
    const anchor = langSpec.anchor({ roleName: safeRoleName, deltaLabel });
    return [anchor].concat(lines).join('\n').trim();
  };

  generateRoleCurrentStorySummary = async () => {
    if (!this.state.llmConfig?.provider || typeof this.callLLMSilent !== 'function') {
      throw new Error('llm unavailable');
    }
    const currentStoryState = await this.readRoleCurrentStoryState();
    const currentStoryMessages = await this.readRoleCurrentStoryMessages();
    if (!currentStoryMessages.length) {
      throw new Error(this.getRoleUiText('storyReaderEmpty') || 'No story content available.');
    }
    const estimateContext = await this.getBlockEstimateContext();
    const estimateHeight = Number.isFinite(Number(estimateContext?.currentHeight)) ? Number(estimateContext.currentHeight) : null;
    const estimateTs = Number.isFinite(Number(estimateContext?.currentTs)) ? Number(estimateContext.currentTs) : Date.now();
    const nowTs = Date.now();
    const storedStartBlockHeight = Number.isFinite(Number(currentStoryState?.startBlockHeight)) ? Number(currentStoryState.startBlockHeight) : null;
    const storedLastBlockHeight = Number.isFinite(Number(currentStoryState?.lastBlockHeight)) ? Number(currentStoryState.lastBlockHeight) : null;
    const startBlockHeight = storedStartBlockHeight || this.estimateStoryBlockHeightForTimestamp(currentStoryMessages[0]?.timestamp || nowTs, estimateHeight, estimateTs);
    const latestBlockHeight = storedLastBlockHeight || this.estimateStoryBlockHeightForTimestamp(currentStoryMessages[currentStoryMessages.length - 1]?.timestamp || nowTs, estimateHeight, estimateTs);
    const roleLangCode = this.getRoleLangCode?.() || this.state.roleLangCode || 'en';
    const roleName = String(currentStoryState?.roleName || this.state.currentSummonedRole?.roleName || this.state.currentSummonedRole?.name || '').trim() || 'this role';
    const currentReferenceHeight = Number.isFinite(Number(estimateHeight)) ? Number(estimateHeight) : latestBlockHeight;
    const startBlockDelta = Number.isFinite(Number(currentReferenceHeight)) && Number.isFinite(Number(startBlockHeight))
      ? Math.max(0, Number(currentReferenceHeight) - Number(startBlockHeight))
      : null;
    const prompt = this.buildStorySummaryPrompt({
      messages: currentStoryMessages,
      roleName,
      roleLangCode,
      startBlockDelta,
      startBlockHeight,
      latestBlockHeight: currentReferenceHeight,
    });
    let summaryText = this.normalizeStorySummaryText(await this.callLLMSilent(prompt, { skipRoleContext: true }), { roleName, roleLangCode, startBlockDelta });
    const utf8Length = value => unescape(encodeURIComponent(String(value || ''))).length;
    if (utf8Length(summaryText) > 1800) {
      const langSpec = this.getStorySummaryLanguageSpec(roleLangCode);
      const compressPrompt = [
        `Compress the following story summary. Keep it concise and keep the final result in ${langSpec.outputLabel}.`,
        'Keep the overall meaning, remove every disposable detail, and keep the byte size under 1700 UTF-8 bytes.',
        langSpec.compressHint,
        '',
        summaryText,
      ].join('\n');
      summaryText = this.normalizeStorySummaryText(await this.callLLMSilent(compressPrompt, { skipRoleContext: true }), { roleName, roleLangCode, startBlockDelta });
    }
    const payload = {
      text: summaryText,
      updatedAt: Date.now(),
      sourceMessageCount: currentStoryMessages.length,
      roleName,
      roleSlug: String(currentStoryState?.roleSlug || this.state.activeRoleSlug || '').trim(),
      startBlockDelta,
      startBlockHeight,
      latestBlockHeight: currentReferenceHeight,
    };
    await this.writeRoleCurrentStorySummary(payload);
    return payload;
  };

  openRoleStorySummaryRecords = async ({ forceRefresh = false } = {}) => {
    let summary = forceRefresh ? null : await this.readRoleCurrentStorySummary();
    if (!summary) {
      const generatingText = this.getRoleUiText('storySummaryGenerating') || 'Generating story summary…';
      this.replyFromAgent(generatingText);
      showStatus(generatingText);
      summary = await this.generateRoleCurrentStorySummary();
    }
    const displayMessages = [{
      id: `story-summary-${Number(summary?.updatedAt || Date.now())}`,
      sender: 'agent',
      text: String(summary?.text || '').trim() || (this.getRoleUiText('storySummaryEmpty') || 'No summary available yet.'),
      timestamp: Number(summary?.updatedAt || Date.now()) || Date.now(),
      roleName: String(summary?.roleName || '').trim(),
      roleSlug: String(summary?.roleSlug || '').trim(),
      startBlockDelta: summary?.startBlockDelta,
      startBlockHeight: summary?.startBlockHeight,
      latestBlockHeight: summary?.latestBlockHeight,
    }];
    const historyBlocks = this.buildViewHistoryReaderBlocks(displayMessages);
    const historyPages = this.buildHistoryPages(historyBlocks);
    const latestPageIndex = Math.max(0, historyPages.length - 1);
    const firstPage = historyPages[latestPageIndex] || [];
    const visibleCount = Math.min(firstPage.length || PAGE_SIZE, PAGE_SIZE);
    await new Promise(resolve =>
      this.setState(
        {
          visibleCount,
          inputValue: '',
          isViewHistoryMode: true,
          historyViewMode: 'story-summary',
          isSwitchWorldlineMode: false,
          isHistorySpeaking: false,
          historyPageIndex: latestPageIndex,
          historyPages,
          historyReaderBlocks: historyBlocks,
          historyRawMessages: displayMessages,
          switchWorldlineBlockContext: null,
        },
        resolve,
      ),
    );
    this.forceScrollToBottomOnce = true;
    requestAnimationFrame(() => this.scrollToBottomOffset(false));
  };

  openViewCurrentStoryRecords = async ({ viewMode = 'story-view', pageOffsetFromLatest = 0 } = {}) => {
    const currentStoryMessages = await this.readRoleCurrentStoryMessages();
    const isSwitchWorldlineMode = viewMode === 'switch-worldline';
    let switchWorldlineBlockContext = null;
    let displayMessages = currentStoryMessages;

    if (isSwitchWorldlineMode) {
      try {
        const estimateContext = await this.getBlockEstimateContext();
        const currentHeight = Number.isFinite(Number(estimateContext?.currentHeight)) ? Number(estimateContext.currentHeight) : null;
        const currentTs = Number.isFinite(Number(estimateContext?.currentTs)) ? Number(estimateContext.currentTs) : Date.now();
        this._latestStoryBlockHeight = currentHeight;
        switchWorldlineBlockContext = {
          currentHeight,
          currentTs,
        };
      } catch (error) {
        console.warn('Failed to prepare switch worldline block context', error);
      }
      displayMessages = currentStoryMessages
        .filter(message => !(String(message?.sender || '').trim().toLowerCase() === 'user' && message?._choiceMeta?.syntheticFallback === true))
        .map(message => this.formatSwitchWorldlineUserMessage(message, switchWorldlineBlockContext));
    }

    const historyBlocks = this.buildViewHistoryReaderBlocks(displayMessages, {
      prefixSwitchWorldlineUserBlocks: isSwitchWorldlineMode,
    });
    const historyPages = this.buildHistoryPages(historyBlocks);
    const latestPageIndex = Math.max(0, historyPages.length - 1);
    const initialPageIndex = Math.max(0, latestPageIndex - Math.max(0, Number(pageOffsetFromLatest) || 0));
    const firstPage = historyPages[initialPageIndex] || [];
    const visibleCount = Math.min(firstPage.length || PAGE_SIZE, PAGE_SIZE);
    await new Promise(resolve =>
      this.setState(
        {
          visibleCount,
          inputValue: '',
          isViewHistoryMode: true,
          historyViewMode: viewMode,
          isSwitchWorldlineMode,
          isHistorySpeaking: false,
          historyPageIndex: initialPageIndex,
          historyPages,
          historyReaderBlocks: historyBlocks,
          historyRawMessages: displayMessages,
          switchWorldlineBlockContext,
        },
        resolve,
      ),
    );
    this.forceScrollToBottomOnce = true;
    requestAnimationFrame(() => this.scrollToBottomOffset(false));
  };

  listDateKeysForScope = async scope => {
    try {
      const normalizedScope = scope === 'story' ? 'story' : this.chatScope;
      const baseDir = normalizedScope === 'story'
        ? `${this.getStoryChatDir()}/raw`
        : this.agentChatDir;
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

  readDayMessagesForScope = async (dateKey, scope) => {
    try {
      const normalizedScope = scope === 'story' ? 'story' : this.chatScope;
      if (normalizedScope === 'story') {
        const storyChatDir = this.getStoryChatDir();
        const messages = await readStoryEntriesByDay(storyChatDir, dateKey, 'raw');
        return this.sanitizeMessagesForList(messages, dateKey);
      }
      return this.readDayMessages(dateKey);
    } catch {
      return [];
    }
  };

  readHistoryForScope = async scope => {
    const normalizedScope = scope === 'story' ? 'story' : this.chatScope;
    const keys = await this.listDateKeysForScope(normalizedScope);
    const targetKeyField = normalizedScope === this.chatScope ? 'allDateKeys' : '_storyHistoryDateKeys';
    this[targetKeyField] = keys;
    if (keys.length === 0) {
      if (normalizedScope === this.chatScope) {
        this.loadedDateKeys = [];
      }
      return [];
    }
    const todayKey = getLocalDateKey();
    const pickedKeys = keys.includes(todayKey) ? [todayKey] : [keys[0]];
    const dayBuckets = await Promise.all(pickedKeys.map(dateKey => this.readDayMessagesForScope(dateKey, normalizedScope)));
    const mergedMessages = dayBuckets
      .slice()
      .reverse()
      .reduce((acc, items) => acc.concat(Array.isArray(items) ? items : []), []);
    if (normalizedScope === this.chatScope) {
      this.loadedDateKeys = pickedKeys;
    }
    return normalizedScope === 'role' ? this.sanitizeRoleHistoryMessages(mergedMessages) : mergedMessages;
  };

  buildRoleTalkMenuMessage = () => {
    const autoBadge = this.state.isAutoVoiceSpeak ? `🟩 ${this.getRoleUiText('toggleOn')}` : `🟥 ${this.getRoleUiText('toggleOff')}`;
    const liveBadge = this.state.isContinuousTalkEnabled ? `🟩 ${this.getRoleUiText('toggleOn')}` : `🟥 ${this.getRoleUiText('toggleOff')}`;
    const autoLabel = `${this.getRoleUiText('autoVoice')}  ${autoBadge}`;
    const liveLabel = `${this.getRoleUiText('liveVoice')}  ${liveBadge}`;
    return [
      this.getRoleUiText('voiceMenu'),
      '',
      `[[/role voice ${this.state.isAutoVoiceSpeak ? 'off' : 'on'}|${autoLabel}]]`,
      '',
      `[[/role talk ${this.state.isContinuousTalkEnabled ? 'off' : 'on'}|${liveLabel}]]`,
      '',
      `[[/role talk status|${this.getRoleUiText('voiceStatus')}]]`,
      '',
      `[[/role menu|${this.getRoleUiText('back')}]]`,
    ].join('\n');
  };

  appendRoleCommandMessage = text => {
    this.forceScrollToBottomOnce = true;
    this.shouldScrollToEnd = true;
    if (typeof this.appendStoryCommandMessage === 'function') {
      this.appendStoryCommandMessage(text);
      if (this.chatScope === 'role') {
        this.scheduleBottomFollow();
      }
    } else {
      this.replyFromAgent(text);
    }
  };

  ensureRoleLangReady = async (showUI = true) => {
    if (!this.state.roleLangCode) {
      const stored = await AsyncStorage.getItem(getRoleLangStorageKey(this.agentId));
      if (stored) {
        await new Promise(resolve => this.setState({ roleLangCode: normalizeStoryLangCode(stored) }, resolve));
      }
    }

    if (!this.getRoleLangCode()) {
      if (showUI) this.appendRoleCommandMessage(this.getRoleLangMenuMessage());
      return false;
    }

    return true;
  };

  runRoleLangCheck = async (options = {}) => {
    const { showSuccess = true } = options || {};
    const ok = await this.ensureRoleLangReady(false);
    const code = this.getRoleLangCode() || '';
    const langLabel = getStoryLangLabel(code || 'en');

    if (ok && showSuccess) {
      this.appendRoleCommandMessage(this.buildRoleLangStatusMessage());
    }

    return {
      ok,
      langCode: code,
      langLabel,
    };
  };

  hasConfiguredRoleLLM = () => {
    const cfg = this.state.llmConfig || this.currentLLMConfig;
    return !!String(cfg?.provider || '').trim();
  };

  getRoleModelReasonLabel = reason => this.getRoleUiText(`roleModelReason_${String(reason || '').trim()}`) || String(reason || '').trim();

  formatRoleModelStatusBlocks = value => {
    const blocks = Number(value);
    if (!Number.isFinite(blocks) || blocks < 0) return '-';
    const minutes = Math.round(blocks * 2);
    return this.getRoleUiText('roleModelStatusMinutes', { minutes }) || `${minutes} minutes`;
  };

  getRoleModelStatusText = (key, fallback, vars = {}) => this.getRoleUiText(key, vars) || fallback;

  buildRoleModelStatusLine = (key, fallbackLabel, text) => {
    const label = this.getRoleModelStatusText(key, fallbackLabel);
    const separator = this.getRoleModelStatusText('roleModelStatusSeparator', ': ');
    return `${label}${separator}${text}`;
  };

  getRoleModelNodeLabel = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const noProtocol = raw.replace(/^https?:\/\//i, '');
    const hostPort = noProtocol.split('/')[0] || noProtocol;
    return hostPort.replace(/:\d+$/, '').trim();
  };

  getRoleModelVersionLabel = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const last = raw.split('/').filter(Boolean).pop() || raw;
    const normalized = last.trim();
    const match = normalized.match(/(?:^|[-_])(free)(?:$|[-_])/i);
    if (match) return match[1].toLowerCase();
    return normalized;
  };

  buildRoleModelStatusMessage = (status, apiStatus = null) => {
    const cfg = status?.loadedConfig || {};
    const provider = String(status?.activeProvider || cfg.provider || '').trim().toLowerCase();
    const model = String(cfg.model || status?.resolved?.def?.defaultModel || '').trim();
    const baseUrl = String(cfg.baseUrl || '').trim();
    const value = (item, fallback = '-') => {
      if (item === null || item === undefined || item === '') return fallback;
      return String(item);
    };
    const numberValue = (item, fallback = '-') => {
      const n = Number(item);
      return Number.isFinite(n) ? String(n) : fallback;
    };
    const lines = [
      this.getRoleModelStatusText('roleModelStatusTitle', 'Model status'),
      '',
      this.buildRoleModelStatusLine(
        'roleModelStatusState',
        'Status',
        status?.ok
          ? this.getRoleModelStatusText('roleModelStatusAvailable', 'Available')
          : this.getRoleModelStatusText('roleModelStatusIssue', 'Issue'),
      ),
      this.buildRoleModelStatusLine('roleModelStatusService', 'Service', value(provider)),
    ];
    const nodeLabel = this.getRoleModelNodeLabel(baseUrl);
    if (nodeLabel) {
      lines.push(this.buildRoleModelStatusLine('roleModelStatusNode', 'Node', nodeLabel));
    }

    if (provider === 'xkeva') {
      lines.push('');
      if (apiStatus?.ok && apiStatus?.json) {
        const json = apiStatus.json || {};
        const channel = json.free_channel || {};
        const quota = json.free_quota || {};
        const access = json.free_access || {};
        const usage = json.wallet_usage || {};
        const maxRequests = usage.max_requests ?? quota.max_requests;
        const maxTokens = usage.max_tokens ?? quota.max_tokens;
        const usedBlocks = access.used_blocks;
        const remainingBlocks = access.remaining_blocks;

        const effective = json.effective_upstream || {};
        const rawEffectiveModel = effective.model_version || effective.model || json.effective_model_version || json.effective_model || json.model_version || json.model || model;
        const effectiveModel = this.getRoleModelVersionLabel(rawEffectiveModel);
        lines.push(this.buildRoleModelStatusLine('roleModelStatusModel', 'Model', value(effectiveModel)));
        lines.push(this.buildRoleModelStatusLine('roleModelStatusConnections', 'Connections', `${numberValue(channel.active_wallets)}/${numberValue(channel.max_active_wallets)}`));
        lines.push(this.buildRoleModelStatusLine('roleModelStatusUsed', 'Used', `${numberValue(usedBlocks)}（${this.formatRoleModelStatusBlocks(usedBlocks)}）`));
        lines.push(this.buildRoleModelStatusLine('roleModelStatusRemaining', 'Remaining', `${numberValue(remainingBlocks)}（${this.formatRoleModelStatusBlocks(remainingBlocks)}）`));
        lines.push(this.buildRoleModelStatusLine('roleModelStatusRequests', 'Requests', `${numberValue(usage.requests_remaining, maxRequests !== undefined ? String(maxRequests) : '-')}/${numberValue(maxRequests)}`));
        lines.push(this.buildRoleModelStatusLine('roleModelStatusUsage', 'Usage', `${numberValue(usage.tokens_remaining, maxTokens !== undefined ? String(maxTokens) : '-')}/${numberValue(maxTokens)}`));
      } else {
        lines.push(this.buildRoleModelStatusLine('roleModelStatusQueryFailed', 'Status query failed', value(apiStatus?.status || apiStatus?.error || 'unknown')));
      }
    } else if (model) {
      lines.push(this.buildRoleModelStatusLine('roleModelStatusModel', 'Model', value(model)));
    }

    return lines.join('\n');
  };

  runRoleModelCheck = async (options = {}) => {
    const status = await evaluateRoleModelConfig(this);
    if (status?.ok) {
      if (options?.showSuccess) {
        let apiStatus = null;
        const provider = String(status?.activeProvider || status?.loadedConfig?.provider || '').trim().toLowerCase();
        if (provider === 'xkeva' && typeof this.fetchXkevaModelStatus === 'function') {
          apiStatus = await this.fetchXkevaModelStatus(status?.loadedConfig?.baseUrl || '', { includeWalletAuth: true });
        }
        this.replyFromAgent(this.buildRoleModelStatusMessage(status, apiStatus), { _useSatoshiAvatar: true });
      }
      return status;
    }

    if (options?.showFailure !== false) {
      this.replyFromAgent(this.getRoleUiText('roleModelCheckFailed', {
        reason: this.getRoleModelReasonLabel(status?.reason),
      }));
    }
    return status;
  };

  tryAutoUseXkevaRoleModel = async () => {
    try {
      const available = typeof this.checkXkevaAvailable === 'function' ? await this.checkXkevaAvailable() : false;
      if (!available) return false;
      return await this.activateRoleModelProvider('xkeva');
    } catch (error) {
      console.warn('Failed to auto-select xkeva role model', error);
      return false;
    }
  };

  ensureRoleModelReady = async (options = {}) => {
    let status = await this.runRoleModelCheck({ ...options, showFailure: false, showSuccess: false });
    if (!status?.ok && !String(status?.activeProvider || '').trim()) {
      const selected = await this.tryAutoUseXkevaRoleModel();
      if (selected) {
        status = await this.runRoleModelCheck({ ...options, showFailure: false, showSuccess: false });
      }
    }
    if (!status?.ok) {
      await new Promise(resolve =>
        this.setState({ pendingReturnToRoleMenu: true, pendingModelFinalConfirm: true, pendingRoleModelReturnToRole: true }, resolve),
      );
      await this.handleTriggers('/rolemodel', null);
      return status;
    }

    const normalizedConfig = status.loadedConfig || null;
    if (normalizedConfig) {
      this.currentLLMConfig = normalizedConfig;
      await new Promise(resolve => this.setState({ llmConfig: normalizedConfig }, resolve));
    }
    return status;
  };

  clearRoleModelPendingState = async () => {
    await new Promise(resolve =>
      this.setState(
        {
          pendingRoleModelStep: null,
          pendingRoleModelBuiltinProvider: '',
          pendingRoleModelCustomName: '',
          pendingRoleModelCustomBaseUrl: '',
        },
        resolve,
      ),
    );
  };

  activateRoleModelProvider = async providerName => {
    const provider = String(providerName || '').trim().toLowerCase();
    if (!provider) return false;

    const resolved = (await this.resolveProviderDef?.(provider)) || null;
    if (!resolved?.def) {
      this.replyFromAgent(this.getRoleUiText('providerNotFound'));
      return false;
    }

    const builtin = (await this.readBuiltinRegistry?.()) || {};
    const custom = (await this.readCustomRegistry?.()) || {};
    const registryEntry = resolved.source === 'custom' ? custom?.[provider] || null : builtin?.[provider] || null;

    const baseUrl = String(registryEntry?.baseUrl || resolved.def.baseUrl || '').trim().replace(/\/$/, '');
    if (!baseUrl) {
      this.replyFromAgent(this.getRoleUiText('missingBaseUrl'));
      return false;
    }

    const model = String(registryEntry?.model || resolved.def.defaultModel || 'default').trim();
    const apiKey = String(registryEntry?.apiKey || '').trim();
    const next = { provider, baseUrl, apiKey, model, updatedAt: Date.now() };

    this.currentLLMConfig = next;
    await new Promise(resolve => this.setState({ llmConfig: next }, resolve));
    await this.saveLLMConfig(next);
    await this.writeActiveProvider({ name: provider, updatedAt: Date.now() });
    await this.writeJsonFile(this.llmLastUsedPath, {
      provider,
      baseUrl,
      apiKey,
      model,
      updatedAt: Date.now(),
    });

    return true;
  };

  getModelApiUsageLinks = () => [
    ['gpt', 'GPT', 'https://platform.openai.com/api-keys'],
    ['grok', 'Grok', 'https://console.x.ai/'],
    ['claude', 'Claude', 'https://console.anthropic.com/settings/keys'],
    ['gemini', 'Gemini', 'https://aistudio.google.com/apikey'],
    ['deepseek', 'DeepSeek', 'https://platform.deepseek.com/api_keys'],
    ['kimi', 'Kimi', 'https://platform.moonshot.cn/console/api-keys'],
    ['qwen', 'Qwen', 'https://dashscope.console.aliyun.com/apiKey'],
    ['openrouter', 'OpenRouter', 'https://openrouter.ai/keys'],
    ['xkeva', 'xKEVA', 'https://openrouter.ai/keys'],
  ];

  openModelApiUsageUrl = async provider => {
    const key = String(provider || '').trim().toLowerCase();
    const hit = this.getModelApiUsageLinks().find(([name]) => name === key);
    if (!hit?.[2]) return false;
    await Linking.openURL(hit[2]);
    return true;
  };

  buildModelApiUsageMessage = () => [
    this.getRoleUiText('apiUsageTitle') || 'API help:',
    '',
    this.getRoleUiText('apiUsageBody') || 'If you do not know how to get an API key, ask any large model directly, or check the official provider website.',
    '',
    this.getRoleUiText('apiUsageOfficialLinks') || 'Official websites:',
    '',
    this.getModelApiUsageLinks().slice(0, 4).map(([key, label]) => `[[/rolemodel apiurl ${key}|${label}]]`).join('  '),
    '',
    this.getModelApiUsageLinks().slice(4).map(([key, label]) => `[[/rolemodel apiurl ${key}|${label}]]`).join('  '),
    '',
    `[[/rolemodel|${this.getRoleUiText('back') || 'Back'}]]`,
  ].join('\n');

  buildModelApiUsageButtonLine = command => {
    const label = this.getRoleUiText('apiUsageButton') || this.getRoleUiText('apiUsageTitle') || 'Instructions';
    return `[[${command || '/rolemodel apiusage'}|${label}]]`;
  };

  buildRoleModelMenuMessage = async () => {
    const builtin = (await this.readBuiltinRegistry?.()) || {};
    const custom = (await this.readCustomRegistry?.()) || {};

    const activeProvider = String(this.state.llmConfig?.provider || this.currentLLMConfig?.provider || '')
      .trim()
      .toLowerCase();
    const builtinProviders = ['xkeva', 'openrouter', 'gpt', 'grok', 'claude', 'gemini', 'deepseek', 'kimi', 'qwen'];
    const xkevaAvailable = typeof this.checkXkevaAvailable === 'function' ? await this.checkXkevaAvailable() : false;
    const statusDot = (name, hasKey) => {
      if (name === 'xkeva') return xkevaAvailable ? '🟩' : '🟥';
      return activeProvider === name ? '🟩' : hasKey ? '🟩' : '🟥';
    };
    const activeSuffix = name => (activeProvider === String(name || '').trim().toLowerCase() ? ' ●' : '');

    const useLabel = this.getRoleUiText('useModel') || 'use';

    const builtinLines = builtinProviders.map(name => {
      const hasCurrentKey = activeProvider === name && !!String(this.state.llmConfig?.apiKey || this.currentLLMConfig?.apiKey || '').trim();
      const hasKey = name === 'xkeva' ? xkevaAvailable : (!!String(builtin?.[name]?.apiKey || '').trim() || hasCurrentKey);
      return `${statusDot(name, hasKey)} [[/rolemodel builtin ${name}|${useLabel}]] ${name}${activeSuffix(name)}`;
    });

    const customNames = Object.keys(custom || {}).filter(name => custom?.[name]?.baseUrl);
    const customLines = customNames.map(name => {
      const label = String(custom?.[name]?.label || name).trim() || name;
      return `🟩 [[/rolemodel custom ${name}|${useLabel}]] ${label}${activeSuffix(name)}`;
    });

    const addModelLabel = this.getRoleUiText('addModel') || 'Add model';
    const removeMenuLabel = this.getRoleUiText('removeModel') || 'Remove key';
    const lines = [
      ...builtinLines.flatMap(line => [line, '']),
      ...customLines.flatMap(line => [line, '']),
      `[[/rolemodel check|${this.getRoleUiText('roleModelCheckEntry')}]]`,
      '',
      `[[/rolemodel custom|${addModelLabel}]]`,
      '',
      this.buildModelApiUsageButtonLine('/rolemodel apiusage'),
      '',
      `[[/rolemodel remove|${removeMenuLabel}]]`,
      '',
      `[[/role|${this.getRoleUiText('backToRole')}]]`,
    ];

    return lines.join('\n');
  };

  buildRoleModelRemoveMenuMessage = async () => {
    const builtin = (await this.readBuiltinRegistry?.()) || {};
    const custom = (await this.readCustomRegistry?.()) || {};

    const builtinProviders = ['xkeva', 'openrouter', 'gpt', 'grok', 'claude', 'gemini', 'deepseek', 'kimi', 'qwen'];
    const removeLabel = this.getRoleUiText('removeModel') || 'remove';
    const lines = [this.getRoleUiText('removeKeyCustomModel'), ''];

    let hasAny = false;

    const activeProvider = String(this.state.llmConfig?.provider || this.currentLLMConfig?.provider || '').trim().toLowerCase();
    builtinProviders.forEach(name => {
      if (name !== 'xkeva' && (builtin?.[name]?.apiKey || !!builtin?.[name] || activeProvider === name)) {
        hasAny = true;
        lines.push(`🟩 [[/rolemodel remove builtin ${name}|${removeLabel}]] ${name}`);
        lines.push('');
      }
    });

    const customNames = Object.keys(custom || {}).filter(name => custom?.[name]?.baseUrl);
    customNames.forEach(name => {
      hasAny = true;
      const label = String(custom?.[name]?.label || name).trim() || name;
      lines.push(`🟩 [[/rolemodel remove custom ${name}|${removeLabel}]] ${label}`);
      lines.push('');
    });

    if (!hasAny) {
      lines.push(this.getRoleUiText('empty'));
      lines.push('');
    }

    lines.push(`[[/rolemodel|${this.getRoleUiText('back')}]]`);

    return lines.join('\n');
  };

  buildRoleModelCustomMenuMessage = async () => {
    const custom = (await this.readCustomRegistry?.()) || {};
    const customNames = Object.keys(custom || {}).filter(name => custom?.[name]?.baseUrl);
    const lines = [this.getRoleUiText('addModel'), ''];

    if (!customNames.length) {
      lines.push(this.getRoleUiText('empty'));
      lines.push('');
    } else {
      customNames.forEach(name => {
        const label = String(custom?.[name]?.label || name).trim() || name;
        lines.push(`🟩 [[/rolemodel custom ${name}|${this.getRoleUiText('useModel') || 'use'}]] ${label}`);
        lines.push('');
      });
    }

    lines.push(`🟩 [[/rolemodel custom new|${this.getRoleUiText('addModel') || 'Add model'}]]`);
    lines.push('');
    lines.push(`🟩 [[/rolemodel remove|${this.getRoleUiText('removeModel') || 'Remove key'}]]`);
    lines.push('');
    lines.push(`[[/rolemodel|${this.getRoleUiText('back')}]]`);

    return lines.join('\n');
  };

  startRoleModelSetup = async () => {
    await this.clearRoleModelPendingState();
    const menu = await this.buildRoleModelMenuMessage();
    this.replyFromAgent(menu);
  };

  handleRoleNewMenu = async () => {
    this.forceScrollToBottomOnce = true;
    this.shouldScrollToEnd = true;
    if (!this.getRoleLangCode()) {
      await this.handleTriggers('/role lang list', null);
      return;
    }

    await this.handleTriggers('/role cards start', null);
    await this.handleTriggers('/role menu', null);
  };

  loadLocalRoleCardsPage = async (offset = 0) => {
    try {
      const dirOk = await this.ensureRoleFilesDir();
      if (!dirOk) return { items: [], hasMore: false };
      const indexItems = await this.getReconciledRoleIndex();
      const all = (Array.isArray(indexItems) ? indexItems : [])
        .filter(item => item && item.roleSlug)
        .map(item => ({
          roleName: item.roleName || item.roleSlug,
          roleSlug: item.roleSlug,
          updatedAt: Number(item.lastSummonedAt || item.updatedAt || 0),
          isOnChain: !!item.isOnChain,
        }));

      all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return {
        items: all.slice(offset, offset + PAGE_SIZE),
        hasMore: offset + PAGE_SIZE < all.length,
      };
    } catch (e) {
      console.warn('loadLocalRoleCardsPage failed', e);
      this.replyFromAgent(`Role card index failed:\n${String(e?.message || e || 'unknown error')}`);
      return { items: [], hasMore: false };
    }
  };

  buildLocalRoleCardsMessage = (cards, _offset, hasMore = false) => {
    const lines = [];

    if (!cards.length) {
      return this.getRoleUiText('noRoleCards');
    }

    cards.forEach(c => {
      lines.push(`[[/role summon ${c.roleName}|${c.roleName}]]`);
      lines.push('');
    });

    if (hasMore) {
      lines.push('[[/role morecards|More]]');
    }
    return lines.join('\n');
  };

  handleLangCommand = async argsString => {
    if (!this.isStoryScope) {
      showStatus(this.getStoryMenuText('langOnlyStory'), 2000);
      return true;
    }
    const args = String(argsString || '').trim();
    if (!args) {
      this.appendStoryCommandMessage(this.getStoryLangMenuMessage());
      return true;
    }

    const normalizedArg = normalizeStoryLangCode(args);
    if (normalizedArg === 'other' || normalizedArg === 'more') {
      this.appendStoryCommandMessage(this.getSupportedStoryLangListMessage(this.getMoreStoryLangItems()));
      return true;
    }

    const isSupported = STORY_SUPPORTED_LANGS.some(item => item.code === normalizedArg);
    if (!isSupported) {
      showStatus(this.getStoryMenuText('unsupportedLang', { code: args }), 2000);
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

  getStoryLocale = () => normalizeStoryLangCode(this.getStoryLangCode() || getDefaultStoryLangCode());

  getStoryMenuText = (key, vars = {}) => {
    const locale = this.getStoryLocale();
    const base = String(locale || '').split('-')[0];

    const table = STORY_MENU_MESSAGES[locale] || STORY_MENU_MESSAGES[base] || STORY_MENU_MESSAGES.en;

    let text = (table && table[key]) || (STORY_MENU_MESSAGES.en && STORY_MENU_MESSAGES.en[key]) || '';
    Object.keys(vars).forEach(k => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
    });
    return text;
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
        this.getStoryMenuText('destinyTitle'),
        '',
        '[[/d offline|Offline copy version]]',
        '',
        '[[/d story|Open Story window]]',
      ].join('\n');
    }

    return [
      this.getStoryMenuText('destinyTitle'),
      '',
      `[[/d continue|${this.getStoryMenuText('continueStory')}]]`,
      '',
      `[[/d new|${this.getStoryMenuText('startNew')}]]`,
      '',
      `[[/lang|${this.getStoryMenuText('changeLanguage')}]]`,
      '',
      `[[/a list|${this.getStoryMenuText('changeModel')}]]`,
    ].join('\n');
  };

  buildDestinyCurrentLanguageNotice = () => {
    const code = this.getStoryLangCode();
    if (!code) {
      return this.getStoryMenuText('currentLanguageNotSet');
    }
    const label = getStoryLangLabel(code);
    return this.getStoryMenuText('currentLanguage', { label, code });
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
        const seedPrompt = buildOfflineDestinySeedPrompt(this.agentId);
        const preview = [
          'Offline copy version',
          '',
          'This is a copyable prompt for GPT and other large models.',
          'Use the copy link below, then paste the full card into the external model to run it.',
        ].join('\n');
        this.replyFromAgentSeedCard(preview, seedPrompt);
        return;
      }
      if (mode === 'story') {
        await this.persistLastSpaceShortcut('story');
        const params = this.props.navigation?.state?.params || {};
        this.props.navigation?.push?.('AgentStory', {
          namespaceId: params.namespaceId,
          shortCode: params.shortCode,
          displayName: params.displayName,
          walletId: params.walletId,
          txid: params.txid,
          rootAddress: params.rootAddress,
          price: params.price,
          desc: params.desc,
          addr: params.addr,
          profile: params.profile,
          suppressAutoLinkStart: true,
          autoCommand: '/d new',
          autoCommandSource: 'link-story',
          startStoryOnMount: true,
        });
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
      const height = await this.replyWithCurrentBlock({ silent: true });
      this._latestStoryBlockHeight = height;
      const condensedMemory = await this.buildStoryCondensedMemory();
      await this.startDestinyRun({ memoryMode: 'continue', condensedMemory });
      return;
    }

    const height = await this.replyWithCurrentBlock({ silent: true });
    this._latestStoryBlockHeight = height;
    await this.startDestinyRun({ memoryMode: 'new', condensedMemory: '' });
    return;
  };

  startDestinyRun = async options => {
    this.replyFromAgent(this.getRoleUiText('storyModeDisabled'));
  };


  handleReopenCurrentWindow = async () => {
    if (this.chatScope === 'role') {
      const active = await this.getActiveRoleData();
      if (active?.roleName) {
        await this.handleRoleCallWithName(active.roleName, null, { isContinue: true });
        return true;
      }
      const selected = await this.getCurrentSummonedRoleData();
      if (selected?.roleName) {
        if (!this.isPureChatMode()) {
          await this.handleTriggers('/role menu', null);
        }
        await this.handleTriggers('/role chat', null);
      } else {
        await this.handleTriggers('/role', null);
      }
      return true;
    }

    if (this.isStoryScope) {
      await this.handleTriggers('/d', null);
      return true;
    }

    if (this.state?.pendingAISetup || this.state?.pendingAISetupStep) {
      if (this.chatScope === 'role') {
        await this.startRoleModelSetup();
      } else {
        await this.handleTriggers('/a list', null);
      }
      return true;
    }

    await this.handleTriggers('/role menu', null);
    return true;
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

  isInteractiveCommand = commandText => isInteractiveCommandText(commandText);

  isValidCommandText = text => isValidRoleCommandText(text);

  getCommandSegments = text => parseCommandSegments(text);

  extractStoryChoices = text => extractStoryChoicesFromText(text);

  parseStoryLineSegments = line => parseStoryLineSegmentsFromText(line);

  buildStoryInlineLines = text => buildStoryInlineLinesFromText(text);

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
    showStatus(this.getRoleUiText('copiedToClipboard'), 2000);
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
    if (this.state.isViewHistoryMode) {
      return;
    }
    if (this.isStoryScope || this.loadingMore) {
      return;
    }

    // First scroll-up after clearing: load the latest dated file first
    if (this.state.allMessages.length === 0 && this.loadedDateKeys.length === 0) {
      const keys = this.allDateKeys?.length ? this.allDateKeys : await this.listDateKeys();
      this.allDateKeys = keys;
      if (keys.length === 0) {
        return;
      }

      this.loadingMore = true;
      const latestKey = keys[0];
      const rawMsgs = await this.readDayMessages(latestKey);
      const msgs = this.state.isViewHistoryMode ? this.filterViewHistoryRecords(rawMsgs) : rawMsgs;
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
    let nextKey = null;
    let olderMessages = [];
    let resolvedIndex = nextIndex;
    while (resolvedIndex >= 0 && resolvedIndex < this.allDateKeys.length) {
      nextKey = this.allDateKeys[resolvedIndex];
      const rawOlderMessages = await this.readDayMessages(nextKey);
      olderMessages = this.state.isViewHistoryMode ? this.filterViewHistoryRecords(rawOlderMessages) : rawOlderMessages;
      if (olderMessages.length > 0) {
        break;
      }
      this.loadedDateKeys.push(nextKey);
      resolvedIndex += 1;
    }
    if (!nextKey || resolvedIndex < 0 || resolvedIndex >= this.allDateKeys.length || olderMessages.length === 0) {
      this.loadingMore = false;
      return;
    }
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
    if (!this.state.isViewHistoryMode && contentOffset?.y <= 20) {
      this.loadMoreHistory();
    }
    const paddingToBottom = 80;
    const layoutHeight = layoutMeasurement?.height || 0;
    const contentHeight = contentSize?.height || 0;
    const offsetY = contentOffset?.y || 0;
    this.isNearBottom = layoutHeight + offsetY >= contentHeight - paddingToBottom;
  };

  clearPendingBottomScrolls = () => {
    if (!Array.isArray(this.pendingScrollBottomTimeouts) || !this.pendingScrollBottomTimeouts.length) {
      return;
    }
    this.pendingScrollBottomTimeouts.forEach(timer => clearTimeout(timer));
    this.pendingScrollBottomTimeouts = [];
  };

  scheduleBottomFollow = () => {
    this.clearPendingBottomScrolls();
    if (!this._isMounted) {
      return;
    }

    const run = animated => {
      if (!this._isMounted) return;
      this.forceScrollToBottomOnce = true;
      this.scrollToBottomOffset(animated);
    };

    requestAnimationFrame(() => run(false));
    requestAnimationFrame(() => requestAnimationFrame(() => run(false)));

    [40, 120, 260].forEach(delay => {
      const timer = setTimeout(() => run(false), delay);
      this.pendingScrollBottomTimeouts.push(timer);
    });
  };

  scrollToBottomOffset = (animated = true) => {
    if (!this.listRef) {
      return;
    }

    if (this.chatScope === 'role' && typeof this.listRef.scrollToEnd === 'function') {
      try {
        this.listRef.scrollToEnd({ animated });
        requestAnimationFrame(() => {
          try {
            this.listRef?.scrollToEnd?.({ animated: false });
          } catch {}
        });
        return;
      } catch {}
    }

    const offset = Math.max(0, (this.lastContentHeight || 0) + 200);
    this.listRef.scrollToOffset({ offset, animated });
  };

  handleContentSizeChange = (width, height) => {
    const prevHeight = this.lastContentHeight || 0;
    this.lastContentHeight = height || 0;
    const heightChanged = Math.abs(this.lastContentHeight - prevHeight) > 2;
    if (this.state.isViewHistoryMode && this._historyPageChanging) {
      this.forceScrollToBottomOnce = false;
      this.shouldScrollToEnd = false;
      this.scrollHistoryReaderToTop(false);
      return;
    }
    const shouldFollow = this.forceScrollToBottomOnce || (this.shouldScrollToEnd && this.isNearBottom);
    if (shouldFollow && this.lastContentHeight > 0 && heightChanged) {
      this.scheduleBottomFollow();
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
      console.warn('Failed to load user avatar for agentrole', error);
    }
  };

  getUserAvatar = () => {
    if (this.state?.userAvatarUri) {
      return { type: 'image', uri: this.state.userAvatarUri };
    }
    return null;
  };

  handleUserAvatarPress = () => {
    const { navigation } = this.props;
    if (!navigation || typeof navigation.navigate !== 'function') {
      return;
    }
    navigation.navigate('UserAvatarSettings', { agentId: this.agentId });
  };

  isSystemCallMessage = text => isSystemCallMessageText(text);

  getAgentLocalAvatarUri = () => {
    const params = this.props.navigation?.state?.params || {};
    const shortCode = params.shortCode;
    if (!shortCode) return null;
    return this.state.agentLocalAvatarUri || null;
  }

  loadAgentLocalAvatar = async () => {
    try {
      const params = this.props.navigation?.state?.params || {};
      const shortCode = params.shortCode;
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
      console.warn('Failed to load agent local avatar', error);
    }
  }

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
    const localAvatarUri = this.getAgentLocalAvatarUri();
    const assetAvatarUri = buildHeadAssetUri(shortCode);
    const source = (item?._useSatoshiAvatar || this.isRoleMenuLikeText(item?.text || '') || this.shouldUseSatoshiPreLLMAvatar(item, visibleIndex))
      ? SATOSHI_PRE_LLM_AVATAR_SOURCE
      : (localAvatarUri ? { uri: localAvatarUri } : (assetAvatarUri ? { uri: assetAvatarUri } : require('../../img/bluebeast.png')));
    return (
      <View style={[styles.avatarWrapper, styles.agentAvatarWrapper]}>
        <Image source={source} style={styles.avatarImage} resizeMode="cover" />
      </View>
    );
  };

  buildAccessibleMessageText = params => buildAccessibleRoleMessageText(params, key => this.getRoleUiText(key));

  renderMessage = ({ item, index }) => {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const showDigest = this.isStoryScope && this.state.storyShortMode && item?._isHistory === true;
    const isStoryDigest = this.isStoryScope && Boolean(item?.ref) && showDigest;
    const isUser = item?.sender === 'user' || item?.role === 'user';
    const text = ensureRenderableText(showDigest ? item?.digest || item?.summary || item?.text || '' : item?.text || '', 'item.text');
    const hasCopyLink = Boolean(item?.copyText && item?.linkLabel) && !isStoryDigest;
    const hasInlineCopyLink = hasCopyLink && /\[\[\/role\s+(?:openstoryclone|openmemoryclone)\b/i.test(text);
    const forceCommandRender = item?._renderMode === 'commands';
    const commandSegments =
      isUser && !isStoryDigest && this.isValidCommandText(text)
        ? [{ text, isCommand: true }]
        : this.getCommandSegments(text);
    const hasCommand = Array.isArray(commandSegments) && commandSegments.some(segment => segment.isCommand || segment.commandText);
    const inlineLines =
      this.isStoryScope && !forceCommandRender && !isUser && !isStoryDigest && !hasCommand ? this.buildStoryInlineLines(text) : null;
    const hasCommandTokens = commandSegments.some(segment => segment.isCommand);
    const hasInlineChoices =
      Array.isArray(inlineLines) &&
      inlineLines.some(lineItem => lineItem?.type === 'choice' || lineItem?.segments?.some(segment => segment?.type === 'choice'));
    const disableBubblePress = hasCommandTokens || hasInlineChoices;
    const isSystemCall = !isUser && this.isSystemCallMessage(text);
    const messageTextStyle = [styles.messageText, isUser ? styles.userText : styles.agentText];
    const commandTextStyle = isUser ? styles.commandTextUser : styles.commandText;
    const accessibleMessageLabel = this.buildAccessibleMessageText({
      item,
      text,
      isUser,
      showDigest,
      isStoryDigest,
      hasCopyLink,
      stateIsHistory: this.state.isViewHistoryMode,
      isSystemCall,
    });
    const shouldUseHistoryAccessibleBubble = this.state.isViewHistoryMode || disableBubblePress;
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
              accessible={!this.state.isViewHistoryMode}
              importantForAccessibility={this.state.isViewHistoryMode ? 'no' : 'yes'}
              activeOpacity={0.7}
              onPress={() => this.handleAvatarPress(text)}
              style={styles.avatarPressable}
            >
              {this.renderAvatar('agent', item, index)}
            </TouchableOpacity>
          )}
          <View style={[styles.bubbleColumn, isUser ? styles.userBubbleColumn : styles.agentBubbleColumn]}>
            {shouldUseHistoryAccessibleBubble ? (
              <View
                accessible={this.state.isViewHistoryMode}
                accessibilityRole={this.state.isViewHistoryMode ? 'text' : undefined}
                accessibilityLabel={this.state.isViewHistoryMode ? accessibleMessageLabel : undefined}
                importantForAccessibility={this.state.isViewHistoryMode ? 'yes' : 'auto'}
                style={[styles.messageBubble, isUser ? styles.userBubble : styles.agentBubble, isSystemCall ? styles.systemCallBubble : null]}
              >
                <Text
                  style={messageTextStyle}
                  accessible={this.state.isViewHistoryMode ? false : undefined}
                  importantForAccessibility={this.state.isViewHistoryMode ? 'no' : 'auto'}
                >
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
                                {ensureRenderableText(segment.raw, 'inline.segment.raw')}
                              </Text>
                            ) : (
                              <Text key={`${item.id}-ln-${lineIndex}-seg-${segmentIndex}`} style={messageTextStyle}>
                                {ensureRenderableText(segment.text, 'inline.segment.text')}
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
                      ? ensureRenderableText(text, 'text.fallback')
                      : commandSegments.map((segment, segmentIndex) =>
                          segment.isCommand ? (
                            <Text
                              key={`${item.id}-command-${segmentIndex}`}
                              style={[messageTextStyle, commandTextStyle]}
                              onPress={() => this.handleCommandPress(ensureRenderableText(segment.commandText || segment.text, 'command.press'))}
                            >
                              {ensureRenderableText(segment.displayText || segment.text, 'command.display')}
                            </Text>
                          ) : (
                            <Text key={`${item.id}-text-${segmentIndex}`} style={messageTextStyle}>
                              {ensureRenderableText(segment.text, 'command.segment.text')}
                            </Text>
                          ),
                        )}
                  {hasInlineCopyLink ? (
                    <Text
                      key={`${item.id}-copy-prompt`}
                      style={[messageTextStyle, commandTextStyle]}
                      onPress={() => this.handleMessagePress(item.copyText)}
                      suppressHighlighting
                    >
                      {`   ${item.linkLabel}`}
                    </Text>
                  ) : null}
                </Text>
                {hasCopyLink && !hasInlineCopyLink && (
                  <TouchableOpacity
                    accessibilityLabel="Copy destiny seed card"
                    activeOpacity={0.7}
                    onPress={() => this.handleMessagePress(item.copyText)}
                  >
                    <Text style={[styles.messageText, styles.linkText]}>{item.linkLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                accessibilityLabel={accessibleMessageLabel}
                activeOpacity={0.7}
                onPress={
                  hasCopyLink
                    ? undefined
                    : () => (isStoryDigest ? this.handleDigestPress(item) : this.handleMessagePress(showDigest ? item?.text || '' : text))
                }
                onLongPress={
                  hasCopyLink || isStoryDigest
                    ? undefined
                    : () => this.handleMessageLongPress(showDigest ? item?.text || '' : text)
                }
                style={[styles.messageBubble, isUser ? styles.userBubble : styles.agentBubble, isSystemCall ? styles.systemCallBubble : null]}
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
                                {ensureRenderableText(segment.raw, 'inline.segment.raw')}
                              </Text>
                            ) : (
                              <Text key={`${item.id}-ln-${lineIndex}-seg-${segmentIndex}`} style={messageTextStyle}>
                                {ensureRenderableText(segment.text, 'inline.segment.text')}
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
                      ? ensureRenderableText(text, 'text.fallback')
                      : commandSegments.map((segment, segmentIndex) =>
                          segment.isCommand ? (
                            <Text
                              key={`${item.id}-command-${segmentIndex}`}
                              style={[messageTextStyle, commandTextStyle]}
                              onPress={() => this.handleCommandPress(ensureRenderableText(segment.commandText || segment.text, 'command.press'))}
                            >
                              {ensureRenderableText(segment.displayText || segment.text, 'command.display')}
                            </Text>
                          ) : (
                            <Text key={`${item.id}-text-${segmentIndex}`} style={messageTextStyle}>
                              {ensureRenderableText(segment.text, 'command.segment.text')}
                            </Text>
                          ),
                        )}
                  {hasInlineCopyLink ? (
                    <Text
                      key={`${item.id}-copy-prompt`}
                      style={[messageTextStyle, commandTextStyle]}
                      onPress={() => this.handleMessagePress(item.copyText)}
                      suppressHighlighting
                    >
                      {`   ${item.linkLabel}`}
                    </Text>
                  ) : null}
                </Text>
                {hasCopyLink && !hasInlineCopyLink && (
                  <TouchableOpacity
                    accessibilityLabel="Copy destiny seed card"
                    activeOpacity={0.7}
                    onPress={() => this.handleMessagePress(item.copyText)}
                  >
                    <Text style={[styles.messageText, styles.linkText]}>{item.linkLabel}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
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
              accessible={!this.state.isViewHistoryMode}
              importantForAccessibility={this.state.isViewHistoryMode ? 'no' : 'yes'}
              activeOpacity={0.7}
              onPress={this.handleUserAvatarPress}
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
    const isSwitchWorldlineMode = this.state.isViewHistoryMode && this.state.isSwitchWorldlineMode;
    const historyViewMode = this.state.historyViewMode || null;
    const isStorySummaryMode = this.state.isViewHistoryMode && historyViewMode === 'story-summary';
    const historySpeakLabel = isStorySummaryMode
      ? (this.state.isHistorySpeaking ? this.getRoleUiText('voiceStatus') : (this.getRoleUiText('storySummarySpeak') || 'Read summary'))
      : (this.state.isHistorySpeaking ? this.getRoleUiText('voiceStatus') : this.getRoleUiText('viewHistoryRecords'));
    const summaryRecord = isStorySummaryMode && Array.isArray(this.state.historyRawMessages) ? this.state.historyRawMessages[0] || null : null;
    const historyBannerTitle = isSwitchWorldlineMode
      ? 'WARNING: WORLDLINE SWITCH'
      : '';
    const historyPageCount = Math.max((this.state.historyPages || []).length, 1);
    const historyPageIndex = Math.max(0, Math.min(historyPageCount - 1, this.state.historyPageIndex || 0));
    return (
      <SafeAreaView style={[styles.container, isSwitchWorldlineMode ? styles.warningContainer : null]}>
        <KeyboardAvoidingView
          style={[styles.container, isSwitchWorldlineMode ? styles.warningContainer : null]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={[styles.chatContainer, isSwitchWorldlineMode ? styles.warningChatContainer : null]}>
            {this.state.isViewHistoryMode && (
              <View style={[styles.historyModeBanner, isSwitchWorldlineMode ? styles.warningHistoryModeBanner : null]}>
                {!!historyBannerTitle && <Text style={styles.warningHistoryModeTitle}>{historyBannerTitle}</Text>}
                <View style={styles.historySpeakActions}>
                  {!isStorySummaryMode && (
                    <TouchableOpacity
                      style={[styles.historySpeakButton, isSwitchWorldlineMode ? styles.warningHistorySpeakButton : null]}
                      onPress={this.handleSpeakViewHistory}
                    >
                      <Text style={[styles.historySpeakButtonText, isSwitchWorldlineMode ? styles.warningHistorySpeakButtonText : null]}>{historySpeakLabel}</Text>
                    </TouchableOpacity>
                  )}
                  {isStorySummaryMode && (
                    <>
                      <TouchableOpacity
                        style={[styles.historySpeakButton, isSwitchWorldlineMode ? styles.warningHistorySpeakButton : null]}
                        onPress={() => this.handleCopyRoleStorySummaryPress(summaryRecord)}
                      >
                        <Text style={[styles.historySpeakButtonText, isSwitchWorldlineMode ? styles.warningHistorySpeakButtonText : null]}>{this.getRoleUiText('copyFullStorySummary') || 'Copy full text'}</Text>
                      </TouchableOpacity>
                      <View style={{ width: 10 }} />
                      <TouchableOpacity
                        style={[styles.historySpeakButton, isSwitchWorldlineMode ? styles.warningHistorySpeakButton : null]}
                        onPress={() => this.openRoleStorySummaryRecords({ forceRefresh: true }).catch(error => Alert.alert(this.getRoleUiText('storySummaryFailed') || 'Story summary failed', String(error?.message || error || 'unknown')))}
                      >
                        <Text style={[styles.historySpeakButtonText, isSwitchWorldlineMode ? styles.warningHistorySpeakButtonText : null]}>{this.getRoleUiText('updateStorySummary') || 'Update summary'}</Text>
                      </TouchableOpacity>
                      <View style={{ width: 10 }} />
                      <TouchableOpacity
                        style={[
                          styles.historySpeakButton,
                          isSwitchWorldlineMode ? styles.warningHistorySpeakButton : null,
                          this.state.isStorySummaryCommitPending ? { opacity: 0.45 } : null,
                        ]}
                        disabled={this.state.isStorySummaryCommitPending}
                        onPress={() => this.handleCommitRoleStorySummaryPress(summaryRecord)}
                      >
                        <Text style={[styles.historySpeakButtonText, isSwitchWorldlineMode ? styles.warningHistorySpeakButtonText : null]}>{this.getRoleUiText('storySummaryCommit') || 'Upload block'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {this.state.isHistorySpeaking && (
                    <TouchableOpacity
                      style={[styles.historySpeakStopButton, isSwitchWorldlineMode ? styles.warningHistorySpeakStopButton : null]}
                      onPress={this.handleStopViewHistorySpeak}
                    >
                      <Text style={[styles.historySpeakButtonText, isSwitchWorldlineMode ? styles.warningHistorySpeakButtonText : null]}>{this.getRoleUiText('stop')}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.historySpeakSpacer} />
                  <TouchableOpacity
                    style={[styles.historyBackButton, isSwitchWorldlineMode ? styles.warningHistoryBackButton : null]}
                    onPress={this.exitViewHistoryMode}
                  >
                    <Text style={[styles.historySpeakButtonText, isSwitchWorldlineMode ? styles.warningHistorySpeakButtonText : null]}>{this.getRoleUiText('returnHere')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <FlatList
              ref={ref => {
                this.listRef = ref;
              }}
              data={this.state.isViewHistoryMode ? (this.state.historyPages[this.state.historyPageIndex] || []) : this.state.messages}
              extraData={this.state.isViewHistoryMode ? this.state.historyPageIndex : this.state.messages.length}
              keyExtractor={(item, index) => String(item?.id || `fallback-${index}`)}
              renderItem={this.state.isViewHistoryMode ? this.renderHistoryReaderItem : this.renderMessage}
              contentContainerStyle={(this.state.isViewHistoryMode ? (this.state.historyPages[this.state.historyPageIndex] || []) : this.state.messages).length === 0 ? styles.emptyContainer : (this.state.isViewHistoryMode ? styles.historyReaderListContent : styles.listContent)}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Start a conversation with this agent.</Text>
                </View>
              )}
              onContentSizeChange={this.handleContentSizeChange}
              onLayout={() => {
                const activeData = this.state.isViewHistoryMode ? (this.state.historyPages[this.state.historyPageIndex] || []) : this.state.messages;
                if (!this.didInitialScroll && activeData.length > 0) {
                  this.forceScrollToBottomOnce = true;
                  this.didInitialScroll = true;
                  requestAnimationFrame(() => this.scrollToBottomOffset(false));
                }
              }}
              onScroll={this.handleScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
            />
            {this.state.isViewHistoryMode && (
              <View style={[styles.historyPagerActionsBottom, isSwitchWorldlineMode ? styles.warningHistoryPagerActionsBottom : null]}>
                <TouchableOpacity
                  style={[styles.historyPagerButton, styles.historyPagerEdgeButton, isSwitchWorldlineMode ? styles.warningHistoryPagerButton : null]}
                  onPress={() => this.goHistoryPageTo(0)}
                >
                  <Text style={[styles.historyPagerButtonText, isSwitchWorldlineMode ? styles.warningHistoryPagerButtonText : null]}>{this.getRoleUiText('firstPage') || 'First'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.historyPagerButton, styles.historyPagerStepButton, isSwitchWorldlineMode ? styles.warningHistoryPagerButton : null]}
                  onPress={() => this.goHistoryPage(-1)}
                >
                  <Text style={[styles.historyPagerButtonText, isSwitchWorldlineMode ? styles.warningHistoryPagerButtonText : null]}>{this.getRoleUiText('previousPage')}</Text>
                </TouchableOpacity>
                <View style={styles.historyPagerSliderWrap}>
                  <Slider
                    style={styles.historyPagerSlider}
                    minimumValue={0}
                    maximumValue={Math.max(historyPageCount - 1, 0)}
                    step={1}
                    value={historyPageIndex}
                    minimumTrackTintColor={isSwitchWorldlineMode ? '#ffd24a' : '#6f8dff'}
                    maximumTrackTintColor={isSwitchWorldlineMode ? '#4a2200' : '#24304a'}
                    thumbTintColor={isSwitchWorldlineMode ? '#ffd24a' : '#ffffff'}
                    disabled={historyPageCount <= 1}
                    onSlidingComplete={value => this.goHistoryPageTo(value)}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.historyPagerButton, styles.historyPagerStepButton, isSwitchWorldlineMode ? styles.warningHistoryPagerButton : null]}
                  onPress={() => this.goHistoryPage(1)}
                >
                  <Text style={[styles.historyPagerButtonText, isSwitchWorldlineMode ? styles.warningHistoryPagerButtonText : null]}>{this.getRoleUiText('nextPage')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.historyPagerButton, styles.historyPagerEdgeButton, isSwitchWorldlineMode ? styles.warningHistoryPagerButton : null]}
                  onPress={() => this.goHistoryPageTo(historyPageCount - 1)}
                >
                  <Text style={[styles.historyPagerButtonText, isSwitchWorldlineMode ? styles.warningHistoryPagerButtonText : null]}>{this.getRoleUiText('lastPage') || 'Last'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {!!this.getRoleTalkStatusText() && !this.state.isViewHistoryMode && (
            <View style={styles.talkStatusContainer}>
              <Text style={styles.talkStatusText}>{this.getRoleTalkStatusText()}</Text>
            </View>
          )}
          {!this.state.isViewHistoryMode && (
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
              <TouchableOpacity
                style={[
                  styles.talkButton,
                  this.state.talkState === ROLE_TALK_STATES.LISTENING && styles.talkButtonListening,
                  (this.state.talkState === ROLE_TALK_STATES.RECOGNIZING || this.state.talkState === ROLE_TALK_STATES.SUBMITTING) && styles.talkButtonBusy,
                  this.state.talkState === ROLE_TALK_STATES.ERROR && styles.talkButtonError,
                ]}
                onPress={this.handleRoleTalkPress}
                disabled={this.state.talkState === ROLE_TALK_STATES.RECOGNIZING || this.state.talkState === ROLE_TALK_STATES.SUBMITTING}
              >
                <Text
                  style={[
                    styles.talkButtonLetter,
                    this.state.talkState === ROLE_TALK_STATES.LISTENING && styles.talkButtonLetterRecording,
                  ]}
                >
                  {this.state.talkState === ROLE_TALK_STATES.LISTENING ? 'R' : 'T'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={this.handleSend}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
}

const mapStateToProps = state => ({
  namespaceList: state.namespaceList,
});

export default connect(mapStateToProps)(AgentChat);
