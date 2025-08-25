import React from "react";
import { motion } from "framer-motion";
import {
  StarIcon,
  DocumentIcon,
  FolderIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CloudArrowUpIcon,
  ArchiveBoxIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { FileItem, ViewMode } from "../../types";
import { formatFileSize, formatDate } from "../../lib/utils";
import { fileTypeIcons } from "../../data/mockData";
import FileActions from "./FileActions";
import BulkActions from "./BulkActions";
import { useFiles } from "../../contexts/FileContext";
import { useTheme } from "../../contexts/ThemeContext";
import FileIcon from "./FileIcon";

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
  faFile,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';

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
};

interface FileListProps {
  files: any[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  viewMode: ViewMode;
  onNavigateToFolder?: (folderId: string) => void;
  isAuthenticated?: boolean;
  setShowUpload?: (show: boolean) => void;
  onArchiveOverride?: (fileId: string) => void;
  actionsMode?: "default" | "archive";
  onDeleteOverride?: (fileId: string) => void;
  showBulkActions?: boolean;
}



export default function FileList({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  viewMode,
  onNavigateToFolder,
  isAuthenticated = true,
  setShowUpload,
  onArchiveOverride,
  actionsMode = "default",
  onDeleteOverride,
  showBulkActions = true,
}: FileListProps) {
  const { deleteFiles, renameFile, moveFiles, toggleStar, starFiles, toggleArchive, downloadFiles } =
    useFiles();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const handleView = async (fileId: string) => {
    const f = files.find(x => x.id === fileId);
    if (f && f.type !== 'folder') {
      try {
        // Import the viewFile API function
        const { viewFile } = await import('../../services/api');
        
        // Use the API to get the file
        const url = await viewFile(fileId);
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

  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") {
      return <FontAwesomeIcon icon={faFolder} className="text-yellow-500 h-5 w-5" />;
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
    return <FontAwesomeIcon icon={icon} className={`${colorClass} h-5 w-5`} />;
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
    files.length > 0 && files.every((file) => selectedFiles.includes(file.id));
  const someSelected = selectedFiles.length > 0 && !allSelected;

  // Get selected items for copy operations
  const selectedItems = files.filter(file => selectedFiles.includes(file.id));

  const SortButton = ({
    label,
    sortKey,
  }: {
    label: string;
    sortKey: string;
  }) => (
    <button className={`flex items-center space-x-1 text-xs font-medium ${
      isDarkMode 
        ? 'text-gray-400 hover:text-gray-300' 
        : 'text-gray-500 hover:text-gray-700'
    }`}>
      <span>{label}</span>
      {viewMode.sortBy === sortKey && (
        <div>
          {viewMode.sortOrder === "asc" ? (
            <ArrowUpIcon className="h-3 w-3" />
          ) : (
            <ArrowDownIcon className="h-3 w-3" />
          )}
        </div>
      )}
    </button>
  );

  // Empty state
  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
        {isAuthenticated ? (
          <>
            <h3 className={`mt-2 text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>No files</h3>
            <p className={`mt-1 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
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
            <h3 className={`mt-2 text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Sign in to view files</h3>
            <p className={`mt-1 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
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
      {showBulkActions && (
      <BulkActions
        selectedFiles={selectedFiles}
        selectedItems={selectedItems}
        onView={handleView}
        onDownload={downloadFiles}
        onDelete={deleteFiles}
        onMove={(fileIds, targetPath) => {
          // Convert old interface to new interface
          const fileIdsArray = selectedItems.filter(item => item.type === 'file').map(item => item.id);
          const folderIdsArray = selectedItems.filter(item => item.type === 'folder').map(item => item.id);
          moveFiles(fileIdsArray, folderIdsArray);
        }}
        onShare={(fileIds) => {
          // Share implementation would go here
          console.log("Bulk share:", fileIds);
        }}
        onStar={starFiles}
        onClearSelection={() => onSelectAll(false)}
      />
      )}

      {/* Table header */}
      {files.length > 0 && (
        <div className={`rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wide ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
              />
            </div>
            <div className="col-span-3">
              <SortButton label="Name" sortKey="name" />
            </div>
            <div className="col-span-2">
              <SortButton label="Owner" sortKey="owner" />
            </div>
            <div className="col-span-2">
              <SortButton label="Category" sortKey="category" />
            </div>
            <div className="col-span-2">
              <SortButton label="Modified" sortKey="date" />
            </div>
            <div className="col-span-1">
              <SortButton label="Size" sortKey="size" />
            </div>
            <div className="col-span-1"></div>
          </div>
        </div>
      )}

      {/* File list */}
      <div className="space-y-1">
        {files.map((file, index) => {
          const isSelected = selectedFiles.includes(file.id);

          // Handler to prevent row click when clicking on interactive elements
          const handleRowClick = (e: React.MouseEvent) => {
            const target = e.target as HTMLElement;
            // If the click is on a button, input, file name, or inside FileActions, do nothing
            if (
              target.closest('button') ||
              target.closest('input[type="checkbox"]') ||
              target.closest('.file-actions-menu') ||
              target.closest('p') // Prevent row click when clicking on file name
            ) {
              return;
            }
            // Toggle selection instead of opening file
            toggleFileSelection(file.id);
          };

          return (
            <motion.div
              key={`${file.type}-${file.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`group grid grid-cols-12 gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected
                  ? `border border-mint-200 ${
                      isDarkMode ? 'bg-mint-900' : 'bg-mint-50'
                    }`
                  : `border border-transparent ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`
              }`}
              onClick={handleRowClick}
              tabIndex={0}
              role="row"
              aria-selected={isSelected}
            >
              {/* Checkbox */}
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={e => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleFileSelection(file.id);
                  }}
                  className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded cursor-pointer"
                  aria-label={`Select ${file.name}`}
                />
              </div>

              {/* Name */}
              <div className="col-span-3 flex items-center space-x-3 min-w-0">
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate hover:underline cursor-pointer ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleFileClick(file);
                    }}
                  >
                    {file.name}
                  </p>
                  {file.type === "folder" && (
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Folder</p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    aria-label={file.starred ? 'Unstar' : 'Star'}
                    title={file.starred ? 'Unstar' : 'Star'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(file.id);
                    }}
                    className={`p-1 rounded hover:bg-gray-100`}
                  >
                    {file.starred ? (
                      <StarIconSolid className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  {file.shared && (
                    <div className="w-2 h-2 bg-mint-400 rounded-full" />
                  )}
                  {file.archived && (
                    <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${
                      isDarkMode 
                        ? 'text-gray-300 bg-gray-700' 
                        : 'text-gray-600 bg-gray-100'
                    }`}>Archived</span>
                  )}
                </div>
              </div>

              {/* Owner */}
              <div className="col-span-2 flex items-center">
                <div className="flex items-center space-x-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    <span className={`text-xs font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {(file.owner_first_name || file.owner_email || file.uploaded_by_name || file.owner?.name || "Unknown").charAt(0)}
                    </span>
                  </div>
                  <span className={`text-sm truncate ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {file.owner_first_name || file.owner_email || file.uploaded_by_name || file.owner?.name || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-500">
                {file.type === "folder"
                  ? "—"
                  : file.category == null
                    ? "—"
                    : typeof file.category === 'object' && "name" in file.category
                      ? (file.category.name ?? "—")
                      : file.category}
                </span>
              </div>

              {/* Modified */}
              <div className="col-span-2 flex items-center">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {file.type === 'folder' 
                    ? formatDate(new Date(file.createdAt))
                    : formatDate(new Date(file.uploaded_at))}
                </span>
              </div>

              {/* Size */}
              <div className="col-span-1 flex items-center">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {file.size ? formatFileSize(file.size) : "—"}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end">
                {actionsMode === "archive" ? (
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Unarchive"
                      title="Unarchive"
                      onClick={(e) => { e.stopPropagation(); (onArchiveOverride ? onArchiveOverride(file.id) : toggleArchive(file.id)); }}
                      className="p-2 rounded-md hover:bg-gray-100"
                    >
                      <ArchiveBoxIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      aria-label="Delete"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); onDeleteOverride ? onDeleteOverride(file.id) : deleteFiles([file.id]); }}
                      className="p-2 rounded-md hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ) : (
                <div className="file-actions-menu">
                  <FileActions
                    file={file}
                    onRename={renameFile}
                    onDelete={() => deleteFiles([file.id])}
                    onMove={(fileId, targetPath) => {
                      // This is handled by the FolderSelectionModal in FileActions now
                    }}
                    onStar={(fileId) => toggleStar(fileId)}
                    onArchive={(fileId) => (onArchiveOverride ? onArchiveOverride(fileId) : toggleArchive(fileId))}
                  />
                </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
