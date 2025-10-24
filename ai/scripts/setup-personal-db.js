const { Firestore } = require('@google-cloud/firestore');

async function setupPersonalDatabase() {
  try {
    console.log('🗄️ Setting up Personal AI database...');
    
    const firestore = new Firestore();
    
    // Initialize user profile
    const userProfile = {
      id: 'personal',
      createdAt: new Date(),
      travelStyle: 'discovering',
      budgetRange: 'flexible',
      preferredSeasons: [],
      favoriteDestinations: [],
      activityPreferences: {},
      personalityTraits: {},
      lastUpdated: new Date()
    };
    
    await firestore.collection('users').doc('personal').set(userProfile);
    console.log('✅ User profile initialized');
    
    // Initialize personality profile
    const personalityProfile = {
      travelPersonality: 'discovering',
      riskTolerance: 'medium',
      planningStyle: 'flexible',
      socialPreference: 'mixed',
      budgetConsciousness: 'moderate',
      adventurousness: 'moderate',
      cultureInterest: 'moderate',
      comfortLevel: 'moderate',
      lastUpdated: new Date()
    };
    
    await firestore.collection('personality_profile').doc('personal').set(personalityProfile);
    console.log('✅ Personality profile initialized');
    
    // Initialize preferences
    const preferences = {
      destinations: {},
      activities: {},
      accommodations: {},
      transportation: {},
      dining: {},
      budget: {},
      timing: {},
      weather: {},
      social: {},
      pace: {}
    };
    
    await firestore.collection('preferences').doc('personal').set({
      userId: 'personal',
      preferences,
      lastUpdated: new Date(),
      learningCount: 0
    });
    console.log('✅ Preferences initialized');
    
    console.log('🎉 Personal AI database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    // Don't fail the build - this is optional setup
    console.log('⚠️ Continuing with deployment...');
  }
}

setupPersonalDatabase();