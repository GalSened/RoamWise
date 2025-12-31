/**
 * Health Check Endpoint
 * GET /api/health
 */

import { handleCors } from './_lib/cors.js';

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'healthy',
    version: '2.0.0',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
  });
}
