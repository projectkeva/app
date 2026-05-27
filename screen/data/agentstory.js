import React from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Icon } from 'react-native-elements';
import RNFS from 'react-native-fs';
const LAST_ROLE_SPACE_PATH = `${RNFS.DocumentDirectoryPath}/agent_chats/_last_role_space.json`;
const LAST_STORY_SPACE_PATH = `${RNFS.DocumentDirectoryPath}/agent_chats/_last_story_space.json`;
import AsyncStorage from '@react-native-community/async-storage';
import { connect } from 'react-redux';
let BlueElectrum = require('../../BlueElectrum');
const StyleSheet = require('../../PlatformStyleSheet');
const KevaColors = require('../../common/KevaColors');
import { BlueNavigationStyle } from '../../BlueComponents';
let loc = require('../../loc');
import { attachAgentChatLLM } from './agentchat_llm';
import { LLM_PROVIDERS } from './agentchat_llm_providers';
import {
  appendDigestEntry,
  buildDigestFromRaw,
  ensureStoryDirs,
  getStoryCurrentPath,
  getStoryDigestPath,
  getStoryRawPath,
  readStoryEntriesByDay,
  toDigestFallbackText,
  updateDigestEntry,
} from './agentchat_story_storage';
import {
  analyzeAlphaDelta,
  appendAlphaLogEntry as appendStoryAlphaLogEntry,
  buildAlphaPromptBlock,
  clearCurrentAlphaLog as clearStoryCurrentAlphaLog,
  ensureAlphaDirs,
  ensureAlphaState,
  getAlphaLogDir,
  getAlphaStatePath,
  getCurrentAlphaLogPath,
  readCurrentAlphaLog as readStoryCurrentAlphaLog,
  writeAlphaStateFile,
} from './story_alpha';
import { buildHeadAssetUri } from '../../common/namespaceAvatar';
import { getUserAvatarUri } from '../../common/userAvatar';
const SATOSHI_PRE_LLM_AVATAR_SOURCE = require('../../android/app/src/main/assets/os/theme/retro/icons/satoshi-avatar.png');
import { getInitials, showStatus, stringToColor, timeConverter } from '../../util';
import ActionSheet from '../ActionSheet';
import { buildStoryAutostartHeader, buildStoryDigestPrompt, buildStoryLanguageInstruction, getStoryLLMLanguageName, removeStoryLanguageHandshake } from './agentstory_language_runtime';
import {
  STORY_SUPPORTED_LANGS,
  STORY_OPTION_FALLBACK_PROMPTS,
  STORY_OPTION_FALLBACK_TEXTS,
  getDefaultStoryLangCode,
  getStoryBootstrapFallbackLabels,
  getStoryLangLabel,
  getStoryMenuText as getStoryMenuTextForLocale,
  getStoryOptionFallbackPrompt,
  getStoryOptionFallbackText,
  getStoryUiText,
  normalizeStoryLangCode,
} from './agentstory_i18n';
import { buildDestinySeedPrompt, buildRoleplayPrompt, buildStoryAttributePromptBlock } from './agentstory_runtime_prompts';
import { buildStoryFragmentSeedBlock } from './agentrole_story_fragment_import';

const CHAT_DIR = `${RNFS.DocumentDirectoryPath}/agent_chats`;
const LLM_DIR = `${RNFS.DocumentDirectoryPath}/llm`;

const LLM_BUILTIN_PATH = `${LLM_DIR}/builtin.json`;
const LLM_CUSTOM_PATH = `${LLM_DIR}/custom.json`;
const LLM_ACTIVE_PATH = `${LLM_DIR}/active.json`;
const LLM_LAST_USED_PATH = `${LLM_DIR}/last_used.json`;
const getLlmBuiltinPath = agentId => `${LLM_DIR}/builtin_${encodeURIComponent(String(agentId || 'default'))}.json`;
const getLlmCustomPath = agentId => `${LLM_DIR}/custom_${encodeURIComponent(String(agentId || 'default'))}.json`;
const getLlmActivePath = agentId => `${LLM_DIR}/active_${encodeURIComponent(String(agentId || 'default'))}.json`;
const getLlmLastUsedPath = agentId => `${LLM_DIR}/last_used_${encodeURIComponent(String(agentId || 'default'))}.json`;
const STORY_BLOCK_CACHE_PATH = `${CHAT_DIR}/_story_block_cache.json`;
const LOCAL_NAMESPACE_AVATAR_DIR = `${RNFS.DocumentDirectoryPath}/namespace_avatars`;
const getNamespaceAvatarPath = namespaceId => `${LOCAL_NAMESPACE_AVATAR_DIR}/${encodeURIComponent(String(namespaceId || 'unknown'))}.jpg`;
const STORY_LANG_CODE_STORAGE_KEY = 'story_lang_code';
const getRoleLangStorageKey = agentId => `role_lang_code_${encodeURIComponent(String(agentId || 'default'))}`;

const getLLMOverridePath = agentId => `${LLM_DIR}/overrides_${encodeURIComponent(agentId)}.json`;
const LLM_HISTORY_LIMIT = 16;
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

const normalizeConversationSummary = summary => {
  const normalized = summary && typeof summary === 'object' ? summary : {};
  return {
    facts: Array.isArray(normalized.facts) ? normalized.facts.filter(item => String(item || '').trim()) : [],
    open_loops: Array.isArray(normalized.open_loops) ? normalized.open_loops.filter(item => String(item || '').trim()) : [],
    recent_arc: Array.isArray(normalized.recent_arc) ? normalized.recent_arc.filter(item => String(item || '').trim()) : [],
  };
};

const buildConversationSummaryPromptBlock = summary => {
  const normalized = normalizeConversationSummary(summary);
  const lines = [];
  if (normalized.facts.length) {
    lines.push('CONVERSATION FACTS:');
    normalized.facts.forEach(item => lines.push(`- ${item}`));
  }
  if (normalized.open_loops.length) {
    lines.push('OPEN LOOPS:');
    normalized.open_loops.forEach(item => lines.push(`- ${item}`));
  }
  if (normalized.recent_arc.length) {
    lines.push('RECENT ARC:');
    normalized.recent_arc.forEach(item => lines.push(`- ${item}`));
  }
  return lines.join('\n').trim();
};

function getAgentIdFromParams(params = {}) {
  return (params.shortCode || params.namespaceId || params.agentId || 'default').toString();
}

const COMMAND_TOKEN_REGEX = /\/(?:d|block|a)\b/gi;
const COMMAND_DISPLAY_TOKEN_REGEX = /\[\[([^\]|]+)\|([^\]]+)\]\]/gi;
const STORY_CHOICE_PREFIX_RE =
  /^\s*(?:\[\s*([A-Za-z]|\d{1,2})\s*\]|【\s*([A-Za-z]|\d{1,2})\s*】|\(\s*([A-Za-z]|\d{1,2})\s*\)|（\s*([A-Za-z]|\d{1,2})\s*）|([A-Za-z]|\d{1,2})\s*[).:：、．])\s*(.+)$/;
const STORY_EMPTY_OPTION_FALLBACK_SOURCE = 'auto-empty-choice-fallback';
const STORY_BOOTSTRAP_FALLBACK_SOURCE = 'bootstrap-choice-fallback';
const STORY_AUTO_FALLBACK_SETTLE_MS = 1500;
const stripMarkdownWrap = s => {
  let t = String(s || '').trim();
  if ((t.startsWith('**') && t.endsWith('**')) || (t.startsWith('__') && t.endsWith('__'))) {
    t = t.slice(2, -2).trim();
  }
  return t;
};
const getLocalDateKey = (ts = Date.now()) => {
  const d = new Date(ts);
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const PAGE_SIZE = 10;
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

const hasUsableLLMConfig = cfg => {
  if (!cfg || typeof cfg !== 'object') {
    return false;
  }
  const active =
    cfg?.activeProvider?.name ||
    cfg?.activeProviderName ||
    cfg?.provider ||
    cfg?.model ||
    cfg?.name ||
    cfg?.endpoint;
  return Boolean(String(active || '').trim());
};


class AgentChat extends React.Component {

  persistLastSpaceShortcut = async type => {
    try {
      const params = this.props.navigation?.state?.params || {};
      const namespaceId = params.namespaceId || '';
      const shortCode = params.shortCode || '';
      const shortId = params.shortId || '';
      if (!namespaceId && !shortCode && !shortId) return;
      const payload =
        type === 'story'
          ? {
              ...(shortCode ? { shortCode } : {}),
              ...(shortId ? { shortId } : {}),
            }
          : {
              type,
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
              roleEntrySource: params.roleEntrySource || 'story',
              autoCommand: params.autoCommand || null,
              suppressAutoLinkStart: true,
            };
      const path = type === 'role' ? LAST_ROLE_SPACE_PATH : LAST_STORY_SPACE_PATH;
      const tempPath = `${path}.tmp`;
      const payloadText = JSON.stringify(payload, null, 2);
      const debugPath = `${RNFS.DocumentDirectoryPath}/agent_chats/_last_space_debug.log`;
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/agent_chats`).catch(() => {});
      await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist type=${type} docDir=${RNFS.DocumentDirectoryPath} path=${path} tempPath=${tempPath} payload=${JSON.stringify(payload)}\n`, 'utf8').catch(() => {});
      await RNFS.writeFile(tempPath, payloadText, 'utf8');
      let directRecreateOk = false;
      try {
        if (await RNFS.exists(path)) {
          await RNFS.unlink(path);
        }
        await RNFS.writeFile(path, payloadText, 'utf8');
        directRecreateOk = true;
        await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist direct-recreate ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
        await RNFS.unlink(tempPath).catch(() => {});
      } catch (directError) {
        await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist direct-recreate fail type=${type} path=${path} error=${String(directError?.message || directError || 'unknown')}\n`, 'utf8').catch(() => {});
      }
      if (!directRecreateOk) {
        try {
          await RNFS.moveFile(tempPath, path);
          await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist fallback-move ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
        } catch (moveError) {
          await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist fallback-move fail type=${type} path=${path} error=${String(moveError?.message || moveError || 'unknown')}\n`, 'utf8').catch(() => {});
          await RNFS.writeFile(path, payloadText, 'utf8');
          await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist fallback-overwrite ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
          await RNFS.unlink(tempPath).catch(() => {});
        }
      }
      await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist ok type=${type} path=${path}\n`, 'utf8').catch(() => {});
    } catch (error) {
      const debugPath = `${RNFS.DocumentDirectoryPath}/agent_chats/_last_space_debug.log`;
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/agent_chats`).catch(() => {});
      await RNFS.appendFile(debugPath, `${new Date().toISOString()} agentstory persist fail type=${type} docDir=${RNFS.DocumentDirectoryPath} error=${String(error?.message || error || 'unknown')}\n`, 'utf8').catch(() => {});
      console.warn('Failed to persist last space shortcut', error);
    }
  };


  constructor(props) {
    super(props);
    this.state = {
      allMessages: [],
      messages: [],
      visibleCount: PAGE_SIZE,
      llmConfig: null,
      storyShortMode: true,
      storyLangCode: null,
      pendingDestinyRun: false,
      pendingDestinyMode: null,
      pendingReturnToDestinyMenu: false,
      pendingModelFinalConfirm: false,
      pendingAISetup: false,
      pendingAISetupStep: null,
      pendingAISetupDraft: null,
      pendingReturnToRoleMenu: false,
      pendingReturnToStoryMenu: false,
      agentLocalAvatarUri: null,
      userAvatarUri: null,
      currentStoryMessages: [],
      currentStorySessionId: null,
      currentStoryChoices: [],
      currentStoryHasStoryFile: false,
      currentStoryHasChoiceFile: false,
      storyLinkStatus: 'LINK IDLE',
      storyLinkDetail: '',
      storyLinkStartFeedbackActive: false,
      headerCommsActive: false,
      currentStoryStatus: 'idle',
      currentStoryPhase: 'boot',
      currentStoryRoleName: '',
      currentStoryRoleSlug: '',
      currentStoryEntryMode: 'new',
      currentStoryLastChoiceSet: [],
      currentStoryAwaitingChoice: false,
      currentStoryShouldResumeGeneration: false,
      lastSubmittedChoiceAt: 0,
      currentAlpha: null,
      baseAlpha: null,
      isArchivingCurrentStory: false,
      panelSignalBlinkOn: false,
    };
    this.loadingMore = false;
    this.didInitialScroll = false;
    this.shouldScrollToEnd = false;
    this.isNearBottom = true;
    this.lastContentHeight = 0;
    this.forceScrollToBottomOnce = false;
    this.pendingScrollBottomTimeouts = [];
    this.hasAutoCommandRun = false;
    this.lastAutoCommand = null;
    this._lastAutoDAt = 0;
    this._latestStoryBlockHeight = null;
    this._pendingChoiceSubmissionAt = 0;
    this._pendingChoiceUserMessageId = null;
    this._storyPersistenceUnlocked = false;
    this._currentStoryPersistCancelled = false;
    this._storyAutoFallbackInFlight = false;
    this._storyAutoFallbackSourceMessageId = null;
    this._storyMissingReplyFallbackInFlight = false;
    this._storyMissingReplyFallbackSourceKey = null;
    this.headerGlowAnim = new Animated.Value(0);
    this.headerGlowLoop = null;
    this.panelSignalTimer = null;
    const params = this.props.navigation?.state?.params || {};
    this.agentId = getAgentIdFromParams(params);
    this.chatScope = 'story';
    this.isStoryScope = true;
    this.agentChatDir = `${CHAT_DIR}/${encodeURIComponent(this.agentId)}/${encodeURIComponent(this.chatScope)}`;
    this.roleChatDir = `${CHAT_DIR}/${encodeURIComponent(this.agentId)}/role`;
    this.roleFilesDir = `${this.roleChatDir}/roles`;
    this.currentRolePath = `${this.roleChatDir}/current_role.json`;
    this.getStoryRawPath = dateKey => getStoryRawPath(this.agentChatDir, dateKey);
    this.getStoryDigestPath = dateKey => getStoryDigestPath(this.agentChatDir, dateKey);
    this.getStoryCurrentPath = () => getStoryCurrentPath(this.agentChatDir);
    this.getStoryChoicesPath = () => `${this.agentChatDir}/current_choices.json`;
    this.getSpaceRoleKey = () => String(this.agentId || 'default').trim() || 'default';
    this.getRoleDirPath = roleSlug => `${this.roleFilesDir}/${this.getSpaceRoleKey()}`;
    this.getRoleFilePath = roleSlug => `${this.getRoleDirPath(roleSlug)}/role.json`;
    this.getConversationSummaryPath = roleSlug => `${this.getRoleDirPath(roleSlug)}/conversation_summary.json`;
    this.getStoryAlphaPath = () => getAlphaStatePath(this.agentChatDir);
    this.getStoryAlphaLogDir = () => getAlphaLogDir(this.agentChatDir);
    this.getStoryCurrentAlphaLogPath = () => getCurrentAlphaLogPath(this.agentChatDir);
    this.getStoryRunsDir = () => `${this.agentChatDir}/runs`;
    this.currentRoleContext = null;
    this.activeRoleLangCode = null;
    this.loadedDateKeys = [];
    this.allDateKeys = [];
    this.persistQueue = Promise.resolve();
    this.digestPersistQueue = Promise.resolve();
    this._currentStoryPersistQueue = Promise.resolve(null);
    this._storyChoicePersistQueue = Promise.resolve([]);
    this._storyChoicePersistCancelled = false;
    this.currentLLMConfig = null;
    this.llmBuiltinPath = getLlmBuiltinPath(this.agentId);
    this.llmCustomPath = getLlmCustomPath(this.agentId);
    this.llmActivePath = getLlmActivePath(this.agentId);
    this.llmLastUsedPath = getLlmLastUsedPath(this.agentId);
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

  hasLegacyLinkStartOnlyStoryState = () => {
    if (!this.state.currentStoryHasStoryFile || this.state.currentStoryHasChoiceFile) {
      return false;
    }

    const messages = Array.isArray(this.state.currentStoryMessages) ? this.state.currentStoryMessages : [];
    if (!messages.length) {
      return false;
    }

    return messages.every(message => {
      const sender = String(message?.sender || '').toLowerCase();
      const text = String(message?.text || '').trim();
      return sender === 'user' && /^\/(?:linkstart|a)\b/i.test(text);
    });
  };

  getStoryDockDisplayState = () => {
    const rawChoices = Array.isArray(this.state.currentStoryChoices) ? this.state.currentStoryChoices : [];
    const hasChoiceFile = Boolean(this.state.currentStoryHasChoiceFile);
    const hasStoryFile = Boolean(this.state.currentStoryHasStoryFile);

    if (rawChoices.length > 0 || hasChoiceFile) {
      return 'choices';
    }
    if (hasStoryFile && !this.hasLegacyLinkStartOnlyStoryState()) {
      return 'awaiting';
    }

    return 'start';
  };

  renderHeaderCommsBadge = () => {
    const dockDisplayState = this.getStoryDockDisplayState();
    const isWaitingSignal = dockDisplayState === 'awaiting';
    const textColor = isWaitingSignal ? '#6dff97' : '#7c8598';
    return (
      <View style={[styles.headerCenterWrap, styles.headerCenterWrapAbsolute]}>
        <View
          style={[
            styles.headerCommsBadge,
            isWaitingSignal ? styles.headerCommsBadgeActive : styles.headerCommsBadgeIdle,
          ]}
        >
          <Text style={[styles.headerCenterText, { color: textColor, opacity: 1 }]}>A.G.U Comms</Text>
        </View>
      </View>
    );
  };

  static navigationOptions = ({ navigation }) => {
    return {
      ...BlueNavigationStyle(),
      title: '',
      headerStyle: {
        backgroundColor: '#0a0f18',
        borderBottomColor: '#1b2336',
        elevation: 0,
        shadowColor: 'transparent',
        borderBottomWidth: 1,
      },
      headerTintColor: '#9fc2ff',
      headerTitle: () => (
        <View style={styles.headerCenterWrap}>
          <Text style={[styles.headerCenterText, styles.headerCenterTextIdle]}>A.G.U Comms</Text>
        </View>
      ),
      headerRight: () => {
        const currentAlpha = navigation?.state?.params?.currentAlpha;
        const hasAlpha = Number.isFinite(Number(currentAlpha));
        if (!hasAlpha) {
          return <View style={styles.headerToolbarRightWrap} />;
        }
        const alphaValue = Number(currentAlpha);
        const alphaColor = alphaValue > 0 ? '#d96b8a' : alphaValue < 0 ? '#5f88ff' : '#8c96ab';
        const alphaBg = alphaValue > 0 ? '#fff1f5' : alphaValue < 0 ? '#eef3ff' : '#f3f6fb';
        return (
          <View style={styles.headerToolbarRightWrap}>
            <View style={[styles.headerToolbarPill, styles.headerToolbarPillIdle, { backgroundColor: alphaBg, borderColor: alphaColor }]}>
              <Text style={[styles.headerToolbarButtonText, { color: alphaColor }]}>{`α${alphaValue > 0 ? `+${alphaValue}` : alphaValue}`}</Text>
            </View>
          </View>
        );
      },
    };
  };

  componentDidMount() {
    this._isMounted = true;
    this._currentStoryPersistCancelled = false;
    this._storyChoicePersistCancelled = false;
    const paramsDebugPath = `${RNFS.DocumentDirectoryPath}/agent_chats/_params_debug.log`;
    RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/agent_chats`).catch(() => {});
    RNFS.appendFile(paramsDebugPath, `${new Date().toISOString()} agentstory componentDidMount params=${JSON.stringify(this.props.navigation?.state?.params || {})}\n`, 'utf8').catch(() => {});
    this.props.navigation?.setParams?.({ onOpenSettings: this.openStorySettings, currentAlpha: this.state.currentAlpha });
    this.updateHeaderCommsAnimation(false);
    this.initializeChat();
    this.loadUserAvatar();
    this.avatarUnsubscribe = this.props.navigation?.addListener?.('didFocus', () => {
      this.loadUserAvatar();
      this.refreshMessagesFromStorage();
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const prevAutoCommand = prevProps.navigation?.state?.params?.autoCommand;
    const nextAutoCommand = this.props.navigation?.state?.params?.autoCommand;
    if (nextAutoCommand && nextAutoCommand !== prevAutoCommand && nextAutoCommand !== this.lastAutoCommand) {
      this.hasAutoCommandRun = false;
      this.runAutoCommand();
    }
    if (prevState?.currentAlpha !== this.state.currentAlpha) {
      this.props.navigation?.setParams?.({ currentAlpha: this.state.currentAlpha });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    // Do not cancel the current-story persist queue on navigation exit.
    // The Story screen can unmount immediately after an LLM reply is rendered;
    // cancelling here leaves current_choices.json saved but current_story.json
    // still containing only runtime metadata, so re-entry shows choices with no messages.
    this._storyChoicePersistCancelled = true;
    this._storyChoicePersistQueue = Promise.resolve([]);
    if (this.headerGlowLoop) {
      this.headerGlowLoop.stop();
      this.headerGlowLoop = null;
    }
    if (this.panelSignalTimer) {
      clearInterval(this.panelSignalTimer);
      this.panelSignalTimer = null;
    }
    if (Array.isArray(this.pendingScrollBottomTimeouts)) {
      this.pendingScrollBottomTimeouts.forEach(timer => clearTimeout(timer));
      this.pendingScrollBottomTimeouts = [];
    }
    if (this.avatarUnsubscribe && typeof this.avatarUnsubscribe.remove === 'function') {
      this.avatarUnsubscribe.remove();
    }
  }

  initializeChat = async () => {
    await this.ensureDirs();
    await this.restoreStoryLangCode();
    await this.restoreRoleContextFromStorage();
    await this.loadAgentLocalAvatar();

    const [builtinRead, customRead, activeRead] = await Promise.all([
      this.readJsonFile(this.llmBuiltinPath),
      this.readJsonFile(this.llmCustomPath),
      this.readJsonFile(this.llmActivePath),
    ]);

    const migrateFromGlobal = async (scopedRead, isRegistry, globalPath, writeMethod, onParseErrorMsg) => {
      if (scopedRead.__missing) {
        const globalRead = await this.readJsonFile(globalPath);
        if (!globalRead.__missing && !globalRead.__parseError && globalRead.value) {
          await writeMethod(globalRead.value);
          return;
        }
        if (isRegistry) {
          await writeMethod({});
        } else {
          await writeMethod({ name: '' });
        }
        return;
      }
      if (scopedRead.__parseError) {
        this.replyFromAgent(onParseErrorMsg);
      }
    };

    await migrateFromGlobal(
      builtinRead,
      true,
      LLM_BUILTIN_PATH,
      this.writeBuiltinRegistry,
      this.getStoryMenuText('llmBuiltinCorrupted', { path: LLM_BUILTIN_PATH }),
    );
    await migrateFromGlobal(
      customRead,
      true,
      LLM_CUSTOM_PATH,
      this.writeCustomRegistry,
      this.getStoryMenuText('llmCustomCorrupted', { path: LLM_CUSTOM_PATH }),
    );
    if (activeRead.__missing) {
      const globalActiveRead = await this.readJsonFile(LLM_ACTIVE_PATH);
      if (!globalActiveRead.__missing && !globalActiveRead.__parseError && globalActiveRead.value) {
        await this.writeActiveProvider(globalActiveRead.value);
      } else {
        await this.writeActiveProvider({ name: '' });
      }
    } else if (activeRead.__parseError) {
      this.replyFromAgent(this.getStoryMenuText('llmActiveCorrupted', { path: LLM_ACTIVE_PATH }));
    }

    const llmConfig = await this.loadLLMConfig();
    const roleContext = await this.loadCurrentRoleForStory();
    if (!roleContext) {
      this.setStoryLinkStatus(this.getStoryMenuText('roleRequired'), this.getStoryMenuText('roleRequiredDetail'));
    }
    const alphaState = roleContext ? await this.ensureStoryAlphaState(roleContext) : null;
    const paramsForStartup = this.props.navigation?.state?.params || {};
    const shouldClearStoryOnMount = Boolean(paramsForStartup.clearStoryOnMount);
    if (this.isStoryScope && shouldClearStoryOnMount) {
      await this.resetStoryStorageAndRestart();
      const keepAutoCommandAfterClear = String(paramsForStartup.autoCommandSource || '').trim() === 'story-fragment-import';
      this.props.navigation?.setParams?.({
        clearStoryOnMount: false,
        ...(keepAutoCommandAfterClear ? {} : { autoCommand: null }),
      });
    } else {
      await this.persistLastSpaceShortcut('story');
    }
    await this.refreshMessagesFromStorage();
    if (this.isStoryScope && roleContext && alphaState) {
      const storyFileExists = await RNFS.exists(this.getStoryCurrentPath());
      await this.updateCurrentStoryRuntime(
        {
          roleName: roleContext.roleName || '',
          roleSlug: roleContext.roleSlug || '',
          currentAlpha: Number(alphaState.currentAlpha),
          baseAlpha: Number(alphaState.baseAlpha),
        },
        { persist: storyFileExists },
      );
    }
    if (!this._isMounted) {
      return;
    }
    const allMessages = this.state.allMessages || [];
    const visibleCount = Math.min(allMessages.length, PAGE_SIZE);
    this.setState(
      {
        visibleCount,
        messages: allMessages.slice(-visibleCount),
        llmConfig,
      },
      () => {
        this.currentLLMConfig = llmConfig;
        this.shouldScrollToEnd = true;
        this.forceScrollToBottomOnce = allMessages.length > 0;
        if (allMessages.length > 0) {
          requestAnimationFrame(() => this.scheduleBottomFollow());
        }
        this.restoreProviderFromDisk()
          .then(() => this.runAutoCommand())
          .then(() => this.hydrateStoryUiFromStorage());
      },
    );
  };

  refreshMessagesFromStorage = async () => {
    const [history, currentStoryMessages] = await Promise.all([this.readHistory(), this.loadCurrentStory()]);
    const digestHistory = await this.readDigestHistory();
    const historyForRender = this.buildStoryHistoryMessages(history, digestHistory);
    const allMessages = this.buildStoryDisplayMessages(historyForRender, currentStoryMessages);
    const visibleCount = Math.min(allMessages.length, PAGE_SIZE);
    const mergedCurrentStory = this.mergeMessagesById(currentStoryMessages);
    const storedChoices = await this.readCurrentChoicesFile();
    const currentStoryChoices = this.applyStoryChoiceUiState(storedChoices, Array.isArray(storedChoices) && storedChoices.length > 0);
    const nextState = {
      allMessages,
      visibleCount,
      currentStoryMessages: mergedCurrentStory,
      currentStoryChoices,
      messages: allMessages.slice(-visibleCount),
    };
    if (!this._isMounted) {
      return nextState;
    }
    await new Promise(resolve => this.setState(nextState, resolve));
    if (this.isStoryScope && allMessages.length > 0 && !this.didInitialScroll) {
      this.forceScrollToBottomOnce = true;
      requestAnimationFrame(() => this.scheduleBottomFollow());
    }
    await this.maybeAutoAdvanceStoryOnEmptyChoices(mergedCurrentStory);
    return nextState;
  };

  restoreStoryLangCode = async () => {
    try {
      const savedCode = await AsyncStorage.getItem(STORY_LANG_CODE_STORAGE_KEY);
      if (!savedCode) {
        this.setState({ storyLangCode: getDefaultStoryLangCode() });
        return;
      }
      const normalized = normalizeStoryLangCode(savedCode);
      if (normalized) {
        this.setState({ storyLangCode: normalized });
        return;
      }
      this.setState({ storyLangCode: getDefaultStoryLangCode() });
    } catch (error) {
      console.warn('Failed to restore story language', error);
      this.setState({ storyLangCode: getDefaultStoryLangCode() });
    }
  };

  persistStoryLangCode = async code => {
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

  getActiveRoleLanguageCode = () => {
    const roleCode = this.activeRoleLangCode || this.currentRoleContext?.roleLangCode;
    const normalized = normalizeStoryLangCode(roleCode);
    return normalized || null;
  };

  restoreRoleContextFromStorage = async () => {
    const context = await this.loadCurrentRoleContext();
    this.currentRoleContext = context || null;
    this.activeRoleLangCode = context?.roleLangCode || null;
    return context;
  };

  loadCurrentRoleContext = async () => {
    try {
      const currentRoleRaw = await this.readJsonFile(this.currentRolePath);
      if (currentRoleRaw.__parseError || currentRoleRaw.__missing || !currentRoleRaw.value || typeof currentRoleRaw.value !== 'object') {
        return null;
      }
      const currentRoleData = currentRoleRaw.value || {};
      const roleSlug = String(
        currentRoleData.roleSlug || currentRoleData.slug || currentRoleData.role_name || this.getSpaceRoleKey(),
      ).trim();
      if (!roleSlug) {
        return null;
      }
      const rolePath = this.getRoleFilePath(roleSlug);
      const roleRead = await this.readJsonFile(rolePath);
      if (roleRead.__parseError || roleRead.__missing || !roleRead.value) {
        return null;
      }
      const roleData = roleRead.value;
      const roleMemoryCard = String(roleData?.memory || roleData?.memoryText || roleData?.memory_card || '').trim();
      const savedRoleLang = await AsyncStorage.getItem(getRoleLangStorageKey(this.agentId));
      const roleLang = savedRoleLang ? normalizeStoryLangCode(savedRoleLang) : null;
      const resolvedRoleLang = roleLang || (typeof currentRoleData?.roleLangCode === 'string' && currentRoleData.roleLangCode ? normalizeStoryLangCode(currentRoleData.roleLangCode) : getDefaultStoryLangCode());
      const summary = await this.readRoleConversationSummary(roleSlug);
      return {
        roleSlug,
        roleName: String(roleData?.roleName || roleSlug).trim() || roleSlug,
        roleMemoryCard,
        roleLangCode: resolvedRoleLang,
        conversationSummary: summary,
      };
    } catch (error) {
      console.warn('Failed to load current role context for story', error);
      return null;
    }
  };

  readRoleConversationSummary = async roleSlug => {
    try {
      const safeRoleSlug = String(roleSlug || '').trim() || this.getSpaceRoleKey();
      const path = this.getConversationSummaryPath(safeRoleSlug);
      const read = await this.readJsonFile(path);
      if (read.__parseError || read.__missing || !read.value) {
        return null;
      }
      return read.value;
    } catch (error) {
      console.warn('Failed to read role conversation summary for story', { roleSlug, error });
      return null;
    }
  };

  buildRoleContextSystemPrompt = async ({ options = {} } = {}) => {
    const context = this.currentRoleContext || (await this.loadCurrentRoleContext());
    if (!context) {
      return '';
    }
    const roleName = String(context.roleName || '').trim() || context.roleSlug || 'unknown';
    const alphaState = await this.ensureStoryAlphaState(context);
    const promptAlpha = this.normalizeStoryAlphaValue(alphaState?.currentAlpha);
    const rolePrompt = buildRoleplayPrompt({
      roleText: roleName,
      agentId: this.agentId,
      roleMemoryCard: context.roleMemoryCard,
      options: {
        memoryMode: options?.memoryMode || 'new',
        alphaOverride: promptAlpha,
      },
      normalizeAlphaOverride: this.normalizeStoryAlphaValue,
    });
    return promptAlpha === null ? rolePrompt : `${rolePrompt}\n\n${buildAlphaPromptBlock(promptAlpha)}`;
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
      await ensureStoryDirs(this.agentChatDir);
      await ensure(this.roleChatDir);
      await ensure(this.roleFilesDir);
      await ensureAlphaDirs(this.agentChatDir);
      await ensure(this.getStoryRunsDir());
      await ensure(LLM_DIR);
    } catch (error) {
      console.warn('Failed to prepare chat storage', error);
    }
  };

  getStorySessionId = () => `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  isStoryPersistenceUnlocked = () => Boolean(this._storyPersistenceUnlocked);

  setStoryPersistenceUnlocked = unlocked => {
    this._storyPersistenceUnlocked = Boolean(unlocked);
  };

  createEmptyCurrentStoryState = (storySessionId = null) => ({
    version: 2,
    agentId: this.agentId || 'unknown',
    storyMode: 'story',
    storySessionId: String(storySessionId || this.getStorySessionId()),
    storyId: String(storySessionId || this.getStorySessionId()),
    status: 'idle',
    phase: 'boot',
    entryMode: 'new',
    roleName: '',
    roleSlug: '',
    lastChoiceSet: [],
    awaitingChoice: false,
    shouldResumeGeneration: false,
    lastSubmittedChoiceAt: 0,
    lastSubmittedChoiceUserMessageId: '',
    startBlockHeight: null,
    lastBlockHeight: null,
    currentAlpha: null,
    baseAlpha: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  });

  normalizeCurrentStoryMessage = message => {
    if (!message || typeof message !== 'object') return null;
    if (!message?.id) return null;

    const sender = message.sender || 'user';
    const normalized = {
      ...message,
      sender,
      timestamp: Number.isFinite(Number(message.timestamp)) ? Number(message.timestamp) : Date.now(),
      text: String(message.text || ''),
      _isHistory: false,
      source: 'current_story',
    };
    return normalized;
  };

  sortMessagesByTime = messages =>
    [...messages].sort((a, b) => {
      const ta = Number.isFinite(Number(a?.timestamp)) ? Number(a.timestamp) : 0;
      const tb = Number.isFinite(Number(b?.timestamp)) ? Number(b.timestamp) : 0;
      if (ta !== tb) {
        return ta - tb;
      }
      return String(a?.id || '').localeCompare(String(b?.id || ''));
    });

  mergeMessagesById = messages => {
    const map = new Map();
    const normalized = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    normalized.forEach(message => {
      const key = message?.id;
      if (!key) {
        map.set(`__missing__${map.size}`, message);
        return;
      }
      map.set(key, message);
    });
    return this.sortMessagesByTime(Array.from(map.values()));
  };

  normalizeCurrentStoryState = state => {
    const sessionId = String(state?.storySessionId || this.getStorySessionId());
    const messages = this.mergeMessagesById(
      (Array.isArray(state?.messages) ? state.messages : []).map(message => this.normalizeCurrentStoryMessage(message)).filter(Boolean),
    );
    const currentAlpha = state?.currentAlpha;
    const baseAlpha = state?.baseAlpha;
    return {
      version: 2,
      agentId: this.agentId || 'unknown',
      storyMode: 'story',
      storySessionId: sessionId,
      storyId: String(state?.storyId || sessionId),
      status: String(state?.status || 'idle'),
      phase: String(state?.phase || 'boot'),
      entryMode: String(state?.entryMode || 'new'),
      roleName: String(state?.roleName || ''),
      roleSlug: String(state?.roleSlug || ''),
      lastChoiceSet: Array.isArray(state?.lastChoiceSet) ? state.lastChoiceSet : [],
      awaitingChoice: Boolean(state?.awaitingChoice),
      shouldResumeGeneration: Boolean(state?.shouldResumeGeneration),
      lastSubmittedChoiceAt: Number.isFinite(Number(state?.lastSubmittedChoiceAt)) ? Number(state.lastSubmittedChoiceAt) : 0,
      lastSubmittedChoiceUserMessageId: String(state?.lastSubmittedChoiceUserMessageId || ''),
      startBlockHeight: Number.isFinite(Number(state?.startBlockHeight)) ? Number(state.startBlockHeight) : null,
      lastBlockHeight: Number.isFinite(Number(state?.lastBlockHeight)) ? Number(state.lastBlockHeight) : null,
      currentAlpha: Number.isFinite(Number(currentAlpha)) ? Number(currentAlpha) : null,
      baseAlpha: Number.isFinite(Number(baseAlpha)) ? Number(baseAlpha) : null,
      lastAutoFallbackReplyId: String(state?.lastAutoFallbackReplyId || ''),
      createdAt: Number.isFinite(Number(state?.createdAt)) ? Number(state.createdAt) : Date.now(),
      updatedAt: Date.now(),
      messages,
    };
  };

  readStoryJsonFile = async path => {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) return null;
      const raw = await RNFS.readFile(path, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to read story json', path, error);
      return null;
    }
  };

  writeStoryJsonFile = async (path, value) => {
    try {
      await RNFS.writeFile(path, JSON.stringify(value), 'utf8');
      return true;
    } catch (error) {
      console.warn('Failed to write story json', path, error);
      return false;
    }
  };

  readCurrentChoicesFile = async () => {
    const path = this.getStoryChoicesPath();
    try {
      const exists = await RNFS.exists(path);
      if (!exists) {
        return null;
      }
      const raw = await RNFS.readFile(path, 'utf8');
      const json = JSON.parse(raw);
      return Array.isArray(json?.choices) ? json.choices : Array.isArray(json) ? json : [];
    } catch (error) {
      console.warn('Failed to read current story choices', error);
      return null;
    }
  };

  applyStoryChoiceUiState = (choices, awaitingChoice = null) => {
    const normalizedChoices = Array.isArray(choices) ? choices.filter(Boolean) : [];
    const hasChoices = normalizedChoices.length > 0;
    const effectiveAwaiting = awaitingChoice == null ? hasChoices : Boolean(awaitingChoice);

    if (this._isMounted) {
      this.setState({
        currentStoryHasChoiceFile: hasChoices,
        currentStoryChoices: normalizedChoices,
        currentStoryLastChoiceSet: normalizedChoices,
        currentStoryAwaitingChoice: effectiveAwaiting,
      });
    }

    return normalizedChoices;
  };

  persistCurrentChoicesFileOnly = async choices => {
    const normalizedChoices = Array.isArray(choices) ? choices.filter(Boolean) : [];
    if (this._storyChoicePersistCancelled) {
      return normalizedChoices;
    }
    const path = this.getStoryChoicesPath();
    const exists = await RNFS.exists(path);

    if (this._storyChoicePersistCancelled) {
      return normalizedChoices;
    }

    if (!normalizedChoices.length) {
      if (exists) {
        await RNFS.unlink(path).catch(() => {});
      }
      return [];
    }

    if (!exists && !this.isStoryPersistenceUnlocked()) {
      return [];
    }

    const tempPath = `${path}.tmp`;
    await RNFS.unlink(tempPath).catch(() => {});
    await RNFS.writeFile(tempPath, JSON.stringify({ choices: normalizedChoices, updatedAt: Date.now() }), 'utf8');
    if (exists) {
      await RNFS.unlink(path).catch(() => {});
    }
    await RNFS.moveFile(tempPath, path);
    return normalizedChoices;
  };

  scheduleCurrentChoicesPersist = choices => {
    const normalizedChoices = Array.isArray(choices) ? choices.filter(Boolean) : [];
    const baseQueue =
      this._storyChoicePersistQueue && typeof this._storyChoicePersistQueue.then === 'function'
        ? this._storyChoicePersistQueue
        : Promise.resolve([]);

    this._storyChoicePersistQueue = baseQueue
      .catch(() => [])
      .then(() => {
        if (this._storyChoicePersistCancelled) {
          return normalizedChoices;
        }
        return this.persistCurrentChoicesFileOnly(normalizedChoices);
      })
      .catch(error => {
        console.warn('Failed to persist current story choices', error);
        return normalizedChoices;
      });

    return this._storyChoicePersistQueue;
  };

  writeCurrentChoicesFile = async choices => {
    const normalizedChoices = this.applyStoryChoiceUiState(choices, (Array.isArray(choices) ? choices : []).length > 0);
    await this.scheduleCurrentChoicesPersist(normalizedChoices);
    return normalizedChoices;
  };

  clearCurrentChoicesFile = async () => {
    this.applyStoryChoiceUiState([], false);
    await this.scheduleCurrentChoicesPersist([]);
  };

  loadCurrentRoleForStory = async () => {
    const ctx = await this.loadCurrentRoleContext();
    this.currentRoleContext = ctx || null;
    this.activeRoleLangCode = ctx?.roleLangCode || null;
    return ctx || null;
  };

  normalizeStoryAlphaValue = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return null;
    }
    if (n > 99) {
      return 99;
    }
    if (n < -99) {
      return -99;
    }
    return Math.round(n);
  };

  buildRoleAlphaSeedData = roleContext => {
    const roleSlug = String(roleContext?.roleSlug || '').trim();
    const roleName = String(roleContext?.roleName || '').trim();
    const roleKey = [this.agentId || 'default', roleSlug || roleName || 'unknown-role'].join(':role:');
    return buildSeedData(roleKey);
  };

  applyStoryAlphaState = async (alphaState, options = {}) => {
    const currentAlpha = this.normalizeStoryAlphaValue(alphaState?.currentAlpha);
    if (currentAlpha === null) {
      return null;
    }
    const baseAlpha = this.normalizeStoryAlphaValue(alphaState?.baseAlpha);
    const normalized = {
      ...(alphaState || {}),
      agentId: String(alphaState?.agentId || this.agentId || 'unknown'),
      roleSlug: String(alphaState?.roleSlug || this.currentRoleContext?.roleSlug || this.state.currentStoryRoleSlug || ''),
      roleName: String(alphaState?.roleName || this.currentRoleContext?.roleName || this.state.currentStoryRoleName || ''),
      baseAlpha: baseAlpha === null ? currentAlpha : baseAlpha,
      currentAlpha,
      updatedAt: Number.isFinite(Number(alphaState?.updatedAt)) ? Number(alphaState.updatedAt) : Date.now(),
      algorithmVersion: String(alphaState?.algorithmVersion || 'v2'),
    };

    if (this._isMounted && options?.setState !== false) {
      await new Promise(resolve =>
        this.setState(
          {
            currentAlpha: normalized.currentAlpha,
            baseAlpha: normalized.baseAlpha,
          },
          resolve,
        ),
      );
      this.props.navigation?.setParams?.({ currentAlpha: normalized.currentAlpha });
    }

    if (options?.updateRuntime === true) {
      await this.updateCurrentStoryRuntime(
        {
          currentAlpha: normalized.currentAlpha,
          baseAlpha: normalized.baseAlpha,
          roleSlug: normalized.roleSlug || this.state.currentStoryRoleSlug || '',
          roleName: normalized.roleName || this.state.currentStoryRoleName || '',
        },
        {
          persist: options?.persistRuntime === true,
          allowCreate: options?.allowCreate === true,
        },
      );
    }

    return normalized;
  };

  ensureStoryAlphaState = async (roleContext, options = {}) => {
    if (!roleContext) {
      return null;
    }
    const normalizedRoleContext = {
      roleSlug: String(roleContext?.roleSlug || '').trim(),
      roleName: String(roleContext?.roleName || '').trim(),
    };
    const alphaState = await ensureAlphaState({
      storyScopeDir: this.agentChatDir,
      agentId: this.agentId,
      roleSlug: normalizedRoleContext.roleSlug,
      roleName: normalizedRoleContext.roleName,
      buildSeedData: () => this.buildRoleAlphaSeedData(normalizedRoleContext),
    });
    if (options?.applyState === false) {
      return alphaState;
    }
    return this.applyStoryAlphaState(alphaState, options);
  };

  getStoryPromptAlphaState = async (roleContext = null, options = {}) => {
    const context = roleContext || this.currentRoleContext || (await this.loadCurrentRoleForStory());
    if (!context) {
      return null;
    }
    const shouldPersistRuntime =
      options?.persistRuntime === true ||
      (options?.persistRuntime !== false && (await RNFS.exists(this.getStoryCurrentPath()).catch(() => false)));
    return this.ensureStoryAlphaState(context, {
      updateRuntime: options?.updateRuntime === true,
      persistRuntime: shouldPersistRuntime,
    });
  };

  applyAlphaDeltaForChoice = async ({ visibleText, sendText, submittedAt }) => {
    const roleContext = this.currentRoleContext || (await this.loadCurrentRoleForStory());
    const alphaState = roleContext ? await this.ensureStoryAlphaState(roleContext) : null;
    const currentAlpha = this.normalizeStoryAlphaValue(alphaState?.currentAlpha ?? this.state.currentAlpha) ?? 0;
    const baseAlpha = this.normalizeStoryAlphaValue(alphaState?.baseAlpha ?? this.state.baseAlpha) ?? currentAlpha;
    const latestAgentMessage = this.getCurrentStoryMessagesForDisplay()
      .filter(item => item?.sender === 'agent')
      .slice(-1)[0];
    const analysis = analyzeAlphaDelta({
      choiceText: visibleText,
      choiceSend: sendText,
      recentStoryText: String(latestAgentMessage?.text || ''),
      currentAlpha,
    });
    const entry = {
      ts: Number.isFinite(Number(submittedAt)) ? Number(submittedAt) : Date.now(),
      choice: String(visibleText || ''),
      choiceSend: String(sendText || ''),
      delta: analysis.delta,
      alphaBefore: analysis.alphaBefore,
      alphaAfter: analysis.alphaAfter,
      reason: analysis.reason,
    };
    const nextAlphaState = {
      ...(alphaState || {}),
      agentId: String(this.agentId || 'unknown'),
      roleSlug: String(roleContext?.roleSlug || this.state.currentStoryRoleSlug || this.currentRoleContext?.roleSlug || ''),
      roleName: String(roleContext?.roleName || this.state.currentStoryRoleName || this.currentRoleContext?.roleName || ''),
      baseAlpha,
      currentAlpha: analysis.alphaAfter,
      updatedAt: Date.now(),
      algorithmVersion: 'v2',
    };

    await writeAlphaStateFile(this.getStoryAlphaPath(), nextAlphaState);
    await this.appendAlphaLogEntry(entry);
    await this.applyStoryAlphaState(nextAlphaState, { updateRuntime: true, persistRuntime: true });
    return { state: nextAlphaState, entry };
  };

  appendAlphaLogEntry = async entry =>
    appendStoryAlphaLogEntry(this.agentChatDir, entry, this.state.currentStorySessionId || this.getStorySessionId());

  readCurrentAlphaLog = async () =>
    readStoryCurrentAlphaLog(this.agentChatDir, this.state.currentStorySessionId || this.getStorySessionId());

  clearCurrentAlphaLog = async () => clearStoryCurrentAlphaLog(this.agentChatDir);

  buildStoryRunSummary = async endType => {
    const storyState = this._currentStorySnapshot || (await this.readCurrentStoryFile());
    const alphaLog = await this.readCurrentAlphaLog();
    const persistedMessages = this.getCurrentStoryMessagesForDisplay();
    const keyEvents = persistedMessages
      .filter(item => item?.sender === 'agent')
      .map(item => String(item?.text || '').trim())
      .filter(Boolean)
      .slice(-4);
    const summary = keyEvents[0] || this.getStoryMenuText('archiveFallbackSummary');
    return {
      storyId: String(storyState.storyId || storyState.storySessionId || this.getStorySessionId()),
      roleName: String(storyState.roleName || this.state.currentStoryRoleName || ''),
      roleSlug: String(storyState.roleSlug || this.state.currentStoryRoleSlug || ''),
      startedAt: Number(storyState.createdAt || Date.now()),
      endedAt: Date.now(),
      endType: String(endType || 'completed'),
      baseAlpha: Number.isFinite(Number(storyState.baseAlpha)) ? Number(storyState.baseAlpha) : null,
      endAlpha: Number.isFinite(Number(storyState.currentAlpha)) ? Number(storyState.currentAlpha) : null,
      alphaDelta:
        Number.isFinite(Number(storyState.currentAlpha)) && Number.isFinite(Number(storyState.baseAlpha))
          ? Number(storyState.currentAlpha) - Number(storyState.baseAlpha)
          : null,
      summary,
      keyEvents,
      alphaLog: Array.isArray(alphaLog.entries) ? alphaLog.entries : [],
    };
  };

  archiveCompletedStoryRun = async endType => {
    const summary = await this.buildStoryRunSummary(endType);
    await this.writeStoryJsonFile(`${this.getStoryRunsDir()}/${summary.storyId}.json`, summary);
    await this.clearCurrentAlphaLog();
    await this.clearCurrentChoicesFile();
    await this.clearCurrentStoryFile();
    this._currentStorySnapshot = this.createEmptyCurrentStoryState(this.getStorySessionId());
    if (this._isMounted) {
      this.setState({
        currentStoryMessages: [],
        currentStoryChoices: [],
        currentStoryLastChoiceSet: [],
        currentStoryStatus: 'completed',
        currentStoryPhase: 'completed',
      });
    }
    return summary;
  };

  maybeFinalizeStoryRunFromText = async text => {
    const normalized = String(text || '').toLowerCase();
    if (!normalized) {
      return false;
    }
    const hasExplicitRunEndMarker = /(^|\n)\s*(alpha_end|run summary|video_recap|run log)\b/.test(normalized);
    const asksNextLoop = /do you want to continue to the next loop/.test(normalized);
    const hasStandaloneYesNoPrompt = /(^|\n)\s*(?:\[y\/n\]|y\/n|yes or no)\s*$/m.test(normalized);
    const isRunEnded = hasExplicitRunEndMarker || (asksNextLoop && hasStandaloneYesNoPrompt);
    if (!isRunEnded) {
      return false;
    }

    const endingChoices = [
      { key: 'ending-summary', send: 'SUMMARY', label: 'Summary' },
      { key: 'ending-recap', send: 'RECAP', label: 'Recap' },
      { key: 'ending-continue', send: 'CONTINUE', label: 'Continue' },
      { key: 'ending-restart', send: 'RESTART', label: this.getStoryMenuText('restartConnection') },
    ];

    try {
      await this.writeCurrentChoicesFile(endingChoices);
      await this.updateCurrentStoryRuntime({
        status: 'waiting_user',
        phase: 'ended',
        lastChoiceSet: endingChoices,
        awaitingChoice: true,
        shouldResumeGeneration: false,
      });
      if (this._isMounted) {
        this.setState({
          currentStoryChoices: endingChoices,
          currentStoryLastChoiceSet: endingChoices,
          currentStoryAwaitingChoice: true,
        });
      }
      this.setStoryLinkStatus(this.getStoryMenuText('linkActive'));
      return true;
    } catch (error) {
      console.warn('Failed to enter story ending menu', error);
      return false;
    }
  };

  updateCurrentStoryRuntime = async (patch, options = {}) => {
    const previousSnapshot = this._currentStorySnapshot || this.createEmptyCurrentStoryState();
    const patchHasMessages = Object.prototype.hasOwnProperty.call(patch || {}, 'messages');
    const stateMessages = this.getCurrentStoryMessagesForDisplay();
    const renderedStoryMessages = Array.isArray(this.state?.allMessages)
      ? this.state.allMessages.filter(
          message =>
            message?.sender &&
            !message?._isHistory &&
            !message?._localOnly &&
            message?._renderMode !== 'commands' &&
            message?.sender !== 'system',
        )
      : [];
    const fallbackMessages = this.mergeMessagesById([
      ...(Array.isArray(previousSnapshot.messages) ? previousSnapshot.messages : []),
      ...(Array.isArray(stateMessages) ? stateMessages : []),
      ...renderedStoryMessages,
    ]);
    const snapshot = this.normalizeCurrentStoryState({
      ...previousSnapshot,
      ...(patch || {}),
      messages: patchHasMessages ? patch.messages : fallbackMessages,
    });
    const shouldPersist = options?.persist !== false;
    this._currentStorySnapshot = snapshot;
    if (shouldPersist) {
      await this.writeCurrentStoryFile(snapshot, { allowCreate: options?.allowCreate === true });
    }
    if (this._isMounted) {
      this.setState({
        currentStorySessionId: snapshot.storySessionId,
        currentStoryStatus: snapshot.status,
        currentStoryPhase: snapshot.phase,
        currentStoryRoleName: snapshot.roleName,
        currentStoryRoleSlug: snapshot.roleSlug,
        currentStoryEntryMode: snapshot.entryMode,
        currentStoryLastChoiceSet: snapshot.lastChoiceSet,
        currentStoryAwaitingChoice: Boolean(snapshot.awaitingChoice),
        currentStoryShouldResumeGeneration: Boolean(snapshot.shouldResumeGeneration),
        lastSubmittedChoiceAt: Number(snapshot.lastSubmittedChoiceAt || 0),
        currentAlpha: snapshot.currentAlpha,
        baseAlpha: snapshot.baseAlpha,
      });
    }
    return snapshot;
  };

  readCurrentStoryFile = async () => {
    const path = this.getStoryCurrentPath();
    try {
      const exists = await RNFS.exists(path);
      if (this._isMounted) {
        this.setState({ currentStoryHasStoryFile: exists });
      }
      if (!exists) {
        return this.createEmptyCurrentStoryState();
      }
      const raw = await RNFS.readFile(path, 'utf8');
      const json = JSON.parse(raw);
      if (!json || typeof json !== 'object') {
        return this.createEmptyCurrentStoryState();
      }
      const normalized = this.normalizeCurrentStoryState(json);
      return {
        ...normalized,
        storySessionId: String(json.storySessionId || normalized.storySessionId),
        createdAt: Number.isFinite(Number(json.createdAt)) ? Number(json.createdAt) : normalized.createdAt,
      };
    } catch (error) {
      console.warn('Failed to read current story', error);
      return this.createEmptyCurrentStoryState();
    }
  };

  writeCurrentStoryFile = async (state, options = {}) => {
    const normalized = this.normalizeCurrentStoryState(state || {});
    const allowCreate = options?.allowCreate === true;
    const path = this.getStoryCurrentPath();
    const baseQueue =
      this._currentStoryPersistQueue && typeof this._currentStoryPersistQueue.then === 'function'
        ? this._currentStoryPersistQueue
        : Promise.resolve(null);

    this._currentStoryPersistQueue = baseQueue
      .catch(() => null)
      .then(async () => {
        const exists = await RNFS.exists(path);
        const canCreate = allowCreate && this.isStoryPersistenceUnlocked();
        if (!exists && !canCreate) {
          if (this._isMounted) {
            this.setState({ currentStoryHasStoryFile: false });
          }
          return normalized;
        }

        let nextState = normalized;
        if (!exists) {
          const roleName = String(normalized?.roleName || this.currentRoleContext?.roleName || this.state.currentStoryRoleName || '').trim();
          const roleSlug = String(normalized?.roleSlug || this.currentRoleContext?.roleSlug || this.state.currentStoryRoleSlug || '').trim();
          const freshBlockHeight = await this.getFreshOrCachedBlockHeight();
          nextState = this.normalizeCurrentStoryState({
            ...normalized,
            roleName,
            roleSlug,
            startBlockHeight: Number.isFinite(Number(normalized?.startBlockHeight)) ? Number(normalized.startBlockHeight) : (Number.isFinite(Number(freshBlockHeight)) && freshBlockHeight > 0 ? Number(freshBlockHeight) : null),
            lastBlockHeight: Number.isFinite(Number(freshBlockHeight)) && freshBlockHeight > 0 ? Number(freshBlockHeight) : normalized?.lastBlockHeight,
          });
        }

        const tempPath = `${path}.tmp`;
        const payload = JSON.stringify(nextState);
        await RNFS.unlink(tempPath).catch(() => {});
        await RNFS.writeFile(tempPath, payload, 'utf8');
        if (exists) {
          await RNFS.unlink(path).catch(() => {});
        }
        await RNFS.moveFile(tempPath, path);
        if (this._isMounted) {
          this.setState({ currentStoryHasStoryFile: true });
        }
        return nextState;
      })
      .catch(async error => {
        console.warn('Failed to write current story', error);
        await RNFS.unlink(`${path}.tmp`).catch(() => {});
        return normalized;
      });

    return this._currentStoryPersistQueue;
  };

  clearCurrentStoryFile = async () => {
    const path = this.getStoryCurrentPath();
    try {
      const exists = await RNFS.exists(path);
      if (exists) {
        await RNFS.unlink(path);
      }
      if (this._isMounted) {
        this.setState({ currentStoryHasStoryFile: false });
      }
    } catch (error) {
      console.warn('Failed to clear current story', error);
    }
  };

  persistCurrentStoryMessages = async messages => {
    const explicitMessages = Array.isArray(messages) ? messages : [];
    const renderedStoryMessages = Array.isArray(this.state?.allMessages)
      ? this.state.allMessages.filter(
          message =>
            message?.sender &&
            !message?._isHistory &&
            !message?._localOnly &&
            message?._renderMode !== 'commands' &&
            message?.sender !== 'system',
        )
      : [];
    const sanitized = this.mergeMessagesById(
      [...explicitMessages, ...renderedStoryMessages]
        .filter(message => !this.isSyntheticStoryFallbackChoice(message) && !message?._recordExcluded)
        .map(this.normalizeCurrentStoryMessage)
        .filter(Boolean),
    );
    const snapshot = this.normalizeCurrentStoryState({
      ...(this._currentStorySnapshot || {}),
      storySessionId: this.state.currentStorySessionId || this.getStorySessionId(),
      messages: sanitized,
      createdAt: this._currentStorySnapshot?.createdAt,
    });
    this._currentStorySnapshot = snapshot;
    const written = await this.writeCurrentStoryFile(snapshot, { allowCreate: this.isStoryPersistenceUnlocked() });
    if (this._isMounted) {
      this.setState({
        currentStorySessionId: written.storySessionId,
        currentStoryMessages: written.messages,
      });
    }
    return written;
  };

  loadCurrentStory = async () => {
    const hasStoryFile = await RNFS.exists(this.getStoryCurrentPath()).catch(() => false);
    const storyState = await this.readCurrentStoryFile();
    const messages = this.mergeMessagesById((storyState.messages || []).map(this.normalizeCurrentStoryMessage).filter(Boolean));
    const storedChoices = await this.readCurrentChoicesFile();
    const safeChoices = Array.isArray(storedChoices)
      ? storedChoices
      : Array.isArray(storyState?.lastChoiceSet)
      ? storyState.lastChoiceSet
      : [];
    this._currentStorySnapshot = this.normalizeCurrentStoryState({ ...storyState, messages, lastChoiceSet: safeChoices });
    this.setStoryPersistenceUnlocked(hasStoryFile);
    if (!Array.isArray(storedChoices) && safeChoices.length > 0) {
      this.scheduleCurrentChoicesPersist(safeChoices);
    }
    const recoveredChoices = safeChoices.length > 0 ? safeChoices : this.getStalePendingStoryChoices(messages);
    const didRecoverStalePending = recoveredChoices.length > 0 && safeChoices.length === 0;
    if (didRecoverStalePending) {
      this._pendingChoiceSubmissionAt = 0;
      this._pendingChoiceUserMessageId = null;
      this._currentStorySnapshot = this.normalizeCurrentStoryState({
        ...this._currentStorySnapshot,
        lastChoiceSet: recoveredChoices,
        awaitingChoice: true,
        shouldResumeGeneration: false,
        status: 'waiting_user',
        phase: 'exploring',
        lastSubmittedChoiceAt: 0,
        lastSubmittedChoiceUserMessageId: '',
      });
      this.scheduleCurrentChoicesPersist(recoveredChoices);
      this.updateCurrentStoryRuntime({
        lastChoiceSet: recoveredChoices,
        awaitingChoice: true,
        shouldResumeGeneration: false,
        status: 'waiting_user',
        phase: 'exploring',
        lastSubmittedChoiceAt: 0,
        lastSubmittedChoiceUserMessageId: '',
        messages,
      }).catch(error => console.warn('Failed to persist recovered story choices', error));
    }
    const effectiveChoices = recoveredChoices.length > 0 ? recoveredChoices : safeChoices;
    if (this._isMounted) {
      this.setState({
        currentStorySessionId: storyState.storySessionId || this._currentStorySnapshot.storySessionId,
        currentStoryMessages: messages,
        currentStoryChoices: effectiveChoices,
        currentStoryHasChoiceFile: effectiveChoices.length > 0,
        currentStoryStatus: didRecoverStalePending ? 'waiting_user' : storyState.status || 'idle',
        currentStoryPhase: didRecoverStalePending ? 'exploring' : storyState.phase || 'boot',
        currentStoryRoleName: storyState.roleName || '',
        currentStoryRoleSlug: storyState.roleSlug || '',
        currentStoryEntryMode: storyState.entryMode || 'new',
        currentStoryLastChoiceSet: effectiveChoices,
        currentStoryAwaitingChoice: Boolean(effectiveChoices.length > 0 && (didRecoverStalePending || storyState.awaitingChoice)),
        currentStoryShouldResumeGeneration: didRecoverStalePending ? false : Boolean(storyState.shouldResumeGeneration),
        lastSubmittedChoiceAt: didRecoverStalePending ? 0 : Number(storyState.lastSubmittedChoiceAt || 0),
        currentAlpha: Number.isFinite(Number(storyState.currentAlpha)) ? Number(storyState.currentAlpha) : null,
        baseAlpha: Number.isFinite(Number(storyState.baseAlpha)) ? Number(storyState.baseAlpha) : null,
      });
    }
    return messages;
  };

  buildStoryDisplayMessages = (historyForRender, currentStoryMessages = []) => {
    const merged = this.mergeMessagesById([...historyForRender, ...currentStoryMessages]).filter(message => !!(message?.id || message?.text));
    return this.sortMessagesByTime(merged);
  };

  getCurrentStoryMessagesForDisplay = () =>
    this.sortMessagesByTime(
      (this.state.currentStoryMessages || []).filter(message => message?.sender && !message._localOnly && message._renderMode !== 'commands'),
    );

  getStoryChoiceBoundaryIndex = (messages, submittedAt = null) => {
    const ordered = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    const boundaryId = String(
      this._pendingChoiceUserMessageId || this._currentStorySnapshot?.lastSubmittedChoiceUserMessageId || ''
    );
    if (boundaryId) {
      const byIdIndex = ordered.findIndex(item => String(item?.id || '') === boundaryId);
      if (byIdIndex >= 0) {
        return byIdIndex;
      }
    }
    const lastSubmittedChoiceAt = this.getLatestStoryChoiceSubmissionAt(submittedAt);
    if (!(lastSubmittedChoiceAt > 0)) {
      return -1;
    }
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const message = ordered[i];
      if (message?.sender !== 'user') {
        continue;
      }
      if (message?._localOnly || message?._renderMode === 'commands') {
        continue;
      }
      if (Number(message?.timestamp || 0) <= lastSubmittedChoiceAt) {
        return i;
      }
    }
    return -1;
  };

  getStoryChoicesFromMessages = (messages, submittedAt = null) => {
    const latestEligibleAgentMessage = this.getLatestEligibleAgentMessageAfterChoice(
      Array.isArray(messages) ? messages : [],
      this.getLatestStoryChoiceSubmissionAt(submittedAt),
    );

    if (!latestEligibleAgentMessage) {
      return [];
    }

    return this.extractStoryChoices(String(latestEligibleAgentMessage.text || '').trim());
  };

  getLatestStoryChoiceSubmissionAt = explicitSubmittedAt => {
    if (Number.isFinite(Number(explicitSubmittedAt)) && Number(explicitSubmittedAt) > 0) {
      return Number(explicitSubmittedAt);
    }
    return Number(
      this._pendingChoiceSubmissionAt || this._currentStorySnapshot?.lastSubmittedChoiceAt || this.state.lastSubmittedChoiceAt || 0,
    );
  };

  getLatestEligibleAgentMessageAfterChoice = (messages, submittedAt = null) => {
    const ordered = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    const boundaryIndex = this.getStoryChoiceBoundaryIndex(ordered, submittedAt);
    const candidates = boundaryIndex >= 0 ? ordered.slice(boundaryIndex + 1) : ordered;

    const submittedAtValue = this.getLatestStoryChoiceSubmissionAt(submittedAt);
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const message = candidates[i];
      if (message?.sender !== 'agent') continue;
      if (message?.pending || message?._localOnly || message?._renderMode === 'commands') continue;
      if (submittedAtValue > 0 && Number(message?.timestamp || message?.t || 0) <= submittedAtValue) continue;
      const text = String(message?.text || '').trim();
      if (!text) continue;
      return message;
    }

    return null;
  };

  getLatestStoryAgentReplyIgnoringSubmission = messages => {
    const ordered = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const message = ordered[i];
      if (message?.sender !== 'agent') continue;
      if (message?.pending || message?._localOnly || message?._renderMode === 'commands') continue;
      const text = String(message?.text || '').trim();
      if (!text) continue;
      return message;
    }
    return null;
  };

  hasPersistedStorySubmissionMessage = (messages, submittedAt = null) => {
    const ordered = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    const submittedAtValue = this.getLatestStoryChoiceSubmissionAt(submittedAt);
    const submissionId = String(
      this._pendingChoiceUserMessageId || this._currentStorySnapshot?.lastSubmittedChoiceUserMessageId || ''
    );
    if (submissionId && ordered.some(item => String(item?.id || '') === submissionId)) {
      return true;
    }
    if (!(submittedAtValue > 0)) {
      return false;
    }
    return ordered.some(item => {
      if (item?.sender !== 'user' || item?._localOnly || item?._renderMode === 'commands') return false;
      const ts = Number(item?.timestamp || item?.t || 0);
      return ts > 0 && Math.abs(ts - submittedAtValue) <= 5000;
    });
  };

  hasPendingStoryAgentMessage = messages =>
    this.sortMessagesByTime(Array.isArray(messages) ? messages : []).some(
      item => item?.sender === 'agent' && item?.pending && !item?._localOnly && item?._renderMode !== 'commands',
    );

  getStalePendingStoryChoices = (messages, submittedAt = null) => {
    const sourceMessages = Array.isArray(messages) ? messages : [];
    const submittedAtValue = this.getLatestStoryChoiceSubmissionAt(submittedAt);
    if (!(submittedAtValue > 0)) {
      return [];
    }
    if (this.hasPersistedStorySubmissionMessage(sourceMessages, submittedAtValue)) {
      return [];
    }
    if (this.hasPendingStoryAgentMessage(sourceMessages)) {
      return [];
    }
    const latestAgentReply = this.getLatestStoryAgentReplyIgnoringSubmission(sourceMessages);
    const latestAgentAt = Number(latestAgentReply?.timestamp || latestAgentReply?.t || 0);
    if (!latestAgentReply || !(latestAgentAt > 0) || latestAgentAt >= submittedAtValue) {
      return [];
    }
    return this.extractStoryChoices(String(latestAgentReply.text || '').trim());
  };

  hasAgentReplyAfterChoice = (messages, submittedAt = null) => {
    const latestEligibleAgentMessage = this.getLatestEligibleAgentMessageAfterChoice(messages, submittedAt);
    const hasReply = Boolean(latestEligibleAgentMessage);

    if (hasReply) {
      this._pendingChoiceSubmissionAt = 0;
      this._pendingChoiceUserMessageId = null;
    }

    return hasReply;
  };

  shouldDelayStoryAutoFallback = (messages, submittedAt = null, latestAgentReply = null) => {
    const ordered = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    const boundaryIndex = this.getStoryChoiceBoundaryIndex(ordered, submittedAt);
    const candidates = boundaryIndex >= 0 ? ordered.slice(boundaryIndex + 1) : ordered;
    if (candidates.some(item => item?.sender === 'agent' && item?.pending)) {
      return true;
    }
    const replySettledAt = Number(
      latestAgentReply?.completedAt ||
        latestAgentReply?.updatedAt ||
        latestAgentReply?.timestamp ||
        0,
    );
    if (!(replySettledAt > 0)) {
      return false;
    }
    return Date.now() - replySettledAt < STORY_AUTO_FALLBACK_SETTLE_MS;
  };

  stripStoryChoiceLines = text => {
    const raw = String(text || '');
    if (!raw) {
      return raw;
    }
    return raw
      .split(/\r?\n/)
      .filter(line => {
        const trimmed = stripMarkdownWrap(line).trim();
        if (!trimmed) {
          return true;
        }
        if (STORY_CHOICE_PREFIX_RE.test(trimmed)) {
          return false;
        }
        if (/^(yes|no|y|n)\s*(?:[\/|]\s*(yes|no|y|n))?\s*$/i.test(trimmed)) {
          return false;
        }
        if (/^(?:input|select|choose|reply)\s+\d+(?:\s*[-~to]\s*\d+)?\b/i.test(trimmed)) {
          return false;
        }
        return true;
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  shouldSuppressStoryChoiceState = messages => {
    const sourceMessages = Array.isArray(messages) ? messages : [];
    const lastSubmittedChoiceAt = this.getLatestStoryChoiceSubmissionAt();
    return lastSubmittedChoiceAt > 0 && !this.hasAgentReplyAfterChoice(sourceMessages, lastSubmittedChoiceAt);
  };

  syncStoryChoicesFromMessages = messages => {
    const sourceMessages = Array.isArray(messages) ? messages : [];
    const lastSubmittedChoiceAt = this.getLatestStoryChoiceSubmissionAt();
    const snapshotPhase = String(this._currentStorySnapshot?.phase || this.state.currentStoryPhase || '');
    const snapshotStatus = String(this._currentStorySnapshot?.status || this.state.currentStoryStatus || '');
    const isWaitingAgent = snapshotStatus === 'waiting_agent';
    const isIdleBoot = snapshotStatus === 'idle' && (!snapshotPhase || snapshotPhase === 'boot');
    const latestAgentReplyAfterChoice = this.getLatestEligibleAgentMessageAfterChoice(sourceMessages, lastSubmittedChoiceAt);
    const hasAgentAfterChoice = Boolean(latestAgentReplyAfterChoice);
    const hasPendingSubmittedChoice = lastSubmittedChoiceAt > 0;
    const stalePendingChoices =
      isWaitingAgent && hasPendingSubmittedChoice && !hasAgentAfterChoice
        ? this.getStalePendingStoryChoices(sourceMessages, lastSubmittedChoiceAt)
        : [];
    const didRecoverStalePending = stalePendingChoices.length > 0;
    const shouldLockChoicesAfterSubmit = hasPendingSubmittedChoice && !hasAgentAfterChoice && !didRecoverStalePending;
    const shouldHideChoicesWhileWaitingAgent = isWaitingAgent && hasPendingSubmittedChoice && !hasAgentAfterChoice && !didRecoverStalePending;
    const nextChoices = didRecoverStalePending
      ? stalePendingChoices
      : shouldHideChoicesWhileWaitingAgent
      ? []
      : latestAgentReplyAfterChoice
      ? this.extractStoryChoices(String(latestAgentReplyAfterChoice.text || '').trim())
      : this.getStoryChoicesFromMessages(sourceMessages, lastSubmittedChoiceAt);
    const shouldHideStaleChoices = shouldHideChoicesWhileWaitingAgent || shouldLockChoicesAfterSubmit;
    const finalChoices = shouldHideStaleChoices || (isIdleBoot && !sourceMessages.length) ? [] : nextChoices;
    const existingChoices = Array.isArray(this.state.currentStoryChoices) ? this.state.currentStoryChoices : [];
    const shouldClearOldChoicesAfterSubmittedReply = hasPendingSubmittedChoice && hasAgentAfterChoice && !finalChoices.length;
    const shouldPreserveExistingChoices = !finalChoices.length && !shouldHideStaleChoices && !shouldClearOldChoicesAfterSubmittedReply;
    const effectiveChoices = shouldPreserveExistingChoices ? existingChoices : finalChoices;
    const hasChoices = effectiveChoices.length > 0;
    const isIdleChoiceSet = false;
    const hasAnyStoryProgress = sourceMessages.length > 0;
    const shouldPreservePendingResume = shouldHideChoicesWhileWaitingAgent && Boolean(this._currentStorySnapshot?.shouldResumeGeneration);
    this.applyStoryChoiceUiState(effectiveChoices, hasChoices && !isIdleChoiceSet);
    if (!shouldPreserveExistingChoices) {
      this.scheduleCurrentChoicesPersist(hasChoices ? effectiveChoices : []);
    }
    if (this._currentStorySnapshot) {
      this._currentStorySnapshot = this.normalizeCurrentStoryState({
        ...this._currentStorySnapshot,
        lastChoiceSet: effectiveChoices,
        awaitingChoice: hasChoices && !isIdleChoiceSet,
        shouldResumeGeneration: didRecoverStalePending ? false : shouldPreservePendingResume,
        status: isIdleChoiceSet ? 'idle' : hasChoices ? 'waiting_user' : shouldLockChoicesAfterSubmit ? 'exploring' : hasAnyStoryProgress ? 'exploring' : this._currentStorySnapshot.status,
        phase: isIdleChoiceSet ? 'boot' : hasChoices ? 'exploring' : shouldLockChoicesAfterSubmit ? 'exploring' : hasAnyStoryProgress ? 'exploring' : this._currentStorySnapshot.phase,
        lastSubmittedChoiceAt: didRecoverStalePending ? 0 : this._currentStorySnapshot.lastSubmittedChoiceAt,
        lastSubmittedChoiceUserMessageId: didRecoverStalePending ? '' : this._currentStorySnapshot.lastSubmittedChoiceUserMessageId,
      });
    }
    if (this._isMounted) {
      this.setState({
        currentStoryChoices: effectiveChoices,
        currentStoryHasChoiceFile: hasChoices,
        currentStoryLastChoiceSet: effectiveChoices,
        currentStoryAwaitingChoice: hasChoices && !isIdleChoiceSet,
        lastSubmittedChoiceAt: didRecoverStalePending ? 0 : this.state.lastSubmittedChoiceAt,
        currentStoryShouldResumeGeneration: didRecoverStalePending ? false : this.state.currentStoryShouldResumeGeneration,
      });
      if (isIdleChoiceSet) {
        this.setStoryLinkStatus(this.getStoryMenuText('linkWaiting'), '', { waiting: true });
      } else if (hasChoices) {
        this.setStoryLinkStatus(this.getStoryMenuText('linkActive'));
      }
    }
    if (hasAgentAfterChoice || didRecoverStalePending) {
      this._pendingChoiceSubmissionAt = 0;
      this._pendingChoiceUserMessageId = null;
    }
    return effectiveChoices;
  };

  updateHeaderCommsAnimation = active => {
    const isActive = !!active;
    if (this.headerGlowLoop) {
      this.headerGlowLoop.stop();
      this.headerGlowLoop = null;
    }
    this.headerGlowAnim.stopAnimation?.();
    this.headerGlowAnim.setValue(isActive ? 1 : 0);
  };

  updatePanelSignalAnimation = waiting => {
    if (this.panelSignalTimer) {
      clearInterval(this.panelSignalTimer);
      this.panelSignalTimer = null;
    }
    if (this.panelIdleTimer) {
      clearInterval(this.panelIdleTimer);
      this.panelIdleTimer = null;
    }
    if (this._isMounted) {
      this.setState({ panelSignalBlinkOn: false });
    }
  };


  setStoryLinkStatus = (status, detail = '', options = {}) => {
    const nextStatus = String(status || 'LINK IDLE');
    const nextDetail = String(detail || '');
    const waiting = options?.waiting === true;
    if (!this._isMounted) {
      return;
    }
    this.setState({
      storyLinkStatus: nextStatus,
      storyLinkDetail: nextDetail,
      headerCommsActive: waiting,
    });
    this.updateHeaderCommsAnimation(waiting);
    this.updatePanelSignalAnimation(waiting);
    this.props.navigation?.setParams?.({});
  };

  hasCurrentStory = () => this.getCurrentStoryMessagesForDisplay().length > 0;

  hydrateStoryUiFromStorage = async () => {
    const roleContext = this.currentRoleContext || (await this.loadCurrentRoleForStory());
    if (!roleContext) {
      this.setStoryLinkStatus(this.getStoryMenuText('roleRequired'), this.getStoryMenuText('roleRequiredDetail'));
      return;
    }
    const hasStoryFile = await RNFS.exists(this.getStoryCurrentPath());
    this.setStoryPersistenceUnlocked(hasStoryFile);
    const storyState = await this.readCurrentStoryFile();
    const existingMessages = this.mergeMessagesById(Array.isArray(storyState?.messages) ? storyState.messages : []);
    const existingChoices = await this.readCurrentChoicesFile();
    const safeChoices = Array.isArray(existingChoices)
      ? existingChoices
      : Array.isArray(storyState?.lastChoiceSet)
      ? storyState.lastChoiceSet
      : [];

    this._currentStorySnapshot = this.normalizeCurrentStoryState({
      ...storyState,
      messages: existingMessages,
      lastChoiceSet: safeChoices,
    });

    if (!Array.isArray(existingChoices) && safeChoices.length > 0) {
      this.scheduleCurrentChoicesPersist(safeChoices);
    }
    const recoveredChoices = safeChoices.length > 0 ? safeChoices : this.getStalePendingStoryChoices(existingMessages);
    const didRecoverStalePending = recoveredChoices.length > 0 && safeChoices.length === 0;
    const effectiveChoices = recoveredChoices.length > 0 ? recoveredChoices : safeChoices;
    if (didRecoverStalePending) {
      this._pendingChoiceSubmissionAt = 0;
      this._pendingChoiceUserMessageId = null;
      await this.writeCurrentChoicesFile(effectiveChoices);
    }

    this.setState({
      currentStoryChoices: effectiveChoices,
      currentStoryHasStoryFile: hasStoryFile,
      currentStoryHasChoiceFile: effectiveChoices.length > 0,
      currentStoryLastChoiceSet: effectiveChoices,
      currentStoryAwaitingChoice: effectiveChoices.length > 0,
      currentStoryShouldResumeGeneration: didRecoverStalePending ? false : Boolean(storyState?.shouldResumeGeneration),
    });
    this.setStoryLinkStatus(
      effectiveChoices.length > 0 ? this.getStoryMenuText('linkActive') : this.getStoryMenuText('linkWaiting'),
      effectiveChoices.length > 0 ? undefined : this.getStoryMenuText('awaitingSignal'),
      { waiting: effectiveChoices.length === 0 }
    );
    await this.updateCurrentStoryRuntime({
      roleName: roleContext.roleName || '',
      roleSlug: roleContext.roleSlug || '',
      messages: existingMessages,
      lastChoiceSet: effectiveChoices,
      awaitingChoice: effectiveChoices.length > 0,
      shouldResumeGeneration: didRecoverStalePending ? false : Boolean(storyState?.shouldResumeGeneration),
      status: effectiveChoices.length > 0 ? 'waiting_user' : hasStoryFile ? String(storyState?.status || 'exploring') : 'idle',
      phase: hasStoryFile ? 'exploring' : 'boot',
      lastSubmittedChoiceAt: didRecoverStalePending ? 0 : Number(storyState?.lastSubmittedChoiceAt || 0),
      lastSubmittedChoiceUserMessageId: didRecoverStalePending ? '' : String(storyState?.lastSubmittedChoiceUserMessageId || ''),
    });
    if (!effectiveChoices.length) {
      await this.maybeAutoAdvanceStoryOnEmptyChoices(existingMessages);
    }
  };

  openStorySettings = () => {
    const { navigation, namespaceList } = this.props;
    if (!navigation || typeof navigation.navigate !== 'function') {
      return;
    }
    const { namespaceId, displayName, shortCode, walletId, txid, rootAddress, price, desc, addr, profile } = navigation.state.params || {};
    const namespace = namespaceId ? namespaceList?.namespaces?.[namespaceId] : null;
    navigation.navigate('Namespaces', {
      initialTab: 'me',
      openNamespaceInfo: namespace || {
        id: namespaceId,
        namespaceId,
        shortCode,
        displayName,
        walletId,
        txId: txid,
        rootAddress,
        price,
        desc,
        addr,
        profile,
      },
    });
  };

  archiveCurrentStoryToRaw = async () => {
    if (!this.isStoryScope || this.state.isArchivingCurrentStory) {
      return { archivedCount: 0, dedupedCount: 0 };
    }

    this.setState({ isArchivingCurrentStory: true });
    const storyState = await this.readCurrentStoryFile();
    const candidates = this.mergeMessagesById(
      (storyState.messages || []).map(this.normalizeCurrentStoryMessage).filter(Boolean),
    );

    if (candidates.length === 0) {
      await this.clearCurrentChoicesFile();
      await this.clearCurrentStoryFile();
      this._currentStorySnapshot = this.createEmptyCurrentStoryState(storyState.storySessionId);
      if (this._isMounted) {
        this.setState({
          isArchivingCurrentStory: false,
          currentStorySessionId: this._currentStorySnapshot.storySessionId,
          currentStoryMessages: [],
        });
      }
      await this.refreshMessagesFromStorage();
      return { archivedCount: 0, dedupedCount: 0 };
    }

    const dayKey = getLocalDateKey();
    const existingRaw = await this.readDayMessages(dayKey);
    const mergedRaw = this.mergeMessagesById([...existingRaw, ...candidates]);
    await this.writeDayMessages(dayKey, mergedRaw);

    const writeCount = candidates.length;
    const dedupeCount = Math.max(0, mergedRaw.length - existingRaw.length);

    await Promise.all(candidates.map(message => this.appendStoryDigestForRaw(message)));

    await this.clearCurrentChoicesFile();
    await this.clearCurrentStoryFile();
    this._currentStorySnapshot = this.createEmptyCurrentStoryState(this.getStorySessionId());
    await this.refreshMessagesFromStorage();

    if (this._isMounted) {
      this.setState({
        isArchivingCurrentStory: false,
        currentStorySessionId: this._currentStorySnapshot.storySessionId,
        currentStoryMessages: [],
      });
    }

    return { archivedCount: writeCount, dedupeCount: dedupeCount, dedupedCount: dedupeCount };
  };



  listDateKeys = async () => {
    try {
      const baseDir = `${this.agentChatDir}/raw`;
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
      const messages = await readStoryEntriesByDay(this.agentChatDir, dateKey, 'raw');
      return messages.filter(message => !message?.hidden);
    } catch {
      return [];
    }
  };

  readDigestDayEntries = async dateKey => {
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
      const dayMessages = messages.filter(message => getLocalDateKey(message.timestamp) === dateKey);
      const path = this.getStoryRawPath(dateKey);
      await RNFS.writeFile(path, JSON.stringify(dayMessages), 'utf8');
    } catch (e) {}
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
    const roleLangCode = this.getActiveRoleLanguageCode() || this.getStoryLangCode() || 'en';
    const instruction = buildStoryDigestPrompt({
      roleLangCode,
      isUser,
      normalizeStoryLangCode,
      getStoryLangLabel,
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
    const recent = [{ sender: 'user', text: `Original text:\n${rawText}` }];
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

    const canAcceptStoryRuntimeMessage =
      !this.isStoryScope ||
      message._localOnly ||
      message._renderMode === 'commands' ||
      message.sender === 'system' ||
      this.isStoryPersistenceUnlocked();

    this.shouldScrollToEnd = true;
    const shouldPersistCurrentStory =
      this.isStoryScope &&
      canAcceptStoryRuntimeMessage &&
      !message._localOnly &&
      message._renderMode !== 'commands' &&
      message.sender !== 'system';
    this.setState(
      prevState => {
        const allMessages = !canAcceptStoryRuntimeMessage ? prevState.allMessages : [...prevState.allMessages, message];
        const base = Math.max(prevState.visibleCount, PAGE_SIZE);
        const sourceMessages = allMessages;
        const visibleCount = Math.min(sourceMessages.length, base);
        const nextCurrentStoryMessages = shouldPersistCurrentStory
          ? this.mergeMessagesById([...(prevState.currentStoryMessages || []), ...[this.normalizeCurrentStoryMessage(message)].filter(Boolean)])
          : prevState.currentStoryMessages || [];

        return {
          allMessages,
          currentStoryMessages: nextCurrentStoryMessages,
          visibleCount,
          messages: sourceMessages.slice(-visibleCount),
          currentStorySessionId: prevState.currentStorySessionId || this.getStorySessionId(),
        };
      },
      async () => {
        if (!shouldPersistCurrentStory) {
          return;
        }
        const currentStoryMessages = this.state.currentStoryMessages;
        if (message?.sender === 'agent') {
          await this.persistCurrentStoryMessages(currentStoryMessages);
          this.syncStoryChoicesFromMessages(this.state.currentStoryMessages);
          await this.reconcileStoryLinkStatusAfterAgentUpdate();
          await this.persistCurrentStoryMessages(this.state.currentStoryMessages);
        } else {
          await this.persistCurrentStoryMessages(currentStoryMessages);
          this.syncStoryChoicesFromMessages(currentStoryMessages);
        }
      },
    );
  };

  persistStoryLLMReply = async ({ requestId, replyText, placeholder } = {}) => {
    if (!this.isStoryScope) {
      return null;
    }
    const text = String(replyText || '').trim();
    if (!text) {
      return null;
    }

    const existing = Array.isArray(this.state?.allMessages)
      ? this.state.allMessages.find(message => message?.requestId === requestId)
      : null;
    const message = this.normalizeCurrentStoryMessage({
      ...(placeholder || {}),
      ...(existing || {}),
      id: existing?.id || placeholder?.id || `agent-${requestId || Date.now()}`,
      sender: 'agent',
      text,
      pending: false,
      requestId: requestId || existing?.requestId || placeholder?.requestId,
      timestamp: Number(existing?.timestamp || placeholder?.timestamp || Date.now()),
      completedAt: Number(existing?.completedAt || existing?.updatedAt || Date.now()),
      updatedAt: Number(existing?.updatedAt || existing?.completedAt || Date.now()),
    });
    if (!message) {
      return null;
    }

    const mergedMessages = this.mergeMessagesById([
      ...(Array.isArray(this.state?.currentStoryMessages) ? this.state.currentStoryMessages : []),
      ...((Array.isArray(this._currentStorySnapshot?.messages) ? this._currentStorySnapshot.messages : []) || []),
      message,
    ]);
    const written = await this.persistCurrentStoryMessages(mergedMessages);
    const requestKey = String(requestId || message.requestId || '');
    const preparedChoices = this._preparedStoryReplyChoicesByRequestId?.[requestKey] || [];
    const choices = preparedChoices.length > 0 ? preparedChoices : this.extractStoryChoices(text);

    if (choices.length > 0) {
      await this.writeCurrentChoicesFile(choices);
      await this.updateCurrentStoryRuntime({
        status: 'waiting_user',
        phase: 'exploring',
        lastChoiceSet: choices,
        awaitingChoice: true,
        shouldResumeGeneration: false,
        lastSubmittedChoiceAt: 0,
        lastSubmittedChoiceUserMessageId: '',
        messages: written.messages,
      });
      if (preparedChoices.length > 0 && this._preparedStoryReplyChoicesByRequestId) {
        delete this._preparedStoryReplyChoicesByRequestId[requestKey];
      }
      this.setStoryLinkStatus(this.getStoryMenuText('linkActive'));
      return written;
    }

    await this.updateCurrentStoryRuntime({
      status: 'exploring',
      phase: 'exploring',
      lastChoiceSet: [],
      awaitingChoice: false,
      shouldResumeGeneration: false,
      messages: written.messages,
    });
    this.setStoryLinkStatus(this.getStoryMenuText('uplinkSent'), this.getStoryMenuText('waitingFieldResponseLower'), { waiting: true });
    return written;
  };

  reconcileStoryLinkStatusAfterAgentUpdate = async () => {
    if (!this.isStoryScope || !this._isMounted) {
      return;
    }

    const currentChoices = this.syncStoryChoicesFromMessages(this.state.currentStoryMessages || []);
    if (currentChoices.length > 0) {
      await this.updateCurrentStoryRuntime({
        status: 'waiting_user',
        phase: 'exploring',
        lastChoiceSet: currentChoices,
        awaitingChoice: true,
        shouldResumeGeneration: false,
        lastSubmittedChoiceAt: 0,
        lastSubmittedChoiceUserMessageId: '',
      });
      return;
    }

    const hasAgentText = (this.state.currentStoryMessages || []).some(
      item => item?.sender === 'agent' && String(item?.text || '').trim()
    );

    if (!hasAgentText) {
      return;
    }

    const recoveredBootstrapChoices = await this.maybeRecoverBootstrapStoryChoices(this.state.currentStoryMessages || []);
    if (recoveredBootstrapChoices.length > 0) {
      return;
    }

    this._pendingChoiceSubmissionAt = 0;
    this._pendingChoiceUserMessageId = null;
    if (this._isMounted) {
      this.setState({ currentStoryChoices: [], currentStoryLastChoiceSet: [], currentStoryAwaitingChoice: false });
      this.setStoryLinkStatus(this.getStoryMenuText('uplinkSent'), this.getStoryMenuText('waitingFieldResponseLower'), { waiting: true });
    }
    await this.updateCurrentStoryRuntime({
      status: 'exploring',
      phase: 'exploring',
      lastChoiceSet: [],
      awaitingChoice: false,
      shouldResumeGeneration: false,
    });
  };

  appendMessages = messages => {
    this.shouldScrollToEnd = true;
    const acceptedMessages = Array.isArray(messages)
      ? messages.filter(message => {
          if (message?._localOnly || message?._renderMode === 'commands' || message?.sender === 'system') return true;
          return this.isStoryPersistenceUnlocked();
        })
      : [];
    const persistedMessages = acceptedMessages.filter(message => !message?._localOnly && message._renderMode !== 'commands');
    this.setState(
      prevState => {
        const allMessages = [...prevState.allMessages, ...acceptedMessages];
        const base = Math.max(prevState.visibleCount, PAGE_SIZE);
        const sourceMessages = allMessages;
        const visibleCount = Math.min(sourceMessages.length, base);

        const nextCurrentStoryMessages = this.mergeMessagesById([...(prevState.currentStoryMessages || []), ...persistedMessages.map(this.normalizeCurrentStoryMessage).filter(Boolean)]);

        return {
          allMessages,
          currentStoryMessages: nextCurrentStoryMessages,
          visibleCount,
          messages: sourceMessages.slice(-visibleCount),
        };
      },
      async () => {
        if (persistedMessages.length > 0) {
          const currentStoryMessages = this.state.currentStoryMessages;
          if (persistedMessages.some(message => message?.sender === 'agent')) {
            await this.persistCurrentStoryMessages(currentStoryMessages);
            this.syncStoryChoicesFromMessages(this.state.currentStoryMessages);
            await this.reconcileStoryLinkStatusAfterAgentUpdate();
            await this.persistCurrentStoryMessages(this.state.currentStoryMessages);
          } else {
            await this.persistCurrentStoryMessages(currentStoryMessages);
            this.syncStoryChoicesFromMessages(currentStoryMessages);
          }
        }
      },
    );
  };

  updateAgentMessage = (requestId, newText, extra = null) => {
    this.shouldScrollToEnd = true;
    return new Promise(resolve => {
      this.setState(
        prevState => {
        if (this.isStoryScope && !this.isStoryPersistenceUnlocked()) {
          return null;
        }
        let didUpdate = false;
        let updatedCurrent = null;
        const allMessages = prevState.allMessages.map(message => {
          if (message?.requestId === requestId) {
            didUpdate = true;
            updatedCurrent = {
              ...message,
              ...(extra || {}),
              text: newText,
              pending: false,
              completedAt: Date.now(),
              updatedAt: Date.now(),
            };
            return updatedCurrent;
          }
          return message;
        });
        if (!didUpdate) {
          return null;
        }

        const nextCurrentStoryMessages = prevState.currentStoryMessages || [];
        const normalizedUpdatedCurrent = this.normalizeCurrentStoryMessage(updatedCurrent);
        const nextInCurrent = this.isStoryScope
          ? this.mergeMessagesById(
              [
                ...nextCurrentStoryMessages.map(item => {
                  if (item?.requestId === requestId) {
                    return {
                      ...item,
                      text: newText,
                      pending: false,
                      completedAt: updatedCurrent?.completedAt || Date.now(),
                      updatedAt: updatedCurrent?.updatedAt || Date.now(),
                    };
                  }
                  return item;
                }),
                normalizedUpdatedCurrent,
              ].filter(Boolean),
            )
          : prevState.currentStoryMessages || [];

        return {
          allMessages,
          currentStoryMessages: nextCurrentStoryMessages ? nextInCurrent : prevState.currentStoryMessages,
          messages: allMessages.slice(-prevState.visibleCount),
        };
      },
        async () => {
          try {
            const updated = this.state.allMessages.find(message => message?.requestId === requestId);
            if (!updated || updated._localOnly || updated._renderMode === 'commands') {
              resolve(null);
              return;
            }
            const currentStoryMessages = this.state.currentStoryMessages;
            if (updated?.sender === 'agent') {
              const preparedChoices =
                this._preparedStoryReplyChoicesByRequestId?.[String(requestId || '')] || [];
              await this.persistCurrentStoryMessages(currentStoryMessages);
              if (preparedChoices.length > 0) {
                await this.writeCurrentChoicesFile(preparedChoices);
                await this.updateCurrentStoryRuntime({
                  status: 'waiting_user',
                  phase: 'exploring',
                  lastChoiceSet: preparedChoices,
                  awaitingChoice: true,
                  shouldResumeGeneration: false,
                  lastSubmittedChoiceAt: 0,
                  lastSubmittedChoiceUserMessageId: '',
                  messages: this.state.currentStoryMessages,
                });
                this.setStoryLinkStatus(this.getStoryMenuText('linkActive'));
              } else {
                this.syncStoryChoicesFromMessages(this.state.currentStoryMessages);
              }
              await this.persistCurrentStoryMessages(this.state.currentStoryMessages);
            } else {
              await this.persistCurrentStoryMessages(currentStoryMessages);
              this.syncStoryChoicesFromMessages(currentStoryMessages);
            }
            this.appendStoryDigestForRaw(updated);
            resolve(updated);
          } catch (error) {
            console.warn('Failed to persist updated agent message', error);
            resolve(null);
          }
        },
      );
    });
  };

  handleSend = async payload => {
    const rawInput = String(payload?.displayText ?? '').trim();
    if (!rawInput) {
      return;
    }
    const modelText = String(payload?.modelText ?? rawInput).trim();
    const userMessage = payload?.prebuiltUserMessage || this.buildMessage(rawInput, 'user');
    userMessage._modelText = modelText;
    userMessage._choiceMeta = payload?.choiceMeta || null;
    if (!payload?.skipAppend) {
      this.appendMessage(rawInput, 'user', {
        id: userMessage.id,
        timestamp: userMessage.timestamp,
        _modelText: userMessage._modelText,
        _choiceMeta: userMessage._choiceMeta,
        _localOnly: userMessage._localOnly,
        _recordExcluded: userMessage._recordExcluded,
      });
    }
    try {
      await this.handleTriggers(modelText, userMessage);
    } catch (error) {
      console.warn('AgentStory: handleSend trigger failed', error);
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
    try {
      await this.handleTriggers(text, userMessage);
    } catch (error) {
      console.warn('AgentStory: sendCommand trigger failed', error);
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
      const isFinalModelCommand = /^\/a\s+model\b/i.test(trimmed);
      const beforeKey = buildLlmSelectionKey(this.state.llmConfig);

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
      }
      return;
    }
    const shortMatch = /^\/short(?:\s+(on|off))?\s*$/i.exec(trimmed);
    if (shortMatch) {
      const nextMode = (shortMatch[1] || '').toLowerCase();
      if (!nextMode) {
        showStatus(this.getStoryMenuText('shortUsage'), 2000);
        return;
      }
      const enabled = nextMode === 'on';
      this.setState({ storyShortMode: enabled });
      showStatus(enabled ? this.getStoryMenuText('shortOn') : this.getStoryMenuText('shortOff'), 2000);
      return;
    }
    const langMatch = /^\/lang(?:\s+(.+))?\s*$/i.exec(trimmed);
    if (langMatch) {
      await this.handleLangCommand(langMatch[1] || '');
      return;
    }
    const destinyMatch = /^\/d(?:\s+(.+))?$/i.exec(trimmed);
    if (destinyMatch) {
      await this.handleDestinyCommand(destinyMatch[1] || '');
      return;
    }

    if (/^\/block\b/i.test(trimmed)) {
      await this.replyWithCurrentBlock();
      return;
    }

    if (trimmed.startsWith('/')) {
      this.replyFromAgent(this.getStoryMenuText('unknownCommand'));
      return;
    }

    await this.runStoryContinueTurn({
      userMessage,
      submittedAt: Number(userMessage?.timestamp || 0),
    });
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
    const normalized = commandText.toLowerCase();
    const autoCommandSource = String(navigation?.state?.params?.autoCommandSource || '').trim();
    const allowlistedStoryAutoCommand = /^\/d\s+clear\b/.test(normalized)
      || (autoCommandSource === 'story-fragment-import' && /^\/d\s+new\b/.test(normalized));
    if (/^\/(?:d|a)\b/.test(normalized) && !allowlistedStoryAutoCommand) {
      navigation?.setParams?.({ autoCommand: null });
      this.setStoryLinkStatus(this.getStoryMenuText('linkIdle'), this.getStoryMenuText('autoTriggerBlocked'));
      return;
    }
    this.hasAutoCommandRun = true;
    this.lastAutoCommand = commandText;
    await this.handleTriggers(commandText, null);
    this.shouldScrollToEnd = true;
    navigation?.setParams?.({ autoCommand: null });
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
      console.warn('Failed to fetch fresh story block height', error);
      return null;
    }
  };

  replyWithCurrentBlock = async (opts = {}) => {
    try {
      const height = await this.getCachedOrFetchBlockHeight();
      const resultText = this.getStoryMenuText('currentBlock', { height });
      if (!opts?.silent) {
        this.replyFromAgent(resultText);
      }
      return height;
    } catch (e) {
      const errText = this.getStoryMenuText('currentBlockFailed', { error: String(e?.message || e) });
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

  isModelMenuLikeText = text => {
    const raw = String(text || '');
    const lower = raw.toLowerCase();
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const trimmedLower = normalized.toLowerCase();
    return lower.includes('[[/a')
      || lower.includes('[[/d')
      || lower.includes('[[/destiny')
      || lower.includes('[[/reopen')
      || trimmedLower === '/a'
      || trimmedLower.startsWith('/a ')
      || trimmedLower.startsWith('/d menu')
      || trimmedLower.startsWith('/destiny menu')
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
    const t = String(text || '')
      .trim()
      .toLowerCase();

    const isModelSelectedMsg = t.includes('model selected');

    if (isModelSelectedMsg) {
      const now = Date.now();
      if (this._lastAutoDAt && now - this._lastAutoDAt < 1000) return;
      this._lastAutoDAt = now;
      this.setStoryLinkStatus(this.getStoryMenuText('modelReady'), '', { waiting: true });
      return;
    }

    const reply = {
      ...this.buildMessage(text, 'agent'),
      ...(options || {}),
      _useSatoshiAvatar: Boolean(options?._useSatoshiAvatar || this._handlingCommandReply || this.isModelMenuLikeText(text)),
    };
    if (String(text || '').trim()) {
      this.setStoryLinkStatus(this.getStoryMenuText('linkActive'));
      this.maybeFinalizeStoryRunFromText(text);
    }
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
    const currentLabel = currentCode ? getStoryLangLabel(currentCode) : '';
    const current = currentCode
      ? this.getStoryMenuText('currentLanguage', { label: currentLabel, code: currentCode })
      : this.getStoryMenuText('currentLanguageNotSet');

    return [
      this.getStoryMenuText('langMenuTitle', { current }),
      '',
      this.getSupportedStoryLangListMessage(),
    ].join('\n');
  };

  getSupportedStoryLangListMessage = () => {
    const items = (STORY_SUPPORTED_LANGS || []).map(item => (item && item.code ? item : null)).filter(Boolean);

    const lines = [this.getStoryMenuText('supportedLangs'), ''];
    const row = [];
    for (let i = 0; i < items.length; i++) {
      const { code, label } = items[i];
      row.push(`[[/lang ${code}|${label}]]`);
      if (row.length === 3) {
        lines.push(row.join('   '));
        row.length = 0;
      }
    }
    if (row.length) lines.push(row.join('   '));

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

  appendPersistentStoryStatusMessage = async text => {
    const cleanText = String(text || '').trim();
    if (!cleanText) {
      return null;
    }

    const message = {
      ...this.buildMessage(cleanText, 'agent'),
      _renderMode: 'commands',
      _localOnly: true,
      _storyStatusRecord: true,
      _useSatoshiAvatar: true,
    };

    this.appendMessage(message, 'user', {
      _renderMode: 'commands',
      _localOnly: true,
      _storyStatusRecord: true,
    });

    const normalized = this.normalizeCurrentStoryMessage(message);
    if (!normalized) {
      return null;
    }

    const merged = this.mergeMessagesById([
      ...(Array.isArray(this._currentStorySnapshot?.messages) ? this._currentStorySnapshot.messages : []),
      ...(Array.isArray(this.state?.currentStoryMessages) ? this.state.currentStoryMessages : []),
      normalized,
    ]);
    await this.persistCurrentStoryMessages(merged);
    return normalized;
  };

  getLatestStoryUserMessage = messages => {
    const ordered = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const message = ordered[i];
      if (message?.sender !== 'user' || message?._localOnly || message?._renderMode === 'commands') continue;
      const text = String(message?._modelText || message?.text || '').trim();
      if (!text) continue;
      return message;
    }
    return null;
  };

  isSyntheticStoryFallbackChoice = messageOrChoice => {
    const fallbackTexts = Object.values(STORY_OPTION_FALLBACK_TEXTS);
    const fallbackPrompts = Object.values(STORY_OPTION_FALLBACK_PROMPTS);
    if (messageOrChoice && typeof messageOrChoice === 'object') {
      const text = String(messageOrChoice?._modelText || messageOrChoice?.text || '').trim();
      return (
        fallbackTexts.includes(text) ||
        fallbackPrompts.includes(text) ||
        messageOrChoice?._choiceMeta?.source === STORY_EMPTY_OPTION_FALLBACK_SOURCE ||
        messageOrChoice?._choiceMeta?.syntheticFallback === true
      );
    }
    const value = String(messageOrChoice || '').trim();
    return fallbackTexts.includes(value) || fallbackPrompts.includes(value);
  };

  maybeAutoAdvanceStoryOnEmptyChoices = async (messages = null) => {
    if (!this.isStoryScope || this._storyOptionRepairInFlight) return false;

    const sourceMessages = this.mergeMessagesById(Array.isArray(messages) ? messages : this.state.currentStoryMessages || []);
    const phase = String(this._currentStorySnapshot?.phase || this.state.currentStoryPhase || '');
    if (!phase || phase === 'boot') return false;

    const lastSubmittedChoiceAt = this.getLatestStoryChoiceSubmissionAt();
    let latestAgentReply =
      lastSubmittedChoiceAt > 0
        ? this.getLatestEligibleAgentMessageAfterChoice(sourceMessages, lastSubmittedChoiceAt)
        : this.getLatestStoryAgentReplyIgnoringSubmission(sourceMessages);
    if (
      !latestAgentReply &&
      lastSubmittedChoiceAt > 0 &&
      !this.hasPersistedStorySubmissionMessage(sourceMessages, lastSubmittedChoiceAt) &&
      !this.hasPendingStoryAgentMessage(sourceMessages)
    ) {
      latestAgentReply = this.getLatestStoryAgentReplyIgnoringSubmission(sourceMessages);
    }
    if (!latestAgentReply?.id) return false;
    if (this._storyOptionRepairSourceMessageId === latestAgentReply.id) return false;
    if (this.shouldDelayStoryAutoFallback(sourceMessages, lastSubmittedChoiceAt, latestAgentReply)) return false;

    const parsedChoices = this.extractStoryChoices(String(latestAgentReply.text || '').trim());
    if (parsedChoices.length > 0) return false;

    const ordered = this.sortMessagesByTime(sourceMessages);
    const replyIndex = ordered.findIndex(item => item?.id === latestAgentReply.id);
    const hasNewerUserTurn =
      replyIndex >= 0 &&
      ordered.slice(replyIndex + 1).some(item => item?.sender === 'user' && !item?._localOnly && item?._renderMode !== 'commands');
    if (hasNewerUserTurn) return false;

    const choices = await this.ensureStoryOptionsFromModelReply(latestAgentReply, sourceMessages, {
      source: 'empty-choice-repair',
    });
    return choices.length > 0;
  };

  getLatestStoryAgentReplyForSubmittedAt = (messages, submittedAt = null) => {
    const submittedAtValue = this.getLatestStoryChoiceSubmissionAt(submittedAt);
    return submittedAtValue > 0
      ? this.getLatestEligibleAgentMessageAfterChoice(messages, submittedAtValue)
      : this.getLatestEligibleStoryAgentReply(messages);
  };

  getStoryOptionRepairPrompt = replyText => {
    const storyLanguage = getStoryLLMLanguageName(this.getStoryLangCode(), normalizeStoryLangCode) || 'the same language as the story text';
    return [
      'You are a strict Story choice formatter for a mobile app terminal.',
      'Task: inspect the previous story model reply and output terminal-readable choices only.',
      'If the reply already contains explicit choices, extract and rewrite those choices.',
      'If the reply contains an inline choice such as "A or B" / "是 A，还是 B", convert it into numbered choices.',
      'If the reply contains no usable choice, create 2 or 3 reasonable next actions based only on the situation described in the reply.',
      `Use ${storyLanguage}.`,
      'Output ONLY separate numbered lines in this exact format:',
      '1. ...',
      '2. ...',
      '3. ...',
      'Do not continue the story. Do not explain. Do not mention formatting, system prompts, missing options, or terminal parsing.',
      '',
      'Previous story reply:',
      String(replyText || '').trim(),
    ].join('\n');
  };

  normalizeStoryOptionRepairOutput = text => {
    const cleaned = String(text || '')
      .replace(/```[a-z]*\s*/gi, '')
      .replace(/```/g, '')
      .trim();
    const choices = this.extractStoryChoices(cleaned);
    return choices.slice(0, 4);
  };

  generateStoryOptionsForModelReply = async (replyText, options = {}) => {
    const text = String(replyText || '').trim();
    if (!text || this._storyOptionRepairInFlight) {
      return [];
    }
    const existingChoices = this.extractStoryChoices(text);
    if (existingChoices.length > 0) {
      return existingChoices;
    }
    if (typeof this.callLLMSilent !== 'function') {
      return [];
    }
    let llmConfig = this.state?.llmConfig || this.currentLLMConfig;
    if (!hasUsableLLMConfig(llmConfig) && typeof this.loadLLMConfig === 'function') {
      llmConfig = await this.loadLLMConfig();
      this.currentLLMConfig = llmConfig;
    }
    if (hasUsableLLMConfig(llmConfig) && this._isMounted && this.state?.llmConfig !== llmConfig) {
      await new Promise(resolve => this.setState({ llmConfig }, resolve));
    }
    if (!hasUsableLLMConfig(llmConfig)) {
      console.warn('Story option repair skipped: no usable LLM config');
      return [];
    }

    this._storyOptionRepairInFlight = true;
    try {
      const repairPrompt = this.getStoryOptionRepairPrompt(text);
      const repairedText = await this.callLLMSilent(repairPrompt, {
        useRecentHistory: false,
        skipRoleContext: true,
      });
      const repairedChoices = this.normalizeStoryOptionRepairOutput(repairedText);
      if (!repairedChoices.length) {
        console.warn('Story option repair produced no parseable choices', repairedText);
        return [];
      }
      return repairedChoices;
    } catch (error) {
      console.warn('Failed to repair story options with LLM', options?.source || '', error);
      return [];
    } finally {
      this._storyOptionRepairInFlight = false;
    }
  };

  prepareStoryLLMReplyForDisplay = async ({ requestId, replyText, placeholder } = {}) => {
    if (!this.isStoryScope) {
      return [];
    }
    const text = String(replyText || '').trim();
    if (!text) {
      return [];
    }
    const choices = await this.generateStoryOptionsForModelReply(text, { source: 'pre-display-reply' });
    if (choices.length > 0) {
      this._preparedStoryReplyChoicesByRequestId = {
        ...(this._preparedStoryReplyChoicesByRequestId || {}),
        [String(requestId || placeholder?.requestId || '')]: choices,
      };
    }
    return choices;
  };

  ensureStoryOptionsFromModelReply = async (latestAgentReply, messages = null, options = {}) => {
    if (!this.isStoryScope || !latestAgentReply?.id) {
      return [];
    }
    const replyText = String(latestAgentReply?.text || '').trim();
    if (!replyText) {
      return [];
    }
    const repairedChoices = await this.generateStoryOptionsForModelReply(replyText, options);
    if (!repairedChoices.length) {
      return [];
    }

    this._storyOptionRepairSourceMessageId = latestAgentReply.id;
    const sourceMessages = this.mergeMessagesById(Array.isArray(messages) ? messages : this.state.currentStoryMessages || []);
    await this.writeCurrentChoicesFile(repairedChoices);
    await this.updateCurrentStoryRuntime({
      status: 'waiting_user',
      phase: 'exploring',
      lastChoiceSet: repairedChoices,
      awaitingChoice: true,
      shouldResumeGeneration: false,
      lastSubmittedChoiceAt: 0,
      lastSubmittedChoiceUserMessageId: '',
      messages: sourceMessages,
    });
    this.setStoryLinkStatus(this.getStoryMenuText('linkActive'));
    return repairedChoices;
  };

  readCurrentStoryReplyFileState = async (submittedAt = null) => {
    const path = this.getStoryCurrentPath();
    try {
      const exists = await RNFS.exists(path);
      if (!exists) {
        return { exists: false, empty: true, messages: [], latestAgentReply: null };
      }

      const raw = await RNFS.readFile(path, 'utf8');
      if (!String(raw || '').trim()) {
        return { exists: true, empty: true, messages: [], latestAgentReply: null };
      }

      const json = JSON.parse(raw);
      const messages = this.mergeMessagesById(
        (Array.isArray(json?.messages) ? json.messages : [])
          .map(this.normalizeCurrentStoryMessage)
          .filter(Boolean),
      );
      return {
        exists: true,
        empty: messages.length === 0,
        messages,
        latestAgentReply: this.getLatestStoryAgentReplyForSubmittedAt(messages, submittedAt),
      };
    } catch (error) {
      console.warn('Failed to inspect current story reply file', error);
      return { exists: false, empty: true, messages: [], latestAgentReply: null };
    }
  };

  maybeAutoAdvanceStoryOnMissingReply = async () => false;

  getLatestEligibleStoryAgentReply = messages => {
    const ordered = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    const lastSubmittedChoiceAt = this.getLatestStoryChoiceSubmissionAt();
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const message = ordered[i];
      if (message?.sender !== 'agent') {
        continue;
      }
      if (message?.pending || message?._localOnly || message?._renderMode === 'commands') {
        continue;
      }
      const text = String(message?.text || '').trim();
      if (!text) {
        continue;
      }
      if (lastSubmittedChoiceAt > 0 && Number(message?.timestamp || 0) <= lastSubmittedChoiceAt) {
        continue;
      }
      return message;
    }
    return null;
  };

  buildBootstrapStoryFallbackChoices = latestAgentReply => {
    const latestText = String(latestAgentReply?.text || '').trim();
    if (!latestText) {
      return [];
    }
    const labels = getStoryBootstrapFallbackLabels(this.getStoryOptionFallbackLocale());
    return [
      {
        key: '1',
        send: '1',
        label: labels.choice1,
        source: STORY_BOOTSTRAP_FALLBACK_SOURCE,
      },
      {
        key: '2',
        send: '2',
        label: labels.choice2,
        source: STORY_BOOTSTRAP_FALLBACK_SOURCE,
      },
      {
        key: '3',
        send: '3',
        label: labels.choice3,
        source: STORY_BOOTSTRAP_FALLBACK_SOURCE,
      },
    ];
  };

  maybeRecoverBootstrapStoryChoices = async messages => {
    if (!this.isStoryScope || !this._isMounted) {
      return [];
    }

    const storyMessages = this.sortMessagesByTime(Array.isArray(messages) ? messages : []);
    if (!storyMessages.length) {
      return [];
    }

    const lastSubmittedChoiceAt = this.getLatestStoryChoiceSubmissionAt();
    if (lastSubmittedChoiceAt > 0) {
      return [];
    }

    const latestAgentReply = this.getLatestEligibleStoryAgentReply(storyMessages);
    if (!latestAgentReply?.id) {
      return [];
    }

    const parsedChoices = this.extractStoryChoices(String(latestAgentReply.text || '').trim());
    if (parsedChoices.length > 0) {
      return [];
    }

    return this.ensureStoryOptionsFromModelReply(latestAgentReply, storyMessages, {
      source: 'bootstrap-option-repair',
    });
  };

  maybeAutoSubmitStoryFallbackChoice = async () => false;

  handleLangCommand = async argsString => {
    const args = String(argsString || '').trim();
    if (!args) {
      this.setStoryLinkStatus(this.getStoryMenuText('languageRequired'), this.getStoryMenuText('selectOutputLanguage'));
      this.appendStoryCommandMessage(this.getStoryLangMenuMessage());
      return true;
    }

    const normalizedArg = normalizeStoryLangCode(args);
    const isSupported = STORY_SUPPORTED_LANGS.some(item => item.code === normalizedArg);
    if (!isSupported) {
      showStatus(this.getStoryMenuText('unsupportedLang', { code: args }), 2000);
      this.appendStoryCommandMessage(this.getStoryLangMenuMessage());
      return true;
    }

    await this.setStoryLangCode(normalizedArg);
    this.setStoryLinkStatus(this.getStoryMenuText('languageLocked'), `${getStoryLangLabel(normalizedArg)} (${normalizedArg})`);
    this.appendStoryCommandMessage(this.getStoryLangMenuMessage());
    await new Promise(resolve => this.setState({ pendingDestinyRun: false, pendingDestinyMode: null }, resolve));
    return true;
  };

  getStoryLangCode = () => {
    const code = this.state.storyLangCode;
    if (!code) {
      return null;
    }
    return normalizeStoryLangCode(code);
  };

  getStoryLocale = () => normalizeStoryLangCode(this.getStoryLangCode() || getDefaultStoryLangCode());

  getStoryOptionFallbackLocale = () =>
    normalizeStoryLangCode(this.getActiveRoleLanguageCode() || this.getStoryLocale() || getDefaultStoryLangCode());

  getStoryEmptyOptionFallbackText = () => getStoryOptionFallbackText(this.getStoryOptionFallbackLocale());

  getStoryEmptyOptionFallbackPrompt = () => getStoryOptionFallbackPrompt(this.getStoryOptionFallbackLocale());

  getStoryMenuText = (key, vars = {}) => getStoryMenuTextForLocale(key, vars, this.getStoryLocale());

  getStoryStatusLocale = () =>
    normalizeStoryLangCode(this.getActiveRoleLanguageCode() || this.getStoryLangCode() || getDefaultStoryLangCode());

  getStoryStatusText = (key, vars = {}, locale = null) =>
    getStoryMenuTextForLocale(key, vars, normalizeStoryLangCode(locale || this.getStoryStatusLocale()));

  waitStoryStatusInterval = (delayMs = 500) => new Promise(resolve => setTimeout(resolve, delayMs));

  getDestinyModeFromArg = value => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'auto') {
      return 'auto';
    }
    if (normalized === 'continue') {
      return 'continue';
    }
    if (normalized === 'new') {
      return 'new';
    }
    if (normalized === 'settings') {
      return 'settings';
    }
    if (normalized === 'record') {
      return 'record';
    }
    if (normalized === 'reconnect') {
      return 'reconnect';
    }
    if (normalized === 'clear') {
      return 'clear';
    }
    return 'menu';
  };

  buildDestinyModeMenuMessage = () => {
    const hasCurrentStory = Array.isArray(this.state.currentStoryMessages) && this.state.currentStoryMessages.some(message => message?.sender && !message._localOnly && message._renderMode !== 'commands');
    const lines = [];
    if (hasCurrentStory) {
      lines.push(`[[/d continue|${this.getStoryMenuText('continueStory')}]]`);
      lines.push('');
    }
    lines.push(`[[/d new|${this.getStoryMenuText('startNew')}]]`);
    lines.push('');
    lines.push(`[[/d settings|${this.getStoryMenuText('settings')}]]`);
    return lines.join('\n');
  };

  buildDestinySettingsMenuMessage = () => {
    return [
      `[[/d record|${this.getStoryMenuText('viewRecord')}]]`,
      '',
      `[[/d clear|${this.getStoryMenuText('clearRecord')}]]`,
      '',
      `[[/d|${this.getStoryMenuText('back')}]]`,
    ].join('\n');
  };

  buildCurrentStoryRecordMessage = () => {
    const currentMessages = Array.isArray(this.state.currentStoryMessages) ? this.state.currentStoryMessages.filter(Boolean) : [];
    if (!currentMessages.length) {
      return this.getStoryMenuText('noCurrentStory');
    }
    const lines = [this.getStoryMenuText('currentStoryTitle'), ''];
    currentMessages.forEach(message => {
      const role = message?.sender === 'user' ? 'U' : 'A';
      const rawBody = String(message?._modelText || message?.text || '').trim();
      const body = role === 'A' ? this.stripStoryChoiceLines(rawBody) : rawBody;
      if (body) lines.push(`${role}: ${body}`);
    });
    return lines.join('\n');
  };

  resetStoryStorageAndRestart = async () => {
    try {
      const nextStorySessionId = this.getStorySessionId();
      this.setStoryPersistenceUnlocked(false);
      if (await RNFS.exists(this.agentChatDir)) {
        await RNFS.unlink(this.agentChatDir).catch(() => {});
      }
      this._currentStorySnapshot = this.createEmptyCurrentStoryState(nextStorySessionId);
      this._pendingChoiceSubmissionAt = 0;
      this._pendingChoiceUserMessageId = null;
      this._storyAutoFallbackInFlight = false;
      this._storyAutoFallbackSourceMessageId = null;
      await this.clearCurrentAlphaLog();
      await ensureStoryDirs(this.agentChatDir);
      await ensureAlphaDirs(this.agentChatDir);
      this.loadedDateKeys = [];
      this.allDateKeys = [];
      await new Promise(resolve =>
        this.setState(
          {
            allMessages: [],
            messages: [],
            visibleCount: PAGE_SIZE,
            currentStoryMessages: [],
            currentStorySessionId: nextStorySessionId,
            currentStoryChoices: [],
            currentStoryHasStoryFile: false,
            currentStoryHasChoiceFile: false,
            currentStoryLastChoiceSet: [],
            currentStoryAwaitingChoice: false,
            currentStoryStatus: 'idle',
            currentStoryPhase: 'boot',
            currentStoryEntryMode: 'new',
            currentStoryShouldResumeGeneration: false,
            lastSubmittedChoiceAt: 0,
            currentAlpha: null,
            baseAlpha: null,
          },
          resolve,
        )
      );
      await this.hydrateStoryUiFromStorage();
      this.setStoryLinkStatus(this.getStoryMenuText('linkWaiting'), this.getStoryMenuText('awaitingSignal'), { waiting: true });
    } catch (error) {
      console.warn('Failed to reset story storage', error);
      toastError(error);
    }
  };

  buildDestinyCurrentLanguageNotice = () => {
    const code = this.getActiveRoleLanguageCode() || this.getStoryLangCode();
    if (!code) {
      return this.getStoryMenuText('currentLanguageNotSet');
    }
    const label = getStoryLangLabel(code);
    return this.getStoryMenuText('currentLanguage', { label, code });
  };

  buildStoryCondensedMemory = async (limit = 50) => {
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

  startFreshStoryRun = async (options = {}) => {
    this.setStoryPersistenceUnlocked(true);
    this.setStoryLinkStatus(this.getStoryMenuText('linking'), this.getStoryMenuText('linkingAgu'), { waiting: true });
    const roleContext = this.currentRoleContext || (await this.loadCurrentRoleForStory());
    const alphaState = roleContext ? await this.ensureStoryAlphaState(roleContext) : null;
    const height = await this.replyWithCurrentBlock({ silent: true });
    this._latestStoryBlockHeight = height;
    await this.archiveCurrentStoryToRaw();
    const statusLocale = normalizeStoryLangCode(options?.statusLocale || this.getStoryStatusLocale());
    const statusDelayMs = Number.isFinite(Number(options?.statusDelayMs)) ? Number(options.statusDelayMs) : 500;
    const roleReadyText = String(options?.roleReadyText || '').trim();
    const hyperconstructTransferText = String(options?.hyperconstructTransferText || '').trim();
    if (roleReadyText) {
      await this.appendPersistentStoryStatusMessage(roleReadyText);
      await this.waitStoryStatusInterval(statusDelayMs);
    }
    if (hyperconstructTransferText) {
      await this.appendPersistentStoryStatusMessage(hyperconstructTransferText);
      await this.waitStoryStatusInterval(statusDelayMs);
    }
    if (Number.isFinite(Number(height)) && Number(height) > 0) {
      await this.appendPersistentStoryStatusMessage(this.getStoryStatusText('blockTime', { height: Number(height) }, statusLocale));
      await this.waitStoryStatusInterval(statusDelayMs);
    }
    const connectionText =
      this.getStoryStatusText('linkingAgu', {}, statusLocale) || 'Connecting to the All Generative Universe System network…';
    await this.appendPersistentStoryStatusMessage(connectionText);
    this.setStoryLinkStatus(this.getStoryStatusText('linking', {}, statusLocale) || this.getStoryMenuText('linking'), connectionText, { waiting: true });
    await this.waitStoryStatusInterval(statusDelayMs);
    this.setStoryPersistenceUnlocked(true);
    await this.updateCurrentStoryRuntime(
      {
        status: 'waiting_agent',
        phase: 'boot',
        entryMode: 'new',
        roleName: String(roleContext?.roleName || this.state.currentStoryRoleName || ''),
        roleSlug: String(roleContext?.roleSlug || this.state.currentStoryRoleSlug || ''),
        currentAlpha: this.normalizeStoryAlphaValue(alphaState?.currentAlpha ?? this.state.currentAlpha),
        baseAlpha: this.normalizeStoryAlphaValue(alphaState?.baseAlpha ?? this.state.baseAlpha),
      },
      { allowCreate: true }
    );
    await this.startDestinyRun({
      memoryMode: 'new',
      condensedMemory: '',
      persistStartupStatus: true,
      skipStartupConnectionMessage: true,
      statusDelayMs,
      statusLocale,
    });

    const hasFreshChoices =
      (Array.isArray(this.state.currentStoryChoices) && this.state.currentStoryChoices.length > 0) ||
      (Array.isArray(this._currentStorySnapshot?.lastChoiceSet) && this._currentStorySnapshot.lastChoiceSet.length > 0) ||
      Boolean(this.state.currentStoryAwaitingChoice || this._currentStorySnapshot?.awaitingChoice);

    if (!hasFreshChoices) {
      this.setStoryLinkStatus(this.getStoryMenuText('uplinkSent'), this.getStoryMenuText('waitingFieldResponseLower'), { waiting: true });
    }
  };

  handleDestinyCommand = async modeArg => {
    const mode = this.getDestinyModeFromArg(modeArg);

    const roleContext = this.currentRoleContext || (await this.loadCurrentRoleForStory());
    if (!roleContext) {
      this.setStoryLinkStatus(this.getStoryMenuText('roleRequired'), this.getStoryMenuText('roleRequiredDetail'));
      return;
    }

    await this.ensureStoryAlphaState(roleContext);

    if (mode === 'menu') {
      this.appendStoryCommandMessage(this.buildDestinySettingsMenuMessage());
      this.setStoryLinkStatus(this.getStoryMenuText('linkIdle'), this.getStoryMenuText('chooseExplicitAction'));
      return;
    }

    if (mode === 'auto') {
      this.appendStoryCommandMessage(this.buildDestinySettingsMenuMessage());
      this.setStoryLinkStatus(this.getStoryMenuText('linkIdle'), this.getStoryMenuText('autoStartDisabled'));
      return;
    }

    if (mode === 'settings') {
      this.appendStoryCommandMessage(this.buildDestinySettingsMenuMessage());
      return;
    }

    if (mode === 'record') {
      this.appendStoryCommandMessage(this.buildCurrentStoryRecordMessage());
      return;
    }

    if (mode === 'reconnect') {
      await this.startFreshStoryRun();
      return;
    }

    if (mode === 'clear') {
      this.setStoryLinkStatus(this.getStoryMenuText('resettingStory'), this.getStoryMenuText('clearingCurrentSession'));
      await this.resetStoryStorageAndRestart();
      return;
    }

    const statusLocale = this.getStoryStatusLocale();
    const roleReadyText = this.getStoryStatusText('roleReadyTransfer', {
      role: roleContext.roleName || this.getStoryStatusText('thisRole', {}, statusLocale),
    }, statusLocale);
    const hyperconstructTransferText = this.getStoryStatusText('hyperconstructTransfer', {}, statusLocale);

    if (mode === 'continue') {
      try {
        this.setStoryLinkStatus(this.getStoryMenuText('linking'), this.getStoryMenuText('resumingCurrentStory'), { waiting: true });
        const height = await this.replyWithCurrentBlock({ silent: true });
        this._latestStoryBlockHeight = height;

        const storyState = this._currentStorySnapshot || (await this.readCurrentStoryFile());
        const existingMessages = this.mergeMessagesById(Array.isArray(storyState?.messages) ? storyState.messages : []);
        const existingChoices = await this.readCurrentChoicesFile();
        const hasStoredProgress =
          (await RNFS.exists(this.getStoryCurrentPath())) ||
          existingMessages.length > 0 ||
          (Array.isArray(existingChoices) && existingChoices.length > 0);

        if (!hasStoredProgress) {
          await this.startFreshStoryRun({ roleReadyText, hyperconstructTransferText, statusLocale });
          return;
        }

        const refreshedState = await this.refreshMessagesFromStorage();
        const hydratedChoices = Array.isArray(refreshedState?.currentStoryChoices) ? refreshedState.currentStoryChoices : [];
        const hasHydratedChoices = hydratedChoices.length > 0;

        const shouldResumePendingReply =
          !hasHydratedChoices &&
          (Boolean(storyState?.shouldResumeGeneration) || String(storyState?.status || '') === 'waiting_agent');

        if (shouldResumePendingReply) {
          await this.updateCurrentStoryRuntime({
            status: 'waiting_agent',
            phase: 'exploring',
            entryMode: 'continue',
            lastChoiceSet: [],
            awaitingChoice: false,
            shouldResumeGeneration: false,
          });

          await this.startDestinyRun({
            memoryMode: 'continue',
            condensedMemory: await this.buildStoryCondensedMemory(),
          });
          return;
        }

        await this.updateCurrentStoryRuntime({
          status: hasHydratedChoices ? 'waiting_user' : String(storyState?.status || 'exploring'),
          phase: String(storyState?.phase || 'exploring'),
          entryMode: 'continue',
          lastChoiceSet: hydratedChoices,
          awaitingChoice: hasHydratedChoices,
          shouldResumeGeneration: false,
        });

        this.setStoryLinkStatus(
          hasHydratedChoices ? this.getStoryMenuText('linkActive') : this.getStoryMenuText('linkWaiting'),
          '',
          { waiting: !hasHydratedChoices }
        );
        return;
      } catch (error) {
        console.warn('Failed to continue story', error);
        this.setStoryLinkStatus(this.getStoryMenuText('reconnectRequired'), String(error?.message || error || this.getStoryMenuText('continueFailed')));
        throw error;
      }
    }

    try {
      await this.startFreshStoryRun({ roleReadyText, hyperconstructTransferText, statusLocale });
    } catch (error) {
      console.warn('Failed to start story', error);
      this.setStoryLinkStatus(this.getStoryMenuText('reconnectRequired'), String(error?.message || error || this.getStoryMenuText('startFailed')));
      throw error;
    }
    return;
  };

  reportStoryContinueFailure = async error => {
    const errorMessage = String(error?.message || error || this.getStoryMenuText('continueFailed'));
    const failureText = this.getStoryMenuText('storyContinueFailed', { error: errorMessage });
    const failureMessage = this.buildMessage(failureText, 'agent');

    this._pendingChoiceSubmissionAt = 0;
    this._pendingChoiceUserMessageId = null;

    if (this._isMounted) {
      this.setState(
        prevState => {
          const nextCurrentStoryMessages = this.mergeMessagesById([
            ...(prevState.currentStoryMessages || []),
            this.normalizeCurrentStoryMessage(failureMessage),
          ].filter(Boolean));
          const allMessages = [...(prevState.allMessages || []), failureMessage];
          const base = Math.max(prevState.visibleCount, PAGE_SIZE);
          const visibleCount = Math.min(allMessages.length, base);

          return {
            allMessages,
            currentStoryMessages: nextCurrentStoryMessages,
            visibleCount,
            messages: allMessages.slice(-visibleCount),
            currentStorySessionId: prevState.currentStorySessionId || this.getStorySessionId(),
            currentStoryChoices: [],
            currentStoryLastChoiceSet: [],
            currentStoryAwaitingChoice: false,
          };
        },
        () => {
          this.persistCurrentStoryMessages(this.state.currentStoryMessages);
          this.syncStoryChoicesFromMessages(this.state.currentStoryMessages);
        },
      );
    }

    await this.updateCurrentStoryRuntime({
      status: 'error',
      phase: 'exploring',
      entryMode: 'continue',
      awaitingChoice: false,
      shouldResumeGeneration: false,
      lastChoiceSet: [],
    });

    this.setStoryLinkStatus(this.getStoryMenuText('reconnectRequired'), errorMessage);
  };

  runStoryContinueTurn = async ({ userMessage, submittedAt = null } = {}) => {
    const effectiveSubmittedAt =
      Number.isFinite(Number(submittedAt)) && Number(submittedAt) > 0
        ? Number(submittedAt)
        : Number(userMessage?.timestamp || Date.now());

    this._pendingChoiceSubmissionAt = effectiveSubmittedAt;
    this._pendingChoiceUserMessageId = userMessage?.id || null;

    await this.updateCurrentStoryRuntime({
      status: 'waiting_agent',
      phase: 'exploring',
      entryMode: 'continue',
      awaitingChoice: false,
      shouldResumeGeneration: true,
      lastChoiceSet: [],
      lastSubmittedChoiceAt: effectiveSubmittedAt,
      lastSubmittedChoiceUserMessageId: userMessage?.id || '',
    });

    try {
      this.setStoryLinkStatus(this.getStoryMenuText('linking'), this.getStoryMenuText('preparingContinueContext'), { waiting: true });
      const condensedMemory = await this.buildStoryCondensedMemory();
      this.setStoryLinkStatus(this.getStoryMenuText('linking'), this.getStoryMenuText('passingContinueTurn'), { waiting: true });
      await this.startDestinyRun({
        memoryMode: 'continue',
        condensedMemory,
        submittedAt: effectiveSubmittedAt,
      });
    } catch (error) {
      console.warn('Failed to continue story turn', error);
      await this.reportStoryContinueFailure(error);
      throw error;
    }
  };

  startDestinyRun = async options => {
    const memoryMode = options?.memoryMode || 'new';
    const submittedAt = Number.isFinite(Number(options?.submittedAt)) ? Number(options.submittedAt) : null;
    const roleLangCode = this.getActiveRoleLanguageCode();
    const currentStoryLang = this.getStoryLangCode();
    const resolvedLangCode = normalizeStoryLangCode(roleLangCode || currentStoryLang || 'en');

    await this.setStoryLangCode(resolvedLangCode);

    let llmConfig = this.currentLLMConfig || this.state.llmConfig;
    if (!hasUsableLLMConfig(llmConfig) && typeof this.loadLLMConfig === 'function') {
      llmConfig = await this.loadLLMConfig();
      this.currentLLMConfig = llmConfig;
      if (this._isMounted) {
        this.setState({ llmConfig });
      }
    }
    if (!hasUsableLLMConfig(llmConfig) || typeof this.replyFromLLM !== 'function') {
      this.setStoryLinkStatus(this.getStoryMenuText('modelRequired'), this.getStoryMenuText('loadLlmBeforeLinkStart'));
      this.appendStoryCommandMessage(this.getStoryMenuText('storyLoadedModelRequired'));
      return;
    }

    const cached = await this.readStoryBlockCache();
    const latestHeight = this._latestStoryBlockHeight || cached?.height || null;
    const roleContext = this.currentRoleContext || (await this.loadCurrentRoleForStory());
    const alphaState = roleContext ? await this.getStoryPromptAlphaState(roleContext, { updateRuntime: true }) : null;
    const promptAlpha = this.normalizeStoryAlphaValue(alphaState?.currentAlpha ?? this.state.currentAlpha);
    const roleName = String(roleContext?.roleName || this.state.currentStoryRoleName || '').trim();
    const alphaText = promptAlpha === null ? '' : `\n${buildAlphaPromptBlock(promptAlpha)}`;
    const params = this.props?.navigation?.state?.params || {};
    const agentId = params.shortCode || params.namespaceId || this.agentId;
    const storyAttributeText = buildStoryAttributePromptBlock({
      agentId,
      overrideCurrentBlock: latestHeight,
      alphaOverride: promptAlpha,
      normalizeAlphaOverride: this.normalizeStoryAlphaValue,
    });
    const storyFragmentImport = memoryMode !== 'continue' ? params.storyFragmentImport : null;
    const storyFragmentBlock = buildStoryFragmentSeedBlock(storyFragmentImport);
    const seedPrompt = `${buildDestinySeedPrompt({
      agentId,
      overrideCurrentBlock: latestHeight,
      alphaOverride: promptAlpha,
      normalizeAlphaOverride: this.normalizeStoryAlphaValue,
    })}${roleName ? `\nROLE_NAME = ${roleName}` : ''}${alphaText}\n\n${storyAttributeText}${storyFragmentBlock ? `\n\n${storyFragmentBlock}` : ''}\n`;
    if (storyFragmentBlock) {
      this.props.navigation?.setParams?.({ storyFragmentImport: null });
    }
    const lockedLanguage = getStoryLLMLanguageName(resolvedLangCode, normalizeStoryLangCode);
    const prompt = buildStoryAutostartHeader(lockedLanguage) + removeStoryLanguageHandshake(seedPrompt);
    const statusLocale = normalizeStoryLangCode(options?.statusLocale || resolvedLangCode || this.getStoryStatusLocale());
    const statusDelayMs = Number.isFinite(Number(options?.statusDelayMs)) ? Number(options.statusDelayMs) : 500;

    if (memoryMode !== 'continue') {
      if (!options?.skipStartupConnectionMessage) {
        const connectionText =
          this.getStoryStatusText('linkingAgu', {}, statusLocale) || 'Connecting to the All Generative Universe System network…';
        if (options?.persistStartupStatus) {
          await this.appendPersistentStoryStatusMessage(connectionText);
          await this.waitStoryStatusInterval(statusDelayMs);
        } else {
          this.appendStoryCommandMessage(connectionText);
        }
        this.setStoryLinkStatus(this.getStoryStatusText('linking', {}, statusLocale) || this.getStoryMenuText('linking'), connectionText, { waiting: true });
      }
    } else {
      this.setStoryLinkStatus(this.getStoryMenuText('linking'), this.getStoryMenuText('passingContinueTurn'), { waiting: true });
    }

    await this.replyFromLLM(prompt, null, {
      silentUser: true,
      useRecentHistory: memoryMode === 'continue',
      memoryMode,
      condensedMemory: String(options?.condensedMemory || ''),
    });

    if (this.isStoryScope) {
      const renderedStoryMessages = Array.isArray(this.state?.allMessages)
        ? this.state.allMessages.filter(
            message =>
              message?.sender &&
              !message?._isHistory &&
              !message?._localOnly &&
              message?._renderMode !== 'commands' &&
              message?.sender !== 'system',
          )
        : [];
      const mergedStoryMessages = this.mergeMessagesById([
        ...(Array.isArray(this.state?.currentStoryMessages) ? this.state.currentStoryMessages : []),
        ...renderedStoryMessages.map(this.normalizeCurrentStoryMessage).filter(Boolean),
      ]);
      await this.persistCurrentStoryMessages(mergedStoryMessages);
      const didRecoverMissingReply = await this.maybeAutoAdvanceStoryOnMissingReply({
        submittedAt,
        source: `destiny-${memoryMode}`,
      });
      if (didRecoverMissingReply) {
        return;
      }
      await this.reconcileStoryLinkStatusAfterAgentUpdate();
      await this.persistCurrentStoryMessages(this.state.currentStoryMessages);
    }
  };

  getStoryLanguageInstruction = () => buildStoryLanguageInstruction({
    code: this.getStoryLangCode(),
    isStoryScope: this.isStoryScope,
    normalizeStoryLangCode,
    getStoryLangLabel,
  });

  isInteractiveCommand = commandText => Boolean(String(commandText || '').trim());

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

    lines.forEach(rawLine => {
      const line = stripMarkdownWrap(rawLine);
      const prefixMatch = line.match(STORY_CHOICE_PREFIX_RE);
      if (prefixMatch) {
        const marker = (prefixMatch[1] || prefixMatch[2] || prefixMatch[3] || prefixMatch[4] || prefixMatch[5] || '').trim();
        const content = (prefixMatch[6] || '').trim();
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
      const trimmed = stripMarkdownWrap(chunk);
      const isDivider = /^\s*[\/|]\s*$/.test(chunk);
      if (!trimmed || isDivider) {
        segments.push({ type: 'text', text: chunk });
        return;
      }

      const prefixMatch = trimmed.match(STORY_CHOICE_PREFIX_RE);
      if (prefixMatch) {
        const marker = (prefixMatch[1] || prefixMatch[2] || prefixMatch[3] || prefixMatch[4] || prefixMatch[5] || '').trim();
        const content = (prefixMatch[6] || '').trim();
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

    return raw
      .split(/\r?\n/)
      .map(lineRaw => {
        const segments = this.parseStoryLineSegments(lineRaw);
        const normalizedSegments = segments.length > 0 ? segments : [{ type: 'text', text: lineRaw }];
        const hasChoice = normalizedSegments.some(segment => segment?.type === 'choice');

        if (hasChoice) {
          return {
            type: 'line',
            segments: normalizedSegments,
            rawLine: lineRaw,
          };
        }

        const mergedText = normalizedSegments
          .map(segment => String(segment?.text || ''))
          .join('')
          .trim();

        if (!mergedText) {
          return null;
        }

        if (/^(?:input|select|choose|reply)\s+\d+(?:\s*[-~to]\s*\d+)?/i.test(mergedText)) {
          return null;
        }

        return {
          type: 'line',
          segments: [{ type: 'text', text: mergedText }],
          rawLine: lineRaw,
        };
      })
      .filter(Boolean);
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

  settleStoryChoiceDockBeforeSending = async (delayMs = 80) => {
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, delayMs));
  };

  handleStoryLinkStartPressIn = () => {
    console.warn('Story Link Start press-in detected');
    this.setStoryLinkStatus(this.getStoryMenuText('linkTapDetected'), this.getStoryMenuText('linkTapHandoff'));
    if (this._isMounted) {
      this.setState({ storyLinkStartFeedbackActive: true });
    }
  };

  handleStoryLinkStartPress = async () => {
    console.warn('Story Link Start onPress fired');
    if (this._storyLinkStartInFlight) {
      return;
    }

    this._storyLinkStartInFlight = true;
    this.setStoryLinkStatus(this.getStoryMenuText('linkStarted'), this.getStoryMenuText('linkStartedRoute'));
    if (this._isMounted) {
      this.setState({ storyLinkStartFeedbackActive: true });
    }
    console.warn('Story Link Start pressed from disconnected dock, routing through /d new');

    try {
      await this.handleStoryChoicePress('/d new', this.getStoryMenuText('establishLink'), {
        source: 'link-start-button',
      });
    } catch (error) {
      console.warn('Story Link Start failed', error);
      this.setStoryLinkStatus(this.getStoryMenuText('linkFailed'), this.getStoryMenuText('unableOpenCommChannel'));
      throw error;
    } finally {
      this._storyLinkStartInFlight = false;
      if (this._isMounted) {
        this.setState({ storyLinkStartFeedbackActive: false });
      }
    }
  };

  handleStoryChoicePress = async (modelText, displayText, choiceMeta = null) => {
    const sendText = String(modelText || '').trim();
    const normalizedEndingChoice = sendText.toUpperCase();
    const endingChoices = ['SUMMARY', 'RECAP', 'CONTINUE', 'RESTART'];
    if (endingChoices.includes(normalizedEndingChoice)) {
      if (normalizedEndingChoice === 'SUMMARY' || normalizedEndingChoice === 'RECAP') {
        const endingMenu = [
          { key: 'ending-summary', send: 'SUMMARY', label: 'Summary' },
          { key: 'ending-recap', send: 'RECAP', label: 'Recap' },
          { key: 'ending-continue', send: 'CONTINUE', label: 'Continue' },
          { key: 'ending-restart', send: 'RESTART', label: this.getStoryMenuText('restartConnection') },
        ];
        await this.updateCurrentStoryRuntime({
          status: 'waiting_user',
          phase: 'ended',
          lastChoiceSet: endingMenu,
          awaitingChoice: true,
          shouldResumeGeneration: false,
        });
        if (this._isMounted) {
          this.setState({
            currentStoryChoices: endingMenu,
            currentStoryLastChoiceSet: endingMenu,
            currentStoryAwaitingChoice: true,
          });
        }
        this.setStoryLinkStatus(this.getStoryMenuText('linkActive'));
      } else if (normalizedEndingChoice === 'CONTINUE') {
        this.setStoryLinkStatus(this.getStoryMenuText('uplinkSent'), this.getStoryMenuText('continuingNextLoop'), { waiting: true });
      } else if (normalizedEndingChoice === 'RESTART') {
        this.setStoryLinkStatus(this.getStoryMenuText('resettingStory'), this.getStoryMenuText('restartingConnectionProgress'));
        await this.resetStoryStorageAndRestart();
        return;
      }

      await this.clearCurrentChoicesFile();
      await new Promise(resolve =>
        this.setState(
          {
            currentStoryChoices: [],
            currentStoryLastChoiceSet: [],
            currentStoryAwaitingChoice: false,
          },
          resolve,
        )
      );
      await this.settleStoryChoiceDockBeforeSending();
      await this.handleSend({
        modelText: normalizedEndingChoice,
        displayText: String(displayText || modelText || ''),
        choiceMeta,
      });
      return;
    }

    if (sendText === '/d new' || /^\/linkstart\s*$/i.test(sendText)) {
      const roleContext = this.currentRoleContext || (await this.loadCurrentRoleForStory());
      if (!roleContext) {
        this.setStoryLinkStatus(this.getStoryMenuText('roleRequired'), this.getStoryMenuText('roleRequiredDetail'));
        return;
      }
      await this.clearCurrentChoicesFile();
      await new Promise(resolve =>
        this.setState(
          { currentStoryChoices: [], currentStoryLastChoiceSet: [], currentStoryAwaitingChoice: false },
          resolve,
        )
      );
      await this.updateCurrentStoryRuntime({ lastChoiceSet: [], awaitingChoice: false, status: 'waiting_agent', phase: 'exploring' });
      this.setStoryLinkStatus(this.getStoryMenuText('uplinkSent'), this.getStoryMenuText('waitingFieldResponse'), { waiting: true });
      await this.handleDestinyCommand('new');
      return;
    }

    const isSyntheticFallback = Boolean(choiceMeta?.syntheticFallback);
    const visibleText = String(displayText || modelText || '').trim();
    const userMessage = this.buildMessage(visibleText, 'user');
    userMessage._modelText = sendText;
    userMessage._choiceMeta = choiceMeta || null;
    if (isSyntheticFallback) {
      userMessage._localOnly = true;
      userMessage._recordExcluded = true;
    }

    const submittedAt = Number(userMessage.timestamp || Date.now());

    await this.clearCurrentChoicesFile();
    this._pendingChoiceSubmissionAt = submittedAt;
    this._pendingChoiceUserMessageId = userMessage.id;

    await new Promise(resolve =>
      this.setState(
        {
          currentStoryChoices: [],
          currentStoryLastChoiceSet: [],
          currentStoryAwaitingChoice: false,
          currentStoryHasChoiceFile: false,
          lastSubmittedChoiceAt: submittedAt,
        },
        resolve,
      )
    );

    await this.updateCurrentStoryRuntime({
      lastChoiceSet: [],
      awaitingChoice: false,
      status: 'waiting_agent',
      phase: 'exploring',
      shouldResumeGeneration: true,
      lastSubmittedChoiceAt: submittedAt,
      lastSubmittedChoiceUserMessageId: userMessage.id,
      lastAutoFallbackReplyId: isSyntheticFallback ? String(choiceMeta?.fallbackReplyId || '') : '',
    });

    this.setStoryLinkStatus(this.getStoryMenuText('uplinkSent'), this.getStoryMenuText('waitingFieldResponse'), { waiting: true });
    await this.settleStoryChoiceDockBeforeSending();

    await this.applyAlphaDeltaForChoice({ visibleText, sendText, submittedAt });

    await this.handleSend({
      prebuiltUserMessage: userMessage,
      modelText: sendText,
      displayText: visibleText,
      choiceMeta,
    });
  };

  cleanStoryChoiceLabel = value =>
    String(value || '')
      .replace(/^\s*(?:\[\s*[A-Za-z0-9]{1,2}\s*\]|【\s*[A-Za-z0-9]{1,2}\s*】|\(\s*[A-Za-z0-9]{1,2}\s*\)|（\s*[A-Za-z0-9]{1,2}\s*）|[A-Za-z0-9]{1,2}\s*[).:：、．])\s*/, '')
      .trim();

  renderStoryChoiceDock = () => {
    const rawChoices = Array.isArray(this.state.currentStoryChoices) ? this.state.currentStoryChoices : [];
    const dockDisplayState = this.getStoryDockDisplayState();
    const isChoiceState = dockDisplayState === 'choices';
    const isDisconnectedState = dockDisplayState === 'start';
    const isWaitingSignalState = dockDisplayState === 'awaiting';
    const isRoleRequiredState = String(this.state.storyLinkStatus || '') === this.getStoryMenuText('roleRequired');
    const choices = isChoiceState ? rawChoices : [];
    const panelTitle = isRoleRequiredState ? this.getStoryMenuText('roleRequired') : isDisconnectedState ? this.getStoryMenuText('establishLink') : isWaitingSignalState ? this.getStoryMenuText('awaitingSignal') : this.getStoryMenuText('aguComm');
    const panelMode = isRoleRequiredState ? 'ROLE CHECK' : isDisconnectedState ? 'LINK START' : isWaitingSignalState ? 'SIGNAL WAIT' : 'CHOICE GRID';
    const isNextActionState = isWaitingSignalState || isChoiceState;
    const handleNextActionPress = async () => {
      if (rawChoices.length > 0) {
        const nextChoice = rawChoices[0] || {};
        const sendText = String(nextChoice.send || nextChoice.key || nextChoice.label || '').trim();
        const displayText = this.cleanStoryChoiceLabel(nextChoice.label || nextChoice.send || nextChoice.key || sendText);
        if (sendText) {
          await this.handleStoryChoicePress(sendText, displayText || sendText, {
            source: 'manual-next-action-choice',
            raw: nextChoice,
          });
          return;
        }
      }

      const storyMessages = this.mergeMessagesById(this.state.currentStoryMessages || []);
      const latestAgentReply = this.getLatestStoryAgentReplyIgnoringSubmission(storyMessages);
      const repairedChoices = latestAgentReply
        ? await this.ensureStoryOptionsFromModelReply(latestAgentReply, storyMessages, { source: 'manual-next-action-repair' })
        : [];
      if (repairedChoices.length > 0) {
        return;
      }
      this.setStoryLinkStatus(this.getStoryMenuText('linkWaiting'), this.getStoryMenuText('awaitingSignal'), { waiting: true });
    };
    const showLinkStartFeedback = isDisconnectedState && (this.state.storyLinkStartFeedbackActive || this._storyLinkStartInFlight);
    const light1Color = isDisconnectedState ? '#596172' : isWaitingSignalState ? '#ffd84d' : '#6dff97';
    const light2Color = isDisconnectedState ? '#596172' : isWaitingSignalState ? '#ffd84d' : '#6dff97';
    const light3Color = isDisconnectedState ? '#596172' : isWaitingSignalState ? '#ffd84d' : '#6dff97';

    return (
      <View style={styles.storyChoiceDock}>
        <View style={styles.storyChoicePanelFrame}>
          <View style={styles.storyChoicePanelHeader}>
            <View style={styles.storyChoicePanelHeaderTextBlock}>
              <Text style={styles.storyChoicePanelLabel}>{panelTitle}</Text>
            </View>
            <View style={styles.storyChoicePanelHeaderCenter}>
              <View style={styles.storyChoicePanelLightsCentered}>
                <View style={[styles.storyChoicePanelLight, { backgroundColor: light1Color }]} />
                <View style={[styles.storyChoicePanelLight, { backgroundColor: light2Color }]} />
                <View style={[styles.storyChoicePanelLight, { backgroundColor: light3Color }]} />
              </View>
            </View>
            {isNextActionState ? (
              <TouchableOpacity activeOpacity={0.85} onPress={handleNextActionPress}>
                <Text style={styles.storyChoicePanelMode}>NEXT ACTION</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.storyChoicePanelMode}>{panelMode}</Text>
            )}
          </View>
          <View style={styles.storyChoicePanelScreen}>
            {isDisconnectedState ? (
              <TouchableOpacity
                style={[styles.storyChoiceIdleCard, showLinkStartFeedback && styles.storyChoiceIdleCardPressed]}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                onPressIn={this.handleStoryLinkStartPressIn}
                onPress={this.handleStoryLinkStartPress}
              >
                <Text style={[styles.storyChoiceIdleText, showLinkStartFeedback && styles.storyChoiceIdleTextPressed]}>
                  {isRoleRequiredState ? this.getStoryMenuText('roleRequiredDetail') : showLinkStartFeedback ? this.getStoryMenuText('linkStartDetected') : this.getStoryMenuText('establishLink')}
                </Text>
              </TouchableOpacity>
            ) : isWaitingSignalState ? (
              <View style={styles.storyChoiceIdleCard}>
                <Text style={styles.storyChoiceIdleText}>{this.getStoryMenuText('awaitingSignal')}</Text>
              </View>
            ) : (
              choices.map((choice, index) => {
                const cleanLabel = this.cleanStoryChoiceLabel(choice.label || choice.send);
                const isIdleButton = choice?.variant === 'idle';
                return (
                  <TouchableOpacity
                    key={`${choice.key || choice.send || 'choice'}-${index}`}
                    style={[styles.storyChoiceButton, isIdleButton && styles.storyChoiceButtonIdle]}
                    activeOpacity={0.85}
                    onPress={() => this.handleStoryChoicePress(choice.send, cleanLabel, { source: 'dock', raw: choice.label })}
                  >
                    <Text style={[styles.storyChoiceButtonText, isIdleButton && styles.storyChoiceButtonTextIdle]}>{cleanLabel}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </View>
    );
  };

  handleMessageLongPress = messageText => {
    if (!messageText) {
      return;
    }
    Clipboard.setString(messageText);
    showStatus((loc?.general && loc.general.copiedToClipboard) || this.getStoryMenuText('copiedToClipboard'), 2000);
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

  hasOlderStoryRecordsForRoleViewer = () => {
    const allMessages = Array.isArray(this.state.allMessages) ? this.state.allMessages : [];
    return allMessages.length > PAGE_SIZE;
  };

  openRoleStoryReaderAtOlderPage = async () => {
    const navigation = this.props.navigation;
    const params = navigation?.state?.params || {};
    if (!navigation || typeof navigation.push !== 'function') return;
    await this.persistLastSpaceShortcut('role');
    navigation.push('AgentRole', {
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
      autoCommand: '/role story view older',
      roleEntrySource: 'story-older-records-button',
      suppressAutoLinkStart: true,
    });
  };

  renderStoryOlderRoleViewerButton = () => {
    if (!this.hasOlderStoryRecordsForRoleViewer()) return null;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.storyOpenRoleStoryButton}
        onPress={this.openRoleStoryReaderAtOlderPage}
      >
        <Text style={styles.storyOpenRoleStoryButtonText}>{this.getStoryMenuText('openOlderStoryInRole')}</Text>
      </TouchableOpacity>
    );
  };

  loadMoreHistory = async () => {
    if (this.loadingMore) {
      return;
    }

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
    if (!this.isStoryScope && contentOffset?.y <= 20) {
      this.loadMoreHistory();
    }
    const paddingToBottom = 80;
    const layoutHeight = layoutMeasurement?.height || 0;
    const contentHeight = contentSize?.height || 0;
    const offsetY = contentOffset?.y || 0;
    this.isNearBottom = layoutHeight + offsetY >= contentHeight - paddingToBottom;
  };

  scheduleBottomFollow = () => {
    if (Array.isArray(this.pendingScrollBottomTimeouts)) {
      this.pendingScrollBottomTimeouts.forEach(timer => clearTimeout(timer));
      this.pendingScrollBottomTimeouts = [];
    }
    const run = () => this.scrollToBottomOffset(false);
    requestAnimationFrame(() => run());
    [80, 180].forEach(delay => {
      const timer = setTimeout(() => run(), delay);
      this.pendingScrollBottomTimeouts.push(timer);
    });
  };

  scrollToBottomOffset = (animated = false) => {
    if (!this.listRef) {
      return;
    }

    if (typeof this.listRef.scrollToEnd === 'function') {
      try {
        this.listRef.scrollToEnd({ animated });
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
      console.warn('Failed to load user avatar for agentstory', error);
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
      console.warn('Failed to load agentstory local avatar', error);
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
    const rawText = showDigest ? item?.digest || item?.summary || item?.text || '' : item?.text || '';
    const latestSubmittedChoiceAt = this.getLatestStoryChoiceSubmissionAt();
    const forceCommandRender = item?._renderMode === 'commands';
    const shouldSuppressChoiceText = this.isStoryScope && !isUser && !isStoryDigest && !forceCommandRender;
    const text = shouldSuppressChoiceText ? this.stripStoryChoiceLines(rawText) : rawText;
    if (this.isStoryScope && !isUser && !isStoryDigest && !forceCommandRender && !String(text || '').trim()) {
      return null;
    }
    const hasCopyLink = Boolean(item.copyText && item.linkLabel) && !isStoryDigest;
    const commandSegments = this.getCommandSegments(text);
    const hasCommand = Array.isArray(commandSegments) && commandSegments.some(segment => segment.isCommand || segment.commandText);
    const inlineLines =
      this.isStoryScope && !forceCommandRender && !isUser && !isStoryDigest && !hasCommand ? this.buildStoryInlineLines(text) : null;
    const hasCommandTokens = commandSegments.some(segment => segment.isCommand);
    const messageTextStyle = [styles.messageText, isUser ? styles.userText : styles.agentText];
    const commandTextStyle = isUser ? styles.commandTextUser : styles.commandText;
    const isSubmittedChoiceEcho =
      this.isStoryScope &&
      isUser &&
      item?._choiceMeta &&
      Number(item?.timestamp || item?.t || 0) <= latestSubmittedChoiceAt &&
      /UPLINK SENT/i.test(String(this.state.storyLinkStatus || ''));
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
              <Text suppressHighlighting={isSubmittedChoiceEcho} style={messageTextStyle}>
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
              accessibilityLabel="Open user avatar settings"
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
              ListHeaderComponent={this.renderStoryOlderRoleViewerButton}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>{this.getStoryMenuText('commTerminalPreparing')}</Text>
                </View>
              )}
              onContentSizeChange={this.handleContentSizeChange}
              onLayout={() => {
                if (!this.didInitialScroll && this.state.messages.length > 0) {
                  this.forceScrollToBottomOnce = true;
                  this.didInitialScroll = true;
                  requestAnimationFrame(() => this.scrollToBottomOffset(false));
                }
              }}
              onScroll={this.handleScroll}
              scrollEventThrottle={16}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
          {this.renderStoryChoiceDock()}
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
  headerCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterWrapAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  headerCommsBadge: {
    width: '99%',
    minHeight: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#e9eef5',
    shadowColor: 'transparent',
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  headerCommsBadgeIdle: {
    borderColor: '#cfd6e4',
    backgroundColor: '#e9eef5',
  },
  headerCommsBadgeActive: {
    borderColor: '#cfd6e4',
    backgroundColor: '#e9eef5',
  },
  headerCenterText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  headerToolbarRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  headerToolbarPill: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: '#f7faff',
  },
  headerToolbarPillIdle: {
    borderColor: '#cfd8ea',
  },
  headerToolbarPillActive: {
    borderColor: '#7ed69a',
    backgroundColor: '#e9eef5',
  },
  headerToolbarButtonText: {
    fontSize: 12,
    fontWeight: '700',
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
  storyOpenRoleStoryButton: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2f4d8f',
    backgroundColor: '#101a2d',
  },
  storyOpenRoleStoryButtonText: {
    color: '#9fd8ff',
    fontSize: 12,
    fontWeight: '700',
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
  storyChoiceDock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#1b2336',
    backgroundColor: '#0a0f18',
    minHeight: 118,
  },
  storyChoicePanelFrame: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d3a55',
    backgroundColor: '#0d1420',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  storyChoicePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storyChoicePanelHeaderTextBlock: {
    flex: 1,
    alignItems: 'flex-start',
    marginRight: 8,
  },
  storyChoicePanelHeaderCenter: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  storyChoicePanelLightsCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  storyChoicePanelLight: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  storyChoicePanelLabel: {
    color: '#9fc2ff',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 1.1,
    fontWeight: '700',
    textShadowColor: 'rgba(118, 191, 255, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  storyChoicePanelSubstatus: {
    marginTop: 2,
    color: '#5f789c',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
  },
  storyChoicePanelMode: {
    color: '#7fe7ff',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.1,
    fontWeight: '700',
    textShadowColor: 'rgba(102, 255, 245, 0.28)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  storyChoicePanelScreen: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#182233',
    backgroundColor: '#0a111b',
    padding: 10,
  },
  storyChoiceButton: {
    borderRadius: 12,
    backgroundColor: '#111b2b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#29476f',
  },
  storyChoiceButtonIdle: {
    backgroundColor: '#2c3442',
    borderColor: '#5d6472',
  },
  storyChoiceButtonText: {
    color: '#d7f0ff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  storyChoiceButtonTextIdle: {
    color: '#e7edf7',
  },
  storyChoiceWaitingCard: {
    borderRadius: 12,
    backgroundColor: '#0f1a1d',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#214a44',
  },
  storyChoiceWaitingText: {
    color: '#78d7c4',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  storyChoiceIdleCard: {
    borderRadius: 12,
    backgroundColor: '#2c3442',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4c586f',
  },
  storyChoiceIdleText: {
    color: '#eef3fb',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  storyChoiceIdleCardPressed: {
    backgroundColor: '#1d5f58',
    borderColor: '#78d7c4',
  },
  storyChoiceIdleTextPressed: {
    color: '#d9fff5',
  },
});
