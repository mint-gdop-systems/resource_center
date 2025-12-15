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
  ArchiveBoxIcon,
  EyeIcon,
  CloudArrowUpIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import FolderSelectionModal from "./FolderSelectionModal";
import EditFileModal from "./EditFileModal";
import ShareModal from "./ShareModal";
import UploadNewVersionModal from "./UploadNewVersionModal";
import VersionHistoryModal from "./VersionHistoryModal";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { FileItem } from "../../types";
import toast from "react-hot-toast";

interface FileActionsProps {
  file: FileItem;
  onRename?: (fileId: string, newName: string) => void;
  onDelete?: (fileIds: string[]) => void;
  onMove?: (fileId: string, targetPath: string) => void;
  onStar?: (fileId: string, starred: boolean) => void;
  onArchive?: (fileId: string, archived: boolean) => void;
  className?: string;
}

export default function FileActions({
  file,
  onRename,
  onDelete,
  onMove,
  onStar,
  onArchive,
  className = "",
}: FileActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUploadVersionModal, setShowUploadVersionModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);

  const handleDownload = async () => {
    try {
      if (file.type === 'folder') {
        // Import the downloadFolder API function
        const { downloadFolder } = await import('../../services/api');
        
        // Download the folder as ZIP
        await downloadFolder(file.id, file.name);
        toast.success(`Downloading ${file.name}.zip...`);
      } else {
        // Import the downloadFile API function
        const { downloadFile } = await import('../../services/api');
        
        // Download the file
        await downloadFile(file.id, file.name);
        toast.success(`Downloading ${file.name}...`);
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error(`Failed to download ${file.type}. Please try again.`);
    }
    
    setShowMenu(false);
  };

  const handleView = async () => {
    if (file.type === 'folder') return;
    
    try {
      // Import the viewFile API function
      const { viewFile } = await import('../../services/api');
      
      // Use the API to get the file
      const url = await viewFile(file.id);
      window.open(url, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      toast.error('Error viewing file');
      console.error('Error viewing file:', error);
    }
    
    setShowMenu(false);
  };

  const handleCopy = () => {
    setShowCopyModal(true);
    setShowMenu(false);
  };

  const handleShare = () => {
    setShowShareModal(true);
    setShowMenu(false);
  };

  const handleStar = () => {
    onStar?.(file.id, !file.starred);
    toast.success(file.starred ? "Removed from starred" : "Added to starred");
    setShowMenu(false);
  };

  const handleArchive = () => {
    onArchive?.(file.id, !file.archived);
      toast.success(file.archived ? "Restored" : "Archived");
    setShowMenu(false);
  };

  const handleUploadNewVersion = () => {
    setShowUploadVersionModal(true);
    setShowMenu(false);
  };

  const handleViewVersionHistory = () => {
    setShowVersionHistoryModal(true);
    setShowMenu(false);
  };

  const menuItems = [
    ...(file.type !== 'folder' ? [{
      icon: EyeIcon,
      label: "View",
      onClick: handleView,
    }] : []),
    {
      icon: ArrowDownTrayIcon,
      label: "Download",
      onClick: handleDownload,
    },
    {
      icon: PencilIcon,
      label: "Edit",
      onClick: () => {
        setShowEditModal(true);
        setShowMenu(false);
      },
    },
    // Version management options (only for files, not folders)
    ...(file.type !== 'folder' ? [
      {
        icon: CloudArrowUpIcon,
        label: "Upload New Version",
        onClick: handleUploadNewVersion,
        className: "text-blue-600",
      },
      {
        icon: ClockIcon,
        label: "Version History",
        onClick: handleViewVersionHistory,
        className: "text-purple-600",
      },
    ] : []),
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
      icon: ArchiveBoxIcon,
      label: file.archived ? "Restore" : "Archive",
      onClick: handleArchive,
      className: file.archived ? "text-gray-700" : "",
    },
    {
      icon: TrashIcon,
      label: "Delete",
      onClick: () => {
        onDelete?.([file.id]);
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
      <EditFileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        file={file}
        onUpdate={(updatedFile) => {
          // Trigger a refresh of the file list
          window.dispatchEvent(new CustomEvent('files:refresh'));
        }}
      />

      <FolderSelectionModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        title={`Move "${file.name}"`}
        confirmText="Move Here"
        excludeFolderIds={file.type === 'folder' ? [file.id] : []}
        onSelect={async (folderId, folderName) => {
          try {
            if (file.type === 'file') {
              const { moveFile } = await import('../../services/api');
              await moveFile(file.id, folderId || undefined);
            } else {
              const { moveFolder } = await import('../../services/api');
              await moveFolder(file.id, folderId || undefined);
            }
            toast.success(`${file.type === 'file' ? 'File' : 'Folder'} moved to ${folderName}`);
            
            // Refresh the current view
            window.dispatchEvent(new CustomEvent('files:refresh'));
            window.dispatchEvent(new CustomEvent('files:modified'));
          } catch (error: any) {
            console.error('Error moving item:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to move item';
            toast.error(errorMessage);
          }
        }}
      />

      <FolderSelectionModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        title={`Copy "${file.name}"`}
        confirmText="Copy Here"
        onSelect={async (folderId, folderName) => {
          try {
            const { copyFile } = await import('../../services/api');
            await copyFile(file.id, folderId || undefined);
            toast.success(`File copied to ${folderName}`);
            
            // Refresh the current view
            window.dispatchEvent(new CustomEvent('files:refresh'));
          } catch (error: any) {
            console.error('Error copying file:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to copy file';
            toast.error(errorMessage);
          }
        }}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        files={file.type === 'file' ? [file] : []}
        folders={file.type === 'folder' ? [file] : []}
      />

      {/* Version Management Modals - Only for files */}
      {file.type !== 'folder' && (
        <>
          <UploadNewVersionModal
            isOpen={showUploadVersionModal}
            onClose={() => setShowUploadVersionModal(false)}
            file={file}
            onSuccess={() => {
              // Refresh the file list to show updated file
              window.dispatchEvent(new CustomEvent('files:refresh'));
            }}
          />

          <VersionHistoryModal
            isOpen={showVersionHistoryModal}
            onClose={() => setShowVersionHistoryModal(false)}
            file={file}
            onSuccess={() => {
              // Refresh the file list to show updated file
              window.dispatchEvent(new CustomEvent('files:refresh'));
            }}
          />
        </>
      )}
    </>
  );
}
