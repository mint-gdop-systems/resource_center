import React, { useState, useEffect, useRef } from "react";
import {
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../services/auth";
import { useNotifications } from "../../contexts/NotificationContext";
import { useSearch } from "../../contexts/SearchContext";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export default function Header({ onToggleMobileSidebar }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { initialized, authenticated, user, login, logout } = useAuth();
  const { unseenSharesCount, totalNotifications } = useNotifications();
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults, 
    isSearching, 
    performSearch, 
    clearSearch,
    getSearchPlaceholder 
  } = useSearch();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const notifications = [
    {
      id: "1",
      title: "New file shared",
      message: "Hanan Mohammed shared 'Q2 Budget Report.pdf' with you",
      time: "5 min ago",
      unread: true,
    },
    {
      id: "2",
      title: "Reminder",
      message: "Review deadline for Strategic Plan 2025 is tomorrow",
      time: "1 hour ago",
      unread: true,
    },
    {
      id: "3",
      title: "File uploaded",
      message: "Successfully uploaded Innovation Roadmap.docx",
      time: "2 hours ago",
      unread: false,
    },
  ];

  const unreadCount = totalNotifications;

  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // Handle search input focus
  const handleSearchFocus = () => {
    if (searchQuery.trim() && searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (item: any) => {
    setShowSearchResults(false);
    if (item.type === 'file') {
      // Navigate to the file's folder and highlight the file
      const folderPath = item.folder_id ? `/folders/${item.folder_id}` : '/files';
      navigate(folderPath, { state: { highlightFileId: item.id } });
    } else if (item.type === 'folder') {
      // Navigate to the folder
      navigate(`/folders/${item.id}`);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    clearSearch();
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display name from Keycloak user profile
  const displayName = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.username || user.email || "User"
    : "";

  // Handle logout and redirect to dashboard
  const handleLogout = () => {
    logout();
    navigate("/dashboard", { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Logo and title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img
                className="h-8 w-8"
                src="/logo-mint.svg"
                alt="MINT Logo"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%232563eb'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <div className="ml-3 hidden sm:block">
              <h1 className="text-xl font-semibold text-gray-900">
                MINT Resource Center
              </h1>
              <p className="text-xs text-gray-500">
                Ministry of Innovation and Technology
              </p>
            </div>
          </div>
        </div>  

        {/* Center - Search */}
        <div className="flex-1 max-w-lg mx-4" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-mint-500 focus:border-transparent text-sm transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-mint-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      Search Results ({searchResults.length})
                    </div>
                    {searchResults.map((item, index) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSearchResultClick(item)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                          item.type === 'folder' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.type === 'folder' ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {item.type === 'folder' ? 'Folder' : `${item.file_type?.toUpperCase() || 'File'}`}
                            {item.folder_name && ` • in ${item.folder_name}`}
                          </p>
                        </div>
                        {item.is_starred && (
                          <div className="flex-shrink-0">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="p-4 text-center">
                    <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                    <p className="text-xs text-gray-400 mt-1">Try different keywords or check spelling</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg relative focus:outline-none focus:ring-2 focus:ring-mint-500"
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {unseenSharesCount > 0 ? (
                    <div
                      className="p-4 border-b border-gray-100 hover:bg-gray-50 bg-mint-50 cursor-pointer"
                      onClick={() => {
                        navigate('/shared');
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            New Shared Items
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            You have {unseenSharesCount} new shared {unseenSharesCount === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                        <div className="h-2 w-2 bg-mint-600 rounded-full ml-2 mt-1"></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Click to view
                      </p>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No new notifications</p>
                    </div>
                  )}
                </div>
                <div className="p-4 text-center">
                  <button 
                    className="text-sm text-mint-600 hover:text-mint-700 font-medium"
                    onClick={() => {
                      navigate('/shared');
                      setShowNotifications(false);
                    }}
                  >
                    View shared items
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User menu or Sign In button */}
          {initialized && authenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-500"
              >
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user.email}
                  </p>
                </div>
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {displayName}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="py-2">
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <UserCircleIcon className="h-5 w-5 mr-3 text-gray-400" />
                      My Profile
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Cog6ToothIcon className="h-5 w-5 mr-3 text-gray-400" />
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-200 py-2">
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={handleLogout}
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-gray-400" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            initialized && (
              <button
                className="inline-flex items-center px-6 py-2 bg-mint-600 text-white text-base font-semibold rounded-full shadow-md hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors group"
                onClick={login}
              >
                <svg className="h-5 w-5 mr-2 text-white group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4m13-4a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Sign In
              </button>
            )
          )}
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
}
