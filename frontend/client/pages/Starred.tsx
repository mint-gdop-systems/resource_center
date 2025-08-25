import React, { useState } from "react";
import { StarIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Breadcrumb from "../components/layout/Breadcrumb";
import FileGrid from "../components/files/FileGrid";
import FileList from "../components/files/FileList";
import { ViewColumnsIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { ViewMode } from "../types";
import { useFiles } from "../contexts/FileContext";
import { useTheme } from "../contexts/ThemeContext";

export default function Starred() {
  const { files } = useFiles();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>({
    type: "grid",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const starredFiles = files.filter((file) => file.starred);

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
      </div>

      <div className={`rounded-xl shadow-sm border ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
        }`}>
        <div className="p-6">
          {starredFiles.length > 0 ? (
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
                />
              ) : (
                <FileList
                  files={starredFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                  viewMode={viewMode}
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
