import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShareIcon,
  DocumentIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { getSharedWithMe, downloadFile, downloadFolder, deleteSharedItems } from "../services/api";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface SharedItem {
  id: string;
  file?: any;
  folder?: any;
  shared_by_email: string;
  shared_by_name: string;
  shared_at: string;
  message: string;
  share_type: 'FILE' | 'FOLDER';
  is_seen: boolean;
  item_name: string;
  item_type: string;
}

export default function SharedWithMe() {
  const [shares, setShares] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'files' | 'folders'>('all');
  const [selectedShares, setSelectedShares] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    loadSharedItems();
    
    // Also refresh notifications when component mounts
    refreshNotifications();
  }, [refreshNotifications]);
  
  // Refresh notifications when component unmounts (user navigates away)
  useEffect(() => {
    const handleFocus = () => {
      loadSharedItems();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      // Small delay to ensure API call completes before unmounting
      setTimeout(() => {
        refreshNotifications();
      }, 100);
    };
  }, [refreshNotifications]);

  const loadSharedItems = async () => {
    setLoading(true);
    try {
      // Simple approach: Just load shared items
      // The backend automatically updates last_shared_visit timestamp
      const response = await getSharedWithMe();
      setShares(response.shares || []);
      
      // Refresh notifications after visiting the page
      // This will update the badge count based on the new timestamp
      refreshNotifications();
    } catch (error) {
      console.error('Error loading shared items:', error);
      toast.error('Failed to load shared items');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (shareItem: SharedItem) => {
    try {
      if (shareItem.share_type === 'FILE' && shareItem.file) {
        await downloadFile(shareItem.file.id, shareItem.file.name);
        toast.success(`Downloading ${shareItem.file.name}...`);
      } else if (shareItem.share_type === 'FOLDER' && shareItem.folder) {
        await downloadFolder(shareItem.folder.id, shareItem.folder.name);
        toast.success(`Downloading ${shareItem.folder.name}.zip...`);
      } else {
        toast.error('Unable to download this item');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to download');
    }
  };

  const handleView = async (shareItem: SharedItem) => {
    try {
      if (shareItem.share_type === 'FILE' && shareItem.file) {
        // Import the viewFile API function
        const { viewFile } = await import('../services/api');
        
        // Use the API to get the file
        const url = await viewFile(shareItem.file.id);
        window.open(url, '_blank');
        
        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else if (shareItem.share_type === 'FOLDER' && shareItem.folder) {
        // Navigate to folder contents
        navigate(`/folders/${shareItem.folder.id}`);
      } else {
        toast.error('Unable to view this item');
      }
    } catch (error) {
      toast.error('Error viewing item');
      console.error('Error viewing item:', error);
    }
  };

  const handleDelete = async (shareItem: SharedItem) => {
    try {
      await deleteSharedItems([shareItem.id]);
      toast.success(`Removed "${shareItem.item_name}" from shared items`);
      
      // Remove from local state
      setShares(prev => prev.filter(item => item.id !== shareItem.id));
      
      // Refresh notifications to update counts
      refreshNotifications();
      
      // Trigger notification refresh event
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    } catch (error) {
      console.error('Error deleting shared item:', error);
      toast.error('Failed to remove shared item');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedShares.length === 0) return;
    
    try {
      await deleteSharedItems(selectedShares);
      toast.success(`Removed ${selectedShares.length} shared item(s)`);
      
      // Remove from local state
      setShares(prev => prev.filter(item => !selectedShares.includes(item.id)));
      setSelectedShares([]);
      setShowDeleteConfirm(false);
      
      // Refresh notifications to update counts
      refreshNotifications();
      
      // Trigger notification refresh event
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
    } catch (error) {
      console.error('Error deleting shared items:', error);
      toast.error('Failed to remove shared items');
    }
  };

  const handleSelectShare = (shareId: string, selected: boolean) => {
    if (selected) {
      setSelectedShares(prev => [...prev, shareId]);
    } else {
      setSelectedShares(prev => prev.filter(id => id !== shareId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedShares(filteredShares.map(share => share.id));
    } else {
      setSelectedShares([]);
    }
  };

  const filteredShares = shares.filter(share => {
    switch (filter) {
      case 'files':
        return share.share_type === 'FILE';
      case 'folders':
        return share.share_type === 'FOLDER';
      default:
        return true;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'folder') {
      return <FolderIcon className="h-8 w-8 text-yellow-500" />;
    }
    return <DocumentIcon className="h-8 w-8 text-blue-500" />;
  };

  const getFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-600"></div>
        <span className="ml-2 text-gray-600">Loading shared items...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <ShareIcon className="h-8 w-8 text-mint-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Shared With Me</h1>
        </div>
        <p className="text-gray-600">
          Files and folders that others have shared with you
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Items' },
            { key: 'files', label: 'Files' },
            { key: 'folders', label: 'Folders' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-mint-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          </div>
          
          {filteredShares.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedShares.length === filteredShares.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Select All</label>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedShares.length > 0 && (
        <div className="mb-6 p-4 bg-mint-50 border border-mint-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-mint-700">
              {selectedShares.length} item(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200 transition-colors"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Remove Selected
              </button>
              <button
                onClick={() => setSelectedShares([])}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {filteredShares.length === 0 ? (
        <div className="text-center py-12">
          <ShareIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No shared items' : `No ${filter} found`}
          </h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'Items shared with you will appear here'
              : `No ${filter} have been shared with you yet`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredShares.map((shareItem) => (
            <motion.div
              key={shareItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg border-2 p-6 hover:shadow-lg transition-shadow ${
                !shareItem.is_seen ? 'border-mint-200 bg-mint-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(shareItem.item_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {shareItem.item_name}
                      </h3>
                      {!shareItem.is_seen && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-mint-100 text-mint-800">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          New
                        </span>
                      )}
                    </div>

                    {/* Shared by info */}
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <UserIcon className="h-4 w-4 mr-1" />
                      <span>Shared by {shareItem.shared_by_name}</span>
                      <span className="mx-2">•</span>
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      <span>{shareItem.shared_by_email}</span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>{formatDate(shareItem.shared_at)}</span>
                    </div>

                    {/* Message */}
                    {shareItem.message && (
                      <div className="bg-gray-50 rounded-md p-3 mb-3">
                        <p className="text-sm text-gray-700">{shareItem.message}</p>
                      </div>
                    )}

                    {/* File details */}
                    {shareItem.file && (
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>Type: {shareItem.file.file_type?.toUpperCase()}</span>
                        {shareItem.file.file_size && (
                          <span>Size: {getFileSize(shareItem.file.file_size)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <input
                    type="checkbox"
                    checked={selectedShares.includes(shareItem.id)}
                    onChange={(e) => handleSelectShare(shareItem.id, e.target.checked)}
                    className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                  />
                  <button
                    onClick={() => handleView(shareItem)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title={shareItem.share_type === 'FILE' ? 'View file' : 'Open folder'}
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(shareItem)}
                    className="p-2 text-mint-600 hover:text-mint-700 hover:bg-mint-100 rounded-md transition-colors"
                    title={shareItem.share_type === 'FILE' ? 'Download file' : 'Download folder as ZIP'}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(shareItem)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                    title="Remove from shared items"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                  {shareItem.is_seen && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" title="Seen" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteConfirm(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Remove Shared Items
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to remove {selectedShares.length} shared item(s) from your view? 
                        This will only remove them from your "Shared with me" list, but won't delete the actual files.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
