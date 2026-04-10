/**
 * Service Worker for PWA functionality
 * 
 * Features:
 * - Offline caching of static assets
 * - Background sync for failed requests
 * - Cache-first strategy for images
 * - Network-first strategy for API calls
 * - Periodic cache cleanup
 */

const CACHE_NAME = "reachripple-v1";
const STATIC_CACHE = "reachripple-static-v1";
const IMAGE_CACHE = "reachripple-images-v1";
const API_CACHE = "reachripple-api-v1";

// Static assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/static/js/main.js",
  "/static/css/main.css",
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  "/api/ads",
  "/api/location",
];

// Skip waiting and claim clients immediately
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing Service Worker...");
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes("undefined")));
      })
      .catch((err) => {
        console.log("[SW] Static cache failed (expected on first install):", err.message);
      })
  );
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating Service Worker...");
  
  const cacheWhitelist = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log("[SW] Claiming clients");
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Handle API requests - Network first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Handle image requests - Cache first
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Handle static assets - Cache first with network fallback
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Handle navigation requests - Network first
  // For local development, always try network first and only show offline page
  // if we're actually offline (no network at all)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If we get any response (even 404), return it
          return response;
        })
        .catch((error) => {
          // Only show offline page if network is truly unavailable
          console.log("[SW] Navigation failed, falling back:", error.message);
          return caches.match("/index.html").then((cached) => {
            if (cached) return cached;
            return caches.match("/offline.html");
          });
        })
    );
    return;
  }

  // Default: Network first
  event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
});

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  const url = new URL(request.url);
  return (
    request.destination === "image" ||
    /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname) ||
    url.pathname.includes("/uploads/") ||
    url.hostname.includes("unsplash.com")
  );
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname);
}

/**
 * Cache-first strategy
 * Try cache first, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed for:", request.url);
    return new Response("", { status: 408, statusText: "Offline" });
  }
}

/**
 * Network-first strategy
 * Try network first, fallback to cache
 */
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful GET responses
    if (networkResponse.ok && request.method === "GET") {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache for:", request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline JSON for API requests
    if (request.url.includes("/api/")) {
      return new Response(
        JSON.stringify({ error: "Offline", offline: true }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    throw error;
  }
}

/**
 * Network first with offline page fallback for navigation
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log("[SW] Navigation failed, showing offline page");
    
    // Try to return cached version of the page
    const cache = await caches.open(STATIC_CACHE);
    const cachedPage = await cache.match(request);
    
    if (cachedPage) {
      return cachedPage;
    }
    
    // Return offline page
    const offlinePage = await cache.match("/offline.html");
    if (offlinePage) {
      return offlinePage;
    }
    
    // Return index as last resort (SPA)
    const indexPage = await cache.match("/index.html");
    if (indexPage) {
      return indexPage;
    }
    
    return new Response("Offline", { status: 503 });
  }
}

/**
 * Fetch and update cache in background
 */
async function fetchAndCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

/**
 * Background sync for failed requests
 */
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);
  
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages());
  }
  
  if (event.tag === "sync-analytics") {
    event.waitUntil(syncAnalytics());
  }
});

/**
 * Sync queued messages
 */
async function syncMessages() {
  // Get queued messages from IndexedDB and send them
  console.log("[SW] Syncing queued messages...");
}

/**
 * Sync queued analytics
 */
async function syncAnalytics() {
  // Get queued analytics events and send them
  console.log("[SW] Syncing queued analytics...");
}

/**
 * Push notifications
 */
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  
  const data = event.data?.json() || {
    title: "New Message",
    body: "You have a new message",
    icon: "/logo192.png",
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/logo192.png",
      badge: "/badge.png",
      tag: data.tag || "default",
      data: data.data,
    })
  );
});

/**
 * Notification click handler
 */
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || "/";
  
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // Open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log("[SW] Service Worker loaded");
