/**
 * WorldMapCard Component
 *
 * Interactive scratch-map style world visualization showing:
 * - Visited countries (colored/scratched)
 * - Planned destinations
 * - Wishlist places
 *
 * Features:
 * - SVG world map with country highlighting
 * - Animated scratch reveal
 * - Stats summary
 * - Filter by status
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { VisitedPlace, VisitStatus } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - spacing.md * 4;
const MAP_HEIGHT = MAP_WIDTH * 0.55;

interface WorldMapCardProps {
  visitedPlaces: VisitedPlace[];
  onPlacePress?: (place: VisitedPlace) => void;
  onAddPlace?: () => void;
}

/**
 * Simplified world map paths (major continents/countries)
 * In a real app, use a proper GeoJSON or TopoJSON data
 */
const WORLD_REGIONS = [
  // Europe
  { id: 'EU', path: 'M280,80 L320,75 L340,90 L330,110 L300,115 L275,100 Z', name: 'אירופה' },
  // Asia
  { id: 'AS', path: 'M340,70 L420,60 L440,100 L420,140 L360,130 L340,95 Z', name: 'אסיה' },
  // Africa
  { id: 'AF', path: 'M280,115 L320,120 L330,180 L290,200 L260,170 L265,130 Z', name: 'אפריקה' },
  // North America
  { id: 'NA', path: 'M60,60 L150,50 L160,110 L120,140 L70,120 L50,80 Z', name: 'צפון אמריקה' },
  // South America
  { id: 'SA', path: 'M100,150 L140,140 L150,200 L120,240 L90,210 L85,170 Z', name: 'דרום אמריקה' },
  // Australia
  { id: 'OC', path: 'M400,180 L450,175 L460,210 L430,230 L395,215 L390,190 Z', name: 'אוקיאניה' },
];

/**
 * Sample city positions (normalized 0-100 coordinates)
 */
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
  'Paris': { x: 58.5, y: 37 },
  'London': { x: 56, y: 33 },
  'Rome': { x: 62, y: 42 },
  'Barcelona': { x: 55, y: 42 },
  'Amsterdam': { x: 58, y: 34 },
  'Berlin': { x: 62, y: 35 },
  'New York': { x: 24, y: 42 },
  'Tokyo': { x: 88, y: 40 },
  'Sydney': { x: 90, y: 78 },
  'Dubai': { x: 72, y: 50 },
  'Bangkok': { x: 80, y: 55 },
  'Tel Aviv': { x: 68, y: 45 },
};

/**
 * Status colors and labels
 */
const STATUS_CONFIG: Record<VisitStatus, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  visited: { color: colors.success, label: 'ביקרתי', icon: 'checkmark-circle' },
  planned: { color: colors.primary, label: 'מתוכנן', icon: 'calendar' },
  wishlist: { color: colors.warning, label: 'רשימת משאלות', icon: 'heart' },
};

/**
 * Status Filter Tabs
 */
function StatusFilters({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: VisitStatus | 'all';
  onFilterChange: (filter: VisitStatus | 'all') => void;
  counts: Record<VisitStatus | 'all', number>;
}) {
  const filters: Array<{ key: VisitStatus | 'all'; label: string }> = [
    { key: 'all', label: 'הכל' },
    { key: 'visited', label: 'ביקרתי' },
    { key: 'planned', label: 'מתוכנן' },
    { key: 'wishlist', label: 'משאלות' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtersContainer}
      contentContainerStyle={styles.filtersContent}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterChip,
            activeFilter === filter.key && styles.filterChipActive,
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === filter.key && styles.filterChipTextActive,
            ]}
          >
            {filter.label}
          </Text>
          <View
            style={[
              styles.filterCount,
              activeFilter === filter.key && styles.filterCountActive,
            ]}
          >
            <Text
              style={[
                styles.filterCountText,
                activeFilter === filter.key && styles.filterCountTextActive,
              ]}
            >
              {counts[filter.key]}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/**
 * Map Legend Component
 */
function MapLegend() {
  return (
    <View style={styles.legend}>
      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
        <View key={status} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: config.color }]} />
          <Text style={styles.legendText}>{config.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Stats Summary Component
 */
function StatsSummary({ places }: { places: VisitedPlace[] }) {
  const stats = useMemo(() => {
    const countries = places.filter((p) => p.type === 'country' && p.status === 'visited');
    const cities = places.filter((p) => p.type === 'city' && p.status === 'visited');
    return {
      countries: countries.length,
      cities: cities.length,
    };
  }, [places]);

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.countries}</Text>
        <Text style={styles.statLabel}>מדינות</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.cities}</Text>
        <Text style={styles.statLabel}>ערים</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {Math.round((stats.countries / 195) * 100)}%
        </Text>
        <Text style={styles.statLabel}>מהעולם</Text>
      </View>
    </View>
  );
}

/**
 * City Marker Component
 */
function CityMarker({
  place,
  onPress,
}: {
  place: VisitedPlace;
  onPress?: () => void;
}) {
  const position = CITY_POSITIONS[place.name];
  if (!position) return null;

  const config = STATUS_CONFIG[place.status];
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
      delay: Math.random() * 300,
    }).start();
  }, [scaleAnim]);

  const x = (position.x / 100) * MAP_WIDTH;
  const y = (position.y / 100) * MAP_HEIGHT;

  return (
    <TouchableOpacity
      style={[
        styles.cityMarker,
        { left: x - 6, top: y - 6 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.cityDot,
          { backgroundColor: config.color, transform: [{ scale: scaleAnim }] },
        ]}
      />
    </TouchableOpacity>
  );
}

/**
 * Place List Item
 */
function PlaceListItem({
  place,
  onPress,
}: {
  place: VisitedPlace;
  onPress?: () => void;
}) {
  const config = STATUS_CONFIG[place.status];

  return (
    <TouchableOpacity style={styles.placeItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.placeIcon, { backgroundColor: `${config.color}20` }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
      </View>
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeType}>
          {place.type === 'country' ? '🌍 מדינה' : '🏙️ עיר'}
        </Text>
      </View>
      {place.visitedAt && (
        <Text style={styles.placeDate}>
          {new Date(place.visitedAt).toLocaleDateString('he-IL', {
            month: 'short',
            year: '2-digit',
          })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Main WorldMapCard Component
 */
export function WorldMapCard({ visitedPlaces, onPlacePress, onAddPlace }: WorldMapCardProps) {
  const [activeFilter, setActiveFilter] = useState<VisitStatus | 'all'>('all');

  const filteredPlaces = useMemo(() => {
    if (activeFilter === 'all') return visitedPlaces;
    return visitedPlaces.filter((p) => p.status === activeFilter);
  }, [visitedPlaces, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: visitedPlaces.length,
      visited: visitedPlaces.filter((p) => p.status === 'visited').length,
      planned: visitedPlaces.filter((p) => p.status === 'planned').length,
      wishlist: visitedPlaces.filter((p) => p.status === 'wishlist').length,
    };
  }, [visitedPlaces]);

  const cityPlaces = filteredPlaces.filter((p) => p.type === 'city');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>מפת העולם שלי</Text>
          <Text style={styles.subtitle}>איפה כבר היית ולאן תרצה להגיע</Text>
        </View>
        {onAddPlace && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPlace}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <StatsSummary places={visitedPlaces} />

      {/* Map */}
      <View style={styles.mapContainer}>
        <Svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
          <G>
            {WORLD_REGIONS.map((region) => (
              <Path
                key={region.id}
                d={region.path}
                fill={colors.background}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
          </G>
        </Svg>

        {/* City Markers */}
        {cityPlaces.map((place) => (
          <CityMarker
            key={place.id}
            place={place}
            onPress={() => onPlacePress?.(place)}
          />
        ))}

        {/* Legend */}
        <MapLegend />
      </View>

      {/* Filters */}
      <StatusFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      {/* Places List */}
      <View style={styles.placesList}>
        {filteredPlaces.slice(0, 5).map((place) => (
          <PlaceListItem
            key={place.id}
            place={place}
            onPress={() => onPlacePress?.(place)}
          />
        ))}

        {filteredPlaces.length > 5 && (
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>
              הצג עוד {filteredPlaces.length - 5} מקומות
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {filteredPlaces.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="globe-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'התחל להוסיף מקומות למפה שלך'
                : `אין מקומות ב${STATUS_CONFIG[activeFilter as VisitStatus].label}`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    margin: spacing.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  mapContainer: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    alignSelf: 'center',
    backgroundColor: `${colors.primary}05`,
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  legend: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  cityMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  filtersContainer: {
    marginTop: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  filterCount: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterCountText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterCountTextActive: {
    color: colors.surface,
  },
  placesList: {
    padding: spacing.md,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  placeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  placeType: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  placeDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  showMoreText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default WorldMapCard;
