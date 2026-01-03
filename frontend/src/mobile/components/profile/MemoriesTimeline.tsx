/**
 * MemoriesTimeline Component
 *
 * Displays a chronological timeline of travel memories:
 * - Photos from trips
 * - Ratings and notes
 * - Location markers
 * - Interactive memory cards
 *
 * Features:
 * - Vertical timeline layout
 * - Year/Month grouping
 * - Photo gallery preview
 * - Memory details modal
 * - Filter by trip/year
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { Memory, MemoryTrigger } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MemoriesTimelineProps {
  memories: Memory[];
  isLoading?: boolean;
  onMemoryPress?: (memory: Memory) => void;
  onAddMemory?: () => void;
}

/**
 * Group memories by year and month
 */
interface MemoryGroup {
  year: number;
  month: number;
  monthName: string;
  memories: Memory[];
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

function groupMemoriesByDate(memories: Memory[]): MemoryGroup[] {
  const groups: Map<string, MemoryGroup> = new Map();

  memories.forEach(memory => {
    const date = new Date(memory.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;

    if (!groups.has(key)) {
      groups.set(key, {
        year,
        month,
        monthName: HEBREW_MONTHS[month],
        memories: [],
      });
    }
    groups.get(key)!.memories.push(memory);
  });

  // Sort groups by date (newest first)
  return Array.from(groups.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
}

/**
 * Get trigger icon
 */
function getTriggerIcon(trigger: MemoryTrigger): keyof typeof Ionicons.glyphMap {
  switch (trigger) {
    case 'check_in': return 'location-outline';
    case 'photo': return 'camera-outline';
    case 'rating': return 'star-outline';
    case 'note': return 'create-outline';
    case 'milestone': return 'flag-outline';
    case 'achievement': return 'trophy-outline';
    default: return 'bookmark-outline';
  }
}

/**
 * Get trigger color
 */
function getTriggerColor(trigger: MemoryTrigger): string {
  switch (trigger) {
    case 'check_in': return '#3B82F6';
    case 'photo': return '#EC4899';
    case 'rating': return '#F59E0B';
    case 'note': return '#10B981';
    case 'milestone': return '#8B5CF6';
    case 'achievement': return '#F97316';
    default: return colors.primary;
  }
}

/**
 * Photo Gallery Component
 */
function PhotoGallery({
  photos,
  maxVisible = 3,
  onPress,
}: {
  photos: string[];
  maxVisible?: number;
  onPress?: () => void;
}) {
  const visiblePhotos = photos.slice(0, maxVisible);
  const extraCount = photos.length - maxVisible;

  if (photos.length === 0) return null;

  return (
    <TouchableOpacity
      style={styles.photoGallery}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {visiblePhotos.map((photo, index) => (
        <View
          key={index}
          style={[
            styles.photoContainer,
            { marginLeft: index > 0 ? -12 : 0, zIndex: maxVisible - index }
          ]}
        >
          <Image source={{ uri: photo }} style={styles.photo} />
        </View>
      ))}
      {extraCount > 0 && (
        <View style={styles.extraPhotos}>
          <Text style={styles.extraPhotosText}>+{extraCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Memory Card Component
 */
function MemoryCard({
  memory,
  onPress,
}: {
  memory: Memory;
  onPress?: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const triggerColor = getTriggerColor(memory.trigger);
  const triggerIcon = getTriggerIcon(memory.trigger);
  const date = new Date(memory.createdAt);
  const dayOfMonth = date.getDate();

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.memoryCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Timeline Connector */}
        <View style={styles.timelineConnector}>
          <View style={styles.timelineLine} />
          <View style={[styles.timelineDot, { backgroundColor: triggerColor }]}>
            <Ionicons name={triggerIcon} size={12} color={colors.surface} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.memoryContent}>
          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <Text style={styles.dayText}>{dayOfMonth}</Text>
          </View>

          {/* Main Content */}
          <View style={styles.memoryMain}>
            {/* Trip & Location */}
            <View style={styles.memoryHeader}>
              <Text style={styles.tripName}>{memory.tripName}</Text>
              {memory.location && (
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={10} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{memory.location}</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.memoryTitle}>{memory.title}</Text>

            {/* Description */}
            {memory.description && (
              <Text style={styles.memoryDescription} numberOfLines={2}>
                {memory.description}
              </Text>
            )}

            {/* Rating */}
            {memory.rating && (
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= memory.rating! ? 'star' : 'star-outline'}
                    size={14}
                    color={star <= memory.rating! ? '#F59E0B' : colors.border}
                  />
                ))}
              </View>
            )}

            {/* Photos */}
            {memory.photos && memory.photos.length > 0 && (
              <PhotoGallery photos={memory.photos} onPress={onPress} />
            )}

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {memory.tags.slice(0, 3).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Month Group Header
 */
function MonthHeader({ group }: { group: MemoryGroup }) {
  return (
    <View style={styles.monthHeader}>
      <View style={styles.monthBadge}>
        <Text style={styles.monthText}>{group.monthName}</Text>
        <Text style={styles.yearText}>{group.year}</Text>
      </View>
      <View style={styles.monthStats}>
        <Ionicons name="images-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.monthStatsText}>
          {group.memories.length} זכרונות
        </Text>
      </View>
    </View>
  );
}

/**
 * Year Divider
 */
function YearDivider({ year }: { year: number }) {
  return (
    <View style={styles.yearDivider}>
      <View style={styles.yearLine} />
      <View style={styles.yearBadge}>
        <Text style={styles.yearBadgeText}>{year}</Text>
      </View>
      <View style={styles.yearLine} />
    </View>
  );
}

/**
 * Filter Tabs
 */
function FilterTabs({
  selectedFilter,
  onFilterChange,
  tripNames,
}: {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  tripNames: string[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScrollView}
      contentContainerStyle={styles.filterContainer}
    >
      <TouchableOpacity
        style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
        onPress={() => onFilterChange('all')}
      >
        <Text style={[
          styles.filterTabText,
          selectedFilter === 'all' && styles.filterTabTextActive
        ]}>
          הכל
        </Text>
      </TouchableOpacity>

      {tripNames.slice(0, 5).map((tripName) => (
        <TouchableOpacity
          key={tripName}
          style={[
            styles.filterTab,
            selectedFilter === tripName && styles.filterTabActive
          ]}
          onPress={() => onFilterChange(tripName)}
        >
          <Text style={[
            styles.filterTabText,
            selectedFilter === tripName && styles.filterTabTextActive
          ]}>
            {tripName}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/**
 * Memory Detail Modal
 */
function MemoryDetailModal({
  memory,
  visible,
  onClose,
}: {
  memory: Memory | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!memory) return null;

  const date = new Date(memory.createdAt);
  const formattedDate = `${date.getDate()} ${HEBREW_MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>זיכרון</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Photos Carousel */}
          {memory.photos && memory.photos.length > 0 && (
            <View style={styles.carouselContainer}>
              <FlatList
                data={memory.photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(
                    e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                  );
                  setCurrentPhotoIndex(index);
                }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                )}
                keyExtractor={(_, index) => index.toString()}
              />
              {memory.photos.length > 1 && (
                <View style={styles.carouselDots}>
                  {memory.photos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.carouselDot,
                        index === currentPhotoIndex && styles.carouselDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Details */}
          <View style={styles.modalDetails}>
            {/* Trip & Date */}
            <View style={styles.modalMetaRow}>
              <View style={styles.modalMetaItem}>
                <Ionicons name="airplane-outline" size={16} color={colors.primary} />
                <Text style={styles.modalMetaText}>{memory.tripName}</Text>
              </View>
              <View style={styles.modalMetaItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.modalMetaTextSecondary}>{formattedDate}</Text>
              </View>
            </View>

            {/* Location */}
            {memory.location && (
              <View style={styles.modalLocation}>
                <Ionicons name="location" size={16} color={colors.secondary} />
                <Text style={styles.modalLocationText}>{memory.location}</Text>
              </View>
            )}

            {/* Title */}
            <Text style={styles.modalMemoryTitle}>{memory.title}</Text>

            {/* Rating */}
            {memory.rating && (
              <View style={styles.modalRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= memory.rating! ? 'star' : 'star-outline'}
                    size={20}
                    color={star <= memory.rating! ? '#F59E0B' : colors.border}
                  />
                ))}
              </View>
            )}

            {/* Description */}
            {memory.description && (
              <Text style={styles.modalDescription}>{memory.description}</Text>
            )}

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <View style={styles.modalTags}>
                {memory.tags.map((tag, index) => (
                  <View key={index} style={styles.modalTag}>
                    <Text style={styles.modalTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Empty State
 */
function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>אין זכרונות עדיין</Text>
      <Text style={styles.emptyDescription}>
        זכרונות נוצרים אוטומטית כשאתה מסמן מקומות, מוסיף תמונות או כותב הערות
      </Text>
      {onAdd && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add" size={20} color={colors.surface} />
          <Text style={styles.addButtonText}>הוסף זיכרון</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Loading State
 */
function LoadingState() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingIcon, { opacity: pulseAnim }]}>
        <Ionicons name="time" size={48} color={colors.primary} />
      </Animated.View>
      <Text style={styles.loadingText}>טוען זכרונות...</Text>
    </View>
  );
}

/**
 * Main MemoriesTimeline Component
 */
export function MemoriesTimeline({
  memories,
  isLoading,
  onMemoryPress,
  onAddMemory,
}: MemoriesTimelineProps) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Get unique trip names
  const tripNames = [...new Set(memories.map(m => m.tripName))];

  // Filter memories
  const filteredMemories = selectedFilter === 'all'
    ? memories
    : memories.filter(m => m.tripName === selectedFilter);

  // Group memories
  const groupedMemories = groupMemoriesByDate(filteredMemories);

  // Track current year for year dividers
  let lastYear: number | null = null;

  const handleMemoryPress = (memory: Memory) => {
    setSelectedMemory(memory);
    setModalVisible(true);
    onMemoryPress?.(memory);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>זכרונות</Text>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (memories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>זכרונות</Text>
        </View>
        <EmptyState onAdd={onAddMemory} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>זכרונות</Text>
        <View style={styles.statsContainer}>
          <Ionicons name="images-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.statsText}>{memories.length}</Text>
        </View>
      </View>

      {/* Filters */}
      {tripNames.length > 1 && (
        <FilterTabs
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          tripNames={tripNames}
        />
      )}

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        {groupedMemories.map((group, groupIndex) => {
          const showYearDivider = group.year !== lastYear;
          lastYear = group.year;

          return (
            <View key={`${group.year}-${group.month}`}>
              {showYearDivider && groupIndex > 0 && (
                <YearDivider year={group.year} />
              )}
              <MonthHeader group={group} />
              {group.memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onPress={() => handleMemoryPress(memory)}
                />
              ))}
            </View>
          );
        })}
      </View>

      {/* Add Button */}
      {onAddMemory && (
        <TouchableOpacity style={styles.floatingAddButton} onPress={onAddMemory}>
          <LinearGradient
            colors={[colors.primary, '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.floatingAddGradient}
          >
            <Ionicons name="add" size={24} color={colors.surface} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Memory Detail Modal */}
      <MemoryDetailModal
        memory={selectedMemory}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedMemory(null);
        }}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statsText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Filter Tabs
  filterScrollView: {
    marginBottom: spacing.md,
  },
  filterContainer: {
    paddingHorizontal: 0,
    gap: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.surface,
  },

  // Timeline
  timelineContainer: {
    paddingLeft: spacing.sm,
  },

  // Month Header
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  monthText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  yearText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  monthStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthStatsText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Year Divider
  yearDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  yearLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  yearBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.sm,
  },
  yearBadgeText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },

  // Memory Card
  memoryCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineConnector: {
    width: 32,
    alignItems: 'center',
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 0,
    bottom: -spacing.md,
    width: 2,
    backgroundColor: colors.border,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  memoryContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  memoryMain: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  memoryHeader: {
    marginBottom: spacing.xs,
  },
  tripName: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  memoryTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  memoryDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: 2,
  },

  // Photo Gallery
  photoGallery: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  photoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  extraPhotos: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
  },
  extraPhotosText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
  },

  // Floating Add Button
  floatingAddButton: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
  },
  floatingAddGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },

  // Empty State
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },

  // Loading State
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

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  carouselContainer: {
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: colors.background,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  carouselDots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  carouselDotActive: {
    backgroundColor: colors.surface,
  },
  modalDetails: {
    padding: spacing.md,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalMetaText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },
  modalMetaTextSecondary: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modalLocationText: {
    ...typography.body,
    color: colors.secondary,
    fontWeight: '500',
  },
  modalMemoryTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  modalRating: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  modalTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.full,
  },
  modalTagText: {
    ...typography.caption,
    color: colors.primary,
  },
});

export default MemoriesTimeline;
