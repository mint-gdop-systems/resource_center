import React from "react";
import {
  ArrowDownTrayIcon,
  TrashIcon,
  FolderIcon,
  ShareIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface BulkActionsProps {
  selectedFiles: string[];
  onDownload?: (fileIds: string[]) => void;
  onDelete?: (fileIds: string[]) => void;
  onMove?: (fileIds: string[], targetPath: string) => void;
  onShare?: (fileIds: string[]) => void;
  onStar?: (fileIds: string[], starred: boolean) => void;
  onClearSelection: () => void;
}

export default function BulkActions({
  selectedFiles,
  onDownload,
  onDelete,
  onMove,
  onShare,
  onStar,
  onClearSelection,
}: BulkActionsProps) {
  const handleDownload = () => {
    onDownload?.(selectedFiles);
    toast.success(`Downloading ${selectedFiles.length} files...`);
  };

  const handleShare = () => {
    onShare?.(selectedFiles);
    toast.success("Opening share options...");
  };

  const handleMove = () => {
    // This would open a move modal with folder selection
    onMove?.(selectedFiles, "/Strategic Plans");
    toast.success(`Moving ${selectedFiles.length} files...`);
  };

  const handleStar = () => {
    onStar?.(selectedFiles, true);
    toast.success(`Added ${selectedFiles.length} files to starred`);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedFiles.length} files? This action cannot be undone.`,
      )
    ) {
      onDelete?.(selectedFiles);
      toast.success(`Deleted ${selectedFiles.length} files`);
      onClearSelection();
    }
  };

  if (selectedFiles.length === 0) return null;

  return (
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
  );
}
