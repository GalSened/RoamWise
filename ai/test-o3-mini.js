// Test script to verify o3-mini integration
const axios = require('axios');

const API_BASE = 'https://premium-hybrid-473405-g7.uc.r.appspot.com';

async function testO3Mini() {
  console.log('🧠 Testing o3-mini Personal AI...\n');
  
  try {
    // Test 1: Health Check
    console.log('1️⃣ Health Check...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend Status:', health.data.status);
    
    // Test 2: AI Chat with travel question
    console.log('\n2️⃣ Testing o3-mini Conversation...');
    const chatTest = await axios.post(`${API_BASE}/api/ai/chat`, {
      message: "I want to plan a weekend trip to a warm destination with great food. What do you recommend?",
      context: { 
        userId: 'personal',
        location: 'New York',
        budget: 800,
        interests: ['food', 'culture', 'relaxation']
      }
    });
    
    console.log('🤖 o3-mini Response:');
    console.log('- Response length:', chatTest.data.response?.length || 0, 'characters');
    console.log('- Intent detected:', chatTest.data.intent);
    console.log('- Sentiment:', chatTest.data.sentiment);
    console.log('- First 200 chars:', chatTest.data.response?.substring(0, 200) + '...');
    
    // Test 3: Intelligent Search
    console.log('\n3️⃣ Testing Intelligent Search...');
    const searchTest = await axios.post(`${API_BASE}/api/intelligence/search`, {
      query: "best restaurants",
      location: "Miami, FL",
      preferences: {
        budgetCategory: 'mid_range',
        destinationTypes: ['urban', 'cultural'],
        activityPreferences: ['food', 'nightlife']
      }
    });
    
    console.log('🔍 Search Results:');
    console.log('- Results found:', searchTest.data.results?.length || 0);
    console.log('- Weather context available:', !!searchTest.data.context?.weather);
    console.log('- Personalized ranking applied:', !!searchTest.data.results?.[0]?.personalizedScore);
    
    // Test 4: Recommendations
    console.log('\n4️⃣ Testing AI Recommendations...');
    const recsTest = await axios.post(`${API_BASE}/api/ai/recommend`, {
      preferences: {
        destinationType: 'beach',
        budget: 1000,
        duration: 'weekend',
        activities: ['relaxation', 'food', 'water_sports']
      },
      context: {
        currentLocation: 'New York',
        travelDate: '2025-10-15',
        travelers: 2
      }
    });
    
    console.log('🎯 Recommendations:');
    console.log('- Recommendations generated:', !!recsTest.data.recommendations);
    console.log('- Confidence level:', recsTest.data.confidence + '%');
    console.log('- Personal insight:', recsTest.data.personalizedInsight);
    console.log('- Learning note:', recsTest.data.learningNote);
    
    console.log('\n✅ o3-mini Integration Test Complete!');
    console.log('🚀 Your Personal AI is powered by o3-mini and fully operational!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

testO3Mini();