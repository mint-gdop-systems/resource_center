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
      // Recursively fetch all folders from all levels
      const allFolders = await fetchAllFoldersRecursively();
      
      // Filter out excluded folders
      const filteredFolders = allFolders.filter(
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

  const fetchAllFoldersRecursively = async (folderId?: string, visited = new Set<string>()): Promise<any[]> => {
    // Prevent infinite loops
    if (folderId && visited.has(folderId)) {
      return [];
    }
    if (folderId) visited.add(folderId);

    try {
      const data = await getFiles(folderId);
      const folders = data.folders || [];
      let allFolders = [...folders];

      // Recursively fetch subfolders
      for (const folder of folders) {
        if (!visited.has(folder.id.toString())) {
          const subfolders = await fetchAllFoldersRecursively(folder.id.toString(), visited);
          allFolders = [...allFolders, ...subfolders];
        }
      }

      return allFolders;
    } catch (error) {
      console.error(`Error fetching folders for ${folderId}:`, error);
      return [];
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
          className={`flex items-center py-2.5 px-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors ${
            isSelected ? 'bg-mint-50 border border-mint-200 shadow-sm' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => selectFolder(folder.id, folder.name)}
        >
          {/* Indentation lines for visual hierarchy */}
          {level > 0 && (
            <div className="absolute left-0 flex items-center h-full">
              {Array.from({ length: level }, (_, i) => (
                <div
                  key={i}
                  className="w-px h-full bg-gray-200 ml-6"
                  style={{ marginLeft: `${i * 24 + 12}px` }}
                />
              ))}
            </div>
          )}

          {hasSubfolders ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="mr-2 p-1 hover:bg-gray-200 rounded-md transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6 mr-2 flex justify-center">
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
            </div>
          )}
          
          <FolderIcon className={`h-5 w-5 mr-3 ${
            isSelected ? 'text-mint-600' : level === 0 ? 'text-blue-500' : 'text-gray-500'
          }`} />
          
          <span className={`text-sm flex-1 ${
            isSelected 
              ? 'font-semibold text-mint-700' 
              : level === 0 
                ? 'font-medium text-gray-800'
                : 'text-gray-700'
          }`}>
            {folder.name}
          </span>

          {/* Level indicator */}
          {level > 0 && (
            <span className="text-xs text-gray-400 ml-2">
              Level {level + 1}
            </span>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && hasSubfolders && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-1">
                {folder.subfolders!.map((subfolder) => renderFolder(subfolder, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              <div className="flex items-center space-x-2">
                {folders.length > 0 && !loading && (
                  <button
                    onClick={() => {
                      const allFolderIds = new Set<string>();
                      const collectFolderIds = (folderList: Folder[]) => {
                        folderList.forEach(folder => {
                          allFolderIds.add(folder.id);
                          if (folder.subfolders) {
                            collectFolderIds(folder.subfolders);
                          }
                        });
                      };
                      collectFolderIds(folders);
                      
                      if (expandedFolders.size === allFolderIds.size) {
                        setExpandedFolders(new Set()); // Collapse all
                      } else {
                        setExpandedFolders(allFolderIds); // Expand all
                      }
                    }}
                    className="text-xs text-mint-600 hover:text-mint-700 font-medium"
                  >
                    {expandedFolders.size > 0 ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Select a destination folder or choose root to place items at the top level.
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-600 mb-3"></div>
                <p className="text-sm text-gray-500">Loading folders...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Root option */}
                <div
                  className={`flex items-center py-3 px-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors border ${
                    selectedFolderId === null 
                      ? 'bg-mint-50 border-mint-200 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => selectFolder(null, "Root")}
                >
                  <HomeIcon className={`h-6 w-6 mr-3 ${
                    selectedFolderId === null ? 'text-mint-600' : 'text-gray-500'
                  }`} />
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      selectedFolderId === null ? 'text-mint-700' : 'text-gray-800'
                    }`}>
                      Root Folder
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Top level - no parent folder
                    </p>
                  </div>
                  {selectedFolderId === null && (
                    <div className="w-2 h-2 bg-mint-500 rounded-full"></div>
                  )}
                </div>

                {/* Divider */}
                {folders.length > 0 && (
                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-gray-200"></div>
                    <span className="px-3 text-xs text-gray-500 bg-white">Folders</span>
                    <div className="flex-1 border-t border-gray-200"></div>
                  </div>
                )}

                {/* Folder tree */}
                <div className="space-y-1 relative">
                  {folders.map((folder) => renderFolder(folder))}
                </div>

                {folders.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <FolderIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-sm font-medium text-gray-600 mb-1">No folders available</p>
                    <p className="text-xs text-gray-500">
                      Create some folders first to organize your files
                    </p>
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