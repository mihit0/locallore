// Map caching utility for LocalLore
// Caches map data, events, and mapbox instance for better performance

import mapboxgl from 'mapbox-gl';
import { Event } from '@/types/event';

export interface CachedMapData {
  events: Event[];
  lastFetched: number;
  mapInstance?: mapboxgl.Map;
  markers: mapboxgl.Marker[];
}

class MapCache {
  private cache: Map<string, CachedMapData> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for events
  private readonly SESSION_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for map instance

  // Cache key generator based on map parameters
  private getCacheKey(bounds?: mapboxgl.LngLatBounds): string {
    if (bounds) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      return `map_${sw.lng}_${sw.lat}_${ne.lng}_${ne.lat}`;
    }
    return 'map_default';
  }

  // Check if cached data is still valid
  private isValid(cachedData: CachedMapData, useSessionCache: boolean = false): boolean {
    const maxAge = useSessionCache ? this.SESSION_CACHE_DURATION : this.CACHE_DURATION;
    return Date.now() - cachedData.lastFetched < maxAge;
  }

  // Get cached events
  getCachedEvents(bounds?: mapboxgl.LngLatBounds, useSessionCache: boolean = false): Event[] | null {
    const key = this.getCacheKey(bounds);
    const cached = this.cache.get(key);
    
    if (cached && this.isValid(cached, useSessionCache)) {
      console.log('🚀 Using cached events from mapCache');
      return cached.events;
    }
    
    return null;
  }

  // Cache events data
  setCachedEvents(events: Event[], bounds?: mapboxgl.LngLatBounds): void {
    const key = this.getCacheKey(bounds);
    const existing = this.cache.get(key) || { events: [], lastFetched: 0, markers: [] };
    
    this.cache.set(key, {
      ...existing,
      events,
      lastFetched: Date.now(),
    });
    
    console.log('💾 Cached events in mapCache:', events.length);
  }

  // Get cached map instance
  getCachedMapInstance(): mapboxgl.Map | null {
    const defaultCache = this.cache.get('map_default');
    if (defaultCache?.mapInstance) {
      console.log('🗺️ Using cached map instance');
      return defaultCache.mapInstance;
    }
    return null;
  }

  // Cache map instance
  setCachedMapInstance(mapInstance: mapboxgl.Map): void {
    const key = 'map_default';
    const existing = this.cache.get(key) || { events: [], lastFetched: Date.now(), markers: [] };
    
    this.cache.set(key, {
      ...existing,
      mapInstance,
    });
    
    console.log('🗺️ Cached map instance');
  }

  // Get cached markers
  getCachedMarkers(bounds?: mapboxgl.LngLatBounds): mapboxgl.Marker[] | null {
    const key = this.getCacheKey(bounds);
    const cached = this.cache.get(key);
    
    if (cached && this.isValid(cached, true)) { // Use session cache for markers
      console.log('📍 Using cached markers');
      return cached.markers;
    }
    
    return null;
  }

  // Cache markers
  setCachedMarkers(markers: mapboxgl.Marker[], bounds?: mapboxgl.LngLatBounds): void {
    const key = this.getCacheKey(bounds);
    const existing = this.cache.get(key) || { events: [], lastFetched: Date.now(), markers: [] };
    
    this.cache.set(key, {
      ...existing,
      markers,
    });
    
    console.log('📍 Cached markers:', markers.length);
  }

  // Clear old markers from map
  clearCachedMarkers(bounds?: mapboxgl.LngLatBounds): void {
    const key = this.getCacheKey(bounds);
    const cached = this.cache.get(key);
    
    if (cached?.markers) {
      cached.markers.forEach(marker => marker.remove());
      cached.markers = [];
    }
  }

  // Clear specific cache entry
  clearCache(bounds?: mapboxgl.LngLatBounds): void {
    const key = this.getCacheKey(bounds);
    const cached = this.cache.get(key);
    
    if (cached?.markers) {
      cached.markers.forEach(marker => marker.remove());
    }
    
    this.cache.delete(key);
    console.log('🗑️ Cleared cache for:', key);
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.forEach((cached) => {
      if (cached.markers) {
        cached.markers.forEach(marker => marker.remove());
      }
    });
    this.cache.clear();
    console.log('🗑️ Cleared all map cache');
  }

  // Get cache stats for debugging
  getCacheStats(): { size: number; keys: string[]; ages: number[] } {
    const keys = Array.from(this.cache.keys());
    const ages = Array.from(this.cache.values()).map(cached => 
      Date.now() - cached.lastFetched
    );
    
    return {
      size: this.cache.size,
      keys,
      ages
    };
  }

  // Preload events for better UX
  async preloadEvents(fetchFunction: () => Promise<Event[]>, bounds?: mapboxgl.LngLatBounds): Promise<Event[]> {
    // Check cache first
    const cached = this.getCachedEvents(bounds, true);
    if (cached) {
      return cached;
    }

    // Fetch and cache
    try {
      const events = await fetchFunction();
      this.setCachedEvents(events, bounds);
      return events;
    } catch (error) {
      console.error('Failed to preload events:', error);
      return [];
    }
  }

  // Cleanup expired cache entries periodically
  cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((cached, key) => {
      if (now - cached.lastFetched > this.SESSION_CACHE_DURATION) {
        keysToDelete.push(key);
        if (cached.markers) {
          cached.markers.forEach(marker => marker.remove());
        }
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log('🧹 Cleaned up expired cache entries:', keysToDelete.length);
    }
  }
}

// Singleton instance
export const mapCache = new MapCache();

// Auto cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    mapCache.cleanupExpiredCache();
  }, 10 * 60 * 1000);
} 