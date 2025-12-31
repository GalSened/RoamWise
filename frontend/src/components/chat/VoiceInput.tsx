/**
 * VoiceInput Component - Microphone button with recording states
 *
 * Uses MediaRecorder API to capture audio and Groq Whisper for transcription.
 * States: idle (gray), recording (red pulsing), processing (spinner)
 */

import React, { useState, useRef, useCallback } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import {
  transcribeAudio,
  isRecordingSupported,
  requestMicrophonePermission,
  getSupportedMimeType,
} from '../../services/transcription';

export interface VoiceInputProps {
  /** Called when transcription completes with the text */
  onTranscription: (text: string) => void;
  /** Called on error with error message */
  onError?: (error: string) => void;
  /** Disable the button */
  disabled?: boolean;
  /** Language hint for transcription (e.g., 'he' for Hebrew) */
  language?: string;
  /** Custom class name */
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function VoiceInput({
  onTranscription,
  onError,
  disabled = false,
  language,
  className = '',
}: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if recording is supported
  const isSupported = isRecordingSupported();

  const handleError = useCallback(
    (message: string) => {
      console.error('[VoiceInput]', message);
      if (onError) {
        onError(message);
      } else {
        // Default: show alert
        alert(message);
      }
    },
    [onError]
  );

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      handleError('Audio recording is not supported in this browser');
      return;
    }

    try {
      // Request microphone permission
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;

      // Get supported MIME type
      const mimeType = getSupportedMimeType();

      // Create MediaRecorder
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        setState('processing');

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });

        // Check if we have audio data
        if (audioBlob.size === 0) {
          handleError('No audio recorded. Please try again.');
          setState('idle');
          return;
        }

        try {
          // Transcribe using Groq Whisper
          const text = await transcribeAudio(audioBlob, language);

          if (text && text.trim()) {
            onTranscription(text.trim());
          } else {
            handleError('No speech detected. Please try again.');
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Transcription failed. Please try again.';
          handleError(message);
        } finally {
          setState('idle');
        }
      };

      // Handle errors
      mediaRecorder.onerror = () => {
        handleError('Recording error occurred');
        setState('idle');
      };

      // Start recording
      mediaRecorder.start();
      setState('recording');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to start recording';
      handleError(message);
      setState('idle');
    }
  }, [isSupported, language, onTranscription, handleError]);

  const handleClick = useCallback(() => {
    if (disabled || !isSupported) return;

    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
    // Don't do anything if processing
  }, [disabled, isSupported, state, startRecording, stopRecording]);

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  // Button styles based on state
  const getButtonStyles = () => {
    const baseStyles =
      'w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    if (disabled) {
      return `${baseStyles} bg-gray-100 text-gray-300 cursor-not-allowed`;
    }

    switch (state) {
      case 'recording':
        return `${baseStyles} bg-red-500 text-white animate-pulse focus:ring-red-500 hover:bg-red-600`;
      case 'processing':
        return `${baseStyles} bg-gray-200 text-gray-500 cursor-wait`;
      default:
        return `${baseStyles} bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:ring-blue-500`;
    }
  };

  const getAriaLabel = () => {
    switch (state) {
      case 'recording':
        return 'Stop recording';
      case 'processing':
        return 'Processing audio...';
      default:
        return 'Start voice input';
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === 'processing'}
      className={`${getButtonStyles()} ${className}`}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      {state === 'processing' ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}

export default VoiceInput;
