import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  fetchGenesectListingData, 
  fetchEthanHoohListingData, 
  fetchHildaListingData,
  fetchKyuremListingData,
  fetchVolcanionListingData,
  fetchSalamenceListingData,
  fetchIronHandsListingData,
  fetchPikachuListingData,
  fetchIronCrownListingData,
  fetchHydreigonListingData,
  fetchNsPlanListingData,
  fetchOshawottListingData,
  fetchIonoBelliboltListingData,
  fetchLabubuBigEnergyHopeListingData,
  fetchLabubuMonsterChestnutListingData,
  fetchLabubuCocaColaListingData,
  fetchLabubuSeatBabaListingData,
  fetchLabubuMacaronLycheeListingData,
  fetchLabubuMacaronSeaSaltListingData
} from '@/lib/collectibleHelpers';

interface OptimizedImageData {
  imageUrl: string;
  ebayUrl?: string;
  ebayPrice?: string;
  ebaySeller?: string;
}

// Hook to get optimized images for collectibles that sync with CollectibleDetails
export const useOptimizedImages = (collectibleIds: string[], currentPrices: Record<string, number>, isActive: boolean = true) => {
  const [optimizedImages, setOptimizedImages] = useState<Record<string, OptimizedImageData>>({});

  // Function to fetch listing data for a specific collectible
  const fetchListingData = async (collectibleId: string, targetPrice: number) => {
    let listingData = null;
    
    switch (collectibleId) {
      case '00000000-0000-0000-0000-000000000001':
        listingData = await fetchGenesectListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000002':
        listingData = await fetchEthanHoohListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000003':
        listingData = await fetchHildaListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000004':
        listingData = await fetchKyuremListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000005':
        listingData = await fetchVolcanionListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000006':
        listingData = await fetchSalamenceListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000007':
        listingData = await fetchIronHandsListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000008':
        listingData = await fetchPikachuListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000009':
        listingData = await fetchIronCrownListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000010':
        listingData = await fetchHydreigonListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000011':
        listingData = await fetchNsPlanListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000012':
        listingData = await fetchOshawottListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000014':
        listingData = await fetchIonoBelliboltListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000015':
        listingData = await fetchLabubuBigEnergyHopeListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000016':
        listingData = await fetchLabubuMonsterChestnutListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000017':
        listingData = await fetchLabubuCocaColaListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000018':
        listingData = await fetchLabubuSeatBabaListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000019':
        listingData = await fetchLabubuMacaronLycheeListingData(targetPrice);
        break;
      case '00000000-0000-0000-0000-000000000020':
        listingData = await fetchLabubuMacaronSeaSaltListingData(targetPrice);
        break;
    }
    
    if (listingData) {
      return {
        imageUrl: listingData.image_url,
        ebayUrl: listingData.ebay_url,
        ebayPrice: listingData.total_price?.toString(),
        ebaySeller: listingData.seller_username
      };
    }
    
    // Fallback to default images
    const getDefaultImageUrl = (collectibleId: string): string => {
      const labububDefaults: Record<string, string> = {
        '00000000-0000-0000-0000-000000000015': 'https://storage.googleapis.com/vrno-tcg-images/labubu-big-energy-hope.webp',
        '00000000-0000-0000-0000-000000000016': 'https://storage.googleapis.com/vrno-tcg-images/labubu-monster-chestnut-cocoa.webp',
        '00000000-0000-0000-0000-000000000017': 'https://storage.googleapis.com/vrno-tcg-images/labubu-coca-cola-surprise-shake.webp',
        '00000000-0000-0000-0000-000000000018': 'https://storage.googleapis.com/vrno-tcg-images/labubu-have-a-seat-baba.webp',
        '00000000-0000-0000-0000-000000000019': 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-lychee-berry.webp',
        '00000000-0000-0000-0000-000000000020': 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-sea-salt.webp',
        '00000000-0000-0000-0000-000000000014': 'https://storage.googleapis.com/vrno-tcg-images/iono-bellibolt-ex-journey-together-183-159.webp',
      };
      
      return labububDefaults[collectibleId] || 'https://images.pokemontcg.io/base1/1.png';
    };
    
    return {
      imageUrl: getDefaultImageUrl(collectibleId)
    };
  };

  // Use React Query to fetch images with caching and sync with price updates
  const { data: imageData, isLoading } = useQuery({
    queryKey: ['optimized-images', collectibleIds, currentPrices, isActive],
    queryFn: async () => {
      if (!isActive || collectibleIds.length === 0) return {};
      
      console.log('Fetching optimized images for', collectibleIds.length, 'collectibles');
      
      const imagePromises = collectibleIds.map(async (id) => {
        const targetPrice = currentPrices[id] || 0;
        if (targetPrice === 0) return [id, null];
        
        try {
          const imageData = await fetchListingData(id, targetPrice);
          return [id, imageData];
        } catch (error) {
          console.error(`Failed to fetch optimized image for ${id}:`, error);
          return [id, { imageUrl: getDefaultImageUrl(id) }];
        }
      });
      
      const results = await Promise.all(imagePromises);
      const imageMap: Record<string, OptimizedImageData> = {};
      
      results.forEach(([id, data]) => {
        if (data) {
          imageMap[id as string] = data as OptimizedImageData;
        }
      });
      
      console.log('Optimized images fetched:', Object.keys(imageMap).length, 'images');
      return imageMap;
    },
    enabled: isActive && collectibleIds.length > 0,
    refetchInterval: isActive ? 15 * 60 * 1000 : false, // 15 minutes to match price updates
    refetchIntervalInBackground: false,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: false,
  });

  useEffect(() => {
    if (imageData) {
      setOptimizedImages(imageData);
    }
  }, [imageData]);

  const getOptimizedImage = (collectibleId: string): OptimizedImageData | null => {
    return optimizedImages[collectibleId] || null;
  };

  return {
    optimizedImages,
    isLoading,
    getOptimizedImage
  };
};

const getDefaultImageUrl = (collectibleId: string): string => {
  const labububDefaults: Record<string, string> = {
    '00000000-0000-0000-0000-000000000015': 'https://storage.googleapis.com/vrno-tcg-images/labubu-big-energy-hope.webp',
    '00000000-0000-0000-0000-000000000016': 'https://storage.googleapis.com/vrno-tcg-images/labubu-monster-chestnut-cocoa.webp',
    '00000000-0000-0000-0000-000000000017': 'https://storage.googleapis.com/vrno-tcg-images/labubu-coca-cola-surprise-shake.webp',
    '00000000-0000-0000-0000-000000000018': 'https://storage.googleapis.com/vrno-tcg-images/labubu-have-a-seat-baba.webp',
    '00000000-0000-0000-0000-000000000019': 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-lychee-berry.webp',
    '00000000-0000-0000-0000-000000000020': 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-sea-salt.webp',
    '00000000-0000-0000-0000-000000000014': 'https://storage.googleapis.com/vrno-tcg-images/iono-bellibolt-ex-journey-together-183-159.webp',
  };
  
  return labububDefaults[collectibleId] || 'https://images.pokemontcg.io/base1/1.png';
};