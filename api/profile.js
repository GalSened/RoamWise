/**
 * Profile API
 * GET /api/profile - Get current user's profile
 * PUT /api/profile - Update current user's preferences
 */

import { handleCors } from './_lib/cors.js';
import { getUserFromRequest } from './_lib/auth.js';
import { getProfileByUserId, updateProfile } from './_lib/db.js';

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  // Check authentication
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    return handleGetProfile(req, res, user);
  } else if (req.method === 'PUT') {
    return handleUpdateProfile(req, res, user);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

function handleGetProfile(req, res, user) {
  try {
    const profile = getProfileByUserId(user.userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      user: {
        id: profile.user_id,
        username: profile.username,
        displayName: profile.display_name,
        tenant: profile.tenant_name,
      },
      preferences: {
        pace: profile.pace,
        likes: profile.likes,
        avoid: profile.avoid,
        dietary: profile.dietary,
        budget: {
          min: profile.budget_min,
          max: profile.budget_max,
        },
      },
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    console.error('[Profile] Get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function handleUpdateProfile(req, res, user) {
  try {
    const prefs = req.body;

    // Validate preferences
    const validPaces = ['slow', 'relaxed', 'active', 'packed'];
    if (prefs.pace && !validPaces.includes(prefs.pace)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid pace value',
      });
    }

    if (prefs.budget_min !== undefined && prefs.budget_max !== undefined) {
      if (prefs.budget_min > prefs.budget_max) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'budget_min must be less than or equal to budget_max',
        });
      }
    }

    // Update profile
    const updated = updateProfile(user.userId, prefs);

    if (!updated) {
      return res.status(404).json({ error: 'Profile not found or no changes made' });
    }

    // Get updated profile
    const profile = getProfileByUserId(user.userId);

    res.json({
      success: true,
      preferences: {
        pace: profile.pace,
        likes: profile.likes,
        avoid: profile.avoid,
        dietary: profile.dietary,
        budget: {
          min: profile.budget_min,
          max: profile.budget_max,
        },
      },
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    console.error('[Profile] Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
