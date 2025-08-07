import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Coins, Gift, ArrowUpDown, Users, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ReferralModal } from '@/components/ReferralModal';
import { useSharedPrices } from '@/hooks/useSharedPrices';
import { useOptimizedImages } from '@/hooks/useOptimizedImages';
import { useBatchPercentageChanges } from '@/hooks/usePercentageChange';
import { profileApi, tokenApi, collectiblesApi, transactionsApi } from '@/lib/api';

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

  // Fetch user's assets
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['user-assets', user?.username],
    queryFn: async () => {
      if (!user?.username) return [];
      return await tokenApi.getUserAssets(user.username);
    },
    enabled: !!user?.username,
  });

  // Fetch user balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['user-balance', user?.username],
    queryFn: async () => user?.username ? await profileApi.getTokenBalance(user.username) : null,
    enabled: !!user?.username,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', user?.username],
    queryFn: async () => user?.username ? await transactionsApi.getTransactionHistory(user.username) : [],
    enabled: !!user?.username,
    refetchInterval: false,
  });

  // Fetch referral code
  const { data: referralCodeData, isLoading: referralCodeLoading } = useQuery({
    queryKey: ['referral-code', user?.username],
    queryFn: async () => {
      if (!user?.username) return null;
      return await profileApi.getReferrals(user.username);
    },
    enabled: !!user?.username,
  });

  // Fetch batch collectibles data
  const { data: collectibles, isLoading: collectiblesLoading } = useQuery({
    queryKey: ['collectibles'],
    queryFn: async () => {
      console.log('Dashboard: Fetching collectibles batch data...');
      const result = await collectiblesApi.getAll();
      console.log('Dashboard: Collectibles batch data loaded:', result?.length || 0, 'items');
      return result;
    },
  });

  // Use shared percentage change system
  const collectibleIds = (collectibles || []).map(c => c.id);
  const { calculatePercentChange } = useBatchPercentageChanges(collectibleIds, true);

  // Helper functions
  const mapAssetId = (id: string) => {
    if (id === 'genesect-ex-black-bolt-161-086') return '00000000-0000-0000-0000-000000000001';
    if (id === 'ethan-ho-oh-ex-surging-sparks-209-191') return '00000000-0000-0000-0000-000000000002';
    if (id === 'hilda-164-white-flare') return '00000000-0000-0000-0000-000000000003';
    if (id === 'kyurem-ex-black-bolt-165-086') return '00000000-0000-0000-0000-000000000004';
    if (id === 'volcanion-ex-journey-together-182-159') return '00000000-0000-0000-0000-000000000005';
    return id;
  };

  const getCurrentTokenPrice = (collectibleId: string): number => {
    const price = getPriceForCollectible(collectibleId);
    return price ? Math.round(price * 100) : 0;
  };

  useEffect(() => {
    import('../constants/images').then(({ STATIC_TOKEN_BASE64 }) => {
      setStaticTokenImage(STATIC_TOKEN_BASE64);
    });
  }, []);

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
                      return sum + (currentPrice * Number(asset.quantity) * 100);
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
        </div>

        {/* My Assets Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Assets</CardTitle>
            <Badge variant="secondary">{assets?.length || 0} assets</Badge>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-16 w-16 bg-muted rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !assets || assets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No assets found. Start trading to build your portfolio!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {assets.map((asset) => {
                  const mappedId = mapAssetId(asset.id);
                  const currentPrice = getPriceForCollectible(asset.id) || getPriceForCollectible(mappedId) || Number(asset.current_price);
                  const purchasePrice = Number(asset.user_price) || 0;
                  
                  let percentChange = 0;
                  if (purchasePrice > 0) {
                    percentChange = ((currentPrice - purchasePrice) / purchasePrice) * 100;
                  }

                  const priceChange = calculatePercentChange(asset.id);
                  if (priceChange.percent === '0.0%' || priceChange.percent === '+0.0%') {
                    const mappedPriceChange = calculatePercentChange(mappedId);
                    if (mappedPriceChange.percent !== '0.0%' && mappedPriceChange.percent !== '+0.0%') {
                      Object.assign(priceChange, mappedPriceChange);
                    }
                  }

                  return (
                    <Card 
                      key={asset.id} 
                      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onCollectibleSelect?.(asset.id)}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm truncate">{asset.id}</h3>
                          <Badge variant="outline" className="text-xs">
                            {Number(asset.quantity)} shares
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Current Price</span>
                            <span className="text-sm font-medium">
                              {getCurrentTokenPrice(asset.id)} tokens
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-1 border-t">
                            <span className="text-xs text-muted-foreground">Overall Return</span>
                            <span className={`text-xs font-medium ${
                              percentChange > 0 ? 'text-green-600' : 
                              percentChange < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-1 border-t">
                            <span className="text-xs text-muted-foreground">Change in 24h</span>
                            <span className={`text-xs font-medium ${priceChange.colorClass}`}>
                              {priceChange.percent}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReferralModal(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              Referrals
            </Button>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-muted rounded-full"></div>
                      <div className="space-y-1">
                        <div className="h-4 bg-muted rounded w-24"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-muted rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction: any) => {
                  const tokenAmount = Math.abs(Number(transaction.token_amount || transaction.amount || 0));
                  return (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          {transaction.transaction_type === 'buy' && <ArrowUpDown className="w-4 h-4 text-blue-500" />}
                          {transaction.transaction_type === 'sell' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {(transaction.transaction_type === 'reward' || transaction.transaction_type === 'topup' || transaction.transaction_type === 'Code_redeem') && (
                            <Gift className="w-4 h-4 text-purple-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {transaction.transaction_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.asset_id || 'Token transaction'}
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
    </div>
  );
}