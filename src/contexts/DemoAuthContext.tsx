import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface DemoAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  isDemoMode: boolean;
}

const DemoAuthContext = createContext<DemoAuthContextType | undefined>(undefined);

// Demo user data for when backend is unavailable
const demoUser: User = {
  id: 'demo-user-123',
  email: 'demo@vrno.com',
  username: 'demo_user',
  password: 'hashed_password',
  balance: '1250.75',
  lastUpdated: new Date()
};

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate demo login
    if (email === 'demo@vrno.com' && password === 'demo123') {
      setTimeout(() => {
        setUser(demoUser);
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        toast({
          title: "Demo Login Successful",
          description: "You're now using the demo mode",
        });
        setIsLoading(false);
      }, 1000);
    } else {
      setTimeout(() => {
        toast({
          title: "Demo Mode",
          description: "Use email: demo@vrno.com, password: demo123",
          variant: "destructive",
        });
        setIsLoading(false);
      }, 1000);
    }
  };

  const register = async (email: string, username: string, password: string) => {
    setIsLoading(true);
    
    setTimeout(() => {
      const newDemoUser = {
        ...demoUser,
        id: `demo-${Date.now()}`,
        email,
        username,
        balance: '100.00'
      };
      
      setUser(newDemoUser);
      localStorage.setItem('demo_user', JSON.stringify(newDemoUser));
      
      toast({
        title: "Demo Registration Successful",
        description: "You're now using the demo mode",
      });
      setIsLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('demo_user');
    toast({
      title: "Logged Out",
      description: "Demo session ended",
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    isDemoMode: true,
  };

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>;
}

export function useDemoAuth() {
  const context = useContext(DemoAuthContext);
  if (context === undefined) {
    throw new Error('useDemoAuth must be used within a DemoAuthProvider');
  }
  return context;
}