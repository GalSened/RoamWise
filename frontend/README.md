# RoamWise - AI-Powered Travel Companion

A modern, production-ready travel application featuring weather-aware routing, voice AI assistance, and comprehensive trip planning capabilities.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend App                         │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Modern HTML5/CSS3 + TypeScript)                 │
│  ├─ Search View      ├─ Trip Planning   ├─ AI Assistant    │
│  ├─ Map Integration  ├─ Profile/Stats   └─ Navigation      │
├─────────────────────────────────────────────────────────────┤
│  Core Systems                                               │
│  ├─ Theme Provider (Dark/Light Mode)                       │
│  ├─ Update Manager (PWA + Version Control)                 │
│  ├─ Event Bus (Decoupled Communication)                    │
│  └─ Storage Abstraction (IndexedDB + localStorage)         │
├─────────────────────────────────────────────────────────────┤
│  Feature Modules                                            │
│  ├─ Planning Manager (CRUD, Validation, Optimization)      │
│  ├─ Voice Manager (STT, Intent Processing)                 │
│  ├─ Navigation Manager (Turn-by-turn, Progress Tracking)   │
│  └─ AI Orchestrator (Planning Agent, Recommendations)      │
├─────────────────────────────────────────────────────────────┤
│  Provider Layer (Swappable Services)                       │
│  ├─ Places Provider   ├─ Weather Provider                  │
│  ├─ Routing Provider  └─ Geocoding Provider                │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                              │
│  ├─ Google Maps (Places, Routes, Geocoding)                │
│  ├─ OpenWeatherMap (Weather Data)                          │
│  ├─ Web Speech API (Voice Recognition)                     │
│  └─ Leaflet Maps (Map Rendering)                           │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Features

### Core Functionality
- **🔍 Smart Search**: AI-powered place discovery with category filtering
- **🗺️ Trip Planning**: Day-by-day itinerary builder with optimization
- **🤖 Voice AI**: Press-and-hold voice interface with Hebrew support
- **📍 Navigation**: In-app turn-by-turn guidance with real-time tracking
- **🌓 Dark Mode**: Global theme system with zero-flash persistence

### Advanced Features
- **🌤️ Weather Integration**: Weather-aware recommendations and routing
- **⬆️ Auto Updates**: PWA update system with release notes
- **📊 Analytics**: Comprehensive telemetry and performance monitoring
- **🔄 Offline Support**: Service worker with intelligent caching
- **♿ Accessibility**: WCAG compliant with full keyboard navigation

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Google Maps API key with Places & Routes APIs enabled
- OpenWeatherMap API key

### Environment Configuration

Create `.env` file:
```bash
# Google Maps Integration
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Weather Service
VITE_OPENWEATHERMAP_API_KEY=your_openweather_api_key_here

# App Configuration
VITE_APP_NAME="RoamWise"
VITE_APP_VERSION="2.0.0"
VITE_UPDATE_CHECK_URL="https://api.yourapp.com/version"

# Optional: Analytics & Telemetry
VITE_ANALYTICS_ENDPOINT="https://analytics.yourapp.com/events"
```

### Google Maps Setup
1. Enable these APIs in Google Cloud Console:
   - Maps JavaScript API
   - Places API
   - Routes API (new)
   - Geocoding API

2. Set up API key restrictions for security

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
npm run e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🧪 Testing

### Test Structure
```
tests/
├── unit/              # Unit tests for core logic
│   ├── theme.test.ts      # Theme provider tests
│   ├── planning.test.ts   # Trip planning tests
│   └── voice.test.ts      # Voice AI tests
├── integration/       # Integration tests
│   ├── providers.test.ts  # Provider integration tests
│   └── weather.test.ts    # Weather integration tests
└── e2e/              # End-to-end tests
    └── app.spec.ts       # Full user flow tests
```

### Running Tests
```bash
# Unit tests (fast feedback)
npm run test

# E2E tests (full browser testing)
npm run e2e

# Test coverage
npm run test:coverage

# CI pipeline (all checks)
npm run ci
```

## 📱 Progressive Web App

### PWA Features
- **Installable**: Add to home screen on mobile/desktop
- **Offline Support**: Cache-first strategy for core features
- **Background Sync**: Queue actions when offline
- **Push Notifications**: Smart travel alerts

### Manifest Configuration
The app includes a complete PWA manifest with:
- Multiple icon sizes (192x192, 512x512)
- Splash screen configuration
- Theme color matching
- Display mode optimization

## 🎨 Theming System

### Theme Structure
```typescript
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  // ... additional color definitions
}
```

### Usage
```typescript
import { themeProvider } from '@/core/theme/ThemeProvider';

// Get current theme
const currentTheme = themeProvider.getTheme(); // 'light' | 'dark' | 'system'

// Switch themes
themeProvider.setTheme('dark');

// Listen for changes
themeProvider.on('theme-changed', ({ theme }) => {
  console.log('Theme changed to:', theme);
});
```

## 🗺️ Provider System

### Swappable Service Architecture
The app uses a provider pattern for easy service swapping:

```typescript
// Example: Switch from Google to OpenStreetMap
import { OSMPlacesProvider } from '@/providers/osm/places';

const placesProvider = new OSMPlacesProvider();
// App automatically uses new provider
```

### Available Providers
- **Places**: Google Places API, OpenStreetMap Nominatim
- **Routing**: Google Routes API, OSRM, GraphHopper
- **Weather**: OpenWeatherMap, WeatherAPI
- **Geocoding**: Google Geocoding, Nominatim

## 🤖 AI Features

### Voice Interface
```typescript
import { voiceManager } from '@/features/voice/VoiceManager';

// Start voice recognition
voiceManager.startListening();

// Process voice commands
voiceManager.on('intent-recognized', ({ intent, entities }) => {
  // Handle parsed voice command
});
```

### Planning AI
The AI orchestrator provides:
- **Mood-based recommendations**: Adventurous, romantic, relaxed modes
- **Weather-aware planning**: Indoor alternatives for rainy days
- **Multi-factor scoring**: Rating, distance, cost, timing optimization
- **Real-time adaptation**: Dynamic re-planning based on conditions

## 📊 Monitoring & Analytics

### Telemetry
Built-in telemetry tracks:
- **Performance**: Core Web Vitals, load times
- **User Behavior**: Feature usage, conversion funnels
- **Errors**: JavaScript errors, API failures
- **Business Metrics**: Trip completions, user engagement

### Privacy Compliance
- **Opt-in tracking**: Users control their data
- **Anonymized data**: No personal information stored
- **GDPR compliant**: Full data deletion support

## 🚀 Deployment

### Build Optimization
```bash
# Production build with optimizations
npm run build

# Preview production build locally
npm run preview

# Bundle analysis
npm run analyze
```

### Deployment Targets
- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN Deployment**: AWS CloudFront, Cloudflare
- **Container Deployment**: Docker with nginx
- **Mobile Apps**: Capacitor for iOS/Android

### Performance
- **Lighthouse Score**: 95+ across all categories
- **Bundle Size**: < 200KB gzipped
- **First Paint**: < 1.5s on 3G
- **Interactive**: < 3s on mobile

## 🔧 Development

### Code Structure
```
src/
├── core/              # Core systems (theme, storage, events)
├── features/          # Feature modules (planning, voice, navigation)
├── providers/         # Service provider implementations
├── lib/              # Shared utilities and helpers
├── types/            # TypeScript type definitions
└── main.ts           # Application entry point
```

### Key Design Principles
- **Modular Architecture**: Loosely coupled, highly cohesive modules
- **Provider Pattern**: Swappable service integrations
- **Event-Driven**: Decoupled communication via EventBus
- **Type Safety**: Comprehensive TypeScript coverage
- **Performance First**: Lazy loading, code splitting, caching

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Full API docs in `/docs` folder
- **Issues**: GitHub issues for bugs and feature requests
- **Community**: Discord server for discussions
- **Enterprise**: Contact for commercial support

---

Built with ❤️ using modern web technologies. Ready for production deployment.
<!-- index bump יום ו׳ אוק׳ 03 2025 00:35:19 UTC -->
<!-- index bump יום ו׳ אוק׳ 03 2025 01:13:07 UTC -->
