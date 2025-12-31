/**
 * Google Places Details
 * GET /api/places/:id
 */

import { handleCors } from '../_lib/cors.js';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const BASE_URL = 'https://places.googleapis.com/v1/places';

/**
 * Field mask for place details
 */
const DETAILS_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'types',
  'rating',
  'userRatingCount',
  'priceLevel',
  'websiteUri',
  'nationalPhoneNumber',
  'currentOpeningHours',
  'regularOpeningHours',
  'photos',
  'reviews',
  'editorialSummary',
].join(',');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(503).json({ error: 'Google Maps API not configured' });
  }

  const { id } = req.query;
  const lang = req.query.lang || 'en';

  if (!id) {
    return res.status(400).json({ error: 'Place ID is required' });
  }

  try {
    const url = `${BASE_URL}/${id}?languageCode=${lang}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': DETAILS_FIELDS,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Places] Details failed:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Places API error',
        status: response.status,
      });
    }

    const p = await response.json();

    // Transform to simpler format
    const place = {
      placeId: p.id,
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : null,
      types: p.types || [],
      rating: p.rating,
      reviewCount: p.userRatingCount,
      priceLevel: p.priceLevel,
      website: p.websiteUri,
      phone: p.nationalPhoneNumber,
      summary: p.editorialSummary?.text,
      isOpen: p.currentOpeningHours?.openNow,
      hours: p.regularOpeningHours?.weekdayDescriptions || [],
      photos: (p.photos || []).slice(0, 5).map((photo) => ({
        ref: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
      })),
      reviews: (p.reviews || []).slice(0, 3).map((r) => ({
        author: r.authorAttribution?.displayName || 'Anonymous',
        rating: r.rating,
        text: r.text?.text || '',
        time: r.publishTime,
      })),
    };

    res.json({ ok: true, place });
  } catch (error) {
    console.error('[Places] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
