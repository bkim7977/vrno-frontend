import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, adminReferralApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift } from 'lucide-react';

interface RedeemCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RedeemCodeModal({ isOpen, onClose }: RedeemCodeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [referralCodeInput, setReferralCodeInput] = useState('');

  // Apply regular referral code mutation
  const applyReferralMutation = useMutation({
    mutationFn: (code: string) => {
      if (!user?.username) throw new Error('User not found');
      return profileApi.applyReferralCode(user.username, code);
    },
    onMutate: async (code: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['profile', 'balance'] });
      await queryClient.cancelQueries({ queryKey: ['token', 'balance'] });

      // Snapshot the previous values
      const previousBalance = queryClient.getQueryData(['profile', 'balance']);
      const previousTokenBalance = queryClient.getQueryData(['token', 'balance']);

      // Optimistically update the balance by adding 10 tokens
      if (previousBalance) {
        queryClient.setQueryData(['profile', 'balance'], (old: any) => ({
          ...old,
          balance: old.balance + 10
        }));
      }
      if (previousTokenBalance) {
        queryClient.setQueryData(['token', 'balance'], (old: any) => ({
          ...old,
          balance: old.balance + 10
        }));
      }

      // Show success toast immediately
      toast({
        title: "Success!",
        description: "Referral code applied! You earned 10 tokens.",
      });
      setReferralCodeInput('');
      onClose();

      // Return a context object with the previous values
      return { previousBalance, previousTokenBalance };
    },
    onSuccess: (data) => {
      // Refresh all related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['token', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'referrals'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any, variables, context) => {
      // Revert the optimistic updates on error
      if (context?.previousBalance) {
        queryClient.setQueryData(['profile', 'balance'], context.previousBalance);
      }
      if (context?.previousTokenBalance) {
        queryClient.setQueryData(['token', 'balance'], context.previousTokenBalance);
      }

      const errorMessage = error.message?.includes('400') ? 'Invalid referral code or already used' :
                          error.message?.includes('404') ? 'Referral code not found' :
                          'Failed to apply referral code';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Apply admin referral code mutation
  const applyAdminCodeMutation = useMutation({
    mutationFn: (code: string) => {
      if (!user?.username) throw new Error('User not found');
      return adminReferralApi.redeemCode(user.username, code);
    },
    onSuccess: (data: any) => {
      // Refresh all related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['token', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Success!",
        description: `Admin code redeemed! You earned ${data.tokens_awarded} tokens.`,
      });
      setReferralCodeInput('');
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.message?.includes('400') ? 'Invalid admin code or already used' :
                          error.message?.includes('404') ? 'Admin code not found' :
                          'Failed to redeem admin code';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleApplyCode = () => {
    if (!referralCodeInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a code",
        variant: "destructive",
      });
      return;
    }
    
    // Detect if it's a regular referral code (6 digits) or admin code (letters/mixed)
    const isNumericCode = /^\d{6}$/.test(referralCodeInput);
    const isAdminCode = /^[A-Z0-9]{3,12}$/.test(referralCodeInput.toUpperCase());
    
    if (isNumericCode) {
      // Apply regular referral code
      applyReferralMutation.mutate(referralCodeInput);
    } else if (isAdminCode) {
      // Apply admin referral code
      applyAdminCodeMutation.mutate(referralCodeInput.toUpperCase());
    } else {
      toast({
        title: "Error", 
        description: "Invalid code format. Enter a 6-digit referral code or admin code.",
        variant: "destructive",
      });
      return;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="redeem-code-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Referral Codes
          </DialogTitle>
        </DialogHeader>
        <div id="redeem-code-dialog-description" className="sr-only">
          Dialog to enter and redeem referral codes or admin codes for earning bonus tokens
        </div>
        
        <div className="space-y-6">
          {/* Header Information */}
          <div className="text-center space-y-3">
            <div className="text-sm text-muted-foreground">
              Enter a friend's <strong>6-digit referral code</strong> to earn <strong className="text-green-600">10 bonus tokens</strong>, or use an <strong>admin code</strong> for special rewards!
            </div>
            <div className="text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              💡 <strong>Tip:</strong> When others use your referral code, you earn 10 tokens too!
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Referral Code or Admin Code</label>
              <Input
                placeholder="Enter code..."
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase().slice(0, 12))}
                maxLength={12}
                className="text-center text-xl tracking-wide font-mono"
              />
              <div className="text-xs text-muted-foreground text-center">
                6-digit referral codes (123456) or redeem admin codes
              </div>
            </div>
            
            <Button 
              onClick={handleApplyCode}
              disabled={applyReferralMutation.isPending || applyAdminCodeMutation.isPending || referralCodeInput.length < 3}
              className="w-full"
              size="lg"
            >
              {(applyReferralMutation.isPending || applyAdminCodeMutation.isPending) ? 'Applying...' : 'Apply Code'}
            </Button>
          </div>

          {/* Important Note */}
          <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <strong>Important:</strong> Each code can only be used once. You cannot use your own referral code.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}