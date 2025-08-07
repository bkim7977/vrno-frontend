import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import MaintenanceWrapper from "@/components/MaintenanceWrapper";
import Dashboard from "@/pages/Dashboard";
import Marketplace from "@/pages/Marketplace";
import TransactionHistory from "@/pages/TransactionHistory";
import TopUp from "@/pages/TopUp";
import Exchange from "@/pages/Exchange";
import CollectibleDetails from "@/pages/CollectibleDetails";
import Profile from "@/pages/Profile";
import AdminPanel from "@/pages/AdminPanel";
import DailyRewardPopup from "@/components/DailyRewardPopup";
import { WebSocketProvider } from "@/components/WebSocketProvider";
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentView, setCurrentView] = useState<'tabs' | 'collectible-details'>('tabs');
  const [selectedCollectibleId, setSelectedCollectibleId] = useState<string | null>(null);
  const [dashboardKey, setDashboardKey] = useState(0);
  
  // Handle URL parameters for direct navigation to asset details
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const id = urlParams.get('id');
    
    if (view === 'collectible-details' && id) {
      setSelectedCollectibleId(id);
      setCurrentView('collectible-details');
    }
  }, []);


  
  // Daily reward popup state
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardTokens, setRewardTokens] = useState(0);
  
  useEffect(() => {
    const handleDailyReward = (event: CustomEvent) => {
      setRewardTokens(event.detail.tokens);
      setShowRewardPopup(true);
      
      // Invalidate queries to refresh token balance
      queryClient.invalidateQueries({ queryKey: ['/api/token/balance'] });
    };

    window.addEventListener('dailyRewardEarned', handleDailyReward as EventListener);
    
    return () => {
      window.removeEventListener('dailyRewardEarned', handleDailyReward as EventListener);
    };
  }, []);

  const renderActiveTab = () => {
    if (currentView === 'collectible-details') {
      return <CollectibleDetails onBack={() => setCurrentView('tabs')} collectibleId={selectedCollectibleId || undefined} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            key="dashboard" 
            onCollectibleSelect={(id) => {
              setSelectedCollectibleId(id);
              setCurrentView('collectible-details');
            }}
          />
        );
      case 'marketplace':
        return (
          <Marketplace 
            key="marketplace"
            onCollectibleSelect={(id) => {
              setSelectedCollectibleId(id);
              setCurrentView('collectible-details');
            }} 
          />
        );
      case 'transactions':
        return <TransactionHistory key="transactions" />;
      case 'topup':
        return <TopUp key="topup" />;
      case 'exchange':
        return <Exchange key="exchange" />;
      case 'profile':
        return <Profile key="profile" />;
      case 'admin':
        return <AdminPanel key="admin" />;
      default:
        return <Dashboard key="dashboard-default" />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MaintenanceWrapper>
            <WebSocketProvider>
              <TooltipProvider>
                <ProtectedRoute>
                  <Layout 
                    activeTab={activeTab} 
                    onTabChange={setActiveTab}
                    showTabs={currentView === 'tabs'}
                  >
                    {renderActiveTab()}
                  </Layout>
                </ProtectedRoute>
              <Toaster />
              
                {/* Daily Reward Popup */}
                <DailyRewardPopup
                  isVisible={showRewardPopup}
                  tokens={rewardTokens}
                  onClose={() => setShowRewardPopup(false)}
                />
              </TooltipProvider>
            </WebSocketProvider>
          </MaintenanceWrapper>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
