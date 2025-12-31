# Vercel Environment Variables

Configure these environment variables in your Vercel dashboard:
**Project Settings > Environment Variables**

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform API key (Places, Directions) | `AIzaSyC...` |
| `JWT_SECRET` | Secret key for JWT token signing (use a strong random string) | `your-secret-key-min-32-chars` |

## Optional Variables

### Routing Providers

| Variable | Description | Default |
|----------|-------------|---------|
| `OSRM_URL` | OSRM routing server URL | `http://router.project-osrm.org` |
| `ORS_URL` | OpenRouteService API URL | `https://api.openrouteservice.org` |
| `ORS_API_KEY` | OpenRouteService API key (for avoid features) | `` |

### Hazards API

| Variable | Description | Default |
|----------|-------------|---------|
| `HAZ_WEATHER_URL` | Weather hazards API URL | `` |
| `HAZ_TRAFFIC_URL` | Traffic hazards API URL | `` |
| `HAZ_CACHE_TTL_MS` | Hazards cache TTL in milliseconds | `300000` (5 min) |
| `HAZ_TIMEOUT_MS` | Hazards API timeout in milliseconds | `10000` (10 sec) |

### Route Cache

| Variable | Description | Default |
|----------|-------------|---------|
| `ROUTE_CACHE_MAX` | Maximum cached routes | `1000` |
| `ROUTE_CACHE_TTL_MS` | Route cache TTL in milliseconds | `300000` (5 min) |
| `ROUTE_TIMEOUT_MS` | Route API timeout in milliseconds | `12000` (12 sec) |

### General

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |

---

## How to Add Environment Variables in Vercel

1. Go to your Vercel Dashboard
2. Select the RoamWise project
3. Go to **Settings** > **Environment Variables**
4. Add each variable with the appropriate value
5. Choose the environments (Production, Preview, Development)
6. Click **Save**

### Important Notes

- **Production secrets**: Use different values for `JWT_SECRET` in production
- **API Keys**: Never expose API keys in frontend code
- **Redeploy**: After adding/changing env vars, redeploy for changes to take effect

---

## API Endpoints Summary

After deployment, these endpoints will be available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/hazards` | GET | Weather/traffic hazards |
| `/api/places/search` | POST | Search places |
| `/api/places/:id` | GET | Place details |
| `/api/route` | POST | Compute route |
| `/api/profile` | GET/PUT | User profile |
| `/api/me` | GET | Current user |
| `/api/dev/login` | POST | Dev login |
| `/api/dev/logout` | POST | Dev logout |
| `/api/dev/tenants` | GET | List tenants |
| `/api/dev/users/:tenantId` | GET | Users by tenant |
