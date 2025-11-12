// HomeScreen.js (clean, no debug toolbar)
import React, { useRef, useCallback } from 'react';
import { View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from 'react-navigation-hooks';
import BlueElectrum from './BlueElectrum';

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

      if (parsedMessage.type === 'getagents_latest_block_request') {
        try {
          await BlueElectrum.waitTillConnected();
          const heightValue = await BlueElectrum.blockchainBlock_count();
          const latestHeight = Number(heightValue);
          if (!Number.isFinite(latestHeight)) {
            throw new Error('Invalid block height from Electrum');
          }

          const headerPromise = BlueElectrum.blockchainBlock_getHeader(latestHeight);
          const configPromise = BlueElectrum.getConfig().catch(() => null);
          const header = await headerPromise;
          const electrumConfig = await configPromise;

          const pickNumeric = value => {
            if (typeof value === 'number') {
              return value;
            }
            if (typeof value === 'string') {
              const parsed = Number(value);
              if (Number.isFinite(parsed)) {
                return parsed;
              }
            }
            return null;
          };

          let timestamp = null;
          if (header && typeof header === 'object') {
            timestamp = pickNumeric(header.timestamp);
            if (!Number.isFinite(timestamp)) {
              timestamp = pickNumeric(header.time);
            }
          }

          if (!Number.isFinite(timestamp) && typeof BlueElectrum.calculateBlockTime === 'function') {
            const fallbackTs = BlueElectrum.calculateBlockTime(latestHeight);
            if (Number.isFinite(fallbackTs)) {
              timestamp = fallbackTs;
            }
          }

          if (!Number.isFinite(timestamp)) {
            throw new Error('Invalid block timestamp from Electrum');
          }

          sendMessageToWebView({
            type: 'getagents_latest_block_response',
            payload: {
              height: latestHeight,
              timestamp: timestamp,
              electrum: electrumConfig,
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
    [navigation, sendMessageToWebView],
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
