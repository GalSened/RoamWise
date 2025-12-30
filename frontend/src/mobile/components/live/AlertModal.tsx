/**
 * AlertModal - High-contrast safety alert overlay
 *
 * Displays critical safety alerts for:
 * - DANGER: Won't reach destination before sunset
 * - OFF-TRAIL: User has strayed > 50m from trail
 *
 * Features:
 * - High contrast colors for outdoor visibility
 * - Clear action buttons
 * - Haptic feedback on appearance
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafetyStatus } from '../../managers/NavigationManager';
import { colors, spacing, typography, borderRadius } from '../../theme/tokens';

interface AlertModalProps {
  visible: boolean;
  safetyStatus: SafetyStatus;
  isOffTrail: boolean;
  offTrailDistance: number;
  safetyBuffer: number;
  onDismiss: () => void;
  onReturnToTrail?: () => void;
  onEmergency?: () => void;
}

/**
 * Get alert configuration based on status
 */
function getAlertConfig(
  safetyStatus: SafetyStatus,
  isOffTrail: boolean,
  offTrailDistance: number,
  safetyBuffer: number
) {
  if (isOffTrail) {
    return {
      title: 'Off Trail Warning',
      icon: 'compass-outline' as const,
      message: `You are ${offTrailDistance}m from the trail`,
      description:
        'Return to the marked trail for your safety. The trail is marked with painted markers.',
      backgroundColor: colors.warning,
      primaryAction: 'Return to Trail',
      primaryIcon: 'navigate-outline' as const,
    };
  }

  if (safetyStatus === 'DANGER') {
    return {
      title: 'Sunset Alert',
      icon: 'warning' as const,
      message: 'You may not reach your destination before sunset',
      description: `Estimated arrival is ${Math.abs(safetyBuffer)} minutes after sunset. Consider turning back or finding shelter.`,
      backgroundColor: colors.danger,
      primaryAction: 'Call for Help',
      primaryIcon: 'call-outline' as const,
    };
  }

  // WARNING status
  return {
    title: 'Time Warning',
    icon: 'time-outline' as const,
    message: `Only ${safetyBuffer} minutes of daylight remaining`,
    description:
      'Consider picking up pace or preparing for low-light conditions.',
    backgroundColor: colors.warning,
    primaryAction: 'Got It',
    primaryIcon: 'checkmark-outline' as const,
  };
}

export function AlertModal({
  visible,
  safetyStatus,
  isOffTrail,
  offTrailDistance,
  safetyBuffer,
  onDismiss,
  onReturnToTrail,
  onEmergency,
}: AlertModalProps) {
  // Vibrate on modal appearance for haptic feedback
  useEffect(() => {
    if (visible) {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [visible]);

  const config = getAlertConfig(
    safetyStatus,
    isOffTrail,
    offTrailDistance,
    safetyBuffer
  );

  const handlePrimaryAction = () => {
    if (isOffTrail && onReturnToTrail) {
      onReturnToTrail();
    } else if (safetyStatus === 'DANGER' && onEmergency) {
      onEmergency();
    } else {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: config.backgroundColor },
          ]}
        >
          {/* Alert Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={60} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{config.message}</Text>

          {/* Description */}
          <Text style={styles.description}>{config.description}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Primary Action */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePrimaryAction}
            >
              <Ionicons
                name={config.primaryIcon}
                size={24}
                color={config.backgroundColor}
              />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: config.backgroundColor },
                ]}
              >
                {config.primaryAction}
              </Text>
            </TouchableOpacity>

            {/* Dismiss Button */}
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency SOS (always visible in danger mode) */}
          {safetyStatus === 'DANGER' && (
            <TouchableOpacity style={styles.sosButton} onPress={onEmergency}>
              <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
              <Text style={styles.sosButtonText}>Emergency SOS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title1,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.headline,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.headline,
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  dismissButtonText: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  sosButtonText: {
    ...typography.subhead,
    color: '#FFFFFF',
  },
});

export default AlertModal;
