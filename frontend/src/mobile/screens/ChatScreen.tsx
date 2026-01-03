/**
 * ChatScreen - AI Travel Assistant Chat Interface
 *
 * Production-ready chat screen with context injection, action cards,
 * guardrails, and Hebrew-first support. Integrates with AI services
 * for personalized travel assistance.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, shadows, borderRadius } from '../theme/tokens';
import { haptics } from '../utils/haptics';

// Chat components
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { ContextBanner } from '../components/chat/ContextBanner';
import { SuggestionChips, getDefaultSuggestions } from '../components/chat/SuggestionChips';
import {
  ExtendedChatMessage,
  ActionCardCallbacks,
  SuggestionChip,
  ConversationContext,
  CurrentStateContext,
  ActionCard,
  PlaceCardData,
  DestinationCardData,
  ConfirmationCardData,
} from '../components/chat/types';

// Services
import {
  buildConversationContext,
  generateSystemPrompt,
  checkGuardrails,
  generateSuggestions,
  getAIToolDefinitions,
  getUserContext,
  updateTravelHistory,
} from '../../services/ChatContextService';
import { interactWithAI, ChatMessage as AIChatMessage } from '../../services/aiPlanner';
import { getCurrentLocation, requestLocationPermission, LatLng } from '../../services/LocationService';
import { getCurrentWeather, WeatherNow } from '../../services/weather';

// Types
import { Place, TripPlan, Destination } from '../../types';

// Navigation types
type ChatScreenParams = {
  initialMessage?: string;
  tripContext?: TripPlan;
};

type RootStackParamList = {
  Chat: ChatScreenParams;
  PlaceDetails: { place: Place };
  TripDetails: { tripId: string };
  Planner: { destination?: Destination };
  Navigation: { destination: Place };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Welcome message based on context
 */
function getWelcomeMessage(context: ConversationContext, language: 'he' | 'en'): ExtendedChatMessage {
  const hasActiveTrip = context.currentState.activeTrip !== null;
  const userName = context.userProfile.name || (language === 'he' ? 'מטייל' : 'Traveler');

  let content: string;
  let suggestions: SuggestionChip[];

  if (hasActiveTrip && context.currentState.activeTrip) {
    const tripDest = context.currentState.activeTrip.destination;
    content = language === 'he'
      ? `שלום ${userName}! 👋 אני כאן לעזור לך בטיול ל${tripDest}. איך אפשר לסייע?`
      : `Hi ${userName}! 👋 I'm here to help you with your trip to ${tripDest}. How can I assist?`;
    suggestions = getDefaultSuggestions('active_trip', language);
  } else {
    content = language === 'he'
      ? `שלום ${userName}! 👋 אני העוזר האישי שלך לטיולים. אפשר לשאול אותי על יעדים, לתכנן טיול, או לקבל המלצות מותאמות אישית.`
      : `Hi ${userName}! 👋 I'm your personal travel assistant. Ask me about destinations, plan a trip, or get personalized recommendations.`;
    suggestions = getDefaultSuggestions('idle', language);
  }

  return {
    id: generateMessageId(),
    role: 'assistant',
    content,
    timestamp: new Date(),
    suggestions,
    metadata: { type: 'info' },
  };
}

/**
 * Parse AI response for action cards
 */
function parseActionCardsFromResponse(
  response: string,
  _context: ConversationContext
): ActionCard[] {
  // In production, the AI would return structured data with action cards
  // This parser extracts any embedded place/destination recommendations
  const actionCards: ActionCard[] = [];

  // Pattern matching for place mentions (simplified - real implementation would use AI-structured output)
  // The AI service should return structured data, not rely on parsing

  return actionCards;
}

/**
 * Main ChatScreen Component
 */
export function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();

  // Language setting (Hebrew-first)
  const [language] = useState<'he' | 'en'>('he');

  // State
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [currentState, setCurrentState] = useState<CurrentStateContext | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionChip[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const messageHistoryRef = useRef<AIChatMessage[]>([]);

  // Animation for header
  const headerOpacity = useRef(new Animated.Value(0)).current;

  /**
   * Initialize chat context
   */
  useEffect(() => {
    async function initializeChat() {
      try {
        setIsLoading(true);
        setError(null);

        // Request location permission
        const locationGranted = await requestLocationPermission();

        // Get current location and weather
        let location: LatLng | null = null;
        let weather: WeatherNow | null = null;

        if (locationGranted) {
          try {
            location = await getCurrentLocation();
            if (location) {
              weather = await getCurrentWeather(location.lat, location.lng);
            }
          } catch (locError) {
            console.warn('Failed to get location/weather:', locError);
          }
        }

        // Get active trip from route params or storage
        const activeTrip = route.params?.tripContext || null;

        // Build conversation context
        const conversationContext = await buildConversationContext(
          location,
          weather,
          activeTrip
        );

        setContext(conversationContext);
        setCurrentState(conversationContext.currentState);

        // Generate initial suggestions
        const initialSuggestions = generateSuggestions(conversationContext);
        setSuggestions(initialSuggestions);

        // Add welcome message
        const welcomeMessage = getWelcomeMessage(conversationContext, language);
        setMessages([welcomeMessage]);

        // Handle initial message if provided
        if (route.params?.initialMessage) {
          // Wait a bit before sending initial message
          setTimeout(() => {
            handleSendMessage(route.params!.initialMessage!);
          }, 500);
        }

        // Animate header in
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

      } catch (err) {
        console.error('Failed to initialize chat:', err);
        setError(language === 'he'
          ? 'שגיאה בטעינת הצ\'אט. נסה שוב.'
          : 'Failed to load chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    initializeChat();
  }, [route.params?.tripContext, route.params?.initialMessage, language, headerOpacity]);

  /**
   * Scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  /**
   * Action card callbacks
   */
  const actionCallbacks: ActionCardCallbacks = useMemo(() => ({
    onAddToTrip: async (place: Place, tripId?: string) => {
      haptics.notification('success');

      // Add confirmation message
      const confirmationCard: ConfirmationCardData = {
        id: generateMessageId(),
        action: 'added_to_trip',
        title: language === 'he' ? 'נוסף לטיול!' : 'Added to Trip!',
        description: language === 'he'
          ? `${place.name} נוסף לתכנית הטיול שלך`
          : `${place.name} has been added to your trip plan`,
        relatedItem: {
          type: 'place',
          id: place.id,
          name: place.name,
        },
        canUndo: true,
        undoExpiry: new Date(Date.now() + 10000), // 10 seconds to undo
      };

      const confirmMessage: ExtendedChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: language === 'he'
          ? `מעולה! הוספתי את ${place.name} לטיול שלך.`
          : `Great! I've added ${place.name} to your trip.`,
        timestamp: new Date(),
        actionCards: [{
          id: confirmationCard.id,
          type: 'confirmation',
          data: confirmationCard,
        }],
      };

      setMessages(prev => [...prev, confirmMessage]);

      // Update travel history
      await updateTravelHistory({ savedPlaces: [place.id] });
    },

    onNavigate: (place: Place) => {
      haptics.impact('medium');

      // Open in maps or internal navigation
      const url = Platform.select({
        ios: `maps:?daddr=${place.location.lat},${place.location.lng}`,
        android: `google.navigation:q=${place.location.lat},${place.location.lng}`,
        default: `https://maps.google.com/?daddr=${place.location.lat},${place.location.lng}`,
      });

      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            language === 'he' ? 'שגיאה' : 'Error',
            language === 'he' ? 'לא ניתן לפתוח ניווט' : 'Cannot open navigation'
          );
        }
      });
    },

    onSave: async (place: Place) => {
      haptics.notification('success');

      const confirmMessage: ExtendedChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: language === 'he'
          ? `שמרתי את ${place.name} לרשימת המועדפים שלך! ❤️`
          : `Saved ${place.name} to your favorites! ❤️`,
        timestamp: new Date(),
        actionCards: [{
          id: generateMessageId(),
          type: 'confirmation',
          data: {
            id: generateMessageId(),
            action: 'saved_to_bucket_list',
            title: language === 'he' ? 'נשמר!' : 'Saved!',
            description: place.name,
            canUndo: true,
            undoExpiry: new Date(Date.now() + 10000),
          } as ConfirmationCardData,
        }],
      };

      setMessages(prev => [...prev, confirmMessage]);
      await updateTravelHistory({ savedPlaces: [place.id] });
    },

    onViewDetails: (place: Place) => {
      haptics.impact('light');
      navigation.navigate('PlaceDetails', { place });
    },

    onStartPlanning: (destination: string) => {
      haptics.impact('medium');
      navigation.navigate('Planner', {
        destination: { name: destination, country: '' } as Destination,
      });
    },

    onAddToBucketList: async (destination: string) => {
      haptics.notification('success');

      const confirmMessage: ExtendedChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: language === 'he'
          ? `${destination} נוסף לרשימת החלומות שלך! 🌍`
          : `${destination} added to your bucket list! 🌍`,
        timestamp: new Date(),
        actionCards: [{
          id: generateMessageId(),
          type: 'confirmation',
          data: {
            id: generateMessageId(),
            action: 'saved_to_bucket_list',
            title: language === 'he' ? 'נוסף לרשימה!' : 'Added to List!',
            description: destination,
            canUndo: true,
            undoExpiry: new Date(Date.now() + 10000),
          } as ConfirmationCardData,
        }],
      };

      setMessages(prev => [...prev, confirmMessage]);
    },

    onViewItinerary: (tripId: string) => {
      haptics.impact('light');
      navigation.navigate('TripDetails', { tripId });
    },

    onUndo: async (confirmationId: string): Promise<boolean> => {
      // Find and remove the action
      // In production, this would call the appropriate undo API
      haptics.notification('success');

      setMessages(prev => prev.filter(msg => {
        if (msg.actionCards) {
          return !msg.actionCards.some(card => card.id === confirmationId);
        }
        return true;
      }));

      return true;
    },

    onOpenBookingLink: (url: string, provider: string) => {
      haptics.impact('light');

      Alert.alert(
        language === 'he' ? 'פתיחת קישור' : 'Opening Link',
        language === 'he'
          ? `אתה עומד לעבור ל-${provider} להזמנה`
          : `You'll be redirected to ${provider} for booking`,
        [
          { text: language === 'he' ? 'ביטול' : 'Cancel', style: 'cancel' },
          {
            text: language === 'he' ? 'המשך' : 'Continue',
            onPress: () => Linking.openURL(url),
          },
        ]
      );
    },
  }), [language, navigation]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending || !context) return;

    haptics.impact('light');
    setIsSending(true);
    setIsTyping(true);
    setError(null);

    // Add user message
    const userMessage: ExtendedChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Check guardrails
    const guardrailCheck = checkGuardrails(text);
    if (!guardrailCheck.allowed) {
      // Add polite redirect message
      const redirectMessage: ExtendedChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: guardrailCheck.response || (language === 'he'
          ? 'אני מתמחה בנושאי טיולים ונסיעות. אשמח לעזור לך בתכנון הטיול הבא שלך! 🌍'
          : "I specialize in travel topics. I'd be happy to help you plan your next trip! 🌍"),
        timestamp: new Date(),
        suggestions: getDefaultSuggestions('idle', language),
        metadata: { type: 'info' },
      };

      setMessages(prev => [...prev, redirectMessage]);
      setIsSending(false);
      setIsTyping(false);
      return;
    }

    try {
      // Build message history for AI
      const systemPrompt = generateSystemPrompt(context);

      // Add to message history
      messageHistoryRef.current.push({
        id: userMessage.id,
        role: 'user',
        content: text,
        timestamp: new Date(),
      });

      // Get AI response
      const aiResponse = await interactWithAI(text, messageHistoryRef.current);

      // Parse action cards from response
      const actionCards = parseActionCardsFromResponse(aiResponse.content, context);

      // Generate new suggestions based on conversation
      const newSuggestions = generateSuggestions(context);

      // Create assistant message
      const assistantMessage: ExtendedChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        actionCards: actionCards.length > 0 ? actionCards : undefined,
        suggestions: newSuggestions.slice(0, 4),
        metadata: aiResponse.metadata,
      };

      // Add to history
      messageHistoryRef.current.push({
        id: assistantMessage.id,
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
      });

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(newSuggestions);

    } catch (err) {
      console.error('AI interaction error:', err);

      const errorMessage: ExtendedChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: language === 'he'
          ? 'מצטער, נתקלתי בבעיה. אנא נסה שוב.'
          : 'Sorry, I encountered an issue. Please try again.',
        timestamp: new Date(),
        metadata: { type: 'error' },
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(language === 'he' ? 'שגיאה בתקשורת' : 'Communication error');
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  }, [context, isSending, language]);

  /**
   * Handle suggestion chip press
   */
  const handleSuggestionPress = useCallback((chip: SuggestionChip) => {
    haptics.selection();

    switch (chip.action.type) {
      case 'send_message':
        if (chip.action.text) {
          handleSendMessage(chip.action.text);
        }
        break;
      case 'start_planning':
        navigation.navigate('Planner', {});
        break;
      case 'show_weather':
        if (currentState?.weather) {
          const weatherMessage: ExtendedChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: language === 'he'
              ? `מזג האוויר כרגע: ${currentState.weather.condition}, ${Math.round(currentState.weather.temperature)}°C. מרגיש כמו ${Math.round(currentState.weather.feelsLike)}°C.`
              : `Current weather: ${currentState.weather.condition}, ${Math.round(currentState.weather.temperature)}°C. Feels like ${Math.round(currentState.weather.feelsLike)}°C.`,
            timestamp: new Date(),
            metadata: { type: 'weather' },
          };
          setMessages(prev => [...prev, weatherMessage]);
        } else {
          handleSendMessage(language === 'he' ? 'מה מזג האוויר?' : "What's the weather?");
        }
        break;
      case 'open_screen':
        if (chip.action.screen) {
          navigation.navigate(chip.action.screen as any, {});
        }
        break;
      case 'navigate':
        // Handle navigation action
        break;
    }
  }, [handleSendMessage, navigation, currentState, language]);

  /**
   * Handle option select from message
   */
  const handleOptionSelect = useCallback((option: string) => {
    handleSendMessage(option);
  }, [handleSendMessage]);

  /**
   * Render message item
   */
  const renderMessage = useCallback(({ item, index }: { item: ExtendedChatMessage; index: number }) => {
    const isLastMessage = index === messages.length - 1;

    return (
      <MessageBubble
        message={item}
        callbacks={actionCallbacks}
        onOptionSelect={handleOptionSelect}
        onSuggestionPress={handleSuggestionPress}
        language={language}
        isLastMessage={isLastMessage && item.role === 'assistant'}
      />
    );
  }, [messages.length, actionCallbacks, handleOptionSelect, handleSuggestionPress, language]);

  /**
   * Key extractor
   */
  const keyExtractor = useCallback((item: ExtendedChatMessage) => item.id, []);

  /**
   * Render header
   */
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>
            {language === 'he' ? 'עוזר הטיולים' : 'Travel Assistant'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isTyping
              ? (language === 'he' ? 'מקליד...' : 'Typing...')
              : (language === 'he' ? 'מחובר' : 'Online')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => {
          haptics.selection();
          // Show chat options menu
          Alert.alert(
            language === 'he' ? 'אפשרויות' : 'Options',
            undefined,
            [
              {
                text: language === 'he' ? 'נקה שיחה' : 'Clear Chat',
                onPress: () => {
                  setMessages([]);
                  messageHistoryRef.current = [];
                  if (context) {
                    setMessages([getWelcomeMessage(context, language)]);
                  }
                },
                style: 'destructive',
              },
              {
                text: language === 'he' ? 'ביטול' : 'Cancel',
                style: 'cancel',
              },
            ]
          );
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'he' ? 'טוען...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Error state
   */
  if (error && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              // Re-initialize
            }}
          >
            <Text style={styles.retryText}>
              {language === 'he' ? 'נסה שוב' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Context Banner */}
        {currentState && (
          <ContextBanner
            currentState={currentState}
            onTripPress={() => {
              if (currentState.activeTrip) {
                navigation.navigate('TripDetails', { tripId: currentState.activeTrip.id });
              }
            }}
            onLocationPress={() => {
              // Show location on map
            }}
            onWeatherPress={() => {
              if (currentState.weather) {
                handleSendMessage(language === 'he' ? 'ספר לי על מזג האוויר' : 'Tell me about the weather');
              }
            }}
            language={language}
          />
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>
                {language === 'he' ? 'התחל שיחה חדשה' : 'Start a new conversation'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, styles.typingDotMiddle]} />
                <View style={styles.typingDot} />
              </View>
            ) : null
          }
        />

        {/* Suggestion Chips */}
        {suggestions.length > 0 && !isSending && (
          <SuggestionChips
            suggestions={suggestions}
            onChipPress={handleSuggestionPress}
            language={language}
            isLoading={isSending}
            maxVisible={4}
          />
        )}

        {/* Chat Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isSending}
          placeholder={language === 'he' ? 'שאל אותי משהו...' : 'Ask me anything...'}
        />
      </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    ...shadows.small,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    gap: spacing.sm,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption1,
    color: colors.success,
  },
  menuButton: {
    padding: spacing.xs,
  },

  // Content
  keyboardAvoid: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  retryText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },

  // Typing indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  typingDotMiddle: {
    opacity: 0.7,
  },
});

export default ChatScreen;
