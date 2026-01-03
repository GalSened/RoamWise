/**
 * Chat Components
 *
 * Production-ready UI components for the AI Travel Co-Pilot chat interface.
 * Includes action cards, context banners, suggestion chips, and message bubbles.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

// Core chat components
export { MessageBubble } from './MessageBubble';
export { ChatInput } from './ChatInput';
export { ChatContainer } from './ChatContainer';

// Action card components
export { ActionCard } from './ActionCard';
export { PlaceCard } from './PlaceCard';
export { DestinationCard } from './DestinationCard';
export { ConfirmationCard } from './ConfirmationCard';

// Context and suggestion components
export { ContextBanner } from './ContextBanner';
export { SuggestionChips, getDefaultSuggestions } from './SuggestionChips';

// Types
export type {
  // Message types
  ExtendedChatMessage,
  ChatMessageMetadata,

  // Action card types
  ActionCard as ActionCardType,
  ActionCardData,
  PlaceCardData,
  DestinationCardData,
  ConfirmationCardData,
  ConfirmationAction,

  // Suggestion types
  SuggestionChip,
  SuggestionAction,

  // Context types
  ConversationContext,
  CurrentStateContext,
  ActiveTripContext,
  TodaysPlanContext,
  TravelHistoryContext,
  UserProfileContext,
  TravelDNAContext,
  UserPreferencesContext,

  // Callback types
  ActionCardCallbacks,
} from './types';
