/**
 * ProfileScreen - Tab 4 (User Profile/Memories)
 *
 * User profile and settings with:
 * - Profile header with avatar and level
 * - Stats board (distance, trips, days)
 * - Trip log with real data from history
 * - Settings section with persistent toggles
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';
import { haptics } from '../utils/haptics';
import { useToast } from '../components/ui';
import { ProfileManager } from '../features/profile';
import type { ProfileStats, UserPreferences, CompletedTrip } from '../features/profile/types';

/**
 * Format minutes to human-readable duration
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format ISO date string to readable format
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Profile Header Component
 */
function ProfileHeader({
  displayName,
  levelTitle,
}: {
  displayName: string;
  levelTitle: string;
}) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={50} color={colors.textTertiary} />
        </View>
        <TouchableOpacity style={styles.avatarEdit}>
          <Ionicons name="camera" size={16} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
      <Text style={styles.userName}>{displayName}</Text>
      <Text style={styles.userTagline}>{levelTitle} 🏔️</Text>
    </View>
  );
}

/**
 * Stats Board Component
 */
function StatsBoard({ stats }: { stats: ProfileStats }) {
  const displayStats = [
    {
      id: 'distance',
      value: stats.totalDistanceKm.toFixed(1),
      unit: 'km',
      label: 'walked',
    },
    {
      id: 'days',
      value: String(stats.totalDaysInNature),
      unit: '',
      label: 'days in nature',
    },
    {
      id: 'trips',
      value: String(stats.totalTrips),
      unit: '',
      label: 'trips complete',
    },
  ];

  return (
    <View style={styles.statsBoard}>
      {displayStats.map((stat, index) => (
        <React.Fragment key={stat.id}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stat.value}
              {stat.unit && <Text style={styles.statUnit}> {stat.unit}</Text>}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
          {index < displayStats.length - 1 && <View style={styles.statDivider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * Trip Card Component
 */
function TripCard({ trip }: { trip: CompletedTrip }) {
  return (
    <TouchableOpacity style={styles.tripCard}>
      <View style={styles.tripImagePlaceholder}>
        <Ionicons name="image" size={30} color={colors.textTertiary} />
      </View>
      <View style={styles.tripInfo}>
        <Text style={styles.tripTitle}>{trip.name}</Text>
        <Text style={styles.tripDate}>{formatDate(trip.date)}</Text>
        <View style={styles.tripMeta}>
          <Text style={styles.tripMetaText}>{trip.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.tripMetaDot}>•</Text>
          <Text style={styles.tripMetaText}>{formatDuration(trip.durationMinutes)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

/**
 * Animated Empty State with bouncing footsteps
 */
function AnimatedEmptyState() {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Continuous bounce
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -12,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();

    return () => bounce.stop();
  }, [bounceAnim, fadeAnim]);

  return (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
        <Ionicons name="footsteps" size={64} color={colors.primary} />
      </Animated.View>
      <Text style={styles.emptyStateText}>Your journey awaits</Text>
      <Text style={styles.emptyStateSubtext}>
        Complete your first hike to start your trail log!
      </Text>
    </Animated.View>
  );
}

/**
 * Trip Log Section
 */
function TripLog({ history }: { history: CompletedTrip[] }) {
  // Show only the first 4 trips
  const displayedTrips = history.slice(0, 4);

  if (history.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="camera" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Trip Log</Text>
        </View>
        <AnimatedEmptyState />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="camera" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Trip Log</Text>
        {history.length > 4 && (
          <TouchableOpacity>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      {displayedTrips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </View>
  );
}

/**
 * Toggle Setting Component with haptic feedback
 */
function ToggleSetting({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const handleValueChange = (newValue: boolean) => {
    haptics.impact('light');
    onValueChange(newValue);
  };

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={handleValueChange}
        trackColor={{ false: colors.borderLight, true: colors.success }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.borderLight}
      />
    </View>
  );
}

/**
 * Selector Setting Component with haptic feedback
 */
function SelectorSetting({
  label,
  options,
  selected,
  onValueChange,
}: {
  label: string;
  options: string[];
  selected: string;
  onValueChange?: (value: string) => void;
}) {
  const [currentSelected, setCurrentSelected] = useState(selected);

  const handleSelect = (option: string) => {
    if (option !== currentSelected) {
      haptics.impact('light');
      setCurrentSelected(option);
      onValueChange?.(option);
    }
  };

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.selectorContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.selectorOption,
              currentSelected === option && styles.selectorOptionSelected,
            ]}
            onPress={() => handleSelect(option)}
          >
            <Text
              style={[
                styles.selectorOptionText,
                currentSelected === option && styles.selectorOptionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/**
 * Dropdown Setting Component
 */
function DropdownSetting({ label, value }: { label: string; value: string }) {
  return (
    <TouchableOpacity style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.dropdownValue}>
        <Text style={styles.dropdownValueText}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Settings Section Component
 */
function SettingsSection({
  preferences,
  onPreferenceChange,
}: {
  preferences: UserPreferences;
  onPreferenceChange: (key: keyof UserPreferences, value: boolean | string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Settings</Text>
      </View>

      {/* Hiking Preferences */}
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>HIKING PREFERENCES</Text>
        <View style={styles.settingsCard}>
          <ToggleSetting
            label="Vegetarian-Friendly"
            value={preferences.vegetarian}
            onValueChange={(v) => onPreferenceChange('vegetarian', v)}
          />
          <View style={styles.settingDivider} />
          <ToggleSetting
            label="Avoid Stairs"
            value={preferences.avoidStairs}
            onValueChange={(v) => onPreferenceChange('avoidStairs', v)}
          />
          <View style={styles.settingDivider} />
          <SelectorSetting
            label="Pace"
            options={['slow', 'moderate', 'fast']}
            selected={preferences.walkingPace}
          />
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>NOTIFICATIONS</Text>
        <View style={styles.settingsCard}>
          <ToggleSetting
            label="Push Notifications"
            value={preferences.notifications}
            onValueChange={(v) => onPreferenceChange('notifications', v)}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * ProfileScreen Main Component
 */
export function ProfileScreen() {
  const { show: showToast } = useToast();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [history, setHistory] = useState<CompletedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load all profile data
   */
  const loadProfileData = useCallback(async () => {
    try {
      setIsLoading(true);
      const manager = ProfileManager.getInstance();
      const data = await manager.getProfileData();
      setStats(data.stats);
      setPreferences(data.preferences);
      setHistory(data.history);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  /**
   * Handle preference changes with toast feedback
   */
  const handlePreferenceChange = useCallback(
    async (key: keyof UserPreferences, value: boolean | string) => {
      try {
        const manager = ProfileManager.getInstance();
        await manager.updatePreferences({ [key]: value });
        setPreferences((prev) =>
          prev ? { ...prev, [key]: value } : null
        );
        showToast('Preferences saved', 'success');
      } catch (error) {
        console.error('Failed to update preference:', error);
        showToast('Failed to save preference', 'warning');
      }
    },
    [showToast]
  );

  // Show loading state
  if (isLoading || !stats || !preferences) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          displayName={preferences.displayName}
          levelTitle={stats.levelTitle}
        />
        <StatsBoard stats={stats} />
        <TripLog history={history} />
        <SettingsSection
          preferences={preferences}
          onPreferenceChange={handlePreferenceChange}
        />

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.appVersion}>RoamWise v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  userName: {
    ...typography.title1,
    color: colors.text,
    marginTop: spacing.md,
  },
  userTagline: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Stats Board
  statsBoard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.small,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.title1,
    color: colors.text,
  },
  statUnit: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  statLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.md,
  },

  // Section
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  seeAllButton: {
    ...typography.subhead,
    color: colors.primary,
  },

  // Trip Card
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  tripImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tripTitle: {
    ...typography.headline,
    color: colors.text,
  },
  tripDate: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  tripMetaText: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  tripMetaDot: {
    color: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  emptyStateText: {
    ...typography.headline,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    ...typography.subhead,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Settings
  settingsGroup: {
    marginTop: spacing.md,
  },
  settingsGroupTitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
  },
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.md,
  },

  // Selector
  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  selectorOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  selectorOptionSelected: {
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  selectorOptionText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  selectorOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Dropdown
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dropdownValueText: {
    ...typography.subhead,
    color: colors.text,
    marginRight: spacing.xs,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  signOutText: {
    ...typography.headline,
    color: colors.danger,
    marginLeft: spacing.sm,
  },

  // App Version
  appVersion: {
    ...typography.caption1,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default ProfileScreen;
