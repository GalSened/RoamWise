/**
 * Get All Tenants
 * GET /api/dev/tenants
 */

import { handleCors } from '../_lib/cors.js';
import { getAllTenants } from '../_lib/db.js';

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tenants = getAllTenants();
    res.json({ tenants });
  } catch (error) {
    console.error('[Auth] Get tenants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
