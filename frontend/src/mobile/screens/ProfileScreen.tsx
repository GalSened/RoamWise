/**
 * ProfileScreen - Tab 4 (User Profile/Memories)
 *
 * User profile and settings with:
 * - Profile header with avatar
 * - Stats board (distance, places, trips)
 * - Trip log with thumbnails
 * - Settings section with toggles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';

/**
 * User Stats Data
 */
const userStats = [
  { id: 'distance', value: '245', unit: 'km', label: 'walked' },
  { id: 'places', value: '32', unit: '', label: 'places visited' },
  { id: 'trips', value: '18', unit: '', label: 'trips complete' },
];

/**
 * Trip Log Data
 */
const tripLog = [
  {
    id: '1',
    title: 'Ein Gedi',
    date: 'Dec 28, 2024',
    distance: '7.2 km',
    duration: '4h 30m',
    image: 'placeholder',
  },
  {
    id: '2',
    title: 'Mount Tabor',
    date: 'Dec 21, 2024',
    distance: '5.8 km',
    duration: '3h 15m',
    image: 'placeholder',
  },
  {
    id: '3',
    title: 'Banias Falls',
    date: 'Dec 14, 2024',
    distance: '4.2 km',
    duration: '2h 45m',
    image: 'placeholder',
  },
  {
    id: '4',
    title: 'Masada Sunrise',
    date: 'Dec 7, 2024',
    distance: '3.5 km',
    duration: '2h',
    image: 'placeholder',
  },
];

/**
 * Settings Data
 */
const settingsSections = [
  {
    id: 'preferences',
    title: 'Preferences',
    items: [
      { id: 'vegetarian', label: 'Vegetarian Food', type: 'toggle' },
      { id: 'avoid-stairs', label: 'Avoid Stairs', type: 'toggle' },
    ],
  },
  {
    id: 'activity',
    title: 'Activity Settings',
    items: [
      {
        id: 'pace',
        label: 'Walking Pace',
        type: 'selector',
        options: ['Slow', 'Medium', 'Fast'],
        selected: 'Medium',
      },
      {
        id: 'car',
        label: 'Car Type',
        type: 'dropdown',
        value: 'Sedan',
      },
    ],
  },
];

/**
 * Profile Header Component
 */
function ProfileHeader() {
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
      <Text style={styles.userName}>Traveler</Text>
      <Text style={styles.userTagline}>Adventure Seeker 🏔️</Text>
    </View>
  );
}

/**
 * Stats Board Component
 */
function StatsBoard() {
  return (
    <View style={styles.statsBoard}>
      {userStats.map((stat, index) => (
        <React.Fragment key={stat.id}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stat.value}
              {stat.unit && <Text style={styles.statUnit}> {stat.unit}</Text>}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
          {index < userStats.length - 1 && <View style={styles.statDivider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * Trip Card Component
 */
function TripCard({ trip }: { trip: typeof tripLog[0] }) {
  return (
    <TouchableOpacity style={styles.tripCard}>
      <View style={styles.tripImagePlaceholder}>
        <Ionicons name="image" size={30} color={colors.textTertiary} />
      </View>
      <View style={styles.tripInfo}>
        <Text style={styles.tripTitle}>{trip.title}</Text>
        <Text style={styles.tripDate}>{trip.date}</Text>
        <View style={styles.tripMeta}>
          <Text style={styles.tripMetaText}>{trip.distance}</Text>
          <Text style={styles.tripMetaDot}>•</Text>
          <Text style={styles.tripMetaText}>{trip.duration}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

/**
 * Trip Log Section
 */
function TripLog() {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="camera" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Trip Log</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllButton}>See All</Text>
        </TouchableOpacity>
      </View>
      {tripLog.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </View>
  );
}

/**
 * Toggle Setting Component
 */
function ToggleSetting({ label }: { label: string }) {
  const [isEnabled, setIsEnabled] = useState(false);

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={isEnabled}
        onValueChange={setIsEnabled}
        trackColor={{ false: colors.borderLight, true: colors.success }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.borderLight}
      />
    </View>
  );
}

/**
 * Selector Setting Component
 */
function SelectorSetting({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: string;
}) {
  const [currentSelected, setCurrentSelected] = useState(selected);

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
            onPress={() => setCurrentSelected(option)}
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
function SettingsSection() {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="settings" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Settings</Text>
      </View>

      {settingsSections.map((section) => (
        <View key={section.id} style={styles.settingsGroup}>
          <Text style={styles.settingsGroupTitle}>{section.title}</Text>
          <View style={styles.settingsCard}>
            {section.items.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.type === 'toggle' && <ToggleSetting label={item.label} />}
                {item.type === 'selector' && (
                  <SelectorSetting
                    label={item.label}
                    options={item.options!}
                    selected={item.selected!}
                  />
                )}
                {item.type === 'dropdown' && (
                  <DropdownSetting label={item.label} value={item.value!} />
                )}
                {index < section.items.length - 1 && (
                  <View style={styles.settingDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * ProfileScreen Main Component
 */
export function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader />
        <StatsBoard />
        <TripLog />
        <SettingsSection />

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
