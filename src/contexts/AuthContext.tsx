import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { User, AuthResponse } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, phoneNumber: string, address?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password) as AuthResponse;
      
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      
      // Update last_login timestamp in database
      try {
        await authApi.updateLastLogin(response.user.username);
      } catch (loginUpdateError) {
        console.warn('Failed to update last login timestamp:', loginUpdateError);
        // Don't fail the login if this update fails
      }
      
      // Check for daily login reward
      try {
        console.log('🎁 Checking daily reward for user:', response.user.username);
        const rewardResponse = await authApi.checkDailyReward(response.user.username) as any;
        console.log('Daily reward response:', rewardResponse);
        
        if (rewardResponse.success && !rewardResponse.alreadyClaimed) {
          console.log('🎉 Daily reward earned! Dispatching popup event:', rewardResponse.reward);
          
          // Show toast notification for the reward
          toast({
            title: "Daily Login Reward!",
            description: `You earned ${rewardResponse.reward.tokens} tokens for your first login today!`,
            duration: 5000,
          });
          
          // Dispatch custom event for daily reward popup
          const rewardEvent = new CustomEvent('dailyRewardEarned', {
            detail: {
              tokens: rewardResponse.reward.tokens,
              type: rewardResponse.reward.type
            }
          });
          window.dispatchEvent(rewardEvent);
          console.log('Daily reward event dispatched successfully');
        } else {
          console.log('No daily reward:', rewardResponse.message);
        }
      } catch (rewardError) {
        console.warn('Failed to check daily reward:', rewardError);
        // Don't fail the login if reward check fails
      }
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    } catch (error) {
      let errorMessage = "Login failed";
      
      if (error instanceof Error) {
        // Handle specific authentication errors more elegantly
        if (error.message.includes("401") || error.message.includes("Unauthorized") || 
            error.message.includes("Invalid credentials") || error.message.includes("incorrect")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes("404") || error.message.includes("User not found")) {
          errorMessage = "No account found with this email address.";
        } else if (error.message.includes("network") || error.message.includes("Network")) {
          errorMessage = "Connection error. Please check your internet connection.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string, phoneNumber: string, address?: string) => {
    try {
      // Step 1: Create basic user account via external API
      const response = await authApi.register(email, username, password, phoneNumber, address) as AuthResponse;
      
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      
      // Step 2: Update phone number via local API if provided
      if (phoneNumber) {
        try {
          // SECURITY FIX: Use secure proxy endpoint - NO API KEYS EXPOSED TO CLIENT
          await fetch(`/api/secure/profile/${username}/phone`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone_number: phoneNumber }),
          });
          console.log('Phone number updated successfully:', phoneNumber);
        } catch (phoneError) {
          console.log('Phone number update failed (non-critical):', phoneError);
        }
      }
      
      // Step 3: Update address via local API if provided
      if (address) {
        try {
          // SECURITY FIX: Use secure proxy endpoint - NO API KEYS EXPOSED TO CLIENT
          await fetch(`/api/secure/profile/${username}/address`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address }),
          });
          console.log('Address updated successfully:', address);
        } catch (addressError) {
          console.log('Address update failed (non-critical):', addressError);
        }
      }
      
      // Handle signup bonus from registration response
      if ((response as any).signupBonus) {
        const { tokens, type } = (response as any).signupBonus;
        
        // Show instant welcome message
        toast({
          title: "Welcome Bonus!",
          description: `Welcome to VRNO! You earned ${tokens} tokens for signing up!`,
          duration: 5000,
        });
        
        // Dispatch instant popup event for better UX
        const signupEvent = new CustomEvent('signupBonusEarned', {
          detail: {
            tokens,
            type
          }
        });
        window.dispatchEvent(signupEvent);
        
        // Trigger token balance refresh
        window.dispatchEvent(new CustomEvent('tokenBalanceUpdated'));
      }
      
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    } catch (error) {
      let errorMessage = "Registration failed";
      
      if (error instanceof Error) {
        // Handle specific registration errors more elegantly
        if (error.message.includes("409") || error.message.includes("already exists") ||
            error.message.includes("duplicate") || error.message.includes("taken")) {
          errorMessage = "This email or username is already taken. Please choose different credentials.";
        } else if (error.message.includes("400") || error.message.includes("Invalid")) {
          errorMessage = "Please check your information and try again.";
        } else if (error.message.includes("network") || error.message.includes("Network")) {
          errorMessage = "Connection error. Please check your internet connection.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    toast({
      title: "Success",
      description: "Logged out successfully",
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
