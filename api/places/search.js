/**
 * Google Places Text Search
 * POST /api/places/search
 */

import { handleCors } from '../_lib/cors.js';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const BASE_URL = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Field mask for search results (cost-optimized)
 */
const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.rating',
  'places.priceLevel',
  'places.photos',
  'places.currentOpeningHours',
].join(',');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(503).json({ error: 'Google Maps API not configured' });
  }

  try {
    const { query, openNow, minRating, priceLevels, includedType, biasCircle, lang } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Build request body for Google Places API
    const body = {
      textQuery: query,
      languageCode: lang || 'en',
      maxResultCount: 10,
    };

    // Optional filters
    if (openNow) body.openNow = true;
    if (minRating) body.minRating = minRating;
    if (priceLevels) body.priceLevels = priceLevels;
    if (includedType) body.includedType = includedType;

    // Location bias
    if (biasCircle?.center) {
      body.locationBias = {
        circle: {
          center: {
            latitude: biasCircle.center.lat,
            longitude: biasCircle.center.lng,
          },
          radius: biasCircle.radius || 5000,
        },
      };
    }

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': SEARCH_FIELDS,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Places] Search failed:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Places API error',
        status: response.status,
      });
    }

    const data = await response.json();

    // Transform response to simpler format
    const places = (data.places || []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : null,
      types: p.types || [],
      rating: p.rating,
      priceLevel: p.priceLevel,
      isOpen: p.currentOpeningHours?.openNow,
      photoRef: p.photos?.[0]?.name || null,
    }));

    res.json({ ok: true, places });
  } catch (error) {
    console.error('[Places] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
