/**
 * Secure Database API - ALL DATABASE OPERATIONS VIA FLASK SERVER
 * Handles all Supabase operations through secure server-side endpoints
 */

// Helper function to get API key
const getApiKey = () => import.meta.env.VITE_VRNO_API_KEY || '';

// ===================================================================
// SECURE DATABASE OPERATIONS - SUPABASE VIA FLASK
// ===================================================================

export const secureDatabase = {
  // User operations
  getUserBalance: async (username: string) => {
    const response = await fetch(`/api/secure/user/balance/${username}`, {
      method: 'GET',
      headers: {
        'vrno-api-key': getApiKey()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.statusText}`);
    }
    
    return response.json();
  },

  getUserAssets: async (username: string) => {
    const response = await fetch(`/api/secure/user/assets/${username}`, {
      method: 'GET',
      headers: {
        'vrno-api-key': getApiKey()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Transaction operations
  processBuyTransaction: async (transactionData: {
    username: string;
    collectible_id: string;
    quantity: number;
    price_per_unit: number;
  }) => {
    const response = await fetch('/api/secure/transaction/buy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'vrno-api-key': getApiKey()
      },
      body: JSON.stringify(transactionData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transaction failed');
    }
    
    return response.json();
  },

  processSellTransaction: async (transactionData: {
    username: string;
    collectible_id: string;
    quantity: number;
    price_per_unit: number;
  }) => {
    const response = await fetch('/api/secure/transaction/sell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'vrno-api-key': getApiKey()
      },
      body: JSON.stringify(transactionData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transaction failed');
    }
    
    return response.json();
  },

  // Collectibles operations
  getAllCollectibles: async () => {
    const response = await fetch('/api/secure/collectibles/all', {
      method: 'GET',
      headers: {
        'vrno-api-key': getApiKey()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch collectibles: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Referral operations
  getUserReferrals: async (username: string) => {
    const response = await fetch(`/api/secure/referrals/${username}`, {
      method: 'GET',
      headers: {
        'vrno-api-key': getApiKey()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch referrals: ${response.statusText}`);
    }
    
    return response.json();
  }
};

// Legacy compatibility - gradually replace these with secureDatabase calls
export default secureDatabase;