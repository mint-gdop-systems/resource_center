import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUnseenSharesCount } from '../services/api';
import { useAuth } from '../services/auth';

interface NotificationContextType {
  unseenSharesCount: number;
  totalSharedCount: number;
  totalNotifications: number;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unseenSharesCount, setUnseenSharesCount] = useState(0);
  const [totalSharedCount, setTotalSharedCount] = useState(0);
  const { initialized, authenticated } = useAuth();
  
  const refreshNotifications = async () => {
    if (!initialized || !authenticated) {
      setUnseenSharesCount(0);
      setTotalSharedCount(0);
      return;
    }
    
    try {
      // Simple approach: Get both unseen count and total shared count
      const [unseenResponse, sharedResponse] = await Promise.all([
        getUnseenSharesCount(), // Now uses timestamp-based logic
        import('../services/api').then(api => api.getSharedWithMe())
      ]);
      
      setUnseenSharesCount(unseenResponse.count);
      setTotalSharedCount(sharedResponse.total_count || 0);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      // Don't set to 0 on error to avoid clearing existing count unless it's a 401/403
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setUnseenSharesCount(0);
        setTotalSharedCount(0);
      }
    }
  };

  // Load notifications when authentication state changes
  useEffect(() => {
    if (initialized) {
      refreshNotifications();
      
      if (authenticated) {
        // Set up periodic refresh every 30 seconds only if authenticated
        const interval = setInterval(refreshNotifications, 30000);
        
        // Listen for custom events to refresh notifications
        const handleRefresh = () => refreshNotifications();
        window.addEventListener('notifications:refresh', handleRefresh);
        
        return () => {
          clearInterval(interval);
          window.removeEventListener('notifications:refresh', handleRefresh);
        };
      }
    }
  }, [initialized, authenticated]);

  // Total notifications (can include other types in the future)
  const totalNotifications = unseenSharesCount;

  const value = {
    unseenSharesCount,
    totalSharedCount,
    totalNotifications,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
