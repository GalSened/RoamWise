// ---- Database Setup (Mock) ----
// Multi-tenant database mock for testing without native dependencies
// TODO: Replace with SQLite/PostgreSQL for production

import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

logger.info('[DB] Using In-Memory Mock Database');
logger.warn('[DB] Data will be lost on server restart - not suitable for production');

// In-memory storage
const store = {
  tenants: [],
  users: [],
  profiles: []
};

let idCounter = 1;
const nextId = () => idCounter++;

export function migrate() {
  logger.info('[DB] Running mock migrations...');
  seedDefaultData();
  logger.info('[DB] Mock migrations complete');
}

function seedDefaultData() {
  if (store.tenants.find(t => t.name === 'home')) return;

  const tenantId = nextId();
  store.tenants.push({
    id: tenantId,
    name: 'home',
    created_at: new Date().toISOString()
  });

  const users = [
    { username: 'gal', displayName: 'Gal' },
    { username: 'guest', displayName: 'Guest' },
    { username: 'family1', displayName: 'Family Member 1' },
    { username: 'family2', displayName: 'Family Member 2' }
  ];

  users.forEach(u => {
    const userId = nextId();
    store.users.push({
      id: userId,
      tenant_id: tenantId,
      username: u.username,
      display_name: u.displayName,
      created_at: new Date().toISOString()
    });

    store.profiles.push({
      id: nextId(),
      user_id: userId,
      pace: 'relaxed',
      likes: JSON.stringify(['food', 'culture']),
      avoid: JSON.stringify([]),
      dietary: JSON.stringify([]),
      budget_min: 50,
      budget_max: 500,
      updated_at: new Date().toISOString()
    });
  });

  logger.info('[DB] Seeded mock data');
}

export function getAllTenants() {
  return store.tenants;
}

export function getUsersByTenant(tenantId) {
  return store.users
    .filter(u => u.tenant_id === Number(tenantId))
    .map(u => ({ id: u.id, username: u.username, display_name: u.display_name }));
}

export function getUserByCredentials(tenantName, username) {
  const tenant = store.tenants.find(t => t.name === tenantName);
  if (!tenant) return undefined;

  const user = store.users.find(u => u.tenant_id === tenant.id && u.username === username);
  if (!user) return undefined;

  return {
    ...user,
    tenant_name: tenant.name
  };
}

export function getProfileByUserId(userId) {
  const profile = store.profiles.find(p => p.user_id === Number(userId));
  if (!profile) return null;

  const user = store.users.find(u => u.id === Number(userId));
  const tenant = store.tenants.find(t => t.id === user.tenant_id);

  return {
    ...profile,
    username: user.username,
    display_name: user.display_name,
    tenant_name: tenant.name,
    likes: JSON.parse(profile.likes || '[]'),
    avoid: JSON.parse(profile.avoid || '[]'),
    dietary: JSON.parse(profile.dietary || '[]')
  };
}

export function updateProfile(userId, prefs) {
  const profile = store.profiles.find(p => p.user_id === Number(userId));
  if (!profile) return false;

  if (prefs.pace !== undefined) profile.pace = prefs.pace;
  if (prefs.likes !== undefined) profile.likes = JSON.stringify(prefs.likes);
  if (prefs.avoid !== undefined) profile.avoid = JSON.stringify(prefs.avoid);
  if (prefs.dietary !== undefined) profile.dietary = JSON.stringify(prefs.dietary);
  if (prefs.budget_min !== undefined) profile.budget_min = prefs.budget_min;
  if (prefs.budget_max !== undefined) profile.budget_max = prefs.budget_max;

  profile.updated_at = new Date().toISOString();
  return true;
}

export default {
  migrate,
  getAllTenants,
  getUsersByTenant,
  getUserByCredentials,
  getProfileByUserId,
  updateProfile
};
