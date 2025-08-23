import keycloak from './keycloak';
import { KeycloakProfile } from 'keycloak-js';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface AuthContextType {
  initialized: boolean;
  authenticated: boolean;
  user: KeycloakProfile | null;
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
  const [user, setUser] = useState<KeycloakProfile | null>(null);

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
        setUser(profile);
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