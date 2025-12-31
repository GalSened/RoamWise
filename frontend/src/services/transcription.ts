/**
 * Transcription Service - Groq Whisper Integration
 *
 * Uses Groq's whisper-large-v3-turbo model for speech-to-text.
 * Supports Hebrew and English audio transcription.
 */

import { config } from '../config/env';

const WHISPER_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface TranscriptionError {
  code: string;
  message: string;
}

/**
 * Transcribe audio blob to text using Groq Whisper API
 *
 * @param audioBlob - Audio blob from MediaRecorder (webm format)
 * @param language - Optional language hint (default: auto-detect)
 * @returns Transcribed text
 * @throws Error if transcription fails
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language?: string
): Promise<string> {
  // Check if Groq is configured
  if (!config.groq.isConfigured) {
    throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY in .env');
  }

  // Validate audio blob
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('No audio data to transcribe');
  }

  // Build form data
  const formData = new FormData();

  // Determine file extension based on MIME type
  const extension = audioBlob.type.includes('webm') ? 'webm'
    : audioBlob.type.includes('mp4') ? 'm4a'
    : audioBlob.type.includes('wav') ? 'wav'
    : 'webm';

  formData.append('file', audioBlob, `recording.${extension}`);
  formData.append('model', 'whisper-large-v3-turbo');

  // Add language hint if provided (improves accuracy)
  if (language) {
    formData.append('language', language);
  }

  try {
    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groq.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('Invalid Groq API key');
      } else if (response.status === 413) {
        throw new Error('Audio file too large (max 25MB)');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      }

      throw new Error(`Transcription failed: ${errorMessage}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.text && data.text !== '') {
      throw new Error('Invalid response from transcription API');
    }

    return data.text.trim();
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof Error) {
      throw error;
    }

    // Handle network errors
    throw new Error('Network error during transcription. Please check your connection.');
  }
}

/**
 * Check if the browser supports audio recording
 */
export function isRecordingSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

/**
 * Request microphone permission
 * @returns MediaStream if permission granted
 * @throws Error if permission denied
 */
export async function requestMicrophonePermission(): Promise<MediaStream> {
  if (!isRecordingSupported()) {
    throw new Error('Audio recording is not supported in this browser');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000, // Whisper works best with 16kHz
      }
    });
    return stream;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow access in your browser settings.');
      }
      if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone.');
      }
    }
    throw new Error('Failed to access microphone');
  }
}

/**
 * Get supported MIME type for MediaRecorder
 */
export function getSupportedMimeType(): string {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  // Fallback - let the browser choose
  return '';
}
