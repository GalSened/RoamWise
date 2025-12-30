/**
 * RoamWise Mobile App - Root Component
 *
 * React Native (Expo) application entry point with navigation setup.
 * Implements bottom tab navigation with 4 main screens.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabNavigator } from './navigation/BottomTabNavigator';
import { colors } from './theme/tokens';

/**
 * Navigation theme configuration
 */
const navigationTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

/**
 * App Root Component
 *
 * Sets up:
 * - SafeAreaProvider for notch/home indicator handling
 * - NavigationContainer for React Navigation
 * - Bottom Tab Navigator with 4 screens
 * - Status bar configuration
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />
      <NavigationContainer theme={navigationTheme}>
        <BottomTabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
