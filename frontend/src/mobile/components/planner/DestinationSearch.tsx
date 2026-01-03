/**
 * DestinationSearch Component (Step 1)
 *
 * Allows users to select their trip destination through:
 * - Text search with autocomplete
 * - AI-powered suggestions based on Travel DNA
 * - "Surprise Me" random destination
 *
 * Features:
 * - Recent searches
 * - Trending destinations
 * - AI match scores
 * - Rich destination cards with images
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
  Image,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../../utils/haptics';
import { Destination, DestinationSearchProps, DestinationSelectionMode } from './types';

// =============================================================================
// MOCK DATA (Replace with API calls)
// =============================================================================

const TRENDING_DESTINATIONS: Destination[] = [
  {
    id: 'rome',
    name: 'Rome',
    nameHebrew: 'רומא',
    country: 'Italy',
    countryCode: 'IT',
    coordinates: { lat: 41.9028, lng: 12.4964 },
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800',
    description: 'עיר הנצח - היסטוריה, אמנות ואוכל',
    tags: ['history', 'food', 'art', 'culture'],
    matchScore: 92,
    bestTime: 'אביב/סתיו',
    avgBudget: 'mid-range',
    suggestedDuration: 4,
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    nameHebrew: 'ברצלונה',
    country: 'Spain',
    countryCode: 'ES',
    coordinates: { lat: 41.3851, lng: 2.1734 },
    imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
    description: 'ארכיטקטורה, חופים ותרבות',
    tags: ['beach', 'architecture', 'nightlife', 'food'],
    matchScore: 88,
    bestTime: 'אביב-סתיו',
    avgBudget: 'mid-range',
    suggestedDuration: 4,
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    nameHebrew: 'טוקיו',
    country: 'Japan',
    countryCode: 'JP',
    coordinates: { lat: 35.6762, lng: 139.6503 },
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    description: 'עתידני ומסורתי - חוויה ייחודית',
    tags: ['culture', 'food', 'technology', 'shopping'],
    matchScore: 85,
    bestTime: 'אביב/סתיו',
    avgBudget: 'mid-range',
    suggestedDuration: 7,
  },
  {
    id: 'paris',
    name: 'Paris',
    nameHebrew: 'פריז',
    country: 'France',
    countryCode: 'FR',
    coordinates: { lat: 48.8566, lng: 2.3522 },
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    description: 'עיר האורות - רומנטיקה ואמנות',
    tags: ['art', 'food', 'romance', 'culture'],
    matchScore: 90,
    bestTime: 'אביב-סתיו',
    avgBudget: 'luxury',
    suggestedDuration: 4,
  },
];

const AI_SUGGESTIONS: Destination[] = [
  {
    id: 'lisbon',
    name: 'Lisbon',
    nameHebrew: 'ליסבון',
    country: 'Portugal',
    countryCode: 'PT',
    coordinates: { lat: 38.7223, lng: -9.1393 },
    imageUrl: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800',
    description: 'היסטוריה, פאדו ופשטיש דה נאטה',
    tags: ['history', 'food', 'beach', 'nightlife'],
    matchScore: 95,
    bestTime: 'כל השנה',
    avgBudget: 'budget',
    suggestedDuration: 4,
  },
  {
    id: 'prague',
    name: 'Prague',
    nameHebrew: 'פראג',
    country: 'Czech Republic',
    countryCode: 'CZ',
    coordinates: { lat: 50.0755, lng: 14.4378 },
    imageUrl: 'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800',
    description: 'עיר הזהב - ארכיטקטורה מרהיבה',
    tags: ['history', 'architecture', 'beer', 'culture'],
    matchScore: 91,
    bestTime: 'אביב/סתיו',
    avgBudget: 'budget',
    suggestedDuration: 3,
  },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Search Input with clear button
 */
interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  isLoading: boolean;
}

function SearchInput({ value, onChangeText, onClear, isLoading }: SearchInputProps) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="חפש יעד..."
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : value.length > 0 ? (
          <TouchableOpacity onPress={onClear}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Mode Selector (Search / Suggestions / Surprise)
 */
interface ModeSelectorProps {
  mode: DestinationSelectionMode;
  onModeChange: (mode: DestinationSelectionMode) => void;
}

function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const modes: { id: DestinationSelectionMode; label: string; icon: string }[] = [
    { id: 'search', label: 'חיפוש', icon: 'search-outline' },
    { id: 'suggestions', label: 'המלצות AI', icon: 'sparkles-outline' },
    { id: 'surprise', label: 'הפתע אותי', icon: 'shuffle-outline' },
  ];

  return (
    <View style={styles.modeContainer}>
      {modes.map((m) => (
        <TouchableOpacity
          key={m.id}
          style={[styles.modeButton, mode === m.id && styles.modeButtonActive]}
          onPress={() => {
            haptics.impact('light');
            onModeChange(m.id);
          }}
        >
          <Ionicons
            name={m.icon as any}
            size={16}
            color={mode === m.id ? colors.surface : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeButtonText,
              mode === m.id && styles.modeButtonTextActive,
            ]}
          >
            {m.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Destination Card
 */
interface DestinationCardProps {
  destination: Destination;
  isSelected: boolean;
  onSelect: () => void;
  showMatchScore?: boolean;
}

function DestinationCard({
  destination,
  isSelected,
  onSelect,
  showMatchScore = false,
}: DestinationCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, friction: 3, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    haptics.impact('medium');
    onSelect();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View
        style={[
          styles.destinationCard,
          isSelected && styles.destinationCardSelected,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Image */}
        <View style={styles.destinationImageContainer}>
          {destination.imageUrl ? (
            <Image
              source={{ uri: destination.imageUrl }}
              style={styles.destinationImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.destinationImage, styles.destinationImagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
            </View>
          )}
          {/* Match Score Badge */}
          {showMatchScore && destination.matchScore && (
            <View style={styles.matchBadge}>
              <Ionicons name="sparkles" size={10} color={colors.surface} />
              <Text style={styles.matchBadgeText}>{destination.matchScore}%</Text>
            </View>
          )}
          {/* Selected Indicator */}
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <View style={styles.selectedCheck}>
                <Ionicons name="checkmark" size={24} color={colors.surface} />
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.destinationContent}>
          <Text style={styles.destinationName}>
            {destination.nameHebrew || destination.name}
          </Text>
          <View style={styles.destinationMeta}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.destinationCountry}>{destination.country}</Text>
          </View>
          {destination.description && (
            <Text style={styles.destinationDescription} numberOfLines={2}>
              {destination.description}
            </Text>
          )}
          {/* Tags */}
          {destination.tags && destination.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {destination.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {/* Quick Info */}
          <View style={styles.quickInfo}>
            {destination.suggestedDuration && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.quickInfoText}>{destination.suggestedDuration} ימים</Text>
              </View>
            )}
            {destination.bestTime && (
              <View style={styles.quickInfoItem}>
                <Ionicons name="sunny-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.quickInfoText}>{destination.bestTime}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/**
 * Surprise Me Animation
 */
function SurpriseMeView({ onReveal }: { onReveal: () => void }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSurprise = () => {
    setIsSpinning(true);
    haptics.impact('heavy');

    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      { iterations: 3 }
    ).start(() => {
      setIsSpinning(false);
      spinAnim.setValue(0);
      haptics.notification('success');
      onReveal();
    });
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.surpriseContainer}>
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.surpriseGradient}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="globe-outline" size={64} color={colors.surface} />
        </Animated.View>
        <Text style={styles.surpriseTitle}>הפתע אותי!</Text>
        <Text style={styles.surpriseSubtitle}>
          תן ל-AI לבחור עבורך יעד מושלם בהתאם לפרופיל הנסיעות שלך
        </Text>
        <TouchableOpacity
          style={styles.surpriseButton}
          onPress={handleSurprise}
          disabled={isSpinning}
        >
          <Ionicons name="shuffle" size={20} color="#8B5CF6" />
          <Text style={styles.surpriseButtonText}>
            {isSpinning ? 'מחפש...' : 'גלה יעד'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

/**
 * Section Header
 */
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DestinationSearch({
  selectedDestination,
  onSelect,
  onSurpriseMe,
}: DestinationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<DestinationSelectionMode>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Destination[]>([]);

  // Simulate search
  useEffect(() => {
    if (searchQuery.length > 1) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        // Filter mock data based on search
        const results = [...TRENDING_DESTINATIONS, ...AI_SUGGESTIONS].filter(
          (d) =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.nameHebrew?.includes(searchQuery) ||
            d.country.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(results);
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSelectDestination = useCallback(
    (destination: Destination) => {
      Keyboard.dismiss();
      onSelect(destination);
    },
    [onSelect]
  );

  const handleSurpriseReveal = useCallback(() => {
    // Pick random AI suggestion
    const randomIndex = Math.floor(Math.random() * AI_SUGGESTIONS.length);
    onSelect(AI_SUGGESTIONS[randomIndex]);
    onSurpriseMe();
  }, [onSelect, onSurpriseMe]);

  const renderDestinationItem = useCallback(
    ({ item }: { item: Destination }) => (
      <DestinationCard
        destination={item}
        isSelected={selectedDestination?.id === item.id}
        onSelect={() => handleSelectDestination(item)}
        showMatchScore={mode === 'suggestions'}
      />
    ),
    [selectedDestination, handleSelectDestination, mode]
  );

  return (
    <View style={styles.container}>
      {/* Mode Selector */}
      <ModeSelector mode={mode} onModeChange={setMode} />

      {/* Search Mode */}
      {mode === 'search' && (
        <>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            isLoading={isLoading}
          />

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search Results */}
            {searchQuery.length > 0 && searchResults.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="תוצאות חיפוש" icon="search-outline" />
                {searchResults.map((dest) => (
                  <DestinationCard
                    key={dest.id}
                    destination={dest}
                    isSelected={selectedDestination?.id === dest.id}
                    onSelect={() => handleSelectDestination(dest)}
                  />
                ))}
              </View>
            )}

            {/* No Results */}
            {searchQuery.length > 1 && searchResults.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>לא נמצאו תוצאות</Text>
                <Text style={styles.emptySubtitle}>נסה לחפש יעד אחר</Text>
              </View>
            )}

            {/* Trending (when no search) */}
            {searchQuery.length === 0 && (
              <View style={styles.section}>
                <SectionHeader title="יעדים פופולריים" icon="trending-up-outline" />
                {TRENDING_DESTINATIONS.map((dest) => (
                  <DestinationCard
                    key={dest.id}
                    destination={dest}
                    isSelected={selectedDestination?.id === dest.id}
                    onSelect={() => handleSelectDestination(dest)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* AI Suggestions Mode */}
      {mode === 'suggestions' && (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.aiHeader}>
            <LinearGradient
              colors={[colors.primary, '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.aiHeaderGradient}
            >
              <Ionicons name="sparkles" size={24} color={colors.surface} />
              <View style={styles.aiHeaderContent}>
                <Text style={styles.aiHeaderTitle}>המלצות מותאמות אישית</Text>
                <Text style={styles.aiHeaderSubtitle}>
                  בהתאם לפרופיל הנסיעות שלך
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.section}>
            {AI_SUGGESTIONS.map((dest) => (
              <DestinationCard
                key={dest.id}
                destination={dest}
                isSelected={selectedDestination?.id === dest.id}
                onSelect={() => handleSelectDestination(dest)}
                showMatchScore
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Surprise Mode */}
      {mode === 'surprise' && <SurpriseMeView onReveal={handleSurpriseReveal} />}
    </View>
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
  scrollContainer: {
    flex: 1,
  },
  // Mode Selector
  modeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    textAlign: 'right',
  },
  // Sections
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  // Destination Card
  destinationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  destinationCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  destinationImageContainer: {
    height: 140,
    position: 'relative',
  },
  destinationImage: {
    width: '100%',
    height: '100%',
  },
  destinationImagePlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  matchBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationContent: {
    padding: spacing.md,
  },
  destinationName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  destinationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  destinationCountry: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  destinationDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  quickInfo: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickInfoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // AI Header
  aiHeader: {
    padding: spacing.md,
  },
  aiHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  aiHeaderContent: {
    flex: 1,
  },
  aiHeaderTitle: {
    ...typography.h4,
    color: colors.surface,
  },
  aiHeaderSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  // Surprise Me
  surpriseContainer: {
    flex: 1,
    padding: spacing.md,
  },
  surpriseGradient: {
    flex: 1,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  surpriseTitle: {
    ...typography.h2,
    color: colors.surface,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  surpriseSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  surpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  surpriseButtonText: {
    ...typography.body,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});

export default DestinationSearch;
