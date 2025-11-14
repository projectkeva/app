import React, { useCallback, useRef } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { WebView } from 'react-native-webview';
import BlueElectrum from '../../BlueElectrum';
import BlueApp from '../../BlueApp';
import { handleGetAgentsNamespaceRequest } from '../../GetAgentsNamespace';

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
    [sendMessageToWebView, handleNamespaceCreationRequest],
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
