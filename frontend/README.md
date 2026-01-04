# RoamWise: AI-Powered Travel Companion

**The app that plans, guides, and helps travelers explore using AI and real-time data.**

RoamWise is a Progressive Web App (PWA) that combines intelligent trip planning, AI-powered search, and personalized recommendations into a beautiful iOS-style mobile experience.

## Live Demo

**[https://frontend-gamma-dun.vercel.app](https://frontend-gamma-dun.vercel.app)**

---

## Test Status

| Metric | Value |
|--------|-------|
| Tests Passing | 63 |
| Tests Skipped | 48 |
| Total | 111 |
| Coverage | Core app, i18n, navigation, UI, scenarios |

**Skipped tests**: API-dependent tests (planner, weather, hazards, route chips) that require backend integration.

```bash
# Run core tests
npx playwright test tests/e2e/app.spec.ts tests/e2e/i18n.spec.ts tests/e2e/navigation.spec.ts --project=chromium
```

---

## Key Features

### AI-Powered Search
Find places with natural language queries:
- Powered by OpenAI for intelligent recommendations
- Category filtering (Food, Nature, Culture, Shopping)
- i18n support (Hebrew RTL / English LTR)

### Smart Trip Planner
Generate personalized trip plans with AI:
- **Duration options** - 2 hours, full day, weekend
- **Interest selection** - Food, Nature, Culture, Shopping, Entertainment, Relaxation
- **Budget control** - Adjustable per-person budget
- **Weather-aware** - AI insights based on current conditions

### Voice Assistant
Hands-free interaction via voice:
- Speech-to-text for queries
- Text-to-speech responses
- Quick action buttons for common tasks

### Internationalization (i18n)
Full bilingual support:
- Hebrew (RTL) - Default
- English (LTR)
- Persistent language preference
- Dynamic direction switching

### Progressive Web App
Install on any device:
- Offline-capable (service worker)
- Add to home screen
- Native-like experience
- Fast loading with Vite

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Build** | Vite 5.x |
| **Language** | Vanilla JavaScript (ES6+) |
| **Styling** | CSS Custom Properties (iOS Design System) |
| **PWA** | vite-plugin-pwa, Workbox |
| **Testing** | Playwright (E2E) |
| **i18n** | Custom JSON-based translation system |
| **Deployment** | Vercel |

---

## Installation & Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/galsened/roamwise.git
cd roamwise/frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open http://localhost:5173/roamwise-app/
```

### Environment Variables

Create a `.env` file for API keys:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_PROXY_URL=https://your-proxy-url
```

---

## Project Structure

```
frontend/
├── index.html              # Main app entry point
├── app-main.js             # Core application logic (~2400 lines)
├── styles.css              # iOS-style design system
├── public/
│   ├── i18n/
│   │   ├── en.json         # English translations
│   │   └── he.json         # Hebrew translations
│   └── icons/              # PWA icons
├── tests/
│   └── e2e/
│       ├── app.spec.ts     # Core app tests
│       ├── i18n.spec.ts    # Internationalization tests
│       ├── navigation.spec.ts # Navigation tests
│       └── utils/          # Test utilities
├── vite.config.js          # Vite configuration
└── playwright.config.ts    # Playwright test config
```

---

## Design System

iOS-inspired design with CSS custom properties:

```css
/* Colors */
--ios-blue: #007AFF;
--ios-green: #34C759;
--ios-red: #FF3B30;
--ios-orange: #FF9500;

/* Typography */
--font-size-title: 28px;
--font-size-headline: 17px;
--font-size-body: 15px;

/* Spacing */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
```

---

## Scripts

```bash
npm run dev         # Start Vite dev server
npm run build       # Production build
npm run preview     # Preview production build
npm run typecheck   # TypeScript check
npm run test        # Run Playwright tests
npm run test:ui     # Playwright UI mode
```

---

## Testing

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/app.spec.ts --project=chromium
```

### Run Against Local Dev Server

```bash
BASE_URL=http://localhost:5173/roamwise-app/ npx playwright test
```

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `app.spec.ts` | Core functionality | 11 |
| `i18n.spec.ts` | Language switching | 9 |
| `navigation.spec.ts` | Tab navigation | 4 |

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual Build

```bash
npm run build
# Deploy dist/ folder to any static host
```

---

## API Integration

RoamWise connects to backend services via a proxy:

| Endpoint | Description |
|----------|-------------|
| `/api/search` | AI-powered place search |
| `/api/planner` | Trip generation |
| `/api/weather` | Weather data |

---

## Browser Support

- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npx playwright test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built with AI for travelers</strong><br>
  <em>Search smart. Plan easy. Explore freely.</em>
</p>
