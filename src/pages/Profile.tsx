import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, CreditCard, Phone, Mail, Lock, Calendar, DollarSign, Edit2, Save, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface TopUpRecord {
  id: string;
  token_amount: number;
  dollar_amount: number;
  timestamp: string;
  payment_method?: string;
}

interface UserProfile {
  username: string;
  email: string;
  phone_number?: string;
  address?: string;
  created_at: string;
  verified: boolean;
}

// Country codes data
const countryCodes = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+82', country: 'S. Korea', flag: '🇰🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
];

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [address, setAddress] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile data
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/profile', user?.username],
    enabled: false, // Temporarily disabled for compute savings
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes - profile data changes infrequently
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchInterval: false, // Disable automatic refetch - profile is static
  });

  // Fetch top-up history
  const { data: topUpHistory, isLoading: topUpLoading } = useQuery<TopUpRecord[]>({
    queryKey: ['/api/topup-history', user?.username],
    queryFn: async () => {
      if (!user?.username) throw new Error('No username');
      const response = await fetch(`/api/topup-history/${user.username}`, {
        headers: {
          'vrno-api-key': import.meta.env.VITE_VRNO_API_KEY,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch top-up history');
      return response.json();
    },
    enabled: false, // Temporarily disabled for compute savings
    staleTime: 60 * 60 * 1000, // Cache for 1 hour - transaction history is static
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchInterval: false, // Disable automatic refetch - history doesn't change
  });

  // Phone number update mutation
  const updatePhoneMutation = useMutation({
    mutationFn: async (newPhoneNumber: string) => {
      const response = await fetch(`/api/profile/${user?.username}/phone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: newPhoneNumber }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update phone number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Phone number updated successfully",
      });
      setIsEditingPhone(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile', user?.username] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update phone number",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = () => {
    setIsEditingPhone(true);
    // Parse existing phone number to separate country code and number
    const existingPhone = userProfile?.phone_number || '';
    if (existingPhone) {
      const countryCode = countryCodes.find(cc => existingPhone.startsWith(cc.code));
      if (countryCode) {
        setSelectedCountryCode(countryCode.code);
        setPhoneNumber(existingPhone.substring(countryCode.code.length));
      } else {
        setSelectedCountryCode('+1');
        setPhoneNumber(existingPhone);
      }
    } else {
      setSelectedCountryCode('+1');
      setPhoneNumber('');
    }
  };

  const handleSavePhone = () => {
    const fullPhoneNumber = selectedCountryCode + phoneNumber;
    updatePhoneMutation.mutate(fullPhoneNumber);
  };

  const handleCancelEdit = () => {
    setIsEditingPhone(false);
    setPhoneNumber('');
    setSelectedCountryCode('+1');
  };

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: { currentPassword: string; newPassword: string }) => {
      const response = await fetch(`/api/profile/${user?.username}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartPasswordChange = () => {
    setIsChangingPassword(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSavePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "All password fields are required",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Address update mutation
  const updateAddressMutation = useMutation({
    mutationFn: async (newAddress: string) => {
      const response = await fetch(`/api/profile/${user?.username}/address`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'vrno-api-key': import.meta.env.VITE_VRNO_API_KEY,
        },
        body: JSON.stringify({ address: newAddress }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update address');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile', user?.username] });
      toast({
        title: "Success",
        description: "Address updated successfully",
      });
      setIsEditingAddress(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartAddressEdit = () => {
    setIsEditingAddress(true);
    setAddress(userProfile?.address || '');
  };

  // Initialize address when userProfile loads
  React.useEffect(() => {
    if (userProfile?.address && !address && !isEditingAddress) {
      setAddress(userProfile.address);
    }
  }, [userProfile?.address, address, isEditingAddress]);

  const handleSaveAddress = () => {
    updateAddressMutation.mutate(address);
  };

  const handleCancelAddressEdit = () => {
    setIsEditingAddress(false);
    setAddress('');
  };

  if (profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="topup-history">Top-up History</TabsTrigger>
          </TabsList>
          
          {/* Profile Information Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Username */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Username
                    </label>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{userProfile?.username || user?.username}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </label>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{userProfile?.email || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </label>
                    {!isEditingPhone ? (
                      <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                        <p className="font-medium">{userProfile?.phone_number || 'Not provided'}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEdit}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countryCodes.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <span className="flex items-center gap-2">
                                    <span>{country.flag}</span>
                                    <span>{country.code}</span>
                                    <span className="text-xs text-muted-foreground">{country.country}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="tel"
                            placeholder="234567890"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSavePhone}
                            disabled={updatePhoneMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {updatePhoneMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={updatePhoneMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Address
                    </label>
                    {!isEditingAddress ? (
                      <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                        <p className="font-medium">{userProfile?.address || 'Not provided'}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartAddressEdit}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Main St, City, State, ZIP"
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSaveAddress}
                            disabled={updateAddressMutation.isPending}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Save className="h-4 w-4" />
                            {updateAddressMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelAddressEdit}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </label>
                  {!isChangingPassword ? (
                    <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">••••••••••••</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Password is hidden for security
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartPasswordChange}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="New password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSavePassword}
                          disabled={changePasswordMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelPasswordChange}
                          disabled={changePasswordMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Created */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </label>
                  <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                    <p className="font-medium">
                      {userProfile?.created_at 
                        ? format(new Date(userProfile.created_at), 'MMMM d, yyyy')
                        : 'Unknown'
                      }
                    </p>
                    {userProfile?.created_at && (
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(userProfile.created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top-up History Tab */}
          <TabsContent value="topup-history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Token Purchase History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topUpLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : topUpHistory && topUpHistory.length > 0 ? (
                  <div className="space-y-3">
                    {topUpHistory.map((topup) => (
                      <div key={topup.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium">{topup.token_amount.toLocaleString()} Tokens</p>
                            <p className="text-sm text-muted-foreground">
                              ${topup.dollar_amount.toFixed(2)} • PayPal
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-medium">
                            {format(new Date(topup.timestamp), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(topup.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">No purchases yet</p>
                    <p className="text-muted-foreground">
                      Your token purchase history will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}