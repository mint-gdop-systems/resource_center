import React from "react";
import { motion } from "framer-motion";
import {
  StarIcon,
  DocumentIcon,
  FolderIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { FileItem, ViewMode } from "../../types";
import { formatFileSize, formatDate } from "../../data/mockData";
import FileActions from "./FileActions";
import BulkActions from "./BulkActions";
import { useFiles } from "../../contexts/FileContext";

interface FileListProps {
  files: FileItem[];
  selectedFiles: string[];
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  viewMode: ViewMode;
  onNavigateToFolder?: (folderName: string) => void;
}

export default function FileList({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  viewMode,
  onNavigateToFolder,
}: FileListProps) {
  const { deleteFiles, renameFile, moveFiles, toggleStar, starFiles } =
    useFiles();

  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") {
      return <FolderIcon className="h-5 w-5 text-mint-600" />;
    }

    const extensionColors: Record<string, string> = {
      pdf: "text-red-600",
      doc: "text-blue-600",
      docx: "text-blue-600",
      xls: "text-green-600",
      xlsx: "text-green-600",
      ppt: "text-orange-600",
      pptx: "text-orange-600",
      jpg: "text-purple-600",
      jpeg: "text-purple-600",
      png: "text-purple-600",
    };

    const colorClass = extensionColors[file.extension || ""] || "text-gray-600";

    return <DocumentIcon className={`h-5 w-5 ${colorClass}`} />;
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") {
      onNavigateToFolder?.(file.name);
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

  const SortButton = ({
    label,
    sortKey,
  }: {
    label: string;
    sortKey: string;
  }) => (
    <button className="flex items-center space-x-1 text-xs font-medium text-gray-500 hover:text-gray-700">
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

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
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

      {/* Table header */}
      {files.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
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
            <div className="col-span-5">
              <SortButton label="Name" sortKey="name" />
            </div>
            <div className="col-span-2">
              <SortButton label="Owner" sortKey="owner" />
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

          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className={`group grid grid-cols-12 gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "bg-mint-50 border border-mint-200"
                  : "hover:bg-gray-50 border border-transparent"
              }`}
              onClick={() => handleFileClick(file)}
            >
              {/* Checkbox */}
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleFileSelection(file.id);
                  }}
                  className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                />
              </div>

              {/* Name */}
              <div className="col-span-5 flex items-center space-x-3 min-w-0">
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  {file.type === "folder" && (
                    <p className="text-xs text-gray-500">Folder</p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {file.starred && (
                    <StarIconSolid className="h-4 w-4 text-yellow-500" />
                  )}
                  {file.shared && (
                    <div className="w-2 h-2 bg-mint-400 rounded-full" />
                  )}
                </div>
              </div>

              {/* Owner */}
              <div className="col-span-2 flex items-center">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {file.owner.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-900 truncate">
                    {file.owner.name}
                  </span>
                </div>
              </div>

              {/* Modified */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-500">
                  {formatDate(file.updatedAt)}
                </span>
              </div>

              {/* Size */}
              <div className="col-span-1 flex items-center">
                <span className="text-sm text-gray-500">
                  {file.size ? formatFileSize(file.size) : "—"}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {files.length === 0 && (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading a file or creating a folder.
          </p>
          <div className="mt-6">
            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-mint-600 hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500">
              Upload your first file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
