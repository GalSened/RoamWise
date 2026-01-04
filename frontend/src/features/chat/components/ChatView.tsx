/**
 * ChatView - AI Travel Assistant Chat Interface
 * Features: Messages, suggestions, action cards, voice input
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTripStore, useUserStore, useAppStore } from '@/stores';
import { MessageList, type ChatMessage } from './MessageList';
import { SuggestionChips } from './SuggestionChips';
import { ActionCard, type AIAction } from './ActionCard';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI travel co-pilot 🌍 I can help you plan trips, find activities, get recommendations, and more. What would you like to explore today?",
  timestamp: new Date(),
};

const INITIAL_SUGGESTIONS = [
  { id: '1', text: 'Plan a weekend trip', emoji: '✈️' },
  { id: '2', text: 'Find restaurants nearby', emoji: '🍽️' },
  { id: '3', text: "What's the weather?", emoji: '☀️' },
  { id: '4', text: 'Recommend activities', emoji: '🎯' },
];

export function ChatView() {
  const { activeTrip } = useTripStore();
  const { user } = useUserStore();
  const { setCurrentView } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response (would call real AI in production)
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

    const aiResponse = generateMockResponse(text, activeTrip?.destination);

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      action: aiResponse.action,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);

    if (aiResponse.action) {
      setPendingAction(aiResponse.action);
    }
  }, [activeTrip]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSend(suggestion);
  }, [handleSend]);

  const handleActionClick = useCallback((action: AIAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.location) {
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${action.location.lat},${action.location.lng}`,
            '_blank'
          );
        }
        break;
      case 'book':
        // Would integrate with booking system
        console.log('Book action:', action);
        break;
      case 'add-to-trip':
        // Would add to trip
        console.log('Add to trip:', action);
        break;
      case 'view-details':
        // Would show details modal
        console.log('View details:', action);
        break;
      case 'plan-trip':
        setCurrentView('trip');
        break;
    }
    setPendingAction(null);
  }, [setCurrentView]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  }, [inputText, handleSend]);

  const showSuggestions = messages.length <= 2;

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="chat-avatar">🤖</span>
          <div className="chat-header-text">
            <h1 className="chat-title">AI Travel Assistant</h1>
            <span className="chat-status">
              {activeTrip ? `Helping with: ${activeTrip.name}` : 'Ready to help'}
            </span>
          </div>
        </div>
        <button className="chat-new-btn" onClick={() => setMessages([WELCOME_MESSAGE])}>
          + New Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        <MessageList messages={messages} />

        {/* Typing Indicator */}
        {isTyping && (
          <div className="typing-indicator">
            <span className="typing-avatar">🤖</span>
            <div className="typing-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}

        {/* Action Card */}
        {pendingAction && (
          <ActionCard action={pendingAction} onAction={handleActionClick} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <SuggestionChips
          suggestions={INITIAL_SUGGESTIONS}
          onSelect={handleSuggestionClick}
        />
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask anything about travel..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="voice-btn" aria-label="Voice input">
            🎤
          </button>
        </div>
        <button
          className="send-btn"
          onClick={() => handleSend(inputText)}
          disabled={!inputText.trim()}
        >
          <span className="send-icon">↑</span>
        </button>
      </div>
    </div>
  );
}

// Mock AI response generator
function generateMockResponse(
  input: string,
  destination?: string
): { content: string; action?: AIAction } {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('restaurant') || lowerInput.includes('food') || lowerInput.includes('eat')) {
    return {
      content: `I found some great dining options ${destination ? `in ${destination}` : 'nearby'}! Here's a top recommendation:`,
      action: {
        type: 'view-details',
        label: 'View Restaurant',
        data: {
          name: 'La Petite Cuisine',
          rating: 4.8,
          price: '$$',
          category: 'French',
        },
      },
    };
  }

  if (lowerInput.includes('weather')) {
    return {
      content: `The weather ${destination ? `in ${destination}` : 'at your destination'} looks great! 🌤️\n\n**Today:** 24°C, Partly cloudy\n**Tomorrow:** 26°C, Sunny\n**This Week:** Mild with occasional clouds\n\nPerfect for outdoor activities!`,
    };
  }

  if (lowerInput.includes('plan') || lowerInput.includes('trip')) {
    return {
      content: "I'd love to help you plan a trip! Let me guide you through our trip planner where you can set your destination, dates, and preferences.",
      action: {
        type: 'plan-trip',
        label: 'Start Planning',
      },
    };
  }

  if (lowerInput.includes('activities') || lowerInput.includes('recommend') || lowerInput.includes('things to do')) {
    return {
      content: `Here are some recommended activities ${destination ? `in ${destination}` : 'for your trip'}:\n\n1. 🏛️ Historical Walking Tour - Explore the old town\n2. 🍽️ Food Market Visit - Taste local flavors\n3. 🌳 Park & Gardens - Relaxing afternoon\n4. 🎭 Evening Show - Local entertainment\n\nWould you like details on any of these?`,
    };
  }

  if (lowerInput.includes('nearby') || lowerInput.includes('close')) {
    return {
      content: "Let me find what's nearby...",
      action: {
        type: 'navigate',
        label: 'Open Maps',
        location: { lat: 48.8566, lng: 2.3522 },
      },
    };
  }

  // Default response
  return {
    content: `That's a great question! I'm here to help with:\n\n• 🗺️ Trip planning\n• 🍽️ Restaurant recommendations\n• 🏛️ Activity suggestions\n• 📍 Navigation help\n• ☀️ Weather updates\n\nWhat would you like to explore?`,
  };
}
