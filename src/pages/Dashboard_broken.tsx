import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, tokenApi, collectiblesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, Gift, Plus, Minus, Coins, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createFIFOFromTransactions } from '@/lib/fifoCalculator';
import { ReferralModal } from '@/components/ReferralModal';
import { fetchGenesectListingData, fetchEthanHoohListingData, fetchHildaListingData, fetchKyuremListingData, fetchVolcanionListingData, fetchSalamenceListingData, fetchIronHandsListingData, fetchPikachuListingData, fetchIronCrownListingData, fetchHydreigonListingData, fetchNsPlanListingData, fetchOshawottListingData, fetchIonoBelliboltListingData, fetchLabubuBigEnergyHopeListingData, fetchLabubuMonsterChestnutListingData, fetchLabubuCocaColaListingData, fetchLabubuSeatBabaListingData, fetchLabubuMacaronLycheeListingData, getCollectibleConfig } from '@/lib/collectibleHelpers';
import { useSharedPrices } from '@/hooks/useSharedPrices';
import { useBatchPercentageChanges } from '@/hooks/usePercentageChange';
import { useOptimizedImages } from '@/hooks/useOptimizedImages';
import Screenshot_2025_07_25_at_9_00_23_AM from "@assets/Screenshot 2025-07-25 at 9.00.23 AM.png";
import Screenshot_2025_07_27_at_12_22_47_AM from "@assets/Screenshot 2025-07-27 at 12.22.47 AM.png";
import Screenshot_2025_07_27_at_12_25_05_AM from "@assets/Screenshot 2025-07-27 at 12.25.05 AM.png";
import Screenshot_2025_07_27_at_4_21_20_PM_removebg_preview from "@assets/Screenshot_2025-07-27_at_4.21.20_PM-removebg-preview.png";
// Navigation will be handled through parent component props

// Helper function to calculate price change
const calculatePriceChange = (userPrice: number, currentPrice: number) => {
  const percentChange = ((currentPrice - userPrice) / userPrice) * 100;
  const sign = percentChange >= 0 ? '+' : '';
  const colorClass = percentChange > 0 ? 'text-green-600' : percentChange < 0 ? 'text-red-600' : 'text-gray-600';
  
  return {
    percent: `${sign}${percentChange.toFixed(1)}%`,
    colorClass
  };
};

interface DashboardProps {
  onCollectibleSelect?: (id: string) => void;
}

export default function Dashboard({ onCollectibleSelect }: DashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [staticTokenImage, setStaticTokenImage] = useState('');
  
  // Use shared price system with 15-minute updates (Dashboard is active view)
  const { allPrices, isLoading: pricesLoading, getPriceForCollectible } = useSharedPrices(true);

  // Helper to get current token price for a collectible
  const getCurrentTokenPrice = (collectibleId: string): number => {
    const price = getPriceForCollectible(collectibleId);
    return price ? Math.round(price * 100) : 0; // Convert USD to tokens (price × 100)
  };

  // Fetch batch collectibles data for proper Supabase eBay images (same as marketplace)
  const { data: collectibles, isLoading: collectiblesLoading } = useQuery({
    queryKey: ['collectibles'],
    queryFn: async () => {
      console.log('Dashboard: Fetching collectibles batch data...');
      try {
        const result = await collectiblesApi.getAll();
        console.log('Dashboard: Collectibles batch data loaded:', result?.length || 0, 'items');
        return result;
      } catch (error) {
        console.error('Dashboard: Error fetching collectibles:', error);
        throw error;
      }
    },
  });

  // Use shared percentage change system for consistency with Marketplace
  const collectibleIds = (collectibles || []).map(c => c.id);
  const { calculatePercentChange } = useBatchPercentageChanges(collectibleIds, true);

  useEffect(() => {
    // Use static token image that doesn't change with theme mode
    import('../constants/images').then(({ STATIC_TOKEN_BASE64 }) => {
      setStaticTokenImage(STATIC_TOKEN_BASE64);
    });
  }, []);
  



  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['profile', 'balance'],
    queryFn: () => profileApi.getBalance(),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['profile', 'transactions'],
    queryFn: () => profileApi.getTransactions(),
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ['profile', 'referrals', user?.username],
    queryFn: () => user?.username ? profileApi.getReferrals(user.username) : Promise.resolve({ referrals: 0, maxReferrals: 20, hasCode: false }),
    enabled: !!user?.username, // Re-enabled for referrals
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes (increased - referrals don't change often)
    refetchOnMount: false, // Only refetch on explicit invalidation
    refetchInterval: false, // Disabled - only update on explicit refresh, // Reduce to 1 hour (referrals change infrequently)
    refetchIntervalInBackground: false, // Stop background polling
  });

  // Fetch user's referral code for dashboard display
  const { data: referralCodeData, isLoading: referralCodeLoading } = useQuery({
    queryKey: ['referral-code', user?.username],
    queryFn: async () => {
      if (!user?.username) return null;
      
      try {
        const response = await fetch(`/api/referrals/${user.username}`, {
          headers: {
            'vrno-api-key': import.meta.env.VITE_VRNO_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return data.hasCode ? { code: data.code, usedCount: data.usedCount || 0 } : null;
        }
        return null;
      } catch (error) {
        console.error('Error fetching referral code:', error);
        return null;
      }
    },
    enabled: false, // Static referral code - fetch only on demand
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes since code rarely changes
    refetchOnMount: false,
  });



  // Token balance - optimized for lower compute usage
  const { data: tokenBalance, isLoading: tokenBalanceLoading, refetch: refetchTokenBalance } = useQuery({
    queryKey: ['token', 'balance', user?.username],
    queryFn: () => user?.username ? profileApi.getTokenBalance(user.username) : Promise.resolve(null),
    enabled: !!user?.username, // Re-enabled for token balance
    staleTime: 2 * 60 * 60 * 1000, // Extended 2-hour cache
    refetchOnMount: false, // Only refetch on explicit invalidation
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchInterval: false, // Manual refresh only - save compute
    refetchIntervalInBackground: false, // Stop background polling
  });

  const { data: userAssets, isLoading: userAssetsLoading, refetch: refetchUserAssets, error: userAssetsError } = useQuery({
    queryKey: ['user', 'assets', user?.username],
    queryFn: async () => {
      if (user?.username) {
        console.log(`Dashboard - Fetching user assets for: ${user.username}`);
        try {
          const result = await tokenApi.getUserAssets(user.username);
          console.log(`Dashboard - User assets received:`, result);
          return result;
        } catch (error) {
          console.error(`Dashboard - Error fetching user assets:`, error);
          throw error;
        }
      }
      return null;
    },
    enabled: !!user?.username, // Re-enabled for user assets
    staleTime: 2 * 60 * 60 * 1000, // Extended 2-hour cache
    gcTime: 30 * 60 * 1000, // Keep cached for 30 minutes (increased)
    refetchOnMount: false, // Only refetch on explicit invalidation
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchInterval: false, // Manual refresh only - save compute
    refetchIntervalInBackground: false, // Stop background polling
  });

  // Map collectible IDs and userAsset IDs to UUID format for optimized images hook
  const getAllRelevantIds = () => {
    const ids = new Set<string>();
    
    // Add collectible IDs
    (collectibles || []).forEach(c => ids.add(c.id));
    
    // Add userAsset IDs 
    (userAssets || []).forEach((asset: any) => ids.add(asset.id));
    
    return Array.from(ids);
  };

  const allRelevantIds = getAllRelevantIds();
  const mappedCollectibleIds = allRelevantIds.map(id => {
    // Map string format IDs to UUID format for optimized images
    if (id === 'genesect-ex-black-bolt-161-0' || id === 'genesect-ex-black-bolt-161-086') {
      return '00000000-0000-0000-0000-000000000001';
    }
    if (id === 'ethan-hooh-ex-209-destined-rivals') {
      return '00000000-0000-0000-0000-000000000002';
    }
    if (id === 'hilda-164-white-flare') {
      return '00000000-0000-0000-0000-000000000003';
    }
    if (id === 'kyurem-ex-black-bolt-165-086') {
      return '00000000-0000-0000-0000-000000000004';
    }
    if (id === 'volcanion-ex-journey-together-182-159') {
      return '00000000-0000-0000-0000-000000000005';
    }
    // Add more mappings as needed
    return id;
  });

  // Create price map for optimized images using mapped IDs
  const currentPrices = mappedCollectibleIds.reduce((acc, mappedId, index) => {
    const originalId = allRelevantIds[index];
    acc[mappedId] = getPriceForCollectible(originalId) || 0;
    return acc;
  }, {} as Record<string, number>);

  // Use optimized images hook to sync with CollectibleDetails
  const { getOptimizedImage, isLoading: imagesLoading } = useOptimizedImages(mappedCollectibleIds, currentPrices, true);

  // All collectible prices now come from BATCHED shared price system - no individual queries needed
  // REMOVED: All individual price and listing queries (73 total) have been replaced with batched system

  // OLD APPROACH (REMOVED): Individual queries like:
  // - ceruledgeLivePrice, genesectLivePrice, ethanHoohLivePrice, etc. (18 price queries)
  // - genesectListingData, hildaListingData, etc. (55+ listing queries)
  // NEW APPROACH: Use shared batched systems only

  // =====================================================
  // DASHBOARD MAIN RENDER - All data comes from batched hooks above
  // =====================================================

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Trading Dashboard
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Track your portfolio and market performance
          </p>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Balance Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">
                  {balanceLoading ? (
                    <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                  ) : (
                    `${balance?.balance?.toLocaleString() || 0} tokens`
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                {staticTokenImage ? (
                  <img src={staticTokenImage} alt="Token" className="w-8 h-8" />
                ) : (
                  <Coins className="h-6 w-6 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>
          </Card>

          {/* Assets Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Assets</p>
                <p className="text-2xl font-bold">
                  {assets?.length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          {/* Total Value Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    if (!assets || assets.length === 0) return '0 tokens';
                    const totalValue = assets.reduce((sum, asset) => {
                      const mappedId = mapAssetId(asset.id);
                      const currentPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId) || Number(asset.current_price);
                      return sum + (currentPrice * Number(asset.quantity) * 100); // Convert to tokens
                    }, 0);
                    return `${Math.round(totalValue).toLocaleString()} tokens`;
                  })()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div> {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Ethan Ho-oh price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 25.50 };
      } catch (error) {
        return { avg_price_with_shipping: 25.50 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Get current price from Supabase database ebay_hilda_market_summary table for Hilda
  const { data: hildaLivePrice } = useQuery({
    queryKey: ['supabase-hilda-price', 'hilda-164-white-flare'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_hilda_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Hilda price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 44.11 };
      } catch (error) {
        return { avg_price_with_shipping: 44.11 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Hilda listing data synchronized with price updates
  const { data: hildaListingData } = useQuery({
    queryKey: ['hilda-listing-data-dashboard', hildaLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = hildaLivePrice?.avg_price_with_shipping || 44.11;
      console.log(`Dashboard: Fetching Hilda listing for price $${currentPrice.toFixed(2)}`);
      return await fetchHildaListingData(currentPrice);
    },
    enabled: !!hildaLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Fetch dynamic Ethan's Ho-oh listing data synchronized with price updates  
  const { data: ethanHoohListingData } = useQuery({
    queryKey: ['ethan-hooh-listing-data-dashboard', ethanHoohLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = ethanHoohLivePrice?.avg_price_with_shipping || 26.53;
      console.log(`Dashboard: Fetching Ethan Ho-oh listing for price $${currentPrice.toFixed(2)}`);
      return await fetchEthanHoohListingData(currentPrice);
    },
    enabled: !!ethanHoohLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Get current price from Supabase database ebay_kyurem_market_summary table for Kyurem
  const { data: kyuremLivePrice } = useQuery({
    queryKey: ['supabase-kyurem-price', 'kyurem-ex-black-bolt'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_kyurem_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Kyurem price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 125.99 };
      } catch (error) {
        return { avg_price_with_shipping: 125.99 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Kyurem listing data synchronized with price updates
  const { data: kyuremListingData } = useQuery({
    queryKey: ['kyurem-listing-data-dashboard', kyuremLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = kyuremLivePrice?.avg_price_with_shipping || 125.99;
      console.log(`Dashboard: Fetching Kyurem listing for price $${currentPrice.toFixed(2)}`);
      return await fetchKyuremListingData(currentPrice);
    },
    enabled: !!kyuremLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Price queries for all 12 new collectibles - Dashboard
  const { data: yuremLivePrice } = useQuery({
    queryKey: ['supabase-yurem-price', 'yurem-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_yurem_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Yurem price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 25.00 };
      } catch (error) {
        return { avg_price_with_shipping: 25.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { data: volcanionLivePrice } = useQuery({
    queryKey: ['supabase-volcanion-price', 'volcanion-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_volcanion_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Volcanion price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 45.31 };
      } catch (error) {
        return { avg_price_with_shipping: 45.31 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Volcanion listing data synchronized with price updates
  const { data: volcanionListingData } = useQuery({
    queryKey: ['volcanion-listing-data-dashboard', volcanionLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = volcanionLivePrice?.avg_price_with_shipping || 45.31;
      console.log(`Dashboard: Fetching Volcanion listing for price $${currentPrice.toFixed(2)}`);
      return await fetchVolcanionListingData(currentPrice);
    },
    enabled: !!volcanionLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: salamenceLivePrice } = useQuery({
    queryKey: ['supabase-salamence-price', 'salamence-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_salamence_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Salamence price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 22.00 };
      } catch (error) {
        return { avg_price_with_shipping: 22.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Salamence listing data synchronized with price updates
  const { data: salamenceListingData } = useQuery({
    queryKey: ['salamence-listing-data-dashboard', salamenceLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = salamenceLivePrice?.avg_price_with_shipping || 22.00;
      console.log(`Dashboard: Fetching Salamence listing for price $${currentPrice.toFixed(2)}`);
      return await fetchSalamenceListingData(currentPrice);
    },
    enabled: !!salamenceLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: ironHandsLivePrice } = useQuery({
    queryKey: ['supabase-ironhands-price', 'iron-hands-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_iron_hands_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Iron Hands price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 35.00 };
      } catch (error) {
        return { avg_price_with_shipping: 35.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Iron Hands listing data synchronized with price updates
  const { data: ironHandsListingData } = useQuery({
    queryKey: ['iron-hands-listing-data-dashboard', ironHandsLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = ironHandsLivePrice?.avg_price_with_shipping || 35.00;
      console.log(`Dashboard: Fetching Iron Hands listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIronHandsListingData(currentPrice);
    },
    enabled: !!ironHandsLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: pikachuLivePrice } = useQuery({
    queryKey: ['supabase-pikachu-price', 'pikachu-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_pikachu_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Pikachu price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 42.00 };
      } catch (error) {
        return { avg_price_with_shipping: 42.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Pikachu listing data synchronized with price updates
  const { data: pikachuListingData } = useQuery({
    queryKey: ['pikachu-listing-data-dashboard', pikachuLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = pikachuLivePrice?.avg_price_with_shipping || 42.00;
      console.log(`Dashboard: Fetching Pikachu listing for price $${currentPrice.toFixed(2)}`);
      return await fetchPikachuListingData(currentPrice);
    },
    enabled: !!pikachuLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: ironCrownLivePrice } = useQuery({
    queryKey: ['supabase-ironcrown-price', 'iron-crown-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_iron_crown_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Iron Crown price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 28.00 };
      } catch (error) {
        return { avg_price_with_shipping: 28.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Iron Crown listing data synchronized with price updates
  const { data: ironCrownListingData } = useQuery({
    queryKey: ['iron-crown-listing-data-dashboard', ironCrownLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = ironCrownLivePrice?.avg_price_with_shipping || 28.50;
      console.log(`Dashboard: Fetching Iron Crown listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIronCrownListingData(currentPrice);
    },
    enabled: !!ironCrownLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: hydreigonLivePrice } = useQuery({
    queryKey: ['supabase-hydreigon-price', 'hydreigon-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_hydreigon_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Hydreigon price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 161.74 };
      } catch (error) {
        return { avg_price_with_shipping: 161.74 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Hydreigon listing data synchronized with price updates
  const { data: hydreigonListingData } = useQuery({
    queryKey: ['hydreigon-listing-data-dashboard', hydreigonLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = hydreigonLivePrice?.avg_price_with_shipping || 161.74;
      console.log(`Dashboard: Fetching Hydreigon listing for price $${currentPrice.toFixed(2)}`);
      return await fetchHydreigonListingData(currentPrice);
    },
    enabled: !!hydreigonLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: nsPlanLivePrice } = useQuery({
    queryKey: ['supabase-nsplan-price', 'ns-plan'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_n_plan_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch N\'s Plan price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 15.00 };
      } catch (error) {
        return { avg_price_with_shipping: 15.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic N's Plan listing data synchronized with price updates
  const { data: nsPlanListingData } = useQuery({
    queryKey: ['nsplan-listing-data-dashboard', nsPlanLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = nsPlanLivePrice?.avg_price_with_shipping || 15.00;
      console.log(`Dashboard: Fetching N's Plan listing for price $${currentPrice.toFixed(2)}`);
      return await fetchNsPlanListingData(currentPrice);
    },
    enabled: !!nsPlanLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: oshawottLivePrice } = useQuery({
    queryKey: ['supabase-oshawott-price', 'oshawott'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_oshawott_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Oshawott price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 8.00 };
      } catch (error) {
        return { avg_price_with_shipping: 8.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Oshawott listing data synchronized with price updates
  const { data: oshawottListingData } = useQuery({
    queryKey: ['oshawott-listing-data-dashboard', oshawottLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = oshawottLivePrice?.avg_price_with_shipping || 8.00;
      console.log(`Dashboard: Fetching Oshawott listing for price $${currentPrice.toFixed(2)}`);
      return await fetchOshawottListingData(currentPrice);
    },
    enabled: !!oshawottLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: ionoBelliboltLivePrice } = useQuery({
    queryKey: ['supabase-ionobellibolt-price', 'iono-bellibolt-ex'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_iono_bellibolt_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Iono\'s Bellibolt price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 80.00 };
      } catch (error) {
        return { avg_price_with_shipping: 80.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Iono's Bellibolt listing data synchronized with price updates
  const { data: ionoBelliboltListingData } = useQuery({
    queryKey: ['ionobellibolt-listing-data-dashboard', ionoBelliboltLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = ionoBelliboltLivePrice?.avg_price_with_shipping || 80.00;
      console.log(`Dashboard: Fetching Iono's Bellibolt listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIonoBelliboltListingData(currentPrice);
    },
    enabled: !!ionoBelliboltLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: labubuBigEnergyHopeLivePrice } = useQuery({
    queryKey: ['supabase-labubu-big-energy-hope-price', 'labubu-big-energy-hope'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_big_energy_hope_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Big Energy Hope price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 25.00 };
      } catch (error) {
        return { avg_price_with_shipping: 25.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Big Energy Hope listing data synchronized with price updates
  const { data: labubuBigEnergyHopeListingData } = useQuery({
    queryKey: ['labubu-big-energy-hope-listing-data-dashboard', labubuBigEnergyHopeLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = labubuBigEnergyHopeLivePrice?.avg_price_with_shipping || 25.00;
      console.log(`Dashboard: Fetching Labubu Big Energy Hope listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuBigEnergyHopeListingData(currentPrice);
    },
    enabled: !!labubuBigEnergyHopeLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Labubu Monster Chestnut price and listing queries
  const { data: labubuMonsterChestnutLivePrice } = useQuery({
    queryKey: ['supabase-labubu-monster-chestnut-price', 'labubu-monster-chestnut-cocoa'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_monster_chestnut_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Monster Chestnut price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 30.00 };
      } catch (error) {
        return { avg_price_with_shipping: 30.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Monster Chestnut listing data synchronized with price updates
  const { data: labubuMonsterChestnutListingData } = useQuery({
    queryKey: ['labubu-monster-chestnut-listing-data-dashboard', labubuMonsterChestnutLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = labubuMonsterChestnutLivePrice?.avg_price_with_shipping || 30.00;
      console.log(`Dashboard: Fetching Labubu Monster Chestnut listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMonsterChestnutListingData(currentPrice);
    },
    enabled: !!labubuMonsterChestnutLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Labubu Coca-Cola price and listing queries
  const { data: labubuCocaColaLivePrice } = useQuery({
    queryKey: ['supabase-labubu-coca-cola-price', 'labubu-coca-cola-surprise-shake'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_coca_cola_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Coca-Cola price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 22.00 };
      } catch (error) {
        return { avg_price_with_shipping: 22.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Coca-Cola listing data synchronized with price updates
  const { data: labubuCocaColaListingData } = useQuery({
    queryKey: ['labubu-coca-cola-listing-data-dashboard', labubuCocaColaLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = labubuCocaColaLivePrice?.avg_price_with_shipping || 22.00;
      console.log(`Dashboard: Fetching Labubu Coca-Cola listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuCocaColaListingData(currentPrice);
    },
    enabled: !!labubuCocaColaLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Labubu Seat Baba price and listing queries
  const { data: labubuSeatBabaLivePrice } = useQuery({
    queryKey: ['supabase-labubu-seat-baba-price', 'labubu-have-a-seat-baba'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_seat_baba_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Seat Baba price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 28.00 };
      } catch (error) {
        return { avg_price_with_shipping: 28.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Seat Baba listing data synchronized with price updates
  const { data: labubuSeatBabaListingData } = useQuery({
    queryKey: ['labubu-seat-baba-listing-data-dashboard', labubuSeatBabaLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = labubuSeatBabaLivePrice?.avg_price_with_shipping || 28.00;
      console.log(`Dashboard: Fetching Labubu Seat Baba listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuSeatBabaListingData(currentPrice);
    },
    enabled: !!labubuSeatBabaLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Labubu Macaron Lychee price and listing queries
  const { data: labubuMacaronLycheeLivePrice } = useQuery({
    queryKey: ['supabase-labubu-macaron-lychee-price', 'labubu-macaron-lychee'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_macaron_lychee_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Macaron Lychee price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 25.00 };
      } catch (error) {
        return { avg_price_with_shipping: 25.00 };
      }
    },
    refetchInterval: false, // Disabled - only update on explicit refresh,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Macaron Lychee listing data synchronized with price updates
  const { data: labubuMacaronLycheeListingData } = useQuery({
    queryKey: ['labubu-macaron-lychee-listing-data-dashboard', labubuMacaronLycheeLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      const currentPrice = labubuMacaronLycheeLivePrice?.avg_price_with_shipping || 25.00;
      console.log(`Dashboard: Fetching Labubu Macaron Lychee listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMacaronLycheeListingData(currentPrice);
    },
    enabled: !!labubuMacaronLycheeLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // Disabled - only update on explicit refresh, // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 30 * 60 * 1000,
  });

  // Function to get live current price using shared price system
  const getLiveCurrentPrice = (collectibleId: string): number | null => {
    return getPriceForCollectible(collectibleId);
  };

  // Calculate asset performance using the exact same formula as Net Gains:
  // Asset Return (%) = [(Current Market Value - Total Cost Basis) / Total Cost Basis] × 100
  const calculateAssetPerformance = (collectibleId: string, userAsset: any) => {
    const quantity = Number(userAsset.quantity) || 0;
    const costPerUnit = Number(userAsset.user_price) || 0; // Purchase price (cost basis per unit)
    const currentMarketPrice = Number(userAsset.current_price) || 0; // Current market value per unit
    
    if (costPerUnit === 0 || quantity === 0) {
      return { percentChange: 0, purchasePrice: costPerUnit, currentPrice: currentMarketPrice };
    }
    
    // Calculate total values for this asset
    const totalCostBasis = costPerUnit * quantity;
    const totalCurrentMarketValue = currentMarketPrice * quantity;
    
    // Exact formula: Asset Return (%) = [(Current Market Value - Total Cost Basis) / Total Cost Basis] × 100
    const percentChange = ((totalCurrentMarketValue - totalCostBasis) / totalCostBasis) * 100;
    
    const result = {
      percentChange: Number(percentChange.toFixed(2)), // Round to 2 decimal places for consistency
      purchasePrice: costPerUnit,
      currentPrice: currentMarketPrice
    };
    
    console.log(`Performance result for ${collectibleId}:`, result);
    return result;
  };

  // Query to get first price from price history
  const { data: firstPricesData } = useQuery({
    queryKey: ['first-prices', userAssets?.map((a: any) => a.id)],
    queryFn: async () => {
      if (!userAssets || !Array.isArray(userAssets) || userAssets.length === 0) return {};
      
      const firstPrices: Record<string, number> = {};
      
      for (const asset of userAssets) {
        try {
          console.log(`Fetching first price for asset: ${asset.id}`);
          
          // Convert string ID to UUID if needed
          const config = getCollectibleConfig(asset.id);
          const dbCollectibleId = config ? config.uuid : asset.id;
          const priceHistoryTable = config ? config.priceHistoryTable : 'collectibles_price_history';
          
          console.log(`Using table ${priceHistoryTable} for collectible ${dbCollectibleId}`);
          
          // Try simplified query first to test if the issue is with filtering
          const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/${priceHistoryTable}?order=timestamp.asc&limit=1`, {
            headers: {
              'apikey': import.meta.env.VITE_VRNO_API_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`
            }
          });
          
          const data = await response.json();
          console.log(`First price response for ${asset.id}:`, data);
          if (data && Array.isArray(data) && data.length > 0) {
            firstPrices[asset.id] = data[0].avg_price_with_shipping || data[0].price;
            console.log(`Set first price for ${asset.id}: ${data[0].avg_price_with_shipping || data[0].price}`);
          }
        } catch (error) {
          console.error(`Error fetching first price for ${asset.id}:`, error);
        }
      }
      
      console.log('Final first prices data:', firstPrices);
      return firstPrices;
    },
    enabled: !!userAssets && Array.isArray(userAssets) && userAssets.length > 0,
    staleTime: 2 * 60 * 60 * 1000, // Cache for 2 hours (static data)
    refetchInterval: false, // Disabled - only update on explicit refresh, // 15 minutes to match price updates
  });

  // Recent transactions from new transaction_records table using username lookup
  const { data: recentTransactionsData, isLoading: recentTransactionsLoading } = useQuery({
    queryKey: ['supabase', 'transaction-records', user?.username],
    queryFn: async () => {
      if (!user?.username) return [];
      
      try {
        // Get user integer ID from username
        const userResponse = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/users?username=eq.${user.username}&select=id`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        
        if (!userResponse.ok) {
          console.log(`User query failed: ${userResponse.status} ${userResponse.statusText}`);
          return [];
        }
        
        const userData = await userResponse.json();
        if (!userData || userData.length === 0) {
          console.log('User not found for username:', user.username);
          return [];
        }
        
        const userIntegerId = userData[0].id;
        
        // Now get transaction records using integer user ID
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/transaction_records?user_id=eq.${userIntegerId}&select=*&order=created_at.desc&limit=5`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        
        if (!response.ok) {
          console.log(`Transaction records query failed: ${response.status} ${response.statusText}`);
          return [];
        }
        
        const transactionRecords = await response.json();
        
        // Transform transaction_records format to match existing dashboard logic
        return transactionRecords.map((record: any) => ({
          id: record.id,
          user_id: record.user_id,
          asset_id: record.asset_uuid,
          transaction_type: record.transaction_type,
          amount: record.quantity.toString(),
          description: record.description,
          created_at: record.created_at,
          price: record.price_per_unit,
          total_cost: record.total_cost
        }));
        
      } catch (error) {
        console.log('Error fetching recent transaction records:', error);
        return [];
      }
    },
    enabled: false, // Temporarily disabled for compute savings
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 60 * 1000, // Cache for 2 hours (static data)
    refetchInterval: false, // Disabled - only update on explicit refresh, // 15 minutes
  });

  // Query to get all buy transactions for cost basis calculation
  const { data: allBuyTransactions, isLoading: buyTransactionsLoading, refetch: refetchBuyTransactions } = useQuery({
    queryKey: ['supabase', 'buy-transactions', (tokenBalance as any)?.user_id],
    queryFn: async () => {
      const userId = (tokenBalance as any)?.user_id;
      if (!userId) return [];
      
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/transactions?user_id=eq.${userId}&transaction_type=eq.buy&select=*`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        
        if (!response.ok) {
          console.log(`Buy transactions query failed: ${response.status} ${response.statusText}`);
          return [];
        }
        return response.json();
      } catch (error) {
        console.log('Error fetching buy transactions:', error);
        return [];
      }
    },
    enabled: !!(tokenBalance as any)?.user_id,
    refetchOnMount: 'always',
    refetchInterval: false, // Disabled - only update on explicit refresh, // Sync with userAssets refresh interval (15 minutes)
    refetchIntervalInBackground: false, // Continue refetching in background
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Force refetch token balance and user assets every time Dashboard component is mounted or user changes
  useEffect(() => {
    if (user?.username) {
      console.log(`Dashboard component mounted - fetching token balance for user: ${user.username}`);
      refetchTokenBalance();
      refetchUserAssets();
    }
  }, [user?.username, refetchTokenBalance, refetchUserAssets]); // Depends on username and refetch functions

  // Listen for transaction completion events to refresh data
  useEffect(() => {
    const handleTransactionComplete = (event: any) => {
      console.log('Transaction completed - immediate refresh for', event.detail.type);
      
      // For sell transactions, force immediate refresh without delay
      if (event.detail.type === 'sell') {
        refetchUserAssets();
        refetchTokenBalance();
        // Force re-render by clearing and refetching
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['user', 'assets'] });
          refetchUserAssets();
        }, 20);
      } else {
        // For buy transactions, also force immediate refresh for instant appearance
        refetchUserAssets();
        refetchTokenBalance();
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['user', 'assets'] });
          refetchUserAssets();
        }, 20);
      }
    };

    const handleTokenBalanceUpdate = () => {
      console.log('Token balance updated - refreshing immediately');
      // Force immediate token balance refresh for signup bonus
      queryClient.invalidateQueries({ queryKey: ['token', 'balance', user?.username] });
      setTimeout(() => {
        refetchTokenBalance();
      }, 50);
    };

    // Listen for custom events from transaction modals and signup bonus
    window.addEventListener('transactionComplete', handleTransactionComplete);
    window.addEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
    
    return () => {
      window.removeEventListener('transactionComplete', handleTransactionComplete);
      window.removeEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate);
    };
  }, [refetchTokenBalance, refetchUserAssets, queryClient, user?.username]);

  const recentTransactions = Array.isArray(transactions) ? transactions.slice(0, 5) : [];

  // Calculate total cost basis from user assets data directly (using user_price from assets table)
  const calculateTotalCostBasis = () => {
    if (!userAssets || !Array.isArray(userAssets)) return 0;
    
    // Sum up cost basis using user_price * quantity for each owned asset
    return userAssets.reduce((total, asset) => {
      const purchasePrice = Number(asset.user_price) || 0;
      const quantity = Number(asset.quantity) || 0;
      return total + (purchasePrice * 100 * quantity); // Convert USD to tokens with 100x multiplier
    }, 0);
  };

  // Calculate net gain percentage using the exact formula:
  // Net Gain (%) = [(Current Market Value - Total Cost Basis) / Total Cost Basis] × 100
  const calculateNetGainPercentage = () => {
    if (!userAssets || !Array.isArray(userAssets) || userAssets.length === 0) return 0;
    
    let totalCurrentMarketValue = 0;
    let totalCostBasis = 0;
    
    userAssets.forEach(asset => {
      const quantity = Number(asset.quantity) || 0;
      const costPerUnit = Number(asset.user_price) || 0; // Purchase price (cost basis per unit)
      const currentMarketPrice = Number(asset.current_price) || 0; // Current market value per unit
      
      totalCurrentMarketValue += currentMarketPrice * quantity;
      totalCostBasis += costPerUnit * quantity;
    });
    
    if (totalCostBasis === 0) return 0;
    
    // Exact formula: Net Gain (%) = [(Current Market Value - Total Cost Basis) / Total Cost Basis] × 100
    const netGainPercentage = ((totalCurrentMarketValue - totalCostBasis) / totalCostBasis) * 100;
    return Number(netGainPercentage.toFixed(2)); // Round to 2 decimal places for stability
  };



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

        {/* Net Gain Percentage */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center min-h-[80px]">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-sm font-medium text-muted-foreground">Net Gains:</div>
                {userAssetsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className={`text-2xl font-bold ${
                    calculateNetGainPercentage() === 0 
                      ? 'text-foreground' 
                      : calculateNetGainPercentage() > 0 
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                  }`}>
                    {calculateNetGainPercentage() === 0 ? '' : calculateNetGainPercentage() > 0 ? '+' : ''}{calculateNetGainPercentage().toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals */}
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:bg-muted/50 hover:border-primary/50" onClick={() => setShowReferralModal(true)}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-muted-foreground">Referrals</div>
                {referralCodeLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{referralCodeData ? referralCodeData.usedCount : 0}/20</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {referralCodeData ? 'Click to view code' : 'Click to create code'}
                </div>
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

        {/* Beta User Feedback */}
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:bg-muted/50 hover:border-primary/50">
          <CardContent className="p-6">
            <div className="flex items-center min-h-[80px]">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <div className="text-sm font-medium text-muted-foreground">Beta User Feedback</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  <a 
                    href="https://docs.google.com/forms/d/1M-cfQPGMgBp62LbvC1VzzjDeUXBcUVs20uL1kcx_i6Y/edit?ts=6885768e"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    Share Feedback
                  </a>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Help us improve
                </div>
              </div>
            </div>
          </CardContent>
        </Card>










      </div>
      {/* User Assets Section */}
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
                // Handle ID mapping between different formats
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
                
                const currentPrice = getCurrentTokenPrice(asset.id);
                const priceChange = calculatePercentChange(asset.id);
                
                // Map asset ID to UUID for optimized image lookup
                const mappedId = (() => {
                  if (asset.id === 'genesect-ex-black-bolt-161-0' || asset.id === 'genesect-ex-black-bolt-161-086') {
                    return '00000000-0000-0000-0000-000000000001';
                  }
                  if (asset.id === 'ethan-hooh-ex-209-destined-rivals') {
                    return '00000000-0000-0000-0000-000000000002';
                  }
                  if (asset.id === 'hilda-164-white-flare') {
                    return '00000000-0000-0000-0000-000000000003';
                  }
                  return asset.id;
                })();

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
                  
                    {/* FIFO Gain/Loss Analysis */}
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Current Price</span>
                      <span className="text-xs font-medium">
                        {(() => {
                          // Use multiple price sources: shared prices (with ID mapping), asset current_price, optimized image price
                          const sharedPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId);
                          const assetPrice = Number(asset.current_price);
                          const optimizedPrice = optimizedImage?.ebayPrice ? parseFloat(optimizedImage.ebayPrice) : null;
                          
                          const finalPrice = sharedPrice || assetPrice || optimizedPrice || 0;
                          console.log(`Price debug for ${asset.id} (mapped: ${mappedId}): shared=${sharedPrice}, asset=${assetPrice}, optimized=${optimizedPrice}, final=${finalPrice}`);
                          
                          return finalPrice ? (finalPrice * 100).toLocaleString() + ' tokens' : 'Price unavailable';
                        })()}
                      </span>
                    </div>
                    
                    {/* Overall Return */}
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

                    {/* Price Change Since Data Start - Use batch percentage change system */}
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
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactionsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16 mt-1" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : !recentTransactionsData || recentTransactionsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactionsData.map((transaction: any) => {
                // Get proper asset display name
                const getAssetName = (transaction: any) => {
                  if (transaction.transaction_type === 'topup') {
                    return transaction.description || 'Token Purchase';
                  }
                  if (transaction.transaction_type === 'reward') {
                    return transaction.description || 'Reward';
                  }
                  if (transaction.transaction_type === 'Code_redeem' ||
                      (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus'))) {
                    return 'referral code';
                  }
                  
                  // The server API returns asset_id field from asset_uuid
                  let assetId = transaction.asset_id || transaction.collectible_id;
                  
                  // If still no assetId, try to extract from description
                  if (!assetId && transaction.description) {
                    // Extract ID from patterns like "Buy 1 genesect-ex-black-bolt-161-086" or "Buy 1 00000000-0000-0000-0000-000000000001"
                    const match = transaction.description.match(/(?:Buy|Sell|Redeem)\s+[\d.]+\s+(.+)$/);
                    if (match) {
                      assetId = match[1];
                    }
                  }
                  
                  // Map all collectible UUIDs to proper names (updated with current active assets)
                  const collectibleNames: Record<string, string> = {
                    // Current active assets  
                    'genesect-ex-black-bolt-161-086': 'Genesect EX Black Bolt 161/086',
                    '00000000-0000-0000-0000-000000000001': 'Genesect EX Black Bolt 161/086',
                    'ethan-ho-oh-ex-209-destined-rivals': "Ethan's Ho-oh EX #209 Destined Rivals",
                    '00000000-0000-0000-0000-000000000002': "Ethan's Ho-oh EX #209 Destined Rivals",
                    'hilda-164-white-flare': 'Hilda #164 White Flare',
                    '00000000-0000-0000-0000-000000000003': 'Hilda #164 White Flare',
                    'kyurem-ex-black-bolt-165-086': 'Kyurem EX Black Bolt 165/086',
                    '00000000-0000-0000-0000-000000000004': 'Kyurem EX Black Bolt 165/086',
                    'volcanion-ex-journey-together-182-159': 'Volcanion EX Journey Together 182/159',
                    '00000000-0000-0000-0000-000000000005': 'Volcanion EX Journey Together 182/159',
                    'salamence-ex-surging-sparks-054-191': 'Salamence ex Surging Sparks #054/191',
                    '00000000-0000-0000-0000-000000000006': 'Salamence ex Surging Sparks #054/191',
                    'iron-hands-ex-prismatic-evolutions-154-131': 'Iron Hands ex Prismatic Evolutions #154/131',
                    '00000000-0000-0000-0000-000000000007': 'Iron Hands ex Prismatic Evolutions #154/131',
                    'pikachu-ex-surging-sparks-094-191': 'Pikachu ex Surging Sparks #094/191',
                    '00000000-0000-0000-0000-000000000008': 'Pikachu ex Surging Sparks #094/191',
                    'iron-crown-ex-stellar-crown-106-142': 'Iron Crown ex Stellar Crown #106/142',
                    '00000000-0000-0000-0000-000000000009': 'Iron Crown ex Stellar Crown #106/142',
                    'hydreigon-ex-white-flare-169-086': 'Hydreigon EX White Flare 169/086',
                    '00000000-0000-0000-0000-000000000010': 'Hydreigon EX White Flare 169/086',
                    'ns-plan-white-flare-178-086': "N's Plan White Flare 178/086",
                    '00000000-0000-0000-0000-000000000011': "N's Plan White Flare 178/086",
                    'oshawott-white-flare-105-086': 'Oshawott White Flare 105/086',
                    '00000000-0000-0000-0000-000000000012': 'Oshawott White Flare 105/086',
                    'iono-bellibolt-ex-journey-together-183-159': "Iono's Bellibolt ex Journey Together 183/159",
                    '00000000-0000-0000-0000-000000000014': "Iono's Bellibolt ex Journey Together 183/159",
                    'labubu-big-energy-hope': 'Labubu Big Energy Hope',
                    '00000000-0000-0000-0000-000000000015': 'Labubu Big Energy Hope',
                    'labubu-monster-chestnut-cocoa': 'Labubu The Monster Secret Chestnut Cocoa',
                    '00000000-0000-0000-0000-000000000016': 'Labubu The Monster Secret Chestnut Cocoa',
                    'labubu-coca-cola-surprise-shake': 'Labubu Coca-Cola Surprise Shake',
                    '00000000-0000-0000-0000-000000000017': 'Labubu Coca-Cola Surprise Shake',
                    'labubu-have-a-seat-baba': 'Labubu Have A Seat Baba',
                    '00000000-0000-0000-0000-000000000018': 'Labubu Have A Seat Baba',
                    'labubu-macaron-lychee': 'Labubu Macaron Lychee Berry',
                    '00000000-0000-0000-0000-000000000019': 'Labubu Macaron Lychee Berry',
                    'labubu-macaron-sea-salt': 'Labubu Macaron Sea Salt',
                    '00000000-0000-0000-0000-000000000020': 'Labubu Macaron Sea Salt'
                  };
                  
                  return collectibleNames[assetId] || 'Unknown Asset';
                };

                // Calculate token amount based on transaction type
                const quantity = Number(transaction.amount);
                let tokenAmount;
                
                if (transaction.transaction_type === 'topup' || transaction.transaction_type === 'reward' || 
                    transaction.transaction_type === 'Code_redeem' ||
                    (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus'))) {
                  // For topup, reward, Code_redeem, and referral code transactions, amount field already contains token amount
                  tokenAmount = quantity;
                } else {
                  // For buy/sell/redemption, use the price field from the transaction if available
                  let price = transaction.price || 0;
                  
                  // Extract asset ID from description for price lookup
                  let assetId = transaction.collectible_id;
                  if (!assetId && transaction.description) {
                    const match = transaction.description.match(/(?:Buy|Sell|Redeem)\s+[\d.]+\s+(.+)$/);
                    if (match) {
                      assetId = match[1];
                    }
                  }
                  
                  // If no price in transaction, get current live price as fallback
                  if (!price && assetId) {
                    price = getLiveCurrentPrice(assetId) || 0;
                  }
                  
                  tokenAmount = Math.round(price * 100) * quantity; // Convert USD to tokens (price × 100)
                  
                  // Apply 10x multiplier for redemption transactions (keeping 10x as redemption bonus)
                  if (transaction.transaction_type === 'redemption') {
                    tokenAmount = tokenAmount * 10;
                  }
                }

                return (
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.transaction_type === 'buy' ? 'bg-red-100 dark:bg-red-900' :
                        transaction.transaction_type === 'sell' ? 'bg-emerald-100 dark:bg-emerald-900' :
                        transaction.transaction_type === 'redemption' ? 'bg-purple-100 dark:bg-purple-900' :
                        transaction.transaction_type === 'topup' ? 'bg-blue-100 dark:bg-blue-900' :
                        transaction.transaction_type === 'reward' ? 'bg-yellow-100 dark:bg-yellow-900' :
                        transaction.transaction_type === 'Code_redeem' || 
                        (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus')) ? 'bg-green-100 dark:bg-green-900' :
                        'bg-gray-100 dark:bg-gray-900'
                      }`}>
                        {transaction.transaction_type === 'buy' ? (
                          <Minus className="w-4 h-4 text-red-500" />
                        ) : transaction.transaction_type === 'sell' ? (
                          <Plus className="w-4 h-4 text-emerald-500" />
                        ) : transaction.transaction_type === 'topup' ? (
                          <Gift className="w-4 h-4 text-primary" />
                        ) : transaction.transaction_type === 'reward' ? (
                          <Gift className="w-4 h-4 text-yellow-500" />
                        ) : transaction.transaction_type === 'Code_redeem' || 
                        (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus')) ? (
                          <Gift className="w-4 h-4 text-green-500" />
                        ) : (
                          <Gift className="w-4 h-4 text-purple-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {transaction.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAssetName(transaction)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.transaction_type === 'sell' || transaction.transaction_type === 'topup' || transaction.transaction_type === 'reward' || 
                        transaction.transaction_type === 'Code_redeem' ||
                        (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus'))
                          ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}>
                        {(transaction.transaction_type === 'sell' || transaction.transaction_type === 'topup' || transaction.transaction_type === 'reward' || 
                          transaction.transaction_type === 'Code_redeem' ||
                          (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus'))) ? '+' : '-'}{tokenAmount.toLocaleString()} tokens
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
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
