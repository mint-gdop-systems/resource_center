import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  DocumentIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { formatDate, formatFileSize } from "../../lib/utils";

interface ArchiveSearchProps {
  archivedItems: any[];
  onSearchResults: (results: any[]) => void;
  placeholder?: string;
}

export default function ArchiveSearch({ 
  archivedItems, 
  onSearchResults, 
  placeholder = "Search archived items..." 
}: ArchiveSearchProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      onSearchResults(archivedItems);
      return;
    }

    const searchTerm = query.toLowerCase();
    const results = archivedItems.filter(item => {
      // Search in name
      if (item.name.toLowerCase().includes(searchTerm)) return true;
      
      // Search in file extension
      if (item.extension && item.extension.toLowerCase().includes(searchTerm)) return true;
      
      // Search in archived by name
      if (item.archivedByName && item.archivedByName.toLowerCase().includes(searchTerm)) return true;
      
      // Search in folder name
      if (item.folderName && item.folderName.toLowerCase().includes(searchTerm)) return true;
      
      // Search in owner name
      if (item.owner?.name && item.owner.name.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });

    setSearchResults(results);
    onSearchResults(results);
  }, [query, archivedItems, onSearchResults]);

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearSearch = () => {
    setQuery('');
    setShowResults(false);
    onSearchResults(archivedItems);
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className={`${isDarkMode ? 'bg-mint-900 text-mint-300' : 'bg-mint-200 text-mint-800'} px-0.5 rounded`}>
          {part}
        </mark>
      ) : part
    );
  };

  const getItemIcon = (item: any) => {
    if (item.type === 'folder') {
      return <FolderIcon className="h-4 w-4 text-blue-500" />;
    }
    return <DocumentIcon className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className={`block w-full pl-10 pr-10 py-3 border rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent ${
            isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          placeholder={placeholder}
        />
        {query && (
          <button
            onClick={clearSearch}
            className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
              isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && query.trim() && (
        <div className={`absolute z-50 w-full mt-1 max-h-96 overflow-y-auto border rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          {searchResults.length > 0 ? (
            <>
              <div className={`px-3 py-2 text-xs font-medium border-b ${
                isDarkMode ? 'text-gray-400 border-gray-600 bg-gray-750' : 'text-gray-500 border-gray-200 bg-gray-50'
              }`}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </div>
              <div className="py-1">
                {searchResults.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className={`px-3 py-3 hover:bg-opacity-50 cursor-pointer border-b last:border-b-0 ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 border-gray-700' 
                        : 'hover:bg-gray-50 border-gray-100'
                    }`}
                    onClick={() => {
                      setShowResults(false);
                      // Optionally scroll to item or highlight it
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getItemIcon(item)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {highlightMatch(item.name, query)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {item.type === 'file' && item.size ? formatFileSize(item.size) : 'Folder'}
                          </span>
                          {item.archivedAt && (
                            <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <ClockIcon className="h-3 w-3" />
                              {formatDate(new Date(item.archivedAt))}
                            </span>
                          )}
                          {item.folderName && (
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              in {highlightMatch(item.folderName, query)}
                            </span>
                          )}
                        </div>
                        {item.archivedByName && (
                          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Archived by {highlightMatch(item.archivedByName, query)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {searchResults.length > 10 && (
                  <div className={`px-3 py-2 text-xs text-center ${
                    isDarkMode ? 'text-gray-400 bg-gray-750' : 'text-gray-500 bg-gray-50'
                  }`}>
                    Showing first 10 results. {searchResults.length - 10} more found.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={`px-3 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No archived items found for "{query}"</p>
              <p className="text-xs mt-1">Try searching by name, type, or archived by user</p>
            </div>
          )}
        </div>
      )}

      {/* Search Summary */}
      {query.trim() && !showResults && (
        <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {searchResults.length > 0 ? (
            <span>
              Showing {searchResults.length} of {archivedItems.length} archived items
            </span>
          ) : (
            <span>No results found for "{query}"</span>
          )}
        </div>
      )}
    </div>
  );
}