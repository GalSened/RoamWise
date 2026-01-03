/**
 * ConfirmationCard Component - AI Chat Action Card
 *
 * Production-ready confirmation card displayed after user actions in chat.
 * Features: success/undo message, related item info, time-limited undo.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { ConfirmationCardData, ConfirmationAction } from './types';

interface ConfirmationCardProps {
  data: ConfirmationCardData;
  onUndo: (confirmationId: string) => Promise<boolean>;
  onViewRelated?: (type: 'place' | 'destination' | 'trip', id: string) => void;
  language?: 'he' | 'en';
}

/**
 * Get confirmation config based on action type
 */
function getConfirmationConfig(
  action: ConfirmationAction,
  language: 'he' | 'en'
): { icon: string; color: string; bgColor: string } {
  const configs: Record<ConfirmationAction, { icon: string; color: string; bgColor: string }> = {
    added_to_trip: {
      icon: 'checkmark-circle',
      color: colors.success,
      bgColor: '#E8F5E9',
    },
    saved_to_bucket_list: {
      icon: 'heart',
      color: colors.danger,
      bgColor: '#FFEBEE',
    },
    removed_from_trip: {
      icon: 'trash',
      color: colors.warning,
      bgColor: '#FFF3E0',
    },
    trip_created: {
      icon: 'airplane',
      color: colors.primary,
      bgColor: '#E3F2FD',
    },
    navigation_started: {
      icon: 'navigate',
      color: colors.success,
      bgColor: '#E8F5E9',
    },
  };

  return configs[action];
}

/**
 * Format remaining time for undo
 */
function formatRemainingTime(expiryDate: Date, language: 'he' | 'en'): string {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();

  if (diff <= 0) return '';

  const seconds = Math.ceil(diff / 1000);

  if (language === 'he') {
    return `${seconds} שניות לביטול`;
  }
  return `${seconds}s to undo`;
}

export function ConfirmationCard({
  data,
  onUndo,
  onViewRelated,
  language = 'he',
}: ConfirmationCardProps) {
  const { id, action, title, description, relatedItem, canUndo, undoExpiry } = data;

  // Animation for entrance
  const [slideAnim] = useState(new Animated.Value(-20));
  const [opacityAnim] = useState(new Animated.Value(0));

  // Undo countdown
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isUndoExpired, setIsUndoExpired] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Get config
  const config = useMemo(() => getConfirmationConfig(action, language), [action, language]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  // Undo countdown timer
  useEffect(() => {
    if (!canUndo || !undoExpiry) {
      setIsUndoExpired(true);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const expiry = new Date(undoExpiry);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setIsUndoExpired(true);
        setRemainingTime('');
      } else {
        setRemainingTime(formatRemainingTime(expiry, language));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [canUndo, undoExpiry, language]);

  // Handle undo press
  const handleUndo = useCallback(async () => {
    if (isUndoing || isUndoExpired) return;

    haptics.impact('medium');
    setIsUndoing(true);

    try {
      const success = await onUndo(id);

      if (success) {
        haptics.notification('success');
        // Animate out
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 20,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        haptics.notification('error');
        setIsUndoing(false);
      }
    } catch (error) {
      haptics.notification('error');
      setIsUndoing(false);
    }
  }, [id, isUndoing, isUndoExpired, onUndo, slideAnim, opacityAnim]);

  // Handle view related item
  const handleViewRelated = useCallback(() => {
    if (!relatedItem || !onViewRelated) return;

    haptics.impact('light');
    onViewRelated(relatedItem.type, relatedItem.id);
  }, [relatedItem, onViewRelated]);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bgColor },
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Icon and content */}
      <View style={styles.mainRow}>
        <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
          <Ionicons name={config.icon as any} size={20} color="#FFFFFF" />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Related item link */}
          {relatedItem && onViewRelated && (
            <TouchableOpacity style={styles.relatedLink} onPress={handleViewRelated}>
              <Text style={styles.relatedText}>
                {language === 'he' ? 'צפה ב' : 'View'} {relatedItem.name}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Undo button */}
      {canUndo && !isUndoExpired && (
        <View style={styles.undoContainer}>
          <TouchableOpacity
            style={[styles.undoButton, isUndoing && styles.undoButtonDisabled]}
            onPress={handleUndo}
            disabled={isUndoing}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-undo"
              size={16}
              color={isUndoing ? colors.textTertiary : colors.primary}
            />
            <Text style={[styles.undoText, isUndoing && styles.undoTextDisabled]}>
              {isUndoing
                ? language === 'he'
                  ? 'מבטל...'
                  : 'Undoing...'
                : language === 'he'
                  ? 'בטל'
                  : 'Undo'}
            </Text>
          </TouchableOpacity>

          {remainingTime && (
            <Text style={styles.countdownText}>{remainingTime}</Text>
          )}
        </View>
      )}

      {/* Progress bar for undo expiry */}
      {canUndo && !isUndoExpired && undoExpiry && (
        <UndoProgressBar expiry={new Date(undoExpiry)} color={config.color} />
      )}
    </Animated.View>
  );
}

/**
 * Progress bar component for undo expiry
 */
function UndoProgressBar({ expiry, color }: { expiry: Date; color: string }) {
  const [progress, setProgress] = useState(1);
  const TOTAL_DURATION = 10000; // 10 seconds default

  useEffect(() => {
    const startTime = Date.now();
    const endTime = expiry.getTime();
    const duration = endTime - startTime;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = endTime - now;
      const newProgress = Math.max(0, remaining / duration);
      setProgress(newProgress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [expiry]);

  return (
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressBar,
          {
            backgroundColor: color,
            width: `${progress * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },

  // Main row
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
    color: colors.text,
  },
  description: {
    ...typography.footnote,
    color: colors.textSecondary,
  },

  // Related link
  relatedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  relatedText: {
    ...typography.footnote,
    color: colors.primary,
    fontWeight: '500',
  },

  // Undo
  undoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  undoButtonDisabled: {
    opacity: 0.5,
  },
  undoText: {
    ...typography.footnote,
    color: colors.primary,
    fontWeight: '600',
  },
  undoTextDisabled: {
    color: colors.textTertiary,
  },
  countdownText: {
    ...typography.caption2,
    color: colors.textSecondary,
  },

  // Progress bar
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
});

export default ConfirmationCard;
