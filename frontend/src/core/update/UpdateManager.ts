import type { AppVersion, UpdateInfo } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

interface UpdateConfig {
  checkInterval: number; // milliseconds
  apiEndpoint: string;
  currentVersion: string;
  autoCheck: boolean;
}

class UpdateManager extends EventBus {
  private config: UpdateConfig;
  private checkTimer?: number;
  private lastCheckTime = 0;
  private updateAvailable = false;
  private latestVersion?: AppVersion;

  constructor(config: Partial<UpdateConfig> = {}) {
    super();
    
    this.config = {
      checkInterval: 30 * 60 * 1000, // 30 minutes
      apiEndpoint: '/app/version.json',
      currentVersion: '2.0.0', // This should come from build process
      autoCheck: true,
      ...config
    };

    if (this.config.autoCheck) {
      this.startPeriodicCheck();
    }
  }

  async checkForUpdates(force = false): Promise<UpdateInfo> {
    const now = Date.now();
    
    // Avoid too frequent checks unless forced
    if (!force && now - this.lastCheckTime < 5 * 60 * 1000) {
      return this.getLastUpdateInfo();
    }

    this.lastCheckTime = now;
    telemetry.track('update_check_started');

    try {
      const response = await fetch(this.config.apiEndpoint, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Update check failed: ${response.status}`);
      }

      const latestVersion: AppVersion = await response.json();
      const updateInfo = this.compareVersions(latestVersion);
      
      this.latestVersion = latestVersion;
      this.updateAvailable = updateInfo.available;
      
      if (updateInfo.available) {
        this.emit('update-available', updateInfo);
        telemetry.track('update_available', {
          current: updateInfo.current,
          latest: updateInfo.latest,
          urgent: updateInfo.urgent
        });
      }

      telemetry.track('update_check_completed', {
        available: updateInfo.available,
        version: updateInfo.latest
      });

      return updateInfo;
    } catch (error) {
      console.error('Update check failed:', error);
      telemetry.track('update_check_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        available: false,
        current: this.config.currentVersion,
        latest: this.config.currentVersion
      };
    }
  }

  private compareVersions(latest: AppVersion): UpdateInfo {
    const current = this.config.currentVersion;
    const available = this.isNewerVersion(latest.version, current);
    
    return {
      available,
      current,
      latest: latest.version,
      releaseNotes: available ? latest : undefined,
      urgent: available && latest.breaking && latest.breaking.length > 0
    };
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  }

  getLastUpdateInfo(): UpdateInfo {
    return {
      available: this.updateAvailable,
      current: this.config.currentVersion,
      latest: this.latestVersion?.version || this.config.currentVersion,
      releaseNotes: this.updateAvailable ? this.latestVersion : undefined,
      urgent: this.updateAvailable && this.latestVersion?.breaking && this.latestVersion.breaking.length > 0
    };
  }

  async applyUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error('No update available');
    }

    telemetry.track('update_apply_started');

    try {
      // For PWA, trigger service worker update
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          // There's a waiting service worker, activate it
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          this.emit('update-applied');
          telemetry.track('update_applied', { method: 'service_worker' });
          return;
        }
      }

      // For other platforms, redirect to store or reload
      if (this.isNativeApp()) {
        this.redirectToStore();
      } else {
        // Force reload to get new version
        window.location.reload();
      }
    } catch (error) {
      console.error('Update application failed:', error);
      telemetry.track('update_apply_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private isNativeApp(): boolean {
    // Detect if running in native app context
    return !!(
      (window as any).ReactNativeWebView ||
      (window as any).webkit?.messageHandlers ||
      navigator.userAgent.includes('TravelingApp')
    );
  }

  private redirectToStore(): void {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      // iOS App Store
      window.open('https://apps.apple.com/app/traveling-app', '_blank');
    } else if (userAgent.includes('Android')) {
      // Google Play Store
      window.open('https://play.google.com/store/apps/details?id=com.traveling.app', '_blank');
    } else {
      // Web - just reload
      window.location.reload();
    }
  }

  private startPeriodicCheck(): void {
    this.checkTimer = window.setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);
  }

  stopPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }

  destroy(): void {
    this.stopPeriodicCheck();
    super.destroy();
  }
}

// Service worker message handler for update notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'UPDATE_AVAILABLE') {
      updateManager.emit('update-available', {
        available: true,
        current: updateManager.getLastUpdateInfo().current,
        latest: event.data.version || 'unknown'
      });
    }
  });
}

// Global singleton
export const updateManager = new UpdateManager({
  currentVersion: import.meta.env.VITE_APP_VERSION || '2.0.0'
});

// Convenience hook
export function useUpdate() {
  return {
    checkForUpdates: updateManager.checkForUpdates.bind(updateManager),
    applyUpdate: updateManager.applyUpdate.bind(updateManager),
    getUpdateInfo: updateManager.getLastUpdateInfo.bind(updateManager),
    subscribe: (callback: (updateInfo: UpdateInfo) => void) => {
      updateManager.on('update-available', callback);
      return () => updateManager.off('update-available', callback);
    }
  };
}