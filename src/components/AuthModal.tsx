import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Eye, EyeOff } from 'lucide-react';
import { signUpWithPhone, signInWithPhone } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { TwoFactorModal } from '@/components/TwoFactorModal';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';

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

export default function AuthModal() {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      phoneNumber: '',
      address: '',
    },
  });

  const handleLogin = async (data: any) => {
    setIsLoading(true);
    try {
      // For now, proceed with existing login
      // In a full 2FA implementation, we'd look up phone number by email first
      await login(data.email, data.password);
      // If successful, loading will be set to false automatically
    } catch (error) {
      // Clear form fields on login error and stop loading
      console.log('Login error caught in AuthModal:', error);
      loginForm.reset({
        email: '',
        password: ''
      });
      setIsLoading(false);
    }
  };

  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<any>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleRegister = async (data: any) => {
    setIsLoading(true);
    try {
      const fullPhoneNumber = selectedCountryCode + data.phoneNumber;
      
      // Store registration data and show email 2FA modal
      setPendingRegistration({
        email: data.email,
        username: data.username,
        password: data.password,
        phoneNumber: fullPhoneNumber,
        address: data.address || ''
      });
      
      setShowTwoFactor(true);
      setIsLoading(false);
      
    } catch (error) {
      console.log('Registration error caught in AuthModal:', error);
      setIsLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    if (!pendingRegistration) return;
    
    setIsLoading(true);
    try {
      // Complete registration after email verification
      await register(
        pendingRegistration.email,
        pendingRegistration.username,
        pendingRegistration.password,
        pendingRegistration.phoneNumber,
        pendingRegistration.address
      );
      
      setShowTwoFactor(false);
      setPendingRegistration(null);
      
      toast({
        title: "Registration Successful", 
        description: "Your account has been created successfully!",
      });
      
      // Reset form
      registerForm.reset({
        email: '',
        username: '',
        password: '',
        phoneNumber: '',
        address: ''
      });
      
    } catch (error: any) {
      console.log('Registration completion error:', error);
      setIsLoading(false);
    }
  };

  const handleTwoFactorClose = () => {
    setShowTwoFactor(false);
    setPendingRegistration(null);
    setIsLoading(false);
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to Vrno</CardTitle>
          <p className="text-sm text-muted-foreground text-center">Token Market</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Beta Reward:</strong> Beta users will receive their $15 of tokens and premium cosmetic when full version launches in a week!
                </p>
              </div>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="demo@vrno.com"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Beta Reward:</strong> Beta users will receive their $15 of tokens and premium cosmetic when full version launches in a week!
                </p>
              </div>
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="user123"
                    {...registerForm.register('username')}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="user@example.com"
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="register-phone">Phone Number</Label>
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
                      id="register-phone"
                      type="tel"
                      placeholder="234567890"
                      className="flex-1"
                      {...registerForm.register('phoneNumber')}
                    />
                  </div>
                  {registerForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State, ZIP"
                    {...registerForm.register('address')}
                  />
                  {registerForm.formState.errors.address && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.address.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...registerForm.register('password')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 2FA Email Verification Modal */}
      <TwoFactorModal
        isOpen={showTwoFactor}
        onClose={handleTwoFactorClose}
        phoneNumber={pendingRegistration?.phoneNumber || ''}
        email={pendingRegistration?.email || ''}
        onVerificationSuccess={handleVerificationSuccess}
        title="Email Verification Required"
        description="Please verify your email address to complete registration"
      />
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
