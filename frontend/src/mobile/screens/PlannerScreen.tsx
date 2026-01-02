/**
 * PlannerScreen - AI Travel Co-Pilot
 *
 * Split-screen trip planning with:
 * - Interactive Map (40% top)
 * - Chat Interface (60% bottom)
 * - Conversational AI for building routes
 * - Smart Backpack integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootTabParamList } from '../navigation/BottomTabNavigator';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';
import { InteractiveMap } from '../components/map/InteractiveMap';
import { ChatContainer } from '../components/chat';
import { ChatMessage, RouteWaypoint, ConversationState, AIPlannerContext } from '../../types';
import { processMessage, createPlannerContext, createWelcomeMessage } from '../services/aiPlanner';
import { openNavigation } from '../utils/navigation';
import { haptics } from '../utils/haptics';
import { useToast } from '../components/ui';
import { PackingManager, PackingList, TripContext } from '../features/packing';
import { BackpackModal } from '../components/planner/BackpackModal';

const STORAGE_KEY = '@roamwise/conversation';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT_RATIO = 0.35; // 35% for map

/**
 * Convert RouteWaypoints to map coordinates
 */
function waypointsToCoordinates(waypoints: RouteWaypoint[]) {
  return waypoints.map(w => ({
    latitude: w.lat,
    longitude: w.lng,
  }));
}

/**
 * Convert RouteWaypoints to map markers
 */
function waypointsToMarkers(waypoints: RouteWaypoint[]) {
  return waypoints.map(w => ({
    id: w.id,
    coordinate: { latitude: w.lat, longitude: w.lng },
    type: w.type === 'start' ? 'start' : w.type === 'destination' ? 'end' : 'waypoint',
    title: w.name,
  }));
}

/**
 * PlannerScreen Main Component
 */
export function PlannerScreen() {
  const route = useRoute<RouteProp<RootTabParamList, 'Planner'>>();
  const navigation = useNavigation();
  const { show: showToast } = useToast();

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoute, setCurrentRoute] = useState<RouteWaypoint[] | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [plannerContext, setPlannerContext] = useState<AIPlannerContext>(createPlannerContext);

  // Backpack modal state
  const [backpackVisible, setBackpackVisible] = useState(false);
  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [isLoadingBackpack, setIsLoadingBackpack] = useState(false);

  // Load conversation from storage on mount
  useEffect(() => {
    loadConversation();
  }, []);

  // Save conversation when it changes
  useEffect(() => {
    if (messages.length > 0) {
      saveConversation();
    }
  }, [messages]);

  const loadConversation = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: ConversationState = JSON.parse(stored);
        // Convert date strings back to Date objects
        const parsedMessages = data.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(parsedMessages);
        setCurrentRoute(data.currentRoute);
      } else {
        // Start fresh conversation
        setMessages([createWelcomeMessage()]);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([createWelcomeMessage()]);
    }
  };

  const saveConversation = async () => {
    try {
      const state: ConversationState = {
        messages,
        currentRoute,
        isTyping: false,
        lastUpdated: new Date(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  const handleSendMessage = useCallback(async (text: string) => {
    // Check for backpack request
    if (text.toLowerCase().includes('pack') || text.toLowerCase().includes('backpack')) {
      handleBackpackRequest();
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Process with AI
      const { response, updatedContext } = await processMessage(text, plannerContext);
      setPlannerContext(updatedContext);

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          type: response.type,
          options: response.options,
          route: response.route,
          weather: response.weather,
        },
      };
      setMessages(prev => [...prev, aiMessage]);

      // Update map if route was provided
      if (response.route && response.route.length > 0) {
        setCurrentRoute(response.route);
        haptics.notification('success');
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
        metadata: { type: 'info' },
      };
      setMessages(prev => [...prev, errorMessage]);
      haptics.notification('error');
    } finally {
      setIsTyping(false);
    }
  }, [plannerContext]);

  const handleOptionSelect = useCallback((option: string) => {
    handleSendMessage(option);
  }, [handleSendMessage]);

  const handleViewRoute = useCallback(() => {
    // Scroll map to show full route
    haptics.impact('light');
    showToast('Route shown on map', 'success');
  }, [showToast]);

  const handleNavigate = useCallback(async () => {
    if (!currentRoute || currentRoute.length < 2) {
      showToast('No route to navigate', 'warning');
      return;
    }

    haptics.impact('medium');
    const destination = currentRoute.find(w => w.type === 'destination');
    if (destination) {
      await openNavigation(destination.lat, destination.lng, destination.name);
      showToast('Opening navigation...', 'success');
      navigation.navigate('Live' as never);
    }
  }, [currentRoute, navigation, showToast]);

  const handleBackpackRequest = async () => {
    setIsLoadingBackpack(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: 'What should I pack?',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const now = new Date();
      const sunset = new Date(now);
      sunset.setHours(17, 30, 0, 0);

      const tripContext: TripContext = {
        durationHours: 8.5,
        temperature: 28,
        rainChance: 40,
        sunsetTime: sunset,
        tripEndTime: sunset,
        tags: ['Water', 'Hiking'],
      };

      const manager = new PackingManager();
      const list = await manager.generatePackingList(tripContext);
      setPackingList(list);
      setBackpackVisible(true);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: "I've prepared a smart packing list based on your trip! Check it out.",
        timestamp: new Date(),
        metadata: { type: 'suggestion' },
      };
      setMessages(prev => [...prev, aiMessage]);
      haptics.notification('success');
    } catch (error) {
      showToast('Could not generate packing list', 'warning');
    } finally {
      setIsLoadingBackpack(false);
    }
  };

  const handleClearConversation = async () => {
    haptics.impact('medium');
    setMessages([createWelcomeMessage()]);
    setCurrentRoute(null);
    setPlannerContext(createPlannerContext());
    await AsyncStorage.removeItem(STORAGE_KEY);
    showToast('Conversation cleared', 'success');
  };

  // Map data
  const mapCoordinates = currentRoute ? waypointsToCoordinates(currentRoute) : [];
  const mapMarkers = currentRoute ? waypointsToMarkers(currentRoute) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="sparkles" size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>AI Co-Pilot</Text>
        </View>
        <TouchableOpacity onPress={handleClearConversation} style={styles.clearButton}>
          <Ionicons name="refresh" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Map Section (35%) */}
      <View style={styles.mapContainer}>
        <InteractiveMap
          mode="preview"
          routePolyline={mapCoordinates}
          userLocation={null}
          markers={mapMarkers}
        />

        {/* Navigate FAB */}
        {currentRoute && currentRoute.length >= 2 && (
          <TouchableOpacity
            style={styles.navigateFab}
            onPress={handleNavigate}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate" size={20} color="#FFFFFF" />
            <Text style={styles.navigateFabText}>Navigate</Text>
          </TouchableOpacity>
        )}

        {/* Backpack FAB */}
        <TouchableOpacity
          style={styles.backpackFab}
          onPress={handleBackpackRequest}
          disabled={isLoadingBackpack}
          activeOpacity={0.8}
        >
          {isLoadingBackpack ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.backpackEmoji}>🎒</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Chat Section (65%) */}
      <View style={styles.chatContainer}>
        <ChatContainer
          messages={messages}
          onSendMessage={handleSendMessage}
          onOptionSelect={handleOptionSelect}
          onViewRoute={handleViewRoute}
          isTyping={isTyping}
          disabled={isLoadingBackpack}
        />
      </View>

      {/* Backpack Modal */}
      {packingList && (
        <BackpackModal
          visible={backpackVisible}
          packingList={packingList}
          onClose={() => setBackpackVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.sm,
  },

  // Map Section
  mapContainer: {
    height: SCREEN_HEIGHT * MAP_HEIGHT_RATIO,
    backgroundColor: colors.background,
  },

  // Navigate FAB
  navigateFab: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    ...shadows.medium,
  },
  navigateFabText: {
    color: '#FFFFFF',
    ...typography.headline,
    fontSize: 14,
  },

  // Backpack FAB
  backpackFab: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    backgroundColor: colors.secondary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  backpackEmoji: {
    fontSize: 22,
  },

  // Chat Section
  chatContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});

export default PlannerScreen;
