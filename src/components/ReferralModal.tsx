import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Gift, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load existing referral code when modal opens
  useEffect(() => {
    if (isOpen && user?.username && !referralCode) {
      fetchReferralCode();
    }
  }, [isOpen, user?.username]);

  const fetchReferralCode = async () => {
    if (!user?.username) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/referrals/${user.username}`, {
        headers: {
          'vrno-api-key': import.meta.env.VITE_VRNO_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasCode) {
          setReferralCode(data.code);
        }
      }
    } catch (error) {
      console.error('Error fetching referral code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReferralCode = async () => {
    if (!user?.username) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: {
          'vrno-api-key': import.meta.env.VITE_VRNO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user.username }),
      });

      if (response.ok) {
        const data = await response.json();
        setReferralCode(data.code);
        
        if (data.message === 'Existing referral code returned') {
          toast({
            title: "Referral Code Retrieved",
            description: "Your permanent referral code has been retrieved. This code cannot be changed.",
          });
        } else {
          toast({
            title: "Permanent Referral Code Created!",
            description: "Your unique referral code is now permanent. Share it with friends to earn 10 tokens per use (up to 20 uses).",
          });
        }
        
        // Invalidate the referral code cache to update the dashboard
        queryClient.invalidateQueries({ queryKey: ['referral-code', user.username] });
      } else {
        throw new Error('Failed to generate referral code');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate referral code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy referral code.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Refer a Friend
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Earn Rewards</h3>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Referring friends will award you 10 bonus tokens up to a cap of 200 tokens total!
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          ) : referralCode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Permanent Referral Code</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border rounded-lg font-mono text-lg text-center tracking-wider">
                    {referralCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-11 w-11"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                This is your permanent referral code that stays with you forever. Share it with friends to earn 10 tokens each time someone uses it (up to 20 uses). This code cannot be changed or regenerated.
              </div>

              <Button
                onClick={onClose}
                className="w-full"
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Create Your Permanent Referral Code</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Generate a unique code that stays with you forever. Once created, this code cannot be changed or regenerated. Share it with friends to earn 10 tokens each time someone uses it (up to 20 uses maximum).
                </p>
                <Button
                  onClick={generateReferralCode}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Your Code...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Create Permanent Code
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={onClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}