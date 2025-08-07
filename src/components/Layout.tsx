import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun, LayoutDashboard, Store, History, CreditCard, Gift, ArrowUpDown, Settings } from 'lucide-react';
import { RedeemCodeModal } from '@/components/RedeemCodeModal';



interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showTabs?: boolean;
}

export default function Layout({ children, activeTab, onTabChange, showTabs = true }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [tokenImageLight, setTokenImageLight] = useState('');
  const [tokenImageDark, setTokenImageDark] = useState('');

  useEffect(() => {
    // Use hardcoded base64 images for guaranteed cross-browser compatibility
    import('../constants/images').then(({ HEADER_LOGO_LIGHT_BASE64, HEADER_LOGO_DARK_BASE64 }) => {
      setTokenImageLight(HEADER_LOGO_LIGHT_BASE64);
      setTokenImageDark(HEADER_LOGO_DARK_BASE64);
    });
  }, []);
  

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button 
                onClick={() => onTabChange('dashboard')}
                className="flex-shrink-0 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                aria-label="Go to Dashboard"
              >
                <div className="w-32 h-12 flex items-center justify-center overflow-hidden">
                  {tokenImageLight ? (
                    <img 
                      src={tokenImageLight}
                      alt="Vrno Token Market" 
                      className="w-full h-full object-contain dark:hidden"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded animate-pulse dark:hidden"></div>
                  )}
                  {tokenImageDark ? (
                    <img 
                      src={tokenImageDark}
                      alt="Vrno Token Market" 
                      className="w-full h-full object-contain hidden dark:block"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 rounded animate-pulse hidden dark:block"></div>
                  )}
                </div>
              </button>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem onClick={() => onTabChange('profile')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRedeemModal(true)}>
                    <Gift className="mr-2 h-4 w-4" />
                    Redeem Code
                  </DropdownMenuItem>
                  {(user?.id === '2' || user?.username === 'bkim') && (
                    <DropdownMenuItem onClick={() => onTabChange('admin')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      {/* Navigation Tabs */}
      {showTabs && (
        <div className="bg-background border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="marketplace" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <span className="hidden sm:inline">Marketplace</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Transactions</span>
                </TabsTrigger>
                <TabsTrigger value="exchange" className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Exchange</span>
                  <span className="text-xs bg-red-500 text-white px-1 rounded ml-1">Beta</span>
                </TabsTrigger>
                <TabsTrigger value="topup" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Top-up</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      {/* Modals */}
      <RedeemCodeModal
        isOpen={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
      />
    </div>
  );
}