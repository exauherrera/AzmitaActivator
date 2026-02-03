import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
    require('react-native-get-random-values');
    const { Buffer } = require('buffer');
    const process = require('process');
    require('fast-text-encoding');

    global.Buffer = global.Buffer || Buffer;
    global.process = global.process || process;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
