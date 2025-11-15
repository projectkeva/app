import React, { useCallback, useRef } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSelector } from 'react-redux';
import BlueElectrum from '../../BlueElectrum';
import BlueApp from '../../BlueApp';
import { handleGetAgentsNamespaceRequest } from '../../GetAgentsNamespace';

function parseBlockHeightFromShortcode(shortCode) {
  if (shortCode === undefined || shortCode === null) {
    return null;
  }
  const normalized = String(shortCode).trim();
  if (!/^[0-9]+$/.test(normalized) || normalized.length < 2) {
    return null;
  }
  const heightDigits = parseInt(normalized[0], 10);
  if (!Number.isFinite(heightDigits) || heightDigits <= 0 || normalized.length <= heightDigits) {
    return null;
  }
  const blockSlice = normalized.slice(1, 1 + heightDigits);
  const blockHeight = parseInt(blockSlice, 10);
  if (!Number.isFinite(blockHeight)) {
    return null;
  }
  return blockHeight;
}

let pendingWalletRefreshPromise = null;

async function refreshWalletDataForUnconfirmedCount() {
  if (pendingWalletRefreshPromise) {
    return pendingWalletRefreshPromise;
  }

  pendingWalletRefreshPromise = (async () => {
    const wallets = typeof BlueApp.getWallets === 'function' ? BlueApp.getWallets() : [];
    if (!Array.isArray(wallets) || wallets.length === 0) {
      return;
    }

    await Promise.all(
      wallets.map(async wallet => {
        if (!wallet) {
          return;
        }

        if (typeof wallet.fetchBalance === 'function') {
          try {
            await wallet.fetchBalance();
          } catch (error) {
            console.warn('GetAgentsScreen: failed to refresh wallet balance before counting unconfirmed tx', error);
          }
        }

        if (typeof wallet.fetchTransactions === 'function') {
          try {
            await wallet.fetchTransactions();
          } catch (error) {
            console.warn('GetAgentsScreen: failed to refresh wallet transactions before counting unconfirmed tx', error);
          }
        }
      }),
    );

    try {
      await BlueApp.saveToDisk();
    } catch (error) {
      console.warn('GetAgentsScreen: failed to persist wallet data after refresh', error);
    }
  })();

  try {
    await pendingWalletRefreshPromise;
  } finally {
    pendingWalletRefreshPromise = null;
  }
}

async function getUnconfirmedTransactionCount() {
  try {
    if (typeof BlueApp.waitForStart === 'function') {
      await BlueApp.waitForStart();
    }
  } catch (error) {
    console.warn('GetAgentsScreen: failed to wait for wallet start', error);
  }

  if (typeof BlueApp.getWallets !== 'function') {
    return 0;
  }

  try {
    await refreshWalletDataForUnconfirmedCount();
    return BlueApp.getWallets().reduce((total, wallet) => {
      if (!wallet || typeof wallet.getTransactions !== 'function') {
        return total;
      }
      const transactions = wallet.getTransactions() || [];
      const walletCount = transactions.reduce((count, tx) => {
        const confirmations = Number(tx && tx.confirmations);
        if (!Number.isFinite(confirmations) || confirmations <= 0) {
          return count + 1;
        }
        return count;
      }, 0);
      return total + walletCount;
    }, 0);
  } catch (error) {
    console.warn('GetAgentsScreen: failed to compute unconfirmed tx count', error);
    return 0;
  }
}

const ANDROID_GETAGENTS_SOURCE = { uri: 'file:///android_asset/os/getagents.html' };
const IOS_GETAGENTS_SOURCE = { uri: 'getagents.html' };

export default function GetAgentsScreen() {
  const webviewRef = useRef(null);
  const namespaceList = useSelector(state => state?.namespaceList);

  const getWalletShortcodeGroups = useCallback(() => {
    const namespaces = namespaceList && namespaceList.namespaces;
    if (!namespaces || typeof namespaces !== 'object') {
      return [];
    }

    const grouped = new Map();
    Object.values(namespaces).forEach(ns => {
      const shortCode = ns && typeof ns.shortCode !== 'undefined' ? ns.shortCode : null;
      const blockHeightForCode = parseBlockHeightFromShortcode(shortCode);
      if (!Number.isFinite(blockHeightForCode)) {
        return;
      }
      const normalized = String(shortCode);
      if (!grouped.has(blockHeightForCode)) {
        grouped.set(blockHeightForCode, new Set());
      }
      grouped.get(blockHeightForCode).add(normalized);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([blockHeight, shortcodes]) => ({
        blockHeight,
        shortcodes: Array.from(shortcodes),
      }));
  }, [namespaceList]);

  const sendMessageToWebView = useCallback(message => {
    const view = webviewRef.current;
    if (!view) {
      return;
    }

    try {
      const serialized = JSON.stringify(message);
      const escaped = serialized
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');
      const script = `
        (function() {
          const data = \`${escaped}\`;
          window.dispatchEvent(new MessageEvent('message', { data: data }));
          document.dispatchEvent(new MessageEvent('message', { data: data }));
        })();
        true;
      `;
      view.injectJavaScript(script);
    } catch (error) {
      console.warn('GetAgentsScreen: failed to send message to WebView', error);
    }
  }, []);

  const handleNamespaceCreationRequest = useCallback(
    request => handleGetAgentsNamespaceRequest(request, sendMessageToWebView),
    [sendMessageToWebView],
  );

  const handleMessage = useCallback(
    async event => {
      const payload = event?.nativeEvent?.data;
      if (!payload) {
        return;
      }

      let parsed;
      if (typeof payload === 'string') {
        try {
          parsed = JSON.parse(payload);
        } catch (error) {
          return;
        }
      } else if (typeof payload === 'object') {
        parsed = payload;
      }

      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      if (parsed.type === 'getagents_create_namespace') {
        try {
          await handleNamespaceCreationRequest(parsed);
        } catch (error) {
          console.warn('GetAgentsScreen: namespace creation failed', error);
        }
        return;
      }

      if (parsed.type !== 'getagents_latest_block_request') {
        return;
      }

      try {
        const [latestHeader, unconfirmedTxCount] = await Promise.all([
          BlueElectrum.getLatestHeaderSimple(),
          getUnconfirmedTransactionCount(),
        ]);
        const walletShortcodeGroups = getWalletShortcodeGroups();
        let electrumConfig = null;
        try {
          electrumConfig = await BlueElectrum.getConfig();
        } catch (_) {
          electrumConfig = null;
        }

        const electrumPayload = electrumConfig && typeof electrumConfig === 'object'
          ? { ...electrumConfig }
          : {};
        if (!electrumPayload.host) {
          electrumPayload.host = latestHeader.host;
        }
        if (!electrumPayload.ssl) {
          electrumPayload.ssl = electrumPayload.port || latestHeader.ssl;
        }

        sendMessageToWebView({
          type: 'getagents_latest_block_response',
          payload: {
            height: latestHeader.height,
            timestamp: latestHeader.timestamp,
            electrum: electrumPayload,
            unconfirmedTxCount,
            walletAgents: {
              referenceBlockHeight: latestHeader.height,
              groups: walletShortcodeGroups,
            },
          },
        });
      } catch (error) {
        console.warn('GetAgentsScreen: failed to fetch latest block info', error);
        sendMessageToWebView({
          type: 'getagents_latest_block_error',
          error: (error && error.message) || String(error),
        });
      }
    },
    [sendMessageToWebView, handleNamespaceCreationRequest, getWalletShortcodeGroups],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <WebView
        ref={webviewRef}
        source={Platform.OS === 'android' ? ANDROID_GETAGENTS_SOURCE : IOS_GETAGENTS_SOURCE}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onMessage={handleMessage}
      />
    </View>
  );
}

GetAgentsScreen.navigationOptions = () => ({
  title: 'Get Agents',
  headerShown: false,
});
