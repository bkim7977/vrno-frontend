import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Package, Mail, DollarSign, Clock, Database, Plus, X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CallbackDemo from '@/components/CallbackDemo';
import * as secureApi from '@/lib/secureApi';
import { queryClient } from '@/lib/queryClient';


interface AdminConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  description: string;
  updated_at: string;
}

interface TokenPackage {
  id: number;
  tokens?: string | number;  // frontend field 
  token_amount?: string | number;  // backend field
  price: string | number;
  original_price: string | number | null;
  bonus_percentage?: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: string | number;
  created_at: string;
  updated_at: string;
}

interface AdminReferralCode {
  id: string;
  code: string;
  token_amount: number;
  description?: string;
  redemption_limit: number;
  redemption_count: number;
  is_used: boolean;
  used_by?: string;
  used_by_username?: string;
  used_at?: string;
  created_by: string;
  created_at: string;
}

const ADMIN_USER_ID = 2;
const ADMIN_USERNAME = 'bkim';

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [configs, setConfigs] = useState<AdminConfig[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [referralCodes, setReferralCodes] = useState<AdminReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showAddReferralCode, setShowAddReferralCode] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newPackage, setNewPackage] = useState({
    tokens: '',
    price: '',
    original_price: '',
    is_popular: false,
    is_active: true,
    sort_order: ''
  });
  const [newReferralCode, setNewReferralCode] = useState({
    code: '',
    token_amount: '',
    description: '',
    redemption_limit: '1'
  });

  // Check if user is authorized - HARDCODED FOR ADMIN ACCESS
  useEffect(() => {
    console.log('Admin panel user check:', { user: user, userId: user?.id, username: user?.username });
    // Hardcode admin access for bkim user
    if (user?.username === 'bkim' || user?.id === 'aa6a6db5-aef3-416b-b441-abe53dc0f9a6') {
      setIsAuthorized(true);
      fetchData();
    } else {
      setIsAuthorized(false);
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      console.log('Fetching admin data from Express backend...');
      setLoading(true);
      
      // Use Express backend endpoints without authentication
      const [configData, packagesData, referralCodesData] = await Promise.all([
        fetch('/admin-data/configs').then(res => res.json()).catch(err => {
          console.error('Config fetch error:', err);
          return [];
        }),
        fetch('/admin-data/token-packages').then(res => res.json()).catch(err => {
          console.error('Packages fetch error:', err);
          return [];
        }),
        fetch('/admin-data/referral-codes').then(res => res.json()).catch(err => {
          console.error('Referral codes fetch error:', err);
          return [];
        })
      ]);
      
      console.log('Express backend data received:', {
        configCount: configData?.length || 0,
        packagesCount: packagesData?.length || 0,
        referralCodesCount: referralCodesData?.length || 0
      });
      
      // Ensure data is arrays before setting state
      setConfigs(Array.isArray(configData) ? configData : []);
      setPackages(Array.isArray(packagesData) ? packagesData : []);
      setReferralCodes(Array.isArray(referralCodesData) ? referralCodesData : []);
      
      // Set maintenance mode from config
      if (Array.isArray(configData)) {
        const maintenanceConfig = configData.find((config: AdminConfig) => config.config_key === 'maintenance_mode');
        setMaintenanceMode(maintenanceConfig?.config_value === 'true');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfigValue = async (key: string, value: string) => {
    try {
      // Direct API call for configuration updates
      const response = await fetch(`/admin-data/configs/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
      });

      if (response.ok) {
        await fetchData();
        toast({
          title: "Success",
          description: `Updated ${key} configuration`,
        });
      } else {
        throw new Error('Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  const toggleMaintenanceMode = async () => {
    const newValue = !maintenanceMode;
    setMaintenanceMode(newValue);
    await updateConfigValue('maintenance_mode', newValue.toString());
    
    toast({
      title: newValue ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
      description: newValue 
        ? "Platform is now under maintenance - only admins can access"
        : "Platform is now accessible to all users",
      variant: newValue ? "destructive" : "default",
    });
  };

  const updateTokenPackage = async (pkg: TokenPackage) => {
    try {
      // Direct API call for token package updates
      const response = await fetch(`/admin-data/token-packages/${pkg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokens: parseInt(pkg.token_amount?.toString() || pkg.tokens?.toString()) || 0,
          price: parseFloat(pkg.price.toString()) || 0,
          original_price: pkg.original_price ? parseFloat(pkg.original_price.toString()) : null,
          is_popular: pkg.is_popular,
          is_active: pkg.is_active,
          sort_order: parseInt(pkg.sort_order.toString()) || 0
        })
      });

      if (response.ok) {
        await fetchData();
        toast({
          title: "Success",
          description: "Token package updated",
        });
      } else {
        throw new Error('Failed to update token package');
      }
    } catch (error) {
      console.error('Error updating token package:', error);
      toast({
        title: "Error",
        description: "Failed to update token package",
        variant: "destructive",
      });
    }
  };

  const deleteTokenPackage = async (packageId: number) => {
    if (!confirm('Are you sure you want to delete this token package?')) {
      return;
    }

    try {
      const response = await fetch(`/admin-data/token-packages/${packageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchData();
        toast({
          title: "Success",
          description: "Token package deleted",
        });
      } else {
        throw new Error('Failed to delete token package');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete token package",
        variant: "destructive",
      });
    }
  };

  const addTokenPackage = async () => {
    try {
      const response = await fetch('/admin-data/token-packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokens: parseInt(newPackage.tokens) || 0,
          price: parseFloat(newPackage.price) || 0,
          original_price: newPackage.original_price ? parseFloat(newPackage.original_price) : null,
          is_popular: newPackage.is_popular,
          is_active: newPackage.is_active,
          sort_order: parseInt(newPackage.sort_order) || 0
        })
      });

      if (response.ok) {
        await fetchData();
        setShowAddPackage(false);
        setNewPackage({
          tokens: '',
          price: '',
          original_price: '',
          is_popular: false,
          is_active: true,
          sort_order: ''
        });
        toast({
          title: "Success",
          description: "Token package created",
        });
      } else {
        throw new Error('Failed to create token package');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create token package",
        variant: "destructive",
      });
    }
  };

  const createReferralCode = async () => {
    try {
      const response = await fetch('/admin-data/referral-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: newReferralCode.code.toUpperCase() || undefined,
          token_amount: parseInt(newReferralCode.token_amount) || 0,
          description: newReferralCode.description || undefined,
          redemption_limit: parseInt(newReferralCode.redemption_limit) || 1
        })
      });

      if (response.ok) {
        setNewReferralCode({
          code: '',
          token_amount: '',
          description: '',
          redemption_limit: '1'
        });
        setShowAddReferralCode(false);
        await fetchData();
        toast({
          title: "Success",
          description: "New referral code created",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create referral code');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create referral code",
        variant: "destructive",
      });
    }
  };

  const deleteReferralCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this referral code?')) {
      return;
    }

    try {
      const response = await fetch(`/admin-data/referral-codes/${codeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchData();
        toast({
          title: "Success",
          description: "Referral code deleted",
        });
      } else {
        throw new Error('Failed to delete referral code');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete referral code",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
        <span className="ml-4 text-lg">Loading admin panel...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <Settings className="w-8 h-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Admin Configuration Panel</h1>
          <p className="text-muted-foreground">Manage system settings and token packages</p>
        </div>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="business">Business Settings</TabsTrigger>
          <TabsTrigger value="packages">Token Packages</TabsTrigger>
          <TabsTrigger value="referrals">Referral Codes</TabsTrigger>
          <TabsTrigger value="callbacks">Callback URLs</TabsTrigger>
          <TabsTrigger value="system">System Config</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reward Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Reward Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {configs.filter(c => ['daily_login_reward', 'signup_bonus', 'referral_bonus'].includes(c.config_key)).map(config => (
                  <div key={config.config_key} className="space-y-2">
                    <Label>{config.description}</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        defaultValue={config.config_value}
                        onBlur={(e) => {
                          if (e.target.value !== config.config_value) {
                            updateConfigValue(config.config_key, e.target.value);
                          }
                        }}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">tokens</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Token Economics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Token Economics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {configs.filter(c => c.config_key === 'token_to_dollar_ratio').map(config => (
                  <div key={config.config_key} className="space-y-2">
                    <Label>{config.description}</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        defaultValue={config.config_value}
                        onBlur={(e) => {
                          if (e.target.value !== config.config_value) {
                            updateConfigValue(config.config_key, e.target.value);
                          }
                        }}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">tokens per $1</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Time Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {configs.filter(c => ['email_verification_expiry', 'price_update_interval'].includes(c.config_key)).map(config => (
                  <div key={config.config_key} className="space-y-2">
                    <Label>{config.description}</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        defaultValue={config.config_value}
                        onBlur={(e) => {
                          if (e.target.value !== config.config_value) {
                            updateConfigValue(config.config_key, e.target.value);
                          }
                        }}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">
                        {config.config_key.includes('expiry') ? 'minutes' : 'seconds'}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Maintenance Mode */}
            <Card className={maintenanceMode ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Platform Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      Maintenance Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {maintenanceMode 
                        ? "Platform is under maintenance - only admins can access"
                        : "Platform is accessible to all users"
                      }
                    </p>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={toggleMaintenanceMode}
                    data-testid="switch-maintenance-mode"
                  />
                </div>
                {maintenanceMode && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      ⚠️ Platform is currently under maintenance
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Regular users will see a maintenance page. Only admin accounts can access the platform.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Chart & Data Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {configs.filter(c => c.config_key === 'chart_data_points').map(config => (
                  <div key={config.config_key} className="space-y-2">
                    <Label>{config.description}</Label>
                    <Input
                      type="number"
                      defaultValue={config.config_value}
                      onBlur={(e) => {
                        if (e.target.value !== config.config_value) {
                          updateConfigValue(config.config_key, e.target.value);
                        }
                      }}
                      className="w-32"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Token Packages Management</h2>
            <Button onClick={() => setShowAddPackage(true)} className="bg-green-600 hover:bg-green-700">
              Add New Package
            </Button>
          </div>

          {/* Add New Package Dialog */}
          <Dialog open={showAddPackage} onOpenChange={setShowAddPackage}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Token Package</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tokens</Label>
                    <Input
                      type="number"
                      value={newPackage.tokens}
                      onChange={(e) => setNewPackage(prev => ({ ...prev, tokens: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPackage.price}
                      onChange={(e) => setNewPackage(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Original Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPackage.original_price}
                      onChange={(e) => setNewPackage(prev => ({ ...prev, original_price: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={newPackage.sort_order}
                      onChange={(e) => setNewPackage(prev => ({ ...prev, sort_order: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newPackage.is_popular}
                      onCheckedChange={(checked) => setNewPackage(prev => ({ ...prev, is_popular: checked }))}
                    />
                    <Label>Popular</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newPackage.is_active}
                      onCheckedChange={(checked) => setNewPackage(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={addTokenPackage} className="flex-1 bg-green-600 hover:bg-green-700">
                    Create Package
                  </Button>
                  <Button onClick={() => setShowAddPackage(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map(pkg => (
              <Card key={pkg.id} className={pkg.is_popular ? "border-green-500" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pkg.token_amount ? parseInt(pkg.token_amount.toString()).toLocaleString() : '0'} Tokens</CardTitle>
                    <div className="flex items-center space-x-2">
                      {pkg.is_popular && <Badge variant="secondary">Popular</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center text-2xl font-bold text-green-600 mb-2">
                    ${pkg.price ? parseFloat(pkg.price.toString()).toFixed(2) : '0.00'}
                    {pkg.original_price && (
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        ${parseFloat(pkg.original_price.toString()).toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Tokens</Label>
                      <Input
                        type="number"
                        value={pkg.token_amount || pkg.tokens || ''}
                        onChange={(e) => {
                          const updated = { ...pkg, token_amount: e.target.value, tokens: e.target.value };
                          setPackages(prev => prev.map(p => p.id === pkg.id ? updated : p));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pkg.price}
                        onChange={(e) => {
                          const updated = { ...pkg, price: e.target.value };
                          setPackages(prev => prev.map(p => p.id === pkg.id ? updated : p));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Original Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pkg.original_price || ''}
                        onChange={(e) => {
                          const updated = { ...pkg, original_price: e.target.value };
                          setPackages(prev => prev.map(p => p.id === pkg.id ? updated : p));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Sort Order</Label>
                      <Input
                        type="number"
                        value={pkg.sort_order}
                        onChange={(e) => {
                          const updated = { ...pkg, sort_order: e.target.value };
                          setPackages(prev => prev.map(p => p.id === pkg.id ? updated : p));
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={pkg.is_popular}
                        onCheckedChange={(checked) => {
                          const updated = { ...pkg, is_popular: checked };
                          setPackages(prev => prev.map(p => p.id === pkg.id ? updated : p));
                        }}
                      />
                      <Label>Popular</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={pkg.is_active}
                        onCheckedChange={(checked) => {
                          const updated = { ...pkg, is_active: checked };
                          setPackages(prev => prev.map(p => p.id === pkg.id ? updated : p));
                        }}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => updateTokenPackage(pkg)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      Update Package
                    </Button>
                    <Button 
                      onClick={() => deleteTokenPackage(pkg.id)}
                      variant="destructive"
                      size="sm"
                      className="px-3"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Admin Referral Codes</h2>
            <Dialog open={showAddReferralCode} onOpenChange={setShowAddReferralCode}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Referral Code
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby="create-referral-dialog-description">
                <DialogHeader>
                  <DialogTitle>Create New Referral Code</DialogTitle>
                </DialogHeader>
                <div id="create-referral-dialog-description" className="sr-only">
                  Form to create a new admin referral code with custom token amount and redemption limits
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="referralCode">Code (leave empty for auto-generation)</Label>
                    <Input
                      id="referralCode"
                      value={newReferralCode.code}
                      onChange={(e) => setNewReferralCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="WELCOME2025"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tokenAmount">Token Amount</Label>
                    <Input
                      id="tokenAmount"
                      type="number"
                      value={newReferralCode.token_amount}
                      onChange={(e) => setNewReferralCode(prev => ({ ...prev, token_amount: e.target.value }))}
                      placeholder="1000"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redemptionLimit">Redemption Limit</Label>
                    <div className="flex gap-2">
                      <Input
                        id="redemptionLimit"
                        type="number"
                        placeholder="Enter number of uses"
                        value={newReferralCode.redemption_limit === '-1' ? '' : newReferralCode.redemption_limit}
                        onChange={(e) => setNewReferralCode(prev => ({ ...prev, redemption_limit: e.target.value }))}
                        className="flex-1"
                        min="1"
                        disabled={newReferralCode.redemption_limit === '-1'}
                      />
                      <Button
                        type="button"
                        variant={newReferralCode.redemption_limit === '-1' ? "default" : "outline"}
                        onClick={() => {
                          setNewReferralCode(prev => ({ 
                            ...prev, 
                            redemption_limit: prev.redemption_limit === '-1' ? '1' : '-1'
                          }));
                        }}
                        className="whitespace-nowrap"
                      >
                        {newReferralCode.redemption_limit === '-1' ? 'Unlimited ✓' : 'Set Unlimited'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={newReferralCode.description}
                      onChange={(e) => setNewReferralCode(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Welcome bonus for new users"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={createReferralCode}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Create Code
                    </Button>
                    <Button 
                      onClick={() => setShowAddReferralCode(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {referralCodes.map((code) => (
              <Card key={code.id} className="border border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <code className="text-lg font-mono font-bold bg-gray-100 px-3 py-1 rounded text-black">
                          {code.code}
                        </code>
                        <Badge variant={code.is_used ? "secondary" : "default"}>
                          {code.redemption_limit === -1 
                            ? "Unlimited" 
                            : code.is_used 
                              ? "Exhausted" 
                              : "Active"
                          }
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {code.redemption_limit === -1 
                            ? `${code.redemption_count || 0} uses`
                            : `${code.redemption_count || 0}/${code.redemption_limit} used`
                          }
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Token Amount:</strong> {code.token_amount.toLocaleString()}</p>
                        {code.description && (
                          <p><strong>Description:</strong> {code.description}</p>
                        )}
                        {code.is_used && code.used_by_username && (
                          <p><strong>Used by:</strong> {code.used_by_username} on {new Date(code.used_at!).toLocaleDateString()}</p>
                        )}
                        <p><strong>Created:</strong> {new Date(code.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {!code.is_used && (
                        <Button 
                          onClick={() => deleteReferralCode(code.id)}
                          variant="destructive"
                          size="sm"
                          className="px-3"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {referralCodes.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No referral codes created yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create one-time use referral codes to award tokens to specific users.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="callbacks" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Callback URL System</h2>
            <Badge variant="outline" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              OAuth & Webhooks Ready
            </Badge>
          </div>
          
          <CallbackDemo />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Database Status</h3>
                    <p className="text-sm text-muted-foreground">Connected to Supabase PostgreSQL</p>
                    <Badge variant="outline" className="mt-2">Operational</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Email Service</h3>
                    <p className="text-sm text-muted-foreground">Mailgun API for verification emails</p>
                    <Badge variant="outline" className="mt-2">Operational</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Payment Processing</h3>
                    <p className="text-sm text-muted-foreground">PayPal production mode active</p>
                    <Badge variant="outline" className="mt-2">Live</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Real-time Updates</h3>
                    <p className="text-sm text-muted-foreground">WebSocket connections for live data</p>
                    <Badge variant="outline" className="mt-2">Active</Badge>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium mb-4">Recent Configuration Changes</h3>
                  <div className="space-y-2">
                    {configs
                      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                      .slice(0, 5)
                      .map(config => (
                        <div key={config.id} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="text-sm font-medium">{config.config_key}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(config.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}