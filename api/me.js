/**
 * Current User Endpoint
 * GET /api/me
 */

import { handleCors } from './_lib/cors.js';
import { getUserFromRequest } from './_lib/auth.js';

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({
      authenticated: false,
      user: null,
    });
  }

  res.json({
    authenticated: true,
    user: {
      id: user.userId,
      username: user.username,
      displayName: user.displayName,
      tenant: user.tenantName,
    },
  });
}
