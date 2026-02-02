import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/i18n';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import { COLORS } from './src/theme/colors';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MainScreen from './src/screens/MainScreen';
import VaultScreen from './src/screens/VaultScreen';
import AssetDetailScreen from './src/screens/AssetDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  const [languageSet, setLanguageSet] = useState<boolean | null>(null);

  useEffect(() => {
    checkLanguage();
  }, []);

  const checkLanguage = async () => {
    const savedLanguage = await AsyncStorage.getItem('user-language');
    setLanguageSet(!!savedLanguage);
  };

  const handleLanguageSelect = async (lng: string) => {
    await AsyncStorage.setItem('user-language', lng);
    setLanguageSet(true);
  };

  if (languageSet === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!languageSet ? (
          <Stack.Screen name="LanguageSelect">
            {(props) => <LanguageSelectionScreen {...props} onSelect={handleLanguageSelect} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Vault" component={VaultScreen} />
            <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
