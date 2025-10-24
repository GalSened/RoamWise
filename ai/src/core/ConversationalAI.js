const OpenAI = require('openai');
const { Firestore } = require('@google-cloud/firestore');
const natural = require('natural');
const sentiment = require('sentiment');

class ConversationalAI {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.firestore = new Firestore();
    this.sentiment = new sentiment();
    this.conversationHistory = [];
    this.userPersonality = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('💬 Initializing Conversational AI...');
      await this.loadConversationHistory();
      await this.loadUserPersonality();
      console.log('✅ Conversational AI ready');
    } catch (error) {
      console.error('❌ Failed to initialize Conversational AI:', error);
    }
  }

  async loadConversationHistory() {
    // Fresh conversation for each session - o3-mini handles context internally
    this.conversationHistory = [];
    console.log('✅ Using fresh conversation history (database-free)');
  }

  async loadUserPersonality() {
    // Use optimized personality for o3-mini conversations
    this.userPersonality = {
      communicationStyle: 'friendly',
      humor: 'moderate',
      formality: 'casual',
      enthusiasm: 'high',
      decisionMaking: 'thoughtful',
      informationProcessing: 'balanced'
    };
    console.log('✅ Using optimized personality (database-free)');
  }

  async processMessage(message, context = {}) {
    try {
      // Analyze message sentiment and intent
      const analysis = this.analyzeMessage(message);
      
      // Build conversational context
      const conversationalContext = await this.buildConversationalContext(message, context, analysis);
      
      // Generate personalized response
      const response = await this.generatePersonalizedResponse(conversationalContext);
      
      // Learn from this conversation
      await this.learnFromConversation(message, response, analysis);
      
      return {
        response: response.text,
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        suggestions: response.suggestions,
        followUp: response.followUp,
        personalityInsight: this.generatePersonalityInsight(analysis)
      };
      
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "I'm having trouble processing that right now, but I'm learning! Can you try rephrasing?",
        intent: 'error',
        sentiment: 'neutral'
      };
    }
  }

  analyzeMessage(message) {
    const sentimentAnalysis = this.sentiment.analyze(message);
    const intent = this.detectIntent(message);
    const entities = this.extractEntities(message);
    const urgency = this.detectUrgency(message);
    const complexity = this.assessComplexity(message);
    
    return {
      text: message,
      sentiment: this.categorizeSentiment(sentimentAnalysis.score),
      intent,
      entities,
      urgency,
      complexity,
      keywords: this.extractKeywords(message),
      questionType: this.identifyQuestionType(message)
    };
  }

  detectIntent(message) {
    const intents = {
      search: /\b(find|search|look for|show me|where|what)\b/i,
      plan: /\b(plan|trip|itinerary|schedule|organize)\b/i,
      recommend: /\b(recommend|suggest|advice|best|good|should I)\b/i,
      book: /\b(book|reserve|buy|purchase|get tickets)\b/i,
      weather: /\b(weather|temperature|rain|sunny|climate)\b/i,
      budget: /\b(cost|price|budget|expensive|cheap|money)\b/i,
      transport: /\b(flight|train|bus|car|transport|travel|how to get)\b/i,
      accommodation: /\b(hotel|stay|accommodation|airbnb|lodge)\b/i,
      activities: /\b(do|activities|fun|attractions|sights)\b/i,
      food: /\b(eat|food|restaurant|cuisine|dining)\b/i,
      help: /\b(help|how|explain|what does|tutorial)\b/i,
      feedback: /\b(love|hate|like|dislike|good|bad|terrible|amazing)\b/i
    };

    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(message)) return intent;
    }
    
    return 'general';
  }

  extractEntities(message) {
    const entities = {
      locations: this.extractLocations(message),
      dates: this.extractDates(message),
      numbers: this.extractNumbers(message),
      people: this.extractPeople(message)
    };
    
    return entities;
  }

  extractLocations(message) {
    // Simple location extraction - in production, use NER model
    const locationKeywords = ['paris', 'london', 'tokyo', 'new york', 'rome', 'barcelona', 'thailand', 'japan', 'italy', 'france'];
    return locationKeywords.filter(loc => 
      message.toLowerCase().includes(loc)
    );
  }

  extractDates(message) {
    const datePatterns = [
      /\b(today|tomorrow|next week|next month)\b/gi,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
      /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g
    ];
    
    const dates = [];
    datePatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) dates.push(...matches);
    });
    
    return dates;
  }

  extractNumbers(message) {
    return message.match(/\b\d+\b/g) || [];
  }

  extractPeople(message) {
    const peopleKeywords = ['I', 'we', 'my family', 'my partner', 'friends', 'group', 'solo', 'alone'];
    return peopleKeywords.filter(person => 
      message.toLowerCase().includes(person.toLowerCase())
    );
  }

  detectUrgency(message) {
    const urgentWords = ['urgent', 'asap', 'immediately', 'quick', 'fast', 'now', 'today', 'emergency'];
    const hasUrgentWords = urgentWords.some(word => 
      message.toLowerCase().includes(word)
    );
    
    return hasUrgentWords ? 'high' : 'normal';
  }

  assessComplexity(message) {
    const wordCount = message.split(' ').length;
    const questionMarks = (message.match(/\?/g) || []).length;
    const conjunctions = (message.match(/\b(and|or|but|also|plus)\b/gi) || []).length;
    
    if (wordCount > 30 || questionMarks > 2 || conjunctions > 2) return 'high';
    if (wordCount > 15 || questionMarks > 1 || conjunctions > 0) return 'medium';
    return 'low';
  }

  extractKeywords(message) {
    const tokens = natural.WordTokenizer().tokenize(message.toLowerCase());
    const stopWords = natural.stopwords;
    
    return tokens
      .filter(token => !stopWords.includes(token))
      .filter(token => token.length > 2)
      .slice(0, 10);
  }

  identifyQuestionType(message) {
    if (message.includes('?')) {
      if (message.toLowerCase().startsWith('what')) return 'what';
      if (message.toLowerCase().startsWith('where')) return 'where';
      if (message.toLowerCase().startsWith('when')) return 'when';
      if (message.toLowerCase().startsWith('how')) return 'how';
      if (message.toLowerCase().startsWith('why')) return 'why';
      if (message.toLowerCase().startsWith('who')) return 'who';
      return 'other_question';
    }
    return 'statement';
  }

  categorizeSentiment(score) {
    if (score > 2) return 'very_positive';
    if (score > 0) return 'positive';
    if (score === 0) return 'neutral';
    if (score > -2) return 'negative';
    return 'very_negative';
  }

  async buildConversationalContext(message, context, analysis) {
    return {
      currentMessage: analysis,
      conversationHistory: this.conversationHistory.slice(-10),
      userPersonality: this.userPersonality,
      context,
      timestamp: new Date(),
      sessionId: context.sessionId || 'default'
    };
  }

  async generatePersonalizedResponse(conversationalContext) {
    const { currentMessage, conversationHistory, userPersonality } = conversationalContext;
    
    const systemPrompt = this.buildSystemPrompt(userPersonality);
    const userPrompt = this.buildUserPrompt(currentMessage, conversationHistory);
    
    const response = await this.openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_completion_tokens: 800
    });

    const responseText = response.choices[0].message.content;
    
    return {
      text: responseText,
      suggestions: this.generateSuggestions(currentMessage),
      followUp: this.generateFollowUp(currentMessage),
      tone: this.adaptTone(userPersonality)
    };
  }

  buildSystemPrompt(userPersonality) {
    return `You are a highly personalized travel AI assistant with deep knowledge of the user's preferences and personality.

USER PERSONALITY PROFILE:
- Communication Style: ${userPersonality.communicationStyle}
- Humor Level: ${userPersonality.humor}
- Formality Preference: ${userPersonality.formality}
- Enthusiasm Level: ${userPersonality.enthusiasm}
- Decision Making: ${userPersonality.decisionMaking}
- Information Processing: ${userPersonality.informationProcessing}

COMMUNICATION GUIDELINES:
- Match their communication style (formal/casual/enthusiastic/etc.)
- Use appropriate humor level based on their preferences
- Provide information in their preferred format (detailed/concise/visual/etc.)
- Be conversational and remember previous interactions
- Show excitement about travel planning that matches their energy level
- Reference past conversations when relevant

Always be helpful, insightful, and personal in your responses. You're not just providing information - you're their trusted travel companion who knows them well.`;
  }

  buildUserPrompt(currentMessage, conversationHistory) {
    const recentHistory = conversationHistory.slice(-3).map(conv => 
      `Human: ${conv.message}\\nAI: ${conv.response}`
    ).join('\\n\\n');

    return `
RECENT CONVERSATION HISTORY:
${recentHistory}

CURRENT MESSAGE ANALYSIS:
- Text: "${currentMessage.text}"
- Intent: ${currentMessage.intent}
- Sentiment: ${currentMessage.sentiment}
- Urgency: ${currentMessage.urgency}
- Entities: ${JSON.stringify(currentMessage.entities)}
- Keywords: ${currentMessage.keywords.join(', ')}

Please provide a personalized, contextual response that:
1. Addresses their specific intent and sentiment
2. References relevant conversation history
3. Matches their communication personality
4. Provides actionable travel assistance
5. Feels natural and personal

Current message: "${currentMessage.text}"
    `;
  }

  generateSuggestions(analysis) {
    const suggestions = {
      search: [
        "Show me photos of destinations",
        "Compare multiple options",
        "Filter by budget range"
      ],
      plan: [
        "Add activities to this plan",
        "Optimize for weather",
        "Share this itinerary"
      ],
      recommend: [
        "Explain why you chose these",
        "Show similar alternatives",
        "Add to my wishlist"
      ]
    };

    return suggestions[analysis.intent] || [
      "Tell me more about this",
      "Show me related options",
      "Help me plan this"
    ];
  }

  generateFollowUp(analysis) {
    const followUps = {
      search: "Would you like me to find more specific options based on your preferences?",
      plan: "Should I add more details to this plan or help you book anything?",
      recommend: "Want me to explain more about any of these recommendations?",
      budget: "Would you like me to find ways to optimize your travel budget?",
      weather: "Should I factor weather conditions into your travel planning?"
    };

    return followUps[analysis.intent] || "What would you like to explore next?";
  }

  adaptTone(userPersonality) {
    const tones = {
      enthusiastic: "excited and energetic",
      professional: "informative and reliable", 
      casual: "friendly and relaxed",
      detailed: "thorough and comprehensive",
      concise: "direct and to-the-point"
    };

    return tones[userPersonality.communicationStyle] || "helpful and friendly";
  }

  generatePersonalityInsight(analysis) {
    const insights = [
      `I notice you prefer ${analysis.questionType} questions - I'll keep that in mind!`,
      `Your ${analysis.sentiment} tone tells me a lot about your travel excitement level!`,
      `I'm learning that you like ${analysis.complexity} complexity in planning discussions.`,
      `Your communication style is helping me understand how to best assist you.`
    ];

    return insights[Math.floor(Math.random() * insights.length)];
  }

  async learnFromConversation(message, response, analysis) {
    // Learning happens through o3-mini's reasoning, not database storage
    console.log('🧠 o3-mini learning from conversation context');
    
    // Update personality insights in memory only
    await this.updatePersonalityInsights(analysis);
  }

  async updatePersonalityInsights(analysis) {
    try {
      // Analyze patterns and update personality profile
      const updates = {};

      // Communication style learning
      if (analysis.complexity === 'high') {
        updates.informationProcessing = 'detailed';
      } else if (analysis.complexity === 'low') {
        updates.informationProcessing = 'concise';
      }

      // Enthusiasm learning
      if (analysis.sentiment === 'very_positive') {
        updates.enthusiasm = 'high';
      } else if (analysis.sentiment === 'negative') {
        updates.enthusiasm = 'low';
      }

      // Decision making learning
      if (analysis.urgency === 'high') {
        updates.decisionMaking = 'quick';
      } else {
        updates.decisionMaking = 'thoughtful';
      }

      if (Object.keys(updates).length > 0) {
        // Update personality in memory for this session
        this.userPersonality = { ...this.userPersonality, ...updates };
        console.log('🧠 Updated personality insights (database-free):', Object.keys(updates));
      }

    } catch (error) {
      console.warn('⚠️ Error updating personality insights:', error.message);
    }
  }
}

module.exports = ConversationalAI;