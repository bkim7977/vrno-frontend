import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Coins, Gift, ArrowUpDown, Users, Plus, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ReferralModal } from '@/components/ReferralModal';
import { useSharedPrices } from '@/hooks/useSharedPrices';
import { useOptimizedImages } from '@/hooks/useOptimizedImages';
import { useBatchPercentageChanges } from '@/hooks/usePercentageChange';
import { profileApi, tokenApi, collectiblesApi, transactionsApi } from '@/lib/api';

// Import all the asset screenshots for the original UI  
import Screenshot_2025_07_27_at_4_21_20_PM_removebg_preview from "@assets/Screenshot_2025-07-27_at_4.21.20_PM-removebg-preview.png";

interface DashboardProps {
  onCollectibleSelect?: (id: string) => void;
}

export default function Dashboard({ onCollectibleSelect }: DashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [staticTokenImage, setStaticTokenImage] = useState('');

  // =====================================================
  // EFFICIENT BATCHED BACKEND SYSTEM (New)
  // =====================================================
  
  // Use shared price system with 15-minute updates (Dashboard is active view)
  const { allPrices, isLoading: pricesLoading, getPriceForCollectible } = useSharedPrices(true);

  // Fetch batch collectibles data for proper Supabase eBay images (same as marketplace)
  const { data: collectibles, isLoading: collectiblesLoading } = useQuery({
    queryKey: ['collectibles'],
    queryFn: async () => {
      console.log('Dashboard: Fetching collectibles batch data...');
      const result = await collectiblesApi.getAll();
      console.log('Dashboard: Collectibles batch data loaded:', result?.length || 0, 'items');
      return result;
    },
  });

  // Use shared percentage change system for consistency with Marketplace
  const collectibleIds = (collectibles || []).map(c => c.id);
  const { calculatePercentChange } = useBatchPercentageChanges(collectibleIds, true);

  // Fetch user's assets using batched API with optimized caching
  const { data: userAssets, isLoading: userAssetsLoading, refetch: refetchUserAssets } = useQuery({
    queryKey: ['user-assets', user?.username],
    queryFn: async () => {
      if (!user?.username) return [];
      return await tokenApi.getUserAssets(user.username);
    },
    enabled: !!user?.username,
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes to reduce API calls
    refetchOnWindowFocus: false, // Disable focus triggers to prevent excessive calls
    refetchInterval: 15 * 60 * 1000, // Background refresh every 15 minutes for price updates
    refetchIntervalInBackground: false, // No background refetch when tab inactive
    networkMode: 'online', // Only fetch when online
  });

  // Fetch user balance using batched API with optimized caching
  const { data: tokenBalance, isLoading: tokenBalanceLoading, refetch: refetchTokenBalance } = useQuery({
    queryKey: ['user-balance', user?.username],
    queryFn: async () => user?.username ? await profileApi.getTokenBalance(user.username) : null,
    enabled: !!user?.username,
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes to reduce API calls
    refetchOnWindowFocus: false, // Disable focus triggers to prevent excessive calls
    refetchInterval: 15 * 60 * 1000, // Background refresh every 15 minutes for balance updates
    refetchIntervalInBackground: false, // No background refetch when tab inactive
    networkMode: 'online', // Only fetch when online
  });



  // Fetch referral code using batched API with optimized caching
  const { data: referralCodeData, isLoading: referralCodeLoading } = useQuery({
    queryKey: ['referral-code', user?.username],
    queryFn: async () => {
      if (!user?.username) return null;
      return await profileApi.getReferrals(user.username);
    },
    enabled: !!user?.username,
    staleTime: 30 * 60 * 1000, // Fresh for 30 minutes (referrals rarely change)
    refetchOnWindowFocus: false,
  });

  // Helper functions for ID mapping and price calculations
  const mapAssetId = (id: string) => {
    if (id === 'genesect-ex-black-bolt-161-086') return '00000000-0000-0000-0000-000000000001';
    if (id === 'ethan-ho-oh-ex-surging-sparks-209-191') return '00000000-0000-0000-0000-000000000002';
    if (id === 'hilda-164-white-flare') return '00000000-0000-0000-0000-000000000003';
    if (id === 'kyurem-ex-black-bolt-165-086') return '00000000-0000-0000-0000-000000000004';
    if (id === 'volcanion-ex-journey-together-182-159') return '00000000-0000-0000-0000-000000000005';
    return id;
  };

  const getCurrentTokenPrice = (collectibleId: string): number => {
    const mappedId = mapAssetId(collectibleId);
    const price = getPriceForCollectible(collectibleId) || getPriceForCollectible(mappedId);
    return price ? Math.round(price * 100) : 0;
  };

  // Set up optimized images with current prices
  const allRelevantIds = [
    ...(userAssets || []).map(asset => asset.id),
    ...(collectibleIds || [])
  ];

  const mappedCollectibleIds = allRelevantIds.map(id => mapAssetId(id));
  const currentPrices = mappedCollectibleIds.reduce((acc, mappedId, index) => {
    const originalId = allRelevantIds[index];
    acc[mappedId] = getPriceForCollectible(originalId) || 0;
    return acc;
  }, {} as Record<string, number>);

  const { getOptimizedImage, isLoading: imagesLoading } = useOptimizedImages(mappedCollectibleIds, currentPrices, true);

  // Calculate total portfolio value (same logic as original)
  const calculateTotalPortfolioValue = () => {
    if (!userAssets || userAssets.length === 0) return 0;
    return userAssets.reduce((total, asset) => {
      const mappedId = mapAssetId(asset.id);
      const currentPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId) || Number(asset.current_price);
      return total + (currentPrice * Number(asset.quantity) * 100);
    }, 0);
  };

  // Calculate net gain percentage (same logic as original)
  const calculateNetGainPercentage = () => {
    if (!userAssets || userAssets.length === 0) return 0;
    let totalCurrentValue = 0;
    let totalPurchaseValue = 0;

    userAssets.forEach((asset) => {
      const mappedId = mapAssetId(asset.id);
      const currentPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId) || Number(asset.current_price);
      const purchasePrice = Number(asset.user_price) || 0;
      const quantity = Number(asset.quantity) || 0;

      totalCurrentValue += currentPrice * quantity;
      totalPurchaseValue += purchasePrice * quantity;
    });

    if (totalPurchaseValue === 0) return 0;
    return ((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100;
  };

  useEffect(() => {
    import('../constants/images').then(({ STATIC_TOKEN_BASE64 }) => {
      setStaticTokenImage(STATIC_TOKEN_BASE64);
    });
  }, []);

  // Listen for transaction completion events for instant updates
  useEffect(() => {
    const handleTransactionComplete = (event: any) => {
      const { type, preemptive, optimistic, confirmed } = event.detail;
      console.log(`Dashboard: ${type} transaction ${preemptive ? 'starting' : optimistic ? 'optimistic' : confirmed ? 'confirmed' : 'completed'}`);
      
      // Immediately invalidate and refetch for instant UI updates
      queryClient.invalidateQueries({ queryKey: ['user-assets', user?.username] });
      queryClient.invalidateQueries({ queryKey: ['user-balance', user?.username] });
      
      // Different refresh strategies based on event type
      if (preemptive) {
        // Immediate refresh when user clicks buy/sell (before API call)
        refetchUserAssets();
        refetchTokenBalance();
      } else if (optimistic) {
        // INSTANT refresh during API call - no delay
        refetchUserAssets();
        refetchTokenBalance();
      } else {
        // Final confirmation refresh - minimal delay
        setTimeout(() => {
          refetchUserAssets();
          refetchTokenBalance();
        }, 20);
      }
    };

    const handleTokenBalanceUpdate = () => {
      console.log('Token balance updated - immediate refresh');
      queryClient.invalidateQueries({ queryKey: ['user-balance', user?.username] });
      setTimeout(() => refetchTokenBalance(), 50);
    };

    // Listen for custom events from transaction modals
    window.addEventListener('transactionComplete', handleTransactionComplete);
    window.addEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
    
    return () => {
      window.removeEventListener('transactionComplete', handleTransactionComplete);
      window.removeEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
    };
  }, [queryClient, user?.username, refetchUserAssets, refetchTokenBalance]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Live Updates</span>
          </div>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">

        {/* Collectible Movements */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center min-h-[80px]">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <ArrowUpDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-sm font-medium text-muted-foreground">Movements</div>
                {userAssetsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    {(() => {
                      if (!Array.isArray(userAssets) || userAssets.length === 0) {
                        return (
                          <div className="text-2xl font-bold text-muted-foreground">
                            No data
                          </div>
                        );
                      }
                      
                      let rising = 0;
                      let falling = 0;
                      
                      userAssets.forEach((asset: any) => {
                        const mappedId = mapAssetId(asset.id);
                        const currentPrice = getPriceForCollectible(mappedId);
                        const purchasePrice = asset.user_price || asset.current_price;
                        
                        if (currentPrice && purchasePrice && asset.quantity > 0) {
                          if (currentPrice > purchasePrice) {
                            rising++;
                          } else if (currentPrice < purchasePrice) {
                            falling++;
                          }
                        }
                      });
                      
                      return (
                        <div className="flex flex-col gap-1">
                          <div className="text-lg font-bold text-green-600">
                            {rising} Rising
                          </div>
                          <div className="text-lg font-bold text-red-600">
                            {falling} Falling
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Net Gains Summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center min-h-[80px]">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500 dark:text-emerald-300" />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-sm font-medium text-muted-foreground">Portfolio Gains</div>
                {userAssetsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    {(() => {
                      if (!Array.isArray(userAssets) || userAssets.length === 0) {
                        return (
                          <div className="text-2xl font-bold text-muted-foreground">
                            No data
                          </div>
                        );
                      }
                      
                      let totalCurrentValue = 0;
                      let totalPurchaseValue = 0;
                      let totalLosses = 0;
                      
                      userAssets.forEach((asset: any) => {
                        const mappedId = mapAssetId(asset.id);
                        const currentPrice = getPriceForCollectible(mappedId);
                        const purchasePrice = asset.user_price || asset.current_price;
                        
                        if (currentPrice && purchasePrice && asset.quantity > 0) {
                          const currentValue = currentPrice * asset.quantity * 100; // Convert to tokens
                          const purchaseValue = purchasePrice * asset.quantity * 100; // Convert to tokens
                          
                          totalCurrentValue += currentValue;
                          totalPurchaseValue += purchaseValue;
                          
                          const gain = currentValue - purchaseValue;
                          if (gain < 0) {
                            totalLosses += Math.abs(gain);
                          }
                        }
                      });
                      
                      const netGains = totalCurrentValue - totalPurchaseValue;
                      const netGainsPercent = totalPurchaseValue > 0 ? ((netGains / totalPurchaseValue) * 100).toFixed(1) : '0.0';
                      const netGainsColor = netGains >= 0 ? 'text-green-600' : 'text-red-600';
                      
                      return (
                        <>
                          <div className={`text-2xl font-bold ${netGainsColor}`}>
                            {netGains >= 0 ? '+' : ''}{netGainsPercent}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(totalLosses).toLocaleString()} tokens lost
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Balance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center min-h-[80px]">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden">
                  {staticTokenImage ? (
                    <img 
                      src={Screenshot_2025_07_27_at_4_21_20_PM_removebg_preview}
                      alt="Token Balance" 
                      className="w-14 h-14 object-contain filter contrast-125 brightness-110"
                      style={{ imageRendering: 'crisp-edges' }}
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  )}
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-sm font-medium text-muted-foreground">Token Balance</div>
                {tokenBalanceLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">
                    {Number((tokenBalance as any)?.balance || 0).toLocaleString()} tokens
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals */}
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:bg-muted/50 hover:border-primary/50" onClick={() => setShowReferralModal(true)}>
          <CardContent className="p-6">
            <div className="flex items-center min-h-[80px]">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-sm font-medium text-muted-foreground">Referrals</div>
                {referralCodeLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{referralCodeData?.usedCount || 0}/20</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {referralCodeData?.hasCode ? 'Click to view code' : 'Click to create code'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>




      </div>

        {/* User Assets Section - Original Layout with Batched Backend */}
        <Card>
          <CardHeader>
            <CardTitle>
              Owned Collectibles ({Array.isArray(userAssets) ? userAssets.reduce((total, asset) => total + (asset.quantity || 0), 0) : 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userAssetsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <Skeleton className="aspect-[3/4] w-full mb-3 rounded" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-2" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !Array.isArray(userAssets) || userAssets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No collectibles owned yet. Visit the marketplace to buy some!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userAssets.map((asset: any) => {
                  // Find matching collectible from batch data (same as marketplace)
                  const collectible = collectibles?.find(c => c.id === asset.id) || 
                    collectibles?.find(c => {
                      // Map between different ID formats
                      if ((asset.id === 'genesect-ex-black-bolt-161-0' || asset.id === 'genesect-ex-black-bolt-161-086') && 
                          c.id === '00000000-0000-0000-0000-000000000001') return true;
                      if (asset.id === 'ethan-hooh-ex-209-destined-rivals' && 
                          c.id === '00000000-0000-0000-0000-000000000002') return true;
                      if (asset.id === 'hilda-164-white-flare' && 
                          c.id === '00000000-0000-0000-0000-000000000003') return true;
                      return false;
                    });
                  
                  // Map asset ID to UUID for optimized image lookup
                  const mappedId = mapAssetId(asset.id);

                  // Get optimized image data (synced with CollectibleDetails)
                  const optimizedImage = getOptimizedImage(mappedId);
                  
                  // Priority: Use optimized eBay image first, then fallback to collectible data
                  const imageUrl = optimizedImage?.imageUrl || collectible?.imageUrl || asset.image_url;
                  
                  console.log(`Dashboard image debug - Asset ID: ${asset.id}, Mapped ID: ${mappedId}, Optimized: ${optimizedImage?.imageUrl}, Collectible: ${collectible?.imageUrl}, Asset: ${asset.image_url}, Final: ${imageUrl}`);
                  
                  // Fallback display data for missing collectibles
                  const displayName = collectible?.name || 
                    (asset.id === 'genesect-ex-black-bolt-161-0' || asset.id === 'genesect-ex-black-bolt-161-086' ? 'Genesect EX Black Bolt 161/086' :
                     asset.id === 'ethan-hooh-ex-209-destined-rivals' ? "Ethan's Ho-oh EX #209 Destined Rivals" :
                     asset.id === 'hilda-164-white-flare' ? 'Hilda #164 White Flare' :
                     asset.name || asset.id);
                  
                  const displayDescription = collectible?.description || 
                    (asset.id === 'genesect-ex-black-bolt-161-0' || asset.id === 'genesect-ex-black-bolt-161-086' ? 'Black Bolt Series' :
                     asset.id === 'ethan-hooh-ex-209-destined-rivals' ? 'Destined Rivals' :
                     asset.id === 'hilda-164-white-flare' ? 'White Flare' :
                     asset.set_name || 'Trading Card');
                  
                  return (
                    <div 
                      key={asset.id} 
                      className="border rounded-lg p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:bg-muted/50 hover:border-primary/50" 
                      onClick={() => {
                        console.log('Asset card clicked:', asset.id, asset.name);
                        onCollectibleSelect?.(asset.id);
                      }}
                    >
                      <div className="relative mb-3">
                        {/* Use optimized image from same system as CollectibleDetails */}
                        <div className="aspect-w-3 aspect-h-4 overflow-hidden">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={displayName}
                              className={`w-full aspect-[3/4] object-cover rounded border group-hover:scale-105 transition-transform duration-200 filter contrast-110 saturate-110 ${collectible?.name?.includes('Hydreigon') ? 'object-center scale-115 brightness-105' : ''}`}
                              onError={(e) => {
                                console.log(`Failed to load optimized image for ${displayName}: ${imageUrl}`);
                                // Use a simple data URL as fallback
                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="128" viewBox="0 0 200 128"><rect width="200" height="128" fill="%23f3f4f6"/><text x="100" y="70" text-anchor="middle" font-family="Arial" font-size="14" fill="%23374151">No Image</text></svg>';
                              }}
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] bg-muted rounded border flex items-center justify-center">
                              <span className="text-muted-foreground text-xs">No Image Available</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="absolute top-2 right-2">
                          x{parseFloat(asset.quantity).toFixed(2)}
                        </Badge>
                      </div>
                      
                      {/* eBay listing info from optimized image data or collectible data */}
                      {optimizedImage?.ebayUrl ? (
                        <div className="mb-2 p-2 bg-muted/50 rounded-sm">
                          <a 
                            href={optimizedImage.ebayUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <strong>eBay Source:</strong> ${optimizedImage.ebayPrice} by {optimizedImage.ebaySeller}
                          </a>
                        </div>
                      ) : (collectible as any)?.ebayUrl && (
                        <div className="mb-2 p-2 bg-muted/50 rounded-sm">
                          <a 
                            href={(collectible as any).ebayUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <strong>eBay Source:</strong> ${(collectible as any).ebayPrice} by {(collectible as any).ebaySeller}
                          </a>
                        </div>
                      )}
                      
                      <h3 className="font-medium text-sm mb-1 truncate">
                        {displayName}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {displayDescription}
                      </p>
                    
                      {/* Price Analysis - Using Batched System */}
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Current Price</span>
                          <span className="text-xs font-medium">
                            {(() => {
                              // Use batched price sources: shared prices (with ID mapping), asset current_price, optimized image price
                              const sharedPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId);
                              const assetPrice = Number(asset.current_price);
                              const optimizedPrice = optimizedImage?.ebayPrice ? parseFloat(optimizedImage.ebayPrice) : null;
                              
                              const finalPrice = sharedPrice || assetPrice || optimizedPrice || 0;
                              console.log(`Price debug for ${asset.id} (mapped: ${mappedId}): shared=${sharedPrice}, asset=${assetPrice}, optimized=${optimizedPrice}, final=${finalPrice}`);
                              
                              return finalPrice ? (finalPrice * 100).toLocaleString() + ' tokens' : 'Price unavailable';
                            })()}
                          </span>
                        </div>
                        
                        {/* Overall Return - Using Batched Price Data */}
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-xs text-muted-foreground">Overall Return</span>
                          <span className={`text-xs font-medium ${
                            (() => {
                              // Use the same price calculation logic for color determination
                              const currentPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId) || Number(asset.current_price);
                              const purchasePrice = Number(asset.user_price) || 0;
                              
                              let percentChange = 0;
                              if (purchasePrice > 0) {
                                percentChange = ((currentPrice - purchasePrice) / purchasePrice) * 100;
                              }
                              
                              return percentChange > 0 ? 'text-green-600' : 
                                     percentChange < 0 ? 'text-red-600' : 'text-gray-600';
                            })()
                          }`}>
                            {(() => {
                              try {
                                // Use the most current price for performance calculation (shared price preferred)
                                const currentPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId) || Number(asset.current_price);
                                const purchasePrice = Number(asset.user_price) || 0;
                                
                                let percentChange = 0;
                                if (purchasePrice > 0) {
                                  percentChange = ((currentPrice - purchasePrice) / purchasePrice) * 100;
                                }
                                
                                console.log(`Performance for ${asset.id}: current=${currentPrice}, purchase=${purchasePrice}, change=${percentChange.toFixed(2)}%`);
                                const sign = percentChange >= 0 ? '+' : '';
                                return `${sign}${percentChange.toFixed(1)}%`;
                              } catch (error) {
                                console.log('Performance calculation error for', asset.id, error);
                                return '0.0%';
                              }
                            })()}
                          </span>
                        </div>

                        {/* 24h Price Change - Using Batched Percentage Change System */}
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-xs text-muted-foreground">Change in 24h</span>
                          {(() => {
                            try {
                              // Try both original ID and mapped UUID format for price change calculation
                              let priceChange = calculatePercentChange(asset.id);
                              if (priceChange.percent === '0.0%' || priceChange.percent === '+0.0%') {
                                priceChange = calculatePercentChange(mappedId);
                              }
                              console.log(`24h price change for ${asset.id} (mapped: ${mappedId}):`, priceChange);
                              return (
                                <span className={`text-xs font-medium ${priceChange.colorClass}`}>
                                  {priceChange.percent}
                                </span>
                              );
                            } catch (error) {
                              console.log('Price change calculation error for', asset.id, error);
                              return (
                                <span className="text-xs font-medium text-gray-600">
                                  0.0%
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>



      {/* Referral Modal */}
      <ReferralModal 
        isOpen={showReferralModal} 
        onClose={() => setShowReferralModal(false)} 
      />
    </div>
  );
}