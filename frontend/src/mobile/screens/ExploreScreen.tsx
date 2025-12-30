/**
 * ExploreScreen - Tab 1 (Home/Discovery)
 *
 * Main discovery screen with:
 * - Header with greeting + Weather Widget
 * - AI-powered search bar with voice input
 * - Horizontal filter chips
 * - AI recommendation cards
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';

/**
 * Filter Chip Data
 */
const filterChips = [
  { id: 'water', label: 'Water', icon: '💧' },
  { id: 'caves', label: 'Caves', icon: '🕳️' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'short', label: 'Short', icon: '⏱️' },
  { id: 'scenic', label: 'Scenic', icon: '🏞️' },
  { id: 'challenging', label: 'Challenging', icon: '🏔️' },
];

/**
 * Mock Recommendation Data
 */
const recommendations = [
  {
    id: '1',
    title: 'Ein Gedi Nature Reserve',
    subtitle: 'Desert oasis with waterfalls',
    distance: '45 km',
    duration: '3-4 hrs',
    difficulty: 'Moderate',
    image: 'https://via.placeholder.com/300x200',
    tags: ['Water', 'Family'],
  },
  {
    id: '2',
    title: 'Makhtesh Ramon',
    subtitle: 'World\'s largest erosion crater',
    distance: '120 km',
    duration: '5-6 hrs',
    difficulty: 'Hard',
    image: 'https://via.placeholder.com/300x200',
    tags: ['Scenic', 'Challenging'],
  },
  {
    id: '3',
    title: 'Stalactite Cave',
    subtitle: 'Ancient underground wonder',
    distance: '25 km',
    duration: '2 hrs',
    difficulty: 'Easy',
    image: 'https://via.placeholder.com/300x200',
    tags: ['Caves', 'Family'],
  },
];

/**
 * Weather Widget Component
 */
function WeatherWidget() {
  return (
    <View style={styles.weatherWidget}>
      <Text style={styles.weatherIcon}>☀️</Text>
      <Text style={styles.weatherTemp}>24°C</Text>
    </View>
  );
}

/**
 * Header Component
 */
function Header() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.userName}>Traveler</Text>
      </View>
      <WeatherWidget />
    </View>
  );
}

/**
 * AI Search Bar Component
 */
function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Where do you want to travel?"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
        <TouchableOpacity style={styles.voiceButton}>
          <Ionicons name="mic" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Filter Chip Component
 */
function FilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Filter Chips Row
 */
function FilterChips() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const toggleFilter = (id: string) => {
    setSelectedFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContainer}
    >
      {filterChips.map((chip) => (
        <FilterChip
          key={chip.id}
          label={chip.label}
          icon={chip.icon}
          selected={selectedFilters.includes(chip.id)}
          onPress={() => toggleFilter(chip.id)}
        />
      ))}
    </ScrollView>
  );
}

/**
 * Recommendation Card Component
 */
function RecommendationCard({
  item,
  onPress,
}: {
  item: typeof recommendations[0];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardImageContainer}>
        <View style={styles.cardImagePlaceholder}>
          <Ionicons name="image" size={40} color={colors.textTertiary} />
        </View>
        <View style={styles.cardDifficulty}>
          <Text style={styles.cardDifficultyText}>{item.difficulty}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaItem}>
            <Ionicons name="navigate" size={14} color={colors.textSecondary} />
            <Text style={styles.cardMetaText}>{item.distance}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Ionicons name="time" size={14} color={colors.textSecondary} />
            <Text style={styles.cardMetaText}>{item.duration}</Text>
          </View>
        </View>
        <View style={styles.cardTags}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.cardTag}>
              <Text style={styles.cardTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * ExploreScreen Main Component
 */
export function ExploreScreen() {
  const navigation = useNavigation();

  const handleCardPress = (item: typeof recommendations[0]) => {
    // Navigate to Planner tab with selected destination
    navigation.navigate('Planner' as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />
      <SearchBar />
      <FilterChips />

      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>AI Picks for Today</Text>
      </View>

      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecommendationCard item={item} onPress={() => handleCardPress(item)} />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  greeting: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.title2,
    color: colors.text,
  },
  weatherWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  weatherIcon: {
    fontSize: 24,
    marginRight: spacing.xs,
  },
  weatherTemp: {
    ...typography.headline,
    color: colors.text,
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  voiceButton: {
    padding: spacing.xs,
  },

  // Filter Chips
  chipsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  chipLabel: {
    ...typography.subhead,
    color: colors.text,
  },
  chipLabelSelected: {
    color: colors.textInverse,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginLeft: spacing.sm,
  },

  // List
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  cardImageContainer: {
    height: 150,
    position: 'relative',
  },
  cardImagePlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDifficulty: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cardDifficultyText: {
    ...typography.caption1,
    color: colors.text,
    fontWeight: '600',
  },
  cardContent: {
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardMetaText: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  cardTagText: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
});

export default ExploreScreen;
