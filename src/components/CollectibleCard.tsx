import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collectible } from '@shared/schema';

interface CollectibleCardProps {
  collectible: Collectible;
  currentPrice?: number;
  onCardClick?: () => void;
  onBuyClick?: () => void;
  showDetailedView?: boolean;
  ebayListingData?: {
    ebay_url: string;
    total_price: string;
    seller_username: string;
  } | null;
  priceChange?: {
    percent: string;
    colorClass: string;
  } | null;
}

export default function CollectibleCard({ 
  collectible, 
  currentPrice,
  onCardClick, 
  onBuyClick,
  showDetailedView = false,
  ebayListingData = null,
  priceChange = null
}: CollectibleCardProps) {
  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'rare':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'epic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'legendary':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group" onClick={onCardClick}>
      <div className="aspect-w-3 aspect-h-4 overflow-hidden">
        {collectible.imageUrl ? (
          <img 
            src={collectible.imageUrl} 
            alt={collectible.name}
            className={`w-full h-[34rem] object-cover group-hover:scale-105 transition-transform duration-200 filter contrast-110 saturate-110 ${collectible.name?.includes('Hydreigon') ? 'object-center scale-115 brightness-105' : ''}`}
          />
        ) : (
          <div className="w-full h-[34rem] bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">No Image</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="mb-2">
          <h3 className="text-lg font-semibold truncate">{collectible.name || 'Unknown Item'}</h3>
        </div>
        {ebayListingData && (
          <div className="mb-2 p-2 bg-muted/50 rounded-sm">
            <a 
              href={ebayListingData.ebay_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline block"
              onClick={(e) => e.stopPropagation()}
            >
              <strong>eBay Source:</strong> ${ebayListingData.total_price} by {ebayListingData.seller_username}
            </a>
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-3 capitalize">
          {collectible.type?.replace('_', ' ') || 'Unknown Type'}
        </p>
        {collectible.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {collectible.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="text-xl font-bold">
              {currentPrice ? `${currentPrice.toLocaleString()} tokens` : 'Price Loading...'}
            </div>
            {priceChange && (
              <div className={`text-sm ${priceChange.colorClass}`}>
                {priceChange.percent}
              </div>
            )}
          </div>
          {showDetailedView ? (
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onCardClick?.();
              }}
              size="sm"
              variant="outline"
            >
              View Chart
            </Button>
          ) : (
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onBuyClick?.();
              }}
              size="sm"
            >
              Buy Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
