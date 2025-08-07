import { useQuery } from '@tanstack/react-query';
import { getCollectibleConfig } from '@/lib/collectibleHelpers';

// Store previous prices to prevent sudden jumps
let previousPricesCache: Record<string, number> = {};

// Centralized price fetching hook that both Dashboard and Marketplace can use
export const useSharedPrices = (isActiveView: boolean = false) => {
  const collectibleIds = [
    '00000000-0000-0000-0000-000000000001', // Genesect
    '00000000-0000-0000-0000-000000000002', // Ethan's Ho-oh EX
    '00000000-0000-0000-0000-000000000003', // Hilda
    '00000000-0000-0000-0000-000000000004', // Kyurem ex
    '00000000-0000-0000-0000-000000000005', // Volcanion ex
    '00000000-0000-0000-0000-000000000006', // Salamence ex
    '00000000-0000-0000-0000-000000000007', // Iron Hands ex
    '00000000-0000-0000-0000-000000000008', // Pikachu ex
    '00000000-0000-0000-0000-000000000009', // Iron Crown ex
    '00000000-0000-0000-0000-000000000010', // Hydreigon ex
    '00000000-0000-0000-0000-000000000011', // N's Plan
    '00000000-0000-0000-0000-000000000012', // Oshawott
    '00000000-0000-0000-0000-000000000014', // Iono's Bellibolt ex
    '00000000-0000-0000-0000-000000000015', // Labubu Big Energy Hope
    '00000000-0000-0000-0000-000000000016', // Labubu Monster Chestnut Cocoa
    '00000000-0000-0000-0000-000000000017', // Labubu Coca-Cola Surprise Shake
    '00000000-0000-0000-0000-000000000018', // Labubu Have a Seat Baba
    '00000000-0000-0000-0000-000000000019', // Labubu Exciting Macaron Lychee Berry
    '00000000-0000-0000-0000-000000000020', // Labubu Exciting Macaron Sea Salt
  ];

  // Single shared query that fetches all prices at once with anti-jump protection
  const { data: allPrices, isLoading, error } = useQuery({
    queryKey: ['shared-collectible-prices'],
    queryFn: async () => {
      console.log('🔄 Fetching shared prices for all collectibles...');
      
      const pricePromises = collectibleIds.map(async (id) => {
        const config = getCollectibleConfig(id);
        if (!config) return { id, price: null, error: 'No config found' };

        try {
          const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/${config.marketSummaryTable}?select=avg_price_with_shipping&order=timestamp.desc&limit=1`, {
            headers: {
              'apikey': import.meta.env.VITE_VRNO_API_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
            }
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch price from ${config.marketSummaryTable}, using fallback`);
            return { id, price: config.fallbackPrice, source: 'fallback' };
          }

          const data = await response.json();
          const rawNewPrice = data?.[0]?.avg_price_with_shipping || config.fallbackPrice;
          
          // Anti-jump protection: prevent sudden price changes > 50%
          const previousPrice = previousPricesCache[id] || rawNewPrice;
          const priceChange = Math.abs((rawNewPrice - previousPrice) / previousPrice);
          
          let finalPrice = rawNewPrice;
          if (priceChange > 0.5 && previousPrice > 0) {
            // If price jump is > 50%, use gradual transition (75% new, 25% old)
            finalPrice = (rawNewPrice * 0.75) + (previousPrice * 0.25);
            console.log(`🛡️ Price jump protection for ${id}: ${previousPrice} → ${rawNewPrice} (using ${finalPrice.toFixed(2)})`);
          }
          
          // Update cache
          previousPricesCache[id] = finalPrice;
          
          return { id, price: finalPrice, source: 'live' };
        } catch (error) {
          console.warn(`Error fetching price for ${id}:`, error);
          return { id, price: config?.fallbackPrice || 0, source: 'fallback' };
        }
      });

      const results = await Promise.all(pricePromises);
      
      // Convert array to object for easy lookup
      const priceMap = results.reduce((acc, result) => {
        acc[result.id] = result;
        return acc;
      }, {} as Record<string, any>);

      console.log('✅ Shared prices fetched successfully');
      return priceMap;
    },
    // OPTIMIZED UPDATE LOGIC: 15 minutes as requested, with caching
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes to reduce calls
    refetchInterval: 15 * 60 * 1000, // 15 minutes for price updates as requested
    refetchIntervalInBackground: false, // Never refetch in background
    refetchOnWindowFocus: false, // Don't refetch on focus
    enabled: true,
  });

  // Helper function to get price for specific collectible
  const getPriceForCollectible = (collectibleId: string) => {
    return allPrices?.[collectibleId]?.price || null;
  };

  // Helper function to get price source (live/fallback)
  const getPriceSource = (collectibleId: string) => {
    return allPrices?.[collectibleId]?.source || 'unknown';
  };

  return {
    allPrices,
    isLoading,
    error,
    getPriceForCollectible,
    getPriceSource,
  };
};