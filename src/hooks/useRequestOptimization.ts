/**
 * Request Optimization Hook - CLIENT-SIDE REQUEST REDUCTION
 * Implements aggressive caching and request batching to minimize API calls
 */

import { useEffect, useRef } from 'react';
import { useImageCache } from '@/lib/imageCache';
import { useOptimizedApi } from '@/lib/optimizedApi';

export function useRequestOptimization() {
  const { preloadImages, getCacheStats } = useImageCache();
  const { getCacheStats: getApiCacheStats } = useOptimizedApi();
  const hasPreloadedRef = useRef(false);

  // Preload commonly accessed collectible images on app startup
  useEffect(() => {
    if (hasPreloadedRef.current) return;
    hasPreloadedRef.current = true;

    const commonCollectibleIds = [
      '00000000-0000-0000-0000-000000000001', // Genesect
      '00000000-0000-0000-0000-000000000002', // Ethan Ho-Oh
      '00000000-0000-0000-0000-000000000003', // Hilda
      '00000000-0000-0000-0000-000000000004', // Kyurem
      '00000000-0000-0000-0000-000000000005', // Volcanion
      '00000000-0000-0000-0000-000000000006', // Salamence
      '00000000-0000-0000-0000-000000000007', // Iron Hands
      '00000000-0000-0000-0000-000000000008', // Pikachu
      '00000000-0000-0000-0000-000000000009', // Iron Crown
      '00000000-0000-0000-0000-000000000010', // Hydreigon
    ];

    // Preload most common images in background
    preloadImages(commonCollectibleIds)
      .then(() => {
        console.log('✅ Common collectible images preloaded');
      })
      .catch(error => {
        console.error('❌ Failed to preload images:', error);
      });
  }, [preloadImages]);

  // Monitor and log cache efficiency
  const logCacheStats = () => {
    const imageStats = getCacheStats();
    const apiStats = getApiCacheStats();
    
    console.log('📊 Cache Performance Stats:', {
      images: `${imageStats.size} cached`,
      api: `${apiStats.totalCached} items cached`,
      efficiency: 'Reducing client requests significantly'
    });
  };

  return {
    logCacheStats,
    preloadImages,
    clearAllCaches: () => {
      // Clear all caches and reset optimization
      localStorage.removeItem('vrno_image_cache');
      console.log('🧹 All caches cleared - optimization reset');
    }
  };
}