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
  CloudArrowUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  FolderIcon as FolderIconSolid,
  ClockIcon as ClockIconSolid,
  StarIcon as StarIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
} from "@heroicons/react/24/solid";
import { navigationItems, storageStats } from "../../data/mockData";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  FolderIcon,
  ClockIcon,
  StarIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
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
  CloudArrowUpIcon,
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  const StorageIndicator = () => (
    <div className="px-4 py-6 border-t border-gray-200">
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Storage</span>
          <span className="text-gray-900 font-medium">
            {storageStats.used} GB of {storageStats.total} GB
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-mint-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${storageStats.usedPercentage}%` }}
          />
        </div>
      </div>
      <button className="w-full bg-mint-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-mint-700 transition-colors flex items-center justify-center space-x-2">
        <CloudArrowUpIcon className="h-4 w-4" />
        <span>Upgrade Storage</span>
      </button>
    </div>
  );

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img
            className="h-8 w-8"
            src="/logo-mint.svg"
            alt="MINT"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%232563eb'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";
            }}
          />
          <span className="text-lg font-semibold text-gray-900">MINT DMS</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const IconComponent = iconMap[item.icon];
          const SolidIconComponent = solidIconMap[item.icon];
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-mint-50 text-mint-700 border-r-2 border-mint-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && SolidIconComponent ? (
                    <SolidIconComponent className="mr-3 h-5 w-5 text-mint-600" />
                  ) : (
                    <IconComponent
                      className={`mr-3 h-5 w-5 ${
                        isActive
                          ? "text-mint-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }`}
                    />
                  )}
                  <span className="flex-1">{item.name}</span>
                  {item.count !== undefined && (
                    <span
                      className={`ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full ${
                        isActive
                          ? "bg-mint-100 text-mint-700"
                          : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-error-100 text-error-700 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Quick Actions */}
        <div className="pt-6 mt-6 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button className="w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <CloudArrowUpIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Upload Files
            </button>
            <button className="w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <FolderIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              New Folder
            </button>
          </div>
        </div>

        {/* Recent Files */}
        <div className="pt-6 mt-6 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Files
          </h3>
          <div className="space-y-2">
            <div className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-red-100 rounded flex items-center justify-center">
                  <span className="text-xs text-red-600">PDF</span>
                </div>
                <span className="truncate">Annual Report.pdf</span>
              </div>
            </div>
            <div className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-xs text-blue-600">DOC</span>
                </div>
                <span className="truncate">Strategy Plan.docx</span>
              </div>
            </div>
            <div className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                  <span className="text-xs text-green-600">XLS</span>
                </div>
                <span className="truncate">Budget Analysis.xlsx</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Storage indicator */}
      <StorageIndicator />
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${open ? "block" : "hidden"}`}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 z-30 w-80 transform transition-transform">
          {sidebarContent}
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-80">{sidebarContent}</div>
      </div>
    </>
  );
}
