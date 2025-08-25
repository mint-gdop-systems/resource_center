import { motion } from "framer-motion";
import { ViewMode } from "../../types";
import { formatFileSize } from "../../lib/utils";
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
  faFolder,
  faFile,
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

interface ReadOnlyFileGridProps {
  files: any[];
  viewMode: ViewMode;
  onNavigateToFolder?: (folderId: string) => void;
}

export default function ReadOnlyFileGrid({
  files,
  viewMode,
  onNavigateToFolder,
}: ReadOnlyFileGridProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const getFileIcon = (file: any) => {
    if (file.type === "folder") {
      return <FontAwesomeIcon icon={faFolder} className="text-yellow-500 h-8 w-8" />;
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

    return <FontAwesomeIcon icon={icon} className={`${colorClass} h-8 w-8`} />;
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
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
          <FontAwesomeIcon icon={faFile} className={`h-8 w-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
        </div>
        <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>No recent files</h3>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
          Files you upload will appear here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${isDarkMode ? 'bg-gray-800' : 'bg-transparent'}`}>
      {files.map((file, index) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          className={`group relative rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${isDarkMode
            ? 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-700'
            : 'bg-white border border-gray-200 hover:border-gray-300'
            }`}
          onClick={() => handleFileClick(file)}
        >
          {/* File icon */}
          <div className="flex justify-center mb-3">
            {getFileIcon(file)}
          </div>

          {/* File info */}
          <div className="space-y-1">
            <h3 className={`text-sm font-medium truncate hover:text-mint-600 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
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
              <div className="truncate">
                {file.owner_first_name || file.owner_email || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Subtle indicators */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex space-x-1 items-center">
              {file.is_starred && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Starred" />
              )}
              {file.shared && (
                <div className="w-2 h-2 bg-mint-400 rounded-full" title="Shared" />
              )}
            </div>
            {file.type === "folder" && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode
                ? 'text-gray-300 bg-gray-700'
                : 'text-gray-400 bg-gray-100'
                }`}>
                Folder
              </span>
            )}
          </div>

          {/* Hover overlay for better UX */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-200 pointer-events-none ${isDarkMode ? 'bg-mint-400' : 'bg-mint-50'
            }`} />
        </motion.div>
      ))}
    </div>
  );
}