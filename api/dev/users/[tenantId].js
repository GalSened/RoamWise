/**
 * Get Users by Tenant
 * GET /api/dev/users/:tenantId
 */

import { handleCors } from '../../_lib/cors.js';
import { getUsersByTenant } from '../../_lib/db.js';

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tenantId = parseInt(req.query.tenantId, 10);

    if (isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }

    const users = getUsersByTenant(tenantId);
    res.json({ users });
  } catch (error) {
    console.error('[Auth] Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
