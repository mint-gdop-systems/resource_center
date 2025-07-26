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
  files: FileItem[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  viewMode: ViewMode;
  onNavigateToFolder?: (folderName: string) => void;
  isAuthenticated?: boolean;
  setShowUpload?: (show: boolean) => void;
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
}: FileGridProps) {
  const { deleteFiles, renameFile, moveFiles, toggleStar, starFiles } =
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

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") {
      onNavigateToFolder?.(file.id);
    } else {
      // Open file - in real app would open preview or download
      if (
        file.extension === "pdf" ||
        file.extension === "jpg" ||
        file.extension === "png"
      ) {
        window.open(`#/preview/${file.id}`, "_blank");
      } else {
        // Trigger download
        const link = document.createElement("a");
        link.href = "#"; // Would be actual file URL
        link.download = file.name;
        link.click();
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

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {isAuthenticated && files.length > 0 && (
        <BulkActions
          selectedFiles={selectedFiles}
          onDownload={(fileIds) => {
            // Download implementation would go here
            console.log("Bulk download:", fileIds);
          }}
          onDelete={deleteFiles}
          onMove={moveFiles}
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
                    onDelete={(fileId) => deleteFiles([fileId])}
                    onMove={(fileId, targetPath) =>
                      moveFiles([fileId], targetPath)
                    }
                    onStar={(fileId) => toggleStar(fileId)}
                  />
                </div>

                {/* Star icon */}
                <div className="absolute top-3 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle star toggle
                    }}
                    className="p-1 text-gray-400 hover:text-yellow-500"
                  >
                    {file.starred ? (
                      <StarIconSolid className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-4 w-4" />
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
                    onClick={e => {
                      e.stopPropagation();
                      handleFileClick(file);
                    }}
                  >
                    {file.name}
                  </h3>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                      {file.size && (
                        <span className="text-xs">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                    </div>
                    <div className="truncate">{file.owner.name}</div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex space-x-1">
                    {file.shared && (
                      <div className="w-2 h-2 bg-mint-400 rounded-full" />
                    )}
                    {file.starred && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
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

      {/* Empty state */}
      {files.length === 0 && (
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
      )}
    </div>
  );
}
