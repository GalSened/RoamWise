/**
 * AIGenerationStep Component (Step 4)
 *
 * Generates the trip itinerary using AI with:
 * - Animated progress indicator
 * - Stage-by-stage feedback
 * - Preview of what's being generated
 *
 * Features:
 * - Multi-stage generation visualization
 * - Fun facts while waiting
 * - Error handling with retry
 * - Success animation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../../utils/haptics';
import {
  AIGenerationStepProps,
  GenerationProgress,
  Itinerary,
  DayPlan,
  Activity,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const GENERATION_STAGES: { stage: GenerationProgress['stage']; label: string; icon: string; duration: number }[] = [
  { stage: 'analyzing', label: 'מנתח את ההעדפות שלך...', icon: 'analytics-outline', duration: 2000 },
  { stage: 'searching', label: 'מחפש אטרקציות מומלצות...', icon: 'search-outline', duration: 3000 },
  { stage: 'optimizing', label: 'מייעל את לוח הזמנים...', icon: 'git-branch-outline', duration: 2500 },
  { stage: 'finalizing', label: 'מוסיף את הטאצים האחרונים...', icon: 'sparkles-outline', duration: 1500 },
];

const FUN_FACTS = [
  '🌍 ידעת? התיירות מהווה 10% מהתמ"ג העולמי',
  '✈️ מדי שנה מתבצעות יותר מ-4 מיליארד טיסות',
  '🗼 מגדל אייפל מקבל 7 מיליון מבקרים בשנה',
  '🎒 המזוודה הממוצעת עוברת 40 קילומטר בשדה תעופה',
  '🏛️ רומא היא העיר עם הכי הרבה אתרי מורשת עולמית',
  '🍕 איטליה מייצרת 5.5 מיליון טון פיצה בשנה',
];

// =============================================================================
// MOCK ITINERARY GENERATOR
// =============================================================================

function generateMockItinerary(
  destination: AIGenerationStepProps['destination'],
  dateRange: AIGenerationStepProps['dateRange'],
  preferences: AIGenerationStepProps['preferences']
): Itinerary {
  const days: DayPlan[] = [];
  const startDate = new Date(dateRange.startDate);
  const endDate = new Date(dateRange.endDate);
  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const activities: Activity[] = [];
    const numActivities = preferences.pace === 'relaxed' ? 3 : preferences.pace === 'intense' ? 7 : 5;

    // Generate mock activities based on interests
    const activityTypes: Activity['type'][] = ['attraction', 'restaurant', 'museum', 'cafe', 'park'];

    for (let j = 0; j < numActivities; j++) {
      const hour = 9 + j * 2;
      activities.push({
        id: `activity-${i}-${j}`,
        type: activityTypes[j % activityTypes.length],
        name: `פעילות ${j + 1} - יום ${i + 1}`,
        description: 'תיאור הפעילות יופיע כאן',
        location: {
          address: `כתובת ב${destination.nameHebrew || destination.name}`,
          coordinates: {
            lat: destination.coordinates.lat + (Math.random() - 0.5) * 0.05,
            lng: destination.coordinates.lng + (Math.random() - 0.5) * 0.05,
          },
        },
        duration: 60 + Math.floor(Math.random() * 60),
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:30`,
        cost: Math.floor(Math.random() * 50) + 10,
        rating: 4 + Math.random(),
        tags: preferences.interests?.slice(0, 2) || [],
        aiMatchScore: 75 + Math.floor(Math.random() * 25),
      });
    }

    days.push({
      id: `day-${i}`,
      dayNumber: i + 1,
      date,
      title: i === 0 ? 'יום הגעה' : i === numDays - 1 ? 'יום אחרון' : `יום ${i + 1}`,
      activities,
      totalDuration: activities.reduce((sum, a) => sum + a.duration, 0),
      totalCost: activities.reduce((sum, a) => sum + (a.cost || 0), 0),
    });
  }

  return {
    id: `itinerary-${Date.now()}`,
    name: `טיול ל${destination.nameHebrew || destination.name}`,
    destination,
    dateRange,
    preferences,
    days,
    totalCost: days.reduce((sum, d) => sum + d.totalCost, 0),
    totalDistance: Math.floor(Math.random() * 50) + 10,
    insights: [
      {
        type: 'tip',
        title: 'טיפ מקומי',
        description: 'כדאי להזמין כרטיסים מראש לאטרקציות הפופולריות',
        icon: 'bulb-outline',
      },
      {
        type: 'highlight',
        title: 'נקודת השיא',
        description: 'יום 2 כולל את הפעילויות הכי מומלצות עבורך',
        icon: 'star-outline',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Animated Progress Ring
 */
function ProgressRing({ progress }: { progress: number }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [rotateAnim, scaleAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.progressRing,
        { transform: [{ rotate }, { scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={[colors.primary, '#8B5CF6', colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.progressRingGradient}
      >
        <View style={styles.progressRingInner}>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

/**
 * Stage Indicator
 */
function StageIndicator({
  stages,
  currentStage,
}: {
  stages: typeof GENERATION_STAGES;
  currentStage: GenerationProgress['stage'];
}) {
  return (
    <View style={styles.stagesContainer}>
      {stages.map((stage, index) => {
        const isActive = stage.stage === currentStage;
        const isComplete = stages.findIndex((s) => s.stage === currentStage) > index;

        return (
          <View key={stage.stage} style={styles.stageRow}>
            <View
              style={[
                styles.stageIcon,
                isActive && styles.stageIconActive,
                isComplete && styles.stageIconComplete,
              ]}
            >
              {isComplete ? (
                <Ionicons name="checkmark" size={14} color={colors.surface} />
              ) : (
                <Ionicons
                  name={stage.icon as any}
                  size={14}
                  color={isActive ? colors.surface : colors.textTertiary}
                />
              )}
            </View>
            <Text
              style={[
                styles.stageLabel,
                isActive && styles.stageLabelActive,
                isComplete && styles.stageLabelComplete,
              ]}
            >
              {stage.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Fun Fact Card
 */
function FunFactCard({ fact }: { fact: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fact, fadeAnim]);

  return (
    <Animated.View style={[styles.funFactCard, { opacity: fadeAnim }]}>
      <Text style={styles.funFactText}>{fact}</Text>
    </Animated.View>
  );
}

/**
 * Success Animation
 */
function SuccessAnimation({ onComplete }: { onComplete: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptics.notification('success');

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(onComplete, 1000);
    });
  }, [scaleAnim, opacityAnim, onComplete]);

  return (
    <Animated.View
      style={[
        styles.successContainer,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={[colors.success, '#059669']}
        style={styles.successCircle}
      >
        <Ionicons name="checkmark" size={48} color={colors.surface} />
      </LinearGradient>
      <Text style={styles.successTitle}>המסלול מוכן!</Text>
      <Text style={styles.successSubtitle}>יצרנו עבורך מסלול מותאם אישית</Text>
    </Animated.View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AIGenerationStep({
  destination,
  dateRange,
  preferences,
  onComplete,
  onError,
}: AIGenerationStepProps) {
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'analyzing',
    progress: 0,
    message: 'מתחיל לייצר את המסלול...',
  });
  const [currentFact, setCurrentFact] = useState(FUN_FACTS[0]);
  const [isComplete, setIsComplete] = useState(false);
  const factIndexRef = useRef(0);

  // Simulate generation process
  useEffect(() => {
    let isMounted = true;
    let currentProgress = 0;
    let stageIndex = 0;

    const progressInterval = setInterval(() => {
      if (!isMounted) return;

      currentProgress += 1;

      // Determine current stage based on progress
      const stageBreakpoints = [25, 50, 75, 100];
      if (currentProgress >= stageBreakpoints[stageIndex] && stageIndex < GENERATION_STAGES.length - 1) {
        stageIndex++;
      }

      const currentStage = GENERATION_STAGES[stageIndex];

      setProgress({
        stage: currentStage.stage,
        progress: currentProgress,
        message: currentStage.label,
      });

      if (currentProgress >= 100) {
        clearInterval(progressInterval);

        // Generate mock itinerary
        try {
          const itinerary = generateMockItinerary(destination, dateRange, preferences);
          setIsComplete(true);

          // Small delay before calling onComplete
          setTimeout(() => {
            if (isMounted) {
              onComplete(itinerary);
            }
          }, 1500);
        } catch (error) {
          onError('שגיאה ביצירת המסלול. נא לנסות שוב.');
        }
      }
    }, 100); // Update every 100ms for smooth progress

    // Rotate fun facts
    const factInterval = setInterval(() => {
      if (!isMounted) return;
      factIndexRef.current = (factIndexRef.current + 1) % FUN_FACTS.length;
      setCurrentFact(FUN_FACTS[factIndexRef.current]);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(progressInterval);
      clearInterval(factInterval);
    };
  }, [destination, dateRange, preferences, onComplete, onError]);

  if (isComplete) {
    return <SuccessAnimation onComplete={() => {}} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <Ionicons name="sparkles" size={24} color={colors.surface} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>AI יוצר את המסלול שלך</Text>
            <Text style={styles.headerSubtitle}>
              {destination.nameHebrew || destination.name} • {Math.ceil(
                (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1} ימים
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Progress Ring */}
      <View style={styles.progressContainer}>
        <ProgressRing progress={progress.progress} />
      </View>

      {/* Stages */}
      <StageIndicator stages={GENERATION_STAGES} currentStage={progress.stage} />

      {/* Fun Facts */}
      <View style={styles.funFactContainer}>
        <FunFactCard fact={currentFact} />
      </View>

      {/* What We're Doing */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>יעד</Text>
            <Text style={styles.infoValue}>{destination.nameHebrew || destination.name}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="heart-outline" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>תחומי עניין</Text>
            <Text style={styles.infoValue}>{preferences.interests?.length || 0}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>קצב</Text>
            <Text style={styles.infoValue}>
              {preferences.pace === 'relaxed' ? 'רגוע' :
               preferences.pace === 'moderate' ? 'מאוזן' :
               preferences.pace === 'active' ? 'פעיל' : 'אינטנסיבי'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  // Header
  header: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.surface,
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  // Progress Ring
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressRing: {
    width: 140,
    height: 140,
  },
  progressRingGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    padding: 6,
  },
  progressRingInner: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
  },
  // Stages
  stagesContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    width: '100%',
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  stageIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIconActive: {
    backgroundColor: colors.primary,
  },
  stageIconComplete: {
    backgroundColor: colors.success,
  },
  stageLabel: {
    ...typography.body,
    color: colors.textTertiary,
  },
  stageLabelActive: {
    color: colors.text,
    fontWeight: '500',
  },
  stageLabelComplete: {
    color: colors.success,
  },
  // Fun Facts
  funFactContainer: {
    height: 60,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
  },
  funFactCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.small,
  },
  funFactText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Info Card
  infoCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.small,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default AIGenerationStep;
