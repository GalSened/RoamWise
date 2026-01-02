# Google API Cost Analysis - RoamWise

## Summary
Your RoamWise project uses **7 different Google APIs** that can incur costs. Here's a detailed breakdown:

---

## 1. Google Places API (New) - **HIGH COST**
**File:** `backend/src/providers/google-places.js`

### API Calls:
| Endpoint | Cost per 1000 calls |
|----------|---------------------|
| Text Search | $32.00 |
| Place Details | $17.00 (Basic) to $25.00 (Advanced) |

### Usage in Code:
```javascript
// Text Search - Called every time users search for places
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// Place Details - Called when viewing place info
const DETAILS_URL = (id) => `https://places.googleapis.com/v1/places/${id}`;
```

### Optimization Already Applied:
- Using FieldMask to request only necessary fields (reduces cost)
- Caching implemented in `backend/src/ops/cache-places.js`

---

## 2. Google Distance Matrix API (Routes v2) - **MEDIUM-HIGH COST**
**File:** `backend/src/providers/google-matrix.js`

### Pricing:
| Feature | Cost per 1000 elements |
|---------|------------------------|
| Basic routing | $5.00 |
| Traffic-aware routing | $10.00 |

### Usage in Code:
```javascript
// Traffic-aware routing is ALWAYS enabled!
const URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

// Line 36: TRAFFIC_AWARE adds significant cost
...(travelMode === 'DRIVE' && { routingPreference: 'TRAFFIC_AWARE' })
```

**Cost Impact:** Traffic-aware routing doubles the cost from $5 to $10 per 1000 elements.

---

## 3. Google Maps JavaScript API - **MEDIUM COST**
**File:** `frontend/src/providers/google/maps.ts`

### Pricing:
| Service | Cost per 1000 calls |
|---------|---------------------|
| Maps JavaScript API | $7.00 (map loads) |
| Places Library (textSearch) | $32.00 |
| Places Library (getDetails) | $17.00-$25.00 |
| Directions Service | $5.00-$10.00 |

### Usage in Code:
```javascript
// Loads the expensive Places library by default
script.src = `https://maps.googleapis.com/maps/api/js?key=${this.config.apiKey}&libraries=places`;

// TextSearch - $32/1000 calls
this.service!.textSearch(request, ...)

// GetDetails - $17-25/1000 calls
this.service!.getDetails(request, ...)

// Directions - $5-10/1000 calls
this.service!.route(request, ...)
```

---

## 4. Google Maps Client (AI Service) - **MEDIUM COST**
**File:** `ai/src/services/IntelligenceEngine.js`

### Usage:
```javascript
import { Client } from '@google/maps';

this.googleMaps = new Client({
  key: process.env.GOOGLE_MAPS_API_KEY
});

// Places Nearby - $32/1000 calls
await this.googleMaps.placesNearby({
  params: {
    location: location,
    keyword: query,
    radius: SEARCH_RADIUS_METERS,
    type: 'point_of_interest'
  }
});
```

---

## 5. Google Cloud Services (AI Dependencies) - **VARIES**
**File:** `ai/package.json`

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| @google-cloud/aiplatform | AI/ML predictions | $0.0015-$0.006/prediction |
| @google-cloud/bigquery | Data analytics | $5/TB processed |
| @google-cloud/firestore | Database | $0.06/100K reads, $0.18/100K writes |
| @google-cloud/storage | File storage | $0.02/GB/month |
| @google-cloud/secret-manager | Secrets | $0.03/10K access ops |

---

## Cost Optimization Recommendations

### 1. **Reduce Places API Calls** (Biggest Savings)
Current issues:
- Frontend AND backend both call Places API separately
- AI service also calls Places API

**Recommendation:** Use only backend for Places API, let frontend use cached results.

### 2. **Disable Traffic-Aware Routing When Not Needed**
```javascript
// In backend/src/providers/google-matrix.js:36
// Change from:
...(travelMode === 'DRIVE' && { routingPreference: 'TRAFFIC_AWARE' })

// To (only use traffic when specifically needed):
...(travelMode === 'DRIVE' && options.trafficAware && { routingPreference: 'TRAFFIC_AWARE' })
```

**Savings:** 50% reduction on Distance Matrix API costs.

### 3. **Increase Cache Duration**
Current cache TTL: 5 minutes for routes, 10 minutes for places

**Recommendation:** Increase to 30-60 minutes for places, 15-30 minutes for routes.

### 4. **Consolidate API Keys**
The project uses `GOOGLE_MAPS_API_KEY` in multiple places. Ensure you're using API key restrictions:
- HTTP referrer restrictions for frontend
- IP restrictions for backend
- API restrictions (only enable needed APIs)

### 5. **Use Free Alternatives Where Possible**
| Paid API | Free Alternative |
|----------|------------------|
| Distance Matrix (basic) | OSRM (already integrated!) |
| Geocoding | Nominatim (OpenStreetMap) |
| Static Maps | Leaflet + OpenStreetMap tiles |

---

## Monthly Cost Estimate

Based on typical usage patterns:

| API | Est. Monthly Calls | Cost/1000 | Est. Monthly Cost |
|-----|-------------------|-----------|-------------------|
| Places Text Search | 5,000 | $32.00 | $160.00 |
| Places Details | 10,000 | $20.00 | $200.00 |
| Distance Matrix (traffic) | 3,000 | $10.00 | $30.00 |
| Maps JS (map loads) | 10,000 | $7.00 | $70.00 |
| Directions | 2,000 | $7.50 | $15.00 |
| Cloud Services | - | - | ~$50.00 |
| **Total** | | | **~$525/month** |

---

## Quick Fixes to Reduce Costs Now

### Fix 1: Check if duplicate API calls exist
```bash
# Search for all Places API usage
grep -r "places" --include="*.js" --include="*.ts" .
```

### Fix 2: Verify caching is working
Add logging to cache hits vs misses in `backend/src/ops/cache-places.js`.

### Fix 3: Review Google Cloud Console
1. Go to https://console.cloud.google.com/apis/dashboard
2. Check "APIs & Services" → "Dashboard"
3. Look at daily/monthly API call volumes
4. Check "Quotas" for each API

### Fix 4: Set up billing alerts
1. Go to https://console.cloud.google.com/billing
2. Set up budget alerts at 50%, 80%, 100% of your target budget

---

## Files Using Google APIs

| File | APIs Used |
|------|-----------|
| `backend/src/providers/google-places.js` | Places API (New) |
| `backend/src/providers/google-matrix.js` | Distance Matrix API |
| `backend/routes/places.js` | Places API (via provider) |
| `frontend/src/providers/google/maps.ts` | Maps JS, Places, Directions |
| `ai/src/services/IntelligenceEngine.js` | Places Nearby |
| `ai/package.json` | Cloud Platform services |

---

## Action Items

1. [ ] Check Google Cloud Console for actual API usage stats
2. [ ] Increase cache TTLs to reduce API calls
3. [ ] Disable traffic-aware routing by default
4. [ ] Remove duplicate Places API calls (frontend vs backend)
5. [ ] Set up billing alerts
6. [ ] Consider migrating to free OSRM for basic routing (already integrated)
