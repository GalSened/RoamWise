/**
 * Destinations Database
 *
 * Production-ready local dataset of Israeli hiking destinations.
 * Each destination includes metadata for search, filtering, and display.
 */

export interface Destination {
  id: string;
  name: string;
  description: string;
  region: 'North' | 'Center' | 'South';
  tags: string[];
  imageUrl: string;
  rating: number;
  distance: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
}

export interface FilterTag {
  id: string;
  label: string;
  icon: string;
}

/**
 * Available filter tags for the Explore screen
 */
export const FILTER_TAGS: FilterTag[] = [
  { id: 'water', label: 'Water', icon: '💧' },
  { id: 'desert', label: 'Desert', icon: '🏜️' },
  { id: 'caves', label: 'Caves', icon: '🕳️' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'short', label: 'Short', icon: '⏱️' },
  { id: 'scenic', label: 'Scenic', icon: '🏞️' },
  { id: 'challenging', label: 'Challenging', icon: '🏔️' },
  { id: 'extreme', label: 'Extreme', icon: '⚡' },
];

/**
 * Israeli destinations database
 * 15+ diverse locations across North, Center, and South regions
 */
export const DESTINATIONS: Destination[] = [
  // ============ NORTH REGION ============
  {
    id: 'banias',
    name: 'Banias Waterfall',
    description: 'Stunning waterfall at the foot of Mount Hermon with lush vegetation and ancient ruins.',
    region: 'North',
    tags: ['Water', 'Family', 'Scenic'],
    imageUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=600&h=400&fit=crop',
    rating: 4.8,
    distance: '220 km',
    duration: '2-3 hrs',
    difficulty: 'Easy',
  },
  {
    id: 'hermon',
    name: 'Mount Hermon',
    description: 'Israel\'s highest peak with ski slopes in winter and alpine trails year-round.',
    region: 'North',
    tags: ['Extreme', 'Scenic', 'Challenging'],
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop',
    rating: 4.7,
    distance: '230 km',
    duration: '4-6 hrs',
    difficulty: 'Hard',
  },
  {
    id: 'galilee-trail',
    name: 'Sea of Galilee Trail',
    description: 'Scenic lakeside path with historical sites and beautiful water views.',
    region: 'North',
    tags: ['Water', 'Family', 'Scenic', 'Short'],
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop',
    rating: 4.5,
    distance: '140 km',
    duration: '2-3 hrs',
    difficulty: 'Easy',
  },
  {
    id: 'arbel',
    name: 'Arbel Cliffs',
    description: 'Dramatic cliff views overlooking the Sea of Galilee with ancient fortress caves.',
    region: 'North',
    tags: ['Scenic', 'Challenging', 'Caves'],
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
    rating: 4.6,
    distance: '150 km',
    duration: '3-4 hrs',
    difficulty: 'Moderate',
  },
  {
    id: 'gamla',
    name: 'Gamla Nature Reserve',
    description: 'Ancient Jewish city ruins with vulture observatory and impressive waterfall.',
    region: 'North',
    tags: ['Scenic', 'Family', 'Water'],
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop',
    rating: 4.7,
    distance: '160 km',
    duration: '3-4 hrs',
    difficulty: 'Moderate',
  },

  // ============ CENTER REGION ============
  {
    id: 'stalactite-cave',
    name: 'Stalactite Cave',
    description: 'Spectacular underground cavern with impressive stalactite formations.',
    region: 'Center',
    tags: ['Caves', 'Family', 'Short'],
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
    rating: 4.4,
    distance: '25 km',
    duration: '1-2 hrs',
    difficulty: 'Easy',
  },
  {
    id: 'tel-aviv-port',
    name: 'Tel Aviv Port Promenade',
    description: 'Urban coastal walk with restaurants, shops, and Mediterranean views.',
    region: 'Center',
    tags: ['Family', 'Short', 'Scenic'],
    imageUrl: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=600&h=400&fit=crop',
    rating: 4.3,
    distance: '5 km',
    duration: '1-2 hrs',
    difficulty: 'Easy',
  },
  {
    id: 'yarkon',
    name: 'Yarkon Park',
    description: 'Tel Aviv\'s largest park with cycling paths, boating, and gardens.',
    region: 'Center',
    tags: ['Family', 'Short', 'Water'],
    imageUrl: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=600&h=400&fit=crop',
    rating: 4.2,
    distance: '8 km',
    duration: '1-3 hrs',
    difficulty: 'Easy',
  },
  {
    id: 'jerusalem-old-city',
    name: 'Jerusalem Old City',
    description: 'Walk through 3,000 years of history in the ancient walled city.',
    region: 'Center',
    tags: ['Family', 'Scenic', 'Short'],
    imageUrl: 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=600&h=400&fit=crop',
    rating: 4.9,
    distance: '60 km',
    duration: '3-5 hrs',
    difficulty: 'Easy',
  },
  {
    id: 'ein-hemed',
    name: 'Ein Hemed National Park',
    description: 'Shaded spring with Crusader ruins, perfect for family picnics.',
    region: 'Center',
    tags: ['Water', 'Family', 'Short'],
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop',
    rating: 4.3,
    distance: '20 km',
    duration: '1-2 hrs',
    difficulty: 'Easy',
  },

  // ============ SOUTH REGION ============
  {
    id: 'masada',
    name: 'Masada',
    description: 'UNESCO World Heritage site with dramatic sunrise views and ancient fortress.',
    region: 'South',
    tags: ['Scenic', 'Challenging', 'Desert'],
    imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&h=400&fit=crop',
    rating: 4.9,
    distance: '100 km',
    duration: '3-5 hrs',
    difficulty: 'Moderate',
  },
  {
    id: 'ein-gedi',
    name: 'Ein Gedi Nature Reserve',
    description: 'Desert oasis with waterfalls, ibex, and lush tropical vegetation.',
    region: 'South',
    tags: ['Water', 'Family', 'Scenic'],
    imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&h=400&fit=crop',
    rating: 4.8,
    distance: '90 km',
    duration: '3-4 hrs',
    difficulty: 'Moderate',
  },
  {
    id: 'ramon-crater',
    name: 'Ramon Crater',
    description: 'World\'s largest erosion crater with unique geology and desert wildlife.',
    region: 'South',
    tags: ['Desert', 'Extreme', 'Scenic'],
    imageUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&h=400&fit=crop',
    rating: 4.7,
    distance: '180 km',
    duration: '4-6 hrs',
    difficulty: 'Hard',
  },
  {
    id: 'dead-sea',
    name: 'Dead Sea Beach',
    description: 'Float in the lowest point on Earth with therapeutic mineral-rich waters.',
    region: 'South',
    tags: ['Water', 'Family', 'Short'],
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop',
    rating: 4.6,
    distance: '85 km',
    duration: '2-3 hrs',
    difficulty: 'Easy',
  },
  {
    id: 'red-canyon',
    name: 'Red Canyon',
    description: 'Colorful sandstone formations with ladders and narrow passages.',
    region: 'South',
    tags: ['Desert', 'Challenging', 'Scenic'],
    imageUrl: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=600&h=400&fit=crop',
    rating: 4.5,
    distance: '350 km',
    duration: '2-3 hrs',
    difficulty: 'Moderate',
  },
  {
    id: 'timna-park',
    name: 'Timna Park',
    description: 'Ancient copper mines with unique rock formations and Solomon\'s Pillars.',
    region: 'South',
    tags: ['Desert', 'Family', 'Scenic'],
    imageUrl: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=600&h=400&fit=crop',
    rating: 4.6,
    distance: '360 km',
    duration: '3-5 hrs',
    difficulty: 'Easy',
  },
];

/**
 * Get destinations by region
 */
export function getDestinationsByRegion(region: Destination['region']): Destination[] {
  return DESTINATIONS.filter((d) => d.region === region);
}

/**
 * Get destination by ID
 */
export function getDestinationById(id: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}
