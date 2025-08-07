import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  email: string;
  onVerificationSuccess: () => void;
  title?: string;
  description?: string;
}

export function TwoFactorModal({ 
  isOpen, 
  onClose, 
  phoneNumber,
  email,
  onVerificationSuccess,
  title = "Email Verification",
  description = "Enter the 6-digit code sent to your email"
}: TwoFactorModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  const handleSendCode = async () => {
    console.log('TwoFactorModal: handleSendCode called for email:', email);
    if (!email) {
      toast({
        title: "Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      console.log('TwoFactorModal: Sending request to /api/auth/send-email-code');
      const response = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: {
          'vrno-api-key': import.meta.env.VITE_VRNO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send verification code');
      }

      const data = await response.json();
      console.log('TwoFactorModal: API response received:', data);
      setCodeSent(true);
      console.log('TwoFactorModal: codeSent state set to true');
      
      if (data.demo_mode) {
        toast({
          title: "Email Service Unavailable",
          description: "Email service temporarily unavailable. Use demo code: 123456",
        });
      } else {
        toast({
          title: "Code Sent",
          description: `Verification code sent to ${email}. Check your email.`,
        });
      }
    } catch (error) {
      console.error('TwoFactorModal: Error sending 2FA code:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      console.log('TwoFactorModal: isSending set to false');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await authApi.verifyEmail(email, verificationCode);
      toast({
        title: "Email Verified",
        description: "Your email address has been successfully verified",
      });
      onVerificationSuccess();
      onClose();
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationCode('');
    await handleSendCode();
  };

  // Automatically send code when modal opens
  useEffect(() => {
    if (isOpen && email && !codeSent && !isSending) {
      console.log('TwoFactorModal: Auto-sending code for email:', email);
      handleSendCode();
    }
  }, [isOpen, email, codeSent, isSending]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVerificationCode('');
      setCodeSent(false);
      setIsLoading(false);
      setIsSending(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input 
              value={email} 
              disabled 
              className="bg-muted"
            />
          </div>

          {!codeSent ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We'll send a 6-digit verification code to your email address. Please check your inbox and spam folder.
                </p>
              </div>
              <Button 
                onClick={handleSendCode} 
                disabled={isSending}
                className="w-full"
              >
                {isSending ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleResendCode}
                  disabled={isSending}
                >
                  {isSending ? 'Sending...' : 'Resend'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}