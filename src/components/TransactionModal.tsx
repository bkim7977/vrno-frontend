import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { transactionsApi, tokenApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collectible } from '@shared/schema';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectible: Collectible | null;
  defaultType?: 'buy' | 'sell';
}

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  collectible, 
  defaultType = 'buy' 
}: TransactionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>(defaultType);
  const [quantityInput, setQuantityInput] = useState('1.00');

  // Reset transaction type when modal opens with a different default type
  useEffect(() => {
    if (isOpen) {
      setTransactionType(defaultType);
      setQuantityInput('1.00');
    }
  }, [isOpen, defaultType]);

  // Helper to get valid numeric quantity for calculations
  const getValidQuantity = () => {
    const parsed = parseFloat(quantityInput);
    if (isNaN(parsed) || parsed <= 0) return 0.01;
    
    // For sell transactions, cap at owned quantity
    if (transactionType === 'sell') {
      const ownedQuantity = getUserOwnedQuantity();
      if (ownedQuantity > 0 && parsed > ownedQuantity) {
        return ownedQuantity;
      }
    }
    
    return Math.round(parsed * 100) / 100;
  };

  // Token-based transaction mutations
  const buyMutation = useMutation({
    mutationFn: (data: any) => tokenApi.buyCollectibles(data),
    onMutate: async (variables) => {
      // ULTRA-AGGRESSIVE cache clearing for instant appearance
      queryClient.removeQueries({ queryKey: ['user-assets'] });
      queryClient.removeQueries({ queryKey: ['user-balance'] });
      
      // Optimistic update - immediately dispatch event for instant UI feedback
      window.dispatchEvent(new CustomEvent('transactionComplete', {
        detail: { 
          type: 'buy', 
          collectibleId: collectible?.id,
          username: user?.username,
          optimistic: true
        }
      }));
    },
    onSuccess: () => {
      // AGGRESSIVE cache clearing for immediate item appearance
      queryClient.removeQueries({ queryKey: ['user', 'assets'] });
      queryClient.removeQueries({ queryKey: ['token', 'balance'] });
      queryClient.removeQueries({ queryKey: ['profile'] });
      queryClient.removeQueries({ queryKey: ['supabase', 'user-assets'] });
      queryClient.removeQueries({ queryKey: ['supabase', 'buy-transactions'] });
      queryClient.removeQueries({ queryKey: ['supabase', 'transaction-records'] });
      
      // Force immediate refetch without waiting
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['user', 'assets', user?.username] });
        queryClient.refetchQueries({ queryKey: ['token', 'balance', user?.username] });
        queryClient.refetchQueries({ queryKey: ['profile', 'balance'] });
      }, 10); // Minimal delay to ensure cache is cleared first
      
      // Emit custom event to notify dashboard for immediate refresh
      window.dispatchEvent(new CustomEvent('transactionComplete', {
        detail: { 
          type: 'buy', 
          collectibleId: collectible?.id,
          username: user?.username 
        }
      }));
      
      toast({
        title: "Success",
        description: `Successfully purchased ${getValidQuantity()} ${collectible?.name}`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Purchase failed",
        variant: "destructive",
      });
    },
  });

  const sellMutation = useMutation({
    mutationFn: (data: any) => tokenApi.sellCollectibles(data),
    onMutate: async (variables) => {
      // ULTRA-AGGRESSIVE cache clearing for instant removal
      queryClient.removeQueries({ queryKey: ['user-assets'] });
      queryClient.removeQueries({ queryKey: ['user-balance'] });
      
      // Optimistic update - immediately dispatch event for instant UI feedback
      window.dispatchEvent(new CustomEvent('transactionComplete', {
        detail: { 
          type: 'sell', 
          collectibleId: collectible?.id,
          username: user?.username,
          optimistic: true
        }
      }));
    },
    onSuccess: () => {
      // IMMEDIATE cache clearing for instant item disappearance
      queryClient.clear(); // Nuclear option - clear entire cache
      
      // Force immediate refetch of all critical queries
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['user', 'assets', user?.username] });
        queryClient.refetchQueries({ queryKey: ['token', 'balance', user?.username] });
        queryClient.refetchQueries({ queryKey: ['profile', 'balance'] });
      }, 10); // Minimal delay to ensure cache is cleared first
      
      // Emit custom event to notify dashboard for immediate refresh
      window.dispatchEvent(new CustomEvent('transactionComplete', {
        detail: { 
          type: 'sell', 
          collectibleId: collectible?.id,
          username: user?.username 
        }
      }));
      
      toast({
        title: "Success",
        description: `Successfully sold ${getValidQuantity()} ${collectible?.name}`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Sale failed",
        variant: "destructive",
      });
    },
  });



  const handleSubmit = async () => {
    if (!collectible || !user?.username) return;

    // INSTANT Dashboard refresh - start refreshing even before API call
    queryClient.removeQueries({ queryKey: ['user-assets'] });
    queryClient.removeQueries({ queryKey: ['user-balance'] });
    
    window.dispatchEvent(new CustomEvent('transactionComplete', {
      detail: { 
        type: transactionType, 
        collectibleId: collectible?.id,
        username: user?.username,
        preemptive: true
      }
    }));

    if (transactionType === 'buy') {
      const buyData = {
        username: user.username,
        collectible_ids: [collectible.id],
        quantities: { [collectible.id]: getValidQuantity() },
      };
      buyMutation.mutate(buyData);
    } else if (transactionType === 'sell') {
      const sellData = {
        username: user.username,
        collectible_ids: [collectible.id],
        quantities: { [collectible.id]: getValidQuantity() },
      };

      sellMutation.mutate(sellData);
    }
  };

  // Get token balance from query
  const { data: tokenBalance } = useQuery({
    queryKey: ['token', 'balance', user?.username],
    queryFn: () => user?.username ? tokenApi.getTokenBalance(user.username) : null,
    enabled: !!user?.username,
  });

  // Get user assets to check owned quantities for sell validation
  const { data: userAssets } = useQuery({
    queryKey: ['user', 'assets', user?.username],
    queryFn: () => user?.username ? tokenApi.getUserAssets(user.username) : null,
    enabled: !!user?.username,
  });

  // Get the user's current quantity of this collectible
  const getUserOwnedQuantity = () => {
    if (!collectible || !userAssets || !Array.isArray(userAssets)) return 0;
    
    console.log('TransactionModal - Looking for collectible ID:', collectible.id);
    console.log('TransactionModal - User assets:', userAssets.map(a => ({ id: a.id, quantity: a.quantity })));
    
    // Try exact match first
    const asset = userAssets.find((asset: any) => asset.id === collectible.id);
    if (asset) {
      console.log('TransactionModal - Found exact match:', asset.id, 'quantity:', asset.quantity);
      return Number(asset.quantity) || 0;
    }
    
    // Try with ID mapping - if collectible ID is UUID, check for string ID
    const mapUuidToString = (id: string) => {
      const uuidToStringMap: Record<string, string> = {
        '00000000-0000-0000-0000-000000000001': 'genesect-ex-black-bolt-161-086',
        '00000000-0000-0000-0000-000000000002': 'ethan-ho-oh-ex-209-destined-rivals',
        '00000000-0000-0000-0000-000000000003': 'hilda-164-white-flare',
        '00000000-0000-0000-0000-000000000004': 'kyurem-ex-black-bolt-165-086',
        '00000000-0000-0000-0000-000000000005': 'volcanion-ex-journey-together-182-159',
        '00000000-0000-0000-0000-000000000006': 'salamence-ex-surging-sparks-054-191',
        '00000000-0000-0000-0000-000000000007': 'iron-hands-ex-prismatic-evolutions-154-131',
        '00000000-0000-0000-0000-000000000008': 'pikachu-ex-surging-sparks-094-191',
        '00000000-0000-0000-0000-000000000009': 'iron-crown-ex-stellar-crown-106-142',
        '00000000-0000-0000-0000-000000000010': 'hydreigon-ex-white-flare-169-086',
        '00000000-0000-0000-0000-000000000011': 'ns-plan-white-flare-178-086',
        '00000000-0000-0000-0000-000000000012': 'oshawott-white-flare-105-086',
        '00000000-0000-0000-0000-000000000014': 'iono-bellibolt-ex-journey-together-183-159',
        '00000000-0000-0000-0000-000000000015': 'labubu-big-energy-hope',
        '00000000-0000-0000-0000-000000000016': 'labubu-monster-chestnut-cocoa',
        '00000000-0000-0000-0000-000000000017': 'labubu-coca-cola-surprise-shake',
        '00000000-0000-0000-0000-000000000018': 'labubu-have-a-seat-baba',
        '00000000-0000-0000-0000-000000000019': 'labubu-macaron-lychee',
        '00000000-0000-0000-0000-000000000020': 'labubu-macaron-sea-salt'
      };
      return uuidToStringMap[id] || id;
    };
    
    const mapStringToUuid = (id: string) => {
      const stringToUuidMap: Record<string, string> = {
        'genesect-ex-black-bolt-161-086': '00000000-0000-0000-0000-000000000001',
        'ethan-ho-oh-ex-209-destined-rivals': '00000000-0000-0000-0000-000000000002',
        'hilda-164-white-flare': '00000000-0000-0000-0000-000000000003',
        'kyurem-ex-black-bolt-165-086': '00000000-0000-0000-0000-000000000004',
        'volcanion-ex-journey-together-182-159': '00000000-0000-0000-0000-000000000005',
        'salamence-ex-surging-sparks-054-191': '00000000-0000-0000-0000-000000000006',
        'iron-hands-ex-prismatic-evolutions-154-131': '00000000-0000-0000-0000-000000000007',
        'pikachu-ex-surging-sparks-094-191': '00000000-0000-0000-0000-000000000008',
        'iron-crown-ex-stellar-crown-106-142': '00000000-0000-0000-0000-000000000009',
        'hydreigon-ex-white-flare-169-086': '00000000-0000-0000-0000-000000000010',
        'ns-plan-white-flare-178-086': '00000000-0000-0000-0000-000000000011',
        'oshawott-white-flare-105-086': '00000000-0000-0000-0000-000000000012',
        'iono-bellibolt-ex-journey-together-183-159': '00000000-0000-0000-0000-000000000014',
        'labubu-big-energy-hope': '00000000-0000-0000-0000-000000000015',
        'labubu-monster-chestnut-cocoa': '00000000-0000-0000-0000-000000000016',
        'labubu-coca-cola-surprise-shake': '00000000-0000-0000-0000-000000000017',
        'labubu-have-a-seat-baba': '00000000-0000-0000-0000-000000000018',
        'labubu-macaron-lychee': '00000000-0000-0000-0000-000000000019',
        'labubu-macaron-sea-salt': '00000000-0000-0000-0000-000000000020'
      };
      return stringToUuidMap[id] || id;
    };
    
    // Try mapped versions
    const alternativeStringId = mapUuidToString(collectible.id);
    const alternativeUuidId = mapStringToUuid(collectible.id);
    
    const assetByString = userAssets.find((asset: any) => asset.id === alternativeStringId);
    const assetByUuid = userAssets.find((asset: any) => asset.id === alternativeUuidId);
    
    if (assetByString) {
      console.log('TransactionModal - Found by string ID mapping:', assetByString.id, 'quantity:', assetByString.quantity);
      return Number(assetByString.quantity) || 0;
    }
    
    if (assetByUuid) {
      console.log('TransactionModal - Found by UUID ID mapping:', assetByUuid.id, 'quantity:', assetByUuid.quantity);
      return Number(assetByUuid.quantity) || 0;
    }
    
    console.log('TransactionModal - No match found for collectible ID:', collectible.id);
    return 0;
  };

  const calculateNewBalance = () => {
    if (!collectible) return Number((tokenBalance as any)?.balance || 0);
    
    const currentBalance = Number((tokenBalance as any)?.balance || 0);
    let amount = Number(collectible.currentPrice) * getValidQuantity(); // Already in tokens
    

    
    switch (transactionType) {
      case 'buy':
        return currentBalance - amount;
      case 'sell':
        return currentBalance + amount;
      default:
        return currentBalance;
    }
  };

  const getTransactionTitle = () => {
    switch (transactionType) {
      case 'buy':
        return 'Purchase Collectible';
      case 'sell':
        return 'Sell Collectible';
      default:
        return 'Transaction';
    }
  };

  const canAfford = () => {
    if (!collectible) return false;
    
    if (transactionType === 'sell') {
      // For sell, check if user owns enough of this asset
      const ownedQuantity = getUserOwnedQuantity();
      return ownedQuantity >= getValidQuantity();
    }
    
    const currentBalance = Number((tokenBalance as any)?.balance || 0);
    let totalCost = Number(collectible.currentPrice) * getValidQuantity(); // Already in tokens
    

    
    return currentBalance >= totalCost;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTransactionTitle()}</DialogTitle>
        </DialogHeader>
        
        {collectible && (
          <div className="space-y-4">
            <div>
              <Label>Item</Label>
              <Input 
                value={collectible.name} 
                readOnly 
                className="bg-muted"
              />
            </div>
            
            <div>
              <Label>Price per item</Label>
              <Input 
                value={`${Number(collectible.currentPrice).toLocaleString()} tokens`} 
                readOnly 
                className="bg-muted"
              />
            </div>
            
            <div>
              <Label>
                Quantity (up to 2 decimal places)
                {transactionType === 'sell' && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (You own: {getUserOwnedQuantity()})
                  </span>
                )}
              </Label>
              <div className="flex space-x-2">
                <Input 
                  type="text"
                  value={quantityInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty input, numbers, and one decimal point
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      // Limit to 4 characters total (including decimal point)
                      if (value.length <= 4) {
                        setQuantityInput(value);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Validate on blur - if empty or invalid, set to minimum
                    const parsed = parseFloat(e.target.value);
                    if (isNaN(parsed) || parsed <= 0) {
                      setQuantityInput('0.01');
                    } else {
                      let validQuantity = Math.round(parsed * 100) / 100;
                      
                      // For sell transactions, cap at owned quantity
                      if (transactionType === 'sell') {
                        const ownedQuantity = getUserOwnedQuantity();
                        if (ownedQuantity > 0 && validQuantity > ownedQuantity) {
                          validQuantity = ownedQuantity;
                          toast({
                            title: "Quantity Adjusted",
                            description: `You can only sell up to ${ownedQuantity} of this asset`,
                            variant: "default",
                          });
                        }
                      }
                      
                      setQuantityInput(validQuantity.toFixed(2));
                    }
                  }}
                  className="flex-1"
                  placeholder="1.00"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!collectible) return;
                    
                    let maxQuantity = 0;
                    
                    if (transactionType === 'buy') {
                      // Calculate max based on token balance
                      const currentBalance = Number((tokenBalance as any)?.balance || 0);
                      const pricePerItem = Number(collectible.currentPrice);
                      if (pricePerItem > 0) {
                        maxQuantity = Math.floor((currentBalance / pricePerItem) * 100) / 100;
                      }
                    } else if (transactionType === 'sell') {
                      // For sell, max is the owned quantity
                      maxQuantity = getUserOwnedQuantity();
                    }
                    
                    // Ensure minimum of 0.01 and maximum precision of 2 decimal places
                    maxQuantity = Math.max(0.01, Math.round(maxQuantity * 100) / 100);
                    setQuantityInput(maxQuantity.toFixed(2));
                  }}
                  className="px-3"
                >
                  Max
                </Button>
              </div>
            </div>

            <div>
              <Label>Total Amount</Label>
              <Input 
                value={`${(Number(collectible.currentPrice) * getValidQuantity()).toLocaleString()} tokens`} 
                readOnly 
                className="bg-muted font-bold"
              />
            </div>
            
            <div>
              <Label>Transaction Type</Label>
              <Select 
                value={transactionType} 
                onValueChange={(value: 'buy' | 'sell') => setTransactionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Token Balance:</span>
                <span className="font-medium">
                  {Number((tokenBalance as any)?.balance || 0).toLocaleString()} tokens
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">
                  {(Number(collectible?.currentPrice || 0) * getValidQuantity()).toLocaleString()} tokens
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-muted-foreground">After Transaction:</span>
                <span className={`font-medium ${
                  calculateNewBalance() < 0 ? 'text-destructive' : 'text-foreground'
                }`}>
                  {calculateNewBalance().toLocaleString()} tokens
                </span>
              </div>
            </div>
            
            {!canAfford() && transactionType === 'buy' && (
              <div className="text-sm text-destructive">
                Insufficient balance for this transaction
              </div>
            )}
            
            {!canAfford() && transactionType === 'sell' && (
              <div className="text-sm text-destructive">
                You don't own enough of this asset (You own: {getUserOwnedQuantity()})
              </div>
            )}
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={buyMutation.isPending || sellMutation.isPending || !canAfford()}
                className="flex-1"
              >
                {(buyMutation.isPending || sellMutation.isPending)
                  ? 'Processing...' 
                  : `Confirm ${transactionType === 'buy' ? 'Purchase' : 'Sale'}`
                }
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
