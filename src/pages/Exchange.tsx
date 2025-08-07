import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowUpDown, AlertTriangle } from 'lucide-react';

export default function Exchange() {
  // Static values for Ho-oh EX
  const hoohUSDPrice = 16.13;
  const hoohTokenPrice = Math.round(hoohUSDPrice * 100); // 1613 tokens
  const exchangeRate = Math.round(hoohTokenPrice * 1.5); // 2420 tokens (1.5x)
  const staticExchangeAmount = '1.00';

  return (
    <div className="space-y-8">
      {/* Exchange Information */}
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <ArrowUpDown className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          <strong>Physical Delivery:</strong> Exchanging your digital assets will convert them into physical collectible cards that are shipped directly to you, giving you full ownership of the authentic trading cards.
        </AlertDescription>
      </Alert>

      {/* Warning Bar */}
      <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-700 dark:text-red-400">
          <strong>Beta Notice:</strong> The Exchange feature is currently under construction and not functional during beta testing. This is a preview of upcoming functionality.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">Exchange</h1>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Under Construction</span>
        </div>
      </div>

      {/* Asset Exchange Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Asset Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-primary" />
              Asset Exchange
            </CardTitle>
            <CardDescription>
              Exchange your assets at premium rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Ethan's Ho-oh EX #209 Destined Rivals</h3>
              <p className="text-sm text-muted-foreground">Current Market Price</p>
              <p className="text-lg font-bold text-primary">{hoohTokenPrice.toLocaleString()} tokens</p>
              <p className="text-sm text-green-600 font-medium">Exchange Rate: {exchangeRate.toLocaleString()} tokens (1.5x)</p>
            </div>
          </CardContent>
        </Card>

        {/* Exchange Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>Exchange Calculator</CardTitle>
            <CardDescription>
              Calculate your exchange value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Assets</label>
              <Input
                type="text"
                value={staticExchangeAmount}
                disabled
                className="cursor-not-allowed"
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Assets to Exchange:</span>
                <span className="font-medium">{staticExchangeAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Exchange Rate:</span>
                <span className="font-medium">{exchangeRate.toLocaleString()} tokens each</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total Value:</span>
                <span className="font-bold text-green-600">{exchangeRate.toLocaleString()} tokens</span>
              </div>
            </div>

            <Button className="w-full cursor-not-allowed" disabled>
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Exchange Assets (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}