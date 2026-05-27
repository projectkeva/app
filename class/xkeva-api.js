const AsyncStorageModule = require('@react-native-community/async-storage');
const AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
const { AppStorage } = require('./app-storage');

// Model API follows the currently selected ElectrumX node.
const DEFAULT_XKEVA_API_HOST = '192.168.1.215';
const XKEVA_API_PATH = '/model.php/v1';
const LOCAL_XKEVA_MODEL_API_PORT = ':8787';
export const XKEVA_APP_TOKEN = 'xkeva-app-6dePwYvMegxVGoCOfTNGz6Gh3cgwxFjLr-ps2KRPvBo';

export const XKEVA_API_URL = buildXkevaApiUrl(DEFAULT_XKEVA_API_HOST);

function normalizeXkevaApiHost(hostValue) {
  const raw = String(hostValue || '').trim();
  if (!raw || raw === 'undefined' || raw === 'null') return DEFAULT_XKEVA_API_HOST;
  const withoutProtocol = raw.replace(/^https?:\/\//i, '').split('/')[0];
  const withoutPort = withoutProtocol.replace(/:\d+$/, '').trim();
  return withoutPort || DEFAULT_XKEVA_API_HOST;
}

function isLocalXkevaApiHost(host) {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(String(host || ''));
}

export function buildXkevaApiUrl(hostValue) {
  const host = normalizeXkevaApiHost(hostValue);
  const local = isLocalXkevaApiHost(host);
  const protocol = local ? 'http' : 'https';
  const port = local ? LOCAL_XKEVA_MODEL_API_PORT : '';
  return `${protocol}://${host}${port}${XKEVA_API_PATH}`;
}

export async function getXkevaApiUrl() {
  const selectedHost = normalizeXkevaApiHost(await AsyncStorage.getItem(AppStorage.ELECTRUM_HOST));
  return buildXkevaApiUrl(selectedHost || DEFAULT_XKEVA_API_HOST);
}

export async function getXkevaApiUrls() {
  const primary = await getXkevaApiUrl();
  return [primary].filter(Boolean);
}
