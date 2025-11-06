// HomeScreen.js (clean, no debug toolbar)
import React, { useRef } from 'react';
import { View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from 'react-navigation-hooks';

export default function HomeScreen() {
  const navigation = useNavigation();
  const webviewRef = useRef(null);

  const handleMessage = (event) => {
    const msg = event.nativeEvent && event.nativeEvent.data;
    if (msg === 'open_wallet') {
      navigation.navigate('Wallets');
    } else if (msg === 'open_agents') {
      // 保留兼容：如果页面发消息，仍可跳 Agents 屏（目前不需要触发）
      navigation.navigate('Agents');
    } else if (msg === 'open_readme') {
      navigation.navigate('Readme');
    }
  };

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
