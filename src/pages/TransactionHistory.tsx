import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SupabaseTransaction {
  id: string;
  user_id: string;
  collectible_id: string;
  transaction_type: string;
  amount: string; // This is quantity
  description: string | null;
  timestamp: string; // transactions table uses 'timestamp' not 'created_at'
  price: number | null; // transactions table has price column
  collectibles?: {
    name: string;
    current_price: number;
  };
}

export default function TransactionHistory() {
  const [periodFilter, setPeriodFilter] = useState('all');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const { user } = useAuth();

  // Use our API endpoint to get transactions (it handles both table formats)
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['profile', 'transactions', user?.username],
    queryFn: async () => {
      if (!user?.username) return [];
      
      console.log('Transaction History - Fetching transactions for user:', user.username);
      // SECURITY FIX: Remove API key from client request - transactions endpoint already has server-side API key protection
      const response = await fetch(`/api/profile/${user.username}/transactions`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transaction History - API Error:', response.status, errorText);
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Transaction History - Loaded', data.length, 'transactions for user:', user.username);
      console.log('Transaction History - First transaction sample:', data[0]);
      return data;
    },
    enabled: !!user?.username,
    staleTime: 4 * 60 * 60 * 1000, // Cache for 4 hours - transaction history is static
    refetchOnMount: false, // Only refetch on explicit invalidation
    refetchOnWindowFocus: false, // Disabled to reduce compute usage
    refetchInterval: false, // Disabled - transaction history doesn't change frequently
    retry: 2, // Retry failed requests
  });

  // Get display name for collectibles - defined before filter functions that use it
  const getCollectibleDisplayName = (transaction: SupabaseTransaction) => {
    // For reward and topup transactions, use the description as the display name
    if (transaction.transaction_type === 'reward' || transaction.transaction_type === 'topup') {
      return transaction.description || (transaction.transaction_type === 'topup' ? 'Token Purchase' : 'Reward');
    }
    
    // For referral code transactions (both new and old format)
    if (transaction.transaction_type === 'Code_redeem' ||
        (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus'))) {
      return 'referral code';
    }
    
    // The server API returns asset_id field from asset_uuid
    let assetId = (transaction as any).asset_id || transaction.collectible_id;
    
    // If still no assetId, try to extract from description
    if (!assetId && transaction.description) {
      const match = transaction.description.match(/(?:Buy|Sell|Redeem)\s+[\d.]+\s+(.+)$/);
      if (match) {
        assetId = match[1];
      }
    }
    
    // Map all current collectible UUIDs and string IDs to proper names
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
    
    return collectibleNames[assetId] || transaction.collectibles?.name || 'Unknown Asset';
  };

  const filterTransactionsByPeriod = (transactions: SupabaseTransaction[]) => {
    if (periodFilter === 'all') return transactions;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (periodFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setDate(now.getDate() - 30);
        break;
      default:
        return transactions;
    }
    
    return transactions.filter(t => new Date(t.timestamp) >= filterDate);
  };

  const filterTransactionsByAssetType = (transactions: SupabaseTransaction[]) => {
    if (assetTypeFilter === 'all') return transactions;
    
    return transactions.filter(transaction => {
      const assetName = getCollectibleDisplayName(transaction).toLowerCase();
      
      if (assetTypeFilter === 'pokemon') {
        // Pokemon cards include all trading cards (not Labubu)
        return !assetName.includes('labubu');
      } else if (assetTypeFilter === 'labubu') {
        // Labubu collectibles
        return assetName.includes('labubu');
      }
      
      return true;
    });
  };

  const filteredTransactions = transactions ? 
    filterTransactionsByAssetType(filterTransactionsByPeriod(transactions)) : [];
  
  console.log('Transaction History - Raw transactions:', transactions?.length || 0);
  console.log('Transaction History - Filtered transactions:', filteredTransactions.length);
  console.log('Transaction History - Period filter:', periodFilter, 'Asset filter:', assetTypeFilter);

  // Calculate token amounts for transactions using actual transaction price
  const getTokenAmount = (transaction: SupabaseTransaction) => {
    const quantity = Number(transaction.amount);
    
    // For reward, topup, Code_redeem, and referral code transactions, the amount field already contains the token amount
    if (transaction.transaction_type === 'reward' || transaction.transaction_type === 'topup' || 
        transaction.transaction_type === 'Code_redeem' ||
        (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus'))) {
      return quantity;
    }
    
    // Use actual transaction price if available, otherwise fall back to current price
    const price = (transaction as any).price || transaction.collectibles?.current_price || 0;
    let tokenAmount = Math.round(price * 100) * quantity; // Convert USD to tokens (price × 100)
    
    // Apply 10x multiplier for redemption transactions
    if (transaction.transaction_type === 'redemption') {
      tokenAmount = tokenAmount * 10;
    }
    
    return tokenAmount;
  };

  const calculateSummary = () => {
    if (!filteredTransactions.length) {
      return { totalSpent: 0, totalEarned: 0, netResult: 0 };
    }

    // Total Spent: absolute value sum of all redemptions and buys
    const totalSpent = filteredTransactions
      .filter(t => t.transaction_type === 'buy' || t.transaction_type === 'redemption')
      .reduce((sum, t) => sum + Math.abs(getTokenAmount(t)), 0);

    // Total Earned: absolute value sum of all sells, rewards, topups, and referral code bonuses
    const totalEarned = filteredTransactions
      .filter(t => t.transaction_type === 'sell' || t.transaction_type === 'reward' || t.transaction_type === 'topup' || 
                   t.transaction_type === 'Code_redeem' ||
                   (t.transaction_type === 'token_purchase' && (t.description === 'Referral Code Bonus' || t.description === 'Referral Code Used Bonus')))
      .reduce((sum, t) => sum + Math.abs(getTokenAmount(t)), 0);

    return {
      totalSpent,
      totalEarned,
      netResult: totalEarned - totalSpent,
    };
  };

  const summary = calculateSummary();

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'sell':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'redemption':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'reward':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'topup':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Code_redeem':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatTransactionAmount = (transaction: SupabaseTransaction) => {
    const tokenAmount = getTokenAmount(transaction);
    
    switch (transaction.transaction_type) {
      case 'sell':
        return `+${tokenAmount.toLocaleString()} tokens`;
      case 'buy':
      case 'redemption':
        return `-${tokenAmount.toLocaleString()} tokens`;
      case 'reward':
      case 'topup':
      case 'Code_redeem':
        return `+${tokenAmount.toLocaleString()} tokens`;
      default:
        return `${tokenAmount.toLocaleString()} tokens`;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pokemon">Pokemon</SelectItem>
              <SelectItem value="labubu">Labubu</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="today">Today</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transaction Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-muted-foreground">Total Spent</div>
                <div className="text-2xl font-bold">{summary.totalSpent.toLocaleString()} tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-muted-foreground">Total Earned</div>
                <div className="text-2xl font-bold">{summary.totalEarned.toLocaleString()} tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-muted-foreground">Net Profit/Loss</div>
                <div className={`text-2xl font-bold ${
                  summary.netResult === 0 
                    ? 'text-muted-foreground' 
                    : summary.netResult > 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-red-600 dark:text-red-400'
                }`}>
                  {summary.netResult === 0 ? '' : summary.netResult > 0 ? '+' : ''}{summary.netResult.toLocaleString()} tokens
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction: SupabaseTransaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="py-4 px-4 text-sm">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getTransactionTypeColor(transaction.transaction_type === 'token_purchase' && 
                           (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus')
                            ? 'Code_redeem' 
                            : transaction.transaction_type)}>
                          {transaction.transaction_type === 'token_purchase' && 
                           (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus')
                            ? 'Code_redeem' 
                            : transaction.transaction_type}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {getCollectibleDisplayName(transaction)}
                      </td>
                      <td className={`py-4 px-4 text-sm font-medium ${
                        transaction.transaction_type === 'sell' || 
                        transaction.transaction_type === 'Code_redeem' ||
                        (transaction.transaction_type === 'token_purchase' && (transaction.description === 'Referral Code Bonus' || transaction.description === 'Referral Code Used Bonus'))
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-foreground'
                      }`}>
                        {formatTransactionAmount(transaction)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getStatusColor('completed')}>
                          completed
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
