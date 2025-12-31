/**
 * Bottom Tab Navigator
 *
 * Main navigation structure with 4 tabs:
 * - Explore (Home/Discovery)
 * - Plan (Trip Itinerary)
 * - Live (Field Guardian - Full Screen)
 * - Me (Profile/Settings)
 */

import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { ExploreScreen } from '../screens/ExploreScreen';
import { PlannerScreen } from '../screens/PlannerScreen';
import { LiveScreen } from '../screens/LiveScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Theme
import { colors, spacing } from '../theme/tokens';

// Types
import { Destination } from '../data/destinations';

/**
 * Navigation Types
 */
export type RootTabParamList = {
  Explore: undefined;
  Planner: { destination?: Destination } | undefined;
  Live: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Tab Icon Configuration
 */
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<keyof RootTabParamList, { active: IconName; inactive: IconName }> = {
  Explore: { active: 'home', inactive: 'home-outline' },
  Planner: { active: 'calendar', inactive: 'calendar-outline' },
  Live: { active: 'compass', inactive: 'compass-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

/**
 * Tab Bar Icon Component
 */
function TabBarIcon({
  routeName,
  focused,
  color,
  size,
}: {
  routeName: keyof RootTabParamList;
  focused: boolean;
  color: string;
  size: number;
}) {
  const iconConfig = tabIcons[routeName];
  const iconName = focused ? iconConfig.active : iconConfig.inactive;

  return <Ionicons name={iconName} size={size} color={color} />;
}

/**
 * Bottom Tab Navigator Component
 */
export function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Tab Bar Style
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.borderLight,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: spacing.xs,
          height: 49 + insets.bottom,
          paddingBottom: insets.bottom,
        },

        // Tab Bar Item Style
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },

        // Tab Bar Icon
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon
            routeName={route.name as keyof RootTabParamList}
            focused={focused}
            color={color}
            size={size}
          />
        ),

        // Header Style
        headerStyle: {
          backgroundColor: colors.surface,
          ...Platform.select({
            ios: {
              shadowColor: colors.border,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            },
            android: {
              elevation: 2,
            },
          }),
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
      })}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          headerShown: false, // Custom header in screen
        }}
      />
      <Tab.Screen
        name="Planner"
        component={PlannerScreen}
        options={{
          title: 'Plan',
          headerShown: false, // Custom header in screen
        }}
      />
      <Tab.Screen
        name="Live"
        component={LiveScreen}
        options={{
          title: 'Hike',
          headerShown: false, // Full screen mode
          tabBarStyle: { display: 'none' }, // Hide tab bar in Live mode
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Me',
          headerShown: false, // Custom header in screen
        }}
      />
    </Tab.Navigator>
  );
}

export default BottomTabNavigator;
