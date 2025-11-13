// HomeScreen.js (clean, no debug toolbar)
import React, { useRef, useCallback } from 'react';
import { View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from 'react-navigation-hooks';
import BlueElectrum from './BlueElectrum';
import { handleGetAgentsNamespaceRequest } from './GetAgentsNamespace';

export default function HomeScreen() {
  const navigation = useNavigation();
  const webviewRef = useRef(null);

  const sendMessageToWebView = useCallback(payload => {
    const view = webviewRef.current;
    if (!view) {
      return;
    }

    try {
      const serialized = JSON.stringify(payload);
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
      console.warn('Failed to serialize message for WebView', error);
    }
  }, []);

  const handleNamespaceCreationRequest = useCallback(
    request => handleGetAgentsNamespaceRequest(request, sendMessageToWebView),
    [sendMessageToWebView],
  );

  const handleMessage = useCallback(
    async event => {
      const msg = event.nativeEvent && event.nativeEvent.data;
      if (!msg) {
        return;
      }

      if (msg === 'open_wallet') {
        navigation.navigate('Wallets');
        return;
      } else if (msg === 'open_agents') {
        navigation.navigate('Agents');
        return;
      } else if (msg === 'open_readme') {
        navigation.navigate('Readme');
        return;
      }

      let parsedMessage = null;
      if (typeof msg === 'string') {
        try {
          parsedMessage = JSON.parse(msg);
        } catch (error) {
          return;
        }
      } else if (typeof msg === 'object' && msg !== null) {
        parsedMessage = msg;
      }

      if (!parsedMessage || typeof parsedMessage !== 'object') {
        return;
      }

      if (parsedMessage.type === 'getagents_create_namespace') {
        try {
          await handleNamespaceCreationRequest(parsedMessage);
        } catch (error) {
          console.warn('Failed to handle namespace creation request', error);
        }
        return;
      }

      if (parsedMessage.type === 'getagents_latest_block_request') {
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
          console.warn('Failed to provide Get Agents Electrum data', error);
          sendMessageToWebView({
            type: 'getagents_latest_block_error',
            error: (error && error.message) || String(error),
          });
        }
      }
    },
    [navigation, sendMessageToWebView, handleNamespaceCreationRequest],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <WebView
        ref={webviewRef}
        source={{ uri: 'file:///android_asset/os/index.html' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        onMessage={handleMessage}
        mixedContentMode="always"
      />
    </View>
  );
}
