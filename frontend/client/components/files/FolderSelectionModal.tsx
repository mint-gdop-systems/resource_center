import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  HomeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getFiles } from "../../services/api";
import toast from "react-hot-toast";

interface Folder {
  id: string;
  name: string;
  parent?: string;
  subfolders?: Folder[];
}

interface FolderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null, folderName: string) => void;
  title: string;
  confirmText: string;
  excludeFolderIds?: string[]; // Folders to exclude from selection (e.g., source folders when copying)
}

export default function FolderSelectionModal({
  isOpen,
  onClose,
  onSelect,
  title,
  confirmText,
  excludeFolderIds = [],
}: FolderSelectionModalProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>("Root");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      setSelectedFolderId(null);
      setSelectedFolderName("Root");
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const data = await getFiles();
      const folderData = data.folders || [];
      
      // Filter out excluded folders
      const filteredFolders = folderData.filter(
        (folder: any) => !excludeFolderIds.includes(folder.id.toString())
      );
      
      // Build folder tree
      const folderTree = buildFolderTree(filteredFolders);
      setFolders(folderTree);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const buildFolderTree = (folderList: any[]): Folder[] => {
    const folderMap = new Map<string, Folder>();
    const rootFolders: Folder[] = [];

    // Create folder objects
    folderList.forEach((folder: any) => {
      folderMap.set(folder.id.toString(), {
        id: folder.id.toString(),
        name: folder.name,
        parent: folder.parent?.toString(),
        subfolders: [],
      });
    });

    // Build tree structure
    folderMap.forEach((folder) => {
      if (folder.parent) {
        const parent = folderMap.get(folder.parent);
        if (parent) {
          parent.subfolders = parent.subfolders || [];
          parent.subfolders.push(folder);
        }
      } else {
        rootFolders.push(folder);
      }
    });

    return rootFolders;
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const selectFolder = (folderId: string | null, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  const handleConfirm = () => {
    onSelect(selectedFolderId, selectedFolderName);
    onClose();
  };

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center py-2 px-3 cursor-pointer hover:bg-gray-50 rounded-md ${
            isSelected ? 'bg-mint-50 border border-mint-200' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => selectFolder(folder.id, folder.name)}
        >
          {hasSubfolders && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="mr-1 p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasSubfolders && <div className="w-5 mr-1" />}
          
          <FolderIcon className="h-5 w-5 text-mint-600 mr-2" />
          <span className={`text-sm ${isSelected ? 'font-medium text-mint-700' : 'text-gray-700'}`}>
            {folder.name}
          </span>
        </div>

        {isExpanded && hasSubfolders && (
          <div>
            {folder.subfolders!.map((subfolder) => renderFolder(subfolder, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Select a destination folder or choose root to place items at the top level.
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-600"></div>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Root option */}
                <div
                  className={`flex items-center py-2 px-3 cursor-pointer hover:bg-gray-50 rounded-md ${
                    selectedFolderId === null ? 'bg-mint-50 border border-mint-200' : ''
                  }`}
                  onClick={() => selectFolder(null, "Root")}
                >
                  <HomeIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className={`text-sm ${selectedFolderId === null ? 'font-medium text-mint-700' : 'text-gray-700'}`}>
                    Root (Top Level)
                  </span>
                </div>

                {/* Folder tree */}
                {folders.map((folder) => renderFolder(folder))}

                {folders.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    <FolderIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-sm">No folders available</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected folder display */}
          {selectedFolderName && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Selected:</span> {selectedFolderName}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-mint-600 text-base font-medium text-white hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}