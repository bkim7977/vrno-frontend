/**
 * Optimized Dashboard Hook - MASSIVE REQUEST REDUCTION
 * Replaces multiple individual API calls with efficient batch operations
 */

import { useQuery } from '@tanstack/react-query';
import { useOptimizedApi } from '@/lib/optimizedApi';
import { useImageCache } from '@/lib/imageCache';
import { useAuth } from '@/contexts/AuthContext';

export function useOptimizedDashboard() {
  const { user } = useAuth();
  const optimizedApi = useOptimizedApi();
  const { preloadImages, getOptimizedImage } = useImageCache();

  // Single request for complete user data - ELIMINATES 3+ SEPARATE CALLS
  const { data: userData, isLoading: userDataLoading } = useQuery({
    queryKey: ['user-data-complete', user?.username],
    queryFn: async () => {
      if (!user?.username) return null;
      return await optimizedApi.getUserDataComplete(user.username);
    },
    enabled: !!user?.username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes for balance updates
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  // Get collectible IDs from user assets
  const collectibleIds = userData?.assets?.map((asset: any) => asset.id) || [];

  // Batch fetch collectible data - SINGLE REQUEST INSTEAD OF MULTIPLE
  const { data: collectiblesData, isLoading: collectiblesLoading } = useQuery({
    queryKey: ['collectibles-batch', collectibleIds],
    queryFn: async () => {
      if (collectibleIds.length === 0) return [];
      return await optimizedApi.getCollectiblesBatch(collectibleIds);
    },
    enabled: collectibleIds.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour - collectible data rarely changes
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  // Batch fetch current prices - SINGLE REQUEST INSTEAD OF MULTIPLE
  const { data: currentPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['prices-batch', collectibleIds],
    queryFn: async () => {
      if (collectibleIds.length === 0) return {};
      return await optimizedApi.getPricesBatch(collectibleIds);
    },
    enabled: collectibleIds.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  // Preload images for all collectibles - PREVENTS REPEATED IMAGE CALLS
  useQuery({
    queryKey: ['preload-images', collectibleIds],
    queryFn: async () => {
      if (collectibleIds.length === 0) return null;
      await preloadImages(collectibleIds);
      return true;
    },
    enabled: collectibleIds.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  // Calculate performance and statistics
  const calculatePerformance = () => {
    if (!userData?.assets || !currentPrices || !collectiblesData) {
      return { totalValue: 0, totalCost: 0, totalProfit: 0, profitPercentage: 0 };
    }

    let totalValue = 0;
    let totalCost = 0;

    for (const asset of userData.assets) {
      const currentPrice = currentPrices[asset.id] || asset.current_price;
      const quantity = asset.quantity;
      const userPrice = asset.user_price;

      totalValue += currentPrice * quantity;
      totalCost += userPrice * quantity;
    }

    const totalProfit = totalValue - totalCost;
    const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalProfit,
      profitPercentage
    };
  };

  // Enhanced asset data with current prices and images
  const enhancedAssets = userData?.assets?.map((asset: any) => {
    const collectibleData = collectiblesData?.find((c: any) => c.id === asset.id);
    const currentPrice = currentPrices?.[asset.id] || asset.current_price;
    const imageUrl = getOptimizedImage(asset.id, collectibleData?.image_url);
    
    return {
      ...asset,
      name: collectibleData?.name || `Asset ${asset.id}`,
      current_price: currentPrice,
      image_url: imageUrl,
      profit: (currentPrice - asset.user_price) * asset.quantity,
      profitPercentage: asset.user_price > 0 ? ((currentPrice - asset.user_price) / asset.user_price) * 100 : 0
    };
  }) || [];

  const performance = calculatePerformance();
  const isLoading = userDataLoading || collectiblesLoading || pricesLoading;

  return {
    // User data
    balance: userData?.balance || 0,
    assets: enhancedAssets,
    referrals: userData?.referrals,
    
    // Performance metrics
    performance,
    
    // Loading states
    isLoading,
    
    // Utilities
    processTransaction: optimizedApi.processTransaction,
    getOptimizedImage,
    
    // Cache stats for monitoring
    getCacheStats: optimizedApi.getCacheStats
  };
}