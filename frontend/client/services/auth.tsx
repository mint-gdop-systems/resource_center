import keycloak from './keycloak';
import { KeycloakProfile } from 'keycloak-js';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getUserProfile } from './api';

interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

interface ExtendedUser extends KeycloakProfile {
  is_superuser?: boolean;
  is_staff?: boolean;
  django_user?: DjangoUser;
}

interface AuthContextType {
  initialized: boolean;
  authenticated: boolean;
  user: ExtendedUser | null;
  login: () => void;
  logout: () => void;
  getToken: () => string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<ExtendedUser | null>(null);

  const initKeycloak = useCallback(async () => {
    if (keycloak.authenticated || initialized) {
      return; // Already initialized, skip
    }
    try {
      const auth = await keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: false,
        checkLoginIframeInterval: 0,
        enableLogging: false,
        flow: 'standard',
        responseMode: 'fragment',
        pkceMethod: 'S256'
      });
      setAuthenticated(auth);
      if (auth) {
        const profile = await keycloak.loadUserProfile();
        
        // Fetch Django user profile to get is_superuser and other Django fields
        try {
          const djangoUser = await getUserProfile();
          
          // Merge Keycloak profile with Django user data
          const extendedUser: ExtendedUser = {
            ...profile,
            is_superuser: djangoUser.is_superuser,
            is_staff: djangoUser.is_staff,
            django_user: djangoUser
          };
          
          setUser(extendedUser);
        } catch (error) {
          console.error('Failed to fetch Django user profile:', error);
          // Fallback to just Keycloak profile
          setUser(profile);
        }
      }
    } catch (error) {
      console.error('Keycloak init error', error);
      // If silent check fails, just mark as not authenticated
      setAuthenticated(false);
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    initKeycloak();

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(60).catch(() => {
        setAuthenticated(false);
        setUser(null);
      });
    };
  }, [initKeycloak]);

  const login = useCallback(() => {
    keycloak.login();
  }, []);

  const logout = useCallback(() => {
    keycloak.logout();
  }, []);

  const getToken = useCallback(() => keycloak.token, []);

  return (
    <AuthContext.Provider
      value={{
        initialized,
        authenticated,
        user,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
} 