/**
 * HomeScreen (Dynamic Dashboard)
 *
 * Renders different content based on user state:
 * - NewUser: Inspiration cards, search, "Surprise Me"
 * - PlannedTrip: Countdown, checklist, weather preview
 * - ActiveTrip: Current activity, timeline, navigation
 * - BetweenTrips: AI recommendations, past trips, stats
 * - PostTrip: Trip summary, ratings, share, plan next
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Theme
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';

// Home Components
import {
  useUserState,
  getTimeBasedGreeting,
  getStateTitle,
  TripCountdown,
  InspirationCards,
  QuickActions,
  TripSummaryCard,
  TripInfo,
} from '../components/home';

/**
 * Header Component
 */
function HomeHeader({ userName }: { userName?: string }) {
  const greeting = getTimeBasedGreeting();
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.greeting}>{greeting}</Text>
        {userName && <Text style={styles.userName}>{userName} 👋</Text>}
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => (navigation as any).navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Active Trip Card (for ActiveTrip state)
 */
function ActiveTripCard({
  trip,
  currentDay,
  onNavigate,
  onViewTimeline,
}: {
  trip: TripInfo;
  currentDay: number;
  onNavigate?: () => void;
  onViewTimeline?: () => void;
}) {
  return (
    <View style={styles.activeTripCard}>
      {/* Background */}
      {trip.coverImage && (
        <>
          <Image source={{ uri: trip.coverImage }} style={styles.activeTripImage} resizeMode="cover" />
          <View style={styles.activeTripOverlay} />
        </>
      )}

      <View style={styles.activeTripContent}>
        {/* Header */}
        <View style={styles.activeTripHeader}>
          <View style={styles.activeTripBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>בטיול</Text>
          </View>
          <Text style={styles.activeTripDay}>יום {currentDay} מתוך {trip.daysCount}</Text>
        </View>

        {/* Destination */}
        <Text style={styles.activeTripDestination}>{trip.destination}</Text>
        {trip.name && <Text style={styles.activeTripName}>{trip.name}</Text>}

        {/* Actions */}
        <View style={styles.activeTripActions}>
          <TouchableOpacity style={styles.activeTripButton} onPress={onViewTimeline}>
            <Ionicons name="list-outline" size={20} color={colors.surface} />
            <Text style={styles.activeTripButtonText}>לו״ז היום</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.activeTripButton, styles.activeTripButtonPrimary]}
            onPress={onNavigate}
          >
            <Ionicons name="navigate" size={20} color={colors.surface} />
            <Text style={styles.activeTripButtonText}>נווט</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * Between Trips Content (AI recommendations, stats)
 */
function BetweenTripsContent({
  recentTrip,
  onPlanTrip,
}: {
  recentTrip: TripInfo | null;
  onPlanTrip?: () => void;
}) {
  return (
    <View style={styles.betweenTripsContainer}>
      {/* Welcome back message */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>לאן הבא? ✈️</Text>
        <Text style={styles.welcomeSubtitle}>
          בהתבסס על הטיולים הקודמים שלך, הנה כמה המלצות
        </Text>
      </View>

      {/* AI Recommendations would go here */}
      <InspirationCards
        onDestinationPress={(dest) => console.log('Destination pressed:', dest)}
        onSurpriseMe={() => console.log('Surprise me')}
        onCategoryPress={(cat) => console.log('Category:', cat)}
        onSeeAll={() => console.log('See all')}
      />

      {/* Recent trip mini card */}
      {recentTrip && (
        <View style={styles.recentTripSection}>
          <Text style={styles.sectionTitle}>הטיול האחרון שלך</Text>
          <TouchableOpacity style={styles.recentTripCard}>
            {recentTrip.coverImage && (
              <Image source={{ uri: recentTrip.coverImage }} style={styles.recentTripImage} />
            )}
            <View style={styles.recentTripInfo}>
              <Text style={styles.recentTripDestination}>{recentTrip.destination}</Text>
              <Text style={styles.recentTripDates}>
                {recentTrip.daysCount} ימים · {recentTrip.activitiesCount} פעילויות
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Main HomeScreen Component
 */
export function HomeScreen() {
  const navigation = useNavigation();
  const {
    userState,
    activeTrip,
    upcomingTrip,
    recentTrip,
    isLoading,
    daysUntilTrip,
    daysSinceTrip,
    currentTripDay,
    refreshState,
  } = useUserState();

  const stateTitle = useMemo(() => getStateTitle(userState), [userState]);

  // Navigation handlers
  const handlePlanTrip = useCallback(() => {
    (navigation as any).navigate('Planner');
  }, [navigation]);

  const handleChat = useCallback(() => {
    // Navigate to chat screen (when implemented)
    console.log('Open chat');
  }, []);

  const handleSearch = useCallback(() => {
    // Open search
    console.log('Open search');
  }, []);

  const handleNavigate = useCallback(() => {
    (navigation as any).navigate('Live');
  }, [navigation]);

  // Render content based on user state
  const renderContent = () => {
    switch (userState) {
      case 'NewUser':
        return (
          <>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>{stateTitle.text}</Text>
              <Text style={styles.heroSubtitle}>
                גלה יעדים מדהימים ותכנן את הטיול המושלם עם AI
              </Text>
            </View>

            {/* Inspiration Cards */}
            <InspirationCards
              onDestinationPress={(dest) => console.log('Destination:', dest)}
              onSurpriseMe={() => console.log('Surprise me')}
              onCategoryPress={(cat) => console.log('Category:', cat)}
              onSeeAll={() => console.log('See all')}
            />
          </>
        );

      case 'PlannedTrip':
        return upcomingTrip && daysUntilTrip !== null ? (
          <>
            <TripCountdown
              trip={upcomingTrip}
              daysUntil={daysUntilTrip}
              onPress={() => console.log('View trip details')}
              onNavigateToChecklist={() => console.log('Open checklist')}
              onNavigateToWeather={() => console.log('Open weather')}
            />

            {/* Tips Section */}
            <View style={styles.tipsSection}>
              <Text style={styles.sectionTitle}>טיפים ל{upcomingTrip.destination}</Text>
              <View style={styles.tipCard}>
                <Ionicons name="bulb-outline" size={20} color={colors.warning} />
                <Text style={styles.tipText}>
                  הזמן כרטיסים מראש לאטרקציות פופולריות כדי להימנע מתורים
                </Text>
              </View>
            </View>
          </>
        ) : null;

      case 'ActiveTrip':
        return activeTrip && currentTripDay ? (
          <ActiveTripCard
            trip={activeTrip}
            currentDay={currentTripDay}
            onNavigate={handleNavigate}
            onViewTimeline={() => console.log('View timeline')}
          />
        ) : null;

      case 'BetweenTrips':
        return (
          <BetweenTripsContent
            recentTrip={recentTrip}
            onPlanTrip={handlePlanTrip}
          />
        );

      case 'PostTrip':
        return recentTrip && daysSinceTrip !== null ? (
          <TripSummaryCard
            trip={recentTrip}
            daysSince={daysSinceTrip}
            onRate={(rating) => console.log('Rated:', rating)}
            onShare={() => console.log('Share trip')}
            onPlanNext={handlePlanTrip}
            onViewDetails={() => console.log('View details')}
            onViewPhotos={() => console.log('View photos')}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshState}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <HomeHeader userName="גל" />

        {/* Dynamic Content */}
        {renderContent()}

        {/* Bottom Padding for FAB */}
        <View style={styles.fabPadding} />
      </ScrollView>

      {/* Quick Actions FAB */}
      <QuickActions
        userState={userState}
        onPlanTrip={handlePlanTrip}
        onChat={handleChat}
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        onAddActivity={() => console.log('Add activity')}
        onScan={() => console.log('Scan')}
      />
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
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLeft: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  greeting: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  heroSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Active Trip Styles
  activeTripCard: {
    margin: spacing.md,
    height: 240,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    ...shadows.large,
  },
  activeTripImage: {
    ...StyleSheet.absoluteFillObject,
  },
  activeTripOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  activeTripContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  activeTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  activeTripDay: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
  },
  activeTripDestination: {
    ...typography.h1,
    color: colors.surface,
    fontWeight: '700',
  },
  activeTripName: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
  },
  activeTripActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activeTripButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  activeTripButtonPrimary: {
    backgroundColor: colors.success,
  },
  activeTripButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  // Tips Section
  tipsSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.small,
  },
  tipText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  // Between Trips
  betweenTripsContainer: {},
  welcomeSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  welcomeTitle: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  recentTripSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  recentTripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  recentTripImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  recentTripInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  recentTripDestination: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  recentTripDates: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fabPadding: {
    height: 100,
  },
});

export default HomeScreen;
