/**
 * Route API - Compute routes using OSRM/ORS
 * POST /api/route
 */

import { handleCors } from './_lib/cors.js';

// Configuration from environment
const OSRM_URL = process.env.OSRM_URL || 'http://router.project-osrm.org';
const ORS_URL = process.env.ORS_URL || 'https://api.openrouteservice.org';
const ORS_API_KEY = process.env.ORS_API_KEY || '';
const TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS) || 12000;

// Map user-friendly avoid terms to OSRM exclude classes
const AVOID_MAP = {
  tolls: 'toll',
  ferries: 'ferry',
  highways: 'motorway',
};

// Map user-friendly avoid terms to ORS avoid features
const ORS_AVOID_MAP = {
  tolls: 'tollways',
  ferries: 'ferries',
  highways: 'highways',
};

/**
 * Call OSRM with timeout
 */
async function callOsrm(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, status: response.status, body };
    }

    const json = await response.json();
    return { ok: true, json };
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, error: error.name === 'AbortError' ? 'timeout' : String(error) };
  }
}

/**
 * Call OpenRouteService with timeout
 */
async function callORS(stops, avoidArr, timeoutMs) {
  if (!ORS_API_KEY) {
    return { ok: false, error: 'ORS not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const avoidFeatures = avoidArr
    .map((term) => ORS_AVOID_MAP[term])
    .filter(Boolean);

  const body = {
    coordinates: stops.map((p) => [p.lon, p.lat]),
    instructions: false,
    geometry: true,
    elevation: false,
    ...(avoidFeatures.length > 0 && {
      options: { avoid_features: avoidFeatures },
    }),
  };

  try {
    const response = await fetch(`${ORS_URL}/v2/directions/driving-car/geojson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, status: response.status, body: text };
    }

    const geo = await response.json();
    const feat = geo.features?.[0];

    if (!feat || !feat.geometry) {
      return { ok: false, error: 'no_route' };
    }

    return {
      ok: true,
      payload: {
        ok: true,
        distance_m: Math.round(feat.properties?.summary?.distance ?? 0),
        duration_s: Math.round(feat.properties?.summary?.duration ?? 0),
        geometry: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: feat.geometry,
            },
          ],
        },
        route_retry_relaxed: false,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, error: error.name === 'AbortError' ? 'timeout' : String(error) };
  }
}

/**
 * Build OSRM exclude parameter from user avoid preferences
 */
function buildExcludeParam(avoid) {
  if (!Array.isArray(avoid) || avoid.length === 0) {
    return '';
  }
  return avoid
    .map((term) => AVOID_MAP[term])
    .filter(Boolean)
    .join(',');
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stops, constraints } = req.body;

    // Validate stops
    if (!Array.isArray(stops) || stops.length < 2 || stops.length > 5) {
      return res.status(400).json({
        ok: false,
        code: 'invalid_request',
        message: 'stops must be an array of 2-5 points',
      });
    }

    for (const stop of stops) {
      if (typeof stop.lat !== 'number' || typeof stop.lon !== 'number') {
        return res.status(400).json({
          ok: false,
          code: 'invalid_request',
          message: 'Each stop must have lat and lon numbers',
        });
      }
    }

    const avoid = constraints?.avoid || [];
    const exclude = buildExcludeParam(avoid);
    const wantsAvoid = avoid.length > 0;

    let payload = null;

    // Try ORS first if avoid is requested and configured
    if (wantsAvoid && ORS_API_KEY) {
      const orsResult = await callORS(stops, avoid, TIMEOUT_MS);
      if (orsResult.ok && orsResult.payload) {
        payload = orsResult.payload;
      }
    }

    // Fall back to OSRM if ORS wasn't used or failed
    if (!payload) {
      const [a, b] = [stops[0], stops[stops.length - 1]];
      const coords = `${a.lon},${a.lat};${b.lon},${b.lat}`;
      const baseUrl = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=false`;
      const excludeQS = exclude ? `&exclude=${exclude}` : '';
      const url = `${baseUrl}${excludeQS}`;

      let result = await callOsrm(url, TIMEOUT_MS);

      // Retry without exclude if failed
      if (!result.ok || result.json?.code !== 'Ok') {
        const retryResult = await callOsrm(baseUrl, TIMEOUT_MS);
        if (retryResult.ok && retryResult.json?.code === 'Ok') {
          result = retryResult;
        }
      }

      if (!result.ok || result.json?.code !== 'Ok' || !result.json?.routes?.length) {
        return res.status(502).json({
          ok: false,
          code: result.error === 'timeout' ? 'provider_timeout' : 'provider_error',
          message: result.error || result.json?.message || 'Route computation failed',
        });
      }

      const route = result.json.routes[0];
      payload = {
        ok: true,
        distance_m: Math.round(route.distance ?? 0),
        duration_s: Math.round(route.duration ?? 0),
        geometry: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: route.geometry,
            },
          ],
        },
        route_retry_relaxed: false,
      };
    }

    res.json(payload);
  } catch (error) {
    console.error('[Route] Error:', error);
    res.status(500).json({
      ok: false,
      code: 'internal_error',
      message: error.message,
    });
  }
}
