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
import { useSharedPrices } from '@/hooks/useSharedPrices';
import { useBatchPercentageChanges } from '@/hooks/usePercentageChange';
import { useOptimizedImages } from '@/hooks/useOptimizedImages';

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

  const { data: collectibles, isLoading, error } = useQuery({
    queryKey: ['collectibles'],
    queryFn: async () => {
      console.log('Marketplace: Fetching collectibles...');
      try {
        const result = await collectiblesApi.getAll();
        console.log('Marketplace: Collectibles loaded:', result?.length || 0, 'items');
        return result;
      } catch (error) {
        console.error('Marketplace: Error fetching collectibles:', error);
        throw error;
      }
    },
  });

  // Use shared percentage change system for consistency with CollectibleDetails
  const collectibleIds = (collectibles || []).map(c => c.id);
  const { calculatePercentChange } = useBatchPercentageChanges(collectibleIds, true);

  // Create price map for optimized images
  const currentPrices = collectibleIds.reduce((acc, id) => {
    acc[id] = getPriceForCollectible(id) || 0;
    return acc;
  }, {} as Record<string, number>);

  // Use optimized images hook to sync with CollectibleDetails
  const { getOptimizedImage, isLoading: imagesLoading } = useOptimizedImages(collectibleIds, currentPrices, true);

  // Get current price in tokens for a collectible
  const getCurrentTokenPrice = (collectibleId: string): number => {
    const price = getPriceForCollectible(collectibleId);
    return price ? Math.round(price * 100) : 0; // Convert USD to tokens (price × 100)
  };

  // Filter and sort collectibles
  const filteredCollectibles = (collectibles || []).filter((collectible: Collectible) => {
    // Text search filter
    const matchesSearch = collectible.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (collectible.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Asset type filter
    const matchesAssetType = (() => {
      if (assetSort === 'none') return true;
      
      const collectibleType = (collectible.type || '').toLowerCase();
      const collectibleName = collectible.name.toLowerCase();
      
      if (assetSort === 'pokemon') {
        return collectibleType.includes('pokemon') || 
               collectibleType.includes('card') ||
               // Check if it's a Pokemon name (not Labubu)
               (!collectibleName.includes('labubu'));
      } else if (assetSort === 'labubu') {
        return collectibleName.includes('labubu') || 
               collectibleType.includes('labubu');
      }
      
      return true;
    })();
    
    return matchesSearch && matchesAssetType;
  });

  const sortedCollectibles = [...filteredCollectibles].sort((a, b) => {
    if (priceSort === 'low-high') {
      const priceA = getCurrentTokenPrice(a.id);
      const priceB = getCurrentTokenPrice(b.id);
      return priceA - priceB;
    } else if (priceSort === 'high-low') {
      const priceA = getCurrentTokenPrice(a.id);
      const priceB = getCurrentTokenPrice(b.id);
      return priceB - priceA;
    }
    return 0;
  });

  const handleBuyClick = (collectible: Collectible) => {
    setSelectedCollectible(collectible);
    setIsTransactionModalOpen(true);
  };

  const handleCardClick = (collectible: Collectible) => {
    if (onCollectibleSelect) {
      onCollectibleSelect(collectible.id);
    }
  };

  const listingsLoading = pricesLoading || isLoading;

  if (listingsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search collectibles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-collectibles"
          />
        </div>
        
        <Select value={priceSort} onValueChange={setPriceSort} data-testid="select-price-sort">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Price</SelectItem>
            <SelectItem value="low-high">Low to High</SelectItem>
            <SelectItem value="high-low">High to Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assetSort} onValueChange={setAssetSort} data-testid="select-asset-sort">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All Types</SelectItem>
            <SelectItem value="pokemon">Pokémon</SelectItem>
            <SelectItem value="labubu">Labubu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {sortedCollectibles.length} collectible{sortedCollectibles.length !== 1 ? 's' : ''}
      </div>

      {/* Collectibles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCollectibles.map((collectible) => {
          const currentPrice = getCurrentTokenPrice(collectible.id);
          const priceChange = calculatePercentChange(collectible.id);
          
          // Get optimized image data (synced with CollectibleDetails)
          const optimizedImage = getOptimizedImage(collectible.id);
          const updatedCollectible = {
            ...collectible,
            imageUrl: optimizedImage?.imageUrl || collectible.imageUrl
          };
          
          return (
            <CollectibleCard
              key={collectible.id}
              collectible={updatedCollectible}
              currentPrice={currentPrice}
              priceChange={priceChange}
              onBuyClick={() => handleBuyClick(collectible)}
              onCardClick={() => handleCardClick(collectible)}
              ebayListingData={optimizedImage ? {
                ebay_url: optimizedImage.ebayUrl || '',
                total_price: optimizedImage.ebayPrice || '',
                seller_username: optimizedImage.ebaySeller || ''
              } : null}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {sortedCollectibles.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No collectibles found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        collectible={selectedCollectible}
      />
    </div>
  );
}