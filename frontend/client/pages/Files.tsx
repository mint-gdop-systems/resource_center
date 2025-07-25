import React, { useState, useMemo } from "react";
import {
  ViewColumnsIcon,
  ListBulletIcon,
  PlusIcon,
  FunnelIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Breadcrumb from "../components/layout/Breadcrumb";
import FileGrid from "../components/files/FileGrid";
import FileList from "../components/files/FileList";
import FileUpload from "../components/files/FileUpload";
import FolderModal from "../components/ui/FolderModal";
import { ViewMode, SearchFilters } from "../types";
import { useFiles } from "../contexts/FileContext";
import { useFileNavigation } from "../hooks/useFileNavigation";
import toast from "react-hot-toast";
import { useCallback } from "react";

export default function Files() {
  const { files, createFolder, fetchFiles } = useFiles();
  const {
    currentPath,
    currentFiles: navigationFiles,
    navigateToFolder,
    navigateToPath,
    navigateToRoot,
  } = useFileNavigation(files);

  // Default: list view, sort by date (newest first)
  const [viewMode, setViewMode] = useState<ViewMode>({
    type: "list",
    sortBy: "date",
    sortOrder: "desc",
  });
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFolderModal, setShowFolderModal] = useState(false);

  // Search and filter files with proper logic
  const filteredFiles = useMemo(() => {
    let filtered = navigationFiles;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((file) => {
        // Name match
        const nameMatch = file.name?.toLowerCase().includes(query);
        // Category match (object with name, or string)
        let categoryMatch = false;
        if (file.category) {
          if (typeof file.category === 'object' && file.category !== null && 'name' in file.category) {
            categoryMatch = (file.category.name ?? '').toLowerCase().includes(query);
          } else if (typeof file.category === 'string') {
            categoryMatch = file.category.toLowerCase().includes(query);
          }
        }
        // Extension match
        const extMatch = file.extension?.toLowerCase().includes(query);
        return nameMatch || categoryMatch || extMatch;
      });
    }

    // Apply other filters
    if (filters.starred !== undefined) {
      filtered = filtered.filter((file) => file.starred === filters.starred);
    }

    if (filters.shared !== undefined) {
      filtered = filtered.filter((file) => file.shared === filters.shared);
    }

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((file) => {
        if (file.type === "folder") {
          return filters.type!.includes("folder");
        }
        return filters.type!.includes(file.extension || "");
      });
    }

    return filtered;
  }, [navigationFiles, searchQuery, filters]);

  // Sort files with proper typing and correct logic for all options
  const sortedFiles = useMemo(() => {
    // Separate folders and files
    const folders = filteredFiles.filter(f => f.type === 'folder');
    const files = filteredFiles.filter(f => f.type !== 'folder');
    const direction = viewMode.sortOrder === "asc" ? 1 : -1;
    const sortFn = (a: any, b: any) => {
      switch (viewMode.sortBy) {
        case "name":
          return direction * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case "date": {
          // Folders: use createdAt, Files: use updatedAt
          const aDate = a.type === 'folder' ? a.createdAt : a.updatedAt;
          const bDate = b.type === 'folder' ? b.createdAt : b.updatedAt;
          return direction * (aDate.getTime() - bDate.getTime());
        }
        case "size":
          return direction * ((a.size || 0) - (b.size || 0));
        case "type":
          return direction * ((a.extension || '').localeCompare(b.extension || '', undefined, { sensitivity: 'base' }));
        default:
          return 0;
      }
    };
    // Sort folders and files separately, then combine
    const sortedFolders = [...folders].sort(sortFn);
    const sortedFilesArr = [...files].sort(sortFn);
    return [...sortedFolders, ...sortedFilesArr];
  }, [filteredFiles, viewMode.sortBy, viewMode.sortOrder]);

  // Helper to reconstruct the full folder path (names) from current folder up to root
  function getFolderPathNames(folderId: string, allFolders: any[]): { id: string, name: string }[] {
    const path: { id: string, name: string }[] = [];
    let current = allFolders.find(f => f.id === folderId);
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = current.parent ? allFolders.find(f => f.id === current.parent) : undefined;
    }
    return path;
  }

  // Find all folders in the current files list (should include parents and subfolders)
  const allFolders = files.filter(f => f.type === 'folder');

  // If in a folder, reconstruct the full path of folder names
  const folderPath = currentPath.length > 0
    ? getFolderPathNames(currentPath[currentPath.length - 1], allFolders)
    : [];

  // Generate breadcrumb items with proper navigation
  const breadcrumbItems = [
    {
      id: "files",
      name: "My Files",
      path: "/files",
    },
    ...folderPath.map((folder, index) => ({
      id: folder.id,
      name: folder.name,
      path: `/files/${folderPath.slice(0, index + 1).map(f => f.id).join("/")}`,
    })),
  ];

  // Handler for breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback((path: string) => {
    if (path === "/files") {
      navigateToRoot();
    } else {
      // Extract folder IDs from the path
      const ids = path.replace(/^\/files\/?/, "").split("/").filter(Boolean);
      navigateToPath(ids);
    }
  }, [navigateToRoot, navigateToPath]);

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
      setSelectedFiles(sortedFiles.map((file) => file.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleCreateFolder = () => {
    setShowFolderModal(true);
  };

  const handleFolderModalCreate = async (name: string) => {
    await createFolder(name, currentPath);
    setShowFolderModal(false);
    // Optionally, refresh the file list for the current folder
    const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
    await fetchFiles(parentId);
  };

  const handleFolderModalClose = () => {
    setShowFolderModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <Breadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {currentPath.length === 0
              ? "My Files"
              : (folderPath.length > 0 ? folderPath[folderPath.length - 1].name : currentPath[currentPath.length - 1])}
          </h1>
          <p className="text-gray-600">
            {sortedFiles.length} item{sortedFiles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreateFolder}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Folder
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center px-4 py-2 bg-mint-600 text-white text-sm font-medium rounded-lg hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Upload Files
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* View controls */}
          <div className="flex items-center space-x-2">
            {/* Sort */}
            <select
              value={`${viewMode.sortBy}-${viewMode.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split("-");
                setViewMode((prev) => ({
                  ...prev,
                  sortBy: sortBy as "name" | "date" | "size" | "type",
                  sortOrder: sortOrder as "asc" | "desc",
                }));
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint-500"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="size-desc">Largest first</option>
              <option value="size-asc">Smallest first</option>
            </select>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters
                  ? "bg-mint-100 text-mint-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FunnelIcon className="h-5 w-5" />
            </button>

            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode.type === "grid"
                    ? "bg-white text-mint-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ViewColumnsIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode.type === "list"
                    ? "bg-white text-mint-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Type
                </label>
                <select
                  multiple
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-500"
                  onChange={(e) => {
                    const values = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    );
                    setFilters((prev) => ({ ...prev, type: values }));
                  }}
                >
                  <option value="folder">Folders</option>
                  <option value="pdf">PDF Documents</option>
                  <option value="docx">Word Documents</option>
                  <option value="xlsx">Excel Sheets</option>
                  <option value="pptx">PowerPoint</option>
                  <option value="jpg">Images</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.starred}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          starred: e.target.checked ? true : undefined,
                        }))
                      }
                      className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Starred only
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.shared}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          shared: e.target.checked ? true : undefined,
                        }))
                      }
                      className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Shared files
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({});
                    setSearchQuery("");
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mint-500"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* File listing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <motion.div
            key={viewMode.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode.type === "grid" ? (
              <FileGrid
                files={sortedFiles}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onSelectAll={handleSelectAll}
                viewMode={viewMode}
                onNavigateToFolder={navigateToFolder}
              />
            ) : (
              <FileList
                files={sortedFiles}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onSelectAll={handleSelectAll}
                viewMode={viewMode}
                onNavigateToFolder={navigateToFolder}
                onShowUpload={() => setShowUpload(true)}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          currentPath={currentPath}
        />
      )}
      {/* Folder Modal */}
      <FolderModal
        open={showFolderModal}
        onClose={handleFolderModalClose}
        onCreate={handleFolderModalCreate}
      />
    </div>
  );
}
