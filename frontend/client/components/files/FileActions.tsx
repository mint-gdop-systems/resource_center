import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  EllipsisVerticalIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { FileItem } from "../../types";
import toast from "react-hot-toast";

interface FileActionsProps {
  file: FileItem;
  onRename?: (fileId: string, newName: string) => void;
  onDelete?: (fileId: string) => void;
  onMove?: (fileId: string, targetPath: string) => void;
  onStar?: (fileId: string, starred: boolean) => void;
  className?: string;
}

export default function FileActions({
  file,
  onRename,
  onDelete,
  onMove,
  onStar,
  className = "",
}: FileActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDownload = () => {
    // Simulate file download
    toast.success(`Downloading ${file.name}...`);

    // In a real app, this would trigger actual download
    const link = document.createElement("a");
    link.href = "#"; // Would be actual file URL
    link.download = file.name;
    link.click();

    setShowMenu(false);
  };

  const handleCopy = () => {
    // Simulate copying file
    toast.success(`${file.name} copied to clipboard`);
    setShowMenu(false);
  };

  const handleShare = () => {
    // Open share modal (would integrate with ShareModal component)
    toast.success("Opening share options...");
    setShowMenu(false);
  };

  const handleStar = () => {
    onStar?.(file.id, !file.starred);
    toast.success(file.starred ? "Removed from starred" : "Added to starred");
    setShowMenu(false);
  };

  const menuItems = [
    {
      icon: ArrowDownTrayIcon,
      label: "Download",
      onClick: handleDownload,
    },
    {
      icon: PencilIcon,
      label: "Rename",
      onClick: () => {
        setShowRenameModal(true);
        setShowMenu(false);
      },
    },
    {
      icon: FolderIcon,
      label: "Move",
      onClick: () => {
        setShowMoveModal(true);
        setShowMenu(false);
      },
    },
    {
      icon: DocumentDuplicateIcon,
      label: "Copy",
      onClick: handleCopy,
    },
    {
      icon: ShareIcon,
      label: "Share",
      onClick: handleShare,
    },
    {
      icon: file.starred ? StarIconSolid : StarIcon,
      label: file.starred ? "Remove from starred" : "Add to starred",
      onClick: handleStar,
      className: file.starred ? "text-yellow-600" : "",
    },
    {
      icon: TrashIcon,
      label: "Delete",
      onClick: () => {
        setShowDeleteModal(true);
        setShowMenu(false);
      },
      className: "text-red-600 hover:text-red-700",
      separator: true,
    },
  ];

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <EllipsisVerticalIcon className="h-4 w-4" />
        </button>

        <AnimatePresence>
          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                {menuItems.map((item, index) => (
                  <div key={item.label}>
                    {item.separator && (
                      <div className="border-t border-gray-100 my-1" />
                    )}
                    <button
                      onClick={item.onClick}
                      className={`w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${
                        item.className || ""
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </button>
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <RenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        file={file}
        onRename={onRename}
      />

      <MoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        file={file}
        onMove={onMove}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        file={file}
        onDelete={onDelete}
      />
    </>
  );
}

// Rename Modal Component
interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem;
  onRename?: (fileId: string, newName: string) => void;
}

function RenameModal({ isOpen, onClose, file, onRename }: RenameModalProps) {
  const [newName, setNewName] = useState(file.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== file.name) {
      onRename?.(file.id, newName.trim());
      toast.success(`Renamed to "${newName}"`);
      onClose();
    }
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
          className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full"
        >
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Rename {file.type === "folder" ? "Folder" : "File"}
              </h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500"
                autoFocus
              />
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-mint-600 text-base font-medium text-white hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// Move Modal Component
interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem;
  onMove?: (fileId: string, targetPath: string) => void;
}

function MoveModal({ isOpen, onClose, file, onMove }: MoveModalProps) {
  const [selectedPath, setSelectedPath] = useState("/");

  const mockFolders = [
    { id: "root", name: "My Files", path: "/" },
    { id: "f1", name: "Strategic Plans", path: "/Strategic Plans" },
    { id: "f2", name: "Digital Ethiopia 2025", path: "/Digital Ethiopia 2025" },
    { id: "f3", name: "Budget Reports", path: "/Budget Reports" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onMove?.(file.id, selectedPath);
    toast.success(`Moved ${file.name} to ${selectedPath}`);
    onClose();
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
          className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full"
        >
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Move "{file.name}"
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Select a destination folder:
              </p>
              <div className="space-y-2">
                {mockFolders.map((folder) => (
                  <label
                    key={folder.id}
                    className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="destination"
                      value={folder.path}
                      checked={selectedPath === folder.path}
                      onChange={(e) => setSelectedPath(e.target.value)}
                      className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300"
                    />
                    <FolderIcon className="h-5 w-5 text-mint-600 ml-3 mr-2" />
                    <span className="text-sm text-gray-900">{folder.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-mint-600 text-base font-medium text-white hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Move
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// Delete Modal Component
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem;
  onDelete?: (fileId: string) => void;
}

function DeleteModal({ isOpen, onClose, file, onDelete }: DeleteModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDelete?.(file.id);
    toast.success(`${file.name} deleted successfully`);
    onClose();
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
          className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full"
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Delete {file.type === "folder" ? "Folder" : "File"}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete "{file.name}"? This action
                    cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSubmit}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </button>
            <button
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
