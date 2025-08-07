// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface PayPalButtonProps {
  amount: string;
  currency: string;
  intent: string;
  tokenAmount?: number;
  onSuccess?: () => void;
}

export default function PayPalButton({
  amount,
  currency,
  intent,
  tokenAmount,
  onSuccess,
}: PayPalButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createOrder = async () => {
    const orderPayload = {
      amount: amount,
      currency: currency,
      intent: intent,
    };
    const response = await fetch("/paypal/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    const response = await fetch(`/paypal/order/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    return data;
  };

  const onApprove = async (data: any) => {
    console.log("onApprove", data);
    const orderData = await captureOrder(data.orderId);
    console.log("Capture result", orderData);
    
    // If payment was successful and we have token amount, process the token top-up
    if (orderData.status === 'COMPLETED' && tokenAmount) {
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to complete your token purchase.",
          variant: "destructive",
        });
        return;
      }
      try {
        // Optimistically update the UI immediately
        const currentUsername = user.username;
        
        // Show immediate success toast
        toast({
          title: "Payment Successful!",
          description: `${tokenAmount} tokens are being added to your account...`,
          duration: 3000,
        });
        
        // Call your existing token top-up API
        const response = await fetch('/api/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'vrno-api-key': import.meta.env.VITE_VRNO_API_KEY,
            'Authorization': 'Bearer fake-token', // Add authorization header
            'x-username': currentUsername, // Use actual logged-in user
          },
          body: JSON.stringify({
            tokenAmount,
            dollarAmount: parseFloat(amount),
            paymentMethod: 'paypal',
            paypalOrderId: data.orderId,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Token top-up successful:', result);
          
          // Immediately invalidate all token balance queries for instant UI update
          await queryClient.invalidateQueries({ queryKey: ['token', 'balance', currentUsername] });
          await queryClient.invalidateQueries({ queryKey: ['user', 'assets', currentUsername] });
          await queryClient.invalidateQueries({ queryKey: ['supabase', 'buy-transactions'] });
          await queryClient.invalidateQueries({ queryKey: ['transactions'] });
          
          // Show final success toast
          toast({
            title: "Payment Complete!",
            description: `${tokenAmount} tokens have been added to your account.`,
            duration: 5000,
          });
          
          // Dispatch custom event to refresh balance for any remaining listeners
          const balanceUpdateEvent = new CustomEvent('balanceUpdated');
          window.dispatchEvent(balanceUpdateEvent);
          
          onSuccess?.();
        } else {
          const errorData = await response.json();
          console.error('Failed to process token top-up:', errorData);
          
          toast({
            title: "Payment Processing Error",
            description: "Your payment was successful, but there was an error adding tokens. Please contact support with your PayPal order ID.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error processing token top-up:', error);
        toast({
          title: "Connection Error",
          description: "Your payment was successful, but we couldn't process the tokens immediately. Please refresh the page or contact support.",
          variant: "destructive",
        });
      }
    }
  };

  const onCancel = async (data: any) => {
    console.log("onCancel", data);
  };

  const onError = async (data: any) => {
    console.log("onError", data);
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = "https://www.paypal.com/web-sdk/v6/core"; // Use production PayPal SDK
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
      }
    };

    loadPayPalSDK();
  }, []);
  const initPayPal = async () => {
    try {
      const clientToken: string = await fetch("/paypal/setup")
        .then((res) => res.json())
        .then((data) => {
          return data.clientToken;
        });
      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });

      const paypalCheckout =
            sdkInstance.createPayPalOneTimePaymentSession({
              onApprove,
              onCancel,
              onError,
            });

      const onClick = async () => {
        try {
          const checkoutOptionsPromise = createOrder();
          await paypalCheckout.start(
            { paymentFlow: "auto" },
            checkoutOptionsPromise,
          );
        } catch (e) {
          console.error(e);
        }
      };

      const paypalButton = document.getElementById("paypal-button");

      if (paypalButton) {
        paypalButton.addEventListener("click", onClick);
      }

      return () => {
        if (paypalButton) {
          paypalButton.removeEventListener("click", onClick);
        }
      };
    } catch (e) {
      console.error(e);
    }
  };

  return <paypal-button id="paypal-button"></paypal-button>;
}
// <END_EXACT_CODE>