/**
 * CORS handling for Vercel Serverless Functions
 */

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://roamwise-frontend-2t6n2rxiaa-uc.a.run.app',
  'https://galsened.github.io',
];

/**
 * Add CORS headers to response
 * @param {object} res - Vercel response object
 * @param {string} origin - Request origin
 */
export function setCorsHeaders(res, origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Handle CORS preflight request
 * @param {object} req - Vercel request object
 * @param {object} res - Vercel response object
 * @returns {boolean} - true if preflight was handled
 */
export function handleCors(req, res) {
  const origin = req.headers.origin || '';
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}
