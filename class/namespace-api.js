const HmacSHA256 = require('crypto-js/hmac-sha256');
const Hex = require('crypto-js/enc-hex');
const BlueApp = require('../BlueApp');
const AsyncStorageModule = require('@react-native-community/async-storage');
const AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
const { AppStorage } = require('./app-storage');
const TcpSocketModule = require('react-native-tcp-socket');
const TcpSocket = TcpSocketModule.default || TcpSocketModule;

// Satoshi namespace API follows the currently selected ElectrumX node.
// Nova serves Satoshi and Model API from the unified PHP dashboard port.
const DEFAULT_NAMESPACE_API_HOST = '192.168.1.215';
const NAMESPACE_API_PATH = '/satoshi.php';
export const NAMESPACE_API_URL = buildNamespaceApiUrl(DEFAULT_NAMESPACE_API_HOST);

// Must match APP_SHARED_SECRET in namespace_api.php.
// This is only an app anti-abuse secret. Do not treat it as strong security.
const NAMESPACE_APP_SECRET = 'SATOSHIxKEVA';
const DEVICE_ID_STORAGE_KEY = 'namespace_api_device_id_v1';
const LAST_NAMESPACE_RESULT_PREFIX = 'namespace_api_last_result_';

function makeWeakUuid() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export async function getNamespaceDeviceId() {
  let deviceId = await BlueApp.getItemStorage(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = makeWeakUuid();
    await BlueApp.setItemStorage(DEVICE_ID_STORAGE_KEY, deviceId);
  }
  return deviceId;
}



function normalizeNamespaceApiHost(hostValue) {
  const raw = String(hostValue || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') return DEFAULT_NAMESPACE_API_HOST;
  const withoutProtocol = raw.replace(/^https?:\/\//i, '').split('/')[0];
  const withoutPort = withoutProtocol.replace(/:\d+$/, '').trim();
  return withoutPort || DEFAULT_NAMESPACE_API_HOST;
}

function isLocalNamespaceApiHost(host) {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(String(host || ''));
}

function buildNamespaceApiUrl(hostValue) {
  const host = normalizeNamespaceApiHost(hostValue);
  const local = isLocalNamespaceApiHost(host);
  const protocol = local ? 'http' : 'https';
  const port = local ? ':8787' : '';
  return `${protocol}://${host}${port}${NAMESPACE_API_PATH}`;
}

export async function getNamespaceApiUrl() {
  const selectedHost = await AsyncStorage.getItem(AppStorage.ELECTRUM_HOST);
  return buildNamespaceApiUrl(selectedHost || DEFAULT_NAMESPACE_API_HOST);
}

export async function getNamespaceApiUrls() {
  const primary = await getNamespaceApiUrl();
  return [primary].filter(Boolean);
}

async function tryNamespaceApiUrls(operation, label) {
  const urls = await getNamespaceApiUrls();
  let lastError = null;
  for (const namespaceApiUrl of urls) {
    try {
      return await operation(namespaceApiUrl);
    } catch (error) {
      lastError = error;
      if (error?.namespaceApiApplicationError) {
        throw error;
      }
      console.warn(`Namespace API ${label || 'request'} failed for ${namespaceApiUrl}`, error);
    }
  }
  throw lastError || new Error('Namespace API request failed');
}

function parseHttpUrl(url) {
  const match = String(url || '').match(/^http:\/\/([^\/:?#]+)(?::(\d+))?([^?#]*)(\?[^#]*)?/);
  if (!match) return null;
  return {
    host: match[1],
    port: match[2] ? Number(match[2]) : 80,
    path: `${match[3] || '/'}${match[4] || ''}`,
  };
}

function tcpHttpRequest(url, options = {}) {
  const parsed = parseHttpUrl(url);
  if (!parsed) return Promise.reject(new Error('Unsupported TCP fallback URL'));

  const method = String(options.method || 'GET').toUpperCase();
  const body = options.body || '';
  const headers = Object.assign({}, options.headers || {});
  if (body && !headers['Content-Length']) headers['Content-Length'] = String(body.length);
  if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  return new Promise((resolve, reject) => {
    let raw = '';
    let settled = false;
    const socket = TcpSocket.createConnection({ host: parsed.host, port: parsed.port, timeout: 10000 }, () => {
      const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
      socket.write([
        `${method} ${parsed.path} HTTP/1.1`,
        `Host: ${parsed.host}`,
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
      const responseBody = split >= 0 ? raw.slice(split + 4) : raw;
      const statusMatch = head.match(/^HTTP\/\d(?:\.\d)?\s+(\d+)/);
      const status = statusMatch ? Number(statusMatch[1]) : 0;
      resolve({
        ok: status >= 200 && status < 300,
        status,
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
    socket.setTimeout(15000, () => {
      if (!settled) {
        settled = true;
        try { socket.destroy(); } catch (_) {}
        reject(new Error('Namespace TCP request timeout'));
      }
    });
  });
}

async function namespaceFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (error) {
    return tcpHttpRequest(url, options);
  }
}

function buildVerify(address, deviceId, ts, nonce) {
  const message = `${address}|${deviceId}|${ts}|${nonce}`;
  return HmacSHA256(message, NAMESPACE_APP_SECRET).toString(Hex);
}

async function readJsonResponse(response) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Namespace API returned non-JSON response: ${text.slice(0, 160)}`);
  }
  if (!response.ok || json.ok === false) {
    const error = new Error(json.message || json.status || `Namespace API error: ${response.status}`);
    error.namespaceApiStatus = json.status || '';
    error.namespaceApiHttpStatus = response.status;
    error.namespaceApiApplicationError = !!json.status && !['not_found', 'server_error'].includes(String(json.status));
    throw error;
  }
  return json;
}

export async function requestServerNamespace(address, appVersion = '1.0.0') {
  const deviceId = await getNamespaceDeviceId();

  return tryNamespaceApiUrls(async namespaceApiUrl => {
    const nonceUrl = `${namespaceApiUrl}?action=nonce&device_id=${encodeURIComponent(deviceId)}`;
    const nonceResponse = await namespaceFetch(nonceUrl, { method: 'GET' });
    const nonceJson = await readJsonResponse(nonceResponse);

    const ts = Math.floor(Date.now() / 1000);
    const nonce = nonceJson.nonce;
    const verify = buildVerify(address, deviceId, ts, nonce);

    const requestResponse = await namespaceFetch(namespaceApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        device_id: deviceId,
        app_version: appVersion,
        ts,
        nonce,
        verify,
      }),
    });
    const result = await readJsonResponse(requestResponse);

    if (result.status === 'sent' || result.status === 'already_sent') {
      await BlueApp.setItemStorage(`${LAST_NAMESPACE_RESULT_PREFIX}${address}`, JSON.stringify(result));
    }

    return result;
  }, 'namespace request');
}

export async function getServerBlockHeight() {
  return tryNamespaceApiUrls(async namespaceApiUrl => {
    const url = `${namespaceApiUrl}?action=block_height`;
    const response = await namespaceFetch(url, { method: 'GET' });
    const result = await readJsonResponse(response);
    const height = Number(result.height || result.block_height || result.blocks || 0);
    if (!Number.isFinite(height) || height <= 0) {
      throw new Error('Namespace API returned invalid block height');
    }
    return height;
  }, 'block height');
}

export async function getServerNamespaceStatus(address) {
  return tryNamespaceApiUrls(async namespaceApiUrl => {
    const url = `${namespaceApiUrl}?action=status&address=${encodeURIComponent(address)}`;
    const response = await namespaceFetch(url, { method: 'GET' });
    const result = await readJsonResponse(response);

    if (result.status === 'sent' || result.status === 'already_sent') {
      await BlueApp.setItemStorage(`${LAST_NAMESPACE_RESULT_PREFIX}${address}`, JSON.stringify(result));
    }

    return result;
  }, 'namespace status');
}

export async function getCachedServerNamespaceResult(address) {
  const raw = await BlueApp.getItemStorage(`${LAST_NAMESPACE_RESULT_PREFIX}${address}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}
