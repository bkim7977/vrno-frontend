import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MaintenancePage from './MaintenancePage';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

const ADMIN_USER_ID = 2;
const ADMIN_USERNAME = 'bkim';

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const { user } = useAuth();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  const isAdmin = user?.id === ADMIN_USER_ID || user?.username === ADMIN_USERNAME;

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await fetch('/api/maintenance/status');
        if (response.ok) {
          const data = await response.json();
          setIsMaintenanceMode(data.maintenance_mode);
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error);
        // Default to false if we can't check
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceStatus();
  }, []);

  // Show loading state while checking maintenance status
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If maintenance mode is enabled and user is not admin, show maintenance page
  if (isMaintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  // Otherwise, show the normal app
  return <>{children}</>;
}