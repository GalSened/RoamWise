/**
 * ProfileScreen - Travel Identity Hub (V2)
 *
 * Comprehensive user profile with:
 * - AI personalized greeting
 * - Profile header with level progression
 * - Travel DNA radar chart
 * - World map (scratch map)
 * - Achievements and badges
 * - Bucket list with AI enrichment
 * - Travel insights and analytics
 * - Memories timeline
 * - Settings section
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';
import { haptics } from '../utils/haptics';
import { useToast } from '../components/ui';
import { ProfileManager } from '../features/profile';
import type { ProfileStats, UserPreferences, CompletedTrip } from '../features/profile/types';

// Import V2 Profile Components
import {
  AIGreeting,
  TravelDNARadar,
  WorldMapCard,
  AchievementsSection,
  BucketList,
  TravelInsights,
  MemoriesTimeline,
  // Types
  AIGreeting as AIGreetingType,
  TravelDNA,
  UserAchievement,
  BucketListItem,
  VisitedPlace,
  Memory,
  getLevelFromScore,
  getLevelInfo,
  getLevelProgress,
  ACHIEVEMENTS,
} from '../components/profile';

/**
 * Mock data generators for development
 * TODO: Replace with actual API calls
 */
function generateMockTravelDNA(): TravelDNA {
  return {
    styles: {
      cultural: 75,
      culinary: 85,
      adventure: 60,
      relaxation: 45,
      nightlife: 30,
      nature: 90,
      shopping: 40,
    },
    confidence: 0.82,
    analyzedTrips: 12,
    analyzedActivities: 67,
    persona: {
      title: 'חוקר טבע',
      description: 'אתה מטייל שמחפש חוויות אותנטיות בטבע, עם אהבה מיוחדת לאוכל מקומי ותרבות מקומית.',
      matchingDestinations: ['אייסלנד', 'ניו זילנד', 'נורבגיה', 'יפן'],
    },
    lastUpdated: new Date(),
  };
}

function generateMockAchievements(): UserAchievement[] {
  return [
    {
      ...ACHIEVEMENTS[0],
      unlockedAt: new Date('2024-03-15'),
      currentCount: 5,
    },
    {
      ...ACHIEVEMENTS[1],
      unlockedAt: new Date('2024-05-20'),
      currentCount: 3,
    },
    {
      ...ACHIEVEMENTS[4],
      currentCount: 7,
    },
  ];
}

function generateMockBucketList(): BucketListItem[] {
  return [
    {
      id: '1',
      destination: 'יפן',
      country: 'יפן',
      status: 'researching',
      priority: 3,
      addedAt: new Date('2024-01-10'),
      aiEnrichment: {
        matchScore: 92,
        bestTimeToVisit: 'אביב (מרץ-מאי)',
        estimatedBudget: '$3,500',
        topRecommendations: ['הר פוג\'י', 'קיוטו', 'טוקיו'],
      },
      notes: 'חלום לראות את פריחת הדובדבן',
    },
    {
      id: '2',
      destination: 'איסלנד',
      country: 'איסלנד',
      status: 'dream',
      priority: 2,
      addedAt: new Date('2024-02-05'),
    },
    {
      id: '3',
      destination: 'ברצלונה',
      country: 'ספרד',
      status: 'planning',
      priority: 1,
      addedAt: new Date('2024-03-20'),
      targetDate: new Date('2024-09-15'),
    },
  ];
}

function generateMockVisitedPlaces(): VisitedPlace[] {
  return [
    {
      id: '1',
      name: 'תל אביב',
      country: 'ישראל',
      countryCode: 'IL',
      visitDate: new Date('2024-01-15'),
      status: 'visited',
      coordinates: { lat: 32.0853, lon: 34.7818 },
    },
    {
      id: '2',
      name: 'פריז',
      country: 'צרפת',
      countryCode: 'FR',
      visitDate: new Date('2023-08-20'),
      status: 'visited',
      coordinates: { lat: 48.8566, lon: 2.3522 },
    },
    {
      id: '3',
      name: 'ברצלונה',
      country: 'ספרד',
      countryCode: 'ES',
      status: 'planned',
      coordinates: { lat: 41.3851, lon: 2.1734 },
    },
  ];
}

function generateMockMemories(): Memory[] {
  return [
    {
      id: '1',
      tripId: 'trip-1',
      tripName: 'חופשה בפריז',
      title: 'ארוחת ערב ליד מגדל אייפל',
      description: 'ארוחה קסומה עם נוף מדהים למגדל אייפל מואר',
      location: 'פריז, צרפת',
      trigger: 'photo',
      photos: ['https://picsum.photos/400/300?random=1'],
      rating: 5,
      tags: ['אוכל', 'רומנטי', 'נוף'],
      createdAt: new Date('2023-08-21'),
    },
    {
      id: '2',
      tripId: 'trip-1',
      tripName: 'חופשה בפריז',
      title: 'ביקור במוזיאון הלובר',
      description: 'סוף סוף ראיתי את המונה ליזה!',
      location: 'פריז, צרפת',
      trigger: 'check_in',
      photos: ['https://picsum.photos/400/300?random=2', 'https://picsum.photos/400/300?random=3'],
      rating: 4,
      tags: ['תרבות', 'אמנות', 'מוזיאון'],
      createdAt: new Date('2023-08-22'),
    },
    {
      id: '3',
      tripId: 'trip-2',
      tripName: 'סופ"ש בתל אביב',
      title: 'שקיעה בחוף הים',
      description: 'שקיעה מושלמת עם חברים',
      location: 'תל אביב',
      trigger: 'photo',
      photos: ['https://picsum.photos/400/300?random=4'],
      rating: 5,
      tags: ['חוף', 'שקיעה', 'חברים'],
      createdAt: new Date('2024-01-16'),
    },
  ];
}

/**
 * Profile Header Component (V2)
 */
function ProfileHeaderV2({
  displayName,
  levelScore,
  totalCountries,
  totalCities,
}: {
  displayName: string;
  levelScore: number;
  totalCountries: number;
  totalCities: number;
}) {
  const level = getLevelFromScore(levelScore);
  const levelInfo = getLevelInfo(level);
  const progress = getLevelProgress(levelScore, level);

  return (
    <View style={styles.profileHeader}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={[colors.primary, '#4F46E5']}
          style={styles.avatarGradient}
        >
          <Ionicons name="person" size={40} color={colors.surface} />
        </LinearGradient>
        <TouchableOpacity style={styles.avatarEdit}>
          <Ionicons name="camera" size={14} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Name & Level */}
      <Text style={styles.userName}>{displayName}</Text>
      <View style={styles.levelBadge}>
        <Text style={styles.levelEmoji}>{levelInfo.emoji}</Text>
        <Text style={styles.levelTitle}>{levelInfo.title}</Text>
      </View>

      {/* Level Progress */}
      <View style={styles.levelProgressContainer}>
        <View style={styles.levelProgressBar}>
          <View style={[styles.levelProgress, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.levelProgressText}>
          {levelScore} / {levelInfo.maxScore} נקודות
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Ionicons name="globe-outline" size={16} color={colors.primary} />
          <Text style={styles.quickStatValue}>{totalCountries}</Text>
          <Text style={styles.quickStatLabel}>מדינות</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStatItem}>
          <Ionicons name="business-outline" size={16} color={colors.secondary} />
          <Text style={styles.quickStatValue}>{totalCities}</Text>
          <Text style={styles.quickStatLabel}>ערים</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Section Tabs for navigation
 */
function SectionTabs({
  activeSection,
  onSectionChange,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
}) {
  const sections = [
    { id: 'overview', label: 'סקירה', icon: 'home-outline' },
    { id: 'map', label: 'מפה', icon: 'map-outline' },
    { id: 'achievements', label: 'הישגים', icon: 'trophy-outline' },
    { id: 'memories', label: 'זכרונות', icon: 'images-outline' },
    { id: 'settings', label: 'הגדרות', icon: 'settings-outline' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScrollView}
      contentContainerStyle={styles.tabsContainer}
    >
      {sections.map((section) => (
        <TouchableOpacity
          key={section.id}
          style={[
            styles.tab,
            activeSection === section.id && styles.tabActive,
          ]}
          onPress={() => {
            haptics.impact('light');
            onSectionChange(section.id);
          }}
        >
          <Ionicons
            name={section.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={activeSection === section.id ? colors.primary : colors.textSecondary}
          />
          <Text style={[
            styles.tabText,
            activeSection === section.id && styles.tabTextActive,
          ]}>
            {section.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/**
 * Toggle Setting Component
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
        trackColor={{ false: colors.border, true: colors.success }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

/**
 * Settings Section Component (V2)
 */
function SettingsSectionV2({
  preferences,
  onPreferenceChange,
}: {
  preferences: UserPreferences;
  onPreferenceChange: (key: keyof UserPreferences, value: boolean | string) => void;
}) {
  return (
    <View style={styles.settingsContainer}>
      {/* App Settings */}
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>הגדרות אפליקציה</Text>
        <View style={styles.settingsCard}>
          <ToggleSetting
            label="התראות Push"
            value={preferences.notifications}
            onValueChange={(v) => onPreferenceChange('notifications', v)}
          />
          <View style={styles.settingDivider} />
          <ToggleSetting
            label="מצב כהה"
            value={false}
            onValueChange={() => {}}
          />
        </View>
      </View>

      {/* Travel Preferences */}
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>העדפות טיול</Text>
        <View style={styles.settingsCard}>
          <ToggleSetting
            label="צמחוני/טבעוני"
            value={preferences.vegetarian}
            onValueChange={(v) => onPreferenceChange('vegetarian', v)}
          />
          <View style={styles.settingDivider} />
          <ToggleSetting
            label="נגישות מלאה"
            value={preferences.avoidStairs}
            onValueChange={(v) => onPreferenceChange('avoidStairs', v)}
          />
        </View>
      </View>

      {/* Account */}
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>חשבון</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>עריכת פרופיל</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>פרטיות ואבטחה</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>ייצוא נתונים</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * ProfileScreen Main Component (V2)
 */
export function ProfileScreen() {
  const { show: showToast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Original profile data
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [history, setHistory] = useState<CompletedTrip[]>([]);

  // V2 profile data
  const [greeting, setGreeting] = useState<AIGreetingType | null>(null);
  const [travelDNA, setTravelDNA] = useState<TravelDNA | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [bucketList, setBucketList] = useState<BucketListItem[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);

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

      // Load V2 mock data (TODO: Replace with actual API calls)
      setTravelDNA(generateMockTravelDNA());
      setAchievements(generateMockAchievements());
      setBucketList(generateMockBucketList());
      setVisitedPlaces(generateMockVisitedPlaces());
      setMemories(generateMockMemories());
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
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProfileData();
    setIsRefreshing(false);
    showToast('פרופיל מעודכן', 'success');
  }, [loadProfileData, showToast]);

  /**
   * Handle preference changes
   */
  const handlePreferenceChange = useCallback(
    async (key: keyof UserPreferences, value: boolean | string) => {
      try {
        const manager = ProfileManager.getInstance();
        await manager.updatePreferences({ [key]: value });
        setPreferences((prev) =>
          prev ? { ...prev, [key]: value } : null
        );
        showToast('ההעדפות נשמרו', 'success');
      } catch (error) {
        console.error('Failed to update preference:', error);
        showToast('שגיאה בשמירת ההעדפות', 'warning');
      }
    },
    [showToast]
  );

  /**
   * Handle bucket list item status change
   */
  const handleBucketListStatusChange = useCallback(
    (itemId: string, newStatus: BucketListItem['status']) => {
      setBucketList((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      );
      haptics.impact('light');
    },
    []
  );

  /**
   * Handle adding new bucket list item
   */
  const handleAddBucketListItem = useCallback(() => {
    // TODO: Open add destination modal
    showToast('הוספת יעד חדש', 'success');
  }, [showToast]);

  /**
   * Handle memory press
   */
  const handleMemoryPress = useCallback((memory: Memory) => {
    // TODO: Open memory detail modal
    console.log('Memory pressed:', memory.id);
  }, []);

  // Show loading state
  if (isLoading || !stats || !preferences) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>טוען פרופיל...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate level score from stats
  const levelScore = Math.floor(stats.totalDistanceKm * 0.5 + stats.totalTrips * 10);
  const totalCountries = new Set(visitedPlaces.map(p => p.countryCode)).size;
  const totalCities = visitedPlaces.filter(p => p.status === 'visited').length;

  /**
   * Render content based on active section
   */
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <>
            {/* AI Greeting */}
            <AIGreeting
              greeting={greeting}
              userName={preferences.displayName.split(' ')[0]}
              onRefresh={() => setGreeting(null)}
            />

            {/* Travel DNA */}
            <TravelDNARadar
              travelDNA={travelDNA}
              onAnalyze={() => showToast('מנתח סגנון נסיעות...', 'success')}
            />

            {/* Travel Insights */}
            <TravelInsights insights={null} />

            {/* Bucket List Preview */}
            <BucketList
              items={bucketList.slice(0, 3)}
              onStatusChange={handleBucketListStatusChange}
              onAddItem={handleAddBucketListItem}
            />
          </>
        );

      case 'map':
        return (
          <WorldMapCard
            visitedPlaces={visitedPlaces}
            onPlacePress={(place) => showToast(`נבחר: ${place.name}`, 'success')}
          />
        );

      case 'achievements':
        return (
          <AchievementsSection
            achievements={achievements}
            allAchievements={ACHIEVEMENTS}
            onAchievementPress={(achievement) =>
              showToast(`הישג: ${achievement.title}`, 'success')
            }
          />
        );

      case 'memories':
        return (
          <MemoriesTimeline
            memories={memories}
            onMemoryPress={handleMemoryPress}
            onAddMemory={() => showToast('הוספת זיכרון חדש', 'success')}
          />
        );

      case 'settings':
        return (
          <SettingsSectionV2
            preferences={preferences}
            onPreferenceChange={handlePreferenceChange}
          />
        );

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
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <ProfileHeaderV2
          displayName={preferences.displayName}
          levelScore={levelScore}
          totalCountries={totalCountries}
          totalCities={totalCities}
        />

        {/* Section Tabs */}
        <SectionTabs
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Section Content */}
        {renderSectionContent()}

        {/* Sign Out (always visible) */}
        <TouchableOpacity style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>התנתק</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.appVersion}>RoamWise v2.0.0</Text>
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
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
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
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  levelEmoji: {
    fontSize: 16,
  },
  levelTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  levelProgressContainer: {
    width: '100%',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  levelProgressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  levelProgressText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  quickStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  // Section Tabs
  tabsScrollView: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: `${colors.primary}15`,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Settings
  settingsContainer: {
    padding: spacing.md,
  },
  settingsGroup: {
    marginBottom: spacing.lg,
  },
  settingsGroupTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  settingsCard: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.border,
    marginLeft: spacing.md,
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
    gap: spacing.sm,
  },
  signOutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },

  // App Version
  appVersion: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default ProfileScreen;
