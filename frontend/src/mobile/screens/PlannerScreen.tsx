/**
 * PlannerScreen - Tab 2 (Trip Itinerary)
 *
 * Trip planning screen with:
 * - "Smart Mix" horizontal swipe mode cards
 * - Dynamic Timeline with nodes and alert bubbles
 * - Smart Backpack button
 * - Start Navigation primary CTA
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';

/**
 * Trip Mode Cards Data
 */
const tripModes = [
  {
    id: 'efficient',
    title: 'Efficient',
    subtitle: 'Fastest route',
    icon: '⚡',
    color: colors.warning,
  },
  {
    id: 'scenic',
    title: 'Scenic',
    subtitle: 'Best views',
    icon: '🏞️',
    color: colors.success,
  },
  {
    id: 'culinary',
    title: 'Culinary',
    subtitle: 'Food stops',
    icon: '🍽️',
    color: colors.secondary,
  },
  {
    id: 'adventure',
    title: 'Adventure',
    subtitle: 'Off-road',
    icon: '🧗',
    color: colors.danger,
  },
];

/**
 * Timeline Events Data
 */
const timelineEvents = [
  {
    id: 'start',
    type: 'waypoint',
    title: 'Start',
    time: '9:00 AM',
    description: 'Leave from Tel Aviv',
    icon: 'flag',
  },
  {
    id: 'alert1',
    type: 'alert',
    title: 'Rain Expected',
    time: '2:00 - 4:00 PM',
    description: 'Light showers forecast. Pack rain gear!',
    severity: 'warning',
  },
  {
    id: 'drive1',
    type: 'transit',
    title: 'Drive',
    duration: '45 min',
    description: 'Highway 1 → Route 90',
    icon: 'car',
  },
  {
    id: 'hike1',
    type: 'activity',
    title: 'Ein Gedi Trail',
    duration: '2.5 hrs',
    description: 'David Waterfall Loop',
    icon: 'walk',
  },
  {
    id: 'eat1',
    type: 'activity',
    title: 'Lunch',
    duration: '1 hr',
    description: 'Ein Bokek Beach Restaurant',
    icon: 'restaurant',
  },
  {
    id: 'end',
    type: 'waypoint',
    title: 'End',
    time: '5:30 PM',
    description: 'Return to Tel Aviv',
    icon: 'checkmark-circle',
  },
];

/**
 * Mode Card Component
 */
function ModeCard({
  mode,
  selected,
  onPress,
}: {
  mode: typeof tripModes[0];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.modeCard,
        selected && { borderColor: mode.color, borderWidth: 2 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.modeIcon}>{mode.icon}</Text>
      <Text style={styles.modeTitle}>{mode.title}</Text>
      <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
      {selected && (
        <View style={[styles.modeCheck, { backgroundColor: mode.color }]}>
          <Ionicons name="checkmark" size={12} color={colors.textInverse} />
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Mode Selector Section
 */
function ModeSelector() {
  const [selectedMode, setSelectedMode] = useState('scenic');

  return (
    <View style={styles.modeSection}>
      <Text style={styles.sectionTitle}>The Smart Mix</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeCardsContainer}
      >
        {tripModes.map((mode) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            selected={selectedMode === mode.id}
            onPress={() => setSelectedMode(mode.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Alert Bubble Component
 */
function AlertBubble({ event }: { event: typeof timelineEvents[0] }) {
  const getSeverityColor = () => {
    switch (event.severity) {
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.info;
    }
  };

  return (
    <View style={[styles.alertBubble, { borderLeftColor: getSeverityColor() }]}>
      <View style={styles.alertHeader}>
        <Ionicons name="warning" size={16} color={getSeverityColor()} />
        <Text style={styles.alertTitle}>{event.title}</Text>
        <Text style={styles.alertTime}>{event.time}</Text>
      </View>
      <Text style={styles.alertDescription}>{event.description}</Text>
    </View>
  );
}

/**
 * Timeline Node Component
 */
function TimelineNode({ event, isLast }: { event: typeof timelineEvents[0]; isLast: boolean }) {
  if (event.type === 'alert') {
    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLineContainer}>
          <View style={[styles.timelineDot, styles.timelineDotAlert]} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>
        <AlertBubble event={event} />
      </View>
    );
  }

  const getIconName = (): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (event.icon) {
      case 'flag':
        return 'flag';
      case 'car':
        return 'car';
      case 'walk':
        return 'walk';
      case 'restaurant':
        return 'restaurant';
      case 'checkmark-circle':
        return 'checkmark-circle';
      default:
        return 'ellipse';
    }
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLineContainer}>
        <View style={[styles.timelineDot, event.type === 'waypoint' && styles.timelineDotWaypoint]}>
          <Ionicons name={getIconName()} size={14} color={colors.textInverse} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>{event.title}</Text>
          <Text style={styles.timelineTime}>
            {event.time || event.duration}
          </Text>
        </View>
        <Text style={styles.timelineDescription}>{event.description}</Text>
      </View>
    </View>
  );
}

/**
 * Dynamic Timeline Section
 */
function Timeline() {
  return (
    <View style={styles.timelineSection}>
      <Text style={styles.sectionTitle}>Dynamic Timeline</Text>
      <View style={styles.timeline}>
        {timelineEvents.map((event, index) => (
          <TimelineNode
            key={event.id}
            event={event}
            isLast={index === timelineEvents.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Smart Backpack Button
 */
function SmartBackpackButton() {
  const handlePress = () => {
    Alert.alert(
      '🎒 Smart Backpack',
      'Based on your trip:\n\n• 2L Water\n• Rain jacket\n• Sunscreen SPF 50\n• Snacks (500 cal)\n• First aid kit\n• Phone charger',
      [{ text: 'Got it!' }]
    );
  };

  return (
    <TouchableOpacity style={styles.backpackButton} onPress={handlePress}>
      <Text style={styles.backpackIcon}>🎒</Text>
      <Text style={styles.backpackText}>Smart Backpack</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

/**
 * Start Navigation CTA
 */
function StartNavigationButton() {
  const navigation = useNavigation();

  const handlePress = async () => {
    // Open Waze with destination coordinates
    const wazeUrl = 'waze://?ll=31.4645,35.3890&navigate=yes';
    const canOpen = await Linking.canOpenURL(wazeUrl);

    if (canOpen) {
      await Linking.openURL(wazeUrl);
    } else {
      // Fallback to Google Maps
      const googleMapsUrl = 'https://maps.google.com/?daddr=31.4645,35.3890';
      await Linking.openURL(googleMapsUrl);
    }

    // Switch to Live tab
    navigation.navigate('Live' as never);
  };

  return (
    <TouchableOpacity style={styles.startButton} onPress={handlePress}>
      <Ionicons name="navigate" size={24} color={colors.textInverse} />
      <Text style={styles.startButtonText}>Start Navigation</Text>
    </TouchableOpacity>
  );
}

/**
 * PlannerScreen Main Component
 */
export function PlannerScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ein Gedi Day Trip</Text>
          <Text style={styles.headerSubtitle}>Today • 8.5 hrs total</Text>
        </View>

        <ModeSelector />
        <Timeline />
      </ScrollView>

      <View style={styles.footer}>
        <SmartBackpackButton />
        <StartNavigationButton />
      </View>
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
    paddingBottom: spacing.lg,
  },

  // Header
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.title1,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Section
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  // Mode Cards
  modeSection: {
    marginTop: spacing.lg,
  },
  modeCardsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  modeCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginRight: spacing.sm,
    ...shadows.small,
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  modeTitle: {
    ...typography.headline,
    color: colors.text,
  },
  modeSubtitle: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  modeCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Timeline
  timelineSection: {
    marginTop: spacing.xl,
  },
  timeline: {
    paddingHorizontal: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 70,
  },
  timelineLineContainer: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDotWaypoint: {
    backgroundColor: colors.success,
  },
  timelineDotAlert: {
    backgroundColor: colors.warning,
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderLight,
    marginTop: -2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    ...typography.headline,
    color: colors.text,
  },
  timelineTime: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  timelineDescription: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Alert Bubble
  alertBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginLeft: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    ...shadows.small,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertTitle: {
    ...typography.headline,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  alertTime: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  alertDescription: {
    ...typography.subhead,
    color: colors.textSecondary,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  backpackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  backpackIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  backpackText: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  startButtonText: {
    ...typography.headline,
    color: colors.textInverse,
    marginLeft: spacing.sm,
  },
});

export default PlannerScreen;
