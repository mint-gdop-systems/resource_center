import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  DocumentIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "../../lib/utils";
import FileList from "./FileList";
import { ViewMode } from "../../types";

interface ArchiveGroupedListProps {
  files: any[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  viewMode: ViewMode;
  groupBy: 'none' | 'date' | 'type' | 'archived_by';
  onArchiveOverride?: (fileId: string) => void;
  onDeleteOverride?: (fileId: string) => void;
  expandedGroups: Set<string>;
  onToggleGroup: (groupKey: string) => void;
}

export default function ArchiveGroupedList({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  viewMode,
  groupBy,
  onArchiveOverride,
  onDeleteOverride,
  expandedGroups,
  onToggleGroup,
}: ArchiveGroupedListProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  const groupedFiles = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Items': files };
    }

    const groups: Record<string, any[]> = {};

    files.forEach((file) => {
      let groupKey = '';

      switch (groupBy) {
        case 'date':
          if (file.archivedAt) {
            const date = new Date(file.archivedAt);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
              groupKey = 'Today';
            } else if (diffDays === 1) {
              groupKey = 'Yesterday';
            } else if (diffDays <= 7) {
              groupKey = 'This Week';
            } else if (diffDays <= 30) {
              groupKey = 'This Month';
            } else if (diffDays <= 90) {
              groupKey = 'Last 3 Months';
            } else {
              groupKey = 'Older';
            }
          } else {
            groupKey = 'Unknown Date';
          }
          break;

        case 'type':
          if (file.type === 'folder') {
            groupKey = 'Folders';
          } else {
            const extension = file.extension?.toLowerCase();
            if (!extension) {
              groupKey = 'Files (No Extension)';
            } else if (['pdf'].includes(extension)) {
              groupKey = 'PDF Documents';
            } else if (['doc', 'docx'].includes(extension)) {
              groupKey = 'Word Documents';
            } else if (['xls', 'xlsx'].includes(extension)) {
              groupKey = 'Excel Spreadsheets';
            } else if (['ppt', 'pptx'].includes(extension)) {
              groupKey = 'PowerPoint Presentations';
            } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
              groupKey = 'Images';
            } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
              groupKey = 'Archives';
            } else if (['txt', 'md', 'rtf'].includes(extension)) {
              groupKey = 'Text Documents';
            } else {
              groupKey = `${extension.toUpperCase()} Files`;
            }
          }
          break;

        case 'archived_by':
          groupKey = file.archivedByName || 'Unknown User';
          break;

        default:
          groupKey = 'All Items';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(file);
    });

    // Sort groups by priority for date grouping
    if (groupBy === 'date') {
      const dateOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Last 3 Months', 'Older', 'Unknown Date'];
      const sortedGroups: Record<string, any[]> = {};
      dateOrder.forEach(key => {
        if (groups[key]) {
          sortedGroups[key] = groups[key];
        }
      });
      return sortedGroups;
    }

    // Sort groups alphabetically for other groupings
    const sortedKeys = Object.keys(groups).sort();
    const sortedGroups: Record<string, any[]> = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [files, groupBy]);

  const getGroupIcon = (groupKey: string) => {
    if (groupBy === 'date') return CalendarIcon;
    if (groupBy === 'type') return DocumentIcon;
    if (groupBy === 'archived_by') return UserIcon;
    return DocumentIcon;
  };

  const getGroupStats = (groupFiles: any[]) => {
    const fileCount = groupFiles.filter(f => f.type === 'file').length;
    const folderCount = groupFiles.filter(f => f.type === 'folder').length;
    
    if (fileCount > 0 && folderCount > 0) {
      return `${fileCount} files, ${folderCount} folders`;
    } else if (fileCount > 0) {
      return `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    } else if (folderCount > 0) {
      return `${folderCount} folder${folderCount !== 1 ? 's' : ''}`;
    }
    return '0 items';
  };

  if (groupBy === 'none') {
    return (
      <FileList
        files={files}
        selectedFiles={selectedFiles}
        onFileSelect={onFileSelect}
        onSelectAll={onSelectAll}
        viewMode={viewMode}
        onArchiveOverride={onArchiveOverride}
        actionsMode="archive"
        onDeleteOverride={onDeleteOverride}
        showBulkActions={false}
        itemsPerPage={20}
        showPagination={true}
      />
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedFiles).map(([groupKey, groupFiles]) => {
        const isExpanded = expandedGroups.has(groupKey);
        const GroupIcon = getGroupIcon(groupKey);
        const groupStats = getGroupStats(groupFiles);

        return (
          <div
            key={groupKey}
            className={`border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          >
            {/* Group Header */}
            <button
              onClick={() => onToggleGroup(groupKey)}
              className={`w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50 transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-mint-900/20 text-mint-400' : 'bg-mint-100 text-mint-600'}`}>
                  <GroupIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {groupKey}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {groupStats}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {groupFiles.length}
                </span>
                {isExpanded ? (
                  <ChevronDownIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <ChevronRightIcon className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </div>
            </button>

            {/* Group Content */}
            {isExpanded && (
              <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="p-4">
                  <FileList
                    files={groupFiles}
                    selectedFiles={selectedFiles}
                    onFileSelect={onFileSelect}
                    onSelectAll={(selected) => {
                      // Only select/deselect files in this group
                      const groupFileIds = groupFiles.map(f => f.id);
                      groupFileIds.forEach(id => {
                        const isCurrentlySelected = selectedFiles.includes(id);
                        if (selected && !isCurrentlySelected) {
                          onFileSelect(id, true);
                        } else if (!selected && isCurrentlySelected) {
                          onFileSelect(id, false);
                        }
                      });
                    }}
                    viewMode={viewMode}
                    onArchiveOverride={onArchiveOverride}
                    actionsMode="archive"
                    onDeleteOverride={onDeleteOverride}
                    showBulkActions={false}
                    itemsPerPage={50}
                    showPagination={false}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}