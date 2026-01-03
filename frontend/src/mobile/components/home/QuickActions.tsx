/**
 * QuickActions Component
 *
 * Floating Action Button (FAB) with expandable actions:
 * - Primary: Plan new trip
 * - Secondary actions: AI Chat, Search, Scan (QR/Tickets)
 *
 * Adapts based on user state
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../theme/tokens';
import { UserState } from './UserStateManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}

interface QuickActionsProps {
  userState: UserState;
  onPlanTrip?: () => void;
  onChat?: () => void;
  onSearch?: () => void;
  onScan?: () => void;
  onNavigate?: () => void;
  onAddActivity?: () => void;
}

/**
 * Get actions based on user state
 */
function getActionsForState(
  state: UserState,
  handlers: Omit<QuickActionsProps, 'userState'>
): { primary: QuickAction; secondary: QuickAction[] } {
  const { onPlanTrip, onChat, onSearch, onScan, onNavigate, onAddActivity } = handlers;

  switch (state) {
    case 'ActiveTrip':
      return {
        primary: {
          id: 'navigate',
          icon: 'navigate',
          label: 'נווט',
          color: colors.success,
          onPress: onNavigate || (() => {}),
        },
        secondary: [
          { id: 'add', icon: 'add-circle-outline', label: 'הוסף פעילות', onPress: onAddActivity || (() => {}) },
          { id: 'chat', icon: 'chatbubble-ellipses-outline', label: 'צ׳אט AI', onPress: onChat || (() => {}) },
          { id: 'scan', icon: 'scan-outline', label: 'סרוק', onPress: onScan || (() => {}) },
        ],
      };

    case 'PlannedTrip':
      return {
        primary: {
          id: 'plan',
          icon: 'create-outline',
          label: 'ערוך טיול',
          onPress: onPlanTrip || (() => {}),
        },
        secondary: [
          { id: 'chat', icon: 'chatbubble-ellipses-outline', label: 'צ׳אט AI', onPress: onChat || (() => {}) },
          { id: 'search', icon: 'search-outline', label: 'חפש', onPress: onSearch || (() => {}) },
        ],
      };

    case 'NewUser':
    case 'BetweenTrips':
    case 'PostTrip':
    default:
      return {
        primary: {
          id: 'plan',
          icon: 'add',
          label: 'תכנן טיול',
          onPress: onPlanTrip || (() => {}),
        },
        secondary: [
          { id: 'chat', icon: 'chatbubble-ellipses-outline', label: 'צ׳אט AI', onPress: onChat || (() => {}) },
          { id: 'search', icon: 'search-outline', label: 'חפש יעד', onPress: onSearch || (() => {}) },
          { id: 'scan', icon: 'scan-outline', label: 'סרוק', onPress: onScan || (() => {}) },
        ],
      };
  }
}

/**
 * Secondary Action Button
 */
function SecondaryActionButton({
  action,
  index,
  isExpanded,
  animatedValue,
}: {
  action: QuickAction;
  index: number;
  isExpanded: boolean;
  animatedValue: Animated.Value;
}) {
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(60 + index * 56)],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Animated.View
      style={[
        styles.secondaryButton,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents={isExpanded ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={styles.secondaryButtonInner}
        onPress={action.onPress}
        activeOpacity={0.8}
      >
        <Ionicons name={action.icon} size={22} color={colors.primary} />
      </TouchableOpacity>
      <Animated.View style={[styles.labelContainer, { opacity }]}>
        <Text style={styles.actionLabel}>{action.label}</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function QuickActions({
  userState,
  onPlanTrip,
  onChat,
  onSearch,
  onScan,
  onNavigate,
  onAddActivity,
}: QuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const { primary, secondary } = getActionsForState(userState, {
    onPlanTrip,
    onChat,
    onSearch,
    onScan,
    onNavigate,
    onAddActivity,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedValue, {
        toValue: isExpanded ? 1 : 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded, animatedValue, rotateAnim]);

  const handlePrimaryPress = () => {
    if (secondary.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      primary.onPress();
    }
  };

  const handlePrimaryLongPress = () => {
    primary.onPress();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const backdropOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setIsExpanded(false)}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* FAB Container */}
      <View style={styles.container}>
        {/* Secondary Actions */}
        {secondary.map((action, index) => (
          <SecondaryActionButton
            key={action.id}
            action={action}
            index={index}
            isExpanded={isExpanded}
            animatedValue={animatedValue}
          />
        ))}

        {/* Primary FAB */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: primary.color || colors.primary },
          ]}
          onPress={handlePrimaryPress}
          onLongPress={handlePrimaryLongPress}
          activeOpacity={0.9}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons
              name={isExpanded ? 'close' : primary.icon}
              size={28}
              color={colors.surface}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Primary Label (when collapsed) */}
        {!isExpanded && (
          <View style={styles.primaryLabelContainer}>
            <Text style={styles.primaryLabel}>{primary.label}</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.text,
    zIndex: 99,
  },
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 100,
  },
  primaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
    elevation: 6,
  },
  primaryLabelContainer: {
    position: 'absolute',
    right: 64,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    ...shadows.small,
  },
  primaryLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  secondaryButton: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
    elevation: 4,
  },
  labelContainer: {
    position: 'absolute',
    right: 52,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    ...shadows.small,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
});

export default QuickActions;
