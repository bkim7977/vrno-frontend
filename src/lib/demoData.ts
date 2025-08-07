import { Collectible, Transaction, Referral, Redemption } from '@shared/schema';

// Convert USD prices to token values (price × 100 for token conversion)
const convertUSDToTokens = (usdPrice: number): string => {
  return Math.round(usdPrice * 100).toString();
};

export const demoCollectibles: Collectible[] = [
  {
    id: 'demo-collectible-1',
    name: 'Legendary Dragon Card',
    type: 'trading_card',
    rarity: 'legendary',
    currentPrice: convertUSDToTokens(299.99), // 3000 tokens
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    description: 'A powerful dragon card with mystical abilities',
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 'demo-collectible-2',
    name: 'Rare Phoenix Artwork',
    type: 'digital_art',
    rarity: 'epic',
    currentPrice: convertUSDToTokens(189.50), // 1895 tokens
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
    description: 'Digital artwork featuring a majestic phoenix',
    createdAt: new Date('2025-01-14'),
  },
  {
    id: 'demo-collectible-3',
    name: 'Crystal Shard',
    type: 'collectible',
    rarity: 'rare',
    currentPrice: convertUSDToTokens(75.00), // 750 tokens
    imageUrl: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=400&h=300&fit=crop',
    description: 'A mystical crystal with healing properties',
    createdAt: new Date('2025-01-13'),
  },
  {
    id: 'demo-collectible-4',
    name: 'Common Warrior Card',
    type: 'trading_card',
    rarity: 'common',
    currentPrice: convertUSDToTokens(15.99), // 160 tokens
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    description: 'A basic warrior card for beginners',
    createdAt: new Date('2025-01-12'),
  },
  {
    id: 'demo-collectible-5',
    name: 'Epic Space Battle',
    type: 'digital_art',
    rarity: 'epic',
    currentPrice: convertUSDToTokens(225.00), // 2250 tokens
    imageUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop',
    description: 'Digital art depicting an epic space battle',
    createdAt: new Date('2025-01-11'),
  },
  {
    id: 'demo-collectible-6',
    name: 'Magic Potion',
    type: 'collectible',
    rarity: 'rare',
    currentPrice: convertUSDToTokens(45.50), // 455 tokens
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    description: 'A magical potion with unknown effects',
    createdAt: new Date('2025-01-10'),
  }
];

export const demoTransactions: Transaction[] = [
  {
    id: 'demo-transaction-1',
    userId: 'demo-user-123',
    collectibleId: 'demo-collectible-1',
    type: 'buy',
    amount: '299.99',
    status: 'completed',
    createdAt: new Date('2025-01-16'),
  },
  {
    id: 'demo-transaction-2',
    userId: 'demo-user-123',
    collectibleId: 'demo-collectible-3',
    type: 'sell',
    amount: '75.00',
    status: 'completed',
    createdAt: new Date('2025-01-15'),
  },

];

export const demoReferrals: Referral[] = [
  {
    id: 'demo-referral-1',
    referrerId: 'demo-user-123',
    referredId: 'demo-referred-1',
    createdAt: new Date('2025-01-10'),
  },
  {
    id: 'demo-referral-2',
    referrerId: 'demo-user-123',
    referredId: 'demo-referred-2',
    createdAt: new Date('2025-01-08'),
  }
];



export const demoUserBalance = {
  user_id: 'demo-user-123',
  balance: 1250.75,
  last_updated: new Date().toISOString(),
};