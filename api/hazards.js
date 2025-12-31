/**
 * Hazards API - Weather and Traffic Hazards
 * GET /api/hazards?lat=&lon=&radius=
 */

import { handleCors } from './_lib/cors.js';

// Configuration from environment
const WEATHER_URL = process.env.HAZ_WEATHER_URL || '';
const TRAFFIC_URL = process.env.HAZ_TRAFFIC_URL || '';
const CACHE_TTL_MS = Number(process.env.HAZ_CACHE_TTL_MS) || 5 * 60 * 1000;
const TIMEOUT_MS = Number(process.env.HAZ_TIMEOUT_MS) || 10000;

// Simple in-memory cache for serverless (per-instance)
const cache = new Map();
let cacheTime = 0;

/**
 * Haversine distance calculation (meters)
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch weather hazards
 */
async function fetchWeather(lat, lon) {
  if (!WEATHER_URL) {
    // Return mock data if no weather URL configured
    return [
      {
        type: 'weather',
        severity: 'info',
        title: 'Sunny conditions',
        description: 'Clear skies expected',
        lat,
        lon,
        validUntil: new Date(Date.now() + 3600000).toISOString(),
      },
    ];
  }

  try {
    const url = `${WEATHER_URL}?lat=${lat}&lon=${lon}`;
    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!response.ok) throw new Error(`Weather API: ${response.status}`);
    const data = await response.json();
    return data.hazards || [];
  } catch (error) {
    console.error('[Hazards] Weather fetch failed:', error.message);
    return [];
  }
}

/**
 * Fetch traffic hazards
 */
async function fetchTraffic(lat, lon, radius) {
  if (!TRAFFIC_URL) {
    // Return mock data if no traffic URL configured
    return [
      {
        type: 'traffic',
        severity: 'info',
        title: 'Normal traffic',
        description: 'No significant delays',
        lat: lat + 0.01,
        lon: lon + 0.01,
        validUntil: new Date(Date.now() + 1800000).toISOString(),
      },
    ];
  }

  try {
    const url = `${TRAFFIC_URL}?lat=${lat}&lon=${lon}&radius=${radius}`;
    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!response.ok) throw new Error(`Traffic API: ${response.status}`);
    const data = await response.json();
    return data.hazards || [];
  } catch (error) {
    console.error('[Hazards] Traffic fetch failed:', error.message);
    return [];
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse query parameters
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radius = parseFloat(req.query.radius) || 10000;

  // Validate parameters
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({
      error: 'Invalid coordinates',
      message: 'lat and lon must be valid numbers',
    });
  }

  try {
    // Check cache
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
    const now = Date.now();

    if (cache.has(cacheKey) && now - cacheTime < CACHE_TTL_MS) {
      return res.json(cache.get(cacheKey));
    }

    // Fetch hazards in parallel
    const [weather, traffic] = await Promise.all([
      fetchWeather(lat, lon),
      fetchTraffic(lat, lon, radius),
    ]);

    // Combine and filter by radius
    const allHazards = [...weather, ...traffic].filter((h) => {
      if (!h.lat || !h.lon) return true; // Include if no location
      return haversine(lat, lon, h.lat, h.lon) <= radius;
    });

    const result = {
      ok: true,
      count: allHazards.length,
      hazards: allHazards,
      fetchedAt: new Date().toISOString(),
    };

    // Update cache
    cache.set(cacheKey, result);
    cacheTime = now;

    res.json(result);
  } catch (error) {
    console.error('[Hazards] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
