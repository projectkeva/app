import React from 'react';
import { View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ReadmeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <WebView
        source={{ uri: 'file:///android_asset/os/readme.html' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
}
