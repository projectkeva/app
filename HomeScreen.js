// HomeScreen.js (clean, no debug toolbar)
import React, { useCallback } from 'react';
import { View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from 'react-navigation-hooks';

export default function HomeScreen() {
  const navigation = useNavigation();

  const handleMessage = useCallback(
    event => {
      const msg = event.nativeEvent && event.nativeEvent.data;
      if (!msg) {
        return;
      }

      if (msg === 'open_wallet') {
        navigation.navigate('Wallets');
        return;
      } else if (msg === 'open_agents' || msg === 'open_getagents') {
        navigation.navigate('GetAgents');
        return;
      } else if (msg === 'open_readme') {
        navigation.navigate('Readme');
        return;
      }

      // legacy structured messages are ignored now that Get Agents runs as a native screen
    },
    [navigation],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <WebView
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
