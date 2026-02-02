import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/i18n';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import { COLORS } from './src/theme/colors';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts, Orbitron_900Black, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

import MainScreen from './src/screens/MainScreen';
import VaultScreen from './src/screens/VaultScreen';
import AssetDetailScreen from './src/screens/AssetDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: COLORS.cardBlack,
        borderTopColor: COLORS.glassBorder,
        borderTopWidth: 1,
        height: 70,
        paddingBottom: 10,
      },
      tabBarActiveTintColor: COLORS.azmitaRed,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarLabelStyle: {
        fontFamily: 'Inter_700Bold',
        fontSize: 10,
        letterSpacing: 1,
      }
    }}
  >
    <Tab.Screen name="Home" component={MainScreen} />
    <Tab.Screen name="Vault" component={VaultScreen} />
  </Tab.Navigator>
);

export default function App() {
  const [languageSet, setLanguageSet] = useState<boolean | null>(null);

  let [fontsLoaded] = useFonts({
    Orbitron_900Black,
    Orbitron_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });

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

  if (!fontsLoaded || languageSet === null) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.deepMaroon, justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.azmitaRed} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!languageSet ? (
          <Stack.Screen name="LanguageSelect">
            {(props) => <LanguageSelectionScreen {...props} onSelect={handleLanguageSelect} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="TabNav" component={TabNavigator} />
            <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
