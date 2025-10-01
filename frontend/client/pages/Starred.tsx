import React, { useState, useEffect, useCallback } from "react";
import { StarIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Breadcrumb from "../components/layout/Breadcrumb";
import FileGrid from "../components/files/FileGrid";
import FileList from "../components/files/FileList";
import { ViewColumnsIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { ViewMode } from "../types";
import { useFiles } from "../contexts/FileContext";
import { useTheme } from "../contexts/ThemeContext";
import { getFiles } from "../services/api";
import toast from "react-hot-toast";

export default function Starred() {
  const { refreshStarredCount, toggleStar, starFiles } = useFiles();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>({
    type: "grid",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [starredFiles, setStarredFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch starred files directly from API
  const fetchStarredFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFiles(undefined, { starred: true });
      const files = [...(data.files || []), ...(data.folders || [])].map((item) => {
        const isFile = !!item.file_type;
        return {
          ...item,
          id: item.id.toString(),
          name: item.name,
          parentId: isFile ? (item.folder ? item.folder.toString() : undefined) : (item.parent ? item.parent.toString() : undefined),
          type: isFile ? 'file' : 'folder',
          createdAt: new Date(item.uploaded_at || item.created_at),
          updatedAt: new Date(item.updated_at || item.created_at),
          owner: {
            id: item.owner_email,
            name: item.owner_first_name || 'Unknown User',
            email: item.owner_email,
            department: 'General',
            role: 'employee',
          },
          size: isFile ? item.file_size : undefined,
          extension: isFile ? item.file_type : undefined,
          starred: Boolean(item.is_starred),
          archived: Boolean(item.is_archived),
          shared: Boolean(item.is_shared),
        };
      });
      setStarredFiles(files);
    } catch (error: any) {
      toast.error(`Failed to fetch starred files: ${error?.message || 'Unknown error'}`);
      setStarredFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch starred files on component mount
  useEffect(() => {
    fetchStarredFiles();
  }, [fetchStarredFiles]);

  // Custom toggle star function that refreshes the starred files list
  const handleToggleStar = useCallback(async (fileId: string) => {
    try {
      await toggleStar(fileId);
      // Refresh the starred files list after toggling
      await fetchStarredFiles();
      await refreshStarredCount();
    } catch (error) {
      // Error is already handled in toggleStar
    }
  }, [toggleStar, fetchStarredFiles, refreshStarredCount]);

  // Custom bulk star function that refreshes the starred files list
  const handleStarFiles = useCallback(async (fileIds: string[], starred: boolean) => {
    try {
      await starFiles(fileIds, starred);
      // Refresh the starred files list after bulk operation
      await fetchStarredFiles();
      await refreshStarredCount();
    } catch (error) {
      // Error is already handled in starFiles
    }
  }, [starFiles, fetchStarredFiles, refreshStarredCount]);

  const breadcrumbItems = [
    { id: "starred", name: "Starred", path: "/starred" },
  ];

  const handleViewModeChange = (type: "grid" | "list") => {
    setViewMode((prev) => ({ ...prev, type }));
  };

  const handleFileSelect = (fileId: string, selected: boolean) => {
    if (selected) {
      setSelectedFiles((prev) => [...prev, fileId]);
    } else {
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedFiles(starredFiles.map((file) => file.id));
    } else {
      setSelectedFiles([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className={`mt-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
            Starred Files
          </h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {starredFiles.length} starred file
            {starredFiles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {starredFiles.length > 0 && (
            <div className={`flex items-center rounded-lg p-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
              <button
                onClick={() => handleViewModeChange("grid")}
                className={`p-2 rounded-md transition-colors ${viewMode.type === "grid"
                  ? `text-mint-600 shadow-sm ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`
                  : `${isDarkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-500 hover:text-gray-700'
                  }`
                  }`}
              >
                <ViewColumnsIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange("list")}
                className={`p-2 rounded-md transition-colors ${viewMode.type === "list"
                  ? `text-mint-600 shadow-sm ${isDarkMode ? 'bg-gray-600' : 'bg-white'}`
                  : `${isDarkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-500 hover:text-gray-700'
                  }`
                  }`}
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            onClick={fetchStarredFiles}
            disabled={loading}
            className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm transition-colors ${
              isDarkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
            }`}
            title="Refresh starred files"
          >
            <svg className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
        }`}>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                isDarkMode ? 'border-mint-400' : 'border-mint-600'
              }`}></div>
              <span className={`ml-3 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Loading starred files...</span>
            </div>
          ) : starredFiles.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {viewMode.type === "grid" ? (
                <FileGrid
                  files={starredFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                  viewMode={viewMode}
                  itemsPerPage={24}
                  showPagination={true}
                  // Pass custom toggle star function
                  onToggleStar={handleToggleStar}
                  onBulkStar={handleStarFiles}
                />
              ) : (
                <FileList
                  files={starredFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                  viewMode={viewMode}
                  itemsPerPage={20}
                  showPagination={true}
                  // Pass custom toggle star function
                  onToggleStar={handleToggleStar}
                  onBulkStar={handleStarFiles}
                />
              )}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <StarIcon className={`mx-auto h-16 w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              <h3 className={`mt-4 text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                No starred files
              </h3>
              <p className={`mt-2 max-w-sm mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                Star your important files to find them quickly. Click the star
                icon on any file to add it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
