import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import { FileItem, FileVersionHistoryItem } from "../../types";
import { getFileVersionHistory, revertFileVersion } from "../../services/api";
import toast from "react-hot-toast";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem;
  onSuccess?: () => void;
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  file,
  onSuccess,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<FileVersionHistoryItem[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadVersionHistory();
    }
  }, [isOpen, file.id]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const response = await getFileVersionHistory(file.id);
      setVersions(response.versions);
      setIsOwner(response.is_owner);
    } catch (error: any) {
      console.error("Error loading version history:", error);
      toast.error("Failed to load version history");
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (versionId: number) => {
    if (!isOwner) {
      toast.error("Only the file owner can revert versions");
      return;
    }

    setReverting(versionId);
    try {
      await revertFileVersion(file.id, versionId.toString());
      toast.success("File reverted successfully!");
      await loadVersionHistory(); // Reload to show updated current version
      onSuccess?.();
    } catch (error: any) {
      console.error("Error reverting version:", error);
      const errorMessage = error?.response?.data?.error || "Failed to revert version";
      toast.error(errorMessage);
    } finally {
      setReverting(null);
    }
  };

  const handleDownload = (version: FileVersionHistoryItem) => {
    // Open the file URL in a new tab for download
    window.open(version.uploaded_file_url, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Version History
                  </h2>
                  <p className="text-sm text-gray-500">{file.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No version history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {versions.map((version, index) => (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        version.is_current
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">
                              Version {version.version_number}
                            </span>
                            {version.is_current && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="font-medium">Uploaded by:</span> {version.uploaded_by_name}
                            </p>
                            <p>
                              <span className="font-medium">Date:</span> {formatDate(version.uploaded_at)}
                            </p>
                            <p>
                              <span className="font-medium">File:</span> {version.file_name}
                            </p>
                            {version.change_note && (
                              <p>
                                <span className="font-medium">Changes:</span> {version.change_note}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleDownload(version)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download this version"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          
                          {!version.is_current && isOwner && (
                            <button
                              onClick={() => handleRevert(version.id)}
                              disabled={reverting === version.id}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Revert to this version"
                            >
                              {reverting === version.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                              ) : (
                                <ArrowUturnLeftIcon className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}