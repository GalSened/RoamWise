/**
 * Bottom Tab Navigator
 *
 * Main navigation structure with 5 tabs:
 * - Home (Dynamic Dashboard with 5 user states)
 * - Plan (Trip Itinerary)
 * - Chat (AI Travel Assistant)
 * - Live (Field Guardian - Full Screen)
 * - Me (Profile/Settings)
 */

import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { PlannerScreen } from '../screens/PlannerScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { LiveScreen } from '../screens/LiveScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// User State Provider
import { UserStateProvider, TripInfo } from '../components/home';

// Theme
import { colors, spacing } from '../theme/tokens';

// Types
import { Destination } from '../data/destinations';

/**
 * Navigation Types
 */
export type RootTabParamList = {
  Home: undefined;
  Planner: { destination?: Destination } | undefined;
  Chat: { initialMessage?: string; tripContext?: any } | undefined;
  Live: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Tab Icon Configuration
 */
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<keyof RootTabParamList, { active: IconName; inactive: IconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Planner: { active: 'calendar', inactive: 'calendar-outline' },
  Chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Live: { active: 'compass', inactive: 'compass-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

/**
 * Mock trip data for demo (would come from API/store in real app)
 */
const mockTrips: TripInfo[] = [
  // Uncomment different scenarios to test different user states:

  // NewUser: No trips
  // (empty array)

  // PlannedTrip: Upcoming trip
  // {
  //   id: '1',
  //   name: 'חופשת קיץ',
  //   destination: 'ברצלונה',
  //   startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  //   endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
  //   status: 'planned',
  //   coverImage: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
  //   daysCount: 5,
  //   activitiesCount: 15,
  // },

  // ActiveTrip: Currently on trip
  // {
  //   id: '2',
  //   name: 'סיור בפריז',
  //   destination: 'פריז',
  //   startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
  //   endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  //   status: 'active',
  //   coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  //   daysCount: 5,
  //   activitiesCount: 20,
  // },

  // PostTrip: Just returned (within 7 days)
  // {
  //   id: '3',
  //   name: 'טיול ברומא',
  //   destination: 'רומא',
  //   startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  //   endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Ended 3 days ago
  //   status: 'completed',
  //   coverImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
  //   daysCount: 7,
  //   activitiesCount: 25,
  // },

  // BetweenTrips: Has past trips, nothing upcoming
  // {
  //   id: '4',
  //   name: 'טיול בלונדון',
  //   destination: 'לונדון',
  //   startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  //   endDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // Ended 25 days ago
  //   status: 'completed',
  //   coverImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
  //   daysCount: 5,
  //   activitiesCount: 18,
  // },
];

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
    <UserStateProvider trips={mockTrips}>
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
          name="Home"
          component={HomeScreen}
          options={{
            title: 'בית',
            headerShown: false, // Custom header in screen
          }}
        />
        <Tab.Screen
          name="Planner"
          component={PlannerScreen}
          options={{
            title: 'תכנון',
            headerShown: false, // Custom header in screen
          }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'צ\'אט',
            headerShown: false, // Custom header in screen
          }}
        />
        <Tab.Screen
          name="Live"
          component={LiveScreen}
          options={{
            title: 'טיול',
            headerShown: false, // Full screen mode
            tabBarStyle: { display: 'none' }, // Hide tab bar in Live mode
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'אני',
            headerShown: false, // Custom header in screen
          }}
        />
      </Tab.Navigator>
    </UserStateProvider>
  );
}

export default BottomTabNavigator;
