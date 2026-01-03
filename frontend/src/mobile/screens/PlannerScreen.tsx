/**
 * PlannerScreen - 5-Step Trip Planning Wizard
 *
 * Step 1: Destination - Search / AI Recs / Surprise Me
 * Step 2: Dates - Calendar with AI insights
 * Step 3: Preferences - Pace, interests, budget, must-haves
 * Step 4: AI Generation - Full itinerary creation
 * Step 5: Edit - Review and customize itinerary
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';
import { haptics } from '../utils/haptics';
import { useToast } from '../components/ui';
import {
  WizardProgress,
  DestinationSearch,
  DateRangePicker,
  PreferencesForm,
  AIGenerationStep,
  ItineraryEditor,
  WizardStep,
  Destination,
  DateRange,
  TripPreferences,
  Itinerary,
  PlanningWizardContext,
} from '../components/planner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Initial wizard context
 */
function createInitialContext(): PlanningWizardContext {
  return {
    destination: null,
    destinationMode: 'search',
    dateRange: null,
    isFlexibleDates: false,
    dateInsights: [],
    preferences: {
      pace: 'moderate',
      interests: [],
      budgetLevel: 'mid-range',
      mustSee: [],
      accessibility: {
        wheelchairAccessible: false,
        childFriendly: false,
        petFriendly: false,
      },
    },
    generationProgress: null,
    itinerary: null,
    wizardState: {
      currentStep: 1,
      completedSteps: [],
      canProceed: false,
    },
  };
}

/**
 * PlannerScreen Main Component
 */
export function PlannerScreen() {
  const navigation = useNavigation();
  const { show: showToast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [context, setContext] = useState<PlanningWizardContext>(createInitialContext());

  // Animation for step transitions
  const slideAnim = useRef(new Animated.Value(0)).current;

  /**
   * Check if current step is valid to proceed
   */
  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return context.destination !== null;
      case 2:
        return context.dateRange !== null;
      case 3:
        return context.preferences.interests.length > 0;
      case 4:
        return context.itinerary !== null;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, context]);

  /**
   * Navigate to next step
   */
  const handleNext = useCallback(() => {
    if (!canProceed()) {
      haptics.notification('warning');
      showToast('Please complete this step first', 'warning');
      return;
    }

    if (currentStep < 5) {
      haptics.impact('light');

      // Animate slide out
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep((prev) => (prev + 1) as WizardStep);
        slideAnim.setValue(SCREEN_WIDTH);

        // Animate slide in
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentStep, canProceed, slideAnim, showToast]);

  /**
   * Navigate to previous step
   */
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      haptics.impact('light');

      // Animate slide out
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep((prev) => (prev - 1) as WizardStep);
        slideAnim.setValue(-SCREEN_WIDTH);

        // Animate slide in
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentStep, slideAnim]);

  /**
   * Jump to specific step (only completed ones)
   */
  const handleStepPress = useCallback(
    (step: WizardStep) => {
      // Can only go back to completed steps or current step
      if (step <= currentStep) {
        haptics.impact('light');
        setCurrentStep(step);
      }
    },
    [currentStep]
  );

  /**
   * Handle destination selection
   */
  const handleDestinationSelect = useCallback((destination: Destination) => {
    setContext((prev) => ({
      ...prev,
      destination,
    }));
    haptics.notification('success');
  }, []);

  /**
   * Handle date range selection
   */
  const handleDateChange = useCallback((dateRange: DateRange | null) => {
    setContext((prev) => ({
      ...prev,
      dateRange,
    }));
  }, []);

  /**
   * Handle preferences update
   */
  const handlePreferencesChange = useCallback((preferences: TripPreferences) => {
    setContext((prev) => ({
      ...prev,
      preferences,
    }));
  }, []);

  /**
   * Handle itinerary generation complete
   */
  const handleGenerationComplete = useCallback((itinerary: Itinerary) => {
    setContext((prev) => ({
      ...prev,
      itinerary,
    }));
    // Auto-advance to editor
    setTimeout(() => {
      setCurrentStep(5);
    }, 500);
  }, []);

  /**
   * Handle itinerary update from editor
   */
  const handleItineraryUpdate = useCallback((itinerary: Itinerary) => {
    setContext((prev) => ({
      ...prev,
      itinerary,
    }));
  }, []);

  /**
   * Handle save trip
   */
  const handleSaveTrip = useCallback(() => {
    haptics.notification('success');
    showToast('Trip saved successfully!', 'success');
    // TODO: Save to storage/backend
    Alert.alert(
      'Trip Saved! 🎉',
      `Your trip to ${context.destination?.name} has been saved. You can find it in your profile.`,
      [
        { text: 'View Trips', onPress: () => navigation.navigate('Profile' as never) },
        { text: 'OK', style: 'cancel' },
      ]
    );
  }, [context.destination, navigation, showToast]);

  /**
   * Handle start trip
   */
  const handleStartTrip = useCallback(() => {
    haptics.notification('success');
    showToast('Starting your trip!', 'success');
    // Navigate to Live screen with trip context
    navigation.navigate('Live' as never);
  }, [navigation, showToast]);

  /**
   * Handle cancel wizard
   */
  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Planning?',
      'Your progress will be lost. Are you sure?',
      [
        { text: 'Keep Planning', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            setContext(createInitialContext());
            setCurrentStep(1);
            navigation.goBack();
          },
        },
      ]
    );
  }, [navigation]);

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <DestinationSearch
            selectedDestination={context.destination}
            onSelectDestination={handleDestinationSelect}
          />
        );

      case 2:
        return (
          <DateRangePicker
            selectedRange={context.dateRange}
            onRangeChange={handleDateChange}
            isFlexible={context.isFlexibleDates}
            onFlexibilityChange={(flexible) =>
              setContext((prev) => ({ ...prev, isFlexibleDates: flexible }))
            }
            insights={context.dateInsights}
          />
        );

      case 3:
        return (
          <PreferencesForm
            preferences={context.preferences}
            onPreferencesChange={handlePreferencesChange}
          />
        );

      case 4:
        return (
          <AIGenerationStep
            destination={context.destination!}
            dateRange={context.dateRange!}
            preferences={context.preferences}
            onGenerationComplete={handleGenerationComplete}
          />
        );

      case 5:
        return context.itinerary ? (
          <ItineraryEditor
            itinerary={context.itinerary}
            onItineraryUpdate={handleItineraryUpdate}
            onSave={handleSaveTrip}
            onStartTrip={handleStartTrip}
          />
        ) : null;

      default:
        return null;
    }
  };

  /**
   * Get step title
   */
  const getStepTitle = (): string => {
    switch (currentStep) {
      case 1:
        return 'Choose Destination';
      case 2:
        return 'Pick Dates';
      case 3:
        return 'Set Preferences';
      case 4:
        return 'Creating Your Trip';
      case 5:
        return 'Review & Edit';
      default:
        return '';
    }
  };

  const completedSteps: WizardStep[] = [];
  for (let i = 1; i < currentStep; i++) {
    completedSteps.push(i as WizardStep);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{getStepTitle()}</Text>

        <View style={styles.headerRight}>
          {currentStep > 1 && currentStep < 4 && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress Indicator */}
      <WizardProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepPress={handleStepPress}
      />

      {/* Step Content */}
      <Animated.View
        style={[
          styles.stepContent,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {renderStepContent()}
      </Animated.View>

      {/* Bottom Navigation (not shown on step 4 & 5) */}
      {currentStep < 4 && (
        <View style={styles.bottomNav}>
          {currentStep > 1 && (
            <TouchableOpacity onPress={handleBack} style={styles.backNavButton}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.backNavText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled,
            ]}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 3 ? 'Generate Trip' : 'Next'}
            </Text>
            <Ionicons
              name={currentStep === 3 ? 'sparkles' : 'arrow-forward'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  cancelButton: {
    padding: spacing.xs,
    width: 40,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: spacing.xs,
  },

  // Step Content
  stepContent: {
    flex: 1,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    ...shadows.small,
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backNavText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    marginLeft: 'auto',
    ...shadows.small,
  },
  nextButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  nextButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default PlannerScreen;
