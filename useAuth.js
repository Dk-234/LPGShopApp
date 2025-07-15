import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { canAutoLogin, logout } from './auth';

export default function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(true);

  // Function to check authentication status
  const checkAuth = async () => {
    console.log('🔍 Checking authentication status...');
    try {
      const autoLoginAllowed = await canAutoLogin();
      console.log('🔑 Auto-login allowed:', autoLoginAllowed);
      setNeedsAuth(!autoLoginAllowed);
      return autoLoginAllowed;
    } catch (error) {
      console.error('❌ Error checking auth:', error);
      setNeedsAuth(true);
      return false;
    }
  };

  // Function to refresh auth status (for use after login/logout)
  const refreshAuth = async () => {
    console.log('🔄 Refreshing authentication status...');
    return await checkAuth();
  };

  // Check auth status on app start
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  // Check auth when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextState) => {
      if (nextState === 'active') {
        console.log('📱 App came to foreground, checking auth...');
        await checkAuth();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  console.log('🔐 Auth state - Loading:', isLoading, 'Needs Auth:', needsAuth);
  return { isLoading, needsAuth, logout, refreshAuth };
}