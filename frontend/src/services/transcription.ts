/**
 * Transcription Service - Groq Whisper Integration via Proxy
 *
 * Uses the proxy's /whisper-intent endpoint which connects to Groq's whisper-large-v3-turbo model.
 * This keeps API keys secure on the server side.
 * Supports Hebrew and English audio transcription.
 */

import { config } from '../config/env';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  intent?: {
    intent: string;
    params: Record<string, unknown>;
    response?: string;
  };
}

export interface TranscriptionError {
  code: string;
  message: string;
}

/**
 * Transcribe audio blob to text using proxy's Whisper endpoint
 *
 * @param audioBlob - Audio blob from MediaRecorder (webm format)
 * @param language - Optional language hint (default: 'he' for Hebrew)
 * @returns Transcribed text
 * @throws Error if transcription fails
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language: string = 'he'
): Promise<string> {
  // Validate audio blob
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('No audio data to transcribe');
  }

  // Build form data for proxy endpoint
  const formData = new FormData();

  // Determine file extension based on MIME type
  const extension = audioBlob.type.includes('webm') ? 'webm'
    : audioBlob.type.includes('mp4') ? 'm4a'
    : audioBlob.type.includes('wav') ? 'wav'
    : 'webm';

  formData.append('audio', audioBlob, `recording.${extension}`);
  formData.append('language', language);

  try {
    // Use proxy endpoint instead of calling Groq directly
    const response = await fetch(`${config.api.proxyUrl}/whisper-intent`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      // Handle specific error codes
      if (response.status === 413) {
        throw new Error('Audio file too large (max 25MB)');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      } else if (response.status === 503) {
        throw new Error('Voice service temporarily unavailable');
      }

      throw new Error(`Transcription failed: ${errorMessage}`);
    }

    const data = await response.json();

    // Check for mock response (API not fully configured)
    if (data.mock) {
      console.warn('[Transcription] Using mock response - API not fully configured');
    }

    // Check for error in response
    if (!data.ok) {
      throw new Error(data.error || 'Transcription failed');
    }

    // Return the transcribed text
    return data.text?.trim() || '';
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
