import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    console.log('WebSocket connection status:', isConnected ? 'Connected' : 'Disconnected');
  }, [isConnected]);

  return <>{children}</>;
}