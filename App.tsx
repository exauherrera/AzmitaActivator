import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/i18n';
import { useTranslation } from 'react-i18next';
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
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import NfcInspectorScreen from './src/screens/NfcInspectorScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.cardBlack,
          borderTopColor: COLORS.glassBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 75 : 85, // Adjust for premium look
          paddingBottom: Platform.OS === 'android' ? 15 : 30, // Default padding, safe area will add more if needed
        },
        tabBarActiveTintColor: COLORS.azmitaRed,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontFamily: 'Inter_700Bold',
          fontSize: 10,
          letterSpacing: 1,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = 'scan-outline';
          else if (route.name === 'Vault') iconName = 'wallet-outline';
          else if (route.name === 'Inspector') iconName = 'search-outline';
          else if (route.name === 'Settings') iconName = 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={MainScreen} options={{ tabBarLabel: t('azmitar') }} />
      <Tab.Screen name="Vault" component={VaultScreen} options={{ tabBarLabel: t('vault') }} />
      <Tab.Screen name="Inspector" component={NfcInspectorScreen} options={{ tabBarLabel: t('inspector') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('settings') }} />
    </Tab.Navigator>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [languageSet, setLanguageSet] = useState<boolean | null>(null);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  let [fontsLoaded] = useFonts({
    Orbitron_900Black,
    Orbitron_700Bold,
    Inter_400Regular,
    Inter_700Bold,
  });

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    const savedLanguage = await AsyncStorage.getItem('user-language');
    const savedOnboarding = await AsyncStorage.getItem('onboarding-done');
    setLanguageSet(!!savedLanguage);
    setOnboardingDone(!!savedOnboarding);
  };

  const handleLanguageSelect = async (lng: string) => {
    await AsyncStorage.setItem('user-language', lng);
    setLanguageSet(true);
  };

  const handleOnboardingFinish = async () => {
    await AsyncStorage.setItem('onboarding-done', 'true');
    setOnboardingDone(true);
  };

  if (!fontsLoaded || languageSet === null || onboardingDone === null) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.deepMaroon, justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.azmitaRed} size="large" />
      </View>
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!languageSet) {
    return <LanguageSelectionScreen onSelect={handleLanguageSelect} />;
  }

  if (!onboardingDone) {
    return <OnboardingScreen onFinish={handleOnboardingFinish} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="TabNav" component={TabNavigator} />
          <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
