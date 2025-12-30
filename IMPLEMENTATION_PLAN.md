# RoamWise Implementation Plan

## Overview

This plan addresses the security, code quality, and testing improvements identified in the code review. Tasks are organized by priority and dependency.

---

## Phase 1: Critical Security Fixes (High Priority)

### 1.1 JWT Secret Production Check

**File:** `backend/auth.js`

**Current Issue:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'roamwise-dev-secret-change-in-production';
```

**Implementation:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  console.warn('[WARN] Using default JWT secret - NOT FOR PRODUCTION USE');
}

const EFFECTIVE_SECRET = JWT_SECRET || 'roamwise-dev-secret-DO-NOT-USE-IN-PROD';
```

**Acceptance Criteria:**
- [ ] Server refuses to start in production without JWT_SECRET
- [ ] Clear warning logged in development mode
- [ ] Existing tests continue to pass

---

### 1.2 Signed Session Cookies

**File:** `backend/server.js`

**Current Issue:**
```javascript
// Session stored as base64-encoded JSON - easily tampered
const json = Buffer.from(cookie, 'base64url').toString('utf-8');
const session = JSON.parse(json);
```

**Implementation:**
1. Create new utility `backend/src/utils/session.js`:
```javascript
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';

export function signSession(payload) {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySession(cookie) {
  const [data, signature] = cookie.split('.');
  if (!data || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  return JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
}
```

2. Update `server.js` to use signed sessions
3. Update `src/routes/family-auth.js` to sign cookies on creation

**Acceptance Criteria:**
- [ ] Sessions are HMAC-signed
- [ ] Tampered cookies are rejected
- [ ] Timing-safe comparison prevents timing attacks
- [ ] Production requires SESSION_SECRET env var

---

### 1.3 Rate Limiting for Auth Endpoints

**File:** `backend/server.js` (new middleware)

**Implementation:**
1. Add dependency: `npm install express-rate-limit --save`
2. Create rate limiter configuration:
```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to auth routes
app.use('/api/dev/login', authLimiter);
app.use('/api/family/signin', authLimiter);
```

**Acceptance Criteria:**
- [ ] Auth endpoints limited to 10 requests per 15 minutes
- [ ] Clear error message returned when rate limited
- [ ] Rate limit headers included in responses

---

## Phase 2: Code Quality Improvements

### 2.1 Remove @ts-nocheck and Fix Types

**Files to update:**
- `frontend/src/core/app.ts`
- `frontend/src/features/voice/VoiceManager.ts`

**Implementation Steps:**

1. **app.ts** - Replace `any` types with proper interfaces:
```typescript
interface Providers {
  places: PlacesProvider;
  routing: RoutingProvider;
  weather: WeatherProvider;
  googlePlaces?: PlacesProvider;
  googleRouting?: RoutingProvider;
  weatherAwareRouter?: WeatherAwareRouter;
}

interface Managers {
  map: MapManager;
  ui: UIManager;
}

class TravelingApp {
  private providers: Partial<Providers> = {};
  private managers: Partial<Managers> = {};
  private aiOrchestrator: AIOrchestrator | null = null;
  // ...
}
```

2. **VoiceManager.ts** - Fix SpeechRecognition types:
```typescript
// Add to types/index.ts or create types/speech.d.ts
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
```

3. Update `tsconfig.json` to enable stricter checks:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Acceptance Criteria:**
- [ ] No `@ts-nocheck` directives in codebase
- [ ] `npm run typecheck` passes with no errors
- [ ] All `any` types replaced with proper types

---

### 2.2 Fix CORS Configuration for Production

**File:** `backend/server.js`

**Current Issue:**
```javascript
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'],
  credentials: true
}));
```

**Implementation:**
```javascript
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'];

if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  console.warn('[WARN] ALLOWED_ORIGINS not set in production - using restrictive default');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));
```

**Acceptance Criteria:**
- [ ] Production requires explicit ALLOWED_ORIGINS configuration
- [ ] Localhost origins only allowed in development
- [ ] CORS errors logged for debugging

---

## Phase 3: Database Persistence

### 3.1 Replace In-Memory Store with SQLite

**Files:**
- `backend/db.js` (rewrite)
- `backend/db.original.js` (reference)

**Implementation Steps:**

1. Add better-sqlite3 dependency:
```bash
npm install better-sqlite3 --save
```

2. Create database initialization:
```javascript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'roamwise.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
```

3. Create migration system:
```javascript
export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      username TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, username)
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
      pace TEXT DEFAULT 'relaxed',
      likes TEXT DEFAULT '[]',
      avoid TEXT DEFAULT '[]',
      dietary TEXT DEFAULT '[]',
      budget_min INTEGER DEFAULT 50,
      budget_max INTEGER DEFAULT 500,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
  `);
}
```

4. Update all database functions to use prepared statements

**Acceptance Criteria:**
- [ ] Data persists across server restarts
- [ ] WAL mode enabled for better concurrency
- [ ] Prepared statements prevent SQL injection
- [ ] Migration runs automatically on startup
- [ ] Existing API contracts maintained

---

## Phase 4: Test Coverage

### 4.1 Voice Manager Tests

**File:** `frontend/tests/unit/voice.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { voiceManager } from '@/features/voice/VoiceManager';

describe('VoiceManager', () => {
  describe('Intent Parsing', () => {
    it('should parse English plan creation intent', async () => {
      const intent = await voiceManager.processQuickCommand('plan a trip to Tel Aviv');
      expect(intent.type).toBe('plan_create');
      expect(intent.parameters.destination).toBe('tel aviv');
    });

    it('should parse Hebrew plan creation intent', async () => {
      const intent = await voiceManager.processQuickCommand('תכנן טיול לירושלים');
      expect(intent.type).toBe('plan_create');
      expect(intent.parameters.destination).toContain('ירושלים');
    });

    it('should fall back to search for unrecognized commands', async () => {
      const intent = await voiceManager.processQuickCommand('something random');
      expect(intent.type).toBe('search');
      expect(intent.confidence).toBeLessThan(0.8);
    });
  });

  describe('TTS Support', () => {
    it('should check if TTS is supported', () => {
      // Mock window.speechSynthesis
      const result = voiceManager.isSpeaking();
      expect(typeof result).toBe('boolean');
    });
  });
});
```

### 4.2 Backend Auth Tests

**File:** `backend/tests/auth.test.js`

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Authentication', () => {
  describe('POST /api/dev/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/dev/login')
        .send({ tenant: 'home', username: 'gal' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid tenant', async () => {
      const res = await request(app)
        .post('/api/dev/login')
        .send({ tenant: 'nonexistent', username: 'gal' });

      expect(res.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit after 10 attempts', async () => {
      for (let i = 0; i < 11; i++) {
        const res = await request(app)
          .post('/api/dev/login')
          .send({ tenant: 'wrong', username: 'wrong' });

        if (i === 10) {
          expect(res.status).toBe(429);
        }
      }
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Voice intent parsing tests cover English and Hebrew
- [ ] Auth tests cover login, logout, and rate limiting
- [ ] Test coverage reaches 70%+ for critical paths

---

## Implementation Order

```
Week 1: Security (Phase 1)
├── 1.1 JWT Secret Check
├── 1.2 Signed Session Cookies
└── 1.3 Rate Limiting

Week 2: Code Quality (Phase 2)
├── 2.1 TypeScript Fixes (app.ts)
├── 2.1 TypeScript Fixes (VoiceManager.ts)
└── 2.2 CORS Configuration

Week 3: Database (Phase 3)
├── 3.1 SQLite Integration
├── 3.1 Migration System
└── 3.1 Update Database Functions

Week 4: Testing (Phase 4)
├── 4.1 Voice Manager Tests
├── 4.2 Backend Auth Tests
└── 4.2 Integration Tests
```

---

## Definition of Done

Each task is complete when:
1. Code changes implemented and working
2. No TypeScript/ESLint errors
3. Existing tests pass
4. New tests written (where applicable)
5. Changes committed with descriptive message
6. Manual testing completed

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SQLite native module issues | Use better-sqlite3 which is well-tested |
| Breaking existing sessions | Add migration path for old cookies |
| TypeScript errors overwhelming | Fix incrementally, file by file |
| Rate limiter blocking legitimate users | Use reasonable limits (10/15min) |

---

## Environment Variables (New)

Add these to `.env.example`:

```bash
# Security (Required in production)
JWT_SECRET=your-secure-random-secret-here
SESSION_SECRET=your-session-signing-secret

# CORS (Required in production)
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com

# Database
DB_PATH=./data/roamwise.db
```
