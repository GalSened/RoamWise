import type { VoiceIntent } from '@/types';
import { AppError } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';
import { config } from '@/config/env';

interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

interface STTProvider {
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): boolean;
  isSupported(): boolean;
}

// Web Speech API types (not available in all TypeScript libs)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

/**
 * Groq Whisper STT Provider - Uses MediaRecorder and proxy /whisper-intent endpoint
 * Much better Hebrew support than Web Speech API
 */
class WhisperSTTProvider implements STTProvider {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isActive = false;
  private config: VoiceConfig;
  private eventBus: EventBus;

  constructor(config: VoiceConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
  }

  async startListening(): Promise<void> {
    if (this.isActive) return;

    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get supported MIME type
      const mimeType = this.getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        this.isActive = false;
        this.eventBus.emit('stt-processing');

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        // Create audio blob
        const audioBlob = new Blob(this.audioChunks, { type: mimeType || 'audio/webm' });

        if (audioBlob.size === 0) {
          this.eventBus.emit('stt-error', 'No audio recorded');
          this.eventBus.emit('stt-ended');
          return;
        }

        try {
          // Send to Whisper endpoint
          const result = await this.transcribeWithWhisper(audioBlob);

          this.eventBus.emit('stt-result', {
            transcript: result.text,
            confidence: 0.95,
            intent: result.intent,
            response: result.response
          });
          telemetry.track('voice_whisper_success', {
            provider: result.providers?.whisper || 'groq',
            text_length: result.text.length
          });
        } catch (error) {
          console.error('[WhisperSTT] Transcription failed:', error);
          this.eventBus.emit('stt-error', error.message || 'Transcription failed');
          telemetry.track('voice_whisper_error', { error: error.message });
        } finally {
          this.eventBus.emit('stt-ended');
        }
      };

      this.mediaRecorder.onerror = () => {
        this.isActive = false;
        this.eventBus.emit('stt-error', 'Recording error');
        this.eventBus.emit('stt-ended');
      };

      // Start recording
      this.mediaRecorder.start();
      this.isActive = true;
      this.eventBus.emit('stt-started');
      telemetry.track('voice_whisper_started');

    } catch (error) {
      throw new AppError(
        error.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access.'
          : 'Failed to start recording',
        'STT_START_FAILED'
      );
    }
  }

  async stopListening(): Promise<void> {
    if (!this.mediaRecorder || !this.isActive) return;
    this.mediaRecorder.stop();
  }

  isListening(): boolean {
    return this.isActive;
  }

  isSupported(): boolean {
    return !!(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
  }

  private getSupportedMimeType(): string | undefined {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    return mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
  }

  private async transcribeWithWhisper(audioBlob: Blob): Promise<{
    text: string;
    intent?: any;
    response?: string;
    providers?: { whisper: string; chat: string };
  }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', this.config.language.split('-')[0]); // 'he' from 'he-IL'

    const response = await fetch(`${config.api.proxyUrl}/whisper-intent`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${error}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Transcription failed');
    }

    // Check for mock response
    if (data.mock) {
      console.warn('[WhisperSTT] Using mock response - API not fully configured');
    }

    return data;
  }
}

/**
 * Fallback Web Speech STT Provider - Browser-based speech recognition
 */
class WebSpeechSTTProvider implements STTProvider {
  private recognition?: SpeechRecognition;
  private isActive = false;
  private config: VoiceConfig;
  private eventBus: EventBus;

  constructor(config: VoiceConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (!this.isSupported()) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    this.recognition = new SpeechRecognitionClass();

    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onstart = () => {
      this.isActive = true;
      this.eventBus.emit('stt-started');
      telemetry.track('voice_recognition_started');
    };

    this.recognition.onend = () => {
      this.isActive = false;
      this.eventBus.emit('stt-ended');
      telemetry.track('voice_recognition_ended');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results: SpeechRecognitionResult[] = [];
      for (let i = 0; i < event.results.length; i++) {
        results.push(event.results[i]);
      }

      const transcript = results
        .map(result => result[0].transcript)
        .join(' ');

      const confidence = results.length > 0 ? results[0][0].confidence : 0;

      this.eventBus.emit('stt-result', { transcript, confidence });
      telemetry.track('voice_recognition_result', {
        transcript_length: transcript.length,
        confidence,
        is_final: event.results[event.results.length - 1].isFinal
      });
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isActive = false;
      this.eventBus.emit('stt-error', event.error);
      telemetry.track('voice_recognition_error', { error: event.error });
    };
  }

  async startListening(): Promise<void> {
    if (!this.recognition || this.isActive) return;

    try {
      this.recognition.start();
    } catch (error) {
      throw new AppError('Failed to start speech recognition', 'STT_START_FAILED');
    }
  }

  async stopListening(): Promise<void> {
    if (!this.recognition || !this.isActive) return;

    this.recognition.stop();
  }

  isListening(): boolean {
    return this.isActive;
  }

  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

interface IntentParser {
  parse(transcript: string): Promise<VoiceIntent>;
}

class SimpleLinguisticParser implements IntentParser {
  private patterns = {
    plan_create: [
      /plan.*trip.*to\s+(.+)/i,
      /create.*plan.*for\s+(.+)/i,
      /תכנן.*טיול.*ל(.+)/i,
      /צור.*תוכנית.*ל(.+)/i
    ],
    plan_update: [
      /add.*stop.*at\s+(.+)/i,
      /include.*(.+).*in.*plan/i,
      /הוסף.*עצירה.*ב(.+)/i,
      /כלול.*(.+).*בתוכנית/i
    ],
    search: [
      /find.*(.+)/i,
      /search.*for\s+(.+)/i,
      /look.*for\s+(.+)/i,
      /מצא.*(.+)/i,
      /חפש.*(.+)/i
    ],
    navigate: [
      /navigate.*to\s+(.+)/i,
      /directions.*to\s+(.+)/i,
      /go.*to\s+(.+)/i,
      /נווט.*ל(.+)/i,
      /הוראות.*ל(.+)/i
    ],
    weather: [
      /weather.*(?:in|at|for)\s+(.+)/i,
      /מזג.*אוויר.*ב(.+)/i
    ]
  };

  async parse(transcript: string): Promise<VoiceIntent> {
    const normalizedTranscript = transcript.trim().toLowerCase();

    for (const [intentType, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = normalizedTranscript.match(pattern);
        if (match) {
          return {
            type: intentType as VoiceIntent['type'],
            confidence: 0.8,
            parameters: this.extractParameters(intentType, match),
            original: transcript
          };
        }
      }
    }

    // Fallback to search intent
    return {
      type: 'search',
      confidence: 0.5,
      parameters: { query: transcript },
      original: transcript
    };
  }

  private extractParameters(intentType: string, match: RegExpMatchArray): Record<string, string> {
    const captured = match[1] || '';

    switch (intentType) {
      case 'plan_create':
        return { destination: captured.trim() };
      case 'plan_update':
        return { place: captured.trim() };
      case 'search':
      case 'navigate':
        return { query: captured.trim() };
      case 'weather':
        return { location: captured.trim() };
      default:
        return { text: captured.trim() };
    }
  }
}

class VoiceManager extends EventBus {
  private sttProvider: STTProvider;
  private intentParser: IntentParser;
  private isInitialized = false;
  private usingWhisper = false;

  constructor() {
    super();

    const voiceConfig: VoiceConfig = {
      language: 'he-IL', // Hebrew support
      continuous: false,
      interimResults: true,
      maxAlternatives: 3
    };

    // Prefer Whisper (better Hebrew support), fallback to Web Speech API
    const whisperProvider = new WhisperSTTProvider(voiceConfig, this);
    const webSpeechProvider = new WebSpeechSTTProvider(voiceConfig, this);

    if (whisperProvider.isSupported()) {
      this.sttProvider = whisperProvider;
      this.usingWhisper = true;
      console.log('[VoiceManager] Using Groq Whisper for speech-to-text');
    } else if (webSpeechProvider.isSupported()) {
      this.sttProvider = webSpeechProvider;
      console.log('[VoiceManager] Using Web Speech API for speech-to-text');
    } else {
      // Neither supported - create a dummy provider
      this.sttProvider = whisperProvider; // Will throw on use
      console.warn('[VoiceManager] No speech-to-text provider available');
    }

    this.intentParser = new SimpleLinguisticParser();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('stt-result', async ({ transcript, intent, response }) => {
      try {
        // If using Whisper, intent is already parsed by the backend
        if (this.usingWhisper && intent) {
          this.emit('intent-recognized', {
            type: intent.intent || 'search',
            confidence: 0.95,
            parameters: intent.params || {},
            original: transcript,
            response: response || intent.response
          });
          return;
        }

        // Fallback: parse intent locally
        const parsedIntent = await this.intentParser.parse(transcript);
        this.emit('intent-recognized', parsedIntent);

        telemetry.track('voice_intent_recognized', {
          intent_type: parsedIntent.type,
          confidence: parsedIntent.confidence,
          has_parameters: Object.keys(parsedIntent.parameters).length > 0
        });
      } catch (error) {
        console.error('Intent parsing failed:', error);
        this.emit('intent-error', error);
      }
    });

    this.on('stt-error', (error) => {
      this.emit('voice-error', new AppError(`Speech recognition error: ${error}`, 'STT_ERROR'));
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.sttProvider.isSupported()) {
      throw new AppError('Speech recognition not supported', 'STT_NOT_SUPPORTED');
    }

    this.isInitialized = true;
    telemetry.track('voice_manager_initialized');
  }

  async startListening(): Promise<void> {
    await this.initialize();
    await this.sttProvider.startListening();
    this.emit('listening-started');
  }

  async stopListening(): Promise<void> {
    await this.sttProvider.stopListening();
    this.emit('listening-stopped');
  }

  isListening(): boolean {
    return this.sttProvider.isListening();
  }

  isSupported(): boolean {
    return this.sttProvider.isSupported();
  }

  // Text-to-Speech functionality
  speak(text: string, options: {
    language?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new AppError('Text-to-speech not supported', 'TTS_NOT_SUPPORTED'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.language || 'he-IL';
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 0.8;

      utterance.onend = () => {
        telemetry.track('voice_tts_completed', { text_length: text.length });
        resolve();
      };

      utterance.onerror = (event) => {
        telemetry.track('voice_tts_error', { error: event.error });
        reject(new AppError(`Text-to-speech error: ${event.error}`, 'TTS_ERROR'));
      };

      speechSynthesis.speak(utterance);
      telemetry.track('voice_tts_started', { text_length: text.length });
    });
  }

  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  isSpeaking(): boolean {
    return 'speechSynthesis' in window && speechSynthesis.speaking;
  }

  // Press and hold interface
  async startPressAndHold(): Promise<void> {
    await this.startListening();
    // Visual feedback for press and hold
    document.body.classList.add('voice-listening');
  }

  async endPressAndHold(): Promise<void> {
    await this.stopListening();
    document.body.classList.remove('voice-listening');
  }

  // Quick voice commands
  async processQuickCommand(command: string): Promise<VoiceIntent> {
    const intent = await this.intentParser.parse(command);
    this.emit('intent-recognized', intent);
    return intent;
  }
}

// Global voice manager instance
export const voiceManager = new VoiceManager();

// Hook for easier usage
export function useVoice() {
  return {
    startListening: voiceManager.startListening.bind(voiceManager),
    stopListening: voiceManager.stopListening.bind(voiceManager),
    isListening: voiceManager.isListening.bind(voiceManager),
    isSupported: voiceManager.isSupported.bind(voiceManager),
    speak: voiceManager.speak.bind(voiceManager),
    stopSpeaking: voiceManager.stopSpeaking.bind(voiceManager),
    isSpeaking: voiceManager.isSpeaking.bind(voiceManager),
    startPressAndHold: voiceManager.startPressAndHold.bind(voiceManager),
    endPressAndHold: voiceManager.endPressAndHold.bind(voiceManager),
    processQuickCommand: voiceManager.processQuickCommand.bind(voiceManager),
    subscribe: (event: string, callback: Function) => {
      voiceManager.on(event, callback);
      return () => voiceManager.off(event, callback);
    }
  };
}

