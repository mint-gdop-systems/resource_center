import React, { useState } from "react";
import {
  ArrowDownTrayIcon,
  TrashIcon,
  FolderIcon,
  ShareIcon,
  StarIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import FolderSelectionModal from "./FolderSelectionModal";
import ShareModal from "./ShareModal";

interface BulkActionsProps {
  selectedFiles: string[];
  selectedItems?: any[]; // Full item objects for clipboard operations
  onDownload?: (fileIds: string[]) => void;
  onDelete?: (fileIds: string[]) => void;
  onMove?: (fileIds: string[], targetPath: string) => void;
  onShare?: (fileIds: string[]) => void;
  onStar?: (fileIds: string[], starred: boolean) => void;
  onClearSelection: () => void;
  onView?: (fileId: string) => void;
}

export default function BulkActions({
  selectedFiles,
  selectedItems = [],
  onDownload,
  onDelete,
  onMove,
  onShare,
  onStar,
  onClearSelection,
  onView,
}: BulkActionsProps) {
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const handleDownload = async () => {
    try {
      const fileIds = selectedItems.filter(item => item.type === 'file').map(item => item.id);
      const folderIds = selectedItems.filter(item => item.type === 'folder').map(item => item.id);
      
      if (selectedItems.length === 1) {
        const item = selectedItems[0];
        if (item.type === 'file') {
          // Single file download
          const { downloadFile } = await import('../../services/api');
          await downloadFile(item.id, item.name);
          toast.success(`Downloading ${item.name}...`);
        } else {
          // Single folder download
          const { downloadFolder } = await import('../../services/api');
          await downloadFolder(item.id, item.name);
          toast.success(`Downloading ${item.name}.zip...`);
        }
      } else {
        // Multiple items download as ZIP
        const { api } = await import('../../services/api');
        const response = await api.post('/bulk-download/', {
          file_ids: fileIds,
          folder_ids: folderIds
        }, {
          responseType: 'blob',
        });
        
        // Create blob and download
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        link.download = `selected_items_${timestamp}.zip`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Downloading ${selectedItems.length} items as ZIP...`);
      }
    } catch (error) {
      console.error('Error downloading items:', error);
      toast.error('Failed to download items. Please try again.');
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const [showMoveModal, setShowMoveModal] = useState(false);

  const handleMove = () => {
    setShowMoveModal(true);
  };

  const handleStar = () => {
    onStar?.(selectedFiles, true);
    toast.success(`Added ${selectedFiles.length} files to starred`);
  };

  const handleDelete = () => {
    onDelete?.(selectedFiles);
    // The toast message is now handled in the context, so we can remove it from here.
  };

  const handleCopyToFolder = () => {
    setShowCopyModal(true);
  };

  if (selectedFiles.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-mint-50 border border-mint-200 rounded-lg mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-mint-700 font-medium">
            {selectedFiles.length} item{selectedFiles.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-mint-600 hover:text-mint-700 underline"
          >
            Clear selection
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {selectedFiles.length === 1 && (
            <button
              onClick={async () => {
                try {
                  // Import the viewFile API function
                  const { viewFile } = await import('../../services/api');

                  // Use the API to get the file
                  const url = await viewFile(selectedFiles[0]);
                  window.open(url, '_blank');

                  // Clean up the blob URL after a delay
                  setTimeout(() => URL.revokeObjectURL(url), 100);
                } catch (error) {
                  console.error('Error viewing file:', error);
                  toast.error('Failed to open file. Please try again.');
                }
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm text-mint-600 hover:text-mint-700 hover:bg-mint-100 rounded-md transition-colors"
              title="View file"
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </button>
          )}
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-1.5 text-sm text-mint-600 hover:text-mint-700 hover:bg-mint-100 rounded-md transition-colors"
            title="Download selected files"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Download
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center px-3 py-1.5 text-sm text-mint-600 hover:text-mint-700 hover:bg-mint-100 rounded-md transition-colors"
            title="Share selected files"
          >
            <ShareIcon className="h-4 w-4 mr-1" />
            Share
          </button>

          <button
            onClick={handleStar}
            className="inline-flex items-center px-3 py-1.5 text-sm text-mint-600 hover:text-mint-700 hover:bg-mint-100 rounded-md transition-colors"
            title="Add to starred"
          >
            <StarIcon className="h-4 w-4 mr-1" />
            Star
          </button>

          <button
            onClick={handleCopyToFolder}
            className="inline-flex items-center px-3 py-1.5 text-sm text-mint-600 hover:text-mint-700 hover:bg-mint-100 rounded-md transition-colors"
            title="Copy to folder"
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
            Copy
          </button>

          <button
            onClick={handleMove}
            className="inline-flex items-center px-3 py-1.5 text-sm text-mint-600 hover:text-mint-700 hover:bg-mint-100 rounded-md transition-colors"
            title="Move selected files"
          >
            <FolderIcon className="h-4 w-4 mr-1" />
            Move
          </button>

          <div className="w-px h-6 bg-mint-200" />

          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            title="Delete selected files"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </button>
        </div>
      </div>

      {/* Copy Modal */}
      <FolderSelectionModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        title={`Copy ${selectedFiles.length} item${selectedFiles.length > 1 ? 's' : ''}`}
        confirmText="Copy Here"
        onSelect={async (folderId, folderName) => {
          try {
            const fileIds = selectedItems.filter(item => item.type === 'file').map(item => item.id);
            const folderIds = selectedItems.filter(item => item.type === 'folder').map(item => item.id);

            const { copyMultipleItems } = await import('../../services/api');
            const result = await copyMultipleItems(fileIds, folderIds, folderId || undefined);
            toast.success(`Items copied to ${folderName}`);

            // Refresh the current view
            window.dispatchEvent(new CustomEvent('files:refresh'));
          } catch (error: any) {
            console.error('Error copying items:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to copy items';
            toast.error(errorMessage);
          }
        }}
      />

      {/* Move Modal */}
      <FolderSelectionModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        title={`Move ${selectedFiles.length} item${selectedFiles.length > 1 ? 's' : ''}`}
        confirmText="Move Here"
        excludeFolderIds={selectedItems.filter(item => item.type === 'folder').map(item => item.id)}
        onSelect={async (folderId, folderName) => {
          try {
            const fileIds = selectedItems.filter(item => item.type === 'file').map(item => item.id);
            const folderIds = selectedItems.filter(item => item.type === 'folder').map(item => item.id);

            const { moveMultipleItems } = await import('../../services/api');
            const result = await moveMultipleItems(fileIds, folderIds, folderId || undefined);
            toast.success(`Items moved to ${folderName}`);

            // Refresh the current view
            window.dispatchEvent(new CustomEvent('files:refresh'));
          } catch (error: any) {
            console.error('Error moving items:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to move items';
            toast.error(errorMessage);
          }
        }}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        files={selectedItems.filter(item => item.type === 'file')}
        folders={selectedItems.filter(item => item.type === 'folder')}
      />
    </>
  );
}
