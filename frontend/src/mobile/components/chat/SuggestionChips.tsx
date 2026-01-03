/**
 * SuggestionChips Component - AI Chat Quick Actions
 *
 * Production-ready suggestion chips displayed below chat input.
 * Features: dynamic suggestions based on context, RTL support, icon support.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { SuggestionChip, SuggestionAction } from './types';

interface SuggestionChipsProps {
  suggestions: SuggestionChip[];
  onChipPress: (chip: SuggestionChip) => void;
  language?: 'he' | 'en';
  isLoading?: boolean;
  maxVisible?: number;
}

/**
 * Get icon for suggestion based on action type
 */
function getDefaultIcon(action: SuggestionAction): string {
  switch (action.type) {
    case 'send_message':
      return 'chatbubble-outline';
    case 'open_screen':
      return 'open-outline';
    case 'start_planning':
      return 'airplane-outline';
    case 'show_weather':
      return 'partly-sunny-outline';
    case 'navigate':
      return 'navigate-outline';
    default:
      return 'arrow-forward-outline';
  }
}

/**
 * Individual chip component
 */
function Chip({
  chip,
  onPress,
  language,
  index,
  isLoading,
}: {
  chip: SuggestionChip;
  onPress: () => void;
  language: 'he' | 'en';
  index: number;
  isLoading: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Staggered entrance animation
  useEffect(() => {
    const delay = index * 50;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scaleAnim, opacityAnim, index]);

  const handlePress = useCallback(() => {
    if (isLoading) return;

    haptics.selection();

    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  }, [isLoading, scaleAnim, onPress]);

  const label = language === 'he' && chip.labelHe ? chip.labelHe : chip.label;
  const icon = chip.icon || getDefaultIcon(chip.action);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <TouchableOpacity
        style={[styles.chip, isLoading && styles.chipDisabled]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <Ionicons
          name={icon as any}
          size={16}
          color={isLoading ? colors.textTertiary : colors.primary}
        />
        <Text style={[styles.chipText, isLoading && styles.chipTextDisabled]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SuggestionChips({
  suggestions,
  onChipPress,
  language = 'he',
  isLoading = false,
  maxVisible = 6,
}: SuggestionChipsProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Sort by priority and limit
  const visibleSuggestions = React.useMemo(() => {
    return [...suggestions]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxVisible);
  }, [suggestions, maxVisible]);

  // Handle chip press
  const handleChipPress = useCallback(
    (chip: SuggestionChip) => {
      onChipPress(chip);
    },
    [onChipPress]
  );

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const isRTL = language === 'he' || I18nManager.isRTL;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isRTL && styles.scrollContentRTL,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {visibleSuggestions.map((chip, index) => (
          <Chip
            key={chip.id}
            chip={chip}
            onPress={() => handleChipPress(chip)}
            language={language}
            index={index}
            isLoading={isLoading}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Default suggestion chips for common scenarios
 */
export function getDefaultSuggestions(
  context: 'idle' | 'active_trip' | 'planning' | 'post_trip',
  language: 'he' | 'en'
): SuggestionChip[] {
  const now = Date.now();

  switch (context) {
    case 'idle':
      return [
        {
          id: `${now}-1`,
          label: 'Plan a trip',
          labelHe: 'תכנן טיול',
          icon: 'airplane-outline',
          action: { type: 'start_planning' },
          priority: 10,
        },
        {
          id: `${now}-2`,
          label: 'Where should I go?',
          labelHe: 'לאן כדאי לנסוע?',
          icon: 'help-circle-outline',
          action: { type: 'send_message', text: language === 'he' ? 'לאן כדאי לנסוע?' : 'Where should I go?' },
          priority: 9,
        },
        {
          id: `${now}-3`,
          label: "Today's weather",
          labelHe: 'מזג אוויר היום',
          icon: 'partly-sunny-outline',
          action: { type: 'show_weather' },
          priority: 8,
        },
        {
          id: `${now}-4`,
          label: 'Nearby restaurants',
          labelHe: 'מסעדות בסביבה',
          icon: 'restaurant-outline',
          action: { type: 'send_message', text: language === 'he' ? 'מסעדות בסביבה' : 'Nearby restaurants' },
          priority: 7,
        },
      ];

    case 'active_trip':
      return [
        {
          id: `${now}-1`,
          label: "What's next?",
          labelHe: 'מה הבא?',
          icon: 'arrow-forward-circle-outline',
          action: { type: 'send_message', text: language === 'he' ? 'מה הבא בתכנית?' : "What's next on the schedule?" },
          priority: 10,
        },
        {
          id: `${now}-2`,
          label: 'Lunch nearby',
          labelHe: 'ארוחת צהריים',
          icon: 'restaurant-outline',
          action: { type: 'send_message', text: language === 'he' ? 'איפה כדאי לאכול צהריים?' : 'Where should I have lunch?' },
          priority: 9,
        },
        {
          id: `${now}-3`,
          label: 'Weather update',
          labelHe: 'עדכון מזג אוויר',
          icon: 'partly-sunny-outline',
          action: { type: 'show_weather' },
          priority: 8,
        },
        {
          id: `${now}-4`,
          label: 'Change plans',
          labelHe: 'שנה תכנית',
          icon: 'swap-horizontal-outline',
          action: { type: 'send_message', text: language === 'he' ? 'אני רוצה לשנות את התכנית' : 'I want to change my plans' },
          priority: 7,
        },
        {
          id: `${now}-5`,
          label: 'Help!',
          labelHe: 'עזרה!',
          icon: 'help-buoy-outline',
          action: { type: 'send_message', text: language === 'he' ? 'אני צריך עזרה' : 'I need help' },
          priority: 6,
        },
      ];

    case 'planning':
      return [
        {
          id: `${now}-1`,
          label: 'Add attraction',
          labelHe: 'הוסף אטרקציה',
          icon: 'add-circle-outline',
          action: { type: 'send_message', text: language === 'he' ? 'הוסף אטרקציה לטיול' : 'Add an attraction to my trip' },
          priority: 10,
        },
        {
          id: `${now}-2`,
          label: 'Optimize route',
          labelHe: 'בצע אופטימיזציה',
          icon: 'git-merge-outline',
          action: { type: 'send_message', text: language === 'he' ? 'בצע אופטימיזציה למסלול' : 'Optimize my route' },
          priority: 9,
        },
        {
          id: `${now}-3`,
          label: 'Budget estimate',
          labelHe: 'הערכת תקציב',
          icon: 'wallet-outline',
          action: { type: 'send_message', text: language === 'he' ? 'מה התקציב המשוער?' : 'What is the estimated budget?' },
          priority: 8,
        },
        {
          id: `${now}-4`,
          label: 'Weather forecast',
          labelHe: 'תחזית מזג אוויר',
          icon: 'cloudy-outline',
          action: { type: 'show_weather' },
          priority: 7,
        },
      ];

    case 'post_trip':
      return [
        {
          id: `${now}-1`,
          label: 'Rate places',
          labelHe: 'דרג מקומות',
          icon: 'star-outline',
          action: { type: 'send_message', text: language === 'he' ? 'אני רוצה לדרג את המקומות' : 'I want to rate the places I visited' },
          priority: 10,
        },
        {
          id: `${now}-2`,
          label: 'Plan next trip',
          labelHe: 'תכנן טיול הבא',
          icon: 'airplane-outline',
          action: { type: 'start_planning' },
          priority: 9,
        },
        {
          id: `${now}-3`,
          label: 'Share trip',
          labelHe: 'שתף טיול',
          icon: 'share-outline',
          action: { type: 'send_message', text: language === 'he' ? 'אני רוצה לשתף את הטיול' : 'I want to share my trip' },
          priority: 8,
        },
        {
          id: `${now}-4`,
          label: 'View memories',
          labelHe: 'צפה בזכרונות',
          icon: 'images-outline',
          action: { type: 'open_screen', screen: 'Memories' },
          priority: 7,
        },
      ];

    default:
      return [];
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContentRTL: {
    flexDirection: 'row-reverse',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    ...typography.footnote,
    color: colors.primary,
    fontWeight: '500',
  },
  chipTextDisabled: {
    color: colors.textTertiary,
  },
});

export default SuggestionChips;
