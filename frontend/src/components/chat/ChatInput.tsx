/**
 * ChatInput Component - Text input with voice and send buttons
 *
 * Features:
 * - Text input field
 * - Voice input (Groq Whisper transcription)
 * - Send button
 * - Haptic feedback on send
 */

import React, { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { triggerHaptic } from '../../utils/haptics';

export interface ChatInputProps {
  /** Called when user sends a message */
  onSend: (text: string) => void;
  /** Disable input and buttons */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Language hint for voice transcription (e.g., 'he' for Hebrew) */
  voiceLanguage?: string;
  /** Show voice input button */
  showVoiceInput?: boolean;
}

// Inline styles to match existing AIPlanner styling
const styles = {
  container: {
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
};

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask your travel co-pilot...',
  voiceLanguage,
  showVoiceInput = true,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    triggerHaptic('light');
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  }, [text, disabled, onSend]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleTranscription = useCallback((transcribedText: string) => {
    // Set transcribed text in input for user to review/edit
    setText(transcribedText);
    // Focus the input so user can edit or press Enter to send
    inputRef.current?.focus();
    // Haptic feedback
    triggerHaptic('light');
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    console.warn('[ChatInput] Voice error:', error);
    // Could show a toast here, but for now just log
  }, []);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div style={styles.container}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        style={styles.input}
        aria-label="Message input"
      />

      {showVoiceInput && (
        <VoiceInput
          onTranscription={handleTranscription}
          onError={handleVoiceError}
          disabled={disabled}
          language={voiceLanguage}
        />
      )}

      <button
        onClick={handleSend}
        disabled={!canSend}
        style={{
          ...styles.sendButton,
          ...(canSend ? {} : styles.sendButtonDisabled),
        }}
        aria-label="Send message"
      >
        <Send size={20} />
      </button>
    </div>
  );
}

export default ChatInput;
