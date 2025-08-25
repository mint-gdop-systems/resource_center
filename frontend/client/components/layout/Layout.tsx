import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useSidebar } from "../../contexts/SidebarContext";

export default function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isCollapsed } = useSidebar();

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar 
        mobileOpen={mobileSidebarOpen} 
        onMobileClose={closeMobileSidebar} 
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300">
        {/* Header */}
        <Header onToggleMobileSidebar={toggleMobileSidebar} />

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className={`mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
              isCollapsed ? 'max-w-full' : 'max-w-7xl'
            }`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
