/**
 * PackingManager - AI-powered packing recommendation engine
 *
 * PRODUCTION READY - NO FAKE DATA
 * Uses real algorithms based on:
 * - Scientific hydration calculations
 * - Weather-based clothing rules
 * - Activity-based gear recommendations
 * - Sunset safety considerations
 */

import { PackingItem, PackingList, TripContext, PackingCategory } from './types';

/**
 * Hydration Algorithm
 *
 * Scientific formula based on hiking guidelines:
 * - Base: 0.5L per hour of activity
 * - Heat factor: Additional 0.5L per hour if temp > 25°C
 * - Result rounded to nearest 0.5L for practical water bottle sizing
 *
 * @param durationHours - Total trip duration in hours
 * @param temperature - Temperature in Celsius
 * @returns Water requirement in liters
 */
export function calculateWaterLiters(durationHours: number, temperature: number): number {
  const baseLiters = durationHours * 0.5;
  const heatFactor = temperature > 25 ? durationHours * 0.5 : 0;
  const totalLiters = baseLiters + heatFactor;
  // Round to nearest 0.5L
  return Math.round(totalLiters * 2) / 2;
}

/**
 * Safety items - ALWAYS included in every pack
 */
const SAFETY_ITEMS: Omit<PackingItem, 'category'>[] = [
  { id: 'first-aid', name: 'First Aid Kit', icon: 'medkit' },
  { id: 'phone', name: 'Charged Phone', icon: 'phone-portrait' },
  { id: 'snacks', name: 'Energy Snacks', icon: 'nutrition' },
];

/**
 * Clothing rules based on weather conditions
 */
interface ClothingRule {
  id: string;
  condition: (ctx: TripContext) => boolean;
  item: Omit<PackingItem, 'category' | 'id'>;
}

const CLOTHING_RULES: ClothingRule[] = [
  {
    id: 'cold-jacket',
    condition: (ctx) => ctx.temperature < 15,
    item: { name: 'Fleece/Light Jacket', icon: 'shirt', rationale: 'Cold weather' },
  },
  {
    id: 'rain-coat',
    condition: (ctx) => ctx.rainChance > 30,
    item: { name: 'Raincoat', icon: 'umbrella', rationale: 'Rain expected' },
  },
  {
    id: 'sunscreen',
    condition: (ctx) => ctx.temperature > 20,
    item: { name: 'Sunscreen SPF 50', icon: 'sunny', rationale: 'Sun protection' },
  },
  {
    id: 'hat',
    condition: (ctx) => ctx.temperature > 25,
    item: { name: 'Sun Hat', icon: 'baseball', rationale: 'Heat protection' },
  },
  {
    id: 'layers',
    condition: (ctx) => {
      // Temperature swing expected (morning to afternoon)
      const hoursTillEnd = ctx.durationHours;
      return hoursTillEnd > 4;
    },
    item: { name: 'Extra Layer', icon: 'layers', rationale: 'Long trip' },
  },
];

/**
 * Gear rules based on activity and timing
 */
interface GearRule {
  id: string;
  condition: (ctx: TripContext) => boolean;
  items: Omit<PackingItem, 'category' | 'id'>[];
}

const GEAR_RULES: GearRule[] = [
  {
    id: 'water-activity',
    condition: (ctx) => ctx.tags.some((tag) => ['Water', 'Beach', 'Swimming'].includes(tag)),
    items: [
      { name: 'Swimsuit', icon: 'body', rationale: 'Water activity' },
      { name: 'Quick-Dry Towel', icon: 'resize', rationale: 'Water activity' },
      { name: 'Water Shoes', icon: 'footsteps', rationale: 'Water activity' },
    ],
  },
  {
    id: 'night-gear',
    condition: (ctx) => ctx.tripEndTime > ctx.sunsetTime,
    items: [
      { name: 'Headlamp', icon: 'flashlight', rationale: 'After sunset' },
      { name: 'Reflective Gear', icon: 'eye', rationale: 'Low visibility' },
    ],
  },
  {
    id: 'cave-gear',
    condition: (ctx) => ctx.tags.includes('Caves'),
    items: [
      { name: 'Flashlight', icon: 'flashlight', rationale: 'Cave exploration' },
      { name: 'Helmet', icon: 'shield-checkmark', rationale: 'Cave safety' },
    ],
  },
  {
    id: 'family-gear',
    condition: (ctx) => ctx.tags.includes('Family'),
    items: [
      { name: 'Sunscreen (Kids)', icon: 'sunny', rationale: 'Family trip' },
      { name: 'Extra Snacks', icon: 'fast-food', rationale: 'Family trip' },
      { name: 'Wet Wipes', icon: 'water', rationale: 'Family trip' },
    ],
  },
  {
    id: 'long-hike',
    condition: (ctx) => ctx.durationHours > 5,
    items: [
      { name: 'Trekking Poles', icon: 'trending-up', rationale: 'Long hike' },
      { name: 'Blister Kit', icon: 'bandage', rationale: 'Long distance' },
    ],
  },
];

/**
 * PackingManager Class
 *
 * Generates intelligent packing recommendations based on trip context.
 * All recommendations use real data and scientific calculations.
 */
export class PackingManager {
  /**
   * Generate a complete packing list based on trip context
   *
   * @param tripContext - Real trip data (weather, timing, activities)
   * @returns Complete packing list with all recommendations
   */
  async generatePackingList(tripContext: TripContext): Promise<PackingList> {
    const items: PackingItem[] = [];
    const weatherFactors: string[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Calculate water requirement (scientific formula)
    // ─────────────────────────────────────────────────────────────────────────
    const waterLiters = calculateWaterLiters(
      tripContext.durationHours,
      tripContext.temperature
    );

    // Add water as essential item
    items.push({
      id: 'water',
      name: `Water`,
      category: 'essentials',
      quantity: waterLiters,
      unit: 'L',
      icon: 'water',
      rationale: tripContext.temperature > 25 ? 'Hot weather hydration' : undefined,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Add safety essentials (always included)
    // ─────────────────────────────────────────────────────────────────────────
    SAFETY_ITEMS.forEach((item) => {
      items.push({
        ...item,
        category: 'essentials',
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Apply clothing rules (weather-based)
    // ─────────────────────────────────────────────────────────────────────────
    CLOTHING_RULES.forEach((rule) => {
      if (rule.condition(tripContext)) {
        items.push({
          id: rule.id,
          ...rule.item,
          category: 'clothing',
        });

        // Track weather factors
        if (rule.item.rationale) {
          if (!weatherFactors.includes(rule.item.rationale)) {
            weatherFactors.push(rule.item.rationale);
          }
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Apply gear rules (activity & timing based)
    // ─────────────────────────────────────────────────────────────────────────
    GEAR_RULES.forEach((rule) => {
      if (rule.condition(tripContext)) {
        rule.items.forEach((item, index) => {
          items.push({
            id: `${rule.id}-${index}`,
            ...item,
            category: 'gear',
          });

          // Track weather factors
          if (item.rationale) {
            if (!weatherFactors.includes(item.rationale)) {
              weatherFactors.push(item.rationale);
            }
          }
        });
      }
    });

    return {
      items,
      waterLiters,
      weatherFactors,
      generatedAt: new Date(),
    };
  }

  /**
   * Get items grouped by category for SectionList rendering
   *
   * @param packingList - Generated packing list
   * @returns Items grouped by category
   */
  getItemsByCategory(packingList: PackingList): Record<PackingCategory, PackingItem[]> {
    const grouped: Record<PackingCategory, PackingItem[]> = {
      essentials: [],
      clothing: [],
      gear: [],
    };

    packingList.items.forEach((item) => {
      grouped[item.category].push(item);
    });

    return grouped;
  }
}

export default PackingManager;
