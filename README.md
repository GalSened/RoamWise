# RoamWise - AI-Powered Travel Companion (Monorepo)

A comprehensive travel planning application with AI-powered recommendations, weather-aware routing, and real-time navigation.

## 🏗️ Monorepo Structure

```
RoamWise/
├── frontend/          # React/TypeScript PWA (Vite + Leaflet)
├── backend/           # Node.js API server (Express + SQLite)
├── proxy/             # API proxy layer (CORS, rate limiting, caching)
├── ai/                # AI service (OpenAI o3-mini integration)
├── routing/           # OSRM routing data for Israel/Palestine (Git LFS)
├── package.json       # Workspace configuration
└── .gitattributes     # Git LFS configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Git LFS (for OSRM routing data)
- API Keys:
  - Google Maps API (Places, Routes, Geocoding)
  - OpenWeatherMap API
  - OpenAI API

### Installation

```bash
# Clone the repository
git clone https://github.com/galsened/RoamWise.git
cd RoamWise

# Install Git LFS and fetch large files
git lfs install
git lfs pull

# Install all dependencies (uses npm workspaces)
npm install
```

### Environment Configuration

Create `.env` files in each component:

#### `frontend/.env`
```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_OPENWEATHERMAP_API_KEY=your_openweather_key
VITE_BACKEND_URL=http://localhost:3000
VITE_PROXY_URL=http://localhost:8080
```

#### `backend/.env`
```bash
PORT=3000
DATABASE_PATH=./data/roamwise.db
JWT_SECRET=your_jwt_secret_here
OSRM_URL=http://localhost:5000
```

#### `proxy/.env`
```bash
PORT=8080
BACKEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:4000
CACHE_TTL=300
```

#### `ai/.env`
```bash
PORT=4000
OPENAI_API_KEY=your_openai_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Development

```bash
# Run all services in development mode
npm run dev

# Or run individual services
npm run dev:frontend   # Vite dev server (port 5173)
npm run dev:backend    # Backend API (port 3000)
npm run dev:proxy      # Proxy server (port 8080)
npm run dev:ai         # AI service (port 4000)
```

### Production Build

```bash
# Build all components
npm run build

# Run production servers
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run E2E tests (Playwright)
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📦 Components

### Frontend (`frontend/`)
- **Tech Stack**: TypeScript, Vite, Leaflet, PWA
- **Features**: Search, trip planning, voice AI, navigation, offline support
- **Port**: 5173 (dev), static files (production)

### Backend (`backend/`)
- **Tech Stack**: Node.js, Express, SQLite, JWT
- **Features**: Multi-tenant auth, user profiles, trip storage, OSRM integration
- **Port**: 3000

### Proxy (`proxy/`)
- **Tech Stack**: Node.js, Express
- **Features**: CORS handling, rate limiting, request caching, API routing
- **Port**: 8080

### AI Service (`ai/`)
- **Tech Stack**: Node.js, OpenAI SDK, Google Cloud
- **Features**: o3-mini recommendations, natural language processing, personalization
- **Port**: 4000

### Routing (`routing/`)
- **Contents**: Pre-processed OSRM data for Israel/Palestine (~627MB)
- **Tracked**: Git LFS for large binary files
- **Usage**: Mount in OSRM Docker container or use with OSRM backend

## 🔧 Development Workflow

### Working with Workspaces

```bash
# Install a package in a specific workspace
npm install --workspace=frontend <package-name>

# Run a script in a specific workspace
npm run build --workspace=frontend

# Add dev dependency to frontend
npm install --save-dev --workspace=frontend <package-name>
```

### Git LFS

Large OSRM routing files are tracked with Git LFS:

```bash
# Check LFS status
git lfs ls-files

# Manually pull LFS files
git lfs pull

# Track new large files
git lfs track "*.osrm*"
```

### Common Tasks

```bash
# Clean all node_modules
npm run clean

# Clean build artifacts
npm run clean:build

# Reinstall all dependencies
npm run clean && npm install
```

## 🧪 Testing Strategy

### Unit Tests
- **Frontend**: Vitest for component and utility tests
- **Backend**: Jest for API and database tests

### Integration Tests
- **API**: Test frontend ↔ backend ↔ AI service integration
- **Database**: Test data persistence and migrations

### E2E Tests
- **Framework**: Playwright
- **Coverage**: User flows, navigation, search, trip planning
- **Run**: `npm run test:e2e`

## 📚 Documentation

- **Frontend**: See `frontend/README.md` for detailed architecture
- **Backend**: See `backend/README.md` for API documentation
- **AI Service**: See `ai/README.md` for AI integration details
- **Product Requirements**: See `frontend/PRD.md`

## 🔐 Security

- **API Keys**: Never commit `.env` files
- **Git LFS**: Large files are NOT stored in git history
- **Secrets**: Use environment variables for all sensitive data
- **CORS**: Properly configured in proxy layer
- **Rate Limiting**: Implemented in proxy and backend

## 🚢 Deployment

### Frontend (Static Hosting)
- **Platforms**: Netlify, Vercel, GitHub Pages, AWS S3
- **Build**: `npm run build:frontend`
- **Output**: `frontend/dist/`

### Backend (Node.js Server)
- **Platforms**: Google Cloud Run, AWS ECS, Heroku
- **Requirements**: Node.js 18+, SQLite support
- **Env Vars**: Configure in deployment platform

### Proxy (Node.js Server)
- **Platforms**: Same as backend
- **Requirements**: Node.js 18+

### AI Service (Serverless or Container)
- **Platforms**: Google Cloud Run (preferred), AWS Lambda, Azure Functions
- **Requirements**: OpenAI API access

### OSRM (Docker Container)
- **Image**: `osrm/osrm-backend`
- **Data**: Mount `routing/` directory
- **Command**: `osrm-routed /data/israel-and-palestine-latest.osrm`

## 🔄 CI/CD

GitHub Actions workflows are configured for automated testing and deployment:

### Workflows

- **CI - Monorepo** (`.github/workflows/ci.yml`)
  - Runs on: Pull requests and pushes to `main`
  - Actions: Lint, type check, unit tests, build all components
  - Matrix: Frontend and backend tests run in parallel

- **Deploy Frontend to GitHub Pages** (`.github/workflows/deploy-pages.yml`)
  - Runs on: Push to `main` (changes to `frontend/**`)
  - Actions: Build and deploy frontend to https://galsened.github.io/RoamWise/
  - Trigger: Automatic on merge

- **E2E Tests** (`.github/workflows/e2e.yml`)
  - Runs on: Pull requests (changes to `frontend/**`)
  - Actions: Playwright E2E tests against GitHub Pages
  - Browser: Chromium

- **Secret Scan** (`.github/workflows/secret-scan.yml`)
  - Runs on: All pull requests and pushes to `main`
  - Actions: Gitleaks secret detection
  - Blocks: Merges with detected secrets

### Status Badges

Check the [Actions tab](https://github.com/GalSened/RoamWise/actions) for workflow status and logs.

## 🐛 Troubleshooting

### Git LFS issues
```bash
# Reinstall LFS hooks
git lfs install --force

# Verify LFS is working
git lfs env
```

### Workspace issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall everything
npm run clean && npm install
```

### Build issues
```bash
# Type check all workspaces
npm run typecheck

# Clean and rebuild
npm run clean:build && npm run build
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes in appropriate workspace(s)
4. Run tests: `npm test`
5. Commit: `git commit -m 'feat: Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ using modern web technologies**

🤖 Monorepo consolidated on 2025-10-24
