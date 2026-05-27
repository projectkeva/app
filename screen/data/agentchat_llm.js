// app/screen/data/agentchat_llm.js
// Attach LLM provider registry + /a command + LLM chat calls onto AgentChat instance.

import RNFS from 'react-native-fs';
import TcpSocketModule from 'react-native-tcp-socket';
import { getXkevaApiUrl, getXkevaApiUrls, XKEVA_APP_TOKEN } from '../../class/xkeva-api';
import { decodeBase64, getNamespaceScriptHash } from '../../class/keva-ops';

let lazyBitcoin = null;
let lazyBlueElectrum = null;
let lazyBlueApp = null;

function getBitcoin() {
  if (!lazyBitcoin) lazyBitcoin = require('bitcoinjs-lib');
  return lazyBitcoin;
}

function getBlueElectrum() {
  if (!lazyBlueElectrum) {
    const mod = require('../../BlueElectrum');
    lazyBlueElectrum = mod.default || mod;
  }
  return lazyBlueElectrum;
}

function getBlueApp() {
  if (!lazyBlueApp) lazyBlueApp = require('../../BlueApp');
  return lazyBlueApp;
}

const TcpSocket = TcpSocketModule.default || TcpSocketModule;
const XKEVA_MIN_CHAT_REQUEST_INTERVAL_MS = 1000;
const XKEVA_SATOSHI_CREATED_KEY = 'Agent Created';
const XKEVA_DEVICE_ID_PATH = `${RNFS.DocumentDirectoryPath}/xkeva_device_id.txt`;
let lastXkevaChatRequestAt = 0;
let xkevaChatRequestQueue = Promise.resolve();
let xkevaDeviceIdPromise = null;

function isValidXkevaDeviceId(value) {
  return /^[A-Za-z0-9_.:-]{8,160}$/.test(String(value || '').trim());
}

function makeXkevaDeviceId() {
  const seed = `${Date.now()}:${Math.random()}:${Math.random()}:${RNFS.DocumentDirectoryPath || ''}`;
  let digest = '';
  try {
    digest = getBitcoin().crypto.sha256(Buffer.from(seed, 'utf8')).toString('hex');
  } catch (_) {
    digest = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }
  return `xkeva-${String(digest).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)}`;
}

async function getXkevaDeviceId() {
  if (!xkevaDeviceIdPromise) {
    xkevaDeviceIdPromise = (async () => {
      try {
        const exists = await RNFS.exists(XKEVA_DEVICE_ID_PATH);
        if (exists) {
          const saved = String(await RNFS.readFile(XKEVA_DEVICE_ID_PATH, 'utf8') || '').trim();
          if (isValidXkevaDeviceId(saved)) return saved;
        }
      } catch (_) {}
      const next = makeXkevaDeviceId();
      try {
        await RNFS.writeFile(XKEVA_DEVICE_ID_PATH, next, 'utf8');
      } catch (_) {}
      return next;
    })();
  }
  return xkevaDeviceIdPromise;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForXkevaChatRequestTurn(intervalMs = XKEVA_MIN_CHAT_REQUEST_INTERVAL_MS) {
  const minIntervalMs = Math.max(0, Number(intervalMs || 0));
  const turn = xkevaChatRequestQueue.catch(() => {}).then(async () => {
    const elapsed = Date.now() - lastXkevaChatRequestAt;
    if (elapsed < minIntervalMs) {
      await wait(minIntervalMs - elapsed);
    }
    lastXkevaChatRequestAt = Date.now();
  });
  xkevaChatRequestQueue = turn;
  await turn;
}

function derEncodeLength(length) {
  if (length < 0x80) return Buffer.from([length]);
  const bytes = [];
  let n = length;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n = Math.floor(n / 256);
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function derEncodeInteger(bytes) {
  let value = Buffer.from(bytes || []);
  while (value.length > 1 && value[0] === 0 && (value[1] & 0x80) === 0) {
    value = value.slice(1);
  }
  if (value.length === 0) value = Buffer.from([0]);
  if (value[0] & 0x80) value = Buffer.concat([Buffer.from([0]), value]);
  return Buffer.concat([Buffer.from([0x02]), derEncodeLength(value.length), value]);
}

function derEncodeEcdsaSignature(compactSignature) {
  const sig = Buffer.from(compactSignature || []);
  if (sig.length !== 64) throw new Error('Invalid compact signature length');
  const body = Buffer.concat([derEncodeInteger(sig.slice(0, 32)), derEncodeInteger(sig.slice(32, 64))]);
  return Buffer.concat([Buffer.from([0x30]), derEncodeLength(body.length), body]);
}

function buildXkevaWalletAuthMessage(data = {}) {
  return [
    'xKEVA wallet auth v1',
    `address=${String(data.address || '').trim()}`,
    `namespace=${String(data.namespace || '').trim()}`,
    `agent_created_txid=${String(data.txid || '').trim()}`,
    `agent_created_height=${Number(data.createdHeight || 0) || 0}`,
    `current_height=${Number(data.currentHeight || 0) || 0}`,
    `device_id=${String(data.deviceId || '').trim()}`,
    `nonce=${String(data.nonce || '').trim()}`,
  ].join('\n');
}

function getWalletWifForAddress(wallet, address) {
  if (!wallet) return '';
  const targetAddress = String(address || '').trim();
  try {
    if (targetAddress && typeof wallet._getWifForAddress === 'function') {
      const wif = wallet._getWifForAddress(targetAddress);
      if (wif) return wif;
    }
  } catch (_) {}
  try {
    const secret = typeof wallet.getSecret === 'function' ? wallet.getSecret() : wallet.secret;
    if (secret) {
      getBitcoin().ECPair.fromWIF(String(secret));
      return String(secret);
    }
  } catch (_) {}
  return '';
}

function addressesFromPublicKey(pubkey) {
  const key = Buffer.from(pubkey || []);
  const addresses = [];
  try {
    const p2pkh = getBitcoin().payments.p2pkh({ pubkey: key }).address;
    if (p2pkh) addresses.push(p2pkh);
  } catch (_) {}
  try {
    const p2wpkh = getBitcoin().payments.p2wpkh({ pubkey: key });
    const p2sh = getBitcoin().payments.p2sh({ redeem: p2wpkh }).address;
    if (p2sh) addresses.push(p2sh);
  } catch (_) {}
  return addresses;
}

function trimText(value) {
  return String(value || '').trim();
}

function decodeKvKey(value) {
  if (!value) return '';
  try {
    const decoded = decodeBase64(value);
    return typeof decoded === 'string' ? decoded : String(value || '');
  } catch (_) {
    return String(value || '');
  }
}

function normalizeKvTime(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 100000000000 ? Math.floor(n / 1000) : Math.floor(n);
}

function getKvTxid(kv) {
  return trimText(kv?.tx_hash || kv?.txid || kv?.tx || kv?.hash || '');
}

function getNamespaceCreateTxid(info) {
  return trimText(
    info?.namespaceCreateTxid
    || info?.namespace_create_txid
    || info?.serverNamespaceMeta?.namespace_create_txid
    || info?.serverNamespaceMeta?.namespaceCreateTxid
    || info?.serverNamespaceMeta?.namespace_create_tx
    || info?.serverNamespaceMeta?.txid
    || info?.serverNamespaceMeta?.txId
    || '',
  );
}

function getNamespaceCreateHeight(info) {
  return Number(
    info?.namespaceCreateHeight
    || info?.namespace_create_height
    || info?.serverNamespaceMeta?.namespace_create_height
    || info?.serverNamespaceMeta?.namespaceCreateHeight
    || 0,
  ) || 0;
}

function getNamespaceCreateTime(info) {
  return normalizeKvTime(
    info?.namespaceCreateTxTime
    || info?.namespace_create_tx_time
    || info?.serverNamespaceMeta?.namespace_create_tx_time
    || info?.serverNamespaceMeta?.namespaceCreateTxTime
    || info?.serverNamespaceMeta?.created_at_unix
    || info?.serverNamespaceMeta?.createdAtUnix
    || 0,
  );
}

function findSatoshiNamespaceInfo(namespacesInput) {
  const namespaces = namespacesInput?.namespaces || namespacesInput || {};
  const list = Array.isArray(namespaces) ? namespaces : Object.values(namespaces);
  const satoshiList = list.filter(item => {
    const name = trimText(item?.displayName || item?.name || '').toLowerCase();
    return name === 'satoshi';
  });
  if (satoshiList.length <= 1) return satoshiList[0] || null;
  return satoshiList.slice().sort((a, b) => {
    const aShort = Number(String(a?.shortCode || '').replace(/\D/g, '')) || Number.MAX_SAFE_INTEGER;
    const bShort = Number(String(b?.shortCode || '').replace(/\D/g, '')) || Number.MAX_SAFE_INTEGER;
    return aShort - bShort;
  })[0];
}


function buildXkevaFreeWindowInactiveMessage(errorJson) {
  const err = errorJson?.error || errorJson || {};
  const message = String(err?.message || '').trim();
  return message;
}


export function attachAgentChatLLM(agent, deps) {
  if (!agent) return;

  const {
    loc,
    LLM_DIR,
    LLM_BUILTIN_PATH,
    LLM_CUSTOM_PATH,
    LLM_ACTIVE_PATH,
    LLM_LAST_USED_PATH,
    LLM_PROVIDERS,
    DEFAULT_AUTH_HEADER,
    LLM_HISTORY_LIMIT,
    getTodayDateString,
  } = deps || {};

  // ---- file helpers ----
  agent.readJsonFile =
    agent.readJsonFile ||
    (async path => {
      try {
        const exists = await RNFS.exists(path);
        if (!exists) return { __missing: true, __parseError: false, value: null };

        const raw = await RNFS.readFile(path, 'utf8');
        try {
          return { __missing: false, __parseError: false, value: JSON.parse(raw) };
        } catch (parseError) {
          const backup = `${path}.broken`;
          try {
            await RNFS.writeFile(backup, raw || '', 'utf8');
          } catch (_) {}
          console.warn('JSON parse failed; kept original file; backup created', { path, backup, parseError });
          return { __missing: false, __parseError: true, value: null };
        }
      } catch (e) {
        return { __missing: false, __parseError: true, value: null };
      }
    });

  agent.writeJsonFile =
    agent.writeJsonFile ||
    (async (path, data) => {
      const tmpPath = `${path}.tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const json = JSON.stringify(data, null, 2);
      try {
        await RNFS.writeFile(tmpPath, json, 'utf8');
        const exists = await RNFS.exists(path);
        if (exists) {
          try {
            await RNFS.unlink(path);
          } catch (_) {}
        }
        await RNFS.moveFile(tmpPath, path);
        return true;
      } catch (error) {
        console.warn('writeJsonFile failed', { path, error });
        try {
          await RNFS.unlink(tmpPath);
        } catch (_) {}
        return false;
      }
    });

  agent.readActiveProvider =
    agent.readActiveProvider ||
    (async () => {
      const r = await agent.readJsonFile(LLM_ACTIVE_PATH);
      return r && r.value ? r.value : null;
    });

  agent.writeActiveProvider =
    agent.writeActiveProvider ||
    (async active => agent.writeJsonFile(LLM_ACTIVE_PATH, active || {}));

  agent.clearActiveProvider =
    agent.clearActiveProvider ||
    (async () => {
      try {
        await RNFS.unlink(LLM_ACTIVE_PATH);
      } catch (_) {}
    });

  agent.readBuiltinRegistry =
    agent.readBuiltinRegistry ||
    (async () => {
      const r = await agent.readJsonFile(LLM_BUILTIN_PATH);
      const obj = r.value;
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    });

  agent.writeBuiltinRegistry =
    agent.writeBuiltinRegistry ||
    (async registry => agent.writeJsonFile(LLM_BUILTIN_PATH, registry || {}));

  agent.readCustomRegistry =
    agent.readCustomRegistry ||
    (async () => {
      const r = await agent.readJsonFile(LLM_CUSTOM_PATH);
      const obj = r.value;
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    });

  agent.writeCustomRegistry =
    agent.writeCustomRegistry ||
    (async registry => agent.writeJsonFile(LLM_CUSTOM_PATH, registry || {}));

  agent.loadMergedRegistry =
    agent.loadMergedRegistry ||
    (async () => {
      const [builtin, custom] = await Promise.all([agent.readBuiltinRegistry(), agent.readCustomRegistry()]);
      return { ...(builtin || {}), ...(custom || {}) };
    });

  agent.isBuiltinProvider = agent.isBuiltinProvider || (name => !!LLM_PROVIDERS[String(name || '').toLowerCase()]);

  agent.loadLLMConfig =
    agent.loadLLMConfig ||
    (async () => {
      try {
        const active = await agent.readActiveProvider();
        const providerName = String(active?.name || '').toLowerCase();
        if (!providerName) return null;

        const merged = await agent.loadMergedRegistry();
        const override = merged?.[providerName] || {};
        const builtinDef = LLM_PROVIDERS[providerName] || null;
        const baseUrl = String(providerName === 'xkeva' ? await getXkevaApiUrl() : (override.baseUrl || builtinDef?.baseUrl || ''))
          .trim()
          .replace(/\/$/, '');
        if (!baseUrl) return null;

        return {
          provider: providerName,
          baseUrl,
          apiKey: override.apiKey || '',
          model: builtinDef?.noKeyRequired === true ? (builtinDef?.defaultModel || providerName) : (override.model || (builtinDef?.defaultModel || 'default')),
          updatedAt: override.updatedAt || Date.now(),
        };
      } catch (error) {
        console.warn('Failed to load llm config', error);
        return null;
      }
    });

  agent.saveLLMConfig =
    agent.saveLLMConfig ||
    (async config => {
      agent.currentLLMConfig = config;
      const name = String(config.provider || '').toLowerCase();
      const entry = {
        baseUrl: String(config.baseUrl || '').trim().replace(/\/$/, ''),
        apiKey: config.apiKey || '',
        model: config.model || 'default',
        updatedAt: Date.now(),
      };

      if (agent.isBuiltinProvider(name)) {
        const reg = await agent.readBuiltinRegistry();
        reg[name] = { ...(reg[name] || {}), ...entry };
        await agent.writeBuiltinRegistry(reg);
      } else {
        const reg = await agent.readCustomRegistry();
        reg[name] = { ...(reg[name] || {}), ...entry };
        await agent.writeCustomRegistry(reg);
      }
    });

  agent.clearLLMConfig =
    agent.clearLLMConfig ||
    (async () => {
      agent.setState({ llmConfig: null });
      agent.currentLLMConfig = null;
    });

  agent.fetchOpenAICompatModels =
    agent.fetchOpenAICompatModels ||
    (async (baseUrl, apiKey, authHeaderFn) => {
      const root = String(baseUrl || '').replace(/\/$/, '');
      if (!root) return [];
      const headers = {
        'Content-Type': 'application/json',
        ...(authHeaderFn
          ? authHeaderFn(apiKey)
          : apiKey
            ? { Authorization: `Bearer ${apiKey}` }
            : {}),
      };
      try {
        const resp = await fetch(`${root}/models`, { method: 'GET', headers });
        const json = await resp.json().catch(() => ({}));
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : [];
        const models = [];
        const seen = new Set();
        list.forEach(entry => {
          const id = typeof entry === 'string' ? entry : entry?.id;
          if (!id || seen.has(id)) return;
          seen.add(id);
          models.push(id);
        });

        const isOpenAI = /(^|\.)openai\.com\/?/i.test(root);
        const openAINonChatPattern = /^(text-embedding-|tts-|whisper-|dall-e-|omni-moderation|babbage-|davinci-)/i;
        const chatModels = isOpenAI ? models.filter(id => !openAINonChatPattern.test(id)) : models;
        const rankModel = id => {
          const name = String(id || '').toLowerCase();
          if (/^gpt-5\.5/.test(name)) return 0;
          if (/^gpt-5\.4/.test(name)) return 1;
          if (/^gpt-5\.3/.test(name)) return 2;
          if (/^gpt-5\.2/.test(name)) return 3;
          if (/^gpt-5\.1/.test(name)) return 4;
          if (/^gpt-5/.test(name)) return 5;
          if (/^gpt-4/.test(name)) return 10;
          if (/^o\d|^o[134]|^chatgpt/.test(name)) return 20;
          return 50;
        };
        return chatModels
          .sort((a, b) => rankModel(a) - rankModel(b) || String(a).localeCompare(String(b)))
          .slice(0, 80);
      } catch (error) {
        console.warn('Failed to fetch openai compatible models', error);
        return [];
      }
    });

  agent.resolveProviderDef =
    agent.resolveProviderDef ||
    (async name => {
      const normalized = String(name || '').toLowerCase();
      if (!normalized) return null;

      const builtinReg = await agent.readBuiltinRegistry();
      const customReg = await agent.readCustomRegistry();
      const entryBuiltin = builtinReg?.[normalized];
      const entryCustom = customReg?.[normalized];

      if (LLM_PROVIDERS[normalized]) {
        const dynamicXkevaBaseUrl = normalized === 'xkeva' ? await getXkevaApiUrl() : '';
        const baseUrlOverride = normalized === 'xkeva' ? '' : (entryBuiltin?.baseUrl ? String(entryBuiltin.baseUrl).trim().replace(/\/$/, '') : '');
        return {
          name: normalized,
          def: {
            ...LLM_PROVIDERS[normalized],
            baseUrl: dynamicXkevaBaseUrl || baseUrlOverride || LLM_PROVIDERS[normalized].baseUrl,
          },
          source: baseUrlOverride ? 'builtin_override' : 'builtin',
        };
      }

      if (entryCustom && entryCustom.baseUrl) {
        return {
          name: normalized,
          def: {
            kind: 'openai_compat',
            baseUrl: entryCustom.baseUrl,
            defaultModel: 'default',
            authHeader: DEFAULT_AUTH_HEADER,
          },
          source: 'custom',
        };
      }

      return null;
    });

  agent.applyProviderConfig =
    agent.applyProviderConfig ||
    (async ({
      providerName,
      providerDef,
      registryEntry,
      llmConfig,
      baseUrlOverride,
      apiKeyOverride,
      modelOverride,
      startup = false,
    }) => {
      const baseUrl = String(
        providerName === 'xkeva'
          ? await getXkevaApiUrl()
          : (baseUrlOverride || registryEntry?.baseUrl || providerDef?.baseUrl || llmConfig?.baseUrl || ''),
      )
        .trim()
        .replace(/\/$/, '');
      const providerUsesServerKey = providerDef?.noKeyRequired === true;
      const apiKey = providerUsesServerKey
        ? (apiKeyOverride || registryEntry?.apiKey || '')
        : (
          apiKeyOverride ||
          registryEntry?.apiKey ||
          (llmConfig?.provider === providerName ? llmConfig?.apiKey : '') ||
          ''
        );
      if (!baseUrl) throw new Error('Missing baseUrl');

      const defaultModel = String(providerDef?.defaultModel || '').trim();
      const isFixedModelProvider = providerDef?.fixedModel === true || providerDef?.skipModelFetch === true;
      const models = isFixedModelProvider
        ? [defaultModel || 'default']
        : await agent.fetchOpenAICompatModels(baseUrl, apiKey, providerDef?.authHeader);
      if (!isFixedModelProvider && models.length === 0) {
        if (!apiKey) throw new Error('Missing api key');
        throw new Error('Failed to load models');
      }

      const savedModel = llmConfig && llmConfig.provider === providerName ? String(llmConfig.model || '').trim() : '';
      const selectedModel = isFixedModelProvider
        ? (defaultModel || 'default')
        : (
          modelOverride ||
          (savedModel && models.includes(savedModel) ? savedModel : '') ||
          (defaultModel && models.includes(defaultModel) ? defaultModel : '') ||
          models[0] ||
          defaultModel ||
          'default'
        );

      const next = { provider: providerName, baseUrl, apiKey, model: selectedModel, updatedAt: Date.now() };
      agent.setState({ llmConfig: next });
      await agent.saveLLMConfig(next);
      await agent.writeActiveProvider({ name: providerName, updatedAt: Date.now() });
      await agent.writeJsonFile(LLM_LAST_USED_PATH, {
        provider: String(providerName || '').trim().toLowerCase(),
        baseUrl: String(baseUrl || providerDef?.baseUrl || '').trim().replace(/\/$/, ''),
        apiKey: String(apiKey || '').trim(),
        model: String(selectedModel || providerDef?.defaultModel || 'default').trim(),
        updatedAt: Date.now(),
      });

      agent.currentLLMConfig = next;

      const modelDisplay = String(selectedModel || providerDef?.defaultModel || providerName || 'default').trim();
      const roleModelLabel = typeof agent.getRoleUiText === 'function'
        ? (agent.getRoleUiText('model') || 'Model')
        : 'Model';
      const modelEntryLabel = `[[/rolemodel|${roleModelLabel}]]  ${modelDisplay}`;
      const hello = startup
        ? modelEntryLabel
        : `${roleModelLabel}  ${modelDisplay}`;

      if (startup) {
        const suppressStartupModelNotice = agent?._suppressSystemMessages === true
          || (typeof agent?.isPureChatMode === 'function' && agent.isPureChatMode());
        if (!agent?.isStoryScope && !suppressStartupModelNotice) {
          agent.replyFromAgent(hello);
        }
      } else if (isFixedModelProvider) {
        agent.replyFromAgent(`${hello}\nEndpoint: ${baseUrl}`);
      } else {
        const modelLines = models.map(modelId => `[[/a model ${modelId}|${modelId}]]`);
        agent.replyFromAgent(`${hello}\nEndpoint: ${baseUrl}\nSelect model:\n${modelLines.join('\n\n')}`);
      }

      return { models, selectedModel, baseUrl, apiKey };
    });

  agent.restoreProviderFromDisk =
    agent.restoreProviderFromDisk ||
    (async () => {
      const snapRead = await agent.readJsonFile(LLM_LAST_USED_PATH);
      const snap = snapRead.value;
      if (snap?.provider && snap?.baseUrl) {
        const providerName = String(snap.provider).trim().toLowerCase();
        const resolved = await agent.resolveProviderDef(providerName);
        if (resolved?.def) {
          try {
            await agent.applyProviderConfig({
              providerName,
              providerDef: resolved.def,
              registryEntry: null,
              llmConfig: {
                provider: providerName,
                baseUrl: String(snap.baseUrl || '').trim().replace(/\/$/, ''),
                apiKey: String(snap.apiKey || '').trim(),
                model: String(snap.model || resolved.def.defaultModel || 'default').trim(),
                updatedAt: snap.updatedAt || Date.now(),
              },
              startup: true,
            });
            return;
          } catch (error) {
            console.warn('Failed to restore provider from last used snapshot', error);
          }
        }
      }

      const active = await agent.readActiveProvider();
      if (!active?.name) return;

      const registry = await agent.loadMergedRegistry();
      const resolved = await agent.resolveProviderDef(active.name);
      if (!resolved) return;

      const providerDef = resolved.def;
      const registryEntry = registry?.[active.name] || null;
      const llmConfig = await agent.loadLLMConfig();

      try {
        await agent.applyProviderConfig({
          providerName: active.name,
          providerDef,
          registryEntry,
          llmConfig,
          startup: true,
        });
      } catch (error) {
        const msg = String(error?.message || error || '');
        if (/key/i.test(msg) || /api\s*key/i.test(msg) || /401|403/.test(msg)) {
          agent.replyFromAgent(`Provider "${active.name}" requires a key. Use: /a ${active.name} <key>`);
        } else {
          agent.replyFromAgent(`Failed to restore provider "${active.name}": ${msg || 'unknown error'}`);
        }
      }
    });

  // ---- LLM runtime ----


  const getLLMMessageText = message => {
    if (!message) {
      return '';
    }
    if (message.sender === 'user' && message._modelText) {
      return String(message._modelText);
    }
    return String(message.text || '');
  };
  agent.buildLLMSystemPrompt =
    agent.buildLLMSystemPrompt ||
    (() => {
      const params = agent.props?.navigation?.state?.params || {};
      const name = params.displayName || 'Agent';
      const short = params.shortCode ? `@${params.shortCode}` : '';
      const id = params.shortCode || params.namespaceId || 'unknown';
      return `You are ${name}${short} (Agent ID: ${id}) in xKEVA. Reply naturally, concise when possible.`;
    });

  agent.getRecentChatMessagesForLLM =
    agent.getRecentChatMessagesForLLM ||
    ((options = {}) => {
      const { memoryMode = 'new' } = options || {};
      const sourceMessages =
        memoryMode === 'continue' && Array.isArray(agent.state.currentStoryMessages) && agent.state.currentStoryMessages.length
          ? agent.state.currentStoryMessages
          : agent.state.allMessages || [];
      const msgs = sourceMessages.filter(message => {
        if (!message || (message.sender !== 'user' && message.sender !== 'agent')) {
          return false;
        }
        const text = getLLMMessageText(message);
        if (message.sender === 'user' && typeof agent.shouldSuppressUserInputRecord === 'function' && agent.shouldSuppressUserInputRecord(text)) {
          return false;
        }
        if (typeof agent.shouldPersistRoleMessage === 'function' && agent.chatScope === 'role') {
          return !!agent.shouldPersistRoleMessage(message);
        }
        return !!(text && !message.pending && !message._localOnly && message._renderMode !== 'commands');
      });
      return msgs.slice(-LLM_HISTORY_LIMIT);
    });


  const getUtf8ByteLength = value => {
    const text = String(value || '');
    if (typeof Buffer !== 'undefined' && Buffer?.byteLength) {
      return Buffer.byteLength(text, 'utf8');
    }
    return unescape(encodeURIComponent(text)).length;
  };

  const parseHttpUrlForTcp = url => {
    const match = String(url || '').match(/^http:\/\/([^\/:?#]+)(?::(\d+))?([^?#]*)(\?[^#]*)?/i);
    if (!match) return null;
    return {
      host: match[1],
      port: match[2] ? Number(match[2]) : 80,
      path: `${match[3] || '/'}${match[4] || ''}`,
    };
  };

  const decodeChunkedHttpBody = body => {
    let input = String(body || '');
    let output = '';
    while (input.length) {
      const lineEnd = input.indexOf('\r\n');
      if (lineEnd < 0) return body;
      const sizeText = input.slice(0, lineEnd).split(';')[0].trim();
      const size = parseInt(sizeText, 16);
      if (!Number.isFinite(size)) return body;
      if (size === 0) return output;
      const start = lineEnd + 2;
      output += input.slice(start, start + size);
      input = input.slice(start + size + 2);
    }
    return output;
  };

  const tcpHttpJsonRequest = (url, options = {}) => {
    const parsed = parseHttpUrlForTcp(url);
    if (!parsed) return Promise.reject(new Error('Unsupported local HTTP URL'));

    const method = String(options.method || 'GET').toUpperCase();
    const body = String(options.body || '');
    const headers = { ...(options.headers || {}) };
    if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (body && !headers['Content-Length']) headers['Content-Length'] = String(getUtf8ByteLength(body));

    return new Promise((resolve, reject) => {
      let raw = '';
      let settled = false;
      const socket = TcpSocket.createConnection({ host: parsed.host, port: parsed.port, timeout: 15000 }, () => {
        const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
        socket.write([
          `${method} ${parsed.path} HTTP/1.1`,
          `Host: ${parsed.host}:${parsed.port}`,
          'Connection: close',
          ...headerLines,
          '',
          body,
        ].join('\r\n'));
      });

      const finish = () => {
        if (settled) return;
        settled = true;
        const split = raw.indexOf('\r\n\r\n');
        const head = split >= 0 ? raw.slice(0, split) : '';
        let responseBody = split >= 0 ? raw.slice(split + 4) : raw;
        const statusMatch = head.match(/^HTTP\/\d(?:\.\d)?\s+(\d+)/i);
        const status = statusMatch ? Number(statusMatch[1]) : 0;
        if (/transfer-encoding:\s*chunked/i.test(head)) {
          responseBody = decodeChunkedHttpBody(responseBody);
        }
        resolve({
          ok: status >= 200 && status < 300,
          status,
          json: async () => JSON.parse(responseBody || '{}'),
          text: async () => responseBody,
        });
      };

      socket.on('data', data => { raw += data.toString(); });
      socket.on('error', error => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
      socket.on('close', finish);
      socket.setTimeout(130000, () => {
        if (!settled) {
          settled = true;
          try { socket.destroy(); } catch (_) {}
          reject(new Error('Local HTTP request timeout'));
        }
      });
    });
  };


  agent.checkXkevaAvailable =
    agent.checkXkevaAvailable ||
    (async () => {
      const roots = await getXkevaApiUrls();
      for (const root of roots) {
        const statusUrl = `${String(root || '').trim().replace(/\/$/, '')}/status`;
        if (!statusUrl) continue;
        try {
          const response = /^http:\/\//i.test(statusUrl)
            ? await tcpHttpJsonRequest(statusUrl, { method: 'GET', headers: { Accept: 'application/json' } })
            : await fetch(statusUrl, { method: 'GET', headers: { Accept: 'application/json' } });
          const json = await response.json().catch(() => ({}));
          if (response.ok && json?.configured === true) return true;
        } catch (error) {
          console.warn('xkeva availability check failed', { root, error });
        }
      }
      return false;
    });

  agent.fetchXkevaModelStatus =
    agent.fetchXkevaModelStatus ||
    (async (baseUrl = '', options = {}) => {
      const root = String(baseUrl || (await getXkevaApiUrl()) || '').trim().replace(/\/$/, '');
      if (!root) throw new Error('xKEVA status endpoint missing.');
      const statusUrl = `${root}/status`;
      const includeWalletAuth = options?.includeWalletAuth === true;
      let headers = { Accept: 'application/json' };
      if (includeWalletAuth) {
        try {
          if (typeof agent.buildXkevaRequestHeaders === 'function') {
            headers = { ...headers, ...(await agent.buildXkevaRequestHeaders(root)) };
          }
        } catch (authError) {
          console.warn('xkeva model status wallet headers unavailable', authError);
        }
      }

      try {
        const response = /^http:\/\//i.test(statusUrl)
          ? await tcpHttpJsonRequest(statusUrl, { method: 'GET', headers })
          : await fetch(statusUrl, { method: 'GET', headers });
        const json = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, json, url: statusUrl };
      } catch (error) {
        return { ok: false, status: 0, json: null, url: statusUrl, error: String(error?.message || error || '') };
      }
    });

  agent.getXkevaSatoshiAgentCreatedMeta =
    agent.getXkevaSatoshiAgentCreatedMeta ||
    (async () => {
      const cache = agent._xkevaSatoshiCreatedMetaCache || {};
      if (cache.ts && Date.now() - cache.ts < 15000) {
        return cache.value || null;
      }

      const remember = value => {
        agent._xkevaSatoshiCreatedMetaCache = { ts: Date.now(), value: value || null };
        return value || null;
      };

      try {
        const params = agent.props?.navigation?.state?.params || {};
        const listInfo = findSatoshiNamespaceInfo(agent.props?.namespaceList);
        const routeInfo = {
          namespaceId: trimText(params.namespaceId || ''),
          id: trimText(params.namespaceId || ''),
          shortCode: trimText(params.shortCode || params.shortId || ''),
          displayName: trimText(params.displayName || params.name || ''),
          txid: trimText(params.agentCreatedTxid || params.txid || params.txId || ''),
          agentCreatedTxid: trimText(params.agentCreatedTxid || params.txid || params.txId || ''),
          agentCreatedTxTime: normalizeKvTime(params.agentCreatedTxTime || params.agent_created_tx_time || 0),
          agentCreatedHeight: Number(params.agentCreatedHeight || params.agent_created_height || 0) || 0,
          namespaceCreateTxid: trimText(params.namespaceCreateTxid || params.namespace_create_txid || params.txid || params.txId || ''),
          namespaceCreateHeight: Number(params.namespaceCreateHeight || params.namespace_create_height || 0) || 0,
          namespaceCreateTxTime: normalizeKvTime(params.namespaceCreateTxTime || params.namespace_create_tx_time || 0),
        };
        const routeLooksSatoshi = !!routeInfo.namespaceId && (
          routeInfo.displayName.toLowerCase() === 'satoshi'
          || String(params.roleEntrySource || '').toLowerCase().includes('satoshi')
        );
        const info = routeLooksSatoshi ? { ...(listInfo || {}), ...routeInfo } : listInfo;
        const rawNamespaceId = trimText(info?.namespaceId || '');
        const fallbackId = trimText(info?.id || '');
        const namespaceId = rawNamespaceId || (/^\d+$/.test(fallbackId) ? '' : fallbackId);
        if (!namespaceId) return remember(null);
        const routeAgentCreatedTxid = trimText(info?.agentCreatedTxid || info?.agent_created_txid || info?.txId || info?.txid || '');
        const routeAgentCreatedTxTime = normalizeKvTime(info?.agentCreatedTxTime || info?.agent_created_tx_time || 0);
        const routeAgentCreatedHeight = Number(info?.agentCreatedHeight || info?.agent_created_height || 0) || 0;
        const routeNamespaceCreateTxid = getNamespaceCreateTxid(info);

        const BlueElectrum = getBlueElectrum();
        await BlueElectrum.ping();
        if (typeof BlueElectrum.waitTillConnected === 'function') {
          await BlueElectrum.waitTillConnected();
        }

        const history = await BlueElectrum.blockchainKeva_getKeyValues(getNamespaceScriptHash(namespaceId), -1);
        const keyValues = Array.isArray(history?.keyvalues) ? history.keyvalues : (Array.isArray(history) ? history : []);
        let createdKv = null;
        for (const kv of keyValues) {
          const key = decodeKvKey(kv?.key).trim();
          if (key !== XKEVA_SATOSHI_CREATED_KEY) continue;
          const time = normalizeKvTime(kv?.time || kv?.timestamp || kv?.block_time);
          if (!time) continue;
          if (!createdKv || time > normalizeKvTime(createdKv?.time || createdKv?.timestamp || createdKv?.block_time)) {
            createdKv = kv;
          }
        }
        if (!createdKv) {
          if (routeAgentCreatedTxid || routeNamespaceCreateTxid) {
            const currentHeight = Number(await getBlueElectrum().blockchainBlock_count().catch(() => 0)) || 0;
            return remember({
              namespaceId,
              shortCode: trimText(info?.shortCode || ''),
              txid: routeAgentCreatedTxid,
              agentCreatedTxid: routeAgentCreatedTxid,
              namespaceCreateTxid: routeNamespaceCreateTxid,
              agentCreatedTxTime: routeAgentCreatedTxTime,
              agentCreatedHeight: 0,
              currentHeight,
              blocksSinceCreated: null,
              freeEligible: !!routeNamespaceCreateTxid,
              txSource: routeAgentCreatedTxid ? 'agent_created_pending' : 'namespace_create_only',
            });
          }
          return remember(null);
        }

        const agentCreatedTxTime = normalizeKvTime(createdKv?.time || createdKv?.timestamp || createdKv?.block_time);
        const agentCreatedHeight = Number(createdKv?.height || createdKv?.block_height || createdKv?.confirmed_height || 0) || 0;
        let currentHeight = 0;
        try {
          currentHeight = Number(await getBlueElectrum().blockchainBlock_count()) || 0;
        } catch (heightError) {
          console.warn('Failed to read current block height for xkeva free window', heightError);
        }
        const blocksSinceCreated = agentCreatedHeight > 0 && currentHeight > 0 ? Math.max(0, currentHeight - agentCreatedHeight) : null;
        return remember({
          namespaceId,
          shortCode: trimText(info?.shortCode || ''),
          txid: getKvTxid(createdKv) || routeAgentCreatedTxid,
          agentCreatedTxid: getKvTxid(createdKv) || routeAgentCreatedTxid,
          namespaceCreateTxid: routeNamespaceCreateTxid,
          agentCreatedTxTime,
          agentCreatedHeight,
          currentHeight,
          blocksSinceCreated,
          freeEligible: blocksSinceCreated !== null,
          txSource: 'agent_created',
        });
      } catch (error) {
        console.warn('Failed to read Satoshi Agent Created tx time for xkeva free window', error);
        return remember(null);
      }
    });

  agent.getXkevaAuthWalletMaterial =
    agent.getXkevaAuthWalletMaterial ||
    (async () => {
      const params = agent.props?.navigation?.state?.params || {};
      const walletId = String(params.walletId || '').trim();
      const paramAddress = String(params.rootAddress || params.addr || params.address || '').trim();
      const BlueApp = getBlueApp();
      const wallets = typeof BlueApp.getWallets === 'function' ? BlueApp.getWallets() : [];
      let wallet = walletId ? wallets.find(w => w.getID && w.getID() === walletId) : null;

      if (!wallet && paramAddress) {
        for (const candidate of wallets) {
          try {
            const candidateAddress = typeof candidate.getAddressAsync === 'function' ? await candidate.getAddressAsync() : (candidate.getAddress ? candidate.getAddress() : '');
            if (String(candidateAddress || '') === paramAddress) {
              wallet = candidate;
              break;
            }
            if (typeof candidate.weOwnAddress === 'function' && candidate.weOwnAddress(paramAddress)) {
              wallet = candidate;
              break;
            }
          } catch (_) {}
        }
      }

      if (!wallet && wallets.length === 1) {
        wallet = wallets[0];
      }
      if (!wallet) {
        console.warn('xKEVA wallet auth: no local wallet found', { walletId, paramAddress, walletCount: wallets.length });
        return null;
      }

      let address = paramAddress;
      const namespaceId = String(params.namespaceId || '').trim();
      if (!address && namespaceId && wallet) {
        try {
          if (typeof wallet.fetchTransactions === 'function') await wallet.fetchTransactions();
          if (typeof wallet.fetchUtxo === 'function') await wallet.fetchUtxo();
          const transactions = typeof wallet.getTransactions === 'function' ? (wallet.getTransactions() || []) : [];
          const utxos = typeof wallet.getUtxo === 'function' ? (wallet.getUtxo() || []) : [];
          for (const utxo of utxos) {
            const tx = transactions.find(item => String(utxo?.txId || '') === String(item?.hash || item?.txid || ''));
            if (!tx || !Array.isArray(tx.n)) continue;
            if (String(tx.n[0] || '') === namespaceId && Number(utxo?.vout) === Number(tx.n[1])) {
              address = String(utxo?.address || '').trim();
              if (address) break;
            }
          }
        } catch (error) {
          console.warn('xKEVA wallet auth: failed to resolve namespace owner address', { namespaceId, walletId, error });
        }
      }
      if (!address) {
        address = typeof wallet.getAddressAsync === 'function' ? await wallet.getAddressAsync() : (wallet.getAddress ? wallet.getAddress() : '');
      }
      if (!address) {
        console.warn('xKEVA wallet auth: wallet has no address', { walletId, paramAddress, namespaceId });
        return null;
      }
      const wif = getWalletWifForAddress(wallet, address);
      if (!wif) {
        console.warn('xKEVA wallet auth: no WIF for address', { address, walletId, type: wallet.type });
        return null;
      }

      const keyPair = getBitcoin().ECPair.fromWIF(wif);
      const compressedPubKey = Buffer.from(keyPair.publicKey || []);
      const derivedAddresses = addressesFromPublicKey(compressedPubKey);
      if (derivedAddresses.length > 0 && !derivedAddresses.some(item => String(item) === String(address))) {
        console.warn('xKEVA wallet auth address mismatch', { address, derivedAddresses });
        return null;
      }
      return {
        wallet,
        address: String(address),
        keyPair,
        pubKeyHex: compressedPubKey.toString('hex'),
      };
    });

  agent.fetchXkevaAuthNonce =
    agent.fetchXkevaAuthNonce ||
    (async (baseUrl, headers = {}) => {
      const root = String(baseUrl || (await getXkevaApiUrl()) || '').trim().replace(/\/$/, '');
      if (!root) throw new Error('xKEVA auth endpoint missing.');
      const url = `${root}/auth/nonce`;
      const response = /^http:\/\//i.test(url)
        ? await tcpHttpJsonRequest(url, { method: 'GET', headers })
        : await fetch(url, { method: 'GET', headers });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.nonce) {
        throw new Error(json?.error?.message || `xKEVA auth nonce failed (${response.status})`);
      }
      return String(json.nonce || '').trim();
    });

  agent.buildXkevaRequestHeaders =
    agent.buildXkevaRequestHeaders ||
    (async (baseUrl = '') => {
      const deviceId = await getXkevaDeviceId();
      const roleLangCode = typeof agent.getRoleLangCode === 'function' ? String(agent.getRoleLangCode() || '').trim() : '';
      const headers = { 'X-XKEVA-App-Token': XKEVA_APP_TOKEN, 'X-XKEVA-Device-Id': deviceId };
      if (roleLangCode) {
        headers['X-XKEVA-Role-Language'] = roleLangCode;
        headers['Accept-Language'] = roleLangCode;
      }
      const meta = await agent.getXkevaSatoshiAgentCreatedMeta();
      if (meta?.namespaceId) {
        headers['X-XKEVA-Satoshi-Namespace-Id'] = meta.namespaceId;
        if (meta.shortCode) headers['X-XKEVA-Satoshi-Short-Code'] = meta.shortCode;
        if (meta.txid) headers['X-XKEVA-Agent-Created-Txid'] = meta.txid;
        if (meta.namespaceCreateTxid) headers['X-XKEVA-Namespace-Create-Txid'] = meta.namespaceCreateTxid;
        if (meta.agentCreatedTxTime) headers['X-XKEVA-Agent-Created-Tx-Time'] = String(meta.agentCreatedTxTime);
        headers['X-XKEVA-Agent-Created-Height'] = String(meta.agentCreatedHeight || 0);
        headers['X-XKEVA-Current-Height'] = String(meta.currentHeight || 0);
        if (meta.blocksSinceCreated !== null && meta.blocksSinceCreated !== undefined) {
          headers['X-XKEVA-Blocks-Since-Agent-Created'] = String(meta.blocksSinceCreated);
        }
      }

      const auth = await agent.getXkevaAuthWalletMaterial();
      if (auth?.address && auth?.keyPair && auth?.pubKeyHex) {
        const nonceHeaders = {
          'X-XKEVA-App-Token': XKEVA_APP_TOKEN,
          'X-XKEVA-Device-Id': deviceId,
          'X-XKEVA-Wallet-Address': auth.address,
          ...(headers['X-XKEVA-Satoshi-Namespace-Id'] ? { 'X-XKEVA-Satoshi-Namespace-Id': headers['X-XKEVA-Satoshi-Namespace-Id'] } : {}),
        };
        const nonce = await agent.fetchXkevaAuthNonce(baseUrl, nonceHeaders);
        const message = buildXkevaWalletAuthMessage({
          address: auth.address,
          namespace: headers['X-XKEVA-Satoshi-Namespace-Id'] || '',
          txid: headers['X-XKEVA-Agent-Created-Txid'] || '',
          createdHeight: headers['X-XKEVA-Agent-Created-Height'] || 0,
          currentHeight: headers['X-XKEVA-Current-Height'] || 0,
          deviceId,
          nonce,
        });
        const digest = getBitcoin().crypto.sha256(Buffer.from(message, 'utf8'));
        const signature = auth.keyPair.sign(digest);
        const derSignature = derEncodeEcdsaSignature(signature);
        headers['X-XKEVA-Wallet-Address'] = auth.address;
        headers['X-XKEVA-Wallet-PubKey'] = auth.pubKeyHex;
        headers['X-XKEVA-Auth-Nonce'] = nonce;
        headers['X-XKEVA-Auth-Signature'] = derSignature.toString('base64');
        headers['X-XKEVA-Auth-Version'] = '1';
      }
      return headers;
    });

  agent.callOpenAICompatible =
    agent.callOpenAICompatible ||
    (async ({ baseUrl, apiKey, model, systemPrompt, recent, authHeader, fallbackBaseUrls = [], minRequestIntervalMs = 0 }) => {
      const roots = [baseUrl, ...(fallbackBaseUrls || [])]
        .map(url => String(url || '').trim().replace(/\/$/, ''))
        .filter((url, index, list) => url && list.indexOf(url) === index);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...recent.map(message => ({
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: getLLMMessageText(message),
        })),
      ];

      const headers = {
        'Content-Type': 'application/json',
        ...(authHeader ? authHeader(apiKey) : apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      };

      const normalizedModel = String(model || '').trim().toLowerCase();
      const supportsCustomTemperature = !/^gpt-5/.test(normalizedModel);
      const body = { model, messages, stream: false };
      if (supportsCustomTemperature) {
        body.temperature = 0.7;
      }

      const requestBody = JSON.stringify(body);
      let lastError = null;
      for (const root of roots) {
        const url = `${root}/chat/completions`;
        try {
          if (minRequestIntervalMs > 0) {
            await waitForXkevaChatRequestTurn(minRequestIntervalMs);
          }
          let resp;
          if (/^http:\/\//i.test(url)) {
            // React Native fetch may reject cleartext LAN PHP responses as a generic
            // "Network request failed" before we can read the API JSON body. Use the
            // TCP HTTP path first for local xKEVA so 403 free_window_inactive is readable.
            resp = await tcpHttpJsonRequest(url, { method: 'POST', headers, body: requestBody });
          } else {
            resp = await fetch(url, { method: 'POST', headers, body: requestBody });
          }
          const json = await resp.json().catch(() => ({}));

          if (!resp.ok) {
            const freeWindowMessage = buildXkevaFreeWindowInactiveMessage(json);
            if (freeWindowMessage) {
              const freeWindowError = new Error(freeWindowMessage);
              freeWindowError.xkevaFreeWindowInactive = true;
              throw freeWindowError;
            }
            throw new Error(`openai_compat http ${resp.status}: ${JSON.stringify(json).slice(0, 200)}`);
          }
          const firstMessage = json?.choices?.[0]?.message || {};
          return firstMessage.content ?? firstMessage.reasoning ?? '';
        } catch (error) {
          if (error?.xkevaFreeWindowInactive) {
            throw error;
          }
          lastError = error;
          console.warn('OpenAI-compatible endpoint failed', { url, error });
        }
      }

      throw lastError || new Error('openai_compat request failed');
    });

  agent.callAnthropic =
    agent.callAnthropic ||
    (async ({ baseUrl, apiKey, model, systemPrompt, recent, authHeader }) => {
      const root = String(baseUrl || '').replace(/\/$/, '');
      const url = `${root}/messages`;

      const messages = recent.map(message => ({
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: getLLMMessageText(message),
      })).filter(message => String(message.content || '').trim());

      const headers = {
        'Content-Type': 'application/json',
        ...(authHeader ? authHeader(apiKey) : apiKey ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : { 'anthropic-version': '2023-06-01' }),
      };

      const body = {
        model,
        system: systemPrompt,
        messages,
        max_tokens: 4096,
      };

      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(`anthropic http ${resp.status}: ${JSON.stringify(json).slice(0, 200)}`);
      }

      const parts = Array.isArray(json?.content) ? json.content : [];
      return parts.map(part => part?.type === 'text' ? part.text || '' : '').join('');
    });

  agent.callGemini =
    agent.callGemini ||
    (async ({ baseUrl, apiKey, model, systemPrompt, recent, authHeader }) => {
      const root = String(baseUrl || '').replace(/\/$/, '');
      const url = `${root}/models/${encodeURIComponent(model)}:generateContent`;

      const contents = recent.map(message => ({
        role: message.sender === 'user' ? 'user' : 'model',
        parts: [{ text: getLLMMessageText(message) }],
      }));

      if (contents.length > 0) {
        const first = contents[0];
        if (first.role === 'user' && first.parts?.[0]?.text) {
          first.parts[0].text = `SYSTEM: ${systemPrompt}\n\n${first.parts[0].text}`;
        } else {
          contents.unshift({ role: 'user', parts: [{ text: `SYSTEM: ${systemPrompt}` }] });
        }
      } else {
        contents.push({ role: 'user', parts: [{ text: `SYSTEM: ${systemPrompt}` }] });
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(authHeader ? authHeader(apiKey) : { 'x-goog-api-key': apiKey }),
      };

      const body = { contents };

      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(`gemini http ${resp.status}: ${JSON.stringify(json).slice(0, 200)}`);
      }

      const parts = json?.candidates?.[0]?.content?.parts || [];
      return parts.map(part => part?.text || '').join('');
    });

  agent.replyFromLLM =
    agent.replyFromLLM ||
    (async (userText, userMessage = null, options = {}) => {
      if (typeof agent.ensureRoleSummonRitualFreshBeforeLLM === 'function') {
        await agent.ensureRoleSummonRitualFreshBeforeLLM();
      }
      const requestId = `${Date.now()}-${Math.random()}`;
      const placeholder = {
        id: `agent-${requestId}`,
        sender: 'agent',
        text: '…',
        pending: true,
        requestId,
        timestamp: Date.now(),
      };
      agent.appendMessage(placeholder);

      try {
        const replyText = await agent._llmComplete({ userText, userMessage, options });
        if (typeof agent.prepareStoryLLMReplyForDisplay === 'function') {
          await agent.prepareStoryLLMReplyForDisplay({ requestId, replyText, placeholder });
        }
        await agent.updateAgentMessage(requestId, replyText);
        if (typeof agent.persistStoryLLMReply === 'function') {
          await agent.persistStoryLLMReply({ requestId, replyText, placeholder });
        }
        if (typeof agent.scheduleConversationSummaryUpdate === 'function') {
          const activeRoleSlug =
            String(agent.state?.activeRoleSlug || agent.activeRoleSlug || agent.state?.currentSummonedRole?.roleSlug || '').trim() || '';
          if (activeRoleSlug) {
            agent.scheduleConversationSummaryUpdate(activeRoleSlug);
          }
        }

        // Auto role-memory updates during normal chat are intentionally disabled.
        // Memory should change only through explicit memory-edit/update flows.
      } catch (error) {
        console.warn('LLM call failed', error);
        const errorText = error?.message || 'LLM call failed.';
        const useSatoshiAvatar = Boolean(
          error?.xkevaFreeWindowInactive
            || /(?:free channel|free window|free_window_inactive|xkeva\s*免费通道|xkeva\s*免費通道|当前 xKEVA 免费通道已结束|目前 xKEVA 免費通道已結束)/i.test(String(errorText || '')),
        );
        await agent.updateAgentMessage(requestId, errorText, useSatoshiAvatar ? { _useSatoshiAvatar: true } : null);
        if (typeof agent.persistStoryLLMReply === 'function') {
          await agent.persistStoryLLMReply({
            requestId,
            replyText: errorText,
            placeholder: useSatoshiAvatar ? { ...(placeholder || {}), _useSatoshiAvatar: true } : placeholder,
          });
        }
      }
    });

  agent._llmComplete =
    agent._llmComplete ||
    (async ({ userText, userMessage = null, options = {} }) => {
      const { silentUser = false, useRecentHistory = true, memoryMode = 'new', condensedMemory = '', skipRoleContext = false } = options || {};

      const cfg = agent.state.llmConfig;
      if (!cfg || !cfg.provider) {
        throw new Error('No cloud model configured. Use: /a <provider> <apikey>');
      }

      const resolved = await agent.resolveProviderDef(cfg.provider);
      if (!resolved) {
        throw new Error('Cloud model provider missing. Re-run /a.');
      }

      const providerDef = resolved.def;
      const isXkevaProvider = cfg.provider === 'xkeva';
      const baseUrl = isXkevaProvider ? await getXkevaApiUrl() : (cfg.baseUrl || providerDef.baseUrl);
      if (!baseUrl) {
        throw new Error('Provider missing baseUrl. Re-run /a.');
      }

      const requestId = `${Date.now()}-${Math.random()}`;
      const baseSystemPrompt = agent.buildLLMSystemPrompt();
      const storyLangCode =
        (typeof agent.getStoryLangCode === 'function' && agent.getStoryLangCode()) || agent.state?.storyLangCode || null;
      const storyLanguageInstruction =
        storyLangCode && typeof agent.getStoryLanguageInstruction === 'function' ? agent.getStoryLanguageInstruction() : '';
      const memoryInstruction =
        memoryMode === 'continue' && String(condensedMemory || '').trim()
          ? `MEMORY (condensed story so far):\n${String(condensedMemory || '').trim()}`
          : '';
      const roleContextInstruction =
        !skipRoleContext && typeof agent.buildRoleContextSystemPrompt === 'function'
          ? await agent.buildRoleContextSystemPrompt({ userText, userMessage, options })
          : '';
      const systemPrompt = [storyLanguageInstruction, baseSystemPrompt, roleContextInstruction, memoryInstruction].filter(Boolean).join('\n\n');
      let recent = useRecentHistory ? agent.getRecentChatMessagesForLLM({ memoryMode }) : [];

      if (silentUser) {
        if (memoryMode !== 'continue') {
          recent.push({
            id: `ephemeral-${requestId}`,
            sender: 'user',
            text: userText,
            timestamp: Date.now(),
          });
        }
      } else if (userMessage && userMessage.id) {
        recent = recent.filter(message => message.id !== userMessage.id);
        recent.push(userMessage);
      } else {
        recent.push({
          id: `ephemeral-${requestId}`,
          sender: 'user',
          text: userText,
          timestamp: Date.now(),
        });
      }

      recent = recent.slice(-LLM_HISTORY_LIMIT);

      let replyText = '';
      if (providerDef.kind === 'openai_compat') {
        const xkevaHeaders = isXkevaProvider ? await agent.buildXkevaRequestHeaders(baseUrl) : null;
        replyText = await agent.callOpenAICompatible({
          baseUrl,
          apiKey: cfg.apiKey,
          model: cfg.model || providerDef.defaultModel,
          systemPrompt,
          recent,
          authHeader: isXkevaProvider
            ? () => xkevaHeaders
            : (providerDef.authHeader || DEFAULT_AUTH_HEADER),
          // For xKEVA testing, do not fall back to public endpoints.
          // The 215 API must be the single source of truth for free-window gating.
          fallbackBaseUrls: [],
          minRequestIntervalMs: isXkevaProvider ? XKEVA_MIN_CHAT_REQUEST_INTERVAL_MS : 0,
        });
      } else if (providerDef.kind === 'gemini') {
        replyText = await agent.callGemini({
          baseUrl,
          apiKey: cfg.apiKey,
          model: cfg.model || providerDef.defaultModel,
          systemPrompt,
          recent,
          authHeader: providerDef.authHeader,
        });
      } else if (providerDef.kind === 'anthropic') {
        replyText = await agent.callAnthropic({
          baseUrl,
          apiKey: cfg.apiKey,
          model: cfg.model || providerDef.defaultModel,
          systemPrompt,
          recent,
          authHeader: providerDef.authHeader,
        });
      } else {
        throw new Error('Unsupported provider kind.');
      }

      if (!replyText) {
        throw new Error('Model returned empty response.');
      }

      return replyText.trim();
    });

  agent.callLLMSilent =
    agent.callLLMSilent ||
    (async (prompt, options = {}) => {
      const responseText = await agent._llmComplete({
        userText: String(prompt || ''),
        userMessage: null,
        options: {
          silentUser: true,
          useRecentHistory: false,
          skipRoleContext: true,
          ...(options || {}),
        },
      });
      return String(responseText || '').trim();
    });

  // ---- /a command dispatcher ----
  agent.finishAISetupFlow =
    agent.finishAISetupFlow ||
    (async () => {
      if (agent.state?.pendingReturnToRoleMenu && !agent.state?.pendingRoleModelReturnToRole) {
        await new Promise(resolve => agent.setState({ pendingReturnToRoleMenu: false }, resolve));
        await agent.handleTriggers('/role', null);
        return;
      }
      if (agent.state?.pendingReturnToStoryMenu) {
        await new Promise(resolve => agent.setState({ pendingReturnToStoryMenu: false }, resolve));
        await agent.handleTriggers('/d', null);
      }
    });

  agent.resetAISetupState =
    agent.resetAISetupState ||
    (async () => {
      await new Promise(resolve =>
        agent.setState({ pendingAISetup: false, pendingAISetupStep: null, pendingAISetupDraft: null }, resolve),
      );
    });

  agent.useProviderFromList =
    agent.useProviderFromList ||
    (async provider => {
      const resolved = await agent.resolveProviderDef(provider);
      if (!resolved) {
        agent.replyFromAgent('Unknown provider. Try: /a list');
        return;
      }

      const builtinReg = await agent.readBuiltinRegistry();
      const customReg = await agent.readCustomRegistry();
      let registryEntry = resolved.source === 'custom' ? customReg?.[provider] || null : builtinReg?.[provider] || null;

      if (resolved.source !== 'custom') {
        const hasKey = !!String(registryEntry?.apiKey || '').trim();
        const noKeyRequired = resolved.def?.noKeyRequired === true;
        if (!hasKey && !noKeyRequired) {
          await new Promise(resolve =>
            agent.setState(
              {
                pendingAISetup: true,
                pendingAISetupStep: 'builtin_key',
                pendingAISetupDraft: { provider },
              },
              resolve,
            ),
          );
          agent.replyFromAgent(`Enter API key for ${provider}:`);
          return;
        }
      } else if (!String(registryEntry?.apiKey || '').trim()) {
        await new Promise(resolve =>
          agent.setState(
            {
              pendingAISetup: true,
              pendingAISetupStep: 'custom_key',
              pendingAISetupDraft: {
                provider,
                customName: registryEntry?.label || provider,
                customUrl: String(registryEntry?.baseUrl || '').trim().replace(/\/$/, ''),
              },
            },
            resolve,
          ),
        );
        agent.replyFromAgent('Enter API key:');
        return;
      }

      const current = agent.currentLLMConfig || agent.state.llmConfig || (await agent.loadLLMConfig());
      try {
        await agent.applyProviderConfig({
          providerName: provider,
          providerDef: resolved.def,
          registryEntry,
          llmConfig: current,
          startup: false,
        });
        await agent.finishAISetupFlow();
      } catch (error) {
        agent.replyFromAgent('Failed to load models. Check baseUrl/key or endpoint compatibility.');
      }
    });

  agent.renderAIProviderList =
    agent.renderAIProviderList ||
    (async () => {
      const cur = agent.currentLLMConfig || agent.state.llmConfig || (await agent.loadLLMConfig());
      const builtinReg = await agent.readBuiltinRegistry();
      const customReg = await agent.readCustomRegistry();

      const statusDot = hasKey => (hasKey ? '🟩' : '🟥');

      const builtinLines = Object.keys(LLM_PROVIDERS).map(name => {
        const hasCurrentKey = cur?.provider === name && !!String(cur?.apiKey || '').trim();
        const hasKey = LLM_PROVIDERS[name]?.noKeyRequired === true || !!String(builtinReg?.[name]?.apiKey || '').trim() || hasCurrentKey;
        return `${statusDot(hasKey)} [[/a ${name}|use]] ${name}`;
      });

      const customNames = Object.keys(customReg || {}).filter(name => customReg?.[name]?.baseUrl);
      const customLines = customNames.map(name => `${statusDot(!!String(customReg?.[name]?.apiKey || '').trim())} [[/a ${name}|use]] ${customReg?.[name]?.label || name}`);

      const spacedBuiltinLines = builtinLines.flatMap(line => [line, '']);
      const spacedCustomLines = customLines.flatMap(line => [line, '']);

      const roleLang = typeof agent.getRoleLangCode === 'function' ? agent.getRoleLangCode() : null;
      const roleText = (key, fallback) => (typeof agent.getRoleUiText === 'function' ? agent.getRoleUiText(key) : '') || fallback;
      const addModelLabel = roleText('addModel', 'Add model');
      const removeKeyLabel = roleText('removeModel', 'Remove key');
      const backLabel = roleText('back', 'Back');
      const apiUsageButton = typeof agent.buildModelApiUsageButtonLine === 'function'
        ? agent.buildModelApiUsageButtonLine('/a apiusage')
        : `[[/a apiusage|${roleText('apiUsageButton', 'Instructions')}]]`;

      agent.replyFromAgent([
        ...spacedBuiltinLines,
        ...spacedCustomLines,
        `[[/a addcustom|${addModelLabel}]]`,
        '',
        apiUsageButton,
        '',
        `[[/a remove|${removeKeyLabel}]]`,
        '',
        `[[/reopen|${backLabel}]]`,
      ].join('\n'));
    });

  agent.renderAIRemoveMenu =
    agent.renderAIRemoveMenu ||
    (async () => {
      const builtinReg = await agent.readBuiltinRegistry();
      const customReg = await agent.readCustomRegistry();
      const activeProvider = String(agent.state.llmConfig?.provider || agent.currentLLMConfig?.provider || '').trim().toLowerCase();
      const builtinLines = Object.keys(LLM_PROVIDERS)
        .filter(name => name !== 'xkeva' && (!!String(builtinReg?.[name]?.apiKey || '').trim() || !!builtinReg?.[name] || activeProvider === name))
        .map(name => `[[/a remove builtin ${name}|${name}]]`);
      const customLines = Object.keys(customReg || {}).map(name => `[[/a remove custom ${name}|${customReg?.[name]?.label || name}]]`);
      const lines = ['Remove key / custom model:', '', ...builtinLines, ...customLines];
      if (lines.length <= 2) lines.push('(none)');
      const spacedLines = lines.flatMap((line, index) => (index === lines.length - 1 ? [line] : [line, '']));
      agent.replyFromAgent(spacedLines.join('\n'));
    });

  agent.handlePendingAISetupInput =
    agent.handlePendingAISetupInput ||
    (async trimmed => {
      if (!agent.state?.pendingAISetup || !agent.state?.pendingAISetupStep) return false;
      if (trimmed.startsWith('/')) {
        await agent.resetAISetupState();
        return false;
      }
      const value = String(trimmed || '').trim();
      if (!value) {
        agent.replyFromAgent('(empty input)');
        return true;
      }

      try {
        const step = agent.state.pendingAISetupStep;
        const draft = agent.state.pendingAISetupDraft || {};

        if (step === 'builtin_key') {
          const provider = String(draft.provider || '').toLowerCase();
          if (!provider || !LLM_PROVIDERS[provider]) {
            throw new Error('Unknown provider');
          }
          const builtin = (await agent.readBuiltinRegistry()) || {};
          builtin[provider] = { ...(builtin[provider] || {}), baseUrl: LLM_PROVIDERS[provider]?.baseUrl || '', apiKey: value, updatedAt: Date.now() };
          await agent.writeBuiltinRegistry(builtin);
          await agent.resetAISetupState();
          await agent.useProviderFromList(provider);
          return true;
        }

        if (step === 'custom_name') {
          await new Promise(resolve =>
            agent.setState({ pendingAISetupStep: 'custom_url', pendingAISetupDraft: { ...draft, customName: value } }, resolve),
          );
          agent.replyFromAgent('Enter base URL:');
          return true;
        }

        if (step === 'custom_url') {
          await new Promise(resolve =>
            agent.setState({ pendingAISetupStep: 'custom_key', pendingAISetupDraft: { ...draft, customUrl: value } }, resolve),
          );
          agent.replyFromAgent('Enter API key:');
          return true;
        }

        if (step === 'remove_menu') {
          agent.replyFromAgent('Select an item from the remove menu.');
          return true;
        }

        if (step === 'custom_key') {
          const nameRaw = String(draft.customName || '').trim();
          const provider = String(draft.provider || nameRaw).toLowerCase();
          const baseUrl = String(draft.customUrl || '').trim().replace(/\/$/, '');
          if (!provider || !baseUrl) {
            throw new Error('Missing custom model name or base URL');
          }
          const custom = (await agent.readCustomRegistry()) || {};
          custom[provider] = { ...(custom[provider] || {}), label: nameRaw || provider, baseUrl, apiKey: value, updatedAt: Date.now() };
          await agent.writeCustomRegistry(custom);
          await agent.resetAISetupState();
          await agent.useProviderFromList(provider);
          return true;
        }
      } catch (error) {
        console.warn('AI setup input failed', error);
        await agent.resetAISetupState();
        agent.replyFromAgent('Failed to save API key. Please check the key/provider and try again.');
        return true;
      }

      return false;
    });

  agent.handleAIConfigCommand =
    agent.handleAIConfigCommand ||
    (async trimmed => {
      const parts = trimmed.trim().split(/\s+/);
      if (parts.length === 1) {
        const cur = agent.state.llmConfig;
        const roleModelLabel = typeof agent.getRoleUiText === 'function'
          ? (agent.getRoleUiText('model') || 'Model')
          : 'Model';
        const currentLabel = typeof agent.getRoleUiText === 'function'
          ? (agent.getRoleUiText('current') || 'Current')
          : 'Current';
        const curLine = cur ? `${currentLabel}: ${roleModelLabel} ${cur.model || cur.provider || ''}` : `${currentLabel}: (none)`;
        const listEntry = typeof agent.getRoleUiText === 'function'
          ? (agent.getRoleUiText('roleModelCheckEntry') || '/rolemodel')
          : '/rolemodel';
        agent.replyFromAgent(`${curLine}
Usage:
[[/rolemodel|${listEntry}]]
/a <provider> [key] [model]
/a add <provider> <url> [key]
/a del <provider>
/a model <model>
[[/a off|/a off]]`);
        return;
      }

      const sub = String(parts[1] || '').toLowerCase();
      if (sub === 'list') return agent.renderAIProviderList();
      if (sub === 'apiusage') {
        if (typeof agent.buildModelApiUsageMessage === 'function') {
          agent.replyFromAgent(
            agent.buildModelApiUsageMessage()
              .replace(/\[\[\/rolemodel\|([^\]]+)\]\]/g, '[[/a list|$1]]')
              .replace(/\[\[\/rolemodel\s+apiurl\s+([^|\]]+)\|([^\]]+)\]\]/g, '[[/a apiurl $1|$2]]'),
          );
        } else agent.replyFromAgent('API help:\n\nIf you do not know how to get an API key, ask any large model directly, or check the official provider website.');
        return;
      }
      if (sub === 'apiurl') {
        if (typeof agent.openModelApiUsageUrl === 'function') await agent.openModelApiUsageUrl(parts[2]);
        return;
      }
      if (sub === 'addcustom') {
        await new Promise(resolve =>
          agent.setState({ pendingAISetup: true, pendingAISetupStep: 'custom_name', pendingAISetupDraft: {} }, resolve),
        );
        agent.replyFromAgent('Enter custom model name:');
        return;
      }
      if (sub === 'remove') {
        const targetType = String(parts[2] || '').toLowerCase();
        const targetName = String(parts[3] || '').toLowerCase();
        if (!targetType || !targetName) {
          await new Promise(resolve =>
            agent.setState({ pendingAISetup: true, pendingAISetupStep: 'remove_menu', pendingAISetupDraft: null }, resolve),
          );
          return agent.renderAIRemoveMenu();
        }
        if (targetType === 'builtin') {
          if (targetName === 'xkeva') {
            agent.replyFromAgent('xkeva is built in.');
            await agent.resetAISetupState();
            await agent.finishAISetupFlow();
            return;
          }
          const builtin = (await agent.readBuiltinRegistry()) || {};
          if (builtin[targetName]) {
            delete builtin[targetName];
            await agent.writeBuiltinRegistry(builtin);
          }
        }
        if (targetType === 'custom') {
          const custom = (await agent.readCustomRegistry()) || {};
          if (custom[targetName]) {
            delete custom[targetName];
            await agent.writeCustomRegistry(custom);
          }
        }
        await agent.resetAISetupState();
        const activeProvider = String(agent.state.llmConfig?.provider || agent.currentLLMConfig?.provider || '').toLowerCase();
        if (activeProvider === targetName) {
          await agent.clearLLMConfig();
          await agent.clearActiveProvider();
        }
        if (typeof agent.handleRoleNewMenu === 'function') {
          await new Promise(resolve => agent.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, resolve));
          await agent.handleTriggers('/role', null);
          return;
        }
        await agent.finishAISetupFlow();
        return;
      }

      if (LLM_PROVIDERS[sub]) {
        const keyArg = parts[2] || '';
        if (keyArg) {
          const builtinReg = await agent.readBuiltinRegistry();
          builtinReg[sub] = { ...(builtinReg[sub] || {}), baseUrl: LLM_PROVIDERS[sub].baseUrl, apiKey: keyArg, updatedAt: Date.now() };
          await agent.writeBuiltinRegistry(builtinReg);
        }
        return agent.useProviderFromList(sub);
      }

      const resolved = await agent.resolveProviderDef(sub);
      if (resolved?.source === 'custom') {
        return agent.useProviderFromList(sub);
      }

      // legacy flows
      if (sub === 'model') {
        const model = parts[2];
        if (!model) {
          agent.replyFromAgent('Usage: /a model <model>');
          return;
        }
        let cur = agent.currentLLMConfig || agent.state.llmConfig;
        if (!cur || !cur.provider || !cur.baseUrl) cur = await agent.loadLLMConfig();
        if (!cur || !cur.provider) {
          agent.replyFromAgent('No provider configured. Use: /a list');
          return;
        }
        const next = { ...cur, model };
        agent.setState({ llmConfig: next });
        await agent.saveLLMConfig(next);
        await agent.writeActiveProvider({ name: cur.provider, updatedAt: Date.now() });
        if (typeof agent.writeJsonFile === 'function' && agent.llmLastUsedPath) {
          await agent.writeJsonFile(agent.llmLastUsedPath, {
            provider: next.provider,
            baseUrl: next.baseUrl,
            apiKey: next.apiKey,
            model: next.model,
            updatedAt: Date.now(),
          });
        }
        if (agent?.isStoryScope) {
          agent.replyFromAgent(`Model selected: ${model}`);
        } else {
          agent.replyFromAgent(`Model selected: ${model}`);
        }
        if (agent?.state?.pendingRoleModelReturnToRole) {
          agent.appendRoleCommandMessage('/role');
          agent.setState({ pendingReturnToRoleMenu: false, pendingModelFinalConfirm: false, pendingRoleModelReturnToRole: false }, () => agent.handleTriggers('/role', null));
          return;
        }
        await agent.finishAISetupFlow();
        return;
      }
      if (sub === 'back') {
        await agent.resetAISetupState();
        await agent.finishAISetupFlow();
        return;
      }


      if (sub === 'off' || sub === 'clear') {
        await agent.clearLLMConfig();
        await agent.clearActiveProvider();
        agent.replyFromAgent('Cloud model disabled.');
        return;
      }
      if (sub === 'add') {
        const name = String(parts[2] || '').toLowerCase();
        const baseUrl = String(parts[3] || '').trim().replace(/\/$/, '');
        const apiKey = parts[4] || '';
        if (!name || !/^https?:\/\//i.test(baseUrl)) {
          agent.replyFromAgent('Usage: /a add <provider> <url> [key]');
          return;
        }
        const custom = (await agent.readCustomRegistry()) || {};
        custom[name] = { ...(custom[name] || {}), label: name, baseUrl, apiKey, updatedAt: Date.now() };
        await agent.writeCustomRegistry(custom);
        await agent.renderAIProviderList();
        return;
      }
      if (sub === 'del') {
        const name = String(parts[2] || '').toLowerCase();
        if (!name || LLM_PROVIDERS[name]) {
          agent.replyFromAgent('Usage: /a del <provider>');
          return;
        }
        const custom = (await agent.readCustomRegistry()) || {};
        if (custom[name]) delete custom[name];
        await agent.writeCustomRegistry(custom);
        if (String(agent.state.llmConfig?.provider || agent.currentLLMConfig?.provider || '').toLowerCase() === name) {
          await agent.clearLLMConfig();
          await agent.clearActiveProvider();
        }
        await agent.renderAIProviderList();
        return;
      }

      agent.replyFromAgent('Unknown provider. Try: /a list');
    });

}
