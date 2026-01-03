/**
 * TravelDNARadar Component
 *
 * Displays a 7-dimension radar chart showing the user's travel style:
 * - Cultural, Culinary, Adventure, Relaxation, Nightlife, Nature, Shopping
 *
 * Features:
 * - Animated SVG radar chart
 * - AI-generated persona description
 * - Confidence indicator
 * - Matching destinations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { TravelDNA, TravelStyleDimensions } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = Math.min(SCREEN_WIDTH - spacing.lg * 4, 280);
const CENTER = CHART_SIZE / 2;
const RADIUS = (CHART_SIZE / 2) - 30;

interface TravelDNARadarProps {
  travelDNA: TravelDNA | null;
  isLoading?: boolean;
  onAnalyze?: () => void;
}

/**
 * Dimension labels with Hebrew translations and icons
 */
const DIMENSIONS: Array<{
  key: keyof TravelStyleDimensions;
  label: string;
  icon: string;
  color: string;
}> = [
  { key: 'cultural', label: 'תרבות', icon: '🏛️', color: '#8B5CF6' },
  { key: 'culinary', label: 'קולינריה', icon: '🍽️', color: '#F97316' },
  { key: 'adventure', label: 'הרפתקה', icon: '🏔️', color: '#EF4444' },
  { key: 'relaxation', label: 'רוגע', icon: '🏖️', color: '#06B6D4' },
  { key: 'nightlife', label: 'חיי לילה', icon: '🎉', color: '#EC4899' },
  { key: 'nature', label: 'טבע', icon: '🌲', color: '#10B981' },
  { key: 'shopping', label: 'קניות', icon: '🛍️', color: '#F59E0B' },
];

/**
 * Calculate point position on radar
 */
function getPoint(index: number, value: number, maxValue: number = 100): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / DIMENSIONS.length - Math.PI / 2;
  const radius = (value / maxValue) * RADIUS;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

/**
 * Generate polygon points string for SVG
 */
function getPolygonPoints(values: number[]): string {
  return values
    .map((value, index) => {
      const point = getPoint(index, value);
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

/**
 * Radar Grid Component
 */
function RadarGrid() {
  const levels = [20, 40, 60, 80, 100];

  return (
    <G>
      {/* Grid circles */}
      {levels.map((level) => (
        <Circle
          key={level}
          cx={CENTER}
          cy={CENTER}
          r={(level / 100) * RADIUS}
          fill="none"
          stroke={colors.border}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      ))}

      {/* Axis lines */}
      {DIMENSIONS.map((_, index) => {
        const point = getPoint(index, 100);
        return (
          <Line
            key={index}
            x1={CENTER}
            y1={CENTER}
            x2={point.x}
            y2={point.y}
            stroke={colors.border}
            strokeWidth={0.5}
          />
        );
      })}
    </G>
  );
}

/**
 * Dimension Labels Component
 */
function DimensionLabels() {
  return (
    <G>
      {DIMENSIONS.map((dim, index) => {
        const point = getPoint(index, 115);
        return (
          <SvgText
            key={dim.key}
            x={point.x}
            y={point.y}
            fill={colors.text}
            fontSize={11}
            fontWeight="500"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {dim.icon} {dim.label}
          </SvgText>
        );
      })}
    </G>
  );
}

/**
 * Data Polygon Component
 */
function DataPolygon({ styles }: { styles: TravelStyleDimensions }) {
  const values = DIMENSIONS.map((dim) => styles[dim.key]);
  const points = getPolygonPoints(values);

  return (
    <Polygon
      points={points}
      fill={`${colors.primary}30`}
      stroke={colors.primary}
      strokeWidth={2}
    />
  );
}

/**
 * Data Points Component
 */
function DataPoints({ styles }: { styles: TravelStyleDimensions }) {
  return (
    <G>
      {DIMENSIONS.map((dim, index) => {
        const value = styles[dim.key];
        const point = getPoint(index, value);
        return (
          <Circle
            key={dim.key}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={dim.color}
            stroke={colors.surface}
            strokeWidth={2}
          />
        );
      })}
    </G>
  );
}

/**
 * Persona Card Component
 */
function PersonaCard({ persona, confidence }: { persona: TravelDNA['persona']; confidence: number }) {
  return (
    <View style={styles.personaCard}>
      <View style={styles.personaHeader}>
        <Text style={styles.personaTitle}>{persona.title}</Text>
        <View style={styles.confidenceBadge}>
          <Ionicons name="analytics-outline" size={12} color={colors.primary} />
          <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
        </View>
      </View>
      <Text style={styles.personaDescription}>{persona.description}</Text>

      {persona.matchingDestinations.length > 0 && (
        <View style={styles.matchingSection}>
          <Text style={styles.matchingTitle}>יעדים מתאימים לך:</Text>
          <View style={styles.destinationChips}>
            {persona.matchingDestinations.slice(0, 3).map((dest, index) => (
              <View key={index} style={styles.destinationChip}>
                <Text style={styles.destinationChipText}>{dest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Style Breakdown Component
 */
function StyleBreakdown({ styles: travelStyles }: { styles: TravelStyleDimensions }) {
  const sortedDimensions = [...DIMENSIONS].sort(
    (a, b) => travelStyles[b.key] - travelStyles[a.key]
  );

  return (
    <View style={styles.breakdownContainer}>
      {sortedDimensions.slice(0, 3).map((dim) => (
        <View key={dim.key} style={styles.breakdownItem}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownIcon}>{dim.icon}</Text>
            <Text style={styles.breakdownLabel}>{dim.label}</Text>
            <Text style={styles.breakdownValue}>{travelStyles[dim.key]}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${travelStyles[dim.key]}%`, backgroundColor: dim.color },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Empty State Component
 */
function EmptyState({ onAnalyze }: { onAnalyze?: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>גלה את ה-DNA של המטייל שלך</Text>
      <Text style={styles.emptyDescription}>
        נתח את הטיולים שלך וגלה את סגנון הנסיעות הייחודי שלך
      </Text>
      {onAnalyze && (
        <View style={styles.analyzeButton}>
          <Text style={styles.analyzeButtonText}>נתח עכשיו</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Loading State Component
 */
function LoadingState() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingIcon, { opacity: pulseAnim }]}>
        <Ionicons name="analytics" size={48} color={colors.primary} />
      </Animated.View>
      <Text style={styles.loadingText}>מנתח את סגנון הנסיעות שלך...</Text>
    </View>
  );
}

/**
 * Main TravelDNARadar Component
 */
export function TravelDNARadar({ travelDNA, isLoading, onAnalyze }: TravelDNARadarProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (travelDNA) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [travelDNA, fadeAnim]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>DNA מטייל</Text>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (!travelDNA) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>DNA מטייל</Text>
        </View>
        <EmptyState onAnalyze={onAnalyze} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>DNA מטייל</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="airplane-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{travelDNA.analyzedTrips} טיולים</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{travelDNA.analyzedActivities} פעילויות</Text>
          </View>
        </View>
      </View>

      {/* Radar Chart */}
      <Animated.View style={[styles.chartContainer, { opacity: fadeAnim }]}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          <RadarGrid />
          <DataPolygon styles={travelDNA.styles} />
          <DataPoints styles={travelDNA.styles} />
          <DimensionLabels />
        </Svg>
      </Animated.View>

      {/* Style Breakdown */}
      <StyleBreakdown styles={travelDNA.styles} />

      {/* Persona Card */}
      <PersonaCard persona={travelDNA.persona} confidence={travelDNA.confidence} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    margin: spacing.md,
    ...shadows.medium,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  breakdownContainer: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  breakdownItem: {
    marginBottom: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breakdownIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  breakdownValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  personaCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  personaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  personaTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  confidenceText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  personaDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  matchingSection: {
    marginTop: spacing.md,
  },
  matchingTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  destinationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  destinationChip: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  destinationChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  analyzeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  analyzeButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingIcon: {
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default TravelDNARadar;
