import React, { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  ArchiveBoxIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FolderIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { formatFileSize } from "../../lib/utils";

interface ArchiveBulkActionsProps {
  selectedItems: any[];
  onRestoreSelected: () => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  onExportList: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export default function ArchiveBulkActions({
  selectedItems,
  onRestoreSelected,
  onDeleteSelected,
  onExportList,
  onClearSelection,
  isLoading = false,
}: ArchiveBulkActionsProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, current: '' });

  const selectedCount = selectedItems.length;
  const selectedFiles = selectedItems.filter(item => item.type === 'file');
  const selectedFolders = selectedItems.filter(item => item.type === 'folder');
  const totalSize = selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);

  const handleRestoreWithProgress = async () => {
    setShowProgress(true);
    setProgress({ completed: 0, total: selectedCount, current: '' });

    try {
      await onRestoreSelected();
    } finally {
      setShowProgress(false);
    }
  };

  const handleDeleteWithProgress = async () => {
    setShowProgress(true);
    setProgress({ completed: 0, total: selectedCount, current: '' });

    try {
      await onDeleteSelected();
    } finally {
      setShowProgress(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Main Bulk Actions Bar */}
      <div className={`sticky top-0 z-10 flex items-center justify-between p-4 rounded-lg border shadow-sm ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          {/* Selection Summary */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-mint-900/20 text-mint-400' : 'bg-mint-100 text-mint-600'}`}>
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {selectedFiles.length > 0 && selectedFolders.length > 0 && (
                  <span>{selectedFiles.length} files, {selectedFolders.length} folders</span>
                )}
                {selectedFiles.length > 0 && selectedFolders.length === 0 && (
                  <span>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</span>
                )}
                {selectedFiles.length === 0 && selectedFolders.length > 0 && (
                  <span>{selectedFolders.length} folder{selectedFolders.length !== 1 ? 's' : ''}</span>
                )}
                {totalSize > 0 && (
                  <span> • {formatFileSize(totalSize)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            {selectedFiles.length > 0 && (
              <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>{selectedFiles.length} files</span>
              </div>
            )}
            {selectedFolders.length > 0 && (
              <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <FolderIcon className="h-4 w-4" />
                <span>{selectedFolders.length} folders</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestoreWithProgress}
            disabled={isLoading}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'bg-mint-700 text-mint-100 hover:bg-mint-600'
                : 'bg-mint-600 text-white hover:bg-mint-700'
            }`}
          >
            {isLoading ? (
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArchiveBoxIcon className="h-4 w-4 mr-2" />
            )}
            Restore Selected
          </button>

          <button
            onClick={handleDeleteWithProgress}
            disabled={isLoading}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'bg-red-900 text-red-300 hover:bg-red-800'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Selected
          </button>

          <button
            onClick={onExportList}
            disabled={isLoading}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>

          <button
            onClick={onClearSelection}
            disabled={isLoading}
            className={`text-sm underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'text-mint-300 hover:text-mint-100'
                : 'text-mint-600 hover:text-mint-700'
            }`}
          >
            Clear selection
          </button>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`max-w-md w-full mx-4 p-6 rounded-lg shadow-xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="text-center">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                isDarkMode ? 'bg-mint-900/20 text-mint-400' : 'bg-mint-100 text-mint-600'
              }`}>
                <ArrowPathIcon className="h-6 w-6 animate-spin" />
              </div>
              
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Processing Items
              </h3>
              
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {progress.current || 'Preparing to process selected items...'}
              </p>

              {/* Progress Bar */}
              <div className={`w-full h-2 rounded-full mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-2 rounded-full bg-mint-500 transition-all duration-300"
                  style={{ 
                    width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%' 
                  }}
                />
              </div>

              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {progress.completed} of {progress.total} items processed
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}