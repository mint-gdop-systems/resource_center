import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudArrowUpIcon,
  XMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { UploadProgress } from "../../types";
import { useFiles } from "../../contexts/FileContext";
import { CategoryModal } from "./CategoryModal";
import DuplicateFileModal from "./DuplicateFileModal";
import { api } from "../../services/api";

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
  const { uploadFile } = useFiles();
  const [uploadFiles, setUploadFiles] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Store files and show category modal (like in base.js)
      setPendingFiles(acceptedFiles);
      setShowCategoryModal(true);
    },
    [],
  );

  // Handle category selection and upload (like uploadFileWithCategory in base.js)
  const handleCategoryUpload = async (categoryId: number) => {
    await processFileUploads(pendingFiles, categoryId);
    setPendingFiles([]);
  };

  // Process file uploads with duplicate detection
  const processFileUploads = async (files: File[], categoryId: number) => {
    const newUploads: UploadProgress[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
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
        
        // Refresh the file list
        window.dispatchEvent(new CustomEvent('files:refresh'));
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
        const result = response.data;
        
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
        
        // Refresh the file list
        window.dispatchEvent(new CustomEvent('files:refresh'));
        
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
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
      "text/*": [".txt"],
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
            className="relative z-50 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
          >
            <div className="bg-white px-6 pt-6 pb-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Upload Files
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload to{" "}
                    {currentPath.length === 0
                      ? "My Files"
                      : currentPath.join(" / ")}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Upload Area */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive || isDragging
                    ? "border-mint-400 bg-mint-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <input {...getInputProps()} />
                <motion.div
                  animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CloudArrowUpIcon
                    className={`mx-auto h-12 w-12 ${
                      isDragActive ? "text-mint-600" : "text-gray-400"
                    }`}
                  />
                  <h4 className="mt-4 text-lg font-medium text-gray-900">
                    {isDragActive
                      ? "Drop files here"
                      : "Drag and drop files here"}
                  </h4>
                  <p className="mt-2 text-sm text-gray-600">
                    or{" "}
                    <span className="text-mint-600 font-medium">
                      click to browse
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Supports: PDF, Word, Excel, PowerPoint, Images, Text files
                  </p>
                </motion.div>
              </div>

              {/* Upload Progress */}
              {uploadFiles.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Upload Progress ({completedUploads}/{uploadFiles.length})
                    </h4>
                    {allCompleted && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="mr-1 h-3 w-3" />
                        All files uploaded
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {uploadFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.fileName}
                          </p>
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div
                                className={`h-2 rounded-full ${
                                  file.status === "completed"
                                    ? "bg-green-500"
                                    : file.status === "error"
                                      ? "bg-red-500"
                                      : "bg-mint-600"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-gray-500">
                                {file.progress}%
                              </span>
                              <span className="text-xs text-gray-500">
                                {file.status === "completed" && "Complete"}
                                {file.status === "uploading" && "Uploading..."}
                                {file.status === "error" && "Error"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {file.status === "completed" && (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          )}
                          {file.status === "error" && (
                            <span className="flex items-center text-xs text-red-600">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                              {file.error || "Error"}
                            </span>
                          )}
                          <button
                            onClick={() => removeFile(file.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mint-500"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                disabled={!allCompleted && uploadFiles.length > 0}
                className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-mint-500 ${
                  allCompleted || uploadFiles.length === 0
                    ? "text-white bg-mint-600 hover:bg-mint-700"
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
