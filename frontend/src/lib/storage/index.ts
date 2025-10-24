// Storage abstraction layer supporting localStorage, IndexedDB, and memory fallback

interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

class LocalStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to set ${key} in localStorage:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.warn('Failed to get localStorage keys:', error);
      return [];
    }
  }
}

class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'TravelingAppDB';
  private version = 1;
  private storeName = 'keyvalue';
  private db?: IDBDatabase;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key: string): Promise<any> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.warn(`Failed to get ${key} from IndexedDB:`, error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn(`Failed to set ${key} in IndexedDB:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn(`Failed to remove ${key} from IndexedDB:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.warn('Failed to get IndexedDB keys:', error);
      return [];
    }
  }
}

class MemoryAdapter implements StorageAdapter {
  private data = new Map<string, any>();

  async get(key: string): Promise<any> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
}

class StorageManager {
  private adapter: StorageAdapter;

  constructor() {
    this.adapter = this.createAdapter();
  }

  private createAdapter(): StorageAdapter {
    // Try IndexedDB first for large data
    if (typeof indexedDB !== 'undefined') {
      try {
        return new IndexedDBAdapter();
      } catch (error) {
        console.warn('IndexedDB not available, falling back to localStorage');
      }
    }

    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        // Test localStorage availability
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
        return new LocalStorageAdapter();
      } catch (error) {
        console.warn('localStorage not available, falling back to memory storage');
      }
    }

    // Final fallback to memory storage
    return new MemoryAdapter();
  }

  async get(key: string): Promise<any> {
    return this.adapter.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    return this.adapter.set(key, value);
  }

  async remove(key: string): Promise<void> {
    return this.adapter.remove(key);
  }

  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  async keys(): Promise<string[]> {
    return this.adapter.keys();
  }

  // Convenience methods
  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const value = await this.get(key);
    return typeof value === 'number' ? value : defaultValue;
  }

  async getString(key: string, defaultValue = ''): Promise<string> {
    const value = await this.get(key);
    return typeof value === 'string' ? value : defaultValue;
  }

  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const value = await this.get(key);
    return typeof value === 'boolean' ? value : defaultValue;
  }

  async getArray<T>(key: string, defaultValue: T[] = []): Promise<T[]> {
    const value = await this.get(key);
    return Array.isArray(value) ? value : defaultValue;
  }

  async getObject<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const value = await this.get(key);
    return value && typeof value === 'object' ? value : defaultValue;
  }

  // Batch operations
  async setMany(items: Record<string, any>): Promise<void> {
    await Promise.all(
      Object.entries(items).map(([key, value]) => this.set(key, value))
    );
  }

  async getMany(keys: string[]): Promise<Record<string, any>> {
    const results = await Promise.all(
      keys.map(async key => ({ key, value: await this.get(key) }))
    );
    
    return results.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, any>);
  }

  // Cache with TTL
  async setWithTTL(key: string, value: any, ttlMs: number): Promise<void> {
    const expiry = Date.now() + ttlMs;
    await this.set(key, { value, expiry });
  }

  async getWithTTL(key: string): Promise<any> {
    const item = await this.get(key);
    if (!item || typeof item !== 'object' || !item.expiry) {
      return null;
    }

    if (Date.now() > item.expiry) {
      await this.remove(key);
      return null;
    }

    return item.value;
  }
}

// Global storage instance
export const storage = new StorageManager();