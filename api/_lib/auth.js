/**
 * JWT Authentication Utilities for Vercel Serverless
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'roamwise-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Sign a JWT token for a user
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 * @returns payload if valid, null if invalid/expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return null;
  }
}

/**
 * Parse cookies from request headers
 */
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=');
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value.trim());
    }
  });

  return cookies;
}

/**
 * Get user from request (via cookie or Authorization header)
 * @returns user payload or null
 */
export function getUserFromRequest(req) {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // Try cookie
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.roamwise_auth;
  if (token) {
    return verifyToken(token);
  }

  return null;
}

/**
 * Set auth cookie header
 */
export function setAuthCookieHeader(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  res.setHeader(
    'Set-Cookie',
    `roamwise_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProduction ? '; Secure' : ''}`
  );
}

/**
 * Clear auth cookie header
 */
export function clearAuthCookieHeader(res) {
  res.setHeader('Set-Cookie', 'roamwise_auth=; Path=/; HttpOnly; Max-Age=0');
}
