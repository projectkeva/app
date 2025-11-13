import React, { useRef, useCallback } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import BlueElectrum from './BlueElectrum';
import { handleGetAgentsNamespaceRequest } from './GetAgentsNamespace';

const ANDROID_GETAGENTS_SOURCE = { uri: 'file:///android_asset/os/getagents.html' };
const IOS_GETAGENTS_SOURCE = { uri: 'getagents.html' };

export default function AgentsScreen() {
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
      console.warn('AgentsScreen: failed to deliver message to WebView', error);
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

      if (!parsed) {
        return;
      }

      if (parsed.type === 'getagents_create_namespace') {
        try {
          await handleNamespaceCreationRequest(parsed);
        } catch (error) {
          console.warn('AgentsScreen: failed to handle namespace creation request', error);
        }
        return;
      }

      if (parsed.type !== 'getagents_latest_block_request') {
        return;
      }

      try {
        const latestHeader = await BlueElectrum.getLatestHeaderSimple();
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
          },
        });
      } catch (error) {
        console.warn('AgentsScreen: failed to fetch latest block info', error);
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
