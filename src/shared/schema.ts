// Shared types and schemas for the VRNO marketplace application
import { z } from 'zod';

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  access_token: string;
  success: boolean;
  message?: string;
}

export interface Collectible {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  imageUrl?: string; // Alternative property name
  rarity?: string;
  set?: string;
  type?: string;
  price?: number;
  market_price?: number;
  currentPrice?: number | string; // Allow both types
  quantity?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  userId?: string; // Alternative property name
  collectible_id: string;
  transaction_type: 'buy' | 'sell' | 'trade';
  quantity: number;
  price: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface TokenBalance {
  user_id: string;
  balance: number;
  last_updated: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Redemption {
  id: string;
  user_id: string;
  code: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// Zod schemas for form validation
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
