/**
 * PreferencesForm Component (Step 3)
 *
 * Collects trip preferences including:
 * - Trip pace (relaxed to intense)
 * - Interests (culture, food, adventure, etc.)
 * - Budget level
 * - Must-see attractions
 * - Special requirements
 *
 * Features:
 * - Visual chip selection
 * - Pace slider
 * - Budget selector
 * - Must-see input
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../../utils/haptics';
import {
  TripPreferences,
  TripPace,
  TripInterest,
  BudgetLevel,
  PreferencesFormProps,
  TRIP_INTERESTS,
  PACE_OPTIONS,
  BUDGET_OPTIONS,
} from './types';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Section Header
 */
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon: string;
}

function SectionHeader({ title, subtitle, icon }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconContainer}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

/**
 * Pace Selector
 */
interface PaceSelectorProps {
  selected: TripPace;
  onSelect: (pace: TripPace) => void;
}

function PaceSelector({ selected, onSelect }: PaceSelectorProps) {
  return (
    <View style={styles.paceContainer}>
      {PACE_OPTIONS.map((option, index) => {
        const isSelected = selected === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.paceOption,
              isSelected && styles.paceOptionSelected,
              index === 0 && styles.paceOptionFirst,
              index === PACE_OPTIONS.length - 1 && styles.paceOptionLast,
            ]}
            onPress={() => {
              haptics.impact('light');
              onSelect(option.id);
            }}
          >
            <View
              style={[
                styles.paceIconContainer,
                isSelected && styles.paceIconContainerSelected,
              ]}
            >
              <Ionicons
                name={option.icon as any}
                size={20}
                color={isSelected ? colors.surface : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.paceLabel,
                isSelected && styles.paceLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.paceDescription,
                isSelected && styles.paceDescriptionSelected,
              ]}
            >
              {option.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Interest Chip
 */
interface InterestChipProps {
  interest: typeof TRIP_INTERESTS[0];
  isSelected: boolean;
  onToggle: () => void;
}

function InterestChip({ interest, isSelected, onToggle }: InterestChipProps) {
  return (
    <TouchableOpacity
      style={[styles.interestChip, isSelected && styles.interestChipSelected]}
      onPress={() => {
        haptics.impact('light');
        onToggle();
      }}
    >
      <Text style={styles.interestEmoji}>{interest.emoji}</Text>
      <Text
        style={[
          styles.interestLabel,
          isSelected && styles.interestLabelSelected,
        ]}
      >
        {interest.label}
      </Text>
      {isSelected && (
        <View style={styles.interestCheck}>
          <Ionicons name="checkmark" size={12} color={colors.surface} />
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Interests Grid
 */
interface InterestsGridProps {
  selected: TripInterest[];
  onToggle: (interest: TripInterest) => void;
}

function InterestsGrid({ selected, onToggle }: InterestsGridProps) {
  return (
    <View style={styles.interestsGrid}>
      {TRIP_INTERESTS.map((interest) => (
        <InterestChip
          key={interest.id}
          interest={interest}
          isSelected={selected.includes(interest.id)}
          onToggle={() => onToggle(interest.id)}
        />
      ))}
    </View>
  );
}

/**
 * Budget Selector
 */
interface BudgetSelectorProps {
  selected: BudgetLevel;
  onSelect: (budget: BudgetLevel) => void;
}

function BudgetSelector({ selected, onSelect }: BudgetSelectorProps) {
  return (
    <View style={styles.budgetContainer}>
      {BUDGET_OPTIONS.map((option) => {
        const isSelected = selected === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.budgetOption,
              isSelected && styles.budgetOptionSelected,
            ]}
            onPress={() => {
              haptics.impact('light');
              onSelect(option.id);
            }}
          >
            {isSelected && (
              <LinearGradient
                colors={[colors.primary, '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <Ionicons
              name={option.icon as any}
              size={24}
              color={isSelected ? colors.surface : colors.textSecondary}
            />
            <Text
              style={[
                styles.budgetLabel,
                isSelected && styles.budgetLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            <Text
              style={[
                styles.budgetDescription,
                isSelected && styles.budgetDescriptionSelected,
              ]}
            >
              {option.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Must-See Input with chips
 */
interface MustSeeInputProps {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
}

function MustSeeInput({ items, onAdd, onRemove }: MustSeeInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !items.includes(inputValue.trim())) {
      haptics.impact('light');
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <View style={styles.mustSeeContainer}>
      <View style={styles.mustSeeInputRow}>
        <TextInput
          style={styles.mustSeeInput}
          placeholder="הוסף מקום שחייב לראות..."
          placeholderTextColor={colors.textTertiary}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[
            styles.mustSeeAddButton,
            !inputValue.trim() && styles.mustSeeAddButtonDisabled,
          ]}
          onPress={handleAdd}
          disabled={!inputValue.trim()}
        >
          <Ionicons name="add" size={20} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {items.length > 0 && (
        <View style={styles.mustSeeChips}>
          {items.map((item) => (
            <View key={item} style={styles.mustSeeChip}>
              <Ionicons name="location" size={12} color={colors.primary} />
              <Text style={styles.mustSeeChipText}>{item}</Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.impact('light');
                  onRemove(item);
                }}
              >
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Toggle Option
 */
interface ToggleOptionProps {
  label: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  onToggle: () => void;
}

function ToggleOption({
  label,
  description,
  icon,
  isEnabled,
  onToggle,
}: ToggleOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.toggleOption, isEnabled && styles.toggleOptionEnabled]}
      onPress={() => {
        haptics.impact('light');
        onToggle();
      }}
    >
      <View style={styles.toggleContent}>
        <View style={[styles.toggleIcon, isEnabled && styles.toggleIconEnabled]}>
          <Ionicons
            name={icon as any}
            size={18}
            color={isEnabled ? colors.surface : colors.textSecondary}
          />
        </View>
        <View style={styles.toggleTextContainer}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
      </View>
      <Ionicons
        name={isEnabled ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={isEnabled ? colors.primary : colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PreferencesForm({
  preferences,
  onPreferencesChange,
  destination,
  dateRange,
}: PreferencesFormProps) {
  const updatePreferences = useCallback(
    (updates: Partial<TripPreferences>) => {
      onPreferencesChange({ ...preferences, ...updates });
    },
    [preferences, onPreferencesChange]
  );

  const handleInterestToggle = useCallback(
    (interest: TripInterest) => {
      const currentInterests = preferences.interests || [];
      const newInterests = currentInterests.includes(interest)
        ? currentInterests.filter((i) => i !== interest)
        : [...currentInterests, interest];
      updatePreferences({ interests: newInterests });
    },
    [preferences.interests, updatePreferences]
  );

  const handleAddMustSee = useCallback(
    (item: string) => {
      const current = preferences.mustSee || [];
      updatePreferences({ mustSee: [...current, item] });
    },
    [preferences.mustSee, updatePreferences]
  );

  const handleRemoveMustSee = useCallback(
    (item: string) => {
      const current = preferences.mustSee || [];
      updatePreferences({ mustSee: current.filter((i) => i !== item) });
    },
    [preferences.mustSee, updatePreferences]
  );

  const toggleAccessibility = useCallback(
    (key: keyof NonNullable<TripPreferences['accessibility']>) => {
      const current = preferences.accessibility || {};
      updatePreferences({
        accessibility: {
          ...current,
          [key]: !current[key],
        },
      });
    },
    [preferences.accessibility, updatePreferences]
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Trip Summary */}
      {destination && (
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={[colors.primary, '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.summaryGradient}
          >
            <Ionicons name="airplane" size={20} color={colors.surface} />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>
                {destination.nameHebrew || destination.name}
              </Text>
              {dateRange && (
                <Text style={styles.summaryDates}>
                  {Math.ceil(
                    (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1}{' '}
                  ימים
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Pace Section */}
      <View style={styles.section}>
        <SectionHeader
          title="קצב הטיול"
          subtitle="כמה פעילויות ביום?"
          icon="speedometer-outline"
        />
        <PaceSelector
          selected={preferences.pace}
          onSelect={(pace) => updatePreferences({ pace })}
        />
      </View>

      {/* Interests Section */}
      <View style={styles.section}>
        <SectionHeader
          title="תחומי עניין"
          subtitle="בחר מה מעניין אותך (מינימום 2)"
          icon="heart-outline"
        />
        <InterestsGrid
          selected={preferences.interests || []}
          onToggle={handleInterestToggle}
        />
        {(preferences.interests?.length || 0) < 2 && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
            <Text style={styles.warningText}>
              בחר לפחות 2 תחומי עניין לתוצאות טובות יותר
            </Text>
          </View>
        )}
      </View>

      {/* Budget Section */}
      <View style={styles.section}>
        <SectionHeader
          title="תקציב"
          subtitle="רמת ההוצאות המועדפת"
          icon="wallet-outline"
        />
        <BudgetSelector
          selected={preferences.budgetLevel}
          onSelect={(budgetLevel) => updatePreferences({ budgetLevel })}
        />
      </View>

      {/* Must-See Section */}
      <View style={styles.section}>
        <SectionHeader
          title="מקומות חובה"
          subtitle="אטרקציות שחייב לכלול"
          icon="star-outline"
        />
        <MustSeeInput
          items={preferences.mustSee || []}
          onAdd={handleAddMustSee}
          onRemove={handleRemoveMustSee}
        />
      </View>

      {/* Accessibility Section */}
      <View style={styles.section}>
        <SectionHeader
          title="דרישות מיוחדות"
          subtitle="נגישות והתאמות"
          icon="accessibility-outline"
        />
        <View style={styles.togglesContainer}>
          <ToggleOption
            label="נגישות לכיסא גלגלים"
            description="רק מקומות עם נגישות מלאה"
            icon="accessibility"
            isEnabled={preferences.accessibility?.wheelchairAccessible || false}
            onToggle={() => toggleAccessibility('wheelchairAccessible')}
          />
          <ToggleOption
            label="מתאים לילדים"
            description="פעילויות משפחתיות"
            icon="people"
            isEnabled={preferences.accessibility?.childFriendly || false}
            onToggle={() => toggleAccessibility('childFriendly')}
          />
          <ToggleOption
            label="ידידותי לחיות מחמד"
            description="מקומות שמקבלים חיות"
            icon="paw"
            isEnabled={preferences.accessibility?.petFriendly || false}
            onToggle={() => toggleAccessibility('petFriendly')}
          />
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  // Summary Card
  summaryCard: {
    margin: spacing.md,
  },
  summaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.h4,
    color: colors.surface,
  },
  summaryDates: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  // Section
  section: {
    padding: spacing.md,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Pace
  paceContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.small,
  },
  paceOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  paceOptionFirst: {},
  paceOptionLast: {
    borderRightWidth: 0,
  },
  paceOptionSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  paceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  paceIconContainerSelected: {
    backgroundColor: colors.primary,
  },
  paceLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  paceLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  paceDescription: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
    textAlign: 'center',
  },
  paceDescriptionSelected: {
    color: colors.primary,
  },
  // Interests
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadows.small,
  },
  interestChipSelected: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  interestEmoji: {
    fontSize: 16,
  },
  interestLabel: {
    ...typography.body,
    color: colors.text,
  },
  interestLabelSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  interestCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.lg,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
  },
  // Budget
  budgetContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  budgetOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.small,
  },
  budgetOptionSelected: {
    borderColor: colors.primary,
  },
  budgetLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  budgetLabelSelected: {
    color: colors.surface,
  },
  budgetDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
  budgetDescriptionSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  // Must-See
  mustSeeContainer: {},
  mustSeeInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mustSeeInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    textAlign: 'right',
    ...shadows.small,
  },
  mustSeeAddButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mustSeeAddButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  mustSeeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mustSeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    ...shadows.small,
  },
  mustSeeChipText: {
    ...typography.caption,
    color: colors.text,
  },
  // Toggles
  togglesContainer: {
    gap: spacing.sm,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  toggleOptionEnabled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIconEnabled: {
    backgroundColor: colors.primary,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  toggleDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Bottom
  bottomPadding: {
    height: spacing.xl,
  },
});

export default PreferencesForm;
