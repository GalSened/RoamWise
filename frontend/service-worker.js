// ✨ ENHANCED PWA SERVICE WORKER FOR TRAVELING APP

const CACHE_NAME = "traveling-v3.0";
const STATIC_CACHE = "traveling-static-v3";
const DYNAMIC_CACHE = "traveling-dynamic-v3";
const API_CACHE = "traveling-api-v3";

// Assets to cache immediately
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css", 
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap"
];

// API endpoints to cache with different strategies
const API_ROUTES = {
  "/weather": { strategy: "networkFirst", ttl: 600000 }, // 10 minutes
  "/places": { strategy: "staleWhileRevalidate", ttl: 1800000 }, // 30 minutes  
  "/ai-recommendations": { strategy: "cacheFirst", ttl: 3600000 }, // 1 hour
  "/user-insights": { strategy: "networkOnly", ttl: 0 }
};

// 🚀 SERVICE WORKER INSTALLATION
self.addEventListener("install", (event) => {
  console.log("[SW] Installing traveling service worker v3.0");
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      }),
      // Initialize other caches
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE)
    ]).then(() => {
      console.log("[SW] Installation complete");
      return self.skipWaiting(); // Take control immediately
    })
  );
});

// 🧹 SERVICE WORKER ACTIVATION
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating traveling service worker v3.0");
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
        return Promise.all(
          cacheNames
            .filter(cacheName => !validCaches.includes(cacheName))
            .map(cacheName => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ]).then(() => {
      console.log("[SW] Activation complete");
    })
  );
});

// 🌐 ADVANCED FETCH HANDLER WITH MULTIPLE STRATEGIES
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApiRequest = url.pathname.startsWith("/") && API_ROUTES[url.pathname];
  const isStaticAsset = STATIC_ASSETS.some(asset => 
    url.pathname.endsWith(asset.replace("./", "/"))
  );
  
  // Handle different request types
  if (isStaticAsset) {
    event.respondWith(handleStaticAsset(event.request));
  } else if (isApiRequest) {
    event.respondWith(handleApiRequest(event.request, API_ROUTES[url.pathname]));
  } else if (url.protocol === "https:" || url.protocol === "http:") {
    event.respondWith(handleDynamicRequest(event.request));
  }
});

// 📦 STATIC ASSET CACHING STRATEGY
async function handleStaticAsset(request) {
  try {
    // Cache first, then network if not found
    const cached = await caches.match(request);
    if (cached) {
      console.log("[SW] Serving from static cache:", request.url);
      return cached;
    }
    
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    console.log("[SW] Cached static asset:", request.url);
    return response;
  } catch (error) {
    console.error("[SW] Static asset error:", error);
    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      return caches.match("./index.html");
    }
    throw error;
  }
}

// 🔥 API REQUEST CACHING WITH MULTIPLE STRATEGIES
async function handleApiRequest(request, config) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  
  switch (config.strategy) {
    case "networkFirst":
      return handleNetworkFirst(request, cache, config.ttl);
    case "cacheFirst": 
      return handleCacheFirst(request, cache, config.ttl);
    case "staleWhileRevalidate":
      return handleStaleWhileRevalidate(request, cache, config.ttl);
    case "networkOnly":
      return fetch(request);
    default:
      return handleNetworkFirst(request, cache, config.ttl);
  }
}

// Network First Strategy
async function handleNetworkFirst(request, cache, ttl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseWithTimestamp = await addTimestamp(response.clone());
      cache.put(request, responseWithTimestamp);
      console.log("[SW] Network first - cached response:", request.url);
    }
    return response;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cached = await cache.match(request);
    if (cached && !isExpired(cached, ttl)) {
      return removeTimestamp(cached);
    }
    throw error;
  }
}

// Cache First Strategy  
async function handleCacheFirst(request, cache, ttl) {
  const cached = await cache.match(request);
  if (cached && !isExpired(cached, ttl)) {
    console.log("[SW] Cache first - serving cached:", request.url);
    return removeTimestamp(cached);
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseWithTimestamp = await addTimestamp(response.clone());
      cache.put(request, responseWithTimestamp);
    }
    return response;
  } catch (error) {
    if (cached) {
      console.log("[SW] Network failed, serving stale cache:", request.url);
      return removeTimestamp(cached);
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function handleStaleWhileRevalidate(request, cache, ttl) {
  const cached = await cache.match(request);
  
  // Always return cached if available
  if (cached) {
    console.log("[SW] Stale while revalidate - serving cached:", request.url);
    
    // Update in background if expired
    if (isExpired(cached, ttl)) {
      console.log("[SW] Updating stale cache in background:", request.url);
      fetch(request).then(response => {
        if (response.ok) {
          addTimestamp(response.clone()).then(responseWithTimestamp => {
            cache.put(request, responseWithTimestamp);
          });
        }
      }).catch(() => {}); // Silent fail for background updates
    }
    
    return removeTimestamp(cached);
  }
  
  // No cache, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseWithTimestamp = await addTimestamp(response.clone());
      cache.put(request, responseWithTimestamp);
    }
    return response;
  } catch (error) {
    throw error;
  }
}

// 🌍 DYNAMIC REQUEST HANDLER
async function handleDynamicRequest(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses to dynamic cache
    if (response.ok && response.status < 400) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      console.log("[SW] Cached dynamic resource:", request.url);
    }
    
    return response;
  } catch (error) {
    // Try to serve from dynamic cache
    const cached = await caches.match(request);
    if (cached) {
      console.log("[SW] Serving from dynamic cache:", request.url);
      return cached;
    }
    throw error;
  }
}

// 🏷️ CACHE TIMESTAMP UTILITIES
async function addTimestamp(response) {
  const timestamp = Date.now().toString();
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', timestamp);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

function removeTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.delete('sw-cached-at');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

function isExpired(response, ttl) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > ttl;
}

// 🔄 BACKGROUND SYNC
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);
  
  if (event.tag === "sync-user-data") {
    event.waitUntil(syncUserData());
  } else if (event.tag === "sync-offline-actions") {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync user data when back online
async function syncUserData() {
  try {
    // Get pending user interactions from IndexedDB
    const pendingData = await getPendingUserData();
    
    for (const data of pendingData) {
      await fetch("/track-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    }
    
    await clearPendingUserData();
    console.log("[SW] User data synced successfully");
  } catch (error) {
    console.error("[SW] Failed to sync user data:", error);
  }
}

// Sync offline actions
async function syncOfflineActions() {
  try {
    const actions = await getPendingActions();
    
    for (const action of actions) {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
    }
    
    await clearPendingActions();
    console.log("[SW] Offline actions synced successfully");
  } catch (error) {
    console.error("[SW] Failed to sync offline actions:", error);
  }
}

// 🔔 PUSH NOTIFICATIONS
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  
  const options = {
    body: event.data ? event.data.text() : "New travel recommendation available!",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "traveling-notification"
    },
    actions: [
      {
        action: "explore",
        title: "Explore",
        icon: "./icons/icon-192.png"
      },
      {
        action: "close",
        title: "Close"
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification("traveling", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);
  
  event.notification.close();
  
  if (event.action === "explore") {
    event.waitUntil(
      clients.openWindow("/")
    );
  }
});

// 📱 APP UPDATE NOTIFICATIONS
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Received skip waiting message");
    self.skipWaiting();
  }
});

// 🗄️ INDEXEDDB HELPERS (simplified implementation)
async function getPendingUserData() {
  // Implementation would use IndexedDB to get pending user interactions
  return [];
}

async function clearPendingUserData() {
  // Implementation would clear pending user data from IndexedDB
}

async function getPendingActions() {
  // Implementation would get pending offline actions from IndexedDB
  return [];
}

async function clearPendingActions() {
  // Implementation would clear pending actions from IndexedDB
}

// 📊 CACHE CLEANUP ON STORAGE PRESSURE
self.addEventListener("storage", (event) => {
  if (event.reason === "eviction") {
    console.log("[SW] Storage pressure detected, cleaning up caches");
    cleanupOldCacheEntries();
  }
});

async function cleanupOldCacheEntries() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  
  // Remove old entries (keep last 50)
  if (requests.length > 50) {
    const toDelete = requests.slice(0, requests.length - 50);
    await Promise.all(toDelete.map(request => cache.delete(request)));
    console.log(`[SW] Cleaned up ${toDelete.length} old cache entries`);
  }
}

console.log("[SW] traveling service worker v3.0 loaded successfully");