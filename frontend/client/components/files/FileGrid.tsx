import React from "react";
import { motion } from "framer-motion";
import {
  StarIcon,
  FolderIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { FileItem, ViewMode } from "../../types";
import { formatFileSize } from "../../lib/utils";
import FileActions from "./FileActions";
import BulkActions from "./BulkActions";
import { useFiles } from "../../contexts/FileContext";
import { useTheme } from "../../contexts/ThemeContext";
import { usePagination } from "../../hooks/usePagination";
import PaginationComponent from "../ui/PaginationComponent";
// FontAwesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileImage,
  faFileAlt,
  faFileArchive,
  faFolder,
  faFile,
} from '@fortawesome/free-solid-svg-icons';
// File type to FontAwesome icon mapping
const fileTypeIconMap: Record<string, any> = {
  pdf: faFilePdf,
  doc: faFileWord,
  docx: faFileWord,
  xls: faFileExcel,
  xlsx: faFileExcel,
  ppt: faFilePowerpoint,
  pptx: faFilePowerpoint,
  jpg: faFileImage,
  jpeg: faFileImage,
  png: faFileImage,
  gif: faFileImage,
  txt: faFileAlt,
  zip: faFileArchive,
  rar: faFileArchive,
  folder: faFolder,
};

interface FileGridProps {
  files: any[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  viewMode: ViewMode;
  onNavigateToFolder?: (folderId: string) => void;
  isAuthenticated?: boolean;
  setShowUpload?: (show: boolean) => void;
  onArchiveOverride?: (fileId: string) => void;
  itemsPerPage?: number;
  showPagination?: boolean;
  onToggleStar?: (fileId: string) => void;
  onBulkStar?: (fileIds: string[], starred: boolean) => void;
}

export default function FileGrid({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  viewMode,
  onNavigateToFolder,
  isAuthenticated = true,
  setShowUpload,
  onArchiveOverride,
  itemsPerPage = 24,
  showPagination = true,
  onToggleStar,
  onBulkStar,
}: FileGridProps) {
  const { deleteFiles, renameFile, moveFiles, toggleStar, starFiles, toggleArchive } =
    useFiles();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  // Pagination
  const pagination = usePagination({
    totalItems: files.length,
    itemsPerPage,
    initialPage: 1,
  });

  const paginatedFiles = showPagination ? pagination.getPageItems(files) : files;
  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") {
      return <FontAwesomeIcon icon={faFolder} className="text-yellow-500 h-8 w-8" />;
    }
    const icon = fileTypeIconMap[file.extension?.toLowerCase() || ""] || faFile;
    // Color by type (optional, can adjust)
    let colorClass = "text-blue-500";
    if (icon === faFilePdf) colorClass = "text-red-600";
    if (icon === faFileWord) colorClass = "text-blue-700";
    if (icon === faFileExcel) colorClass = "text-green-600";
    if (icon === faFilePowerpoint) colorClass = "text-orange-500";
    if (icon === faFileImage) colorClass = "text-pink-500";
    if (icon === faFileArchive) colorClass = "text-yellow-600";
    if (icon === faFileAlt) colorClass = "text-gray-500";
    return <FontAwesomeIcon icon={icon} className={`${colorClass} h-8 w-8`} />;
  };

  const handleFileClick = async (file: FileItem) => {
    if (file.type === "folder") {
      onNavigateToFolder?.(file.id);
    } else {
      try {
        // Import the viewFile API function
        const { viewFile } = await import('../../services/api');

        // Use the API to get the file
        const url = await viewFile(file.id);
        window.open(url, '_blank');

        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch (error) {
        console.error('Error viewing file:', error);
        // Show user-friendly error message
        const { default: toast } = await import('react-hot-toast');
        toast.error('Failed to open file. Please try again.');
      }
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const isSelected = selectedFiles.includes(fileId);
    onFileSelect(fileId, !isSelected);
  };

  const allSelected =
    paginatedFiles.length > 0 && paginatedFiles.every((file) => selectedFiles.includes(file.id));
  const someSelected = selectedFiles.length > 0 && !allSelected;

  // Get selected items for copy operations
  const selectedItems = files.filter(file => selectedFiles.includes(file.id));

  // Empty state
  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
        {isAuthenticated ? (
          <>
            <h3 className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>No files</h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
              Get started by uploading a file or creating a folder.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowUpload?.(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-mint-600 hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500"
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Upload your first file
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Sign in to view files</h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
              Please sign in to access and manage your files
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {isAuthenticated && files.length > 0 && (
        <BulkActions
          selectedFiles={selectedFiles}
          selectedItems={selectedItems}
          onDownload={(fileIds) => {
            console.log("Download files:", fileIds);
            // TODO: Implement download functionality
          }}
          onDelete={deleteFiles}
          onMove={(_, targetPath) => {
            const fileIds = selectedItems.map(item => item.id);
            moveFiles(fileIds, "target-path"); // TODO: Implement proper target path selection
          }}
          onShare={(fileIds) => {
            // Share implementation would go here
            console.log("Bulk share:", fileIds);
          }}
          onStar={onBulkStar || starFiles}
          onClearSelection={() => onSelectAll(false)}
        />
      )}

      {/* Header with select all */}
      {isAuthenticated && files.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} selected`
                : `${files.length} items`}
            </span>
          </div>
        </div>
      )}

      {/* Grid */}
      {isAuthenticated && paginatedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginatedFiles.map((file, index) => {
            const isSelected = selectedFiles.includes(file.id);

            // Handler to prevent card click when clicking on interactive elements
            const handleCardClick = (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('input[type="checkbox"]') ||
                target.closest('.file-actions-menu') ||
                target.closest('h3') // Prevent card click when clicking on file name
              ) {
                return;
              }
              // Toggle selection instead of opening file
              toggleFileSelection(file.id);
            };

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`group relative border rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${isSelected
                  ? `border-mint-300 shadow-sm ${isDarkMode ? 'bg-mint-900' : 'bg-mint-50'
                  }`
                  : `${isDarkMode
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }`
                  }`}
                onClick={handleCardClick}
              >
                {/* Selection checkbox */}
                <div className="absolute top-3 left-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={e => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.id);
                    }}
                    className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                  />
                </div>

                {/* More actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FileActions
                    file={file}
                    onRename={renameFile}
                    onDelete={() => deleteFiles([file.id])}
                    onMove={(fileId, targetPath) => {
                      // This is handled by the FolderSelectionModal in FileActions now
                    }}
                    onStar={(fileId) => onToggleStar ? onToggleStar(fileId) : toggleStar(fileId)}
                    onArchive={(fileId) => (onArchiveOverride ? onArchiveOverride(fileId) : toggleArchive(fileId))}
                  />
                </div>

                {/* Star icon */}
                <div className="absolute top-3 right-8">
                  <button
                    aria-label={file.starred ? 'Unstar' : 'Star'}
                    title={file.starred ? 'Unstar' : 'Star'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleStar) {
                        onToggleStar(file.id);
                      } else {
                        toggleStar(file.id);
                      }
                    }}
                    className={`p-1 rounded hover:bg-gray-100`}
                  >
                    {file.starred ? (
                      <StarIconSolid className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* File icon */}
                <div className="flex justify-center mb-3">
                  {getFileIcon(file)}
                </div>

                {/* File info */}
                <div className="space-y-1">
                  <h3
                    className={`text-sm font-medium truncate hover:underline cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleFileClick(file);
                    }}
                  >
                    {file.name}
                  </h3>
                  <div className={`text-xs space-y-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                      {file.file_size && (
                        <span className="text-xs">
                          {formatFileSize(file.file_size)}
                        </span>
                      )}
                    </div>
                    <div className="truncate">{file.owner_first_name || file.owner_email || 'Unknown'}</div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex space-x-1 items-center">
                    {file.shared && (
                      <div className="w-2 h-2 bg-mint-400 rounded-full" />
                    )}
                    {file.starred && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                    )}
                    {file.archived && (
                      <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${isDarkMode
                        ? 'text-gray-300 bg-gray-700'
                        : 'text-gray-600 bg-gray-100'
                        }`}>Archived</span>
                    )}
                  </div>
                  {file.type === "folder" && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      Folder
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {showPagination && files.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Pagination Info and Items Per Page Selector */}
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-center gap-4">
              <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Showing {pagination.startIndex + 1} to {Math.min(pagination.endIndex + 1, files.length)} of {files.length} files
              </div>
              {pagination.totalPages > 1 && (
                <div className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }`}>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                Show:
              </span>
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => pagination.setItemsPerPage(Number(e.target.value))}
                className={`px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                  : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                  }`}
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                per page
              </span>
            </div>
          </div>

          {/* Pagination Component */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <PaginationComponent
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                showFirstLast={true}
                showPreviousNext={true}
                maxVisiblePages={7}
                size="default"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
