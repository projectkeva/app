import 'intl';
import 'intl/locale-data/jsonp/en';
import './shim.js';

// Guard missing Node shims used by some libs
if (typeof global.process === 'undefined') {
  // @ts-ignore
  global.process = {};
}
// Ensure process.version is a string so code calling slice() won't crash
if (typeof global.process.version !== 'string') {
  global.process.version = '0.0.0';
}

import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

const Root = () => <App />;

AppRegistry.registerComponent(appName, () => Root);
