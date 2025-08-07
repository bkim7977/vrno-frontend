import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collectiblesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import CollectibleCard from '@/components/CollectibleCard';
import TransactionModal from '@/components/TransactionModal';
import { Search, Filter } from 'lucide-react';
import { Collectible } from '@shared/schema';
import { getCollectibleConfig, getCurrentTokenPrice, fetchGenesectListingData, fetchEthanHoohListingData, fetchHildaListingData, fetchKyuremListingData, fetchVolcanionListingData, fetchSalamenceListingData, fetchIronHandsListingData, fetchPikachuListingData, fetchIronCrownListingData, fetchHydreigonListingData, fetchNsPlanListingData, fetchOshawottListingData, fetchIonoBelliboltListingData, fetchLabubuBigEnergyHopeListingData, fetchLabubuMonsterChestnutListingData, fetchLabubuCocaColaListingData, fetchLabubuSeatBabaListingData, fetchLabubuMacaronLycheeListingData, fetchLabubuMacaronSeaSaltListingData } from '@/lib/collectibleHelpers';
import { useSharedPrices } from '@/hooks/useSharedPrices';

interface MarketplaceProps {
  onCollectibleSelect?: (id: string) => void;
}

export default function Marketplace({ onCollectibleSelect }: MarketplaceProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState('none');
  const [assetSort, setAssetSort] = useState('none');
  const [selectedCollectible, setSelectedCollectible] = useState<Collectible | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  
  // Use shared price system with 15-minute updates (Marketplace is active view)
  const { allPrices, isLoading: pricesLoading, getPriceForCollectible } = useSharedPrices(true);

  const { data: collectibles, isLoading } = useQuery({
    queryKey: ['collectibles'],
    queryFn: () => collectiblesApi.getAll(),
  });

  // Calculate percentage changes using shared price data
  const calculatePercentChange = (collectibleId: string, priceHistory: any[]) => {
    if (!priceHistory || priceHistory.length < 2) return { percent: '+0.0%', colorClass: 'text-gray-600' };
    
    const oldPrice = priceHistory[0]?.price || 0;
    const currentPrice = getPriceForCollectible(collectibleId) || 0;
    
    if (oldPrice === 0) return { percent: '+0.0%', colorClass: 'text-gray-600' };
    
    const percentChange = ((currentPrice - oldPrice) / oldPrice) * 100;
    const sign = percentChange >= 0 ? '+' : '';
    const colorClass = percentChange > 0 ? 'text-green-600' : percentChange < 0 ? 'text-red-600' : 'text-gray-600';
    
    return {
      percent: `${sign}${percentChange.toFixed(1)}%`,
      colorClass
    };
  };

          const data = await response.json();
          if (!data[0]?.avg_price_with_shipping) {
            console.warn(`No price data available for ${id}, using fallback`);
            return { avg_price_with_shipping: config.fallbackPrice };
          }

          return data[0];
        } catch (error) {
          console.error(`Failed to fetch price for ${id}:`, error);
          return { avg_price_with_shipping: config.fallbackPrice };
        }
      },
      refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
    })
  );

  // Create price lookup map
  const priceMap = collectibleIds.reduce((acc, id, index) => {
    const priceData = priceResults[index]?.data;
    acc[id] = priceData ? getCurrentTokenPrice(id, priceData) : 0;
    return acc;
  }, {} as Record<string, number>);

  // Fetch price history for percent change calculations
  const priceHistoryQueries = collectibleIds.map((id) => 
    useQuery({
      queryKey: ['price-history', id],
      queryFn: async () => {
        const config = getCollectibleConfig(id);
        if (!config) return [];

        try {
          const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/${config.priceHistoryTable}?select=avg_price_with_shipping,timestamp&timestamp=gte.2025-07-26T02:58:00Z&order=timestamp.asc&limit=200`, {
            headers: {
              'apikey': import.meta.env.VITE_VRNO_API_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
            }
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch price history from ${config.priceHistoryTable}`);
            return [];
          }

          const data = await response.json();
          return data.map((item: any) => ({
            price: parseFloat(item.avg_price_with_shipping),
            timestamp: item.timestamp
          }));
        } catch (error) {
          console.error(`Failed to fetch price history for ${id}:`, error);
          return [];
        }
      },
      refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
      refetchIntervalInBackground: false,
      retry: false,
    })
  );

  // Live price queries for each collectible (needed for percent change calculations)
  const { data: genesectLivePrice } = useQuery({
    queryKey: ['supabase-genesect-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: ethanHoohLivePrice } = useQuery({
    queryKey: ['supabase-ethan-hooh-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: hildaLivePrice } = useQuery({
    queryKey: ['supabase-hilda-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: kyuremLivePrice } = useQuery({
    queryKey: ['supabase-kyurem-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: volcanionLivePrice } = useQuery({
    queryKey: ['supabase-volcanion-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: salamenceLivePrice } = useQuery({
    queryKey: ['supabase-salamence-price'],
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
        return data[0] || { avg_price_with_shipping: 168.75 };
      } catch (error) {
        return { avg_price_with_shipping: 168.75 };
      }
    },
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: ironHandsLivePrice } = useQuery({
    queryKey: ['supabase-ironhands-price'],
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
        return data[0] || { avg_price_with_shipping: 77.13 };
      } catch (error) {
        return { avg_price_with_shipping: 77.13 };
      }
    },
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: pikachuLivePrice } = useQuery({
    queryKey: ['supabase-pikachu-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: ironCrownLivePrice } = useQuery({
    queryKey: ['supabase-ironcrown-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: hydreigonLivePrice } = useQuery({
    queryKey: ['supabase-hydreigon-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: nsPlanLivePrice } = useQuery({
    queryKey: ['supabase-nsplan-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: oshawottLivePrice } = useQuery({
    queryKey: ['supabase-oshawott-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: ionoBelliboltLivePrice } = useQuery({
    queryKey: ['supabase-ionobellibolt-price'],
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
        return data[0] || { avg_price_with_shipping: 38.00 };
      } catch (error) {
        return { avg_price_with_shipping: 38.00 };
      }
    },
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: labubuBigEnergyHopeLivePrice } = useQuery({
    queryKey: ['supabase-labubu-big-energy-hope-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: labubuMonsterChestnutLivePrice } = useQuery({
    queryKey: ['supabase-labubu-monster-chestnut-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: labubuCocaColaLivePrice } = useQuery({
    queryKey: ['supabase-labubu-coca-cola-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: labubuSeatBabaLivePrice } = useQuery({
    queryKey: ['supabase-labubu-seat-baba-price'],
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
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: labubuMacaronLycheeLivePrice } = useQuery({
    queryKey: ['supabase-labubu-macaron-lychee-price'],
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
        return data[0] || { avg_price_with_shipping: 80.25 };
      } catch (error) {
        return { avg_price_with_shipping: 80.25 };
      }
    },
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  const { data: labubuMacaronSeaSaltLivePrice } = useQuery({
    queryKey: ['supabase-labubu-macaron-sea-salt-price'],
    queryFn: async () => {
      try {
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_macaron_salt_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        if (!response.ok) throw new Error('Failed to fetch Labubu Macaron Sea Salt price');
        const data = await response.json();
        return data[0] || { avg_price_with_shipping: 72.96 };
      } catch (error) {
        return { avg_price_with_shipping: 72.96 };
      }
    },
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min) // Cache for 30 minutes (increased - safe overlap)
  });

  // Calculate percent changes using EXACT same logic as CollectibleDetails
  const calculatePercentChange = (id: string) => {
    const historyIndex = collectibleIds.indexOf(id);
    if (historyIndex === -1) return { percent: 'N/A', colorClass: 'text-gray-600' };

    const priceHistory = priceHistoryQueries[historyIndex]?.data || [];
    
    // Use same logic as CollectibleDetails: getLiveCurrentPrice function
    let currentUSDPrice;
    if (id === '00000000-0000-0000-0000-000000000001') {
      currentUSDPrice = genesectLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000002') {
      currentUSDPrice = ethanHoohLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000003') {
      currentUSDPrice = hildaLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000004') {
      currentUSDPrice = kyuremLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000005') {
      currentUSDPrice = volcanionLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000006') {
      currentUSDPrice = salamenceLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000007') {
      currentUSDPrice = ironHandsLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000008') {
      currentUSDPrice = pikachuLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000009') {
      currentUSDPrice = ironCrownLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000010') {
      currentUSDPrice = hydreigonLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000011') {
      currentUSDPrice = nsPlanLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000012') {
      currentUSDPrice = oshawottLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000014') {
      currentUSDPrice = ionoBelliboltLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000015') {
      currentUSDPrice = labubuBigEnergyHopeLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000016') {
      currentUSDPrice = labubuMonsterChestnutLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000017') {
      currentUSDPrice = labubuCocaColaLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000018') {
      currentUSDPrice = labubuSeatBabaLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000019') {
      currentUSDPrice = labubuMacaronLycheeLivePrice?.avg_price_with_shipping;
    } else if (id === '00000000-0000-0000-0000-000000000020') {
      currentUSDPrice = labubuMacaronSeaSaltLivePrice?.avg_price_with_shipping;
    }

    // Exact same calculation as CollectibleDetails
    const previousUSDPrice = priceHistory.length > 0 ? priceHistory[0].price : currentUSDPrice;
    
    if (!currentUSDPrice || !previousUSDPrice) {
      return { percent: 'N/A', colorClass: 'text-gray-600' };
    }

    const priceChange = currentUSDPrice - previousUSDPrice;
    const priceChangePercent = previousUSDPrice > 0 ? (priceChange / previousUSDPrice) * 100 : 0;
    
    const sign = priceChangePercent >= 0 ? '+' : '';
    const colorClass = priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600';
    
    return {
      percent: `${sign}${priceChangePercent.toFixed(2)}%`,
      colorClass
    };
  };

  // Fetch dynamic Genesect listing data synchronized with price updates
  const { data: genesectListingData } = useQuery({
    queryKey: ['genesect-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000001']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_genesect_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 19.22;
      
      console.log(`Marketplace: Fetching Genesect listing for price $${currentPrice.toFixed(2)}`);
      return await fetchGenesectListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Ethan's Ho-oh listing data synchronized with price updates
  const { data: ethanHoohListingData } = useQuery({
    queryKey: ['ethan-hooh-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000002']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_ethan_ho_oh_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 26.53;
      
      console.log(`Marketplace: Fetching Ethan Ho-oh listing for price $${currentPrice.toFixed(2)}`);
      return await fetchEthanHoohListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Hilda listing data synchronized with price updates
  const { data: hildaListingData } = useQuery({
    queryKey: ['hilda-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000003']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_hilda_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 44.11;
      
      console.log(`Marketplace: Fetching Hilda listing for price $${currentPrice.toFixed(2)}`);
      return await fetchHildaListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Kyurem listing data synchronized with price updates
  const { data: kyuremListingData } = useQuery({
    queryKey: ['kyurem-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000004']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_kyurem_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 125.99;
      
      console.log(`Marketplace: Fetching Kyurem listing for price $${currentPrice.toFixed(2)}`);
      return await fetchKyuremListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Volcanion listing data synchronized with price updates
  const { data: volcanionListingData } = useQuery({
    queryKey: ['volcanion-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000005']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_volcanion_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 45.31;
      
      console.log(`Marketplace: Fetching Volcanion listing for price $${currentPrice.toFixed(2)}`);
      return await fetchVolcanionListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Salamence listing data synchronized with price updates
  const { data: salamenceListingData } = useQuery({
    queryKey: ['salamence-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000006']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_salamence_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 22.00;
      
      console.log(`Marketplace: Fetching Salamence listing for price $${currentPrice.toFixed(2)}`);
      return await fetchSalamenceListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Iron Hands listing data synchronized with price updates
  const { data: ironHandsListingData } = useQuery({
    queryKey: ['iron-hands-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000007']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_iron_hands_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 35.00;
      
      console.log(`Marketplace: Fetching Iron Hands listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIronHandsListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Pikachu listing data synchronized with price updates
  const { data: pikachuListingData } = useQuery({
    queryKey: ['pikachu-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000008']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_pikachu_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 42.00;
      
      console.log(`Marketplace: Fetching Pikachu listing for price $${currentPrice.toFixed(2)}`);
      return await fetchPikachuListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Iron Crown listing data synchronized with price updates
  const { data: ironCrownListingData } = useQuery({
    queryKey: ['iron-crown-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000009']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_iron_crown_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 28.50;
      
      console.log(`Marketplace: Fetching Iron Crown listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIronCrownListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Hydreigon listing data synchronized with price updates
  const { data: hydreigonListingData } = useQuery({
    queryKey: ['hydreigon-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000010']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_hydreigon_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 161.74;
      
      console.log(`Marketplace: Fetching Hydreigon listing for price $${currentPrice.toFixed(2)}`);
      return await fetchHydreigonListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic N's Plan listing data synchronized with price updates
  const { data: nsPlanListingData } = useQuery({
    queryKey: ['nsplan-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000011']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_n_plan_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 15.00;
      
      console.log(`Marketplace: Fetching N's Plan listing for price $${currentPrice.toFixed(2)}`);
      return await fetchNsPlanListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Oshawott listing data synchronized with price updates
  const { data: oshawottListingData } = useQuery({
    queryKey: ['oshawott-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000012']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_oshawott_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 8.00;
      
      console.log(`Marketplace: Fetching Oshawott listing for price $${currentPrice.toFixed(2)}`);
      return await fetchOshawottListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Iono's Bellibolt listing data synchronized with price updates
  const { data: ionoBelliboltListingData } = useQuery({
    queryKey: ['ionobellibolt-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000014']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_ionobellibolt_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 38.00;
      
      console.log(`Marketplace: Fetching Iono's Bellibolt listing for price $${currentPrice.toFixed(2)}`);
      return await fetchIonoBelliboltListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Labubu Big Energy Hope listing data synchronized with price updates
  const { data: labubuBigEnergyHopeListingData } = useQuery({
    queryKey: ['labubu-big-energy-hope-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000015']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_big_energy_hope_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 25.00;
      
      console.log(`Marketplace: Fetching Labubu Big Energy Hope listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuBigEnergyHopeListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Labubu Monster Chestnut listing data synchronized with price updates
  const { data: labubuMonsterChestnutListingData } = useQuery({
    queryKey: ['labubu-monster-chestnut-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000016']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_monster_chestnut_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 30.00;
      
      console.log(`Marketplace: Fetching Labubu Monster Chestnut listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMonsterChestnutListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Labubu Coca-Cola listing data synchronized with price updates
  const { data: labubuCocaColaListingData } = useQuery({
    queryKey: ['labubu-coca-cola-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000017']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_coca_cola_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 22.00;
      
      console.log(`Marketplace: Fetching Labubu Coca-Cola listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuCocaColaListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Labubu Seat Baba listing data synchronized with price updates
  const { data: labubuSeatBabaListingData } = useQuery({
    queryKey: ['labubu-seat-baba-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000018']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_seat_baba_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 28.00;
      
      console.log(`Marketplace: Fetching Labubu Seat Baba listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuSeatBabaListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Labubu Macaron Lychee listing data synchronized with price updates
  const { data: labubuMacaronLycheeListingData } = useQuery({
    queryKey: ['labubu-macaron-lychee-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000019']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_macaron_lychee_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 30.00;
      
      console.log(`Marketplace: Fetching Labubu Macaron Lychee listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMacaronLycheeListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Fetch dynamic Labubu Macaron Sea Salt listing data synchronized with price updates
  const { data: labubuMacaronSeaSaltListingData } = useQuery({
    queryKey: ['labubu-macaron-sea-salt-listing-data-marketplace', priceMap['00000000-0000-0000-0000-000000000020']],
    queryFn: async () => {
      // First get the latest price from database to ensure synchronization
      const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/ebay_labubu_macaron_salt_market_summary?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
        headers: {
          'apikey': import.meta.env.VITE_VRNO_API_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
        }
      });
      const priceData = await response.json();
      const currentPrice = priceData[0]?.avg_price_with_shipping || 24.00;
      
      console.log(`Marketplace: Fetching Labubu Macaron Sea Salt listing for price $${currentPrice.toFixed(2)}`);
      return await fetchLabubuMacaronSeaSaltListingData(currentPrice);
    },
    enabled: true, // Re-enabled for essential price data
    refetchInterval: false, // Disabled - manual refresh only, // Reduced to 30 minutes for savings (still frequent enough) // Synchronized 15-minute updates
    refetchIntervalInBackground: false,
    staleTime: 45 * 60 * 1000, // Increased cache time (45min)
  });

  // Define all collectibles with their prices from the priceMap
  const genesectCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Genesect EX Black Bolt 161/086',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000001'] || 1694).toString(),
    imageUrl: genesectListingData?.image_url || 'https://i.ebayimg.com/images/g/qC0AAeSwHLNoer1l/s-l225.jpg',
    description: 'A powerful Bug/Steel-type EX Pokémon card featuring Genesect with Black Bolt attack.',
    createdAt: new Date('2025-01-25'),
  };

  const ethanHoohCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000002',
    name: "Ethan's Ho-oh EX #209 Destined Rivals",
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000002'] || 2653).toString(),
    imageUrl: ethanHoohListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/633009_in_1000x1000.jpg',
    description: "Ethan's Ho-oh EX from the Destined Rivals set featuring the legendary Phoenix Pokémon.",
    createdAt: new Date('2025-01-25'),
  };

  const hildaCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Hilda #164 White Flare',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000003'] || 4411).toString(),
    imageUrl: hildaListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642281_in_1000x1000.jpg',
    description: 'Hilda trainer card from the White Flare set featuring the Unova region trainer.',
    createdAt: new Date('2025-01-25'),
  };

  // 12 new collectibles
  const kyuremCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Kyurem EX Black Bolt 165/086',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000004'] || 12599).toString(),
    imageUrl: kyuremListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
    description: 'A powerful Ice/Dragon-type EX Pokémon card featuring Kyurem with Black Bolt attack.',
    createdAt: new Date('2025-01-25'),
  };

  const volcanionCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Volcanion EX Journey Together 182/159',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000005'] || 4531).toString(),
    imageUrl: volcanionListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/623609_in_1000x1000.jpg',
    description: 'A powerful Fire-type EX Pokémon card featuring Volcanion from Journey Together set.',
    createdAt: new Date('2025-01-25'),
  };

  const salamenceCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Salamence EX Journey Together 187/159',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000006'] || 2200).toString(),
    imageUrl: salamenceListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
    description: 'A powerful Dragon/Flying-type EX Pokémon card featuring Salamence from Journey Together set.',
    createdAt: new Date('2025-01-25'),
  };

  const ironHandsCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Iron Hands EX Prismatic Evolutions 154/131',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000007'] || 3500).toString(),
    imageUrl: ironHandsListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
    description: 'A powerful Fighting-type EX Pokémon card featuring Iron Hands from Prismatic Evolutions set.',
    createdAt: new Date('2025-01-25'),
  };

  const pikachuCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000008',
    name: 'Pikachu EX Prismatic Evolutions 179/131',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000008'] || 4200).toString(),
    imageUrl: pikachuListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
    description: 'A powerful Electric-type EX Pokémon card featuring Pikachu from Prismatic Evolutions set.',
    createdAt: new Date('2025-01-25'),
  };

  const ironCrownCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Iron Crown EX Prismatic Evolutions',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000009'] || 2850).toString(),
    imageUrl: ironCrownListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
    description: 'A powerful Psychic-type EX Pokémon card featuring Iron Crown from the Prismatic Evolutions set with royal abilities and devastating Psychic-type attack combinations.',
    createdAt: new Date('2025-01-25'),
  };

  const hydreigonCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Hydreigon EX White Flare 169/086',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000010'] || 16174).toString(),
    imageUrl: hydreigonListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
    description: 'A powerful Dark/Dragon-type EX Pokémon card featuring Hydreigon from the White Flare set with devastating dark-type attacks.',
    createdAt: new Date('2025-01-25'),
  };

  const nsPlanCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000011',
    name: "N's Plan Black Bolt 170/086",
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000011'] || 1500).toString(),
    imageUrl: nsPlanListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642617_in_1000x1000.jpg',
    description: "A powerful trainer card from the Black Bolt set featuring N's strategic planning abilities for competitive battles.",
    createdAt: new Date('2025-01-25'),
  };

  const oshawottCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000012',
    name: 'Oshawott White Flare 105/086',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000012'] || 800).toString(),
    imageUrl: oshawottListingData?.image_url || 'https://tcgplayer-cdn.tcgplayer.com/product/642281_in_1000x1000.jpg',
    description: 'A charming Water-type starter Pokémon card from the White Flare set featuring Oshawott with shell-based attacks.',
    createdAt: new Date('2025-01-25'),
  };

  const ionoBelliboltCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000014',
    name: "Iono's Bellibolt EX Journey Together 183/159",
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000014'] || 3800).toString(),
    imageUrl: ionoBelliboltListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/iono-bellibolt-ex-journey-together-183-159.webp',
    description: "Iono's Bellibolt EX from the Journey Together set featuring the Electric-type frog Pokémon with powerful electric abilities and gym leader synergy.",
    createdAt: new Date('2025-01-25'),
  };

  const labubuBigEnergyHopeCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000015',
    name: 'Labubu Big Energy Hope',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000015'] || 2500).toString(),
    imageUrl: labubuBigEnergyHopeListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-big-energy-hope.webp',
    description: 'Labubu Big Energy Hope collectible featuring the popular character with vibrant energy-themed artwork.',
    createdAt: new Date('2025-01-25'),
  };

  const labubuMonsterChestnutCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000016',
    name: 'Labubu The Monster Secret Chestnut Cocoa',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000016'] || 3000).toString(),
    imageUrl: labubuMonsterChestnutListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-monster-chestnut-cocoa.webp',
    description: 'Labubu The Monster Secret in Chestnut Cocoa colorway, featuring the iconic monster character with rich brown tones.',
    createdAt: new Date('2025-01-25'),
  };

  const labubuCocaColaCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000017',
    name: 'Labubu Coca-Cola Surprise Shake',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000017'] || 2200).toString(),
    imageUrl: labubuCocaColaListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-coca-cola-surprise-shake.webp',
    description: 'Labubu Coca-Cola Surprise Shake collectible featuring the popular character with classic Coca-Cola branding.',
    createdAt: new Date('2025-01-31'),
  };

  const labubuSeatBabaCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000018',
    name: 'Labubu Have a Seat Baba',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000018'] || 2800).toString(),
    imageUrl: labubuSeatBabaListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-have-a-seat-baba.webp',
    description: 'Labubu Have a Seat Baba collectible featuring the popular character in a relaxed sitting pose.',
    createdAt: new Date('2025-01-31'),
  };

  const labubuMacaronLycheeCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000019',
    name: 'Labubu Exciting Macaron Lychee Berry',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000019'] || 3000).toString(),
    imageUrl: labubuMacaronLycheeListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-exciting-macaron-lychee-berry.webp',
    description: 'Labubu Exciting Macaron Lychee Berry collectible featuring the popular character with vibrant pink macaron and lychee berry themes.',
    createdAt: new Date('2025-01-31'),
  };

  const labubuMacaronSeaSaltCollectible: Collectible = {
    id: '00000000-0000-0000-0000-000000000020',
    name: 'Labubu Exciting Macaron Sea Salt',
    type: 'trading_card',
    rarity: 'rare',
    currentPrice: (priceMap['00000000-0000-0000-0000-000000000020'] || 2400).toString(),
    imageUrl: labubuMacaronSeaSaltListingData?.image_url || 'https://storage.googleapis.com/vrno-tcg-images/labubu-exciting-macaron-sea-salt.webp',
    description: 'Labubu Exciting Macaron Sea Salt collectible featuring the popular character with elegant white macaron and sea salt themes.',
    createdAt: new Date('2025-01-31'),
  };

  // Combine all collectibles into a single array
  const allCollectibles = [
    genesectCollectible,
    ethanHoohCollectible,
    hildaCollectible,
    kyuremCollectible,
    volcanionCollectible,
    salamenceCollectible,
    ironHandsCollectible,
    pikachuCollectible,
    ironCrownCollectible,
    hydreigonCollectible,
    nsPlanCollectible,
    oshawottCollectible,
    ionoBelliboltCollectible,
    labubuBigEnergyHopeCollectible,
    labubuMonsterChestnutCollectible,
    labubuCocaColaCollectible,
    labubuSeatBabaCollectible,
    labubuMacaronLycheeCollectible,
    labubuMacaronSeaSaltCollectible,
  ];

  // Filter and sort collectibles based on search, filter, and sorting criteria
  const filteredCollectibles = allCollectibles
    .filter(collectible => {
      const matchesSearch = collectible.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (collectible.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      // Asset type sorting (Pokemon first, then Labubu)
      if (assetSort !== 'none') {
        const isALabubu = a.name.toLowerCase().includes('labubu');
        const isBLabubu = b.name.toLowerCase().includes('labubu');
        
        if (assetSort === 'pokemon-first') {
          if (!isALabubu && isBLabubu) return -1; // Pokemon first
          if (isALabubu && !isBLabubu) return 1;  // Labubu second
        } else if (assetSort === 'labubu-first') {
          if (isALabubu && !isBLabubu) return -1; // Labubu first
          if (!isALabubu && isBLabubu) return 1;  // Pokemon second
        }
      }
      
      // Price sorting (applied after asset type sorting)
      if (priceSort !== 'none') {
        const priceA = parseFloat(a.currentPrice) || 0;
        const priceB = parseFloat(b.currentPrice) || 0;
        
        if (priceSort === 'low-to-high') {
          return priceA - priceB;
        } else if (priceSort === 'high-to-low') {
          return priceB - priceA;
        }
      }
      
      return 0;
    });

  const handleCollectibleClick = (collectible: Collectible) => {
    // Navigate to collectible details page using the existing navigation system
    onCollectibleSelect?.(collectible.id);
  };

  const handleBuyClick = (collectible: Collectible) => {
    setSelectedCollectible(collectible);
    setIsTransactionModalOpen(true);
  };

  // Loading state while price data is being fetched
  if (priceResults.some(result => result.isLoading)) {
    return (
      <div className="space-y-6">
        {/* Beta Testing Notice */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">β</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Beta Testing Phase</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Pokemon cards are currently available for beta testing. We're working on implementing other asset types (e.g., sports cards) for the live launch.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search collectibles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={priceSort} onValueChange={setPriceSort}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default Order</SelectItem>
                <SelectItem value="low-to-high">Price: Low to High</SelectItem>
                <SelectItem value="high-to-low">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assetSort} onValueChange={setAssetSort}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Mixed Types</SelectItem>
                <SelectItem value="pokemon-first">Pokemon First</SelectItem>
                <SelectItem value="labubu-first">Labubu First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-card rounded-lg p-4 border">
              <Skeleton className="h-[34rem] w-full mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Beta Testing Notice */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">β</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Beta Testing Phase</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Pokemon cards are currently available for beta testing. We're working on implementing other asset types (e.g., sports cards) for the live launch.
            </p>
          </div>
        </div>
      </div>
      
      {/* eBay Attribution Notice */}
      <div className="text-center py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-muted-foreground">
          All prices are based on live eBay marketplace data
        </p>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search collectibles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={priceSort} onValueChange={setPriceSort}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Default Order</SelectItem>
              <SelectItem value="low-to-high">Price: Low to High</SelectItem>
              <SelectItem value="high-to-low">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assetSort} onValueChange={setAssetSort}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Mixed Types</SelectItem>
              <SelectItem value="pokemon-first">Pokemon First</SelectItem>
              <SelectItem value="labubu-first">Labubu First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Collectibles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCollectibles.map((collectible) => (
          <CollectibleCard
            key={collectible.id}
            collectible={collectible}
            onCardClick={() => handleCollectibleClick(collectible)}
            onBuyClick={() => handleBuyClick(collectible)}
            ebayListingData={
              collectible.id === '00000000-0000-0000-0000-000000000001' ? genesectListingData :
              collectible.id === '00000000-0000-0000-0000-000000000002' ? ethanHoohListingData :
              collectible.id === '00000000-0000-0000-0000-000000000003' ? hildaListingData :
              collectible.id === '00000000-0000-0000-0000-000000000004' ? kyuremListingData :
              collectible.id === '00000000-0000-0000-0000-000000000005' ? volcanionListingData :
              collectible.id === '00000000-0000-0000-0000-000000000006' ? salamenceListingData :
              collectible.id === '00000000-0000-0000-0000-000000000007' ? ironHandsListingData :
              collectible.id === '00000000-0000-0000-0000-000000000008' ? pikachuListingData :
              collectible.id === '00000000-0000-0000-0000-000000000009' ? ironCrownListingData :
              collectible.id === '00000000-0000-0000-0000-000000000010' ? hydreigonListingData :
              collectible.id === '00000000-0000-0000-0000-000000000011' ? nsPlanListingData :
              collectible.id === '00000000-0000-0000-0000-000000000012' ? oshawottListingData :
              collectible.id === '00000000-0000-0000-0000-000000000014' ? ionoBelliboltListingData :
              collectible.id === '00000000-0000-0000-0000-000000000015' ? labubuBigEnergyHopeListingData :
              collectible.id === '00000000-0000-0000-0000-000000000016' ? labubuMonsterChestnutListingData :
              collectible.id === '00000000-0000-0000-0000-000000000017' ? labubuCocaColaListingData :
              collectible.id === '00000000-0000-0000-0000-000000000018' ? labubuSeatBabaListingData :
              collectible.id === '00000000-0000-0000-0000-000000000019' ? labubuMacaronLycheeListingData :
              collectible.id === '00000000-0000-0000-0000-000000000020' ? labubuMacaronSeaSaltListingData :
              null
            }
            priceChange={calculatePercentChange(collectible.id)}
          />
        ))}
      </div>

      {filteredCollectibles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No collectibles found matching your criteria.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setPriceSort('none');
              setAssetSort('none');
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Transaction Modal */}
      {selectedCollectible && (
        <TransactionModal
          collectible={selectedCollectible}
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setSelectedCollectible(null);
          }}
        />
      )}
    </div>
  );
}