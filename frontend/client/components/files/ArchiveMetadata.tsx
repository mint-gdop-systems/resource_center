import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  ClockIcon,
  UserIcon,
  FolderIcon,
  TagIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { formatDate, formatFileSize, getTimeAgo } from "../../lib/utils";

interface ArchiveMetadataProps {
  item: {
    id: string;
    name: string;
    type: 'file' | 'folder';
    size?: number;
    archivedAt: Date | null;
    archivedBy: string | null;
    archivedByName: string | null;
    folderId: string | null;
    folderName: string | null;
    extension?: string;
    createdAt: Date;
    owner: {
      name: string;
      email: string;
    };
  };
  showDetails?: boolean;
}

export default function ArchiveMetadata({ item, showDetails = false }: ArchiveMetadataProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';



  const getOriginalLocationPath = () => {
    if (item.folderName) {
      return item.folderName;
    }
    return 'Root folder';
  };

  if (!showDetails) {
    // Compact view for list items
    return (
      <div className="flex items-center gap-4 text-xs">
        <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <ClockIcon className="h-3 w-3" />
          <span>{getTimeAgo(item.archivedAt)}</span>
        </div>
        
        {item.archivedByName && (
          <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <UserIcon className="h-3 w-3" />
            <span>by {item.archivedByName}</span>
          </div>
        )}

        <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <FolderIcon className="h-3 w-3" />
          <span>{getOriginalLocationPath()}</span>
        </div>
      </div>
    );
  }

  // Detailed view for expanded items or modals
  return (
    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <InformationCircleIcon className={`h-5 w-5 ${isDarkMode ? 'text-mint-400' : 'text-mint-600'}`} />
        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Archive Information
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Archive Details */}
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Archived Date
            </label>
            <div className={`flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <ClockIcon className="h-4 w-4" />
              <span className="text-sm">
                {item.archivedAt ? formatDate(item.archivedAt) : 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                ({getTimeAgo(item.archivedAt)})
              </span>
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Archived By
            </label>
            <div className={`flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <UserIcon className="h-4 w-4" />
              <span className="text-sm">
                {item.archivedByName || 'Unknown User'}
              </span>
              {item.archivedBy && (
                <span className="text-xs text-gray-500">
                  ({item.archivedBy})
                </span>
              )}
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Original Location
            </label>
            <div className={`flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <FolderIcon className="h-4 w-4" />
              <span className="text-sm">{getOriginalLocationPath()}</span>
            </div>
          </div>
        </div>

        {/* Item Details */}
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Item Type
            </label>
            <div className={`flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <TagIcon className="h-4 w-4" />
              <span className="text-sm capitalize">
                {item.type === 'file' ? `${item.extension?.toUpperCase() || 'File'}` : 'Folder'}
              </span>
            </div>
          </div>

          {item.type === 'file' && item.size && (
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                File Size
              </label>
              <div className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className="text-sm">{formatFileSize(item.size)}</span>
              </div>
            </div>
          )}

          <div>
            <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Original Owner
            </label>
            <div className={`flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <UserIcon className="h-4 w-4" />
              <span className="text-sm">
                {item.owner.name}
              </span>
              <span className="text-xs text-gray-500">
                ({item.owner.email})
              </span>
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Created Date
            </label>
            <div className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="text-sm">{formatDate(item.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}