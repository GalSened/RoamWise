import { vi } from 'vitest';

// Mock DOM APIs
Object.defineProperty(window, 'navigator', {
  value: {
    geolocation: {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
    userAgent: 'test',
    language: 'en-US',
  },
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
  },
  writable: true,
});

// Mock Leaflet
vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    addTo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: vi.fn(() => 13),
    fitBounds: vi.fn(),
    eachLayer: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn(),
    openPopup: vi.fn(),
  })),
  layerGroup: vi.fn(() => ({
    addTo: vi.fn(),
    clearLayers: vi.fn(),
  })),
  polyline: vi.fn(() => ({
    addTo: vi.fn(),
    getBounds: vi.fn(() => ({
      pad: vi.fn(() => ({
        getNorthEast: vi.fn(() => ({ lat: 1, lng: 1 })),
        getSouthWest: vi.fn(() => ({ lat: -1, lng: -1 })),
      })),
    })),
  })),
  divIcon: vi.fn(),
  circle: vi.fn(() => ({ addTo: vi.fn() })),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock indexedDB
const mockIDBRequest = {
  onerror: null,
  onsuccess: null,
  result: null,
  error: null,
};

const mockIDBDatabase = {
  transaction: vi.fn(() => ({
    objectStore: vi.fn(() => ({
      get: vi.fn(() => mockIDBRequest),
      put: vi.fn(() => mockIDBRequest),
      delete: vi.fn(() => mockIDBRequest),
      clear: vi.fn(() => mockIDBRequest),
      getAllKeys: vi.fn(() => mockIDBRequest),
    })),
  })),
  createObjectStore: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
};

global.indexedDB = {
  open: vi.fn(() => ({
    ...mockIDBRequest,
    onupgradeneeded: null,
    result: mockIDBDatabase,
  })),
  deleteDatabase: vi.fn(),
  databases: vi.fn(),
};

// Console suppress for tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    args[0]?.includes?.('Warning:') ||
    args[0]?.includes?.('ReactDOM.render')
  ) {
    return;
  }
  originalConsoleError(...args);
};