import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudArrowUpIcon,
  XMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  FolderIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { UploadProgress } from "../../types";
import { useFiles } from "../../contexts/FileContext";
import { CategoryModal } from "./CategoryModal";
import DuplicateFileModal from "./DuplicateFileModal";
import UploadValidation from "./UploadValidation";

import { api, getSystemFileSizeLimit } from "../../services/api";
import { useStorageQuota } from "../../hooks/useStorageQuota";

interface FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string[];
}

export default function FileUpload({
  isOpen,
  onClose,
  currentPath,
}: FileUploadProps) {
  useFiles(); // For context initialization
  const { refreshQuota } = useStorageQuota();
  const [uploadFiles, setUploadFiles] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // File size limit state
  const [maxFileSize, setMaxFileSize] = useState<number>(2 * 1024 * 1024 * 1024); // Default 2GB
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(2048); // Default 2048MB
  
  // Storage validation state
  const [showValidation, setShowValidation] = useState(false);
  const [validationFiles, setValidationFiles] = useState<File[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  
  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  // Duplicate file modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFiles, setDuplicateFiles] = useState<any[]>([]);
  const [duplicateContext, setDuplicateContext] = useState<{
    files: File[];
    categoryId: number;
    folderName?: string;
  } | null>(null);

  // Fetch file size limit on component mount and when modal opens
  useEffect(() => {
    const fetchFileSizeLimit = async () => {
      try {
        const fileSizeData = await getSystemFileSizeLimit();
        setMaxFileSize(fileSizeData.max_file_size_bytes);
        setMaxFileSizeMB(fileSizeData.max_file_size_mb);
      } catch (error) {
        console.error('Error fetching file size limit:', error);
        // Keep default values if fetch fails
      }
    };

    if (isOpen) {
      fetchFileSizeLimit();
    }
  }, [isOpen]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files (size/type validation)
      if (rejectedFiles.length > 0) {
        const rejectionErrors = rejectedFiles.map(({ file, errors }) => {
          const errorMessages = errors.map((error: any) => {
            switch (error.code) {
              case 'file-too-large':
                return `"${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(maxFileSize)} per file.`;
              case 'file-invalid-type':
                const extension = file.name.split('.').pop()?.toLowerCase();
                return `"${file.name}" file type (.${extension}) is not supported. Supported types include documents, images, audio, video, data files, and archives.`;
              default:
                return `"${file.name}": ${error.message}`;
            }
          });
          return errorMessages.join(' ');
        });

        // Show error for rejected files
        alert(`Upload Error:\n\n${rejectionErrors.join('\n\n')}`);
      }

      // Only proceed with accepted files
      if (acceptedFiles.length > 0) {
        // First validate storage quota
        setValidationFiles(acceptedFiles);
        setShowValidation(true);
      }
    },
    [maxFileSize],
  );

  // Handle validation completion
  const handleValidationComplete = (canUploadFiles: boolean) => {
    setCanUpload(canUploadFiles);
    if (canUploadFiles) {
      // Proceed to category selection
      setPendingFiles(validationFiles);
      setShowCategoryModal(true);
      setShowValidation(false);
    }
  };

  // Handle validation cancel
  const handleValidationCancel = () => {
    setShowValidation(false);
    setValidationFiles([]);
    setCanUpload(false);
  };

  // Handle category selection and upload (like uploadFileWithCategory in base.js)
  const handleCategoryUpload = async (categoryId: number) => {
    await processFileUploads(pendingFiles, categoryId);
    setPendingFiles([]);
  };

  // Process file uploads with duplicate detection
  const processFileUploads = async (files: File[], categoryId: number) => {
    const newUploads: UploadProgress[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 11),
      fileName: file.name,
      progress: 0,
      status: "uploading",
    }));

    setUploadFiles((prev) => [...prev, ...newUploads]);

    // Upload each file with the selected category
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const uploadId = newUploads[index].id;

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadFiles((prev) =>
          prev.map((uploadFile) => {
            if (
              uploadFile.id === uploadId &&
              uploadFile.status === "uploading"
            ) {
              const newProgress = Math.min(uploadFile.progress + 15, 90);
              return {
                ...uploadFile,
                progress: newProgress,
              };
            }
            return uploadFile;
          }),
        );
      }, 300);

      try {
        // Call the API directly to get proper duplicate handling
        const formData = new FormData();
        formData.append('files', file);
        
        if (categoryId) {
          formData.append('category_id', categoryId.toString());
        }
        
        // Add folder ID if we're in a specific folder
        if (currentPath.length > 0) {
          const folderId = currentPath[currentPath.length - 1];
          if (folderId !== "/") {
            formData.append('folder_id', folderId);
          }
        }
        
        await api.post('/file-upload/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Complete the upload
        clearInterval(progressInterval);
        setUploadFiles((prev) =>
          prev.map((uploadFile) => {
            if (uploadFile.id === uploadId) {
              return {
                ...uploadFile,
                progress: 100,
                status: "completed",
              };
            }
            return uploadFile;
          }),
        );
        
        // Refresh the file list and storage quota
        window.dispatchEvent(new CustomEvent('files:refresh'));
        window.dispatchEvent(new CustomEvent('files:uploaded'));
        refreshQuota();
      } catch (error: any) {
        clearInterval(progressInterval);
        
        // Check if this is a duplicate file error
        if (error?.response?.status === 409 && error?.response?.data?.error === "duplicate_files_found") {
          // Handle duplicate files
          const duplicates = error.response.data.duplicates || [];
          setDuplicateFiles(duplicates);
          setDuplicateContext({
            files: [file],
            categoryId,
            folderName: currentPath.length === 0 ? "My Files" : currentPath.join(" / ")
          });
          setShowDuplicateModal(true);
          
          // Update upload status to show duplicate
          setUploadFiles((prev) =>
            prev.map((uploadFile) => {
              if (uploadFile.id === uploadId) {
                return {
                  ...uploadFile,
                  status: "error",
                  error: "Duplicate file - awaiting resolution",
                };
              }
              return uploadFile;
            }),
          );
          return; // Don't continue with other files until duplicate is resolved
        }
        
        // Extract the specific error message from the API response
        let errorMessage = "Upload failed";
        if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        setUploadFiles((prev) =>
          prev.map((uploadFile) => {
            if (uploadFile.id === uploadId) {
              return {
                ...uploadFile,
                status: "error",
                error: errorMessage,
              };
            }
            return uploadFile;
          }),
        );
      }
    }
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setPendingFiles([]);
  };

  // Handle duplicate file resolution
  const handleDuplicateResolution = async (resolution: "rename" | "skip") => {
    if (!duplicateContext) return;

    try {
      // Create FormData for the resolution request
      const formData = new FormData();
      duplicateContext.files.forEach(file => {
        formData.append('files', file);
      });
      
      if (duplicateContext.categoryId) {
        formData.append('category_id', duplicateContext.categoryId.toString());
      }
      
      // Add folder ID if we're in a specific folder
      if (currentPath.length > 0) {
        const folderId = currentPath[currentPath.length - 1];
        if (folderId !== "/") {
          formData.append('folder_id', folderId);
        }
      }
      
      formData.append('resolution', resolution);
      
      // Call the resolution API
      const response = await api.post('/resolve-duplicates/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.status === 201) {
        
        // Update upload status based on resolution
        if (resolution === "rename") {
          // Files were uploaded with new names
          setUploadFiles((prev) =>
            prev.map((uploadFile) => {
              if (uploadFile.status === "error" && uploadFile.error?.includes("Duplicate")) {
                return {
                  ...uploadFile,
                  progress: 100,
                  status: "completed",
                  fileName: uploadFile.fileName // Could be updated with new name from response
                };
              }
              return uploadFile;
            }),
          );
        } else {
          // Files were skipped
          setUploadFiles((prev) =>
            prev.filter((uploadFile) => 
              !(uploadFile.status === "error" && uploadFile.error?.includes("Duplicate"))
            )
          );
        }
        
        // Refresh the file list and storage quota
        window.dispatchEvent(new CustomEvent('files:refresh'));
        window.dispatchEvent(new CustomEvent('files:uploaded'));
        refreshQuota();
        
      } else {
        throw new Error(response.data?.error || 'Failed to resolve duplicates');
      }
      
    } catch (error) {
      console.error('Error resolving duplicates:', error);
      // Update upload status to show error
      setUploadFiles((prev) =>
        prev.map((uploadFile) => {
          if (uploadFile.status === "error" && uploadFile.error?.includes("Duplicate")) {
            return {
              ...uploadFile,
              error: "Failed to resolve duplicate",
            };
          }
          return uploadFile;
        }),
      );
    } finally {
      setShowDuplicateModal(false);
      setDuplicateFiles([]);
      setDuplicateContext(null);
    }
  };

  const handleDuplicateModalClose = () => {
    setShowDuplicateModal(false);
    setDuplicateFiles([]);
    setDuplicateContext(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    multiple: true,
    maxSize: maxFileSize, // Dynamic file size limit
    accept: {
      // Documents
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
      
      // Images
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg", ".ico"],
      
      // Audio
      "audio/*": [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma"],
      
      // Video
      "video/*": [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"],
      
      // Data files
      "text/csv": [".csv"],
      "application/json": [".json"],
      "application/xml": [".xml"],
      "text/yaml": [".yaml", ".yml"],
      "text/plain": [".txt", ".log", ".md", ".markdown"],
      "application/sql": [".sql"],
      
      // Archives
      "application/zip": [".zip"],
      "application/x-rar-compressed": [".rar"],
      "application/x-7z-compressed": [".7z"],
      "application/x-tar": [".tar"],
      "application/gzip": [".gz"],
      "application/x-bzip2": [".bz2"],
      
      // Web files
      "text/html": [".html", ".htm"],
      "text/css": [".css"],
      "application/javascript": [".js"],
      "application/typescript": [".ts"],
    },
  });

  const removeFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 2 ? 1 : 0));
    return `${size} ${sizes[i]}`;
  };

  const completedUploads = uploadFiles.filter(
    (file) => file.status === "completed",
  ).length;
  const allCompleted =
    uploadFiles.length > 0 && completedUploads === uploadFiles.length;

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 z-40 transition-opacity"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-50 flex flex-col bg-white rounded-2xl text-left shadow-2xl transform transition-all mx-2 sm:mx-4 my-2 sm:my-4 md:my-8 w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh]"
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 bg-white px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 bg-mint-100 rounded-lg flex-shrink-0">
                    <ArrowUpTrayIcon className="h-5 w-5 sm:h-6 sm:w-6 text-mint-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                      Upload Files
                    </h3>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                      <FolderIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">
                        {currentPath.length === 0
                          ? "My Files"
                          : currentPath.join(" / ")}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

              {/* Storage Validation */}
              {showValidation && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <UploadValidation
                    files={validationFiles}
                    onValidationComplete={handleValidationComplete}
                    onCancel={handleValidationCancel}
                  />
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={handleValidationCancel}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    {canUpload && (
                      <button
                        onClick={() => {
                          setPendingFiles(validationFiles);
                          setShowCategoryModal(true);
                          setShowValidation(false);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-mint-600 rounded-lg hover:bg-mint-700 transition-colors"
                      >
                        Continue Upload
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Area */}
              {!showValidation && (
                <div className="mb-6">
                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${
                      isDragActive || isDragging
                        ? "border-mint-400 bg-mint-50 shadow-lg scale-[1.02]"
                        : "border-gray-300 hover:border-mint-300 hover:bg-gray-50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <motion.div
                      animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className={`mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ${
                        isDragActive ? "bg-mint-100" : "bg-gray-100"
                      }`}>
                        <CloudArrowUpIcon
                          className={`h-6 w-6 sm:h-8 sm:w-8 ${
                            isDragActive ? "text-mint-600" : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
                          {isDragActive
                            ? "Drop files here"
                            : "Drag and drop files here"}
                        </h4>
                        <p className="mt-2 text-sm sm:text-base text-gray-600">
                          or{" "}
                          <span className="text-mint-600 font-semibold hover:text-mint-700">
                            click to browse
                          </span>
                        </p>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                        <p>Maximum file size: <span className="font-medium">{formatFileSize(maxFileSize)}</span></p>
                        <p className="hidden sm:block">Supports documents, images, audio, video, archives and more</p>
                      </div>
                    </motion.div>
                    
                    {/* Animated border effect */}
                    {isDragActive && (
                      <motion.div
                        className="absolute inset-0 border-2 border-mint-400 rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploadFiles.length > 0 && (
                <div className="space-y-4">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <DocumentIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Upload Progress
                        </h4>
                        <p className="text-sm text-gray-600">
                          {completedUploads} of {uploadFiles.length} files completed
                        </p>
                      </div>
                    </div>
                    {allCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>All Complete</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Files List - Scrollable */}
                  <div className="max-h-60 sm:max-h-80 overflow-y-auto space-y-2 pr-1 sm:pr-2">
                    {uploadFiles.map((file, index) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                          file.status === "completed"
                            ? "bg-green-50 border-green-200"
                            : file.status === "error"
                            ? "bg-red-50 border-red-200"
                            : "bg-white border-gray-200 hover:border-mint-300"
                        }`}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          {/* File Icon */}
                          <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                            file.status === "completed"
                              ? "bg-green-100"
                              : file.status === "error"
                              ? "bg-red-100"
                              : "bg-mint-100"
                          }`}>
                            {file.status === "completed" ? (
                              <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            ) : file.status === "error" ? (
                              <ExclamationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                            ) : (
                              <DocumentIcon className="h-4 w-4 sm:h-5 sm:w-5 text-mint-600" />
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm sm:text-base font-medium text-gray-900 truncate pr-2 sm:pr-4" title={file.fileName}>
                                {file.fileName}
                              </p>
                              <button
                                onClick={() => removeFile(file.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all flex-shrink-0"
                              >
                                <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-2 space-y-1">
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full transition-colors ${
                                    file.status === "completed"
                                      ? "bg-green-500"
                                      : file.status === "error"
                                      ? "bg-red-500"
                                      : "bg-mint-500"
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${file.progress}%` }}
                                  transition={{ duration: 0.3, ease: "easeOut" }}
                                />
                              </div>
                              
                              {/* Status Text */}
                              <div className="flex justify-between items-center">
                                <span className={`text-xs font-medium ${
                                  file.status === "completed"
                                    ? "text-green-600"
                                    : file.status === "error"
                                    ? "text-red-600"
                                    : "text-mint-600"
                                }`}>
                                  {file.status === "completed" && "✓ Upload Complete"}
                                  {file.status === "uploading" && "Uploading..."}
                                  {file.status === "error" && (file.error || "Upload Failed")}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                  {file.progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Sticky */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                {/* Upload Stats */}
                <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                  {uploadFiles.length > 0 && (
                    <>
                      <span className="flex items-center space-x-1">
                        <DocumentIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{uploadFiles.length} files</span>
                        <span className="sm:hidden">{uploadFiles.length}</span>
                      </span>
                      {completedUploads > 0 && (
                        <span className="flex items-center space-x-1 text-green-600">
                          <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">{completedUploads} completed</span>
                          <span className="sm:hidden">{completedUploads}</span>
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 sm:space-x-3">
                  <button
                    onClick={onClose}
                    className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onClose}
                    disabled={!allCompleted && uploadFiles.length > 0}
                    className={`px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-500 transition-all ${
                      allCompleted || uploadFiles.length === 0
                        ? "text-white bg-mint-600 hover:bg-mint-700 shadow-sm hover:shadow-md"
                        : "text-gray-400 bg-gray-200 cursor-not-allowed"
                    }`}
                  >
                    {uploadFiles.length === 0
                      ? "Done"
                      : allCompleted
                      ? "Complete"
                      : "Uploading..."}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Category Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={handleCategoryModalClose}
        onUpload={handleCategoryUpload}
        files={pendingFiles}
      />

      {/* Duplicate File Modal */}
      <DuplicateFileModal
        isOpen={showDuplicateModal}
        onClose={handleDuplicateModalClose}
        onResolve={handleDuplicateResolution}
        duplicateFiles={duplicateFiles}
        folderName={duplicateContext?.folderName}
      />
    </>
  );
}
