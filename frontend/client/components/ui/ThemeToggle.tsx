import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle() {
  const { actualTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(actualTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-10 w-20 items-center justify-center rounded-full bg-gray-200 p-1 transition-all duration-300 ease-in-out hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600"
      aria-label={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Background slider */}
      <div
        className={`absolute inset-1 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out dark:bg-gray-800 ${
          actualTheme === 'dark' ? 'translate-x-8' : 'translate-x-0'
        }`}
        style={{ width: '32px', height: '32px' }}
      />
      
      {/* Sun icon */}
      <div
        className={`relative z-10 flex h-8 w-8 items-center justify-center transition-all duration-300 ${
          actualTheme === 'light' 
            ? 'text-yellow-500 opacity-100' 
            : 'text-gray-400 opacity-50'
        }`}
      >
        <SunIcon className="h-5 w-5" />
      </div>
      
      {/* Moon icon */}
      <div
        className={`relative z-10 flex h-8 w-8 items-center justify-center transition-all duration-300 ${
          actualTheme === 'dark' 
            ? 'text-blue-400 opacity-100' 
            : 'text-gray-400 opacity-50'
        }`}
      >
        <MoonIcon className="h-5 w-5" />
      </div>
    </button>
  );
}