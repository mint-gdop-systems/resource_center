import React from "react";
import { motion } from "framer-motion";
import {
  StarIcon,
  DocumentIcon,
  FolderIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { FileItem, ViewMode } from "../../types";
import { formatFileSize } from "../../lib/utils";
import { fileTypeIcons } from "../../data/mockData";
import FileActions from "./FileActions";
import BulkActions from "./BulkActions";
import { useFiles } from "../../contexts/FileContext";
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
}: FileGridProps) {
  const { deleteFiles, renameFile, moveFiles, toggleStar, starFiles, toggleArchive, downloadFiles } =
    useFiles();
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
    files.length > 0 && files.every((file) => selectedFiles.includes(file.id));
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
            <p className="mt-1 text-sm text-gray-500">
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sign in to view files</h3>
            <p className="mt-1 text-sm text-gray-500">
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
      {isAuthenticated && files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file, index) => {
            const isSelected = selectedFiles.includes(file.id);

            // Handler to prevent card click when clicking on interactive elements
            const handleCardClick = (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('input[type="checkbox"]') ||
                target.closest('.file-actions-menu')
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
                className={`group relative bg-white border rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-mint-300 bg-mint-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
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
                    onStar={(fileId) => toggleStar(fileId)}
                    onArchive={(fileId) => (onArchiveOverride ? onArchiveOverride(fileId) : toggleArchive(fileId))}
                  />
                </div>

                {/* Star icon */}
                <div className="absolute top-3 right-8">
                  <button
                    aria-label={file.is_starred ? 'Unstar' : 'Star'}
                    title={file.is_starred ? 'Unstar' : 'Star'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(file.id);
                    }}
                    className={`p-1 rounded hover:bg-gray-100`}
                  >
                    {file.is_starred ? (
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
                    className="text-sm font-medium text-gray-900 truncate hover:underline cursor-pointer"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleFileClick(file);
                    }}
                  >
                    {file.name}
                  </h3>
                  <div className="text-xs text-gray-500 space-y-0.5">
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
                      <span className="ml-1 text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">Archived</span>
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
    </div>
  );
}
