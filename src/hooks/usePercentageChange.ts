import { useQuery } from '@tanstack/react-query';
import { useSharedPrices } from '@/hooks/useSharedPrices';

// Helper function to get the correct table name for price history
const getTableNameForCollectible = (collectibleId: string): string | null => {
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
  
  return tableMap[collectibleId] || null;
};

interface PercentageChangeResult {
  percent: string;
  colorClass: string;
}

// Shared hook for calculating consistent percentage changes across components
export const usePercentageChange = (collectibleId: string, enablePriceHistory = true): PercentageChangeResult => {
  const { getPriceForCollectible } = useSharedPrices(true);
  
  const currentPrice = getPriceForCollectible(collectibleId);
  
  // Use optimized price history logic with reduced database calls
  const { data: priceHistoryData } = useQuery({
    queryKey: ['price-history-percentage', collectibleId],
    queryFn: async () => {
      // Fetch price history directly from Supabase based on collectible ID
      try {
        const tableName = getTableNameForCollectible(collectibleId);
        if (!tableName) return [];
        
        const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/${tableName}?select=*&order=timestamp.desc&limit=100`, {
          headers: {
            'apikey': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
          }
        });
        
        if (!response.ok) return [];
        const data = await response.json();
        return data;
      } catch (error) {
        console.warn(`Price history unavailable for collectible ${collectibleId}`);
        return [];
      }
    },
    enabled: enablePriceHistory,
    staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes to reduce calls
    refetchInterval: 15 * 60 * 1000, // Match 15-minute interval as requested
    refetchIntervalInBackground: false, // No background refreshing
    refetchOnWindowFocus: false, // Disable focus triggers
    retry: false,
  });
  
  if (!currentPrice || !priceHistoryData || priceHistoryData.length === 0) {
    return { percent: '+0.0%', colorClass: 'text-gray-600' };
  }
  
  // Calculate 24-hour price change using same logic as CollectibleDetails
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Find the price closest to 24 hours ago
  const historicalPrice = priceHistoryData.find((point: any) => {
    const pointDate = new Date(point.timestamp);
    return Math.abs(pointDate.getTime() - dayAgo.getTime()) < 2 * 60 * 60 * 1000;
  });
  
  if (!historicalPrice) {
    // Use the oldest available price point
    const oldestPrice = priceHistoryData[priceHistoryData.length - 1];
    if (!oldestPrice) return { percent: '+0.0%', colorClass: 'text-gray-600' };
    
    const oldPrice = parseFloat(oldestPrice.avg_price_with_shipping || oldestPrice.avg_price || 0);
    if (oldPrice === 0) return { percent: '+0.0%', colorClass: 'text-gray-600' };
    
    const changePercent = ((currentPrice - oldPrice) / oldPrice) * 100;
    const sign = changePercent >= 0 ? '+' : '';
    const colorClass = changePercent >= 0 ? 'text-green-600' : 'text-red-600';
    
    return {
      percent: `${sign}${changePercent.toFixed(1)}%`,
      colorClass
    };
  }
  
  // Calculate authentic percentage change
  const oldPrice = parseFloat(historicalPrice.avg_price_with_shipping || historicalPrice.avg_price || 0);
  if (oldPrice === 0) return { percent: '+0.0%', colorClass: 'text-gray-600' };
  
  const changePercent = ((currentPrice - oldPrice) / oldPrice) * 100;
  const sign = changePercent >= 0 ? '+' : '';
  const colorClass = changePercent >= 0 ? 'text-green-600' : 'text-red-600';
  
  return {
    percent: `${sign}${changePercent.toFixed(1)}%`,
    colorClass
  };
};

// Hook for multiple collectibles (batch processing for efficiency)
export const useBatchPercentageChanges = (collectibleIds: string[], enablePriceHistory = true) => {
  const { getPriceForCollectible } = useSharedPrices(true);
  
  // Fetch price history for all collectibles simultaneously with heavy optimization
  const { data: priceHistoryMap } = useQuery({
    queryKey: ['batch-price-changes-optimized', collectibleIds.join(',')],
    queryFn: async () => {
      if (!collectibleIds.length) return {};
      
      console.log('🔄 Fetching optimized batch price history for collectibles:', collectibleIds.length);
      
      const priceHistoryPromises = collectibleIds.map(async (collectibleId) => {
        try {
          const tableName = getTableNameForCollectible(collectibleId);
          if (!tableName) {
            return { id: collectibleId, history: [] };
          }
          
          // Optimized query: only get last 24 hours + few older records for comparison
          const response = await fetch(`https://rrhdrkmomngxcjsatcpy.supabase.co/rest/v1/${tableName}?select=avg_price_with_shipping,timestamp&order=timestamp.desc&limit=30`, {
            headers: {
              'apikey': import.meta.env.VITE_VRNO_API_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_VRNO_API_KEY}`,
            }
          });
          
          if (!response.ok) {
            console.warn(`Failed to fetch price history for ${collectibleId}: ${response.status}`);
            return { id: collectibleId, history: [] };
          }
          
          const data = await response.json();
          console.log(`Price history for ${collectibleId}: ${data.length} records`);
          return { id: collectibleId, history: data };
        } catch (error) {
          console.error(`Error fetching price history for collectible ${collectibleId}:`, error);
          return { id: collectibleId, history: [] };
        }
      });
      
      const results = await Promise.all(priceHistoryPromises);
      const historyMap: Record<string, any> = {};
      
      results.forEach(({ id, history }) => {
        historyMap[id] = history;
      });
      
      console.log('Batch price history map:', Object.keys(historyMap).map(id => ({ id, recordCount: historyMap[id].length })));
      
      return historyMap;
    },
    enabled: enablePriceHistory && collectibleIds.length > 0,
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes to reduce excessive calls
    refetchInterval: 15 * 60 * 1000, // 15-minute intervals as requested
    refetchIntervalInBackground: false, // No background refreshing to save compute
    refetchOnWindowFocus: false, // Disable focus triggers to prevent extra calls
    retry: false,
  });

  // Calculate percentage changes for all collectibles
  const calculatePercentChange = (collectibleId: string): PercentageChangeResult => {
    const currentPrice = getPriceForCollectible(collectibleId);
    const priceHistoryData = priceHistoryMap?.[collectibleId] || [];
    
    // Debug logging for problematic collectibles
    if (collectibleId === '00000000-0000-0000-0000-000000000011' || collectibleId === '00000000-0000-0000-0000-000000000020') {
      console.log(`[DEBUG] Calculating percentage for ${collectibleId}:`);
      console.log(`  Current price: ${currentPrice}`);
      console.log(`  Price history records: ${priceHistoryData.length}`);
      console.log(`  Sample history:`, priceHistoryData.slice(0, 3));
    }
    
    if (!currentPrice || !priceHistoryData || priceHistoryData.length === 0) {
      if (collectibleId === '00000000-0000-0000-0000-000000000011' || collectibleId === '00000000-0000-0000-0000-000000000020') {
        console.log(`[DEBUG] Returning 0.0% for ${collectibleId} - missing data`);
      }
      return { percent: '+0.0%', colorClass: 'text-gray-600' };
    }
    
    // Calculate 24-hour price change using same logic as individual hook
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Find the price closest to 24 hours ago
    const historicalPrice = priceHistoryData.find((point: any) => {
      const pointDate = new Date(point.timestamp);
      return Math.abs(pointDate.getTime() - dayAgo.getTime()) < 2 * 60 * 60 * 1000;
    });
    
    if (!historicalPrice) {
      // Use the oldest available price point
      const oldestPrice = priceHistoryData[priceHistoryData.length - 1];
      if (!oldestPrice) return { percent: '+0.0%', colorClass: 'text-gray-600' };
      
      const oldPrice = parseFloat(oldestPrice.avg_price_with_shipping || oldestPrice.avg_price || 0);
      if (oldPrice === 0) return { percent: '+0.0%', colorClass: 'text-gray-600' };
      
      const changePercent = ((currentPrice - oldPrice) / oldPrice) * 100;
      const sign = changePercent >= 0 ? '+' : '';
      const colorClass = changePercent >= 0 ? 'text-green-600' : 'text-red-600';
      
      if (collectibleId === '00000000-0000-0000-0000-000000000011' || collectibleId === '00000000-0000-0000-0000-000000000020') {
        console.log(`[DEBUG] Using oldest price for ${collectibleId}: ${oldPrice} vs current ${currentPrice} = ${changePercent.toFixed(1)}%`);
      }
      
      return {
        percent: `${sign}${changePercent.toFixed(1)}%`,
        colorClass
      };
    }
    
    // Calculate authentic percentage change
    const oldPrice = parseFloat(historicalPrice.avg_price_with_shipping || historicalPrice.avg_price || 0);
    if (oldPrice === 0) return { percent: '+0.0%', colorClass: 'text-gray-600' };
    
    const changePercent = ((currentPrice - oldPrice) / oldPrice) * 100;
    const sign = changePercent >= 0 ? '+' : '';
    const colorClass = changePercent >= 0 ? 'text-green-600' : 'text-red-600';
    
    if (collectibleId === '00000000-0000-0000-0000-000000000011' || collectibleId === '00000000-0000-0000-0000-000000000020') {
      console.log(`[DEBUG] Using 24h price for ${collectibleId}: ${oldPrice} vs current ${currentPrice} = ${changePercent.toFixed(1)}%`);
    }
    
    return {
      percent: `${sign}${changePercent.toFixed(1)}%`,
      colorClass
    };
  };

  return {
    calculatePercentChange,
    isLoading: !priceHistoryMap && enablePriceHistory
  };
};