/**
 * Optimized API Client - MASSIVE REQUEST REDUCTION
 * Implements intelligent batching, caching, and request optimization
 */

import { imageCache } from './imageCache';

interface BatchRequest {
  collectibleIds: string[];
  timestamp: number;
}

interface PriceCache {
  [collectibleId: string]: {
    price: number;
    timestamp: number;
  };
}

interface CollectibleCache {
  [collectibleId: string]: {
    data: any;
    timestamp: number;
  };
}

class OptimizedApiClient {
  private priceCache: PriceCache = {};
  private collectibleCache: CollectibleCache = {};
  private pendingBatchRequests = new Set<string>();
  private readonly PRICE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly COLLECTIBLE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private readonly FLASK_BASE_URL = '/api'; // Use existing Express backend for now

  /**
   * Get multiple collectibles in a single optimized request
   */
  async getCollectiblesBatch(collectibleIds: string[]): Promise<any[]> {
    const now = Date.now();
    const cached: any[] = [];
    const uncachedIds: string[] = [];

    // Check cache first
    for (const id of collectibleIds) {
      const cachedItem = this.collectibleCache[id];
      if (cachedItem && now - cachedItem.timestamp < this.COLLECTIBLE_CACHE_DURATION) {
        cached.push(cachedItem.data);
      } else {
        uncachedIds.push(id);
      }
    }

    // Fetch uncached items in batch
    if (uncachedIds.length > 0) {
      try {
        const response = await fetch(`${this.FLASK_BASE_URL}/secure/collectibles/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ collectible_ids: uncachedIds }),
        });

        if (response.ok) {
          const freshData = await response.json();
          
          // Cache the fresh data
          for (const item of freshData) {
            this.collectibleCache[item.id] = {
              data: item,
              timestamp: now
            };
          }
          
          cached.push(...freshData);
          console.log(`Batch fetched ${freshData.length} collectibles, ${cached.length - freshData.length} from cache`);
        }
      } catch (error) {
        console.error('Batch collectibles request failed:', error);
      }
    }

    return cached;
  }

  /**
   * Get current prices for multiple collectibles with intelligent caching
   */
  async getPricesBatch(collectibleIds: string[]): Promise<Record<string, number>> {
    const now = Date.now();
    const result: Record<string, number> = {};
    const uncachedIds: string[] = [];

    // Check price cache
    for (const id of collectibleIds) {
      const cached = this.priceCache[id];
      if (cached && now - cached.timestamp < this.PRICE_CACHE_DURATION) {
        result[id] = cached.price;
      } else {
        uncachedIds.push(id);
      }
    }

    // Fetch fresh prices for uncached items
    if (uncachedIds.length > 0) {
      try {
        const response = await fetch(`${this.FLASK_BASE_URL}/secure/prices/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ collectible_ids: uncachedIds }),
        });

        if (response.ok) {
          const freshPrices = await response.json();
          
          // Cache fresh prices
          for (const [id, price] of Object.entries(freshPrices)) {
            this.priceCache[id] = {
              price: price as number,
              timestamp: now
            };
            result[id] = price as number;
          }
          
          console.log(`Price batch: ${Object.keys(freshPrices).length} fresh, ${Object.keys(result).length - Object.keys(freshPrices).length} cached`);
        }
      } catch (error) {
        console.error('Batch prices request failed:', error);
      }
    }

    return result;
  }

  /**
   * Process transaction through secure Flask backend
   */
  async processTransaction(data: {
    user_id: string;
    collectible_id: string;
    transaction_type: string;
    quantity: number;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.FLASK_BASE_URL}/secure/transaction/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transaction failed');
      }

      const result = await response.json();
      
      // Invalidate relevant caches after successful transaction
      this.invalidateUserCache(data.user_id);
      
      return result;
    } catch (error) {
      console.error('Secure transaction failed:', error);
      throw error;
    }
  }

  /**
   * Get complete user data in single request - ELIMINATES MULTIPLE CALLS
   */
  async getUserDataComplete(username: string): Promise<any> {
    try {
      const response = await fetch(`${this.FLASK_BASE_URL}/secure/user/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user data');
      }

      const userData = await response.json();
      console.log('Complete user data fetched in single request');
      return userData;
    } catch (error) {
      console.error('Complete user data fetch failed:', error);
      throw error;
    }
  }

  /**
   * Preload and cache images for multiple collectibles
   */
  async preloadImages(collectibleIds: string[]): Promise<void> {
    const uncachedIds = imageCache.getUncachedIds(collectibleIds);
    
    if (uncachedIds.length === 0) {
      return; // All images already cached
    }

    try {
      const response = await fetch(`${this.FLASK_BASE_URL}/secure/images/batch`, {
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
      console.error('Image preload failed:', error);
    }
  }

  /**
   * Invalidate caches for a specific user
   */
  private invalidateUserCache(userId: string): void {
    // Clear price cache to get fresh prices after transaction
    this.priceCache = {};
    console.log('Price cache invalidated after transaction');
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.priceCache = {};
    this.collectibleCache = {};
    imageCache.clear();
    console.log('All API caches cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): any {
    const priceCount = Object.keys(this.priceCache).length;
    const collectibleCount = Object.keys(this.collectibleCache).length;
    const imageStats = imageCache.getStats();
    
    return {
      prices: priceCount,
      collectibles: collectibleCount,
      images: imageStats.size,
      totalCached: priceCount + collectibleCount + imageStats.size
    };
  }
}

// Singleton instance
export const optimizedApi = new OptimizedApiClient();

/**
 * React hook for optimized API operations
 */
export function useOptimizedApi() {
  return {
    getCollectiblesBatch: optimizedApi.getCollectiblesBatch.bind(optimizedApi),
    getPricesBatch: optimizedApi.getPricesBatch.bind(optimizedApi),
    processTransaction: optimizedApi.processTransaction.bind(optimizedApi),
    getUserDataComplete: optimizedApi.getUserDataComplete.bind(optimizedApi),
    preloadImages: optimizedApi.preloadImages.bind(optimizedApi),
    clearCaches: optimizedApi.clearAllCaches.bind(optimizedApi),
    getCacheStats: optimizedApi.getCacheStats.bind(optimizedApi)
  };
}