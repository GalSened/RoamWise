/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_OPENWEATHER_API_KEY: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_UPDATE_CHECK_URL: string;
  readonly VITE_ANALYTICS_ENDPOINT: string;
  readonly VITE_ROUTING_PROVIDER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Maps types
declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: any);
    }
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }
    class Marker {
      constructor(options?: any);
      setPosition(latLng: LatLng): void;
      setMap(map: Map): void;
    }
    namespace places {
      class PlacesService {
        constructor(map: Map);
        textSearch(request: any, callback: (results: any[], status: any) => void): void;
        getDetails(request: any, callback: (result: any, status: any) => void): void;
      }
      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        NOT_FOUND = 'NOT_FOUND',
        INVALID_REQUEST = 'INVALID_REQUEST',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR'
      }
      interface TextSearchRequest {
        query: string;
        location?: LatLng;
        radius?: number;
      }
    }
    namespace geometry {
      class DirectionsService {
        route(request: any, callback: (result: any, status: any) => void): void;
      }
      enum DirectionsStatus {
        OK = 'OK',
        NOT_FOUND = 'NOT_FOUND',
        ZERO_RESULTS = 'ZERO_RESULTS',
        MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
        INVALID_REQUEST = 'INVALID_REQUEST',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR'
      }
    }
  }
}

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};