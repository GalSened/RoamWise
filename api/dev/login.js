/**
 * Dev Login Endpoint
 * POST /api/dev/login
 */

import { handleCors } from '../_lib/cors.js';
import { getUserByCredentials } from '../_lib/db.js';
import { signToken, setAuthCookieHeader } from '../_lib/auth.js';

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenant, username } = req.body || {};

    if (!tenant || !username) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'tenant and username are required',
      });
    }

    const user = getUserByCredentials(tenant, username);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: `No user "${username}" found in tenant "${tenant}"`,
      });
    }

    // Create JWT payload
    const payload = {
      userId: user.id,
      username: user.username,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      displayName: user.display_name,
    };

    // Sign token and set cookie
    const token = signToken(payload);
    setAuthCookieHeader(res, token);

    console.log('[Auth] User logged in:', user.username, 'tenant:', user.tenant_name);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        tenant: user.tenant_name,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
