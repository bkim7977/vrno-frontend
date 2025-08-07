import { demoCollectibles, demoTransactions, demoReferrals, demoUserBalance } from './demoData';

const EXTERNAL_API_BASE_URL = import.meta.env.VITE_EXTERNAL_API_URL || "https://token-market-backend-production.up.railway.app"; // External FastAPI backend for auth
const LOCAL_API_BASE_URL = import.meta.env.VITE_LOCAL_API_URL || ""; // Local server for token balance

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const isDemoMode = () => localStorage.getItem('demo_mode') === 'true';

const simulateApiDelay = (data: any) => 
  new Promise(resolve => setTimeout(() => resolve(data), 300));

async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useExternal: boolean = false
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const apiKey = import.meta.env.VITE_VRNO_API_KEY;
  const jwtSecret = import.meta.env.VITE_JWT_SECRET;
  
  const vrnoApiKey = import.meta.env.VITE_VRNO_API_KEY;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-JWT-Secret': jwtSecret,
      'vrno-api-key': vrnoApiKey,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const baseUrl = useExternal ? EXTERNAL_API_BASE_URL : LOCAL_API_BASE_URL;
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, config);
  
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new ApiError(401, 'Unauthorized');
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.text();
    } catch {
      errorData = response.statusText;
    }
    
    // Handle specific backend errors with more user-friendly messages
    if (response.status === 503 && errorData.includes('Database service unavailable')) {
      throw new ApiError(response.status, 'Backend service is temporarily unavailable. Please try again later.');
    }
    
    // Handle authentication errors more elegantly
    if (response.status === 401) {
      throw new ApiError(response.status, 'Invalid email or password. Please check your credentials and try again.');
    }
    
    if (response.status === 404 && endpoint.includes('/auth/login')) {
      throw new ApiError(response.status, 'No account found with this email address.');
    }
    
    if (response.status === 409 && (endpoint.includes('/auth/register') || endpoint.includes('/auth/signup'))) {
      throw new ApiError(response.status, 'This email or username is already taken. Please choose different credentials.');
    }
    
    if (response.status >= 500) {
      throw new ApiError(response.status, 'Server error. Please try again in a few moments.');
    }
    
    throw new ApiError(response.status, errorData || response.statusText);
  }

  return response.json();
  } catch (fetchError: any) {
    // Handle network errors
    if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
      throw new ApiError(503, 'Network connection failed. Please check your internet connection and try again.');
    }
    throw fetchError;
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    try {
      return await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, false); // Use local API
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },
  
  updateLastLogin: (username: string) =>
    makeRequest('/api/users/update-last-login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }, false), // Use local API
    
  checkDailyReward: (username: string) =>
    makeRequest('/api/rewards/daily-login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }, false), // Use local API
    
  checkSignupBonus: (username: string) =>
    makeRequest('/api/rewards/signup-bonus', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }, false), // Use local API

  register: (email: string, username: string, password: string, phoneNumber: string, address?: string) =>
    makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, phoneNumber, address: address || '' }),
    }, false), // Use local API
    
  verifyPhone: (phoneNumber: string, verificationCode: string) =>
    makeRequest('/api/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, verification_code: verificationCode }),
    }, false), // Use local API
    
  verifyEmail: (email: string, verificationCode: string) =>
    makeRequest('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email: email, verification_code: verificationCode }),
    }, false), // Use local API
    
  markUserVerified: (username: string, phoneNumber: string) =>
    makeRequest('/api/auth/mark-verified', {
      method: 'POST',
      body: JSON.stringify({ username, phone_number: phoneNumber }),
    }, false), // Use local API

  forgotPassword: (email: string) =>
    makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, false), // Use local API
};

// Admin referral code API
export const adminReferralApi = {
  redeemCode: (username: string, code: string) =>
    makeRequest('/api/referral/redeem-admin-code', {
      method: 'POST',
      body: JSON.stringify({ code, username }),
    }),
};

export const profileApi = {
  getBalance: () => {
    if (isDemoMode()) return simulateApiDelay(demoUserBalance);
    return makeRequest('/profile/balance', {}, true); // Use external API
  },
  
  getTransactions: () => {
    if (isDemoMode()) return simulateApiDelay(demoTransactions);
    return makeRequest('/profile/transactions', {}, true); // Use external API
  },
  
  getReferrals: async (username: string) => {
    try {
      // SECURITY FIX: Use server-side proxy endpoint - NO API KEYS EXPOSED TO CLIENT
      const response = await fetch(`/api/secure/referrals/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get referrals: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Return the usage count as the number of referrals
      return { 
        referrals: data.hasCode ? data.usedCount || 0 : 0,
        maxReferrals: 20,
        hasCode: data.hasCode
      };
    } catch (error) {
      console.error('Get referrals failed:', error);
      return { referrals: 0, maxReferrals: 20, hasCode: false };
    }
  },
  

  
  updateBalance: (amount: number) =>
    makeRequest(`/profile/balance/${amount}`, { method: 'PUT' }, true), // Use external API
    
  // Get token balance from your Supabase database for specific user (SECURE VERSION - NO API KEYS IN HEADERS)
  getTokenBalance: async (username: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // SECURITY FIX: Use server-side proxy endpoint - NO API KEYS EXPOSED TO CLIENT
      const response = await fetch(`/api/secure/token/balance/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Token balance fetch failed:', error);
      // Return a default balance structure instead of throwing
      return { 
        balance: 0, 
        user_id: null, 
        username: username,
        error: true,
        message: 'Failed to fetch balance' 
      };
    }
  },
  
  applyReferralCode: async (username: string, referralCode: string) => {
    try {
      // SECURITY FIX: Use server-side proxy endpoint - NO API KEYS EXPOSED TO CLIENT
      const response = await fetch('/api/secure/referrals/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, referralCode }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to apply referral code: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Apply referral code failed:', error);
      throw error;
    }
  },
};

// Import collectible helpers for image fetching
import { 
  fetchGenesectListingData, 
  fetchEthanHoohListingData, 
  fetchHildaListingData,
  fetchKyuremListingData,
  fetchVolcanionListingData,
  fetchSalamenceListingData,
  fetchIronHandsListingData,
  fetchPikachuListingData,
  fetchIronCrownListingData,
  fetchHydreigonListingData,
  fetchNsPlanListingData,
  fetchOshawottListingData,
  fetchIonoBelliboltListingData,
  fetchLabubuBigEnergyHopeListingData,
  fetchLabubuMonsterChestnutListingData,
  fetchLabubuCocaColaListingData,
  fetchLabubuSeatBabaListingData,
  fetchLabubuMacaronLycheeListingData,
  fetchLabubuMacaronSeaSaltListingData
} from '@/lib/collectibleHelpers';

// Optimized image fetching with caching
const imageCache = new Map<string, {url: string, timestamp: number}>();
const IMAGE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes to match price updates

// Updated to return both image and eBay listing data
interface OptimizedImageData {
  imageUrl: string;
  ebayUrl?: string;
  ebayPrice?: string;
  ebaySeller?: string;
}

const getOptimizedImageUrl = async (collectibleId: string, targetPrice: number): Promise<string> => {
  const imageData = await getOptimizedImageData(collectibleId, targetPrice);
  return imageData.imageUrl;
};

const getOptimizedImageData = async (collectibleId: string, targetPrice: number): Promise<OptimizedImageData> => {
  const cacheKey = `${collectibleId}-${Math.round(targetPrice * 100)}`;
  
  let listingData = null;
  
  // Fetch optimized image based on collectible with intelligent color analysis
  switch (collectibleId) {
    case '00000000-0000-0000-0000-000000000001':
      listingData = await fetchGenesectListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000002':
      listingData = await fetchEthanHoohListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000003':
      listingData = await fetchHildaListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000004':
      listingData = await fetchKyuremListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000005':
      listingData = await fetchVolcanionListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000006':
      listingData = await fetchSalamenceListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000007':
      listingData = await fetchIronHandsListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000008':
      listingData = await fetchPikachuListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000009':
      listingData = await fetchIronCrownListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000010':
      listingData = await fetchHydreigonListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000011':
      listingData = await fetchNsPlanListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000012':
      listingData = await fetchOshawottListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000014':
      listingData = await fetchIonoBelliboltListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000015':
      listingData = await fetchLabubuBigEnergyHopeListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000016':
      listingData = await fetchLabubuMonsterChestnutListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000017':
      listingData = await fetchLabubuCocaColaListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000018':
      listingData = await fetchLabubuSeatBabaListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000019':
      listingData = await fetchLabubuMacaronLycheeListingData(targetPrice);
      break;
    case '00000000-0000-0000-0000-000000000020':
      listingData = await fetchLabubuMacaronSeaSaltListingData(targetPrice);
      break;
  }
  
  if (listingData) {
    return {
      imageUrl: listingData.image_url,
      ebayUrl: listingData.ebay_url,
      ebayPrice: listingData.total_price?.toString(),
      ebaySeller: listingData.seller_username
    };
  }
  
  // Fallback to default image without eBay data
  return {
    imageUrl: getDefaultImageUrl(collectibleId)
  };
};

const getDefaultImageUrl = (collectibleId: string): string => {
  // Fallback to Google Storage images for Labubu figures
  const labububDefaults: Record<string, string> = {
    '00000000-0000-0000-0000-000000000015': 'https://storage.googleapis.com/vrno-tcg-images/labubu-big-energy-hope.webp',
    '00000000-0000-0000-0000-000000000016': 'https://storage.googleapis.com/vrno-tcg-images/labubu-monster-chestnut-cocoa.webp',
    '00000000-0000-0000-0000-000000000017': 'https://storage.googleapis.com/vrno-tcg-images/labubu-coca-cola-surprise-shake.webp',
    '00000000-0000-0000-0000-000000000018': 'https://storage.googleapis.com/vrno-tcg-images/labubu-have-a-seat-baba.webp',
    '00000000-0000-0000-0000-000000000019': 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-lychee-berry.webp',
    '00000000-0000-0000-0000-000000000020': 'https://storage.googleapis.com/vrno-tcg-images/labubu-macaron-sea-salt.webp',
    '00000000-0000-0000-0000-000000000014': 'https://storage.googleapis.com/vrno-tcg-images/iono-bellibolt-ex-journey-together-183-159.webp',
  };
  
  return labububDefaults[collectibleId] || 'https://images.pokemontcg.io/base1/1.png';
};

// Local collectibles data with optimized image fetching
const getLocalCollectibles = () => {
  return [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Genesect EX Black Bolt 161/086',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '14.57',
      description: 'A powerful EX card from the Black Bolt series featuring Genesect.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: "Ethan's Ho-oh EX #209 Destined Rivals",
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '18.71',
      description: 'A special EX card featuring Ho-oh from the Destined Rivals set.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Hilda #164 White Flare',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '24.57',
      description: 'A trainer card featuring Hilda from the White Flare series.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Kyurem EX Black Bolt 165/086',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '117.58',
      description: 'A legendary EX card featuring Kyurem from the Black Bolt series.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      name: 'Volcanion EX Journey Together 182/159',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '43.49',
      description: 'A fire-type EX card featuring Volcanion from Journey Together.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      name: 'Salamence EX Journey Together 187/159',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '170.78',
      description: 'A dragon-type EX card featuring Salamence from Journey Together.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000007',
      name: 'Iron Hands EX Prismatic Evolutions 154/131',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '78.73',
      description: 'A steel-type EX card featuring Iron Hands from Prismatic Evolutions.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000008',
      name: 'Pikachu EX Prismatic Evolutions 179/131',
      type: 'pokemon_card',
      rarity: 'legendary',
      currentPrice: '81.89',
      description: 'The iconic electric mouse Pokemon in a special EX form.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000009',
      name: 'Iron Crown EX Prismatic Evolutions',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '89.45',
      description: 'A psychic-type EX card featuring Iron Crown from Prismatic Evolutions.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Hydreigon EX White Flare 169/086',
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '135.93',
      description: 'A dark-type EX card featuring Hydreigon from White Flare.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000011',
      name: "N's Plan Black Bolt 170/086",
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '105.80',
      description: 'A trainer card featuring N from the Black Bolt series.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'Oshawott White Flare 105/086',
      type: 'pokemon_card',
      rarity: 'common',
      currentPrice: '68.57',
      description: 'A water-type starter Pokemon from the White Flare series.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000014',
      name: "Iono's Bellibolt EX Journey Together 183/159",
      type: 'pokemon_card',
      rarity: 'rare',
      currentPrice: '86.68',
      description: 'An electric-type EX card featuring Bellibolt with trainer Iono.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000015',
      name: 'Labubu Big Energy Hope',
      type: 'collectible_figure',
      rarity: 'epic',
      currentPrice: '62.82',
      description: 'A special edition Labubu figure from the Pop Mart collection.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000016',
      name: 'Labubu The Monster Secret Chestnut Cocoa',
      type: 'collectible_figure',
      rarity: 'legendary',
      currentPrice: '282.16',
      description: 'A rare secret edition Labubu figure in chestnut cocoa color.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000017',
      name: 'Labubu Coca-Cola Surprise Shake',
      type: 'collectible_figure',
      rarity: 'epic',
      currentPrice: '76.16',
      description: 'A limited edition Coca-Cola collaboration Labubu figure.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000018',
      name: 'Labubu Have a Seat Baba',
      type: 'collectible_figure',
      rarity: 'rare',
      currentPrice: '61.12',
      description: 'A sitting pose Labubu figure from the Pop Mart collection.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000019',
      name: 'Labubu Exciting Macaron Lychee Berry',
      type: 'collectible_figure',
      rarity: 'rare',
      currentPrice: '78.00',
      description: 'A sweet-themed Labubu figure in lychee berry macaron colors.',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Labubu Macaron Sea Salt',
      type: 'collectible_figure',
      rarity: 'rare',
      currentPrice: '72.50',
      description: 'A sea salt macaron themed Labubu figure with unique coloring.',
      createdAt: new Date('2024-01-01')
    }
  ];
};

export const collectiblesApi = {
  getAll: async () => {
    console.log('API: Starting collectibles fetch...');
    
    // Get base collectibles data
    const baseCollectibles = getLocalCollectibles();
    console.log('API: Base collectibles count:', baseCollectibles.length);
    
    // Fetch optimized images and eBay data for each collectible based on current price
    try {
      const collectiblesWithImages = await Promise.all(
        baseCollectibles.map(async (collectible) => {
          try {
            const targetPrice = parseFloat(collectible.currentPrice);
            const imageData = await getOptimizedImageData(collectible.id, targetPrice);
            
            return {
              ...collectible,
              imageUrl: imageData.imageUrl,
              ebayUrl: imageData.ebayUrl,
              ebayPrice: imageData.ebayPrice,
              ebaySeller: imageData.ebaySeller
            };
          } catch (imageError) {
            console.warn(`Failed to get optimized image for ${collectible.name}:`, imageError);
            // Return collectible with fallback image URL
            return {
              ...collectible,
              imageUrl: getDefaultImageUrl(collectible.id)
            };
          }
        })
      );
      
      console.log('API: Collectibles with images count:', collectiblesWithImages.length);
      return collectiblesWithImages;
    } catch (error) {
      console.error('API: Error processing collectibles images:', error);
      // Return base collectibles with default images as fallback
      return baseCollectibles.map(collectible => ({
        ...collectible,
        imageUrl: getDefaultImageUrl(collectible.id)
      }));
    }
  },
  
  getById: async (id: string) => {
    // Find collectible in local data with optimized image
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
    const collectibles = getLocalCollectibles();
    const baseCollectible = collectibles.find(c => c.id === id);
    if (!baseCollectible) {
      throw new Error('Collectible not found');
    }
    
    // Get optimized image for this specific collectible
    const targetPrice = parseFloat(baseCollectible.currentPrice);
    const optimizedImageUrl = await getOptimizedImageUrl(baseCollectible.id, targetPrice);
    
    return {
      ...baseCollectible,
      imageUrl: optimizedImageUrl
    };
  },
  
  getPriceHistory: (id: string) => makeRequest(`/collectibles/${id}/price-history`, {}, true), // Use external API
  
  create: (data: any) =>
    makeRequest('/collectibles', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true), // Use external API
    
  updatePrice: (id: string, price: number) =>
    makeRequest(`/collectibles/${id}/price`, {
      method: 'POST',
      body: JSON.stringify({ price }),
    }, true), // Use external API
};

export const transactionsApi = {
  create: async (data: any) => {
    // SECURITY FIX: Use secure transaction endpoint - ALL PROCESSING MOVED SERVER-SIDE
    return await transactionsApi.processTransaction(data);
  },

  processTransaction: async (data: {
    user_id: string,
    collectibleId: string,
    transactionType: string,
    quantity: number
  }) => {
    console.log('Processing transaction data:', data);

    // SECURITY FIX: Use secure proxy endpoint - NO API KEYS EXPOSED TO CLIENT
    const response = await fetch('/api/secure/process-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Transaction failed: ${response.status}`);
    }

    return await response.json();
  }
};

export const tokenApi = {
  // Get user token balance from token_balances table
  getTokenBalance: (username: string) => 
    makeRequest(`/api/token/balance/${username}`),
    
  // Get user assets (owned collectibles)
  getUserAssets: async (username: string) => {
    try {
      // SECURITY FIX: Use server-side proxy endpoint - NO API KEYS EXPOSED TO CLIENT
      const response = await fetch(`/api/secure/token/assets/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('User assets fetch failed:', error);
      throw error;
    }
  },
    
  // Buy collectibles with tokens
  buyCollectibles: (data: {
    username: string;
    collectible_ids: string[];
    quantities: { [key: string]: number };
  }) =>
    makeRequest('/api/token/buy', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  // Sell/redeem collectibles for tokens
  sellCollectibles: (data: {
    username: string;
    collectible_ids: string[];
    quantities: { [key: string]: number };
  }) =>
    makeRequest('/api/token/sell', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
