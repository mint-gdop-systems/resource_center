import React from "react";
import { motion } from "framer-motion";
import { ViewMode } from "../../types";
import { formatFileSize, formatDate } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";

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

// Enhanced file type to FontAwesome icon mapping
const fileTypeIconMap: Record<string, any> = {
  // PDF files
  pdf: faFilePdf,
  
  // Microsoft Word
  doc: faFileWord,
  docx: faFileWord,
  
  // Microsoft Excel
  xls: faFileExcel,
  xlsx: faFileExcel,
  
  // Microsoft PowerPoint
  ppt: faFilePowerpoint,
  pptx: faFilePowerpoint,
  
  // Images
  jpg: faFileImage,
  jpeg: faFileImage,
  png: faFileImage,
  gif: faFileImage,
  bmp: faFileImage,
  svg: faFileImage,
  webp: faFileImage,
  
  // Text files
  txt: faFileAlt,
  rtf: faFileAlt,
  md: faFileAlt,
  
  // Archives
  zip: faFileArchive,
  rar: faFileArchive,
  '7z': faFileArchive,
  tar: faFileArchive,
  gz: faFileArchive,
  
  // Other common types
  csv: faFileExcel, // CSV files use Excel icon
  json: faFileAlt,
  xml: faFileAlt,
  html: faFileAlt,
  css: faFileAlt,
  js: faFileAlt,
  
  // Folder
  folder: faFolder,
};

interface ReadOnlyFileListProps {
  files: any[];
  viewMode: ViewMode;
  onNavigateToFolder?: (folderId: string) => void;
}

export default function ReadOnlyFileList({
  files,
  viewMode,
  onNavigateToFolder,
}: ReadOnlyFileListProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const getFileIcon = (file: any) => {
    if (file.type === "folder") {
      return <FontAwesomeIcon icon={faFolder} className="text-yellow-500 h-5 w-5" />;
    }
    
    // Get file extension from multiple possible sources
    let extension = "";
    if (file.extension) {
      extension = file.extension.toLowerCase();
    } else if (file.file_type) {
      extension = file.file_type.toLowerCase();
    } else if (file.name) {
      const nameParts = file.name.split('.');
      if (nameParts.length > 1) {
        extension = nameParts[nameParts.length - 1].toLowerCase();
      }
    }
    
    const icon = fileTypeIconMap[extension] || faFile;
    
    // Color by type with better visual distinction
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

  const handleFileClick = async (file: any) => {
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

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <FontAwesomeIcon icon={faFile} className={`h-8 w-8 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
        </div>
        <h3 className={`text-lg font-medium mb-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>No recent files</h3>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
          Files you upload will appear here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${isDarkMode ? 'bg-gray-800' : 'bg-transparent'}`}>
      {/* Simple header */}
      <div className={`rounded-lg border mb-4 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className={`grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wide ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Owner</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Modified</div>
          <div className="col-span-2">Size</div>
        </div>
      </div>

      {/* File list */}
      {files.map((file, index) => (
        <motion.div
          key={`${file.type}-${file.id}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.03 }}
          className={`group grid grid-cols-12 gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent ${
            isDarkMode 
              ? 'hover:bg-gray-700 hover:border-gray-600' 
              : 'hover:bg-gray-50 hover:border-gray-200'
          }`}
          onClick={() => handleFileClick(file)}
        >
          {/* Name */}
          <div className="col-span-4 flex items-center space-x-3 min-w-0">
            {getFileIcon(file)}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate hover:text-mint-600 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {file.name}
              </p>
              {file.type === "folder" && (
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Folder</p>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {file.is_starred && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Starred" />
              )}
              {file.shared && (
                <div className="w-2 h-2 bg-mint-400 rounded-full" title="Shared" />
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
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {file.type === 'folder' 
                ? formatDate(new Date(file.createdAt))
                : formatDate(new Date(file.uploaded_at))}
            </span>
          </div>

          {/* Size */}
          <div className="col-span-2 flex items-center">
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {(file.file_size || file.size) ? formatFileSize(file.file_size || file.size) : "—"}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}