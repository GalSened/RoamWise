const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const PersonalAI = require('./src/core/PersonalAI');
const TravelMemory = require('./src/core/TravelMemory');
const PreferenceEngine = require('./src/core/PreferenceEngine');
const ConversationalAI = require('./src/core/ConversationalAI');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://galsened.github.io'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Personal AI Systems
const personalAI = new PersonalAI();
const travelMemory = new TravelMemory();
const preferenceEngine = new PreferenceEngine();
const conversationalAI = new ConversationalAI();

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'RoamWise Personal AI',
    version: '1.0.0',
    description: 'Your Personal Travel Intelligence System',
    status: 'Active and Learning',
    features: [
      '🧠 Personal AI Assistant',
      '📊 Travel Memory & Analytics', 
      '🔮 Predictive Recommendations',
      '💬 Conversational Interface',
      '🎯 Personalized Trip Planning',
      '📈 Behavioral Learning'
    ]
  });
});

// Personal AI Assistant Routes
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await conversationalAI.processMessage(message, context);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/recommend', async (req, res) => {
  try {
    const { preferences, context } = req.body;
    const recommendations = await personalAI.generateRecommendations(preferences, context);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Travel Memory Routes
app.post('/api/memory/trip', async (req, res) => {
  try {
    const tripData = req.body;
    const savedTrip = await travelMemory.saveTrip(tripData);
    res.json(savedTrip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memory/insights', async (req, res) => {
  try {
    const insights = await travelMemory.generateInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Preference Learning Routes
app.post('/api/preferences/learn', async (req, res) => {
  try {
    const { interaction, feedback } = req.body;
    const updatedPreferences = await preferenceEngine.learn(interaction, feedback);
    res.json(updatedPreferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/preferences/profile', async (req, res) => {
  try {
    const profile = await preferenceEngine.getPersonalityProfile();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time Intelligence Routes
app.post('/api/intelligence/search', async (req, res) => {
  try {
    const { query, location, preferences } = req.body;
    const results = await personalAI.intelligentSearch(query, location, preferences);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/intelligence/plan', async (req, res) => {
  try {
    const { destination, dates, preferences } = req.body;
    const plan = await personalAI.createPersonalizedPlan(destination, dates, preferences);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🧠 RoamWise Personal AI Backend
🚀 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🤖 AI Status: Active and Learning
📊 Ready to serve your personal travel intelligence!
  `);
});

module.exports = app;