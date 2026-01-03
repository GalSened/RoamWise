/**
 * BucketList Component
 *
 * Displays and manages the user's travel bucket list:
 * - Destinations they want to visit
 * - Experiences they want to have
 * - Achievement goals
 *
 * Features:
 * - AI enrichment (best time, budget, tips)
 * - Status tracking (dream → booked)
 * - Priority sorting
 * - Deal alerts integration
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { BucketListItem, BucketListItemStatus } from './types';

interface BucketListProps {
  items: BucketListItem[];
  onItemPress?: (item: BucketListItem) => void;
  onAddItem?: () => void;
  onStatusChange?: (itemId: string, status: BucketListItemStatus) => void;
  onDeleteItem?: (itemId: string) => void;
}

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<BucketListItemStatus, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}> = {
  dream: { label: 'חלום', icon: 'sparkles-outline', color: '#EC4899', bgColor: '#FCE7F3' },
  researching: { label: 'מחקר', icon: 'search-outline', color: '#8B5CF6', bgColor: '#EDE9FE' },
  planning: { label: 'תכנון', icon: 'calendar-outline', color: '#3B82F6', bgColor: '#DBEAFE' },
  booked: { label: 'הוזמן', icon: 'checkmark-circle-outline', color: '#10B981', bgColor: '#D1FAE5' },
  completed: { label: 'הושלם', icon: 'trophy-outline', color: '#F59E0B', bgColor: '#FEF3C7' },
};

/**
 * Priority stars component
 */
function PriorityStars({ priority }: { priority: 1 | 2 | 3 }) {
  return (
    <View style={styles.priorityContainer}>
      {[1, 2, 3].map((star) => (
        <Ionicons
          key={star}
          name={star <= (4 - priority) ? 'star' : 'star-outline'}
          size={12}
          color={star <= (4 - priority) ? colors.warning : colors.border}
        />
      ))}
    </View>
  );
}

/**
 * AI Enrichment Badge
 */
function AIEnrichmentBadge({
  enrichment,
}: {
  enrichment: NonNullable<BucketListItem['aiEnrichment']>;
}) {
  return (
    <View style={styles.enrichmentContainer}>
      <View style={styles.enrichmentBadge}>
        <Ionicons name="sparkles" size={10} color={colors.primary} />
        <Text style={styles.enrichmentLabel}>AI</Text>
      </View>

      {enrichment.matchScore !== undefined && (
        <View style={styles.matchScoreBadge}>
          <Text style={styles.matchScoreText}>{enrichment.matchScore}% התאמה</Text>
        </View>
      )}

      {enrichment.bestTimeToVisit && (
        <View style={styles.enrichmentChip}>
          <Ionicons name="calendar-outline" size={10} color={colors.textSecondary} />
          <Text style={styles.enrichmentChipText}>{enrichment.bestTimeToVisit}</Text>
        </View>
      )}

      {enrichment.estimatedBudget && (
        <View style={styles.enrichmentChip}>
          <Ionicons name="wallet-outline" size={10} color={colors.textSecondary} />
          <Text style={styles.enrichmentChipText}>{enrichment.estimatedBudget}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Bucket List Item Card
 */
function BucketListItemCard({
  item,
  onPress,
  onStatusChange,
}: {
  item: BucketListItem;
  onPress?: () => void;
  onStatusChange?: (status: BucketListItemStatus) => void;
}) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusConfig = STATUS_CONFIG[item.status];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.98, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  const handleStatusChange = (status: BucketListItemStatus) => {
    setShowStatusPicker(false);
    onStatusChange?.(status);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.itemCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Image */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Ionicons
              name={item.type === 'destination' ? 'location-outline' : 'flag-outline'}
              size={24}
              color={colors.textSecondary}
            />
          </View>
        )}

        {/* Content */}
        <View style={styles.itemContent}>
          {/* Header */}
          <View style={styles.itemHeader}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <PriorityStars priority={item.priority} />
            </View>

            {/* Status Badge */}
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}
              onPress={() => setShowStatusPicker(!showStatusPicker)}
            >
              <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Ionicons name="chevron-down" size={12} color={statusConfig.color} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* AI Enrichment */}
          {item.aiEnrichment && (
            <AIEnrichmentBadge enrichment={item.aiEnrichment} />
          )}

          {/* Target Date */}
          {item.targetDate && (
            <View style={styles.targetDateRow}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.targetDateText}>
                יעד: {new Date(item.targetDate).toLocaleDateString('he-IL', {
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Status Picker Dropdown */}
        {showStatusPicker && (
          <View style={styles.statusPicker}>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusPickerItem,
                  item.status === status && styles.statusPickerItemActive,
                ]}
                onPress={() => handleStatusChange(status as BucketListItemStatus)}
              >
                <Ionicons name={config.icon} size={16} color={config.color} />
                <Text style={[styles.statusPickerText, { color: config.color }]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Empty State Component
 */
function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={40} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>רשימת החלומות שלך ריקה</Text>
      <Text style={styles.emptyDescription}>
        הוסף יעדים וחוויות שאתה חולם עליהם
      </Text>
      {onAdd && (
        <TouchableOpacity style={styles.addButtonLarge} onPress={onAdd}>
          <Ionicons name="add" size={20} color={colors.surface} />
          <Text style={styles.addButtonText}>הוסף לרשימה</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Filter Tabs Component
 */
function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: BucketListItemStatus | 'all';
  onFilterChange: (filter: BucketListItemStatus | 'all') => void;
  counts: Record<BucketListItemStatus | 'all', number>;
}) {
  const filters: Array<{ key: BucketListItemStatus | 'all'; label: string }> = [
    { key: 'all', label: 'הכל' },
    { key: 'dream', label: '✨ חלומות' },
    { key: 'planning', label: '📅 בתכנון' },
    { key: 'booked', label: '✅ הוזמנו' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterTabs}
      contentContainerStyle={styles.filterTabsContent}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterTab,
            activeFilter === filter.key && styles.filterTabActive,
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <Text
            style={[
              styles.filterTabText,
              activeFilter === filter.key && styles.filterTabTextActive,
            ]}
          >
            {filter.label}
          </Text>
          {counts[filter.key] > 0 && (
            <View
              style={[
                styles.filterTabCount,
                activeFilter === filter.key && styles.filterTabCountActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabCountText,
                  activeFilter === filter.key && styles.filterTabCountTextActive,
                ]}
              >
                {counts[filter.key]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/**
 * Main BucketList Component
 */
export function BucketList({
  items,
  onItemPress,
  onAddItem,
  onStatusChange,
  onDeleteItem,
}: BucketListProps) {
  const [activeFilter, setActiveFilter] = useState<BucketListItemStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    return {
      all: items.length,
      dream: items.filter((i) => i.status === 'dream').length,
      researching: items.filter((i) => i.status === 'researching').length,
      planning: items.filter((i) => i.status === 'planning').length,
      booked: items.filter((i) => i.status === 'booked').length,
      completed: items.filter((i) => i.status === 'completed').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by status
    if (activeFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === activeFilter);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query)
      );
    }

    // Sort by priority then by date
    return filtered.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, activeFilter, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>רשימת משאלות</Text>
          <Text style={styles.subtitle}>
            {counts.all} פריטים · {counts.completed} הושלמו
          </Text>
        </View>
        {onAddItem && (
          <TouchableOpacity style={styles.addButton} onPress={onAddItem}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="חפש ברשימה..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      {/* Items List */}
      {filteredItems.length > 0 ? (
        <View style={styles.itemsList}>
          {filteredItems.map((item) => (
            <BucketListItemCard
              key={item.id}
              item={item}
              onPress={() => onItemPress?.(item)}
              onStatusChange={(status) => onStatusChange?.(item.id, status)}
            />
          ))}
        </View>
      ) : (
        <EmptyState onAdd={onAddItem} />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  filterTabs: {
    marginTop: spacing.sm,
  },
  filterTabsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.surface,
  },
  filterTabCount: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  filterTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterTabCountText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTabCountTextActive: {
    color: colors.surface,
  },
  itemsList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemImage: {
    width: 80,
    height: 100,
  },
  itemImagePlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    padding: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  itemTitleRow: {
    flex: 1,
    marginRight: spacing.xs,
  },
  itemTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  enrichmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  enrichmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  enrichmentLabel: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: '700',
  },
  matchScoreBadge: {
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  matchScoreText: {
    fontSize: 9,
    color: colors.success,
    fontWeight: '600',
  },
  enrichmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  enrichmentChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  targetDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  targetDateText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  statusPicker: {
    position: 'absolute',
    top: 36,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.medium,
    zIndex: 10,
    padding: spacing.xs,
  },
  statusPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusPickerItemActive: {
    backgroundColor: colors.background,
  },
  statusPickerText: {
    ...typography.caption,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    marginBottom: spacing.md,
  },
  addButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default BucketList;
