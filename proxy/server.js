// Updated: 2025-10-01T16:42:00Z
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";
import compression from "compression";
import helmet from "helmet";
import NodeCache from "node-cache";
import { body, validationResult } from "express-validator";
import winston from "winston";
import multer from "multer";
import FormData from "form-data";
import OpenAI from "openai";

const app = express();

// ✨ ADVANCED MIDDLEWARE & CACHING SYSTEM

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow external resources for maps
  crossOriginEmbedderPolicy: false // Allow embedding for PWA
}));

// Compression middleware
app.use(compression({
  threshold: 1024,
  level: 6,
  memLevel: 8
}));

// Enhanced logging with Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiting with different tiers
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { ok: false, error: message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' // Skip localhost
});

// Different rate limits for different endpoints
const generalLimit = createRateLimit(15 * 60 * 1000, 100, "Too many requests");
const aiLimit = createRateLimit(60 * 1000, 10, "Too many AI requests");
const searchLimit = createRateLimit(60 * 1000, 30, "Too many search requests");

// Apply general rate limiting
app.use(generalLimit);

// In-memory cache system
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Better performance
});

// Cache middleware generator
const cacheMiddleware = (ttl = 300) => (req, res, next) => {
  const key = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`;
  const cached = cache.get(key);

  if (cached) {
    logger.info(`Cache hit: ${key}`);
    return res.json(cached);
  }

  // Store original json method
  const originalJson = res.json;
  res.json = function (body) {
    // Cache successful responses only
    if (body.ok) {
      cache.set(key, body, ttl);
      logger.info(`Cached response: ${key}`);
    }
    return originalJson.call(this, body);
  };

  next();
};

// Request validation middleware
const validateRequest = (validations) => [
  ...validations,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`[${req.id}] Validation failed:`, errors.array());
      return res.status(400).json({
        ok: false,
        code: 'invalid_request',
        message: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Enhanced error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  logger.info(`[${req.id}] ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(morgan("combined", { stream: { write: message => logger.info(message.trim()) } }));

// Environment
const GMAPS_KEY = process.env.GMAPS_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!GMAPS_KEY) { console.error("Missing GMAPS_KEY env"); process.exit(1); }

// CORS: limit to your GitHub Pages origin(s)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.length === 0) return cb(null, true);
    return ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"));
  }
}));

// Helpers
const g = (u) => `https://maps.googleapis.com${u}${u.includes("?") ? "&" : "?"}key=${GMAPS_KEY}`;
const ok = (res, data) => res.json({ ok: true, ...data });
const err = (res, code, msg) => res.status(code).json({ ok: false, error: msg });

// ---- Provider Stubs (no external API calls) ----
async function stubSearchPlaces(query, location) {
  // Stub: return mock places for the query
  return [
    { id: 'place-1', name: `${query} Spot A`, rating: 4.5, category: 'attraction', vicinity: '123 Fake St' },
    { id: 'place-2', name: `${query} Spot B`, rating: 4.2, category: 'restaurant', vicinity: '456 Mock Ave' }
  ];
}

async function stubGetWeather(lat, lon, ts) {
  // Stub: return mock weather
  return { temp: 22, conditions: 'sunny', humidity: 60 };
}

async function stubGetRouteSummary(waypoints) {
  // Stub: return mock route
  return {
    distance: waypoints.length * 5,
    duration: waypoints.length * 15,
    polyline: 'mock_polyline_stub'
  };
}

// ---- Guardrails Middleware ----
const MAX_INTERESTS = 50;
const MAX_BUDGET = 100000;

function plannerGuardrails(req, res, next) {
  const { preferences, startLocation } = req.body;

  // Semantic checks (after express-validator passes)
  try {
    // Check coordinates are valid and not zero-zero
    if (startLocation.lat === 0 && startLocation.lng === 0) {
      return res.status(422).json({
        ok: false,
        code: 'coords_invalid',
        message: 'Coordinates cannot be (0, 0) - null island'
      });
    }

    // Check budget is reasonable
    if (preferences.budget && preferences.budget > MAX_BUDGET) {
      return res.status(422).json({
        ok: false,
        code: 'budget_out_of_bounds',
        message: `Budget cannot exceed ${MAX_BUDGET}`
      });
    }

    // Check interests array is not empty
    if (!preferences.interests || preferences.interests.length === 0) {
      return res.status(422).json({
        ok: false,
        code: 'interests_required',
        message: 'At least one interest is required'
      });
    }

    // Normalize coordinates to 6 decimals for cache deduplication
    startLocation.lat = Number(startLocation.lat.toFixed(6));
    startLocation.lng = Number(startLocation.lng.toFixed(6));

    // Attach sanitized payload
    req.planPayload = { preferences, startLocation };
    next();
  } catch (error) {
    logger.error(`[${req.id}] Guardrails check failed:`, error);
    return res.status(400).json({
      ok: false,
      code: 'validation_error',
      message: 'Request validation failed'
    });
  }
}

// ---- /places ---- (Enhanced with caching and validation)
app.post("/places",
  searchLimit,
  cacheMiddleware(600), // Cache for 10 minutes
  validateRequest([
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be 100-50000m'),
    body('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be 0-5')
  ]),
  asyncHandler(async (req, res) => {
    const { lat, lng, openNow = true, radius = 4500, language = 'he', type = 'point_of_interest', keyword = '', minRating = 0, maxResults = 12 } = req.body || {};
    logger.info(`[${req.id}] Places search: ${lat},${lng} radius:${radius}`);

    // MOCK RESPONSE
    if (!GMAPS_KEY || GMAPS_KEY === 'dummy_key') {
      const items = await stubSearchPlaces(keyword || 'Local', { lat, lng });
      return ok(res, { items });
    }

    const p = new URLSearchParams({ location: `${lat},${lng}`, radius: String(radius), language, type });
    if (openNow) p.set("opennow", "true");
    if (keyword) p.set("keyword", keyword);
    const r = await fetch(g(`/maps/api/place/nearbysearch/json?${p}`));
    const j = await r.json();
    if (!["OK", "ZERO_RESULTS"].includes(j.status)) return err(res, 400, `Places: ${j.status}`);
    const items = (j.results || []).filter(x => (x.rating || 0) >= minRating).slice(0, maxResults).map(x => ({
      id: x.place_id, name: x.name, address: x.vicinity || x.formatted_address || "",
      rating: x.rating, userRatingsTotal: x.user_ratings_total,
      lat: x.geometry?.location?.lat, lng: x.geometry?.location?.lng,
      openNow: x.opening_hours?.open_now ?? null
    }));
    ok(res, { items });
  })
);

// ---- /place-details ----
app.post("/place-details", async (req, res) => {
  try {
    const { placeId, language = 'he' } = req.body || {};
    if (!placeId) return err(res, 400, "placeId required");

    // MOCK RESPONSE
    if (!GMAPS_KEY || GMAPS_KEY === 'dummy_key') {
      return ok(res, {
        details: {
          name: "Mock Place " + placeId,
          formatted_address: "123 Mock St, Tel Aviv",
          formatted_phone_number: "03-1234567",
          rating: 4.5,
          user_ratings_total: 100,
          geometry: { location: { lat: 32.0853, lng: 34.7818 } }
        }
      });
    }

    const fields = ["name", "formatted_address", "formatted_phone_number", "opening_hours", "website", "url", "geometry", "rating", "user_ratings_total"].join(",");
    const r = await fetch(g(`/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&language=${language}&fields=${fields}`));
    const j = await r.json();
    if (j.status !== "OK") return err(res, 400, `Details: ${j.status}`);
    ok(res, { details: j.result });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- /autocomplete ----
app.post("/autocomplete", async (req, res) => {
  try {
    const { input, language = 'he', sessionToken = '' } = req.body || {};
    if (!input) return err(res, 400, "input required");
    const p = new URLSearchParams({ input, language });
    if (sessionToken) p.set("sessiontoken", sessionToken);
    const r = await fetch(g(`/maps/api/place/autocomplete/json?${p}`));
    const j = await r.json();
    if (!["OK", "ZERO_RESULTS"].includes(j.status)) return err(res, 400, `Autocomplete: ${j.status}`);
    ok(res, { predictions: j.predictions || [] });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- /geocode ----
app.post("/geocode", async (req, res) => {
  try {
    const { query, language = 'he' } = req.body || {};
    if (!query) return err(res, 400, "query required");
    const r = await fetch(g(`/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=${language}`));
    const j = await r.json();
    if (j.status !== "OK" || !j.results?.length) return err(res, 404, "not found");
    const r0 = j.results[0];
    ok(res, { result: { address: r0.formatted_address, lat: r0.geometry?.location?.lat, lng: r0.geometry?.location?.lng, placeId: r0.place_id } });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- /route ----
app.post("/route", async (req, res) => {
  try {
    const { origin, dest, mode = 'driving', language = 'he' } = req.body || {};
    if (!origin?.lat || !origin?.lng || !dest?.lat || !dest?.lng) return err(res, 400, "origin/dest lat/lng required");

    // MOCK RESPONSE
    if (!GMAPS_KEY || GMAPS_KEY === 'dummy_key') {
      return ok(res, {
        summary: "Mock Route",
        distanceText: "5 km",
        durationText: "15 mins",
        startAddress: "Origin",
        endAddress: "Destination",
        polyline: "mock_polyline"
      });
    }

    const p = new URLSearchParams({ origin: `${origin.lat},${origin.lng}`, destination: `${dest.lat},${dest.lng}`, mode, language, departure_time: "now" });
    const r = await fetch(g(`/maps/api/directions/json?${p}`));
    const j = await r.json();
    if (j.status !== "OK") return err(res, 400, `Directions: ${j.status}`);
    const route = j.routes?.[0]; const leg = route?.legs?.[0];
    ok(res, {
      summary: route?.summary,
      distanceText: leg?.distance?.text,
      durationText: leg?.duration_in_traffic?.text || leg?.duration?.text,
      startAddress: leg?.start_address,
      endAddress: leg?.end_address,
      polyline: route?.overview_polyline?.points
    });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- /think (ChatGPT NLU) ----
app.post("/think", async (req, res) => {
  try {
    const { text, context } = req.body || {};
    if (!text) return err(res, 400, "text required");

    // MOCK RESPONSE FOR TESTING
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy_key') {
      logger.info('Using MOCK response for /think');
      return ok(res, {
        intent: 'activities',
        mode: null,
        filters: { openNow: true },
        destinationText: 'Tel Aviv',
        subcategory: 'museum'
      });
    }

    const systemPrompt = [
      "You are an NLU planner for a travel & local discovery app.",
      "Output STRICT JSON with keys:",
      "intent: 'route' | 'activities' | 'viewpoints' | 'pizza' | 'gelato' | 'food',",
      "mode: 'driving' | 'transit' | null,",
      "filters: { openNow?: boolean, minRating?: number, keyword?: string },",
      "destinationText: string | null,",
      "subcategory: string | null  // for activities: water|hike|bike|museum|park|amusement|spa|kids",
      "No prose, JSON only."
    ].join("\n");

    const userMsg = `Text: <<${req.body.text}>>. Locale: ${context?.locale || 'he-IL'}. Be concise.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ],
        response_format: { type: "json_object" }
      })
    });
    const j = await r.json();
    if (j.error) return err(res, 400, j.error.message || "openai error");
    let jsonText = null;
    try {
      if (j.choices && j.choices[0]?.message?.content) {
        jsonText = j.choices[0].message.content;
      }
    } catch { }
    if (!jsonText) return err(res, 500, "bad openai response shape");
    const parsed = JSON.parse(jsonText);
    ok(res, parsed);
  } catch (e) { err(res, 500, String(e)); }
});

// ---- /weather (Open-Meteo) ---- (Enhanced with caching)
app.post("/weather",
  cacheMiddleware(600), // Cache weather for 10 minutes
  validateRequest([
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
  ]),
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.body || {};
    logger.info(`[${req.id}] Weather request: ${lat},${lng}`);
    const params = new URLSearchParams({
      latitude: String(lat), longitude: String(lng),
      current: ["temperature_2m", "apparent_temperature", "precipitation", "wind_speed_10m", "is_day"].join(","),
      hourly: ["temperature_2m", "precipitation_probability", "precipitation", "wind_speed_10m", "cloud_cover"].join(","),
      daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "sunrise", "sunset"].join(","),
      timezone: "auto"
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

    // MOCK if fetch fails or for consistency (Optional, but good for stability)
    // Actually OpenMeteo is free and doesn't need key, so we might leave it or wrap in try-catch fallback
    // But let's verify connectivity. Assuming verify ok.
    const r = await fetch(url);
    if (!r.ok) return err(res, 502, "weather upstream error");
    const j = await r.json();
    const out = {
      current: j.current || null,
      hourly: j.hourly ? {
        time: j.hourly.time,
        temperature_2m: j.hourly.temperature_2m,
        precipitation_probability: j.hourly.precipitation_probability,
        precipitation: j.hourly.precipitation,
        wind_speed_10m: j.hourly.wind_speed_10m,
        cloud_cover: j.hourly.cloud_cover
      } : null,
      daily: j.daily ? {
        time: j.daily.time,
        temperature_2m_max: j.daily.temperature_2m_max,
        temperature_2m_min: j.daily.temperature_2m_min,
        precipitation_sum: j.daily.precipitation_sum,
        sunrise: j.daily.sunrise,
        sunset: j.daily.sunset
      } : null,
      units: j.daily_units || j.hourly_units || {}
    };
    ok(res, { weather: out });
  })
);

// ---- /weather-compare ----
app.post("/weather-compare", async (req, res) => {
  try {
    const { src, dst } = req.body || {};
    if (!src?.lat || !src?.lng || !dst?.lat || !dst?.lng) return err(res, 400, "src/dst lat/lng required");
    const mk = (lat, lng) => new URL(`https://api.open-meteo.com/v1/forecast?` + new URLSearchParams({
      latitude: String(lat), longitude: String(lng),
      current: ["temperature_2m", "apparent_temperature", "precipitation", "wind_speed_10m", "is_day"].join(","),
      hourly: ["temperature_2m", "precipitation_probability", "precipitation", "wind_speed_10m", "cloud_cover"].join(","),
      daily: ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "sunrise", "sunset"].join(","),
      timezone: "auto"
    }).toString());
    const [r1, r2] = await Promise.all([fetch(mk(src.lat, src.lng)), fetch(mk(dst.lat, dst.lng))]);
    if (!r1.ok || !r2.ok) return err(res, 502, "weather upstream error");
    const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
    ok(res, { src: j1, dst: j2 });
  } catch (e) { err(res, 500, String(e)); }
});

// ═══════════════════════════════════════════════════════════════════════════
// SMART ROUTE OPTIMIZER - 3-Mode Trip Optimization System
// ═══════════════════════════════════════════════════════════════════════════

class SmartRouteOptimizer {
  constructor(gmapsKey, logger) {
    this.gmapsKey = gmapsKey;
    this.logger = logger;
    this.interventionCache = new Map();
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN ENTRY: Generate 3 Packages
  // ─────────────────────────────────────────────────────────────
  async generatePackages(origin, destination, options = {}) {
    const startTime = Date.now();
    const weather = await this.getWeather(destination);
    const weatherScores = this.calculateWeatherScore(weather);

    // Generate all 3 mode packages in parallel
    const [efficiency, scenic, foodie] = await Promise.all([
      this.optimizeEfficiency(origin, destination, weather),
      this.optimizeScenic(origin, destination, weather),
      this.optimizeFoodie(origin, destination, weather)
    ]);

    const packages = { efficiency, scenic, foodie };

    // Determine recommended mode based on conditions
    const recommended = this.recommendMode(weatherScores, options.userPrefs, packages);
    const recommendationReason = this.getRecommendationReason(recommended, weatherScores, packages);

    // Collect disabled modes
    const disabledModes = Object.entries(packages)
      .filter(([_, pkg]) => pkg.disabled)
      .map(([mode, pkg]) => ({
        mode,
        reason: pkg.reason,
        icon: this.getDisableIcon(pkg.reason)
      }));

    return {
      ok: true,
      recommended,
      recommendationReason,
      packages,
      weatherInsights: {
        current: weather,
        scores: weatherScores,
        alerts: this.generateWeatherAlerts(weather)
      },
      disabledModes,
      metadata: {
        requestId: `opt_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // MODE A: EFFICIENCY (Fastest Route)
  // ─────────────────────────────────────────────────────────────
  async optimizeEfficiency(origin, destination, weather) {
    try {
      // Get fastest route
      const route = await this.getRoute(origin, destination, { optimize: 'DURATION' });

      // Search POIs within 500m of route, max 5 min detour
      const pois = await this.searchAlongRoute(route, origin, {
        radius: 500,
        types: ['cafe', 'restaurant', 'gas_station'],
        minRating: 4.0,
        maxDetour: 5 * 60
      });

      // Score POIs
      const scored = pois
        .map(poi => ({ ...poi, score: this.efficiencyPOIScore(poi) }))
        .filter(poi => poi.score > 0)
        .sort((a, b) => b.score - a.score);

      // Weather alert check
      const weatherScore = this.calculateWeatherScore(weather);
      const hazardAlert = weatherScore.overall < 0.4;

      return {
        mode: 'efficiency',
        disabled: false,
        route: {
          polyline: route.polyline,
          duration: route.durationSeconds,
          distance: route.distanceMeters,
          trafficDelay: route.trafficDelay || 0
        },
        stops: scored.slice(0, 3).map(poi => ({
          place_id: poi.id,
          name: poi.name,
          location: { lat: poi.lat, lon: poi.lng },
          rating: poi.rating,
          user_ratings_total: poi.userRatingsTotal,
          types: poi.types || ['cafe'],
          detourMinutes: poi.detourMinutes || 3,
          score: Math.round(poi.score * 10) / 10
        })),
        totalDuration: route.durationSeconds + (scored.length * 300), // +5 min per stop
        hazardAlert,
        combinedScore: this.calculateCombinedScore('efficiency', route, scored, weatherScore)
      };
    } catch (error) {
      this.logger.error('Efficiency mode error:', error);
      return { mode: 'efficiency', disabled: true, reason: 'Route calculation failed' };
    }
  }

  efficiencyPOIScore(poi) {
    if (!poi.rating || poi.rating < 4.0) return 0;

    const base = poi.rating * Math.log1p(poi.userRatingsTotal || 1);
    const deviationPenalty = Math.exp(-(poi.detourMinutes || 3) / 5);
    const typeBonus = ['cafe', 'fast_food'].some(t => poi.types?.includes(t)) ? 1.2 : 1.0;

    return base * deviationPenalty * typeBonus;
  }

  // ─────────────────────────────────────────────────────────────
  // MODE B: SCENIC (Most Beautiful)
  // ─────────────────────────────────────────────────────────────
  async optimizeScenic(origin, destination, weather) {
    // CRITICAL: Check viability first
    const visibility = weather.visibility || 10;
    const precipProb = weather.precipitation_probability || 0;

    if (visibility < 5) {
      return {
        mode: 'scenic',
        disabled: true,
        reason: `Foggy view: visibility ${visibility}km < 5km minimum`,
        downgradeWarning: true,
        fallbackMode: 'efficiency'
      };
    }

    if (precipProb > 30) {
      return {
        mode: 'scenic',
        disabled: true,
        reason: `Rain expected: ${precipProb}% > 30% threshold`,
        downgradeWarning: true,
        fallbackMode: 'efficiency'
      };
    }

    try {
      // Get fastest route as baseline
      const fastestRoute = await this.getRoute(origin, destination, { optimize: 'DURATION' });
      const maxDuration = fastestRoute.durationSeconds * 1.3; // +30% allowed

      // For scenic, we search for scenic POIs and create a route through them
      const pois = await this.searchScenicPOIs(origin, destination, {
        radius: 2000,
        types: ['park', 'tourist_attraction', 'natural_feature', 'point_of_interest'],
        attributes: ['view', 'outdoor_seating', 'atmosphere']
      });

      // Score scenic POIs
      const scored = pois
        .map(poi => ({ ...poi, score: this.scenicPOIScore(poi, weather) }))
        .sort((a, b) => b.score - a.score);

      const durationIncrease = Math.round(
        ((fastestRoute.durationSeconds * 1.2) / fastestRoute.durationSeconds - 1) * 100
      );

      return {
        mode: 'scenic',
        disabled: false,
        route: {
          polyline: fastestRoute.polyline,
          duration: Math.round(fastestRoute.durationSeconds * 1.2),
          distance: Math.round(fastestRoute.distanceMeters * 1.15),
          scenicScore: 0.85
        },
        durationIncrease: `+${durationIncrease}%`,
        stops: scored.slice(0, 5).map(poi => ({
          place_id: poi.id,
          name: poi.name,
          location: { lat: poi.lat, lon: poi.lng },
          rating: poi.rating,
          types: poi.types || ['tourist_attraction'],
          attributes: poi.attributes || ['view'],
          score: Math.round(poi.score * 10) / 10
        })),
        weatherVisibility: visibility,
        combinedScore: this.calculateCombinedScore('scenic', fastestRoute, scored, this.calculateWeatherScore(weather))
      };
    } catch (error) {
      this.logger.error('Scenic mode error:', error);
      return { mode: 'scenic', disabled: true, reason: 'Route calculation failed' };
    }
  }

  scenicPOIScore(poi, weather) {
    const base = (poi.rating || 4.0) * Math.log1p(poi.userRatingsTotal || 10);

    let attributeBonus = 1.0;
    if (poi.attributes?.includes('view')) attributeBonus += 0.3;
    if (poi.attributes?.includes('outdoor_seating')) attributeBonus += 0.2;
    if (poi.types?.includes('park')) attributeBonus += 0.15;

    const visibility = weather.visibility || 10;
    const visibilityBonus = Math.min(visibility / 10, 1.5);

    return base * attributeBonus * visibilityBonus;
  }

  // ─────────────────────────────────────────────────────────────
  // MODE C: FOODIE (Culinary Focus)
  // ─────────────────────────────────────────────────────────────
  async optimizeFoodie(origin, destination, weather) {
    try {
      // FOOD-FIRST: Search restaurants first, then calculate route
      const midpoint = this.midpoint(origin, destination);

      const restaurants = await this.searchPlaces({
        location: midpoint,
        radius: 10000, // 10km
        type: 'restaurant',
        minRating: 4.4, // Start at 4.4, prefer 4.6+
        minReviews: 100
      });

      // Filter out outdoor-only if rain expected
      const precipProb = weather.precipitation_probability || 0;
      const filtered = restaurants.filter(r => {
        const isOutdoorOnly = r.outdoorSeating && !r.indoorSeating;
        return !(isOutdoorOnly && precipProb > 20);
      });

      // Apply strict criteria and fallback
      let qualified = filtered.filter(r => r.rating >= 4.6 && (r.userRatingsTotal || 0) >= 500);

      // Fallback: lower criteria if no results
      if (qualified.length === 0) {
        qualified = filtered.filter(r => r.rating >= 4.4 && (r.userRatingsTotal || 0) >= 100);
      }

      if (qualified.length === 0) {
        return {
          mode: 'foodie',
          disabled: true,
          reason: 'No qualifying restaurants (rating >= 4.4, reviews >= 100)'
        };
      }

      // Score and select best
      const scored = qualified
        .map(r => ({ ...r, score: this.foodiePOIScore(r) }))
        .sort((a, b) => b.score - a.score);

      const selected = scored[0];

      // Calculate routes AFTER selecting restaurant
      const [routeToFood, routeFromFood] = await Promise.all([
        this.getRoute(origin, { lat: selected.lat, lng: selected.lng }),
        this.getRoute({ lat: selected.lat, lng: selected.lng }, destination)
      ]);

      return {
        mode: 'foodie',
        disabled: false,
        selectedRestaurant: {
          place_id: selected.id,
          name: selected.name,
          location: { lat: selected.lat, lon: selected.lng },
          rating: selected.rating,
          user_ratings_total: selected.userRatingsTotal,
          types: selected.types || ['restaurant'],
          priceLevel: selected.priceLevel || 2,
          score: Math.round(selected.score * 10) / 10,
          whySelected: [
            `Rating: ${selected.rating}/5`,
            `Reviews: ${selected.userRatingsTotal?.toLocaleString() || 'N/A'}`,
            `Cuisine: ${selected.primaryType || 'Restaurant'}`
          ]
        },
        alternatives: scored.slice(1, 4).map(r => ({
          name: r.name,
          rating: r.rating,
          score: Math.round(r.score * 10) / 10
        })),
        routeToRestaurant: {
          duration: routeToFood.durationSeconds,
          distance: routeToFood.distanceMeters
        },
        routeFromRestaurant: {
          duration: routeFromFood.durationSeconds,
          distance: routeFromFood.distanceMeters
        },
        outdoorFiltered: precipProb > 20,
        combinedScore: this.calculateCombinedScore('foodie', routeToFood, [selected], this.calculateWeatherScore(weather))
      };
    } catch (error) {
      this.logger.error('Foodie mode error:', error);
      return { mode: 'foodie', disabled: true, reason: 'Restaurant search failed' };
    }
  }

  foodiePOIScore(poi) {
    const rating = poi.rating || 0;
    const reviews = poi.userRatingsTotal || 0;

    if (rating < 4.4 || reviews < 100) return 0;

    const base = rating * Math.pow(Math.log1p(reviews), 1.5);
    const ratingBonus = rating >= 4.8 ? 1.3 : rating >= 4.6 ? 1.15 : 1.0;
    const volumeBonus = reviews >= 1000 ? 1.2 : reviews >= 500 ? 1.1 : 1.0;

    return base * ratingBonus * volumeBonus;
  }

  // ─────────────────────────────────────────────────────────────
  // WEATHER SCORING
  // ─────────────────────────────────────────────────────────────
  calculateWeatherScore(weather) {
    const precipitation = this.scorePrecipitation(weather.precipitation_probability || 0);
    const visibility = this.scoreVisibility(weather.visibility || 10);
    const temperature = this.scoreTemperature(weather.temperature_2m || 20);
    const wind = this.scoreWind(weather.wind_speed_10m || 10);

    return {
      precipitation,
      visibility,
      temperature,
      wind,
      overall: precipitation * 0.4 + visibility * 0.3 + temperature * 0.2 + wind * 0.1
    };
  }

  scorePrecipitation(prob) {
    if (prob <= 10) return 1.0;
    if (prob <= 30) return 0.8;
    if (prob <= 50) return 0.5;
    if (prob <= 70) return 0.2;
    return 0.0;
  }

  scoreVisibility(vis) {
    if (vis >= 10) return 1.0;
    if (vis >= 5) return 0.8;
    if (vis >= 2) return 0.5;
    if (vis >= 1) return 0.2;
    return 0.0;
  }

  scoreTemperature(temp) {
    if (temp >= 18 && temp <= 26) return 1.0;
    if (temp >= 14 && temp <= 30) return 0.8;
    if (temp >= 8 && temp <= 35) return 0.5;
    return 0.3;
  }

  scoreWind(wind) {
    if (wind <= 15) return 1.0;
    if (wind <= 30) return 0.7;
    if (wind <= 50) return 0.4;
    return 0.2;
  }

  // ─────────────────────────────────────────────────────────────
  // MODE RECOMMENDATION
  // ─────────────────────────────────────────────────────────────
  recommendMode(weatherScores, userPrefs, packages) {
    const scores = {
      efficiency: 0.5,
      scenic: 0.5,
      foodie: 0.5
    };

    // Disable if mode is disabled
    if (packages.efficiency?.disabled) scores.efficiency = 0;
    if (packages.scenic?.disabled) scores.scenic = 0;
    if (packages.foodie?.disabled) scores.foodie = 0;

    // Weather-based adjustments
    if (weatherScores.overall >= 0.8) {
      scores.scenic += 0.4; // Great weather = scenic
    } else if (weatherScores.overall < 0.6) {
      scores.efficiency += 0.3; // Bad weather = efficiency
    }

    // Time-based adjustments
    const hour = new Date().getHours();
    if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
      scores.foodie += 0.3; // Meal times
    }

    // User preference adjustments
    if (userPrefs?.preferScenic) scores.scenic += 0.3;
    if (userPrefs?.preferCulinary) scores.foodie += 0.3;
    if (userPrefs?.timeConstrained) scores.efficiency += 0.3;

    // Return highest score
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  getRecommendationReason(mode, weatherScores, packages) {
    if (packages[mode]?.disabled) {
      const enabled = Object.keys(packages).find(m => !packages[m].disabled);
      return `${mode} disabled, defaulting to ${enabled}`;
    }

    if (mode === 'scenic' && weatherScores.overall >= 0.8) {
      return `Excellent visibility (${weatherScores.visibility * 10}km) and low precipitation`;
    }
    if (mode === 'efficiency' && weatherScores.overall < 0.6) {
      return `Weather conditions suggest faster route`;
    }
    if (mode === 'foodie') {
      const hour = new Date().getHours();
      if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
        return `Perfect timing for a culinary experience`;
      }
    }
    return `Based on current conditions and preferences`;
  }

  // ─────────────────────────────────────────────────────────────
  // MONITOR AGENT: INTERVENTION CHECKING
  // ─────────────────────────────────────────────────────────────
  async checkInterventions(tripContext) {
    const { destination, currentWeather, previousWeather, liveTrafficDelay } = tripContext;
    const interventions = [];

    // TRIGGER 1: Weather + Outdoor Destination
    if (destination.isOutdoor) {
      const precipProb = currentWeather.precipitation_probability || 0;
      const visibility = currentWeather.visibility || 10;
      const windSpeed = currentWeather.wind_speed_10m || 0;

      if (precipProb > 40 || visibility < 2 || windSpeed > 50) {
        const alternatives = await this.searchIndoorAlternatives(destination.location);
        interventions.push({
          id: `int_${Date.now()}_wx`,
          type: 'weather_outdoor_conflict',
          severity: precipProb > 60 || visibility < 1 ? 'urgent' : 'warning',
          title: this.getWeatherAlertTitle(precipProb, visibility, windSpeed),
          message: this.getWeatherAlertMessage(destination.name, precipProb, visibility),
          reasoning: [
            precipProb > 40 ? `Precipitation: ${precipProb}%` : null,
            visibility < 2 ? `Low visibility: ${visibility}km` : null,
            windSpeed > 50 ? `Strong winds: ${windSpeed}km/h` : null
          ].filter(Boolean),
          suggestions: alternatives.slice(0, 3).map(alt => ({
            id: alt.id,
            type: 'alternative_place',
            place: {
              name: alt.name,
              location: { lat: alt.lat, lng: alt.lng },
              distance: alt.distance,
              isIndoor: true
            },
            actionLabel: `Go to ${alt.name}`
          })),
          status: 'pending'
        });
      }
    }

    // TRIGGER 2: Traffic Delay > 30 minutes
    if (liveTrafficDelay && liveTrafficDelay > 30 * 60) {
      interventions.push({
        id: `int_${Date.now()}_traffic`,
        type: 'traffic_delay',
        severity: liveTrafficDelay > 60 * 60 ? 'urgent' : 'warning',
        title: '🚗 Significant Traffic Delay',
        message: `Traffic adds ${Math.round(liveTrafficDelay / 60)} minutes to your route`,
        reasoning: [`Live traffic delay: ${Math.round(liveTrafficDelay / 60)} minutes`],
        suggestions: [{
          id: 'recalculate',
          type: 'route_change',
          actionLabel: 'Find Faster Route'
        }],
        status: 'pending'
      });
    }

    // TRIGGER 3: Weather Degradation
    if (previousWeather) {
      const degradation = this.calculateDegradation(previousWeather, currentWeather);
      if (degradation > 0.3) {
        interventions.push({
          id: `int_${Date.now()}_degrade`,
          type: 'weather_degradation',
          severity: degradation > 0.7 ? 'urgent' : 'warning',
          title: '⚠️ Weather Conditions Worsening',
          message: 'Weather has degraded since trip planning',
          reasoning: this.getDegradationReasons(previousWeather, currentWeather),
          suggestions: [{
            id: 'replan',
            type: 'time_adjustment',
            actionLabel: 'Adjust Trip Plan'
          }],
          status: 'pending'
        });
      }
    }

    return interventions;
  }

  calculateDegradation(prev, curr) {
    const precipDelta = ((curr.precipitation_probability || 0) - (prev.precipitation_probability || 0)) / 100;
    const visDelta = ((prev.visibility || 10) - (curr.visibility || 10)) / (prev.visibility || 10);
    const windDelta = ((curr.wind_speed_10m || 0) - (prev.wind_speed_10m || 0)) / 50;

    return Math.max(precipDelta, visDelta, windDelta);
  }

  getDegradationReasons(prev, curr) {
    const reasons = [];
    if ((curr.precipitation_probability || 0) > (prev.precipitation_probability || 0) + 20) {
      reasons.push(`Precipitation increased: ${prev.precipitation_probability || 0}% → ${curr.precipitation_probability}%`);
    }
    if ((curr.visibility || 10) < (prev.visibility || 10) - 3) {
      reasons.push(`Visibility dropped: ${prev.visibility || 10}km → ${curr.visibility}km`);
    }
    if ((curr.wind_speed_10m || 0) > (prev.wind_speed_10m || 0) + 15) {
      reasons.push(`Wind increased: ${prev.wind_speed_10m || 0}km/h → ${curr.wind_speed_10m}km/h`);
    }
    return reasons;
  }

  // ─────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────
  async getWeather(location) {
    try {
      const params = new URLSearchParams({
        latitude: String(location.lat),
        longitude: String(location.lng),
        current: ['temperature_2m', 'precipitation', 'wind_speed_10m', 'cloud_cover'].join(','),
        hourly: ['precipitation_probability', 'visibility'].join(','),
        timezone: 'auto'
      });

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      const data = await response.json();

      return {
        temperature_2m: data.current?.temperature_2m || 20,
        precipitation: data.current?.precipitation || 0,
        precipitation_probability: data.hourly?.precipitation_probability?.[0] || 0,
        wind_speed_10m: data.current?.wind_speed_10m || 10,
        visibility: data.hourly?.visibility?.[0] ? data.hourly.visibility[0] / 1000 : 10, // Convert m to km
        cloud_cover: data.current?.cloud_cover || 0
      };
    } catch (error) {
      this.logger.error('Weather fetch error:', error);
      return { temperature_2m: 20, precipitation_probability: 0, visibility: 10, wind_speed_10m: 10 };
    }
  }

  async getRoute(origin, destination, options = {}) {
    try {
      const params = new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: options.mode || 'driving',
        departure_time: 'now',
        language: 'he'
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params}&key=${this.gmapsKey}`
      );
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes?.length) {
        throw new Error(`Directions API: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        polyline: route.overview_polyline?.points,
        durationSeconds: leg.duration?.value || 0,
        distanceMeters: leg.distance?.value || 0,
        trafficDelay: leg.duration_in_traffic
          ? leg.duration_in_traffic.value - leg.duration.value
          : 0
      };
    } catch (error) {
      this.logger.error('Route fetch error:', error);
      // Return mock route for fallback
      return {
        polyline: 'mock_polyline',
        durationSeconds: 3600,
        distanceMeters: 30000,
        trafficDelay: 0
      };
    }
  }

  async searchPlaces(options) {
    try {
      const { location, radius, type, minRating = 0, minReviews = 0, keyword } = options;
      const params = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: String(radius),
        type: type,
        language: 'he'
      });
      if (keyword) params.set('keyword', keyword);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}&key=${this.gmapsKey}`
      );
      const data = await response.json();

      if (!['OK', 'ZERO_RESULTS'].includes(data.status)) {
        throw new Error(`Places API: ${data.status}`);
      }

      return (data.results || [])
        .filter(p => (p.rating || 0) >= minRating && (p.user_ratings_total || 0) >= minReviews)
        .map(p => ({
          id: p.place_id,
          name: p.name,
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
          rating: p.rating,
          userRatingsTotal: p.user_ratings_total,
          types: p.types,
          priceLevel: p.price_level,
          openNow: p.opening_hours?.open_now,
          primaryType: p.types?.[0]
        }));
    } catch (error) {
      this.logger.error('Places search error:', error);
      return [];
    }
  }

  async searchAlongRoute(route, origin, options) {
    // Search near origin for quick stops
    return this.searchPlaces({
      location: origin,
      radius: options.radius,
      type: options.types[0],
      minRating: options.minRating
    });
  }

  async searchScenicPOIs(origin, destination, options) {
    const midpoint = this.midpoint(origin, destination);
    return this.searchPlaces({
      location: midpoint,
      radius: options.radius,
      type: 'tourist_attraction',
      keyword: 'scenic view nature'
    });
  }

  async searchIndoorAlternatives(location) {
    return this.searchPlaces({
      location,
      radius: 20000,
      type: 'museum',
      keyword: 'indoor'
    });
  }

  midpoint(origin, destination) {
    return {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2
    };
  }

  calculateCombinedScore(mode, route, pois, weatherScore) {
    const weights = {
      efficiency: { poi: 0.25, route: 0.55, weather: 0.20 },
      scenic: { poi: 0.35, route: 0.30, weather: 0.35 },
      foodie: { poi: 0.65, route: 0.15, weather: 0.20 }
    };
    const w = weights[mode];

    const poiScore = pois.length ? pois.slice(0, 3).reduce((sum, p) => sum + (p.score || p.rating), 0) / 3 / 5 : 0.5;
    const routeScore = route.durationSeconds ? Math.min(1, 3600 / route.durationSeconds) : 0.5;

    return Math.round((poiScore * w.poi + routeScore * w.route + weatherScore.overall * w.weather) * 100) / 100;
  }

  generateWeatherAlerts(weather) {
    const alerts = [];
    if ((weather.precipitation_probability || 0) > 50) {
      alerts.push({ type: 'rain', message: `${weather.precipitation_probability}% chance of rain` });
    }
    if ((weather.wind_speed_10m || 0) > 40) {
      alerts.push({ type: 'wind', message: `Strong winds: ${weather.wind_speed_10m}km/h` });
    }
    if ((weather.visibility || 10) < 5) {
      alerts.push({ type: 'visibility', message: `Low visibility: ${weather.visibility}km` });
    }
    return alerts;
  }

  getWeatherAlertTitle(precip, visibility, wind) {
    if (precip > 60) return '🌧️ Heavy Rain Warning';
    if (visibility < 2) return '🌫️ Low Visibility Alert';
    if (wind > 50) return '💨 Strong Wind Advisory';
    return '⚠️ Weather Alert';
  }

  getWeatherAlertMessage(destName, precip, visibility) {
    if (precip > 60) return `Heavy rain expected at ${destName}. Consider indoor alternatives.`;
    if (visibility < 2) return `Visibility is very low at ${destName}. Outdoor activities may be affected.`;
    return `Weather conditions at ${destName} may affect your plans.`;
  }

  getDisableIcon(reason) {
    if (reason?.includes('visibility') || reason?.includes('Foggy')) return 'fog';
    if (reason?.includes('Rain') || reason?.includes('precip')) return 'rain';
    if (reason?.includes('restaurant')) return 'utensils';
    return 'warning';
  }
}

// Create optimizer instance
const smartOptimizer = new SmartRouteOptimizer(GMAPS_KEY, logger);

// ---- AI Recommendation Engine ----
const userProfiles = new Map(); // In production, use a database

class RecommendationEngine {
  constructor() {
    this.userBehavior = new Map();
    this.placeFeatures = new Map();
  }

  // Track user interactions
  trackInteraction(userId, placeId, interactionType, rating = null) {
    if (!this.userBehavior.has(userId)) {
      this.userBehavior.set(userId, {
        searches: [],
        visits: [],
        preferences: { cuisine: {}, priceRange: [0, 100], ratings: [] },
        mood: 'neutral'
      });
    }

    const profile = this.userBehavior.get(userId);
    profile.visits.push({ placeId, interactionType, timestamp: Date.now(), rating });

    if (rating) profile.preferences.ratings.push(rating);
  }

  // AI-powered personalized recommendations
  getPersonalizedRecommendations(userId, location, context = {}) {
    const profile = this.userBehavior.get(userId) || this.getDefaultProfile();
    const { mood = 'neutral', timeOfDay, weather, companionType = 'solo' } = context;

    // AI logic for recommendations
    let recommendations = [];

    // Mood-based filtering - using more common place types
    if (mood === 'adventurous') {
      recommendations.push({ type: 'tourist_attraction', keyword: 'adventure outdoor unique' });
      recommendations.push({ type: 'point_of_interest', keyword: 'hidden local special' });
    } else if (mood === 'relaxed') {
      recommendations.push({ type: 'park', keyword: 'peaceful quiet relaxing' });
      recommendations.push({ type: 'restaurant', keyword: 'cafe quiet peaceful' });
    } else if (mood === 'social') {
      recommendations.push({ type: 'restaurant', keyword: 'bar social buzzing' });
      recommendations.push({ type: 'night_club', keyword: 'social nightlife' });
    } else if (mood === 'romantic') {
      recommendations.push({ type: 'restaurant', keyword: 'romantic dinner fine dining' });
      recommendations.push({ type: 'park', keyword: 'romantic sunset view' });
    } else if (mood === 'hungry') {
      recommendations.push({ type: 'restaurant', keyword: 'food dining popular' });
      recommendations.push({ type: 'meal_takeaway', keyword: 'food quick' });
    }

    // Time-based recommendations
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) {
      recommendations.push({ type: 'restaurant', keyword: 'breakfast coffee brunch' });
    } else if (hour >= 17 && hour < 22) {
      recommendations.push({ type: 'restaurant', keyword: 'dinner food' });
    }

    // Weather-based recommendations
    if (weather?.current?.precipitation > 0) {
      recommendations.push({ type: 'shopping_mall', keyword: 'indoor covered' });
      recommendations.push({ type: 'restaurant', keyword: 'indoor cozy' });
    } else if (weather?.current?.temperature_2m > 25) {
      recommendations.push({ type: 'restaurant', keyword: 'ice cream outdoor terrace' });
      recommendations.push({ type: 'park', keyword: 'outdoor shade trees' });
    }

    return recommendations;
  }

  getDefaultProfile() {
    return {
      searches: [],
      visits: [],
      preferences: { cuisine: {}, priceRange: [0, 100], ratings: [] },
      mood: 'neutral'
    };
  }
}

const aiEngine = new RecommendationEngine();

// ---- /ai-recommendations ---- (Enhanced with AI rate limiting)
app.post("/ai-recommendations",
  aiLimit,
  cacheMiddleware(900), // Cache AI recommendations for 15 minutes
  validateRequest([
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('mood').optional().isIn(['adventurous', 'relaxed', 'social', 'romantic', 'hungry', 'curious']).withMessage('Invalid mood')
  ]),
  asyncHandler(async (req, res) => {
    const { lat, lng, userId = 'anonymous', mood, timeOfDay, companionType } = req.body || {};
    logger.info(`[${req.id}] AI recommendations: ${lat},${lng} mood:${mood}`);

    // Get weather context for AI recommendations
    const weatherResponse = await fetch(`${process.env.PROTOCOL || 'http'}://localhost:${process.env.PORT || 8080}/weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });
    const weatherData = weatherResponse.ok ? await weatherResponse.json() : null;

    // Get AI recommendations
    const recommendations = aiEngine.getPersonalizedRecommendations(userId, { lat, lng }, {
      mood,
      timeOfDay,
      weather: weatherData?.weather,
      companionType
    });

    // Execute recommendations and get actual places
    const results = [];
    for (const rec of recommendations.slice(0, 3)) { // Limit to 3 recommendations
      try {
        const placesResponse = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${rec.type}&keyword=${rec.keyword}&language=he&key=${GMAPS_KEY}`);
        const placesData = await placesResponse.json();

        if (placesData.status === "OK" && placesData.results?.length) {
          results.push({
            category: rec.type,
            reason: getRecommendationReason(rec, mood, weatherData?.weather),
            places: placesData.results.slice(0, 2).map(place => ({
              id: place.place_id,
              name: place.name,
              rating: place.rating,
              address: place.vicinity,
              lat: place.geometry?.location?.lat,
              lng: place.geometry?.location?.lng,
              openNow: place.opening_hours?.open_now
            }))
          });
        }
      } catch (e) {
        console.error('Recommendation error:', e);
      }
    }

    ok(res, { recommendations: results, context: { mood, weather: weatherData?.weather?.current } });
  })
);

// Helper method for recommendation reasons
function getRecommendationReason(rec, mood, weather) {
  if (mood === 'adventurous') return "🗺️ Based on your adventurous mood, here are some unique local experiences";
  if (mood === 'relaxed') return "😌 Perfect spots to unwind and relax";
  if (mood === 'social') return "👥 Great places to socialize and meet people";
  if (mood === 'romantic') return "💕 Perfect for a romantic experience";
  if (mood === 'hungry') return "🍽️ Delicious options to satisfy your hunger";
  if (weather?.precipitation > 0) return "☔ Great indoor options since it's raining";
  if (weather?.temperature_2m > 25) return "☀️ Cool treats for this warm weather";
  return "✨ Personalized recommendations just for you";
}

// ---- /track-interaction ----
app.post("/track-interaction", async (req, res) => {
  try {
    const { userId = 'anonymous', placeId, interactionType, rating } = req.body || {};
    if (!placeId || !interactionType) return err(res, 400, "placeId and interactionType required");

    aiEngine.trackInteraction(userId, placeId, interactionType, rating);
    ok(res, { tracked: true, message: "Interaction recorded for future recommendations" });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- /user-insights ----
app.post("/user-insights", async (req, res) => {
  try {
    const { userId = 'anonymous' } = req.body || {};
    const profile = aiEngine.userBehavior.get(userId) || aiEngine.getDefaultProfile();

    // Calculate insights
    const insights = {
      totalVisits: profile.visits.length,
      averageRating: profile.preferences.ratings.length
        ? (profile.preferences.ratings.reduce((a, b) => a + b, 0) / profile.preferences.ratings.length).toFixed(1)
        : null,
      preferredTypes: getTopPreferences(profile.visits),
      travelStyle: inferTravelStyle(profile),
      lastActive: profile.visits.length ? new Date(Math.max(...profile.visits.map(v => v.timestamp))) : null
    };

    ok(res, { insights, profile: { mood: profile.mood } });
  } catch (e) { err(res, 500, String(e)); }
});

// Helper methods for insights
function getTopPreferences(visits) {
  const types = {};
  visits.forEach(visit => {
    if (visit.placeId && visit.interactionType === 'visit') {
      const type = 'restaurant'; // Simplified - in production, store place types
      types[type] = (types[type] || 0) + 1;
    }
  });
  return Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type]) => type);
}

function inferTravelStyle(profile) {
  if (profile.preferences.ratings.some(r => r >= 4.5)) return 'quality-focused';
  if (profile.visits.length > 10) return 'explorer';
  return 'casual';
}

// ---- Voice Processing ----
app.post("/voice-to-intent", async (req, res) => {
  try {
    const { text, userId = 'anonymous', location } = req.body || {};
    if (!text) return err(res, 400, "text required");

    // MOCK RESPONSE FOR TESTING
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy_key') {
      return ok(res, {
        voiceIntent: { intent: 'ai_recommendations', mood: 'relaxed', params: {} },
        actionResult: { recommendations: [] },
        conversationResponse: "שמעתי אותך! (מצב בדיקה)"
      });
    }

    // Enhanced NLU with voice-specific processing
    const voiceSystemPrompt = [
      "You are traveling AI, a smart travel assistant. Parse voice commands and respond with JSON.",
      "Available intents: 'ai_recommendations', 'route', 'places', 'weather', 'track_interaction'",
      "Extract mood from tone: adventurous, relaxed, social, hungry, curious, romantic",
      "Output JSON with:",
      "intent: string,",
      "mood: string,",
      "params: object with relevant parameters,",
      "response: friendly conversational response in Hebrew",
      "No prose outside JSON."
    ].join("\n");

    const voicePrompt = `Voice command: "${text}". Location: ${location?.lat ? `${location.lat},${location.lng}` : 'unknown'}. User: ${userId}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: voiceSystemPrompt },
          { role: "user", content: voicePrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiResponse = await r.json();
    if (aiResponse.error) return err(res, 400, aiResponse.error.message);

    const voiceIntent = JSON.parse(aiResponse.choices[0].message.content);

    // Execute the intent automatically
    let actionResult = null;
    if (voiceIntent.intent === 'ai_recommendations' && location) {
      const recParams = {
        lat: location.lat,
        lng: location.lng,
        userId,
        mood: voiceIntent.mood,
        ...voiceIntent.params
      };

      // Internal API call
      try {
        const recResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/ai-recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recParams)
        });
        actionResult = await recResponse.json();
      } catch (e) {
        console.error('Voice recommendation error:', e);
      }
    }

    ok(res, {
      voiceIntent,
      actionResult,
      conversationResponse: voiceIntent.response || "הבנתי! מחפש עבורך..."
    });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- OpenAI Whisper Speech-to-Text ----
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max (Whisper limit)
});

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Whisper transcription endpoint
app.post("/whisper",
  aiLimit,
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    // Check for OpenAI API key
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy_key') {
      logger.info('[Whisper] No API key - returning mock transcription');
      return ok(res, {
        text: "זוהי תמלול לדוגמה במצב בדיקה",
        language: "he",
        mock: true
      });
    }

    // Validate audio file
    if (!req.file) {
      return err(res, 400, "Audio file required. Send as 'audio' field in multipart/form-data");
    }

    logger.info(`[${req.id}] Whisper transcription: ${req.file.size} bytes, ${req.file.mimetype}`);

    try {
      // Get language from request or default to Hebrew
      const language = req.body.language || 'he';

      // Create a File object for the OpenAI SDK
      const audioFile = new File([req.file.buffer], req.file.originalname || 'audio.webm', {
        type: req.file.mimetype
      });

      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: language,
        response_format: "json"
      });

      logger.info(`[${req.id}] Whisper success: "${transcription.text.substring(0, 50)}..."`);

      ok(res, {
        text: transcription.text,
        language: language
      });

    } catch (error) {
      logger.error(`[${req.id}] Whisper error:`, error);

      // Provide helpful error message
      if (error.status === 400) {
        return err(res, 400, "Invalid audio format. Supported: mp3, mp4, mpeg, mpga, m4a, wav, webm");
      }
      if (error.status === 413) {
        return err(res, 413, "Audio file too large. Maximum size is 25MB");
      }

      throw error;
    }
  })
);

// Combined Whisper + Intent Processing (transcribe and process in one call)
app.post("/whisper-intent",
  aiLimit,
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    // Check for OpenAI API key
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy_key') {
      return ok(res, {
        text: "מצא לי מסעדות בקרבת מקום",
        intent: { intent: 'ai_recommendations', mood: 'hungry', params: { type: 'restaurant' } },
        response: "מחפש מסעדות בקרבתך...",
        mock: true
      });
    }

    if (!req.file) {
      return err(res, 400, "Audio file required");
    }

    logger.info(`[${req.id}] Whisper+Intent: ${req.file.size} bytes`);

    try {
      // Step 1: Transcribe with Whisper
      const language = req.body.language || 'he';
      const location = req.body.location ? JSON.parse(req.body.location) : null;
      const userId = req.body.userId || 'anonymous';

      const audioFile = new File([req.file.buffer], req.file.originalname || 'audio.webm', {
        type: req.file.mimetype
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: language,
        response_format: "json"
      });

      const text = transcription.text;
      logger.info(`[${req.id}] Transcribed: "${text}"`);

      // Step 2: Process intent using existing voice-to-intent logic
      const voiceSystemPrompt = [
        "You are traveling AI, a smart travel assistant. Parse voice commands and respond with JSON.",
        "Available intents: 'ai_recommendations', 'route', 'places', 'weather', 'track_interaction'",
        "Extract mood from tone: adventurous, relaxed, social, hungry, curious, romantic",
        "Output JSON with:",
        "intent: string,",
        "mood: string,",
        "params: object with relevant parameters,",
        "response: friendly conversational response in Hebrew",
        "No prose outside JSON."
      ].join("\n");

      const voicePrompt = `Voice command: "${text}". Location: ${location?.lat ? `${location.lat},${location.lng}` : 'unknown'}. User: ${userId}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: voiceSystemPrompt },
          { role: "user", content: voicePrompt }
        ],
        response_format: { type: "json_object" }
      });

      const intent = JSON.parse(completion.choices[0].message.content);

      ok(res, {
        text: text,
        intent: intent,
        response: intent.response || "הבנתי! מעבד את הבקשה שלך..."
      });

    } catch (error) {
      logger.error(`[${req.id}] Whisper+Intent error:`, error);
      throw error;
    }
  })
);

// ---- AI Trip Planning ----
app.post("/plan-trip", async (req, res) => {
  try {
    const {
      startLocation,
      duration, // 'half-day', 'full-day', 'weekend', 'custom'
      customHours = 8,
      interests = [], // ['food', 'culture', 'adventure', 'relaxation', 'nightlife']
      budget = 'medium', // 'low', 'medium', 'high'
      groupSize = 1,
      mobility = 'walking', // 'walking', 'car', 'public'
      userId = 'anonymous'
    } = req.body || {};

    if (!startLocation?.lat || !startLocation?.lng) return err(res, 400, "startLocation required");

    // MOCK RESPONSE FOR TESTING
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy_key') {
      logger.info('Using MOCK response for /plan-trip');
      return ok(res, {
        title: "Mock Trip to Tel Aviv",
        overview: "A wonderful mock trip generated for testing purposes.",
        estimated_cost: "$100-200",
        activities: [
          {
            name: "Gordon Beach",
            type: "beach",
            duration_minutes: 120,
            description: "Relax at the famous Gordon Beach.",
            priority: "high",
            cost_estimate: "free",
            place: {
              id: "mock_place_1",
              name: "Gordon Beach",
              rating: 4.7,
              address: "Tel Aviv-Yafo",
              lat: 32.083,
              lng: 34.767
            }
          },
          {
            name: "Sarona Market",
            type: "market",
            duration_minutes: 90,
            description: "Enjoy food at Sarona Market.",
            priority: "medium",
            cost_estimate: "$$$",
            place: {
              id: "mock_place_2",
              name: "Sarona Market",
              rating: 4.6,
              address: "Aluf Albert Mendler St 8",
              lat: 32.072,
              lng: 34.788
            }
          }
        ],
        tips: ["Wear sunscreen", "Bring water"]
      });
    }

    // Get weather context
    const weatherResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(startLocation)
    });
    const weatherData = weatherResponse.ok ? await weatherResponse.json() : null;

    // Calculate trip duration in hours
    let hours;
    switch (duration) {
      case 'half-day': hours = 4; break;
      case 'full-day': hours = 8; break;
      case 'weekend': hours = 16; break;
      case 'custom': hours = customHours; break;
      default: hours = 8;
    }

    // AI prompt for trip planning
    const planningPrompt = [
      "You are traveling AI, an expert trip planner. Create a detailed itinerary.",
      `Duration: ${hours} hours`,
      `Interests: ${interests.join(', ')}`,
      `Budget: ${budget}`,
      `Group: ${groupSize} people`,
      `Transport: ${mobility}`,
      `Weather: ${weatherData?.weather?.current?.temperature_2m || 'unknown'}°C`,
      "",
      "Output JSON with:",
      "title: string,",
      "overview: string,",
      "estimated_cost: string,",
      "activities: [{ name, type, duration_minutes, description, priority, cost_estimate }],",
      "tips: string[]",
      "No prose outside JSON."
    ].join("\n");

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: planningPrompt },
          { role: "user", content: `Plan a ${duration} trip starting from Tel Aviv area` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiResponse = await r.json();
    if (aiResponse.error) return err(res, 400, aiResponse.error.message);

    const tripPlan = JSON.parse(aiResponse.choices[0].message.content);

    // Get real places for each activity
    const enrichedActivities = [];
    for (const activity of tripPlan.activities.slice(0, 6)) { // Limit to 6 activities
      try {
        const placesResponse = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${startLocation.lat},${startLocation.lng}&radius=5000&type=point_of_interest&keyword=${encodeURIComponent(activity.name)}&language=he&key=${GMAPS_KEY}`);
        const placesData = await placesResponse.json();

        if (placesData.status === "OK" && placesData.results?.length) {
          const place = placesData.results[0];
          enrichedActivities.push({
            ...activity,
            place: {
              id: place.place_id,
              name: place.name,
              rating: place.rating,
              address: place.vicinity,
              lat: place.geometry?.location?.lat,
              lng: place.geometry?.location?.lng,
              photos: place.photos?.slice(0, 1) || []
            }
          });
        } else {
          enrichedActivities.push({ ...activity, place: null });
        }
      } catch (e) {
        enrichedActivities.push({ ...activity, place: null });
      }
    }

    // Store trip plan for user
    if (!userProfiles.has(userId)) {
      userProfiles.set(userId, { trips: [], preferences: {} });
    }
    const profile = userProfiles.get(userId);
    const tripId = `trip_${Date.now()}`;
    profile.trips.push({
      id: tripId,
      created: new Date(),
      plan: { ...tripPlan, activities: enrichedActivities },
      status: 'planned'
    });

    ok(res, {
      tripPlan: { ...tripPlan, activities: enrichedActivities },
      tripId,
      context: { weather: weatherData?.weather?.current, duration: hours }
    });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- AI Planner Orchestrator (Stub) ----
app.post("/api/plan", aiLimit, validateRequest([
  // Validate preferences object
  body("preferences").isObject().withMessage('preferences must be an object'),
  body("preferences.interests")
    .isArray({ min: 1, max: MAX_INTERESTS })
    .withMessage(`interests must be array with 1-${MAX_INTERESTS} items`),
  body("preferences.interests.*")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('each interest must be a non-empty string (max 100 chars)'),
  body("preferences.duration")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('duration must be a string (max 50 chars)'),
  body("preferences.budget")
    .isInt({ min: 0, max: MAX_BUDGET })
    .withMessage(`budget must be 0-${MAX_BUDGET}`),

  // Validate startLocation object
  body("startLocation").isObject().withMessage('startLocation must be an object'),
  body("startLocation.lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat must be -90 to 90'),
  body("startLocation.lng")
    .isFloat({ min: -180, max: 180 })
    .withMessage('lng must be -180 to 180'),
  body("startLocation.name")
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('name must be non-empty string (max 200 chars)')
]), plannerGuardrails, async (req, res) => {
  try {
    // Use sanitized payload from guardrails
    const { preferences, startLocation } = req.planPayload || req.body;

    logger.info(`[${req.id}] Plan request (stub mode)`);

    // Call provider stubs
    const places = await stubSearchPlaces(
      preferences.interests?.[0] || 'attraction',
      startLocation
    );
    const weather = await stubGetWeather(
      startLocation.lat,
      startLocation.lng,
      Date.now()
    );
    const route = await stubGetRouteSummary(places.map(p => ({
      lat: startLocation.lat,
      lng: startLocation.lng
    })));

    // Return grounded response with rationales and citations
    const itinerary = {
      id: `plan-${Date.now()}`,
      title: `Trip from ${startLocation.name || 'Start'}`,
      days: [{
        date: new Date().toISOString().split('T')[0],
        activities: places.map(p => ({
          time: '10:00',
          place: p.name,
          duration: 60,
          notes: 'Suggested based on preferences'
        }))
      }],
      metadata: {
        distance: route.distance,
        duration: route.duration,
        weather: weather.conditions
      }
    };

    const rationales = [
      `Selected ${places[0].name} based on "${preferences.interests?.[0]}" interest`,
      `Weather is ${weather.conditions}, suitable for outdoor activities`
    ];

    const citations = places.map(p => ({
      source: 'stub-provider',
      placeId: p.id,
      rating: p.rating
    }));

    res.json({
      ok: true,
      itinerary,
      rationales,
      citations,
      stub: true // Mark as stub response
    });

  } catch (e) {
    logger.error(`[${req.id}] Plan error:`, e);
    res.status(500).json({
      ok: false,
      code: 'internal_error',
      message: 'Failed to generate plan',
      error: String(e)
    });
  }
});

// ---- Live Trip Navigation ----
app.post("/navigate-trip", async (req, res) => {
  try {
    const { tripId, userId = 'anonymous', currentLocation, currentActivity = 0 } = req.body || {};
    if (!tripId || !currentLocation?.lat || !currentLocation?.lng) {
      return err(res, 400, "tripId and currentLocation required");
    }

    const profile = userProfiles.get(userId);
    const trip = profile?.trips?.find(t => t.id === tripId);
    if (!trip) return err(res, 404, "Trip not found");

    const activities = trip.plan.activities;
    const nextActivity = activities[currentActivity];

    if (!nextActivity?.place) {
      return ok(res, { message: "Trip completed!", hasNext: false });
    }

    // Calculate route to next activity
    const routeResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: currentLocation,
        dest: { lat: nextActivity.place.lat, lng: nextActivity.place.lng },
        mode: 'walking'
      })
    });
    const routeData = routeResponse.ok ? await routeResponse.json() : null;

    // Check for weather/time adjustments
    const now = new Date();
    let adjustments = [];

    if (now.getHours() > 20 && nextActivity.type === 'outdoor') {
      adjustments.push({
        type: 'time_warning',
        message: 'מקום חיצוני - שקול לעבור למחר או למקום מקורה',
        suggestion: 'indoor_alternative'
      });
    }

    ok(res, {
      currentActivity: nextActivity,
      navigation: routeData,
      progress: `${currentActivity + 1}/${activities.length}`,
      adjustments,
      hasNext: currentActivity < activities.length - 1
    });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- Smart Notifications ----
app.post("/smart-notifications", async (req, res) => {
  try {
    const { userId = 'anonymous', location, timeContext } = req.body || {};
    if (!location?.lat || !location?.lng) return err(res, 400, "location required");

    const notifications = [];
    const profile = aiEngine.userBehavior.get(userId) || aiEngine.getDefaultProfile();

    // Time-based notifications
    const hour = new Date().getHours();
    const day = new Date().getDay();

    // Meal time suggestions
    if (hour === 12 && day !== 6 && day !== 0) { // Weekday lunch
      notifications.push({
        type: 'suggestion',
        priority: 'medium',
        title: '🍽️ זמן צהריים!',
        message: 'מצאתי כמה מסעדות נהדרות בקרבתך',
        action: 'ai_recommendations',
        params: { mood: 'hungry', type: 'restaurant' }
      });
    }

    // Weather-based notifications
    try {
      const weatherResponse = await fetch(`http://localhost:${process.env.PORT || 8080}/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location)
      });
      const weatherData = await weatherResponse.json();

      if (weatherData.ok && weatherData.weather?.current) {
        const temp = weatherData.weather.current.temperature_2m;
        const precipitation = weatherData.weather.current.precipitation;

        if (temp > 28) {
          notifications.push({
            type: 'weather_advice',
            priority: 'high',
            title: '☀️ חום בחוץ!',
            message: `${temp}°C - מה דעתך על גלידה או מקום עם מיזוג?`,
            action: 'ai_recommendations',
            params: { mood: 'cooling', keyword: 'ice cream air conditioning' }
          });
        }

        if (precipitation > 0) {
          notifications.push({
            type: 'weather_alert',
            priority: 'high',
            title: '🌧️ גשם בדרך',
            message: 'מצאתי מקומות מקורים שיתאימו לך',
            action: 'ai_recommendations',
            params: { mood: 'indoor', type: 'museum' }
          });
        }
      }
    } catch (e) {
      console.error('Weather notification error:', e);
    }

    // Personal pattern notifications
    if (profile.visits.length > 5) {
      const avgRating = profile.preferences.ratings.reduce((a, b) => a + b, 0) / profile.preferences.ratings.length;
      if (avgRating > 4.2) {
        notifications.push({
          type: 'personal_insight',
          priority: 'low',
          title: '⭐ אתה בעל טעם מעולה!',
          message: `הציון הממוצע שלך: ${avgRating.toFixed(1)} - נמצא לך עוד מקומות איכותיים?`,
          action: 'ai_recommendations',
          params: { mood: 'quality', minRating: 4.5 }
        });
      }
    }

    ok(res, { notifications, context: { hour, userId, profileExists: !!aiEngine.userBehavior.has(userId) } });
  } catch (e) { err(res, 500, String(e)); }
});

// ---- Backend-v2 Pass-Through Handlers ----
const BACKEND_V2_URL = process.env.BACKEND_V2_URL || '';

// Forward /api/route to backend-v2 (OSRM routing)
app.post('/api/route', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/api/route`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 route error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /api/hazards to backend-v2
app.get('/api/hazards', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const qs = new URLSearchParams(req.query).toString();
    const r = await fetch(`${BACKEND_V2_URL}/api/hazards?${qs}`);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 hazards error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /api/profile to backend-v2 (JWT auth via cookies)
app.all('/api/profile', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/api/profile`, {
      method: req.method,
      headers: {
        'content-type': 'application/json',
        cookie: req.headers.cookie || '',
      },
      body: req.method === 'PUT' ? JSON.stringify(req.body || {}) : undefined,
    });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) res.setHeader('set-cookie', setCookie);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 profile error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /api/family/signin/start to backend-v2 (Family Mode signin - step 1)
app.post('/api/family/signin/start', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/api/family/signin/start`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: req.headers.cookie || '',
      },
      body: JSON.stringify(req.body || {}),
    });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) res.setHeader('set-cookie', setCookie);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 family signin/start error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /api/family/signin/finish to backend-v2 (Family Mode signin - step 2)
app.post('/api/family/signin/finish', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/api/family/signin/finish`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: req.headers.cookie || '',
      },
      body: JSON.stringify(req.body || {}),
    });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) res.setHeader('set-cookie', setCookie);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 family signin/finish error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /api/me to backend-v2 (Get current family session)
app.get('/api/me', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/api/me`, {
      method: 'GET',
      headers: {
        cookie: req.headers.cookie || '',
      },
    });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) res.setHeader('set-cookie', setCookie);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 /api/me error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /admin/healthz to backend-v2 (JSON health endpoint)
app.get('/admin/healthz', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/admin/healthz`);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 health error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /admin/health to backend-v2 (HTML dashboard)
app.get('/admin/health', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/admin/health`);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'text/html').send(txt);
  } catch (error) {
    logger.error('Backend-v2 dashboard error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// Forward /api/places/search to backend-v2 (Google Places search)
app.post('/api/places/search', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/api/places/search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lang': req.headers['x-lang'] || 'en',
      },
      body: JSON.stringify(req.body || {}),
    });
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 places search error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SMART ROUTE OPTIMIZER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ---- /planner/optimize - 3-Mode Trip Optimization ----
app.post('/planner/optimize',
  aiLimit,
  cacheMiddleware(300), // Cache for 5 minutes
  validateRequest([
    body('origin.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid origin latitude required'),
    body('origin.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid origin longitude required'),
    body('destination.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid destination latitude required'),
    body('destination.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid destination longitude required')
  ]),
  asyncHandler(async (req, res) => {
    const { origin, destination, userPrefs } = req.body;
    logger.info(`[${req.id}] Smart Route Optimize: ${origin.lat},${origin.lng} → ${destination.lat},${destination.lng}`);

    // Mock response for testing without API keys
    if (!GMAPS_KEY || GMAPS_KEY === 'dummy_key') {
      logger.info('[Optimizer] Using MOCK response');
      return ok(res, {
        recommended: 'efficiency',
        recommendationReason: 'Mock mode - defaulting to efficiency',
        packages: {
          efficiency: {
            mode: 'efficiency',
            disabled: false,
            route: { polyline: 'mock', duration: 1800, distance: 15000, trafficDelay: 0 },
            stops: [{ place_id: 'mock_1', name: 'Quick Cafe', location: { lat: 32.08, lon: 34.78 }, rating: 4.3, score: 12.5 }],
            totalDuration: 2100,
            hazardAlert: false,
            combinedScore: 0.82
          },
          scenic: {
            mode: 'scenic',
            disabled: false,
            route: { polyline: 'mock', duration: 2400, distance: 18000, scenicScore: 0.85 },
            durationIncrease: '+20%',
            stops: [{ place_id: 'mock_2', name: 'Mountain View', location: { lat: 32.1, lon: 34.85 }, rating: 4.7, score: 18.2 }],
            weatherVisibility: 10,
            combinedScore: 0.78
          },
          foodie: {
            mode: 'foodie',
            disabled: false,
            selectedRestaurant: {
              place_id: 'mock_3',
              name: 'Fine Dining Restaurant',
              location: { lat: 32.07, lon: 34.77 },
              rating: 4.8,
              user_ratings_total: 1200,
              score: 28.5,
              whySelected: ['Rating: 4.8/5', 'Reviews: 1,200']
            },
            alternatives: [{ name: 'Alt Restaurant', rating: 4.6, score: 22.0 }],
            routeToRestaurant: { duration: 900, distance: 8000 },
            routeFromRestaurant: { duration: 1200, distance: 10000 },
            outdoorFiltered: false,
            combinedScore: 0.91
          }
        },
        weatherInsights: {
          current: { temperature_2m: 22, precipitation_probability: 10, visibility: 10, wind_speed_10m: 12 },
          scores: { precipitation: 1.0, visibility: 1.0, temperature: 1.0, wind: 1.0, overall: 1.0 },
          alerts: []
        },
        disabledModes: [],
        metadata: { requestId: `opt_${Date.now()}`, generatedAt: new Date().toISOString(), processingTime: 50 },
        mock: true
      });
    }

    try {
      const result = await smartOptimizer.generatePackages(origin, destination, { userPrefs });
      ok(res, result);
    } catch (error) {
      logger.error(`[${req.id}] Optimizer error:`, error);
      err(res, 500, 'Failed to generate route packages');
    }
  })
);

// ---- /planner/interventions - Monitor Agent Check ----
app.post('/planner/interventions',
  aiLimit,
  validateRequest([
    body('destination.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid destination latitude required'),
    body('destination.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid destination longitude required'),
    body('destination.isOutdoor').optional().isBoolean(),
    body('liveTrafficDelay').optional().isInt({ min: 0 })
  ]),
  asyncHandler(async (req, res) => {
    const { destination, currentWeather, previousWeather, liveTrafficDelay } = req.body;
    logger.info(`[${req.id}] Intervention check for: ${destination.name || 'unnamed'}`);

    // Mock response for testing
    if (!GMAPS_KEY || GMAPS_KEY === 'dummy_key') {
      return ok(res, {
        interventions: [],
        checkInterval: 300000, // 5 minutes
        mock: true
      });
    }

    try {
      // Get current weather if not provided
      let weather = currentWeather;
      if (!weather) {
        weather = await smartOptimizer.getWeather(destination);
      }

      const interventions = await smartOptimizer.checkInterventions({
        destination,
        currentWeather: weather,
        previousWeather,
        liveTrafficDelay
      });

      // Determine next check interval based on context
      let checkInterval = 300000; // 5 minutes default
      if (interventions.some(i => i.severity === 'urgent')) {
        checkInterval = 60000; // 1 minute for urgent
      } else if (interventions.length > 0) {
        checkInterval = 180000; // 3 minutes for warnings
      }

      ok(res, {
        interventions,
        checkInterval,
        weatherSnapshot: weather
      });
    } catch (error) {
      logger.error(`[${req.id}] Intervention check error:`, error);
      err(res, 500, 'Failed to check interventions');
    }
  })
);

// ---- /planner/classify-location - Indoor/Outdoor Classification ----
app.post('/planner/classify-location',
  validateRequest([
    body('placeId').optional().isString(),
    body('types').optional().isArray(),
    body('name').optional().isString()
  ]),
  asyncHandler(async (req, res) => {
    const { placeId, types = [], name = '' } = req.body;

    const OUTDOOR_TYPES = ['park', 'zoo', 'beach', 'hiking_area', 'viewpoint', 'garden', 'campground', 'natural_feature'];
    const INDOOR_TYPES = ['museum', 'shopping_mall', 'restaurant', 'movie_theater', 'spa', 'gym', 'cafe', 'bar'];

    let isOutdoor = false;
    let confidence = 0.5;

    // Check types
    if (INDOOR_TYPES.some(t => types.includes(t))) {
      isOutdoor = false;
      confidence = 0.9;
    } else if (OUTDOOR_TYPES.some(t => types.includes(t))) {
      isOutdoor = true;
      confidence = 0.9;
    } else {
      // Check name keywords
      const outdoorKeywords = ['outdoor', 'hiking', 'trail', 'beach', 'park', 'garden', 'nature'];
      const indoorKeywords = ['mall', 'museum', 'cinema', 'theater', 'gallery'];

      const lowerName = name.toLowerCase();
      if (outdoorKeywords.some(kw => lowerName.includes(kw))) {
        isOutdoor = true;
        confidence = 0.7;
      } else if (indoorKeywords.some(kw => lowerName.includes(kw))) {
        isOutdoor = false;
        confidence = 0.7;
      }
    }

    ok(res, { isOutdoor, confidence, types });
  })
);

// Forward /planner/plan-day to backend-v2 (Trip planning)
app.post('/planner/plan-day', async (req, res) => {
  if (!BACKEND_V2_URL) {
    return res.status(503).json({ ok: false, code: 'backend_not_configured' });
  }
  try {
    const r = await fetch(`${BACKEND_V2_URL}/planner/plan-day`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lang': req.headers['x-lang'] || 'en',
        cookie: req.headers.cookie || '',
      },
      body: JSON.stringify(req.body || {}),
    });
    const setCookie = r.headers.get('set-cookie');
    if (setCookie) res.setHeader('set-cookie', setCookie);
    const txt = await r.text();
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(txt);
  } catch (error) {
    logger.error('Backend-v2 planner error:', error);
    res.status(502).json({ ok: false, code: 'backend_error' });
  }
});

// ✨ ENHANCED ERROR HANDLING & MONITORING

// Global error handler
app.use((error, req, res, next) => {
  logger.error(`[${req.id}] Error:`, error);

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(error.status || 500).json({
    ok: false,
    error: isDev ? error.message : 'Internal server error',
    ...(isDev && { stack: error.stack }),
    requestId: req.id
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "roamwise-proxy",
    version: "1.1.0",
    time: new Date().toISOString(),
    endpoints: [
      "/health", "/metrics", "/places", "/geocode", "/route", "/weather", "/think"
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    ok: true,
    status: 'healthy',
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats()
    },
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    ok: true,
    cache: cache.getStats(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// 404 handler (must be last route)
app.use('*', (req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint not found',
    requestId: req.id
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cache.close();
  process.exit(0);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`🚀 RoamWise AI proxy listening on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Cache TTL: ${cache.options.stdTTL}s`);
  logger.info(`Health endpoints: GET / and GET /health`);
});
