import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DocumentDuplicateIcon,
  XMarkIcon,
  ArrowPathIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

interface DuplicateFile {
  file: string;
  error: string;
  error_type: string;
  duplicate_info: {
    original_name: string;
    folder_name: string;
    existing_file_id: string;
  };
}

interface DuplicateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: "rename" | "skip") => void;
  duplicateFiles: DuplicateFile[];
  folderName?: string;
}

export default function DuplicateFileModal({
  isOpen,
  onClose,
  onResolve,
  duplicateFiles,
  folderName = "this folder",
}: DuplicateFileModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<"rename" | "skip" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResolve = async () => {
    if (!selectedResolution) return;
    
    setIsProcessing(true);
    try {
      await onResolve(selectedResolution);
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePreviewName = (originalName: string) => {
    const lastDotIndex = originalName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${originalName}(1)`;
    }
    const name = originalName.substring(0, lastDotIndex);
    const extension = originalName.substring(lastDotIndex);
    return `${name}(1)${extension}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Background overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <DocumentDuplicateIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  File Already Exists
                </h3>
                <p className="text-sm text-gray-500">
                  {duplicateFiles[0]?.duplicate_info?.original_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-6 text-center">
              A file with this name already exists. How would you like to proceed?
            </p>

            {/* Options */}
            <div className="space-y-3">
              {/* Rename Option */}
              <button
                onClick={() => setSelectedResolution("rename")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedResolution === "rename"
                    ? "border-mint-500 bg-mint-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-mint-100 rounded-full flex items-center justify-center">
                    <ArrowPathIcon className="h-4 w-4 text-mint-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Keep Both Files</div>
                    <div className="text-sm text-gray-500">
                      Rename to {generatePreviewName(duplicateFiles[0]?.duplicate_info?.original_name || "")}
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedResolution === "rename"
                      ? "border-mint-500 bg-mint-500"
                      : "border-gray-300"
                  }`}>
                    {selectedResolution === "rename" && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </button>

              {/* Skip Option */}
              <button
                onClick={() => setSelectedResolution("skip")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedResolution === "skip"
                    ? "border-gray-500 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <EyeSlashIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Skip Upload</div>
                    <div className="text-sm text-gray-500">
                      Don't upload this file
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedResolution === "skip"
                      ? "border-gray-500 bg-gray-500"
                      : "border-gray-300"
                  }`}>
                    {selectedResolution === "skip" && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!selectedResolution || isProcessing}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedResolution && !isProcessing
                  ? "text-white bg-mint-600 hover:bg-mint-700"
                  : "text-gray-400 bg-gray-200 cursor-not-allowed"
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

