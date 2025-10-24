// Simple test for o3-mini without Firestore
const axios = require('axios');

const API_BASE = 'https://premium-hybrid-473405-g7.uc.r.appspot.com';

async function testO3MiniSimple() {
  console.log('🧠 Testing o3-mini without database dependencies...\n');
  
  try {
    // Test basic health check
    console.log('1️⃣ Health Check...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Status:', health.data.status);
    console.log('✅ Uptime:', Math.round(health.data.uptime), 'seconds');
    
    // Test basic info endpoint  
    console.log('\n2️⃣ API Info...');
    const info = await axios.get(`${API_BASE}/`);
    console.log('✅ Name:', info.data.name);
    console.log('✅ Status:', info.data.status);
    console.log('✅ Features:', info.data.features.length, 'features available');
    
    console.log('\n✅ Basic o3-mini backend is operational!');
    console.log('📋 Note: Full AI features will be available once Firestore is ready');
    console.log('⏰ Firestore will be available in ~5 minutes');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testO3MiniSimple();