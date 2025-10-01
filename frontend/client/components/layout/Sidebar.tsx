import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  HomeIcon,
  FolderIcon,
  ClockIcon,
  StarIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  FolderIcon as FolderIconSolid,
  ClockIcon as ClockIconSolid,
  StarIcon as StarIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
} from "@heroicons/react/24/solid";
import { navigationItems } from "../../data/mockData";
import { createFolder } from "../../services/api";
import { useFiles } from '../../contexts/FileContext';
import { useAuth } from '../../services/auth';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSidebar } from '../../contexts/SidebarContext';
import FolderModal from "../ui/FolderModal";
import StorageQuotaWidget from "./StorageQuotaWidget";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  FolderIcon,
  ClockIcon,
  StarIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
};

const solidIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  HomeIcon: HomeIconSolid,
  FolderIcon: FolderIconSolid,
  ClockIcon: ClockIconSolid,
  StarIcon: StarIconSolid,
  UserGroupIcon: UserGroupIconSolid,
  ArchiveBoxIcon: ArchiveBoxIconSolid,
  ChartBarIcon,
};

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { initialized, authenticated, user } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [showFolderModal, setShowFolderModal] = React.useState(false);

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name);
      // Refresh the current view
      window.dispatchEvent(new CustomEvent('files:refresh'));
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };


  const { archiveCount, starredCount, recentCount, filesCount, sharedCount } = useFiles();
  const { unseenSharesCount } = useNotifications();

  const sidebarContent = (
    <div className={`h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'
      }`}>
      {/* Desktop toggle button */}
      <div className="hidden lg:flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <img
              className="h-8 w-8 rounded-lg object-cover"
              src="/company-logo.jpg"
              alt="MINT"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%232563eb'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";
              }}
            />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Resource Center</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 ${isCollapsed ? 'mx-auto' : ''
            }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <img
            className="h-8 w-8 rounded-lg object-cover"
            src="/company-logo.jpeg"
            alt="MINT"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%232563eb'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";
            }}
          />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">MINT DMS</span>
        </div>
        <button
          onClick={onMobileClose}
          className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-6 space-y-1 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'
        }`}>
        {navigationItems.filter(item => !item.adminOnly || (authenticated && (user as any)?.is_superuser)).map((item) => {
          const IconComponent = iconMap[item.icon];
          const SolidIconComponent = solidIconMap[item.icon];
          const isActive = location.pathname === item.path;
          const isArchive = item.path === "/archive";
          const isStarred = item.path === "/starred";
          const isRecent = item.path === "/recent";
          const isFiles = item.path === "/files";
          const isShared = item.path === "/shared";
          let count = item.count;
          if (isArchive) count = archiveCount;
          if (isStarred) count = starredCount;
          if (isRecent) count = recentCount;
          if (isFiles) count = filesCount;
          if (isShared) count = sharedCount;

          // Show badge for shared items if there are unseen shares
          const showBadge = isShared && unseenSharesCount > 0;

          return (
            <div key={item.id} className="relative group">
              <NavLink
                to={item.path}
                onClick={() => onMobileClose()}
                className={({ isActive }) =>
                  `group flex items-center text-sm font-medium rounded-lg transition-all duration-200 relative ${isCollapsed
                    ? 'px-3 py-3 justify-center'
                    : 'px-3 py-2'
                  } ${isActive
                    ? "bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator for collapsed sidebar */}
                    {isActive && isCollapsed && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-mint-600 rounded-r-full" />
                    )}

                    {/* Icon */}
                    {isActive && SolidIconComponent ? (
                      <SolidIconComponent className={`h-5 w-5 text-mint-600 ${isCollapsed ? '' : 'mr-3'
                        }`} />
                    ) : (
                      <IconComponent
                        className={`h-5 w-5 ${isActive
                          ? "text-mint-600"
                          : "text-gray-400 group-hover:text-gray-500"
                          } ${isCollapsed ? '' : 'mr-3'}`}
                      />
                    )}

                    {/* Text and badges - only show when expanded */}
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.name}</span>
                        {count !== undefined && (
                          <span
                            className={`ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full ${isActive
                              ? "bg-mint-100 text-mint-700"
                              : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                              }`}
                          >
                            {count}
                          </span>
                        )}
                        {(item.badge || showBadge) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-error-100 text-error-700 rounded-full">
                            {showBadge ? "new" : item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>

              {/* Tooltip for collapsed sidebar */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                  {count !== undefined && ` (${count})`}
                </div>
              )}
            </div>
          );
        })}
      </nav>



      <FolderModal open={showFolderModal} onClose={() => setShowFolderModal(false)} onCreate={handleCreateFolder} />

      {/* Storage Quota Widget - Bottom of Sidebar */}
      {!isCollapsed && authenticated && (
        <div className="mt-auto">
          <StorageQuotaWidget />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${mobileOpen ? "block" : "hidden"}`}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity"
          onClick={onMobileClose}
        />
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 z-30 w-72 transform transition-transform">
          <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg w-80">
            {/* Mobile header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <img
                  className="h-8 w-8 rounded-lg object-cover"
                  src="/company-logo.jpeg"
                  alt="MINT"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='12' fill='%232563eb'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";
                  }}
                />
                <span className="text-lg font-semibold text-gray-900">MINT DMS</span>
              </div>
              <button
                onClick={onMobileClose}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navigationItems.filter(item => !item.adminOnly || (authenticated && (user as any)?.is_superuser)).map((item) => {
                const IconComponent = iconMap[item.icon];
                const SolidIconComponent = solidIconMap[item.icon];
                const isActive = location.pathname === item.path;
                const isArchive = item.path === "/archive";
                const isStarred = item.path === "/starred";
                const isRecent = item.path === "/recent";
                const isFiles = item.path === "/files";
                const isShared = item.path === "/shared";
                let count = item.count;
                if (isArchive) count = archiveCount;
                if (isStarred) count = starredCount;
                if (isRecent) count = recentCount;
                if (isFiles) count = filesCount;
                if (isShared) count = sharedCount;

                const showBadge = isShared && unseenSharesCount > 0;

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => onMobileClose()}
                    className={({ isActive }) =>
                      `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                        ? "bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && SolidIconComponent ? (
                          <SolidIconComponent className="mr-3 h-5 w-5 text-mint-600" />
                        ) : (
                          <IconComponent
                            className={`mr-3 h-5 w-5 ${isActive
                              ? "text-mint-600"
                              : "text-gray-400 group-hover:text-gray-500"
                              }`}
                          />
                        )}
                        <span className="flex-1">{item.name}</span>
                        {count !== undefined && (
                          <span
                            className={`ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full ${isActive
                              ? "bg-mint-100 text-mint-700"
                              : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                              }`}
                          >
                            {count}
                          </span>
                        )}
                        {(item.badge || showBadge) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-error-100 text-error-700 rounded-full">
                            {showBadge ? "new" : item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Storage Quota Widget - Mobile Bottom */}
            {authenticated && (
              <div className="mt-auto">
                <StorageQuotaWidget />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        {sidebarContent}
      </div>

      <FolderModal open={showFolderModal} onClose={() => setShowFolderModal(false)} onCreate={handleCreateFolder} />
    </>
  );
}
