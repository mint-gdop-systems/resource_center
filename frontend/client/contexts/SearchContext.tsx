import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  isSearching: boolean;
  clearSearch: () => void;
  performSearch: (query: string) => Promise<void>;
  getSearchPlaceholder: () => string;
  getSearchScope: () => string;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();

  // Get context-aware search placeholder
  const getSearchPlaceholder = useCallback(() => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return 'Search all files, folders, and content...';
    } else if (path.startsWith('/files')) {
      return 'Search in My Files...';
    } else if (path === '/starred') {
      return 'Search starred items...';
    } else if (path === '/shared') {
      return 'Search shared files...';
    } else if (path === '/archive') {
      return 'Search archived items...';
    } else if (path === '/recent') {
      return 'Search recent files...';
    } else {
      return 'Search files, folders, and content...';
    }
  }, [location.pathname]);

  // Get search scope for API calls
  const getSearchScope = useCallback(() => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return 'all';
    } else if (path.startsWith('/files')) {
      return 'files';
    } else if (path === '/starred') {
      return 'starred';
    } else if (path === '/shared') {
      return 'shared';
    } else if (path === '/archive') {
      return 'archived';
    } else if (path === '/recent') {
      return 'recent';
    } else {
      return 'all';
    }
  }, [location.pathname]);

  // Perform search based on current context
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Import API function dynamically to avoid circular dependencies
      const { searchFiles } = await import('../services/api');
      const scope = getSearchScope();
      const results = await searchFiles(query, scope);
      setSearchResults(results);
      
      // Dispatch custom event to notify components about search results
      window.dispatchEvent(new CustomEvent('search:results', { 
        detail: { query, results, scope } 
      }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [getSearchScope]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    
    // Dispatch clear event
    window.dispatchEvent(new CustomEvent('search:clear'));
  }, []);

  // Auto-clear search when route changes
  React.useEffect(() => {
    clearSearch();
  }, [location.pathname, clearSearch]);

  return (
    <SearchContext.Provider value={{
      searchQuery,
      setSearchQuery,
      searchResults,
      isSearching,
      clearSearch,
      performSearch,
      getSearchPlaceholder,
      getSearchScope,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}