/**
 * AIPlanner - AI Travel Co-Pilot PWA Component
 *
 * Split-screen interface with:
 * - Interactive Leaflet Map (top 40%)
 * - Chat Interface (bottom 60%)
 * - Conversational AI for building routes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import {
  processMessage,
  createPlannerContext,
  createWelcomeMessage,
  getWazeUrl,
  interactWithAI,
  convertAIStopsToWaypoints,
  type ChatMessage,
  type RouteWaypoint,
  type PlannerContext,
  type AIResponse,
} from '../../services/aiPlanner';
import { triggerHaptic, triggerNotification } from '../../utils/haptics';
import { ChatInput } from '../chat';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Styles
const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    flexShrink: 0,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
  },
  clearButton: {
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#3B82F6',
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '8px',
  },
  mapContainer: {
    height: '40vh',
    minHeight: '200px',
    position: 'relative' as const,
    flexShrink: 0,
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '12px 16px',
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E5E7EB',
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '9999px',
    fontSize: '16px',
    outline: 'none',
  },
  sendButton: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
    cursor: 'not-allowed',
  },
  navigateFab: {
    position: 'absolute' as const,
    bottom: '16px',
    right: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '9999px',
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
    cursor: 'pointer',
    zIndex: 1000,
  },
};

// Custom marker icons
const createIcon = (color: string, emoji: string = '📍') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const MARKER_ICONS: Record<string, L.DivIcon> = {
  start: createIcon('#22C55E', '🚗'),
  destination: createIcon('#EF4444', '🎯'),
  food: createIcon('#F59E0B', '🍕'),
  rest: createIcon('#8B5CF6', '☕'),
  fuel: createIcon('#3B82F6', '⛽'),
  attraction: createIcon('#EC4899', '📸'),
};

// Map controller component
function MapController({ waypoints }: { waypoints: RouteWaypoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [waypoints, map]);

  return null;
}

// Message Bubble Component
function MessageBubble({
  message,
  onOptionSelect,
}: {
  message: ChatMessage;
  onOptionSelect: (option: string) => void;
}) {
  const isUser = message.role === 'user';

  const bubbleStyle: React.CSSProperties = {
    maxWidth: '85%',
    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    padding: '12px 16px',
    backgroundColor: isUser ? '#3B82F6' : '#F3F4F6',
    color: isUser ? 'white' : '#1F2937',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    marginBottom: '12px',
  };

  return (
    <div style={containerStyle}>
      <div style={bubbleStyle}>
        <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.5 }}>
          {message.content}
        </p>

        {/* Options */}
        {message.metadata?.options && message.metadata.options.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {message.metadata.options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  triggerHaptic('light');
                  onOptionSelect(option);
                }}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'white',
                  color: '#3B82F6',
                  border: '1px solid #DBEAFE',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Route indicator */}
        {message.metadata?.type === 'route' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#22C55E' }}>
            <MapPin size={16} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Route ready!</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Typing Indicator
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
      <div style={{
        backgroundColor: '#F3F4F6',
        borderRadius: '18px 18px 18px 4px',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot"
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#9CA3AF',
                  borderRadius: '50%',
                  animation: `typing-bounce 1.4s ease-in-out infinite`,
                  animationDelay: `${i * 160}ms`,
                }}
              />
            ))}
          </div>
          <span style={{ color: '#6B7280', fontSize: '14px', marginLeft: '4px' }}>
            Co-pilot is thinking...
          </span>
        </div>
      </div>
    </div>
  );
}

// Main AIPlanner Component
export function AIPlanner() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoute, setCurrentRoute] = useState<RouteWaypoint[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [plannerContext, setPlannerContext] = useState<PlannerContext>(createPlannerContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    const saved = localStorage.getItem('roamwise_chat');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setMessages(data.messages.map((m: ChatMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
        if (data.route) setCurrentRoute(data.route);
      } catch {
        setMessages([createWelcomeMessage()]);
      }
    } else {
      setMessages([createWelcomeMessage()]);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('roamwise_chat', JSON.stringify({
        messages,
        route: currentRoute,
      }));
    }
  }, [messages, currentRoute]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = useCallback(async (text: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    // Add user message to state
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      // Use OpenAI for real AI responses
      const aiResponse: AIResponse = await interactWithAI(text, updatedMessages);

      let aiMessage: ChatMessage;

      if (aiResponse.type === 'route') {
        // Convert AI route to waypoints
        const waypoints = convertAIStopsToWaypoints(
          aiResponse.stops,
          { lat: 32.08, lng: 34.78 } // Tel Aviv as default start
        );
        setCurrentRoute(waypoints);
        triggerNotification('success');

        aiMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse.summary || `Your route is ready! ${waypoints.length} stops planned.`,
          timestamp: new Date(),
          metadata: {
            type: 'route',
            route: waypoints,
          },
        };
      } else {
        // Question response
        aiMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: {
            type: 'question',
            options: aiResponse.options,
          },
        };
      }

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to process message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
        metadata: { type: 'info' },
      };
      setMessages((prev) => [...prev, errorMessage]);
      triggerNotification('error');
    } finally {
      setIsTyping(false);
    }
  }, [messages]);

  const handleOptionSelect = useCallback((option: string) => {
    handleSendMessage(option);
  }, [handleSendMessage]);

  const handleClearChat = () => {
    triggerHaptic('medium');
    setMessages([createWelcomeMessage()]);
    setCurrentRoute([]);
    setPlannerContext(createPlannerContext());
    localStorage.removeItem('roamwise_chat');
  };

  const handleNavigate = () => {
    const destination = currentRoute.find((w) => w.type === 'destination');
    if (destination) {
      triggerHaptic('medium');
      window.open(getWazeUrl(destination.lat, destination.lng), '_blank');
    }
  };

  // Default center (Tel Aviv)
  const defaultCenter: [number, number] = [32.0853, 34.7818];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a href="/index.html" style={styles.backButton as React.CSSProperties} aria-label="Back to app">
            <ArrowLeft size={24} />
          </a>
          <div style={styles.headerContent}>
            <Sparkles color="#3B82F6" size={24} />
            <h1 style={styles.headerTitle}>AI Co-Pilot</h1>
          </div>
        </div>
        <button onClick={handleClearChat} style={styles.clearButton}>
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Map Section (40%) */}
      <div style={styles.mapContainer}>
        <MapContainer
          center={defaultCenter}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route Polyline */}
          {currentRoute.length >= 2 && (
            <Polyline
              positions={currentRoute.map((w) => [w.lat, w.lng])}
              pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.8 }}
            />
          )}

          {/* Markers */}
          {currentRoute.map((waypoint) => (
            <Marker
              key={waypoint.id}
              position={[waypoint.lat, waypoint.lng]}
              icon={MARKER_ICONS[waypoint.type] || MARKER_ICONS.destination}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 500, margin: '0 0 4px 0' }}>{waypoint.name}</p>
                  {waypoint.duration && (
                    <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 8px 0' }}>
                      {waypoint.duration} min
                    </p>
                  )}
                  <a
                    href={getWazeUrl(waypoint.lat, waypoint.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#3B82F6',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    Navigate <ExternalLink size={12} />
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Map controller for auto-zoom */}
          <MapController waypoints={currentRoute} />
        </MapContainer>

        {/* Navigate FAB */}
        {currentRoute.length >= 2 && (
          <button onClick={handleNavigate} style={styles.navigateFab}>
            <Navigation size={18} />
            <span>Navigate</span>
          </button>
        )}
      </div>

      {/* Chat Section (60%) */}
      <div style={styles.chatContainer}>
        {/* Messages */}
        <div style={styles.messageList} className="scrollbar-hide">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onOptionSelect={handleOptionSelect}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSendMessage} disabled={isTyping} />
      </div>
    </div>
  );
}

export default AIPlanner;
