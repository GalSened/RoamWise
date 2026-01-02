// ---- RoamWise Personal AI Service ----
// ES Module with input validation

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

// Dynamic imports for AI modules (CommonJS compatibility)
const PersonalAI = (await import('./src/core/PersonalAI.js')).default;
const TravelMemory = (await import('./src/core/TravelMemory.js')).default;
const PreferenceEngine = (await import('./src/core/PreferenceEngine.js')).default;
const ConversationalAI = (await import('./src/core/ConversationalAI.js')).default;

const app = express();
const PORT = process.env.PORT || 8080;

// ---- Validation Schemas ----
const schemas = {
  chat: Joi.object({
    message: Joi.string().min(1).max(2000).required(),
    context: Joi.object({
      userId: Joi.string().optional(),
      sessionId: Joi.string().optional(),
      location: Joi.object({
        lat: Joi.number().min(-90).max(90),
        lng: Joi.number().min(-180).max(180)
      }).optional()
    }).optional()
  }),

  recommend: Joi.object({
    preferences: Joi.object({
      categories: Joi.array().items(Joi.string()).optional(),
      budget: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0)
      }).optional(),
      duration: Joi.number().min(1).max(30).optional()
    }).required(),
    context: Joi.object().optional()
  }),

  trip: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    destination: Joi.string().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    stops: Joi.array().optional(),
    notes: Joi.string().max(5000).optional()
  }),

  learn: Joi.object({
    interaction: Joi.object({
      type: Joi.string().required(),
      data: Joi.object().required()
    }).required(),
    feedback: Joi.object({
      rating: Joi.number().min(1).max(5).optional(),
      selected: Joi.boolean().optional(),
      comment: Joi.string().max(1000).optional()
    }).required()
  }),

  search: Joi.object({
    query: Joi.string().min(1).max(500).required(),
    location: Joi.alternatives().try(
      Joi.string(),
      Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      })
    ).required(),
    preferences: Joi.object().optional()
  }),

  plan: Joi.object({
    destination: Joi.string().min(1).max(500).required(),
    dates: Joi.object({
      start: Joi.date().iso().required(),
      end: Joi.date().iso().required()
    }).required(),
    preferences: Joi.object().optional()
  })
};

// ---- Validation Middleware ----
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));

      return res.status(400).json({
        ok: false,
        code: 'validation_error',
        message: 'Request validation failed',
        details
      });
    }

    req.body = value;
    next();
  };
}

// ---- Rate Limiting ----
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute for AI endpoints
  message: { ok: false, code: 'rate_limit', message: 'Too many AI requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1'
});

// ---- Middleware ----
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://galsened.github.io', /\.vercel\.app$/]
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Initialize AI Systems ----
const personalAI = new PersonalAI();
const travelMemory = new TravelMemory();
const preferenceEngine = new PreferenceEngine();
const conversationalAI = new ConversationalAI();

// ---- Safe Error Handler ----
function handleError(res, error, context = 'operation') {
  const isDev = process.env.NODE_ENV === 'development';

  // Log error (but don't expose internals)
  console.error(`[AI Error] ${context}:`, error.message);

  res.status(500).json({
    ok: false,
    code: 'internal_error',
    message: isDev ? error.message : `Failed to complete ${context}`
  });
}

// ---- Routes ----
app.get('/', (req, res) => {
  res.json({
    name: 'RoamWise Personal AI',
    version: '1.0.0',
    description: 'Your Personal Travel Intelligence System',
    status: 'Active and Learning',
    features: [
      'Personal AI Assistant',
      'Travel Memory & Analytics',
      'Predictive Recommendations',
      'Conversational Interface',
      'Personalized Trip Planning',
      'Behavioral Learning'
    ]
  });
});

// ---- AI Chat Endpoint ----
app.post('/api/ai/chat', aiLimiter, validate(schemas.chat), async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await conversationalAI.processMessage(message, context);
    res.json({ ok: true, ...response });
  } catch (error) {
    handleError(res, error, 'chat');
  }
});

// ---- Recommendations Endpoint ----
app.post('/api/ai/recommend', aiLimiter, validate(schemas.recommend), async (req, res) => {
  try {
    const { preferences, context } = req.body;
    const recommendations = await personalAI.generateRecommendations(preferences, context);
    res.json({ ok: true, recommendations });
  } catch (error) {
    handleError(res, error, 'recommendations');
  }
});

// ---- Travel Memory Routes ----
app.post('/api/memory/trip', validate(schemas.trip), async (req, res) => {
  try {
    const tripData = req.body;
    const savedTrip = await travelMemory.saveTrip(tripData);
    res.json({ ok: true, trip: savedTrip });
  } catch (error) {
    handleError(res, error, 'save trip');
  }
});

app.get('/api/memory/insights', async (req, res) => {
  try {
    const insights = await travelMemory.generateInsights();
    res.json({ ok: true, insights });
  } catch (error) {
    handleError(res, error, 'insights');
  }
});

// ---- Preference Learning Routes ----
app.post('/api/preferences/learn', validate(schemas.learn), async (req, res) => {
  try {
    const { interaction, feedback } = req.body;
    const updatedPreferences = await preferenceEngine.learn(interaction, feedback);
    res.json({ ok: true, preferences: updatedPreferences });
  } catch (error) {
    handleError(res, error, 'preference learning');
  }
});

app.get('/api/preferences/profile', async (req, res) => {
  try {
    const profile = await preferenceEngine.getPersonalityProfile();
    res.json({ ok: true, profile });
  } catch (error) {
    handleError(res, error, 'profile');
  }
});

// ---- Intelligence Routes ----
app.post('/api/intelligence/search', aiLimiter, validate(schemas.search), async (req, res) => {
  try {
    const { query, location, preferences } = req.body;
    const results = await personalAI.intelligentSearch(query, location, preferences);
    res.json({ ok: true, results });
  } catch (error) {
    handleError(res, error, 'search');
  }
});

app.post('/api/intelligence/plan', aiLimiter, validate(schemas.plan), async (req, res) => {
  try {
    const { destination, dates, preferences } = req.body;
    const plan = await personalAI.createPersonalizedPlan(destination, dates, preferences);
    res.json({ ok: true, plan });
  } catch (error) {
    handleError(res, error, 'planning');
  }
});

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  });
});

// ---- Error Handling ----
app.use((error, req, res, _next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    ok: false,
    code: 'internal_error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ ok: false, code: 'not_found', message: 'Endpoint not found' });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`
RoamWise Personal AI Backend
Server running on port ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
AI Status: Active and Learning
  `);
});

export default app;
