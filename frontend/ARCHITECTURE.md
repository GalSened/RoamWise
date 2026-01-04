# Travel App - Architecture Guide

## Overview

This document defines the best-practice architecture for the Travel App frontend.

## Folder Structure

```
src/
├── app/                    # App-level configuration
│   ├── App.tsx            # Root component
│   ├── Router.tsx         # Route definitions
│   └── providers.tsx      # Context providers wrapper
│
├── features/              # Feature modules (domain-driven)
│   ├── home/
│   │   ├── components/    # Home-specific components
│   │   ├── hooks/         # Home-specific hooks
│   │   └── index.ts       # Public exports
│   │
│   ├── trip/
│   │   ├── components/
│   │   │   ├── TripWizard/
│   │   │   ├── TripCard/
│   │   │   └── ActiveTrip/
│   │   ├── hooks/
│   │   │   └── useTrip.ts
│   │   ├── services/
│   │   │   └── tripService.ts
│   │   └── index.ts
│   │
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatWindow/
│   │   │   ├── ChatInput/
│   │   │   └── ActionCard/
│   │   ├── hooks/
│   │   │   └── useChat.ts
│   │   └── index.ts
│   │
│   ├── profile/
│   │   ├── components/
│   │   │   ├── ProfileHeader/
│   │   │   ├── TravelDNA/
│   │   │   └── WorldMap/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   └── onboarding/
│       ├── components/
│       └── index.ts
│
├── stores/                # Zustand state management
│   ├── index.ts           # Store exports
│   ├── useAppStore.ts     # Global app state
│   ├── useTripStore.ts    # Trip state
│   ├── useUserStore.ts    # User state
│   └── useChatStore.ts    # Chat state
│
├── domain/                # Domain models and types
│   ├── trip/
│   │   ├── types.ts       # Trip interfaces
│   │   └── constants.ts   # Trip constants
│   ├── user/
│   │   ├── types.ts       # User interfaces
│   │   └── constants.ts
│   ├── chat/
│   │   ├── types.ts
│   │   └── constants.ts
│   └── index.ts           # Re-exports
│
├── shared/                # Shared/common code
│   ├── components/        # Reusable UI components
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── index.ts
│   │
│   ├── hooks/             # Shared hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useGeolocation.ts
│   │   └── index.ts
│   │
│   ├── utils/             # Utility functions
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── index.ts
│   │
│   └── constants/         # App-wide constants
│       ├── routes.ts
│       └── config.ts
│
├── services/              # External service integrations
│   ├── api/               # API client
│   │   ├── client.ts
│   │   └── endpoints.ts
│   ├── ai/                # AI services
│   │   ├── aiPlanner.ts
│   │   └── aiTools.ts
│   ├── maps/              # Map services
│   │   └── googleMaps.ts
│   └── weather/           # Weather services
│       └── openWeather.ts
│
├── providers/             # External provider adapters
│   ├── proxy/
│   ├── google/
│   └── weather/
│
├── lib/                   # Third-party wrappers
│   ├── storage/
│   └── telemetry/
│
├── styles/                # Global styles
│   └── global.css
│
├── types/                 # Global TypeScript types
│   └── index.ts
│
└── config/                # Configuration
    ├── env.ts
    └── index.ts
```

## State Management with Zustand

### Store Structure

Each store follows this pattern:

```typescript
// src/stores/useTripStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface TripState {
  // State
  trips: Trip[];
  activeTrip: Trip | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTrips: (trips: Trip[]) => void;
  addTrip: (trip: Trip) => void;
  setActiveTrip: (trip: Trip | null) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;

  // Async actions
  fetchTrips: () => Promise<void>;
  createTrip: (input: CreateTripInput) => Promise<Trip>;
}

export const useTripStore = create<TripState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        trips: [],
        activeTrip: null,
        isLoading: false,
        error: null,

        // Synchronous actions
        setTrips: (trips) => set({ trips }),
        addTrip: (trip) => set((state) => ({
          trips: [...state.trips, trip]
        })),
        setActiveTrip: (trip) => set({ activeTrip: trip }),
        updateTrip: (id, updates) => set((state) => ({
          trips: state.trips.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
        deleteTrip: (id) => set((state) => ({
          trips: state.trips.filter((t) => t.id !== id),
        })),

        // Async actions
        fetchTrips: async () => {
          set({ isLoading: true, error: null });
          try {
            const trips = await tripService.getTrips();
            set({ trips, isLoading: false });
          } catch (error) {
            set({ error: error.message, isLoading: false });
          }
        },
        createTrip: async (input) => {
          set({ isLoading: true, error: null });
          try {
            const trip = await tripService.createTrip(input);
            set((state) => ({
              trips: [...state.trips, trip],
              isLoading: false
            }));
            return trip;
          } catch (error) {
            set({ error: error.message, isLoading: false });
            throw error;
          }
        },
      }),
      { name: 'trip-store' }
    ),
    { name: 'TripStore' }
  )
);
```

### Store Slices

For complex stores, use slices:

```typescript
// Slice pattern
const createTripSlice = (set, get) => ({
  trips: [],
  addTrip: (trip) => set((state) => ({ trips: [...state.trips, trip] })),
});

const createUISlice = (set) => ({
  isModalOpen: false,
  setModalOpen: (open) => set({ isModalOpen: open }),
});

// Combined store
export const useStore = create((...args) => ({
  ...createTripSlice(...args),
  ...createUISlice(...args),
}));
```

## Domain Types

### Trip Domain

```typescript
// src/domain/trip/types.ts

export enum TripState {
  DRAFT = 'draft',
  PLANNED = 'planned',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AlertPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  state: TripState;
  startDate: Date;
  endDate: Date;
  activities: Activity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  name: string;
  location: LatLng;
  scheduledTime: Date;
  duration: number; // minutes
  category: ActivityCategory;
  status: 'pending' | 'current' | 'completed' | 'skipped';
}

export type ActivityCategory =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'transport'
  | 'shopping'
  | 'nature'
  | 'culture'
  | 'entertainment';
```

### User Domain

```typescript
// src/domain/user/types.ts

export enum TravelerLevel {
  NEWBIE = 'newbie',
  EXPLORER = 'explorer',
  ADVENTURER = 'adventurer',
  GLOBETROTTER = 'globetrotter',
  WANDERER = 'wanderer',
  LEGEND = 'legend',
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  level: TravelerLevel;
  xp: number;
  travelDNA: TravelDNA;
  preferences: UserPreferences;
  stats: UserStats;
}

export interface TravelDNA {
  cultural: number;    // 0-100
  culinary: number;
  adventure: number;
  relaxation: number;
  nightlife: number;
  nature: number;
  shopping: number;
}

export interface UserPreferences {
  language: 'en' | 'he';
  theme: 'light' | 'dark' | 'system';
  pace: 'relaxed' | 'moderate' | 'intensive';
  budget: 'budget' | 'moderate' | 'luxury';
  notifications: boolean;
}

export interface UserStats {
  tripsCompleted: number;
  countriesVisited: number;
  continentsVisited: number;
  totalTravelDays: number;
}
```

## Component Patterns

### Feature Component

```tsx
// src/features/trip/components/TripCard/TripCard.tsx
import { useTripStore } from '@/stores';
import { Card, Button } from '@/shared/components';
import type { Trip } from '@/domain/trip';

interface TripCardProps {
  trip: Trip;
  onSelect?: () => void;
}

export function TripCard({ trip, onSelect }: TripCardProps) {
  const setActiveTrip = useTripStore((state) => state.setActiveTrip);

  const handleSelect = () => {
    setActiveTrip(trip);
    onSelect?.();
  };

  return (
    <Card onClick={handleSelect}>
      <h3>{trip.name}</h3>
      <p>{trip.destination}</p>
    </Card>
  );
}
```

### Shared Component

```tsx
// src/shared/components/Button/Button.tsx
import { forwardRef } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(styles.button, styles[variant], styles[size], className)}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  }
);
```

## Hook Patterns

### Feature Hook

```typescript
// src/features/trip/hooks/useTrip.ts
import { useTripStore } from '@/stores';
import { useMemo } from 'react';

export function useTrip(tripId: string) {
  const trips = useTripStore((state) => state.trips);
  const updateTrip = useTripStore((state) => state.updateTrip);

  const trip = useMemo(
    () => trips.find((t) => t.id === tripId),
    [trips, tripId]
  );

  const update = (updates: Partial<Trip>) => {
    updateTrip(tripId, updates);
  };

  return { trip, update };
}
```

### Shared Hook

```typescript
// src/shared/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

## Service Layer

```typescript
// src/services/api/client.ts
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `TripCard.tsx` |
| Hooks | camelCase with `use` prefix | `useTrip.ts` |
| Stores | camelCase with `use` prefix | `useTripStore.ts` |
| Types | PascalCase | `TripState` |
| Constants | UPPER_SNAKE_CASE | `MAX_TRIPS` |
| Utils | camelCase | `formatDate.ts` |
| CSS Modules | PascalCase matching component | `TripCard.module.css` |

## Import Order

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { motion } from 'framer-motion';

// 3. Stores
import { useTripStore, useUserStore } from '@/stores';

// 4. Domain types
import type { Trip } from '@/domain/trip';

// 5. Shared components/hooks
import { Button, Card } from '@/shared/components';
import { useLocalStorage } from '@/shared/hooks';

// 6. Feature imports (relative)
import { TripCard } from './TripCard';

// 7. Styles
import styles from './TripList.module.css';
```

## Error Handling

```typescript
// Centralized error handling
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public recoverable = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// In stores
catch (error) {
  const appError = error instanceof AppError
    ? error
    : new AppError('Unknown error', 'UNKNOWN');
  set({ error: appError.message, isLoading: false });
}
```

## Testing Strategy

```
tests/
├── unit/           # Unit tests for utils, hooks
├── integration/    # Integration tests for stores, services
└── e2e/            # E2E tests with Playwright
```

---

*This architecture follows best practices for React + TypeScript + Zustand applications.*
