import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Webhook, Shield, Check, AlertCircle } from "lucide-react";

export default function CallbackDemo() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const baseUrl = window.location.origin;
  
  const callbackUrls = [
    {
      type: 'OAuth Callbacks',
      endpoints: [
        { service: 'Google', url: `${baseUrl}/api/callback/google` },
        { service: 'GitHub', url: `${baseUrl}/api/callback/github` },
        { service: 'Discord', url: `${baseUrl}/api/callback/discord` },
        { service: 'PayPal', url: `${baseUrl}/api/callback/paypal` },
        { service: 'Alibaba', url: `${baseUrl}/api/callback/alibaba` }
      ]
    },
    {
      type: 'Webhook Endpoints',
      endpoints: [
        { service: 'PayPal', url: `${baseUrl}/api/webhook/paypal` },
        { service: 'Stripe', url: `${baseUrl}/api/webhook/stripe` },
        { service: 'GitHub', url: `${baseUrl}/api/webhook/github` }
      ]
    },
    {
      type: 'Utility Endpoints',
      endpoints: [
        { service: 'Success', url: `${baseUrl}/api/callback/success` },
        { service: 'Error', url: `${baseUrl}/api/callback/error` }
      ]
    }
  ];

  const testCallback = async (service: string, url: string, isWebhook: boolean = false) => {
    setLoading(true);
    try {
      const testUrl = isWebhook 
        ? url 
        : `${url}?code=test123&state=demo`;
      
      const response = await fetch(testUrl, {
        method: isWebhook ? 'POST' : 'GET',
        headers: isWebhook ? {
          'Content-Type': 'application/json',
          'X-Signature': 'test_signature'
        } : {},
        body: isWebhook ? JSON.stringify({
          event_type: 'TEST.EVENT',
          resource: { id: 'test_resource' }
        }) : undefined
      });

      const result = {
        service,
        url: testUrl,
        status: response.status,
        success: response.ok,
        timestamp: new Date().toLocaleTimeString(),
        isWebhook
      };

      setTestResults(prev => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      setTestResults(prev => [{
        service,
        url,
        status: 'Error',
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        isWebhook
      }, ...prev.slice(0, 9)]);
    }
    setLoading(false);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Callback URL System
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete callback and webhook system for OAuth, payments, and external service integrations.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {callbackUrls.map((category) => (
            <div key={category.type} className="space-y-3">
              <div className="flex items-center gap-2">
                {category.type.includes('Webhook') ? (
                  <Webhook className="h-4 w-4" />
                ) : category.type.includes('OAuth') ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <h3 className="font-semibold">{category.type}</h3>
              </div>
              
              <div className="grid gap-2">
                {category.endpoints.map((endpoint) => (
                  <div key={endpoint.service} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{endpoint.service}</Badge>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {endpoint.url}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(endpoint.url)}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => testCallback(
                          endpoint.service, 
                          endpoint.url, 
                          category.type.includes('Webhook')
                        )}
                        disabled={loading}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Badge variant={result.isWebhook ? "default" : "secondary"}>
                      {result.service}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.status}
                    </Badge>
                    {result.error && (
                      <span className="text-xs text-red-500">{result.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}