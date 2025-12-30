// routes/sar.js - Search Along Route (stub)
// This is a placeholder for the SAR functionality

/**
 * Search for places along a route
 * @param {Object} options
 * @param {string} options.query - Search query
 * @param {number} options.maxResults - Maximum results
 * @param {number} options.maxDetourMin - Maximum detour in minutes
 * @param {Array} options.stops - Route stops [{lat, lon}]
 * @param {string} options.mode - Travel mode
 * @param {string} options.lang - Language
 * @param {boolean} options.enrichDetails - Whether to enrich with details
 * @returns {Promise<Array>} Search results
 */
export async function searchAlongRoute(options) {
  // Stub implementation - returns empty array
  // Full implementation would search for places along the route
  console.log('SAR search:', options.query);
  return [];
}

export default { searchAlongRoute };
