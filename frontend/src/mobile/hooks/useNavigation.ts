/**
 * Custom Navigation Hooks
 *
 * Helpers for navigation flows between screens:
 * - Explore → Planner: Auto-navigate when destination selected
 * - Planner → Live: Start navigation with Waze deep-link
 * - Live → Profile: End hike and view summary
 */

import { useCallback } from 'react';
import { useNavigation as useNativeNavigation } from '@react-navigation/native';
import { Linking } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/BottomTabNavigator';

type TabNavigationProp = BottomTabNavigationProp<RootTabParamList>;

/**
 * Custom navigation hook with helper functions
 */
export function useAppNavigation() {
  const navigation = useNativeNavigation<TabNavigationProp>();

  /**
   * Navigate to Planner tab with optional destination
   */
  const navigateToPlanner = useCallback(
    (destinationId?: string) => {
      navigation.navigate('Planner');
      // In a real app, you'd pass the destination through route params or context
    },
    [navigation]
  );

  /**
   * Navigate to Live tab (Field Guardian mode)
   */
  const navigateToLive = useCallback(() => {
    navigation.navigate('Live');
  }, [navigation]);

  /**
   * Navigate to Profile tab
   */
  const navigateToProfile = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  /**
   * Navigate to Explore tab
   */
  const navigateToExplore = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  /**
   * Start navigation with Waze deep-link and switch to Live mode
   */
  const startNavigation = useCallback(
    async (lat: number, lon: number) => {
      const wazeUrl = `waze://?ll=${lat},${lon}&navigate=yes`;
      const googleMapsUrl = `https://maps.google.com/?daddr=${lat},${lon}`;

      try {
        const canOpenWaze = await Linking.canOpenURL(wazeUrl);

        if (canOpenWaze) {
          await Linking.openURL(wazeUrl);
        } else {
          await Linking.openURL(googleMapsUrl);
        }

        // Switch to Live mode after opening navigation
        navigation.navigate('Live');
      } catch (error) {
        console.error('Failed to open navigation:', error);
        // Fallback to Google Maps in browser
        await Linking.openURL(googleMapsUrl);
        navigation.navigate('Live');
      }
    },
    [navigation]
  );

  /**
   * End hike and navigate to profile with summary
   */
  const endHike = useCallback(() => {
    navigation.navigate('Profile');
    // In a real app, you'd pass the hike summary through context or state
  }, [navigation]);

  return {
    navigation,
    navigateToPlanner,
    navigateToLive,
    navigateToProfile,
    navigateToExplore,
    startNavigation,
    endHike,
  };
}

export default useAppNavigation;
