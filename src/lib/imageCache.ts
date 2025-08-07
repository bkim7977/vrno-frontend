/**
 * Image Cache System - MASSIVE OPTIMIZATION
 * Stores collectible images locally to prevent repeated API calls
 * Saves bandwidth and improves performance significantly
 */

interface CachedImage {
  url: string;
  timestamp: number;
  collectibleId: string;
}

class ImageCacheManager {
  private cache: Map<string, CachedImage> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'vrno_image_cache';

  constructor() {
    this.loadFromStorage();
    // Clean expired images on startup
    this.cleanExpiredImages();
  }

  /**
   * Get image URL from cache or return null if not cached/expired
   */
  getImage(collectibleId: string): string | null {
    const cached = this.cache.get(collectibleId);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(collectibleId);
      this.saveToStorage();
      return null;
    }
    
    return cached.url;
  }

  /**
   * Store image URL in cache
   */
  setImage(collectibleId: string, url: string): void {
    this.cache.set(collectibleId, {
      url,
      timestamp: Date.now(),
      collectibleId
    });
    this.saveToStorage();
  }

  /**
   * Get multiple images from cache
   */
  getImages(collectibleIds: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const id of collectibleIds) {
      const url = this.getImage(id);
      if (url) {
        result[id] = url;
      }
    }
    
    return result;
  }

  /**
   * Store multiple images in cache
   */
  setImages(images: Record<string, string>): void {
    const timestamp = Date.now();
    
    for (const [collectibleId, url] of Object.entries(images)) {
      this.cache.set(collectibleId, {
        url,
        timestamp,
        collectibleId
      });
    }
    
    this.saveToStorage();
  }

  /**
   * Get uncached collectible IDs from a list
   */
  getUncachedIds(collectibleIds: string[]): string[] {
    return collectibleIds.filter(id => !this.getImage(id));
  }

  /**
   * Clean expired images from cache
   */
  private cleanExpiredImages(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, cached] of Array.from(this.cache.entries())) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.cache.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Image cache: Cleaned ${cleaned} expired images`);
      this.saveToStorage();
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
        console.log(`Image cache: Loaded ${this.cache.size} cached images`);
      }
    } catch (error) {
      console.error('Failed to load image cache from storage:', error);
      this.cache.clear();
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save image cache to storage:', error);
    }
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('Image cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; oldestTimestamp: number; newestTimestamp: number } {
    let oldest = Date.now();
    let newest = 0;
    
    for (const cached of Array.from(this.cache.values())) {
      oldest = Math.min(oldest, cached.timestamp);
      newest = Math.max(newest, cached.timestamp);
    }
    
    return {
      size: this.cache.size,
      oldestTimestamp: oldest,
      newestTimestamp: newest
    };
  }
}

// Singleton instance
export const imageCache = new ImageCacheManager();

/**
 * React hook for managing collectible images with caching
 */
export function useImageCache() {
  const getOptimizedImage = (collectibleId: string, fallbackUrl?: string): string => {
    const cached = imageCache.getImage(collectibleId);
    if (cached) {
      return cached;
    }
    
    // Return fallback or default image while loading
    return fallbackUrl || `https://via.placeholder.com/300x200?text=Loading...`;
  };

  const preloadImages = async (collectibleIds: string[]): Promise<void> => {
    const uncachedIds = imageCache.getUncachedIds(collectibleIds);
    
    if (uncachedIds.length === 0) {
      return; // All images already cached
    }

    try {
      // Batch request to Flask backend for image URLs
      const response = await fetch('/api/secure/images/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collectible_ids: uncachedIds }),
      });

      if (response.ok) {
        const images = await response.json();
        imageCache.setImages(images);
        console.log(`Preloaded ${Object.keys(images).length} images to cache`);
      }
    } catch (error) {
      console.error('Failed to preload images:', error);
    }
  };

  return {
    getOptimizedImage,
    preloadImages,
    clearCache: () => imageCache.clear(),
    getCacheStats: () => imageCache.getStats()
  };
}