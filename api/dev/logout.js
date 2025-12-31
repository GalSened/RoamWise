/**
 * Dev Logout Endpoint
 * POST /api/dev/logout
 */

import { handleCors } from '../_lib/cors.js';
import { clearAuthCookieHeader } from '../_lib/auth.js';

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearAuthCookieHeader(res);
  console.log('[Auth] User logged out');

  res.json({ success: true });
}
