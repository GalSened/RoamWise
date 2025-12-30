/**
 * Smart Backpack Packing Types
 *
 * Type definitions for the AI-powered packing recommendation system.
 * NO FAKE DATA - all calculations use real trip context.
 */

/**
 * Categories for organizing packing items
 */
export type PackingCategory = 'essentials' | 'clothing' | 'gear';

/**
 * Individual packing item with display info
 */
export interface PackingItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category for grouping */
  category: PackingCategory;
  /** Quantity if applicable (e.g., 3 for water liters) */
  quantity?: number;
  /** Unit of measurement (e.g., 'L' for liters) */
  unit?: string;
  /** Ionicons icon name */
  icon: string;
  /** Why this item was recommended (e.g., "Rain expected") */
  rationale?: string;
}

/**
 * Complete packing list with metadata
 */
export interface PackingList {
  /** List of recommended items */
  items: PackingItem[];
  /** Calculated water requirement in liters */
  waterLiters: number;
  /** Weather factors that influenced recommendations */
  weatherFactors: string[];
  /** When this list was generated */
  generatedAt: Date;
}

/**
 * Trip context used for generating recommendations
 * All values come from real data (weather API, user input)
 */
export interface TripContext {
  /** Total trip duration in hours */
  durationHours: number;
  /** Temperature in Celsius (from weather API) */
  temperature: number;
  /** Rain probability 0-100 (from weather API) */
  rainChance: number;
  /** Today's sunset time */
  sunsetTime: Date;
  /** Expected trip end time */
  tripEndTime: Date;
  /** Activity tags (e.g., 'Water', 'Caves', 'Family') */
  tags: string[];
}

/**
 * Section data for SectionList rendering
 */
export interface PackingSection {
  title: string;
  category: PackingCategory;
  data: PackingItem[];
}
