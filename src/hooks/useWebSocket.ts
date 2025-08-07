import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  balance?: number;
  tokens_added?: number;
  reason?: string;
  username?: string;
}

export function useWebSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);

  const connect = () => {
    if (!user?.username || isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnecting.current = true;
    
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        isConnecting.current = false;
        
        // Authenticate with username
        if (ws.current && user?.username) {
          ws.current.send(JSON.stringify({
            type: 'auth',
            username: user.username
          }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          switch (data.type) {
            case 'auth_success':
              console.log(`WebSocket authenticated for user: ${data.username}`);
              break;
              
            case 'balance_update':
              console.log(`Real-time balance update: ${data.balance} tokens (+${data.tokens_added})`);
              
              // Invalidate all balance-related queries immediately
              queryClient.invalidateQueries({ queryKey: ['token', 'balance', user.username] });
              queryClient.invalidateQueries({ queryKey: ['user', 'assets', user.username] });
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              queryClient.invalidateQueries({ queryKey: ['topup-history'] });
              
              // Show toast notification
              if (data.tokens_added && data.tokens_added > 0) {
                toast({
                  title: "Balance Updated!",
                  description: `+${data.tokens_added} tokens added to your account`,
                  duration: 3000,
                });
              }
              break;
              
            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnecting.current = false;
        ws.current = null;
        
        // Reconnect after 3 seconds if user is still logged in
        if (user?.username) {
          reconnectTimeout.current = setTimeout(() => {
            console.log('Attempting WebSocket reconnection...');
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting.current = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnecting.current = false;
    }
  };

  const disconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    isConnecting.current = false;
  };

  useEffect(() => {
    if (user?.username) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount or user change
    return () => {
      disconnect();
    };
  }, [user?.username]);

  // Return connection status for debugging
  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect
  };
}