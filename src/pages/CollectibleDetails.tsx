import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { collectiblesApi, tokenApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGenesectListingData, fetchEthanHoohListingData, fetchHildaListingData, fetchKyuremListingData, fetchVolcanionListingData, fetchSalamenceListingData, fetchIronHandsListingData, fetchPikachuListingData, fetchIronCrownListingData, fetchHydreigonListingData, fetchNsPlanListingData, fetchOshawottListingData, fetchIonoBelliboltListingData, fetchLabubuBigEnergyHopeListingData, fetchLabubuMonsterChestnutListingData, fetchLabubuCocaColaListingData, fetchLabubuSeatBabaListingData, fetchLabubuMacaronLycheeListingData, fetchLabubuMacaronSeaSaltListingData, getCollectibleConfig } from '@/lib/collectibleHelpers';
import { usePercentageChange } from '@/hooks/usePercentageChange';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TransactionModal from '@/components/TransactionModal';
import { Collectible } from '@shared/schema';

interface PricePoint {
  timestamp: string;
  price: number;
  time: string;
}

interface CollectibleDetailsProps {
  onBack?: () => void;
  collectibleId?: string;
}

export default function CollectibleDetails({ onBack, collectibleId }: CollectibleDetailsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCollectible, setSelectedCollectible] = useState<Collectible | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);

  const queryClient = useQueryClient();
  
  // Map URL parameter IDs to UUID format for database queries
  const mapCollectibleId = (id: string): string => {
    const urlToUuidMap: Record<string, string> = {
      'genesect-ex-black-bolt-161-086': '00000000-0000-0000-0000-000000000001',
      'ethan-ho-oh-holo-025-100': '00000000-0000-0000-0000-000000000002',
      'hilda-trainer-027-048': '00000000-0000-0000-0000-000000000003',
      'kyurem-gx-rare-holo-048': '00000000-0000-0000-0000-000000000004',
      'volcanion-xy-promo-145': '00000000-0000-0000-0000-000000000005',
      'salamence-ex-secret-rare-120': '00000000-0000-0000-0000-000000000006',
      'iron-hands-ex-special-194': '00000000-0000-0000-0000-000000000007',
      'pikachu-classic-025-076': '00000000-0000-0000-0000-000000000008',
      'iron-crown-ex-future-151': '00000000-0000-0000-0000-000000000009',
      'hydreigon-obsidian-flames-103': '00000000-0000-0000-0000-000000000010',
      'n-plan-trainer-077-078': '00000000-0000-0000-0000-000000000011',
      'oshawott-base-collection-007': '00000000-0000-0000-0000-000000000012',
      'iono-bellibolt-promo-sv-099': '00000000-0000-0000-0000-000000000014',
      'labubu-big-energy-hope-series': '00000000-0000-0000-0000-000000000015',
      'labubu-monster-chestnut-edition': '00000000-0000-0000-0000-000000000016',
      'labubu-coca-cola-collaboration': '00000000-0000-0000-0000-000000000017',
      'labubu-seat-baba-collection': '00000000-0000-0000-0000-000000000018',
      'labubu-macaron-lychee-flavor': '00000000-0000-0000-0000-000000000019',
      'labubu-macaron-sea-salt-edition': '00000000-0000-0000-0000-000000000020',
    };
    return urlToUuidMap[id] || id;
  };
  
  // Determine which collectible to show based on collectibleId prop or default to Genesect
  const currentCollectibleId = mapCollectibleId(collectibleId || '00000000-0000-0000-0000-000000000001');
  
  // Use shared percentage change system for consistency with Marketplace
  const percentageChange = usePercentageChange(currentCollectibleId, true);
  
  // Debug percentage change calculation for troubleshooting
  console.log(`CollectibleDetails: Original ID: ${collectibleId}, Mapped ID: ${currentCollectibleId}`);
  console.log(`CollectibleDetails percentage change for ${currentCollectibleId}:`, percentageChange);

  // Convert USD price to token value (price × 100 for token conversion)
  const convertUSDToTokens = (usdPrice: number): number => {
    return Math.round(usdPrice * 100);
  };

  // Fetch current collectible data from collectibles table
  const { data: collectibleData } = useQuery({
    queryKey: ['collectible-data', currentCollectibleId],
    queryFn: async () => {
      try {
        // SECURITY FIX: Use secure proxy endpoint - NO API KEYS EXPOSED TO CLIENT
        const response = await fetch(`/api/secure/collectible/${currentCollectibleId}`);
        if (!response.ok) {
          console.log(`Collectible data returned ${response.status}: ${response.statusText}`);
          return null;
        }
        const data = await response.json();
        console.log(`Collectible data received for ${currentCollectibleId}:`, data[0]);
        return data[0] || null;
      } catch (error) {
        console.log('Collectible data unavailable:', error);
        return null;
      }
    },
    refetchInterval: false, // EXTREME OPTIMIZATION: Disabled automatic updates
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 4 * 60 * 60 * 1000, // 4-hour cache for static collectible data
  });

  // Get database table name for price history based on collectible ID
  const getPriceHistoryTable = (collectibleId: string): string => {
    const tableMap: Record<string, string> = {
      '00000000-0000-0000-0000-000000000001': 'ebay_genesect_price_history',
      '00000000-0000-0000-0000-000000000002': 'ebay_ethan_ho_oh_price_history',
      '00000000-0000-0000-0000-000000000003': 'ebay_hilda_price_history',
      '00000000-0000-0000-0000-000000000004': 'ebay_kyurem_price_history',
      '00000000-0000-0000-0000-000000000005': 'ebay_volcanion_price_history',
      '00000000-0000-0000-0000-000000000006': 'ebay_salamence_price_history',
      '00000000-0000-0000-0000-000000000007': 'ebay_iron_hands_price_history',
      '00000000-0000-0000-0000-000000000008': 'ebay_pikachu_price_history',
      '00000000-0000-0000-0000-000000000009': 'ebay_iron_crown_price_history',
      '00000000-0000-0000-0000-000000000010': 'ebay_hydreigon_price_history',
      '00000000-0000-0000-0000-000000000011': 'ebay_n_plan_price_history',
      '00000000-0000-0000-0000-000000000012': 'ebay_oshawott_price_history',
      '00000000-0000-0000-0000-000000000014': 'ebay_iono_bellibolt_price_history',
      '00000000-0000-0000-0000-000000000015': 'ebay_labubu_big_energy_hope_price_history',
      '00000000-0000-0000-0000-000000000016': 'ebay_labubu_monster_chestnut_price_history',
      '00000000-0000-0000-0000-000000000017': 'ebay_labubu_coca_cola_price_history',
      '00000000-0000-0000-0000-000000000018': 'ebay_labubu_seat_baba_price_history',
      '00000000-0000-0000-0000-000000000019': 'ebay_labubu_macaron_lychee_price_history',
      '00000000-0000-0000-0000-000000000020': 'ebay_labubu_macaron_salt_price_history',
    };
    return tableMap[collectibleId] || 'ebay_genesect_price_history';
  };

  // Get market summary table name for current price
  const getMarketSummaryTable = (collectibleId: string): string => {
    const tableMap: Record<string, string> = {
      '00000000-0000-0000-0000-000000000001': 'ebay_genesect_market_summary',
      '00000000-0000-0000-0000-000000000002': 'ebay_ethan_ho_oh_market_summary',
      '00000000-0000-0000-0000-000000000003': 'ebay_hilda_market_summary',
      '00000000-0000-0000-0000-000000000004': 'ebay_kyurem_market_summary',
      '00000000-0000-0000-0000-000000000005': 'ebay_volcanion_market_summary',
      '00000000-0000-0000-0000-000000000006': 'ebay_salamence_market_summary',
      '00000000-0000-0000-0000-000000000007': 'ebay_iron_hands_market_summary',
      '00000000-0000-0000-0000-000000000008': 'ebay_pikachu_market_summary',
      '00000000-0000-0000-0000-000000000009': 'ebay_iron_crown_market_summary',
      '00000000-0000-0000-0000-000000000010': 'ebay_hydreigon_market_summary',
      '00000000-0000-0000-0000-000000000011': 'ebay_n_plan_market_summary',
      '00000000-0000-0000-0000-000000000012': 'ebay_oshawott_market_summary',
      '00000000-0000-0000-0000-000000000014': 'ebay_ionobellibolt_market_summary',
      '00000000-0000-0000-0000-000000000015': 'ebay_labubu_big_energy_hope_market_summary',
      '00000000-0000-0000-0000-000000000016': 'ebay_labubu_monster_chestnut_market_summary',
      '00000000-0000-0000-0000-000000000017': 'ebay_labubu_coca_cola_market_summary',
      '00000000-0000-0000-0000-000000000018': 'ebay_labubu_seat_baba_market_summary',
      '00000000-0000-0000-0000-000000000019': 'ebay_labubu_macaron_lychee_market_summary',
      '00000000-0000-0000-0000-000000000020': 'ebay_labubu_macaron_salt_market_summary',
    };
    return tableMap[collectibleId] || 'ebay_genesect_market_summary';
  };

  // Fetch price history from Supabase database via public API (combining price_history + market_summary)
  const { data: priceHistoryData } = useQuery({
    queryKey: ['supabase-price-history', currentCollectibleId],
    queryFn: async () => {
      try {
        let combinedData: any[] = [];
        
        // Get table names for current collectible
        const priceHistoryTable = getPriceHistoryTable(currentCollectibleId);
        const marketSummaryTable = getMarketSummaryTable(currentCollectibleId);
        
        console.log(`Fetching price history for ${currentCollectibleId} from ${priceHistoryTable} and ${marketSummaryTable}`);
        
        // SECURITY FIX: Use secure proxy endpoint - NO API KEYS EXPOSED TO CLIENT
        const historyResponse = await fetch(`/api/secure/price-history/${currentCollectibleId}/${priceHistoryTable}`);
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          combinedData = [...historyData];
        }
        
        // SECURITY FIX: Use secure proxy endpoint - NO API KEYS EXPOSED TO CLIENT
        const summaryResponse = await fetch(`/api/secure/market-summary/${currentCollectibleId}/${marketSummaryTable}`);
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          if (summaryData.length > 0) {
            // Add market summary as most recent point
            combinedData.push(summaryData[0]);
          }
        }
        
        console.log(`Combined price data for ${currentCollectibleId}:`, combinedData);
        return combinedData;
      } catch (error) {
        console.log('Supabase price history unavailable:', error);
        return [];
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings // Refetch every 15 minutes for live updates
    refetchIntervalInBackground: false, // Continue fetching even when tab is not focused
    refetchOnWindowFocus: false, // Refetch when window gains focus
    retry: false,
  });

  // Get user ID for transaction queries - need integer ID for transactions table
  const { data: userData } = useQuery({
    queryKey: ['user-data', user?.username],
    queryFn: async () => {
      if (!user?.username) return null;
      try {
        // SECURITY FIX: Use secure proxy endpoint - NO API KEYS EXPOSED TO CLIENT
        const response = await fetch(`/api/secure/user-data/${user.username}`);
        
        if (!response.ok) return null;
        const userData = await response.json();
        console.log('User data received for transactions:', userData);
        return userData;
      } catch (error) {
        console.log('Error fetching user data:', error);
        return null;
      }
    },
    enabled: false, // Temporarily disabled for compute savings
  });

  // Get user assets to check current ownership
  const { data: userAssets } = useQuery({
    queryKey: ['user-assets-ownership', user?.username, currentCollectibleId],
    queryFn: async () => {
      if (!user?.username) return [];
      try {
        const response = await tokenApi.getUserAssets(user.username);
        const filteredAssets = response.filter((asset: any) => asset.id === currentCollectibleId);
        return filteredAssets;
      } catch (error) {
        console.log('Error fetching user assets:', error);
        return [];
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    enabled: false, // Temporarily disabled for compute savings
  });

  // Fetch user purchase transactions for this specific collectible (only if user owns asset)
  const { data: userPurchases } = useQuery({
    queryKey: ['user-purchases', userData?.id, currentCollectibleId],
    queryFn: async () => {
      if (!userData?.id) return [];
      
      // Only fetch transactions if user currently owns this asset
      if (!userAssets || userAssets.length === 0) {
        console.log('User does not currently own this asset, skipping purchase history');
        return [];
      }
      
      try {
        // Convert string ID to UUID if needed for database queries
        const config = getCollectibleConfig(currentCollectibleId);
        const dbCollectibleId = config ? config.uuid : currentCollectibleId;
        
        console.log(`Using collectible ID for transactions: ${dbCollectibleId} (original: ${currentCollectibleId})`);
        
        // Get all user transactions for this collectible (buy and sell) to calculate current ownership
        // Use correct column names: timestamp instead of created_at, and user_id as integer
        const allTransactionsResponse = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/transactions?user_id=eq.${userData.id}&collectible_id=eq.${dbCollectibleId}&select=*&order=timestamp.desc`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        
        if (!allTransactionsResponse.ok) {
          const errorText = await allTransactionsResponse.text();
          console.log(`Failed to fetch user transactions, status: ${allTransactionsResponse.status}, error:`, errorText);
          return [];
        }
        
        const allTransactions = await allTransactionsResponse.json();
        console.log(`All user transactions for ${currentCollectibleId}:`, allTransactions);
        
        // Get current owned quantity from userAssets
        const currentQuantity = userAssets[0]?.quantity || 0;
        console.log(`Current owned quantity: ${currentQuantity}`);
        
        // Get buy and sell transactions for display
        const buyTransactions = allTransactions.filter((t: any) => t.transaction_type === 'buy');
        const sellTransactions = allTransactions.filter((t: any) => t.transaction_type === 'sell');
        
        // Take only the most recent buy transactions that add up to current quantity for owned assets
        let remainingQuantity = currentQuantity;
        const relevantPurchases = [];
        
        for (const purchase of buyTransactions) {
          if (remainingQuantity <= 0) break;
          
          const purchaseAmount = Math.min(purchase.amount, remainingQuantity);
          relevantPurchases.push({
            ...purchase,
            amount: purchaseAmount, // Adjust amount to only show what contributes to current ownership
            sellTransactions: sellTransactions // Include sell transactions for timestamp reference
          });
          remainingQuantity -= purchaseAmount;
        }
        
        console.log(`Filtered purchase transactions for current ownership:`, relevantPurchases);
        console.log(`All sell transactions for reference:`, sellTransactions);
        console.log(`User data ID being used for query:`, userData.id, `(type: ${typeof userData.id})`);
        console.log(`Database collectible ID being used:`, dbCollectibleId);
        return { purchases: relevantPurchases, sells: sellTransactions };
      } catch (error) {
        console.log('Error fetching user purchases:', error);
        return [];
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    enabled: !!userData?.id && !!userAssets && userAssets.length > 0,
  });

  // Use the EXACT same queries as marketplace for synchronized pricing
  const { data: genesectLivePrice } = useQuery({
    queryKey: ['supabase-genesect-price', currentCollectibleId],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_genesect_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Genesect price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 16.94 };
      } catch (error) {
        return { avg_price_with_shipping: 16.94 };
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings 
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Genesect listing data synchronized with price updates
  const { data: genesectListingData } = useQuery({
    queryKey: ['genesect-listing-data-details', currentCollectibleId, genesectLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000001' && currentCollectibleId !== 'genesect-ex-black-bolt-161-086') return null;
      
      const currentPrice = genesectLivePrice?.avg_price_with_shipping || 19.22;
      console.log(`CollectibleDetails: Fetching Genesect listing for price $${currentPrice.toFixed(2)}`);
      return await fetchGenesectListingData(currentPrice);
    },
    enabled: (currentCollectibleId === '00000000-0000-0000-0000-000000000001' || currentCollectibleId === 'genesect-ex-black-bolt-161-086') && !!genesectLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Ethan's Ho-oh EX price from Supabase database
  const { data: ethanHoohLivePrice } = useQuery({
    queryKey: ['supabase-ethan-hooh-price', currentCollectibleId],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_ethan_ho_oh_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Ethan's Ho-oh listing data synchronized with price updates
  const { data: ethanHoohListingData } = useQuery({
    queryKey: ['ethan-hooh-listing-data-details', currentCollectibleId, ethanHoohLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000002') return null;
      
      const currentPrice = ethanHoohLivePrice?.avg_price_with_shipping || 26.53;
      console.log(`CollectibleDetails: Fetching Ethan Ho-oh listing for price $${currentPrice.toFixed(2)}`);
      return await fetchEthanHoohListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000002' && !!ethanHoohLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Hilda price from Supabase database
  const { data: hildaLivePrice } = useQuery({
    queryKey: ['supabase-hilda-price', currentCollectibleId],
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
        return data[0] || { avg_price_with_shipping: 18.75 };
      } catch (error) {
        return { avg_price_with_shipping: 18.75 };
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Hilda listing data synchronized with price updates
  const { data: hildaListingData } = useQuery({
    queryKey: ['hilda-listing-data-details', currentCollectibleId, hildaLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000003') return null;
      
      const currentPrice = hildaLivePrice?.avg_price_with_shipping || 44.11;
      console.log(`CollectibleDetails: Fetching Hilda listing for price $${currentPrice.toFixed(2)}`);
      return await fetchHildaListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000003' && !!hildaLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Kyurem price from Supabase database
  const { data: kyuremLivePrice } = useQuery({
    queryKey: ['supabase-kyurem-price', currentCollectibleId],
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Kyurem listing data synchronized with price updates
  const { data: kyuremListingData } = useQuery({
    queryKey: ['kyurem-listing-data-details', currentCollectibleId, kyuremLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000004') return null;
      
      const currentPrice = kyuremLivePrice?.avg_price_with_shipping || 125.99;
      console.log(`CollectibleDetails: Fetching Kyurem listing for price $${currentPrice.toFixed(2)}`);
      return await fetchKyuremListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000004' && !!kyuremLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Volcanion price from Supabase database
  const { data: volcanionLivePrice } = useQuery({
    queryKey: ['supabase-volcanion-price', currentCollectibleId],
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Volcanion listing data synchronized with price updates
  const { data: volcanionListingData } = useQuery({
    queryKey: ['volcanion-listing-data-details', currentCollectibleId, volcanionLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000005') return null;
      
      const currentPrice = volcanionLivePrice?.avg_price_with_shipping || 45.31;
      console.log(`CollectibleDetails: Fetching Volcanion listing for price $${currentPrice.toFixed(2)}`);
      return await fetchVolcanionListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000005' && !!volcanionLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Salamence price from Supabase database
  const { data: salamenceLivePrice } = useQuery({
    queryKey: ['supabase-salamence-price', currentCollectibleId],
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Salamence listing data synchronized with price updates
  const { data: salamenceListingData } = useQuery({
    queryKey: ['salamence-listing-data-details', currentCollectibleId, salamenceLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000006') return null;
      
      const currentPrice = salamenceLivePrice?.avg_price_with_shipping || 22.00;
      console.log(`CollectibleDetails: Fetching Salamence listing for price $${currentPrice.toFixed(2)}`);
      return await fetchSalamenceListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000006' && !!salamenceLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Iron Hands price from Supabase database
  const { data: ironHandsLivePrice } = useQuery({
    queryKey: ['supabase-ironhands-price', currentCollectibleId],
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Iron Hands listing data synchronized with price updates
  const { data: ironHandsListingData } = useQuery({
    queryKey: ['iron-hands-listing-data-details', currentCollectibleId, ironHandsLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000007') return null;
      
      const currentPrice = ironHandsLivePrice?.avg_price_with_shipping || 35.00;
      console.log(`CollectibleDetails: Fetching Iron Hands listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIronHandsListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000007' && !!ironHandsLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Pikachu price from Supabase database
  const { data: pikachuLivePrice } = useQuery({
    queryKey: ['supabase-pikachu-price', currentCollectibleId],
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Pikachu listing data synchronized with price updates
  const { data: pikachuListingData } = useQuery({
    queryKey: ['pikachu-listing-data-details', currentCollectibleId, pikachuLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000008') return null;
      
      const currentPrice = pikachuLivePrice?.avg_price_with_shipping || 42.00;
      console.log(`CollectibleDetails: Fetching Pikachu listing for price $${currentPrice.toFixed(2)}`);
      return await fetchPikachuListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000008' && !!pikachuLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Iron Crown price from Supabase database
  const { data: ironCrownLivePrice } = useQuery({
    queryKey: ['supabase-ironcrown-price', currentCollectibleId],
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
        return data[0] || { avg_price_with_shipping: 28.50 };
      } catch (error) {
        return { avg_price_with_shipping: 28.50 };
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Iron Crown listing data synchronized with price updates
  const { data: ironCrownListingData } = useQuery({
    queryKey: ['iron-crown-listing-data-details', currentCollectibleId, ironCrownLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000009') return null;
      
      const currentPrice = ironCrownLivePrice?.avg_price_with_shipping || 28.50;
      console.log(`CollectibleDetails: Fetching Iron Crown listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIronCrownListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000009' && !!ironCrownLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Hydreigon price from Supabase database
  const { data: hydreigonLivePrice } = useQuery({
    queryKey: ['supabase-hydreigon-price', currentCollectibleId],
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Hydreigon listing data synchronized with price updates
  const { data: hydreigonListingData } = useQuery({
    queryKey: ['hydreigon-listing-data-details', currentCollectibleId, hydreigonLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000010') return null;
      
      const currentPrice = hydreigonLivePrice?.avg_price_with_shipping || 161.74;
      console.log(`CollectibleDetails: Fetching Hydreigon listing for price $${currentPrice.toFixed(2)}`);
      return await fetchHydreigonListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000010' && !!hydreigonLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get N's Plan price from Supabase database
  const { data: nsPlanLivePrice } = useQuery({
    queryKey: ['supabase-nsplan-price', currentCollectibleId],
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
        return data[0] || { avg_price_with_shipping: 118.78 };
      } catch (error) {
        return { avg_price_with_shipping: 118.78 };
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic N's Plan listing data synchronized with price updates
  const { data: nsPlanListingData } = useQuery({
    queryKey: ['nsplan-listing-data-details', currentCollectibleId, nsPlanLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000011') return null;
      
      const currentPrice = nsPlanLivePrice?.avg_price_with_shipping || 118.78;
      console.log(`CollectibleDetails: Fetching N's Plan listing for price $${currentPrice.toFixed(2)}`);
      return await fetchNsPlanListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000011' && !!nsPlanLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get Oshawott price from Supabase database
  const { data: oshawottLivePrice } = useQuery({
    queryKey: ['supabase-oshawott-price', currentCollectibleId],
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Oshawott listing data synchronized with price updates
  const { data: oshawottListingData } = useQuery({
    queryKey: ['oshawott-listing-data-details', currentCollectibleId, oshawottLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000012') return null;
      
      const currentPrice = oshawottLivePrice?.avg_price_with_shipping || 8.00;
      console.log(`CollectibleDetails: Fetching Oshawott listing for price $${currentPrice.toFixed(2)}`);
      return await fetchOshawottListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000012' && !!oshawottLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch real-time Iono's Bellibolt price data
  const { data: ionoBelliboltLivePrice } = useQuery({
    queryKey: ['supabase-ionobellibolt-price', currentCollectibleId],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000014') return null;
      
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_iono_bellibolt_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Iono\'s Bellibolt price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 38.00 };
      } catch (error) {
        return { avg_price_with_shipping: 38.00 };
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Iono's Bellibolt listing data synchronized with price updates
  const { data: ionoBelliboltListingData } = useQuery({
    queryKey: ['ionobellibolt-listing-data-details', currentCollectibleId, ionoBelliboltLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000014') return null;
      
      const currentPrice = ionoBelliboltLivePrice?.avg_price_with_shipping || 38.00;
      console.log(`CollectibleDetails: Fetching Iono's Bellibolt listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIonoBelliboltListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000014' && !!ionoBelliboltLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch real-time Labubu Big Energy Hope price data
  const { data: labubuBigEnergyHopeLivePrice } = useQuery({
    queryKey: ['supabase-labubu-big-energy-hope-price', currentCollectibleId],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000015') return null;
      
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Big Energy Hope listing data synchronized with price updates
  const { data: labubuBigEnergyHopeListingData } = useQuery({
    queryKey: ['labubu-big-energy-hope-listing-data-details', currentCollectibleId, labubuBigEnergyHopeLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000015') return null;
      
      const currentPrice = labubuBigEnergyHopeLivePrice?.avg_price_with_shipping || 25.00;
      console.log(`CollectibleDetails: Fetching Labubu Big Energy Hope listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuBigEnergyHopeListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000015' && !!labubuBigEnergyHopeLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch real-time Labubu Monster Chestnut price data
  const { data: labubuMonsterChestnutLivePrice } = useQuery({
    queryKey: ['supabase-labubu-monster-chestnut-price', currentCollectibleId],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000016') return null;
      
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Monster Chestnut listing data synchronized with price updates
  const { data: labubuMonsterChestnutListingData } = useQuery({
    queryKey: ['labubu-monster-chestnut-listing-data-details', currentCollectibleId, labubuMonsterChestnutLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000016') return null;
      
      const currentPrice = labubuMonsterChestnutLivePrice?.avg_price_with_shipping || 30.00;
      console.log(`CollectibleDetails: Fetching Labubu Monster Chestnut listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMonsterChestnutListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000016' && !!labubuMonsterChestnutLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch real-time Labubu Coca-Cola price data
  const { data: labubuCocaColaLivePrice } = useQuery({
    queryKey: ['supabase-labubu-coca-cola-price', currentCollectibleId],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000017') return null;
      
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Coca-Cola listing data synchronized with price updates
  const { data: labubuCocaColaListingData } = useQuery({
    queryKey: ['labubu-coca-cola-listing-data-details', currentCollectibleId, labubuCocaColaLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000017') return null;
      
      const currentPrice = labubuCocaColaLivePrice?.avg_price_with_shipping || 22.00;
      console.log(`CollectibleDetails: Fetching Labubu Coca-Cola listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuCocaColaListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000017' && !!labubuCocaColaLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch real-time Labubu Seat Baba price data
  const { data: labubuSeatBabaLivePrice } = useQuery({
    queryKey: ['supabase-labubu-seat-baba-price', currentCollectibleId],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000018') return null;
      
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_seat_baba_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Seat Baba price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 20.00 };
      } catch (error) {
        return { avg_price_with_shipping: 20.00 };
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Seat Baba listing data synchronized with price updates
  const { data: labubuSeatBabaListingData } = useQuery({
    queryKey: ['labubu-seat-baba-listing-data-details', currentCollectibleId, labubuSeatBabaLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000018') return null;
      
      const currentPrice = labubuSeatBabaLivePrice?.avg_price_with_shipping || 20.00;
      console.log(`CollectibleDetails: Fetching Labubu Seat Baba listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuSeatBabaListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000018' && !!labubuSeatBabaLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch real-time Labubu Macaron Lychee price data
  const { data: labubuMacaronLycheeLivePrice } = useQuery({
    queryKey: ['supabase-labubu-macaron-lychee-price', currentCollectibleId],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000019') return null;
      
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
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Macaron Lychee listing data synchronized with price updates
  const { data: labubuMacaronLycheeListingData } = useQuery({
    queryKey: ['labubu-macaron-lychee-listing-data-details', currentCollectibleId, labubuMacaronLycheeLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000019') return null;
      
      const currentPrice = labubuMacaronLycheeLivePrice?.avg_price_with_shipping || 25.00;
      console.log(`CollectibleDetails: Fetching Labubu Macaron Lychee listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMacaronLycheeListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000019' && !!labubuMacaronLycheeLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch real-time Labubu Macaron Sea Salt price data
  const { data: labubuMacaronSeaSaltLivePrice } = useQuery({
    queryKey: ['supabase-labubu-macaron-sea-salt-price', currentCollectibleId],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000020') return null;
      
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_macaron_salt_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Macaron Sea Salt price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 24.00 };
      } catch (error) {
        return { avg_price_with_shipping: 24.00 };
      }
    },
    refetchInterval: false, // DISABLED for extreme compute savings
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Fetch dynamic Labubu Macaron Sea Salt listing data synchronized with price updates
  const { data: labubuMacaronSeaSaltListingData } = useQuery({
    queryKey: ['labubu-macaron-sea-salt-listing-data-details', currentCollectibleId, labubuMacaronSeaSaltLivePrice?.avg_price_with_shipping],
    queryFn: async () => {
      if (currentCollectibleId !== '00000000-0000-0000-0000-000000000020') return null;
      
      const currentPrice = labubuMacaronSeaSaltLivePrice?.avg_price_with_shipping || 24.00;
      console.log(`CollectibleDetails: Fetching Labubu Macaron Sea Salt listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMacaronSeaSaltListingData(currentPrice);
    },
    enabled: currentCollectibleId === '00000000-0000-0000-0000-000000000020' && !!labubuMacaronSeaSaltLivePrice?.avg_price_with_shipping,
    refetchInterval: false, // DISABLED for extreme compute savings // Synchronized with price updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Get current price from database ONLY and convert to tokens
  const getCurrentTokenPrice = () => {
    // Use the same logic as dashboard's getLiveCurrentPrice function
    const usdPrice = getLiveCurrentPrice(currentCollectibleId, 
      getCollectibleMetadata(currentCollectibleId).defaultPrice);
    return convertUSDToTokens(usdPrice);
  };

  // Function to get live current price for all collectibles
  const getLiveCurrentPrice = (collectibleId: string, defaultPrice?: number) => {
    if (collectibleId === '00000000-0000-0000-0000-000000000001') {
      return genesectLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'genesect-ex-black-bolt-161-086') {
      return genesectLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000002') {
      return ethanHoohLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'ethan-hooh-ex-209-destined-rivals') {
      return ethanHoohLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000003') {
      return hildaLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'hilda-164-white-flare') {
      return hildaLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000004') {
      return kyuremLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'kyurem-ex-black-bolt-165-086') {
      return kyuremLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000005') {
      return volcanionLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'volcanion-ex-journey-together-182-159') {
      return volcanionLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000006') {
      return salamenceLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'salamence-ex-journey-together-187-159') {
      return salamenceLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000007') {
      return ironHandsLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'iron-hands-ex-prismatic-evolutions-154-131') {
      return ironHandsLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000008') {
      return pikachuLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'pikachu-ex-prismatic-evolutions-179-131') {
      return pikachuLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000009') {
      return ironCrownLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'iron-crown-ex-prismatic-evolutions') {
      return ironCrownLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000010') {
      return hydreigonLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'hydreigon-ex-white-flare-169-086') {
      return hydreigonLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000011') {
      return nsPlanLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'ns-plan-black-bolt') {
      return nsPlanLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000012') {
      return oshawottLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'oshawott-white-flare-105-086') {
      return oshawottLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000014') {
      return ionoBelliboltLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'iono-bellibolt-ex-journey-together-183-159') {
      return ionoBelliboltLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000015') {
      return labubuBigEnergyHopeLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'labubu-big-energy-hope') {
      return labubuBigEnergyHopeLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000016') {
      return labubuMonsterChestnutLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'labubu-monster-chestnut') {
      return labubuMonsterChestnutLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000017') {
      return labubuCocaColaLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'labubu-coca-cola-surprise-shake') {
      return labubuCocaColaLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000018') {
      return labubuSeatBabaLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'labubu-seat-baba') {
      return labubuSeatBabaLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000019') {
      return labubuMacaronLycheeLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'labubu-macaron-lychee') {
      return labubuMacaronLycheeLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === '00000000-0000-0000-0000-000000000020') {
      return labubuMacaronSeaSaltLivePrice?.avg_price_with_shipping;
    } else if (collectibleId === 'labubu-macaron-sea-salt') {
      return labubuMacaronSeaSaltLivePrice?.avg_price_with_shipping;
    }
    return defaultPrice || null;
  };

  // Create chart using price points from July 26 2:58 onwards + current price
  useEffect(() => {
    let processedData: PricePoint[] = [];

    // Filter start date: July 26, 2025 at 2:58 AM
    const filterStartDate = new Date('2025-07-26T02:58:00.000Z');

    // Use price history points from database starting from July 26 2:58
    if (priceHistoryData && Array.isArray(priceHistoryData) && priceHistoryData.length > 0) {
      console.log('Using database price history:', priceHistoryData.length, 'data points');
      
      // Filter data to only include entries from July 26 2:58 onwards
      const filteredData = priceHistoryData.filter((item: any) => {
        const timestamp = new Date(item.timestamp || item.created_at);
        return timestamp >= filterStartDate;
      });
      
      console.log(`Filtered to ${filteredData.length} data points from July 26 2:58 onwards`);
      
      filteredData.forEach((item: any) => {
        const timestamp = new Date(item.timestamp || item.created_at);
        // Only use avg_price_with_shipping - no fallbacks
        const price = parseFloat(item.avg_price_with_shipping);
        
        // Skip invalid price data
        if (isNaN(price)) {
          console.log('Skipping invalid price data:', item);
          return;
        }
        
        // Format time display for historical data
        const timeDisplay = timestamp.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }) + ' ' + timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        
        processedData.push({
          timestamp: timestamp.toISOString(),
          price: price,
          time: timeDisplay,
        });
      });
    }

    // Add current price with shipping for all collectibles (this ensures latest pricing with shipping costs)
    let latestPrice = null;
    let latestPriceTime = 'Now';
    
    if (currentCollectibleId === '00000000-0000-0000-0000-000000000001' || currentCollectibleId === 'genesect-ex-black-bolt-161-086') {
      latestPrice = genesectLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000002' || currentCollectibleId === 'ethan-hooh-ex-209-destined-rivals') {
      latestPrice = ethanHoohLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000003' || currentCollectibleId === 'hilda-164-white-flare') {
      latestPrice = hildaLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000004' || currentCollectibleId === 'kyurem-ex-black-bolt-165-086') {
      latestPrice = kyuremLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000005' || currentCollectibleId === 'volcanion-ex-journey-together-182-159') {
      latestPrice = volcanionLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000006' || currentCollectibleId === 'salamence-ex-journey-together-187-159') {
      latestPrice = salamenceLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000007' || currentCollectibleId === 'iron-hands-ex-prismatic-evolutions-154-131') {
      latestPrice = ironHandsLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000008' || currentCollectibleId === 'pikachu-ex-prismatic-evolutions-179-131') {
      latestPrice = pikachuLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000009' || currentCollectibleId === 'iron-crown-ex-prismatic-evolutions') {
      latestPrice = ironCrownLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000010' || currentCollectibleId === 'hydreigon-ex-white-flare-169-086') {
      latestPrice = hydreigonLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000011' || currentCollectibleId === 'ns-plan-black-bolt') {
      latestPrice = nsPlanLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000015' || currentCollectibleId === 'labubu-big-energy-hope') {
      latestPrice = labubuBigEnergyHopeLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000016' || currentCollectibleId === 'labubu-monster-chestnut') {
      latestPrice = labubuMonsterChestnutLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000017' || currentCollectibleId === 'labubu-coca-cola-surprise-shake') {
      latestPrice = labubuCocaColaLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000018' || currentCollectibleId === 'labubu-seat-baba') {
      latestPrice = labubuSeatBabaLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000019' || currentCollectibleId === 'labubu-macaron-lychee') {
      latestPrice = labubuMacaronLycheeLivePrice?.avg_price_with_shipping;
    } else if (currentCollectibleId === '00000000-0000-0000-0000-000000000020' || currentCollectibleId === 'labubu-macaron-sea-salt') {
      latestPrice = labubuMacaronSeaSaltLivePrice?.avg_price_with_shipping;
    }
    
    if (latestPrice && !isNaN(parseFloat(latestPrice))) {
      // Find the latest timestamp in processed data and add a few minutes to ensure this is the most recent
      const latestHistoricalTime = processedData.length > 0 
        ? Math.max(...processedData.map(p => new Date(p.timestamp).getTime())) 
        : Date.now();
      
      const now = new Date(latestHistoricalTime + 5 * 60 * 1000); // Add 5 minutes to latest historical data
      const currentPrice = parseFloat(latestPrice);
      
      console.log('Adding current price with shipping for', currentCollectibleId, ':', currentPrice, 'at', now.toISOString());
      processedData.push({
        timestamp: now.toISOString(),
        price: currentPrice,
        time: 'Current (with shipping)',
      });
    }

    // Sort by timestamp (oldest to newest)
    processedData.sort((a: PricePoint, b: PricePoint) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log('Final processed price data:', processedData.length, 'points total');
    console.log('Chart data updating - Latest price:', processedData[processedData.length - 1]?.price);
    console.log('Latest price point timestamp:', processedData[processedData.length - 1]?.time);
    
    // Force state update to trigger chart re-render
    setPriceHistory([...processedData]);
  }, [priceHistoryData, collectibleData, currentCollectibleId]);

  // Listen for transaction events to refresh purchase history
  useEffect(() => {
    const handleTransactionComplete = () => {
      // Invalidate all purchase history and user asset queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['user-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['user-assets-ownership'] });
      queryClient.invalidateQueries({ queryKey: ['user-assets'] });
      queryClient.invalidateQueries({ queryKey: ['token', 'assets'] });
      
      // Force immediate refetch of critical queries
      if (userData?.id) {
        queryClient.refetchQueries({ queryKey: ['user-purchases', userData.id, currentCollectibleId] });
      }
      if (user?.username) {
        queryClient.refetchQueries({ queryKey: ['user', 'assets', user.username] });
      }
    };

    // Listen for custom transaction events from the transaction modal
    window.addEventListener('transactionComplete', handleTransactionComplete);
    
    return () => {
      window.removeEventListener('transactionComplete', handleTransactionComplete);
    };
  }, [queryClient, userData?.id, currentCollectibleId, user?.username]);

  // Get collectible metadata based on current ID
  const getCollectibleMetadata = (id: string) => {
    if (id === 'e7c9b82c-93b0-4204-aea1-4e46eb1c4572') {
      return {
        name: 'Rayquaza GMAX Evolving Skies #218',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://storage.googleapis.com/images.pricecharting.com/4b81f53c1a4b5332adba6899ab472a3c3880f7c3ec9be800a1ca71edc980c5b9/1600.jpg',
        description: 'A legendary Dragon/Flying-type Pokémon card from the Evolving Skies set with powerful GMAX abilities and comprehensive market analytics.',
        defaultPrice: 12.00
      };
    } else if (id === '7517e584-ac60-4730-ac8e-346ca5ab65ff') {
      return {
        name: 'Ceruledge Surging Sparks #197',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://images.pokemontcg.io/sv8/197.png',
        description: 'Fire/Ghost-type Pokémon trading card from the Surging Sparks set. This powerful dual-type card features stunning artwork and exceptional abilities.',
        defaultPrice: 15.93
      };
    } else if (id === 'genesect-ex-black-bolt-161-086' || id === '00000000-0000-0000-0000-000000000001') {
      return {
        name: 'Genesect EX Black Bolt 161/086',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: '', // Will be dynamically fetched
        description: 'A powerful Bug/Steel-type EX Pokémon card featuring Genesect with Black Bolt attack. This premium EX card showcases incredible artwork and devastating attack combinations.',
        defaultPrice: 16.94
      };
    } else if (id === 'ethan-hooh-ex-209-destined-rivals' || id === '00000000-0000-0000-0000-000000000002') {
      return {
        name: "Ethan's Ho-oh EX #209 Destined Rivals",
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/633009_in_1000x1000.jpg',
        description: "Ethan's Ho-oh EX from the Destined Rivals set featuring the legendary Phoenix Pokémon with fire-type mastery and resurrection abilities.",
        defaultPrice: 25.50
      };
    } else if (id === 'hilda-164-white-flare' || id === '00000000-0000-0000-0000-000000000003') {
      return {
        name: 'Hilda #164 White Flare',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/642281_in_1000x1000.jpg',
        description: 'Hilda trainer card from the White Flare set featuring the Unova region trainer with powerful support abilities and strategic gameplay.',
        defaultPrice: 18.75
      };
    } else if (id === 'kyurem-ex-black-bolt-165-086' || id === '00000000-0000-0000-0000-000000000004') {
      return {
        name: 'Kyurem EX Black Bolt 165/086',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
        description: 'A legendary Ice/Dragon-type EX Pokémon card featuring Kyurem with Black Bolt attack abilities. This premium EX card showcases incredible ice-themed artwork and devastating Dragon-type attack combinations.',
        defaultPrice: 125.99
      };
    } else if (id === 'volcanion-ex-journey-together-182-159' || id === '00000000-0000-0000-0000-000000000005') {
      return {
        name: 'Volcanion EX Journey Together 182/159',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/623609_in_1000x1000.jpg',
        description: 'A powerful Fire-type EX Pokémon card featuring Volcanion from the Journey Together set with volcanic steam abilities and explosive attack combinations.',
        defaultPrice: 45.31
      };
    } else if (id === 'salamence-ex-journey-together-187-159' || id === '00000000-0000-0000-0000-000000000006') {
      return {
        name: 'Salamence EX Journey Together 187/159',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
        description: 'A powerful Dragon/Flying-type EX Pokémon card featuring Salamence from the Journey Together set with aerial mastery abilities and devastating Dragon-type attack combinations.',
        defaultPrice: 169.88
      };
    } else if (id === 'iron-hands-ex-prismatic-evolutions-154-131' || id === '00000000-0000-0000-0000-000000000007') {
      return {
        name: 'Iron Hands EX Prismatic Evolutions 154/131',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/569779_in_1000x1000.jpg',
        description: 'A powerful Fighting-type EX Pokémon card featuring Iron Hands from the Prismatic Evolutions set with electric combat abilities and devastating Fighting-type attack combinations.',
        defaultPrice: 35.00
      };
    } else if (id === 'pikachu-ex-prismatic-evolutions-179-131' || id === '00000000-0000-0000-0000-000000000008') {
      return {
        name: 'Pikachu EX Prismatic Evolutions 179/131',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
        description: 'A legendary Electric-type EX Pokémon card featuring Pikachu from the Prismatic Evolutions set with thunderbolt abilities and powerful electric attack combinations.',
        defaultPrice: 42.00
      };
    } else if (id === 'iron-crown-ex-prismatic-evolutions' || id === '00000000-0000-0000-0000-000000000009') {
      return {
        name: 'Iron Crown EX Prismatic Evolutions',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
        description: 'A powerful Psychic-type EX Pokémon card featuring Iron Crown from the Prismatic Evolutions set with psychic mastery abilities and devastating psychic attack combinations.',
        defaultPrice: 77.13
      };
    } else if (id === 'hydreigon-ex-white-flare-169-086' || id === '00000000-0000-0000-0000-000000000010') {
      return {
        name: 'Hydreigon EX White Flare 169/086',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
        description: 'A powerful Dark/Dragon-type EX Pokémon card featuring Hydreigon from the White Flare set with destructive darkness abilities and devastating Dragon-type attack combinations.',
        defaultPrice: 161.74
      };
    } else if (id === 'ns-plan-black-bolt' || id === '00000000-0000-0000-0000-000000000011') {
      return {
        name: "N's Plan Black Bolt",
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://tcgplayer-cdn.tcgplayer.com/product/642281_in_1000x1000.jpg',
        description: "N's Plan trainer card from the Black Bolt set featuring strategic gameplay and powerful support abilities. This legendary trainer card provides game-changing tactical advantages and deck manipulation capabilities.",
        defaultPrice: 118.78
      };
    } else if (id === 'oshawott-white-flare-105-086' || id === '00000000-0000-0000-0000-000000000012') {
      return {
        name: 'Oshawott White Flare 105/086',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://storage.googleapis.com/vrno-tcg-images/oshawott-white-flare-105-086.webp',
        description: 'A Water-type Pokémon card featuring Oshawott from the White Flare set. This adorable sea otter Pokémon showcases its shell-based attacks and water mastery abilities.',
        defaultPrice: 8.00
      };
    } else if (id === 'iono-bellibolt-ex-journey-together-183-159' || id === '00000000-0000-0000-0000-000000000014') {
      return {
        name: "Iono's Bellibolt EX Journey Together 183/159",
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: 'https://storage.googleapis.com/vrno-tcg-images/iono-bellibolt-ex-journey-together-183-159.webp',
        description: "Iono's Bellibolt EX from the Journey Together set featuring the Electric-type frog Pokémon with powerful electric abilities and gym leader synergy for devastating Lightning-type combinations.",
        defaultPrice: 38.00
      };
    } else if (id === '00000000-0000-0000-0000-000000000015' || id === 'labubu-big-energy-hope') {
      return {
        name: 'Labubu Big Energy Hope',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: '', // Will be dynamically fetched from eBay
        description: 'Labubu Big Energy Hope collectible featuring the beloved character with vibrant energy and hope symbolism, perfect for collectors seeking unique and emotionally resonant pieces.',
        defaultPrice: 25.00
      };
    } else if (id === '00000000-0000-0000-0000-000000000016' || id === 'labubu-monster-chestnut') {
      return {
        name: 'Labubu The Monster Secret Chestnut Cocoa',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: '', // Will be dynamically fetched from eBay
        description: 'Labubu The Monster Secret Chestnut Cocoa collectible featuring the beloved character in rich chestnut brown tones with monster-themed design, perfect for collectors seeking unique and whimsical pieces.',
        defaultPrice: 30.00
      };
    } else if (id === '00000000-0000-0000-0000-000000000017' || id === 'labubu-coca-cola-surprise-shake') {
      return {
        name: 'Labubu Coca-Cola Surprise Shake',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: '', // Will be dynamically fetched from eBay
        description: 'Labubu Coca-Cola Surprise Shake collectible featuring the beloved character with classic Coca-Cola branding and surprise shake theme, perfect for collectors seeking unique brand collaboration pieces.',
        defaultPrice: 22.00
      };
    } else if (id === '00000000-0000-0000-0000-000000000018' || id === 'labubu-seat-baba') {
      return {
        name: 'Labubu Have a Seat Baba',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: '', // Will be dynamically fetched from eBay
        description: 'Labubu Have a Seat Baba collectible featuring the beloved character in a relaxed sitting pose with charming white accents, perfect for collectors seeking whimsical and peaceful pieces.',
        defaultPrice: 20.00
      };
    } else if (id === '00000000-0000-0000-0000-000000000019' || id === 'labubu-macaron-lychee') {
      return {
        name: 'Labubu Exciting Macaron Lychee Berry',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: '', // Will be dynamically fetched from eBay
        description: 'Labubu Exciting Macaron Lychee Berry collectible featuring the beloved character with vibrant pink and berry tones in a delightful macaron-themed design, perfect for collectors seeking sweet and colorful pieces.',
        defaultPrice: 25.00
      };
    } else if (id === '00000000-0000-0000-0000-000000000020' || id === 'labubu-macaron-sea-salt') {
      return {
        name: 'Labubu Exciting Macaron Sea Salt',
        type: 'trading_card',
        rarity: 'rare',
        imageUrl: '', // Will be dynamically fetched from eBay
        description: 'Labubu Exciting Macaron Sea Salt collectible featuring the beloved character with clean white and salt-themed tones in a delightful macaron-inspired design, perfect for collectors seeking unique and pristine pieces.',
        defaultPrice: 24.00
      };
    } else {
      return {
        name: 'Unknown Collectible',
        type: 'unknown',
        rarity: 'common',
        imageUrl: 'https://via.placeholder.com/400x400/gray/white?text=Unknown',
        description: 'Unknown collectible.',
        defaultPrice: 100.00
      };
    }
  };

  const collectibleMetadata = getCollectibleMetadata(currentCollectibleId);

  // Calculate values after function definitions
  const currentTokenPrice = getCurrentTokenPrice();
  // ONLY use database price history and current_price for calculations
  const metadata = getCollectibleMetadata(currentCollectibleId);
  const currentUSDPrice = getLiveCurrentPrice(currentCollectibleId, metadata.defaultPrice);
  // Calculate price change from historical data
  const previousUSDPrice = priceHistory.length > 0 ? priceHistory[0].price : currentUSDPrice;
  const priceChange = currentUSDPrice - previousUSDPrice;
  const priceChangePercent = previousUSDPrice > 0 ? (priceChange / previousUSDPrice) * 100 : 0;

  // Convert USD prices to token values for chart display - ensure fresh array for React re-render
  const tokenPriceHistory = priceHistory.map((p, index) => ({
    ...p,
    price: convertUSDToTokens(p.price),
    key: `${p.timestamp}-${index}` // Add unique key to force re-render
  }));

  // Calculate Y-axis domain: round up to nearest 500 for better granularity
  const tokenPrices = tokenPriceHistory.length > 0 ? tokenPriceHistory.map(p => p.price) : [currentTokenPrice];
  const maxTokenPrice = Math.max(...tokenPrices);
  const minTokenPrice = Math.min(...tokenPrices);
  const yAxisMax = Math.ceil(maxTokenPrice / 500) * 500;
  const yAxisMin = Math.max(0, Math.floor(minTokenPrice / 500) * 500 - 500); // Start one chunk below minimum
  
  // Calculate Y-axis ticks in 500-token increments for better readability
  const yAxisTicks = [];
  const tickIncrement = Math.max(500, Math.ceil((yAxisMax - yAxisMin) / 10 / 500) * 500); // Adaptive increment
  for (let i = yAxisMin; i <= yAxisMax; i += tickIncrement) {
    yAxisTicks.push(i);
  }

  // The specific collectible data with dynamic pricing
  const currentCollectible: Collectible = {
    id: currentCollectibleId,
    name: collectibleMetadata.name,
    type: collectibleMetadata.type as any,
    rarity: collectibleMetadata.rarity,
    currentPrice: currentTokenPrice.toString(),
    imageUrl: (currentCollectibleId === '00000000-0000-0000-0000-000000000001' || currentCollectibleId === 'genesect-ex-black-bolt-161-086')
      ? (genesectListingData?.image_url || 'https://i.ebayimg.com/images/g/qC0AAeSwHLNoer1l/s-l225.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000002' || currentCollectibleId === 'ethan-hooh-ex-209-destined-rivals')
      ? (ethanHoohListingData?.image_url || 'https://storage.googleapis.com/tcgplayer-images/10fac984-6ac1-4e95-b3cb-6f2fdce4e88e.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000003' || currentCollectibleId === 'hilda-164-white-flare')
      ? (hildaListingData?.image_url || 'https://storage.googleapis.com/tcgplayer-images/f77c8a6b-b3a4-4c89-8a9d-7e2f8c3d9a1b.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000004' || currentCollectibleId === 'kyurem-ex-black-bolt-165-086')
      ? (kyuremListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000005' || currentCollectibleId === 'volcanion-ex-journey-together-182-159')
      ? (volcanionListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/623609_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000006' || currentCollectibleId === 'salamence-ex-journey-together-187-159')
      ? (salamenceListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000007' || currentCollectibleId === 'iron-hands-ex-prismatic-evolutions-154-131')
      ? (ironHandsListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/569779_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000008' || currentCollectibleId === 'pikachu-ex-prismatic-evolutions-179-131')
      ? (pikachuListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000009' || currentCollectibleId === 'iron-crown-ex-prismatic-evolutions')
      ? (ironCrownListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000010' || currentCollectibleId === 'hydreigon-ex-white-flare-169-086')
      ? (hydreigonListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000011' || currentCollectibleId === 'ns-plan-black-bolt')
      ? (nsPlanListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642281_in_1000x1000.jpg')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000012' || currentCollectibleId === 'oshawott-white-flare-105-086')
      ? (oshawottListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/oshawott-white-flare-105-086.webp')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000014' || currentCollectibleId === 'iono-bellibolt-ex-journey-together-183-159')
      ? (ionoBelliboltListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/iono-bellibolt-ex-journey-together-183-159.webp')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000015' || currentCollectibleId === 'labubu-big-energy-hope')
      ? (labubuBigEnergyHopeListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-big-energy-hope.webp')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000016' || currentCollectibleId === 'labubu-monster-chestnut')
      ? (labubuMonsterChestnutListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-monster-chestnut.webp')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000017' || currentCollectibleId === 'labubu-coca-cola-surprise-shake')
      ? (labubuCocaColaListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-coca-cola-surprise-shake.webp')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000018' || currentCollectibleId === 'labubu-seat-baba')
      ? (labubuSeatBabaListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-seat-baba.webp')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000019' || currentCollectibleId === 'labubu-macaron-lychee')
      ? (labubuMacaronLycheeListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-lychee.webp')
      : (currentCollectibleId === '00000000-0000-0000-0000-000000000020' || currentCollectibleId === 'labubu-macaron-sea-salt')
      ? (labubuMacaronSeaSaltListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-sea-salt.webp')
      : collectibleMetadata.imageUrl,
    description: collectibleMetadata.description,
    createdAt: new Date('2025-01-15'),
  };

  const handleTransaction = (type: 'buy' | 'sell') => {
    setTransactionType(type);
    setSelectedCollectible(currentCollectible);
    setIsTransactionModalOpen(true);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>
        <h1 className="text-3xl font-bold">{currentCollectible.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Image and Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="aspect-square w-full mb-4 overflow-hidden">
                <img 
                  src={currentCollectible.imageUrl || ''} 
                  alt={currentCollectible.name}
                  className={`w-full h-full object-cover rounded-lg ${
                    (currentCollectibleId === '00000000-0000-0000-0000-000000000010' || currentCollectibleId === 'hydreigon-ex-white-flare-169-086') 
                      ? 'scale-[1.15] brightness-110 contrast-110 filter' 
                      : ''
                  }`}
                />
              </div>
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000001' || currentCollectibleId === 'genesect-ex-black-bolt-161-086') && genesectListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={genesectListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${genesectListingData.total_price} with shipping from {genesectListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000002' || currentCollectibleId === 'ethan-hooh-ex-209-destined-rivals') && ethanHoohListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={ethanHoohListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${ethanHoohListingData.total_price} with shipping from {ethanHoohListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000003' || currentCollectibleId === 'hilda-164-white-flare') && hildaListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={hildaListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${hildaListingData.total_price} with shipping from {hildaListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000004' || currentCollectibleId === 'kyurem-ex-black-bolt-165-086') && kyuremListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={kyuremListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${kyuremListingData.total_price} with shipping from {kyuremListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000005' || currentCollectibleId === 'volcanion-ex-journey-together-182-159') && volcanionListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={volcanionListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${volcanionListingData.total_price} with shipping from {volcanionListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000006' || currentCollectibleId === 'salamence-ex-journey-together-187-159') && salamenceListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={salamenceListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${salamenceListingData.total_price} with shipping from {salamenceListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000007' || currentCollectibleId === 'iron-hands-ex-prismatic-evolutions-154-131') && ironHandsListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={ironHandsListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${ironHandsListingData.total_price} with shipping from {ironHandsListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000008' || currentCollectibleId === 'pikachu-ex-prismatic-evolutions-179-131') && pikachuListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={pikachuListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${pikachuListingData.total_price} with shipping from {pikachuListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000009' || currentCollectibleId === 'iron-crown-ex-prismatic-evolutions') && ironCrownListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={ironCrownListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${ironCrownListingData.total_price} with shipping from {ironCrownListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000010' || currentCollectibleId === 'hydreigon-ex-white-flare-169-086') && hydreigonListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={hydreigonListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${hydreigonListingData.total_price} with shipping from {hydreigonListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000011' || currentCollectibleId === 'ns-plan-black-bolt') && nsPlanListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={nsPlanListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${nsPlanListingData.total_price} with shipping from {nsPlanListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000012' || currentCollectibleId === 'oshawott-white-flare-105-086') && oshawottListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={oshawottListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${oshawottListingData.total_price} with shipping from {oshawottListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000014' || currentCollectibleId === 'iono-bellibolt-ex-journey-together-183-159') && ionoBelliboltListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={ionoBelliboltListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${ionoBelliboltListingData.total_price} with shipping from {ionoBelliboltListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000015' || currentCollectibleId === 'labubu-big-energy-hope') && labubuBigEnergyHopeListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={labubuBigEnergyHopeListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${labubuBigEnergyHopeListingData.total_price} with shipping from {labubuBigEnergyHopeListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000016' || currentCollectibleId === 'labubu-monster-chestnut') && labubuMonsterChestnutListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={labubuMonsterChestnutListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${labubuMonsterChestnutListingData.total_price} with shipping from {labubuMonsterChestnutListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000017' || currentCollectibleId === 'labubu-coca-cola-surprise-shake') && labubuCocaColaListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={labubuCocaColaListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${labubuCocaColaListingData.total_price} with shipping from {labubuCocaColaListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000018' || currentCollectibleId === 'labubu-seat-baba') && labubuSeatBabaListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={labubuSeatBabaListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${labubuSeatBabaListingData.total_price} with shipping from {labubuSeatBabaListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000019' || currentCollectibleId === 'labubu-macaron-lychee') && labubuMacaronLycheeListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={labubuMacaronLycheeListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${labubuMacaronLycheeListingData.total_price} with shipping from {labubuMacaronLycheeListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              {(currentCollectibleId === '00000000-0000-0000-0000-000000000020' || currentCollectibleId === 'labubu-macaron-sea-salt') && labubuMacaronSeaSaltListingData && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground">
                    Image from eBay listing: <a 
                      href={labubuMacaronSeaSaltListingData.ebay_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline"
                    >
                      ${labubuMacaronSeaSaltListingData.total_price} with shipping from {labubuMacaronSeaSaltListingData.seller_username}
                    </a>
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {currentCollectible.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trading Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Trading Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => handleTransaction('buy')}
                className="w-full"
                size="lg"
              >
                Buy {currentTokenPrice.toLocaleString()} tokens
              </Button>
              <Button 
                onClick={() => handleTransaction('sell')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Sell
              </Button>
            </CardContent>
          </Card>


        </div>

        {/* Right Column - Price Chart and Purchase History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Price Chart (24h)</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{currentTokenPrice.toLocaleString()} tokens</span>
                  <div className={`flex items-center gap-1 ${percentageChange.colorClass}`}>
                    {percentageChange.percent.startsWith('+') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm">
                      {percentageChange.percent}
                    </span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                {priceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      key={`chart-${tokenPriceHistory.length}-${tokenPriceHistory[tokenPriceHistory.length - 1]?.price}`}
                      data={tokenPriceHistory} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value, index) => {
                          // Show every 8th tick for better readability with dates
                          return index % Math.max(1, Math.floor(tokenPriceHistory.length / 6)) === 0 ? value : '';
                        }}
                      />
                      <YAxis 
                        domain={(() => {
                          if (tokenPriceHistory.length === 0) {
                            const currentPrice = getCurrentTokenPrice();
                            return [Math.round(currentPrice - 20), Math.round(currentPrice + 20)];
                          }
                          
                          const prices = tokenPriceHistory.map(point => point.price);
                          const minPrice = Math.min(...prices);
                          const maxPrice = Math.max(...prices);
                          
                          // Add 20 above highest point and 20 below lowest point
                          return [Math.round(minPrice - 20), Math.round(maxPrice + 20)];
                        })()}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                      />
                      <Tooltip 
                        labelFormatter={(value) => `Time: ${value}`}
                        formatter={(value: number) => [`${value.toLocaleString()} tokens`, 'Price']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: "#2563eb" }}
                        animationDuration={300}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg mb-2">No price history available</p>
                      <p className="text-sm">Price data will appear here once available from the database</p>
                      <p className="text-sm mt-2">Current price: {currentTokenPrice.toLocaleString()} tokens</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm text-muted-foreground">Prices based on live eBay listings</p>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                * 100 tokens = $1 USD • Purchasing tokens does not grant ownership of the underlying item; token values reflect resale market trends and are for simulation purposes only.
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Market Statistics - Full Width Below Chart */}
        <div className="lg:col-span-3 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Market Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                  <p className="text-lg font-semibold">{currentTokenPrice.toLocaleString()} tokens</p>
                  <p className="text-xs text-muted-foreground">${(currentTokenPrice / 100).toFixed(2)} USD</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">24h Change</p>
                  <p className={`text-lg font-semibold ${percentageChange?.colorClass || 'text-gray-600'}`}>
                    {percentageChange?.percent || '+0.0%'}
                  </p>
                  {!percentageChange?.percent && (
                    <p className="text-xs text-red-500">Debug: No data</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Category</p>
                  <p className="text-sm font-medium capitalize">
                    {currentCollectible.type.replace('_', ' ')}
                  </p>
                </div>
                {priceHistory.length > 0 && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Trend</p>
                      <div className="flex items-center justify-center gap-1">
                        {percentageChange.percent.startsWith('+') ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                        <span className={`text-sm font-medium ${percentageChange.colorClass}`}>
                          {percentageChange.percent.startsWith('+') ? 'Bullish' : 'Bearish'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">24h High</p>
                      <p className="text-sm font-medium">
                        {Math.max(...priceHistory.map(p => convertUSDToTokens(p.price))).toLocaleString()} tokens
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">24h Low</p>
                      <p className="text-sm font-medium">
                        {Math.min(...priceHistory.map(p => convertUSDToTokens(p.price))).toLocaleString()} tokens
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Item Details */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Item Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground block mb-1">Name</span>
                    <span className="text-sm font-medium">{currentCollectible.name}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground block mb-1">ID</span>
                    <span className="text-xs font-mono">{currentCollectibleId.slice(-8)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground block mb-1">Data Source</span>
                    <span className="text-sm">Live eBay Listings</span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground block mb-1">Last Updated</span>
                    <span className="text-sm">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        collectible={selectedCollectible}
        defaultType={transactionType}
      />
    </div>
  );
}