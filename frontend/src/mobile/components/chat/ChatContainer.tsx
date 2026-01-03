/**
 * ChatContainer Component
 *
 * Main container for the chat interface.
 * Manages message list, auto-scrolling, and keyboard avoidance.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { ChatMessage } from '../../../types';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

interface ChatContainerProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onOptionSelect: (option: string) => void;
  onViewRoute?: () => void;
  isTyping: boolean;
  disabled?: boolean;
}

export function ChatContainer({
  messages,
  onSendMessage,
  onOptionSelect,
  onViewRoute,
  isTyping,
  disabled = false,
}: ChatContainerProps) {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isTyping]);

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      onOptionSelect={onOptionSelect}
      onViewRoute={onViewRoute}
    />
  );

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.typingText}>Co-pilot is thinking...</Text>
        </View>
      </View>
    );
  };

  const keyExtractor = (item: ChatMessage) => item.id;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderTypingIndicator}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />
      <ChatInput
        onSend={onSendMessage}
        disabled={disabled || isTyping}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  typingContainer: {
    marginVertical: 4,
    marginHorizontal: 12,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  typingText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ChatContainer;
