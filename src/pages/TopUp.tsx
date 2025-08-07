import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PayPalButton from '@/components/PayPalButton';

interface TokenPackage {
  id?: number;
  tokens: number;
  price: string | number;
  original_price?: string | number;
  bonus_percentage?: number;
  is_popular?: boolean;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
}

interface CheckoutFormData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  email: string;
  billingAddress: string;
  city: string;
  zipCode: string;
}

export default function TopUp() {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<CheckoutFormData>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
    billingAddress: '',
    city: '',
    zipCode: '',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch token packages from database
  useEffect(() => {
    const fetchTokenPackages = async () => {
      try {
        const response = await fetch('/api/token-packages');
        if (response.ok) {
          const packages = await response.json();
          setTokenPackages(packages);
        } else {
          console.error('Failed to fetch token packages');
          // Fallback to default packages if API fails
          setTokenPackages([
            { tokens: 510, price: 5.00, bonus_percentage: 2 },
            { tokens: 1050, price: 10.00, bonus_percentage: 5 },
            { tokens: 2700, price: 25.00, bonus_percentage: 8, is_popular: true },
            { tokens: 5000, price: 50.00, bonus_percentage: 4 },
          ]);
        }
      } catch (error) {
        console.error('Error fetching token packages:', error);
        // Fallback to default packages
        setTokenPackages([
          { tokens: 510, price: 5.00, bonus_percentage: 2 },
          { tokens: 1050, price: 10.00, bonus_percentage: 5 },
          { tokens: 2700, price: 25.00, bonus_percentage: 8, is_popular: true },
          { tokens: 5000, price: 50.00, bonus_percentage: 4 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenPackages();
  }, []);

  const handlePackageSelect = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['cardNumber', 'expiryDate', 'cvv', 'cardholderName', 'email'];
    return required.every(field => formData[field as keyof CheckoutFormData].trim() !== '');
  };

  const processPayment = async () => {
    if (!selectedPackage || !user) return;

    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Process the token top-up
      const response = await fetch('/api/topup/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'vrno-api-key': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          username: user.username,
          token_amount: selectedPackage.tokens,
          dollar_amount: selectedPackage.price,
          payment_info: {
            cardNumber: formData.cardNumber,
            expiryDate: formData.expiryDate,
            cardholderName: formData.cardholderName,
            email: formData.email,
            billingAddress: formData.billingAddress,
            city: formData.city,
            zipCode: formData.zipCode,
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setIsComplete(true);
        toast({
          title: "Payment Successful!",
          description: `${selectedPackage.tokens} tokens have been added to your account.`,
          duration: 5000,
        });

        // Dispatch custom event to refresh balance
        const balanceUpdateEvent = new CustomEvent('balanceUpdated');
        window.dispatchEvent(balanceUpdateEvent);
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFlow = () => {
    setSelectedPackage(null);
    setIsComplete(false);
    setFormData({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      email: '',
      billingAddress: '',
      city: '',
      zipCode: '',
    });
  };

  if (isComplete) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">
            {selectedPackage?.tokens} tokens have been added to your account.
          </p>
          <Button onClick={resetFlow} className="mt-4">
            Buy More Tokens
          </Button>
        </div>
      </div>
    );
  }

  if (selectedPackage) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedPackage(null)}>
            <ArrowLeft className="w-4 h-4" />
            Back to Packages
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>{selectedPackage.tokens} Tokens</span>
                <span className="font-semibold">${parseFloat(selectedPackage.price).toFixed(2)}</span>
              </div>
              {selectedPackage.original_price && (
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>You save</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ${(parseFloat(selectedPackage.original_price) - parseFloat(selectedPackage.price)).toFixed(2)}
                  </span>
                </div>
              )}
              <hr />
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span>${parseFloat(selectedPackage.price).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* PayPal Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Payment with PayPal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-8">
                {/* Prominent PayPal account notice */}
                <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-primary dark:text-primary" />
                    <span className="font-semibold text-primary dark:text-primary text-lg">
                      No PayPal Account Required
                    </span>
                  </div>
                  <p className="text-primary dark:text-primary text-sm font-medium">
                    You can pay with any credit or debit card without creating a PayPal account
                  </p>
                </div>
                
                <p className="text-muted-foreground mb-6">
                  Secure payment powered by PayPal
                </p>
                <div className="max-w-sm mx-auto">
                  <PayPalButton
                    amount={parseFloat(selectedPackage.price).toFixed(2)}
                    currency="USD"
                    intent="CAPTURE"
                    tokenAmount={selectedPackage.tokens}
                    onSuccess={() => setIsComplete(true)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  You will be redirected to PayPal to complete your payment securely.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Buy Tokens</h1>
        <p className="text-muted-foreground">
          Purchase tokens to buy collectibles and participate in marketplace activities.
        </p>
      </div>

      {/* 2x2 Grid Layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="text-center">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {tokenPackages.map((pkg) => (
            <Card 
              key={pkg.id || pkg.tokens} 
              className={`cursor-pointer transition-all hover:scale-105 w-full border border-gray-300 dark:border-gray-700 ${pkg.is_popular ? 'ring-2 ring-primary relative' : ''}`}
              onClick={() => handlePackageSelect(pkg)}
            >
              {pkg.is_popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Best Offer
                  </span>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">{pkg.tokens.toLocaleString()} Tokens</CardTitle>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-primary">
                    ${parseFloat(pkg.price).toFixed(2)}
                    {pkg.original_price && (
                      <span className="text-lg text-muted-foreground line-through ml-2">
                        ${parseFloat(pkg.original_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {pkg.bonus_percentage && pkg.bonus_percentage > 0 && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      +{pkg.bonus_percentage}% bonus
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-center">
                {pkg.original_price && (
                  <div className="text-sm text-green-600 dark:text-green-400 mb-4">
                    Save ${(parseFloat(pkg.original_price) - parseFloat(pkg.price)).toFixed(2)}
                  </div>
                )}
                <Button className="w-full" onClick={() => handlePackageSelect(pkg)}>
                  Select Package
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>💳 We accept all major credit cards and PayPal</p>
        <p>⚡ Tokens are added to your account instantly after payment</p>
      </div>
    </div>
  );
}