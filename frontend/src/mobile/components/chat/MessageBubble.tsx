/**
 * MessageBubble Component - AI Chat Message Display
 *
 * Production-ready message bubble supporting text, metadata, action cards,
 * and suggestion chips. Integrates with ActionCard system for rich responses.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { ActionCard } from './ActionCard';
import {
  ExtendedChatMessage,
  ActionCard as ActionCardType,
  ActionCardCallbacks,
  SuggestionChip,
} from './types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MessageBubbleProps {
  message: ExtendedChatMessage;
  callbacks: ActionCardCallbacks;
  onOptionSelect?: (option: string) => void;
  onSuggestionPress?: (chip: SuggestionChip) => void;
  language?: 'he' | 'en';
  isLastMessage?: boolean;
}

/**
 * Format timestamp for display
 */
function formatTime(date: Date, language: 'he' | 'en'): string {
  const d = new Date(date);
  return d.toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get typing indicator dots animation
 */
function TypingIndicator() {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingContainer}>
      {[dot1, dot2, dot3].map((dot, index) => (
        <Animated.View key={index} style={[styles.typingDot, dotStyle(dot)]} />
      ))}
    </View>
  );
}

/**
 * Message content with markdown-like formatting
 */
function MessageContent({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  // Basic formatting: **bold**, *italic*, `code`
  const formattedContent = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let remaining = content;
    let key = 0;

    // Process bold
    const boldRegex = /\*\*(.+?)\*\*/g;
    const italicRegex = /\*(.+?)\*/g;
    const codeRegex = /`(.+?)`/g;

    // Split by formatting patterns
    const segments = remaining.split(/(\*\*.+?\*\*|\*.+?\*|`.+?`)/g);

    segments.forEach((segment) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        parts.push(
          <Text
            key={key++}
            style={[styles.boldText, isUser && styles.userBoldText]}
          >
            {segment.slice(2, -2)}
          </Text>
        );
      } else if (
        segment.startsWith('*') &&
        segment.endsWith('*') &&
        !segment.startsWith('**')
      ) {
        parts.push(
          <Text
            key={key++}
            style={[styles.italicText, isUser && styles.userItalicText]}
          >
            {segment.slice(1, -1)}
          </Text>
        );
      } else if (segment.startsWith('`') && segment.endsWith('`')) {
        parts.push(
          <Text
            key={key++}
            style={[styles.codeText, isUser && styles.userCodeText]}
          >
            {segment.slice(1, -1)}
          </Text>
        );
      } else if (segment) {
        parts.push(
          <Text key={key++} style={isUser ? styles.userText : styles.assistantText}>
            {segment}
          </Text>
        );
      }
    });

    return parts;
  }, [content, isUser]);

  return (
    <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
      {formattedContent}
    </Text>
  );
}

export function MessageBubble({
  message,
  callbacks,
  onOptionSelect,
  onSuggestionPress,
  language = 'he',
  isLastMessage = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { metadata, actionCards, suggestions, isStreaming } = message;

  // Entrance animation
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  // Handle option press
  const handleOptionPress = useCallback(
    (option: string) => {
      haptics.selection();
      onOptionSelect?.(option);
    },
    [onOptionSelect]
  );

  // Handle suggestion press
  const handleSuggestionPress = useCallback(
    (chip: SuggestionChip) => {
      haptics.selection();
      onSuggestionPress?.(chip);
    },
    [onSuggestionPress]
  );

  // Get message type indicator
  const typeIndicator = useMemo(() => {
    if (!metadata?.type) return null;

    const indicators: Record<string, { icon: string; color: string }> = {
      question: { icon: 'help-circle', color: colors.info },
      suggestion: { icon: 'bulb', color: colors.warning },
      route: { icon: 'map', color: colors.primary },
      weather: { icon: 'partly-sunny', color: colors.warning },
      info: { icon: 'information-circle', color: colors.secondary },
      error: { icon: 'alert-circle', color: colors.danger },
    };

    const indicator = indicators[metadata.type];
    if (!indicator) return null;

    return (
      <View style={styles.typeIndicator}>
        <Ionicons name={indicator.icon as any} size={14} color={indicator.color} />
      </View>
    );
  }, [metadata?.type]);

  // Context used badge (for debugging/transparency)
  const contextBadge = useMemo(() => {
    if (!metadata?.contextUsed || metadata.contextUsed.length === 0) return null;

    return (
      <View style={styles.contextBadge}>
        <Ionicons name="layers-outline" size={12} color={colors.textTertiary} />
        <Text style={styles.contextBadgeText}>
          {metadata.contextUsed.length} {language === 'he' ? 'הקשרים' : 'contexts'}
        </Text>
      </View>
    );
  }, [metadata?.contextUsed, language]);

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
        </View>
      )}

      <View style={styles.contentWrapper}>
        {/* Main bubble */}
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            isStreaming && styles.streamingBubble,
          ]}
        >
          {/* Type indicator */}
          {typeIndicator}

          {/* Message content or typing indicator */}
          {isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <MessageContent content={message.content} isUser={isUser} />
          )}

          {/* Options (for questions) */}
          {metadata?.options && metadata.options.length > 0 && (
            <View style={styles.optionsContainer}>
              {metadata.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionChip}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Action Cards */}
        {actionCards && actionCards.length > 0 && (
          <View style={styles.actionCardsContainer}>
            {actionCards.map((card) => (
              <ActionCard
                key={card.id}
                card={card}
                callbacks={callbacks}
                language={language}
              />
            ))}
          </View>
        )}

        {/* Suggestion chips (only for last assistant message) */}
        {!isUser && isLastMessage && suggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions
              .sort((a, b) => b.priority - a.priority)
              .slice(0, 4)
              .map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestionPress(chip)}
                  activeOpacity={0.7}
                >
                  {chip.icon && (
                    <Ionicons
                      name={chip.icon as any}
                      size={14}
                      color={colors.primary}
                    />
                  )}
                  <Text style={styles.suggestionText}>
                    {language === 'he' && chip.labelHe ? chip.labelHe : chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Footer: timestamp and context badge */}
        <View style={[styles.footer, isUser && styles.userFooter]}>
          {!isUser && contextBadge}
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.assistantTimestamp,
            ]}
          >
            {formatTime(message.timestamp, language)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },

  // Avatar
  avatarContainer: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // Content wrapper
  contentWrapper: {
    maxWidth: '85%',
    flexShrink: 1,
  },

  // Bubble
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadows.small,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  streamingBubble: {
    borderColor: colors.primary,
    borderWidth: 1,
  },

  // Type indicator
  typeIndicator: {
    position: 'absolute',
    top: -8,
    left: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // Message text
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: colors.text,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  userBoldText: {
    color: '#FFFFFF',
  },
  italicText: {
    fontStyle: 'italic',
    color: colors.text,
  },
  userItalicText: {
    color: '#FFFFFF',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    color: colors.secondary,
  },
  userCodeText: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#FFFFFF',
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Options
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  optionChip: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  optionText: {
    ...typography.footnote,
    color: colors.primary,
    fontWeight: '500',
  },

  // Action cards
  actionCardsContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  // Suggestions
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  suggestionText: {
    ...typography.caption1,
    color: colors.primary,
    fontWeight: '500',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  userFooter: {
    justifyContent: 'flex-end',
  },
  timestamp: {
    ...typography.caption2,
  },
  userTimestamp: {
    color: colors.textTertiary,
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: colors.textTertiary,
    textAlign: 'left',
  },

  // Context badge
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  contextBadgeText: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
});

export default MessageBubble;
