import type { TelemetryEvent, PerformanceMetric } from '@/types';

interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  sessionId?: string;
  userId?: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number;
}

class TelemetryManager {
  private config: TelemetryConfig;
  private eventQueue: TelemetryEvent[] = [];
  private perfQueue: PerformanceMetric[] = [];
  private flushTimer?: number;
  private sessionId: string;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = {
      enabled: import.meta.env.VITE_TELEMETRY_ENABLED === 'true',
      endpoint: import.meta.env.VITE_TELEMETRY_ENDPOINT || '/api/telemetry',
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      ...config
    };

    this.sessionId = this.generateSessionId();
    
    if (this.config.enabled) {
      this.startPeriodicFlush();
      this.setupUnloadHandler();
      this.trackPageView();
    }
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const event: TelemetryEvent = {
      name: eventName,
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.config.userId
    };

    this.eventQueue.push(event);
    this.checkFlushThreshold();
  }

  trackPerformance(name: string, value: number, unit?: string): void {
    if (!this.config.enabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.perfQueue.push(metric);
    this.checkFlushThreshold();
  }

  trackError(error: Error, context?: Record<string, any>): void {
    if (!this.config.enabled) return;

    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  trackUserAction(action: string, target?: string, properties?: Record<string, any>): void {
    if (!this.config.enabled) return;

    this.track('user_action', {
      action,
      target,
      ...properties
    });
  }

  trackPageView(path?: string): void {
    if (!this.config.enabled) return;

    this.track('page_view', {
      path: path || window.location.pathname,
      title: document.title
    });
  }

  measureTime<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
    if (!this.config.enabled) return fn();

    const start = performance.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        this.trackPerformance(name, performance.now() - start, 'ms');
      }) as Promise<T>;
    } else {
      this.trackPerformance(name, performance.now() - start, 'ms');
      return result;
    }
  }

  setUser(userId: string): void {
    this.config.userId = userId;
  }

  setProperty(key: string, value: any): void {
    // Set global property for all future events
    if (!(globalThis as any).__telemetryGlobals) {
      (globalThis as any).__telemetryGlobals = {};
    }
    (globalThis as any).__telemetryGlobals[key] = value;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private setupUnloadHandler(): void {
    const handleUnload = () => {
      this.flush(true); // Synchronous flush on unload
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  private checkFlushThreshold(): void {
    const totalEvents = this.eventQueue.length + this.perfQueue.length;
    if (totalEvents >= this.config.batchSize!) {
      this.flush();
    }
  }

  private async flush(synchronous = false): Promise<void> {
    if (this.eventQueue.length === 0 && this.perfQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    const metrics = [...this.perfQueue];
    
    // Clear queues
    this.eventQueue = [];
    this.perfQueue = [];

    const payload = {
      events: events.map(event => ({
        ...event,
        properties: {
          ...event.properties,
          ...(globalThis as any).__telemetryGlobals
        }
      })),
      metrics,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    try {
      if (synchronous && 'sendBeacon' in navigator) {
        // Use sendBeacon for reliable delivery during page unload
        navigator.sendBeacon(
          this.config.endpoint!,
          JSON.stringify(payload)
        );
      } else {
        await fetch(this.config.endpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify(payload),
          keepalive: true
        });
      }
    } catch (error) {
      console.warn('Failed to send telemetry:', error);
      // Re-queue events on failure (but limit to prevent infinite growth)
      if (this.eventQueue.length < 100) {
        this.eventQueue.unshift(...events.slice(-50));
        this.perfQueue.unshift(...metrics.slice(-50));
      }
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true);
  }
}

// Core Web Vitals tracking
function trackWebVitals(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      if (lastEntry) {
        telemetry.trackPerformance('lcp', lastEntry.startTime, 'ms');
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        telemetry.trackPerformance('fid', entry.processingStart - entry.startTime, 'ms');
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Send CLS on page hide
    window.addEventListener('beforeunload', () => {
      telemetry.trackPerformance('cls', clsValue);
    });
  } catch (error) {
    console.warn('Web Vitals tracking failed:', error);
  }
}

// Global telemetry instance
export const telemetry = new TelemetryManager();

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  trackWebVitals();
}

// Export hook for easier usage
export function useTelemetry() {
  return {
    track: telemetry.track.bind(telemetry),
    trackPerformance: telemetry.trackPerformance.bind(telemetry),
    trackError: telemetry.trackError.bind(telemetry),
    trackUserAction: telemetry.trackUserAction.bind(telemetry),
    measureTime: telemetry.measureTime.bind(telemetry),
    setUser: telemetry.setUser.bind(telemetry),
    setProperty: telemetry.setProperty.bind(telemetry)
  };
}