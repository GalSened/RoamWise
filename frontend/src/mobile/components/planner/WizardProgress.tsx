/**
 * WizardProgress Component
 *
 * Displays the 5-step wizard progress indicator.
 * Shows completed, current, and upcoming steps.
 * Allows navigation to completed steps.
 *
 * Features:
 * - Animated step transitions
 * - Connecting lines between steps
 * - Step labels with icons
 * - Haptic feedback on step tap
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/tokens';
import { haptics } from '../../../utils/haptics';
import { WizardStep, WIZARD_STEPS, WizardProgressProps } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Single Step Indicator
 */
interface StepIndicatorProps {
  step: WizardStep;
  title: string;
  icon: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isClickable: boolean;
  onPress: () => void;
}

function StepIndicator({
  step,
  title,
  icon,
  isCompleted,
  isCurrent,
  isClickable,
  onPress,
}: StepIndicatorProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCurrent) {
      // Pulse animation for current step
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCurrent, pulseAnim]);

  const handlePress = () => {
    if (!isClickable) return;

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    haptics.impact('light');
    onPress();
  };

  const getStepStyle = () => {
    if (isCompleted) {
      return {
        container: styles.stepCompleted,
        icon: colors.surface,
        text: colors.primary,
      };
    }
    if (isCurrent) {
      return {
        container: styles.stepCurrent,
        icon: colors.surface,
        text: colors.primary,
      };
    }
    return {
      container: styles.stepPending,
      icon: colors.textTertiary,
      text: colors.textTertiary,
    };
  };

  const stepStyle = getStepStyle();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!isClickable}
      activeOpacity={isClickable ? 0.7 : 1}
    >
      <Animated.View
        style={[
          styles.stepContainer,
          {
            transform: [
              { scale: isCurrent ? pulseAnim : scaleAnim },
            ],
          },
        ]}
      >
        <View style={[styles.stepCircle, stepStyle.container]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color={stepStyle.icon} />
          ) : (
            <Ionicons name={icon as any} size={16} color={stepStyle.icon} />
          )}
        </View>
        <Text
          style={[
            styles.stepLabel,
            { color: stepStyle.text },
            isCurrent && styles.stepLabelCurrent,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

/**
 * Connecting Line Between Steps
 */
interface ConnectingLineProps {
  isCompleted: boolean;
}

function ConnectingLine({ isCompleted }: ConnectingLineProps) {
  const widthAnim = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: isCompleted ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isCompleted, widthAnim]);

  return (
    <View style={styles.lineContainer}>
      <View style={styles.lineBackground} />
      <Animated.View
        style={[
          styles.lineFilled,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

/**
 * Main WizardProgress Component
 */
export function WizardProgress({
  currentStep,
  completedSteps,
  onStepPress,
}: WizardProgressProps) {
  const isStepCompleted = (step: WizardStep): boolean => {
    return completedSteps.includes(step);
  };

  const isStepClickable = (step: WizardStep): boolean => {
    // Can only go to completed steps or current step
    return isStepCompleted(step) || step === currentStep;
  };

  const handleStepPress = (step: WizardStep) => {
    if (onStepPress && isStepClickable(step)) {
      onStepPress(step);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {WIZARD_STEPS.map((stepData, index) => (
          <React.Fragment key={stepData.step}>
            <StepIndicator
              step={stepData.step}
              title={stepData.title}
              icon={stepData.icon}
              isCompleted={isStepCompleted(stepData.step)}
              isCurrent={currentStep === stepData.step}
              isClickable={isStepClickable(stepData.step)}
              onPress={() => handleStepPress(stepData.step)}
            />
            {index < WIZARD_STEPS.length - 1 && (
              <ConnectingLine
                isCompleted={isStepCompleted(stepData.step)}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Current Step Title */}
      <View style={styles.currentStepHeader}>
        <Text style={styles.currentStepTitle}>
          {WIZARD_STEPS.find((s) => s.step === currentStep)?.title}
        </Text>
        <Text style={styles.stepCounter}>
          שלב {currentStep} מתוך {WIZARD_STEPS.length}
        </Text>
      </View>
    </View>
  );
}

const STEP_SIZE = 36;
const LINE_WIDTH = (SCREEN_WIDTH - 32 - STEP_SIZE * 5) / 4 - 8;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    width: STEP_SIZE + 8,
  },
  stepCircle: {
    width: STEP_SIZE,
    height: STEP_SIZE,
    borderRadius: STEP_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCompleted: {
    backgroundColor: colors.primary,
  },
  stepCurrent: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  stepPending: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepLabel: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    fontWeight: '600',
  },
  lineContainer: {
    width: LINE_WIDTH,
    height: 2,
    marginTop: STEP_SIZE / 2 - 1,
    marginHorizontal: 4,
  },
  lineBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  lineFilled: {
    position: 'absolute',
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  currentStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  currentStepTitle: {
    ...typography.h3,
    color: colors.text,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default WizardProgress;
