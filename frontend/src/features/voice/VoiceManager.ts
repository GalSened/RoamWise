import type { VoiceIntent } from '@/types';
import { AppError } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

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

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
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

    this.recognition.onresult = (event) => {
      const results = Array.from(event.results);
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

    this.recognition.onerror = (event) => {
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

  private extractParameters(intentType: string, match: RegExpMatchArray): Record<string, any> {
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

  constructor() {
    super();
    
    const config: VoiceConfig = {
      language: 'he-IL', // Hebrew support
      continuous: false,
      interimResults: true,
      maxAlternatives: 3
    };

    this.sttProvider = new WebSpeechSTTProvider(config, this);
    this.intentParser = new SimpleLinguisticParser();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('stt-result', async ({ transcript, confidence }) => {
      try {
        const intent = await this.intentParser.parse(transcript);
        this.emit('intent-recognized', intent);
        
        telemetry.track('voice_intent_recognized', {
          intent_type: intent.type,
          confidence: intent.confidence,
          has_parameters: Object.keys(intent.parameters).length > 0
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

// Extend window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}