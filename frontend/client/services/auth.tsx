import keycloak from './keycloak';
import { KeycloakProfile } from 'keycloak-js';
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

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
    try {
      const auth = await keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      });
      setAuthenticated(auth);
      if (auth) {
        const profile = await keycloak.loadUserProfile();
        setUser(profile);
      }
    } catch (error) {
      console.error('Keycloak init error', error);
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