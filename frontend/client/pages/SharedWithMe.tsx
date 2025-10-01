import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  ShareIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileImage,
  faFileAlt,
  faFileArchive,
  faFile,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { getSharedWithMe, downloadFile, downloadFolder, deleteSharedItems } from "../services/api";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { usePagination } from "../hooks/usePagination";
import PaginationComponent from "../components/ui/PaginationComponent";

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
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const [shares, setShares] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'files' | 'folders'>('all');
  const [selectedShares, setSelectedShares] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  // Pagination
  const pagination = usePagination({
    totalItems: filteredShares.length,
    itemsPerPage,
    initialPage: 1,
  });

  const paginatedShares = pagination.getPageItems(filteredShares);

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

  const fileTypeIconMap: Record<string, any> = {
    pdf: faFilePdf,
    doc: faFileWord,
    docx: faFileWord,
    xls: faFileExcel,
    xlsx: faFileExcel,
    ppt: faFilePowerpoint,
    pptx: faFilePowerpoint,
    jpg: faFileImage,
    jpeg: faFileImage,
    png: faFileImage,
    gif: faFileImage,
    txt: faFileAlt,
    zip: faFileArchive,
    rar: faFileArchive,
  };

  const getFileIcon = (shareItem: SharedItem) => {
    if (shareItem.share_type === 'FOLDER' || shareItem.item_type === 'folder') {
      return <FontAwesomeIcon icon={faFolder} className="text-yellow-500 h-8 w-8" />;
    }
    // For files, get extension from file_type
    const ext = shareItem.file?.file_type?.toLowerCase() || '';
    const icon = fileTypeIconMap[ext] || faFile;
    let colorClass = "text-blue-500";
    if (icon === faFilePdf) colorClass = "text-red-600";
    if (icon === faFileWord) colorClass = "text-blue-700";
    if (icon === faFileExcel) colorClass = "text-green-600";
    if (icon === faFilePowerpoint) colorClass = "text-orange-500";
    if (icon === faFileImage) colorClass = "text-pink-500";
    if (icon === faFileArchive) colorClass = "text-yellow-600";
    if (icon === faFileAlt) colorClass = "text-gray-500";
    return <FontAwesomeIcon icon={icon} className={`${colorClass} h-8 w-8`} />;
  };

  const getFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDarkMode ? 'bg-gray-800' : ''}`}>
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-mint-400' : 'border-mint-600'}`}></div>
        <span className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading shared items...</span>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isDarkMode ? 'bg-gray-800' : ''}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <ShareIcon className={`h-8 w-8 mr-3 ${isDarkMode ? 'text-mint-400' : 'text-mint-600'}`} />
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Shared With Me</h1>
        </div>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
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
                  ? isDarkMode ? 'bg-mint-700 text-mint-100' : 'bg-mint-600 text-white'
                  : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                className={`h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
              />
              <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select All</label>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedShares.length > 0 && (
        <div className={`mb-6 p-4 rounded-lg border ${isDarkMode ? 'bg-mint-900 border-mint-700' : 'bg-mint-50 border-mint-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-mint-300' : 'text-mint-700'}`}>{selectedShares.length} item(s) selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isDarkMode ? 'text-red-300 bg-red-900 border border-red-700 hover:bg-red-800' : 'text-red-700 bg-red-100 border border-red-200 hover:bg-red-200'}`}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Remove Selected
              </button>
              <button
                onClick={() => setSelectedShares([])}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isDarkMode ? 'text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200'}`}
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {filteredShares.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'bg-gray-800 rounded-xl border border-gray-700' : ''}`}>
          <ShareIcon className={`h-16 w-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{filter === 'all' ? 'No shared items' : `No ${filter} found`}</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {filter === 'all' 
              ? 'Items shared with you will appear here'
              : `No ${filter} have been shared with you yet`
            }
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedShares.map((shareItem) => (
            <motion.div
              key={shareItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border-2 p-6 hover:shadow-lg transition-shadow ${isDarkMode ? (!shareItem.is_seen ? 'border-mint-700 bg-mint-900' : 'border-gray-700 bg-gray-800') : (!shareItem.is_seen ? 'border-mint-200 bg-mint-50' : 'border-gray-200 bg-white')}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(shareItem)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className={`text-lg font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{shareItem.item_name}</h3>
                      
                    </div>

                    {/* Shared by info */}
                    <div className={`flex items-center text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <UserIcon className="h-4 w-4 mr-1" />
                      <span>Shared by {shareItem.shared_by_name}</span>
                      <span className="mx-2"></span>
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      <span>{shareItem.shared_by_email}</span>
                    </div>

                    {/* Date */}
                    <div className={`flex items-center text-sm mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>{formatDate(shareItem.shared_at)}</span>
                    </div>

                    {/* Message */}
                    {shareItem.message && (
                      <div className={`rounded-md p-3 mb-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{shareItem.message}</p>
                      </div>
                    )}

                    {/* File details */}
                    {shareItem.file && (
                      <div className={`flex items-center text-sm space-x-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                    className={`h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                  />
                  <button
                    onClick={() => handleView(shareItem)}
                    className={`p-2 rounded-md transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    title={shareItem.share_type === 'FILE' ? 'View file' : 'Open folder'}
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(shareItem)}
                    className={`p-2 rounded-md transition-colors ${isDarkMode ? 'text-mint-300 hover:text-mint-100 hover:bg-mint-900' : 'text-mint-600 hover:text-mint-700 hover:bg-mint-100'}`}
                    title={shareItem.share_type === 'FILE' ? 'Download file' : 'Download folder as ZIP'}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(shareItem)}
                    className={`p-2 rounded-md transition-colors ${isDarkMode ? 'text-red-300 hover:text-red-100 hover:bg-red-900' : 'text-red-600 hover:text-red-700 hover:bg-red-100'}`}
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

          {/* Pagination */}
          {filteredShares.length > 0 && (
            <div className="mt-8 space-y-4">
              {/* Pagination Info and Items Per Page Selector */}
              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Showing {pagination.startIndex + 1} to {Math.min(pagination.endIndex + 1, filteredShares.length)} of {filteredShares.length} shared items
                  </div>
                  {pagination.totalPages > 1 && (
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                    }`}>
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    Show:
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      const newItemsPerPage = Number(e.target.value);
                      setItemsPerPage(newItemsPerPage);
                      pagination.setItemsPerPage(newItemsPerPage);
                    }}
                    className={`px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                        : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                    }`}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    per page
                  </span>
                </div>
              </div>

              {/* Pagination Component */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center">
                  <PaginationComponent
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={pagination.goToPage}
                    showFirstLast={true}
                    showPreviousNext={true}
                    maxVisiblePages={7}
                    size="default"
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className={`fixed inset-0 transition-opacity ${isDarkMode ? 'bg-gray-900 bg-opacity-80' : 'bg-gray-500 bg-opacity-75'}`} onClick={() => setShowDeleteConfirm(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}> 
              <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}> 
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${isDarkMode ? 'bg-red-900' : 'bg-red-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                    <TrashIcon className={`h-6 w-6 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`} />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className={`text-lg leading-6 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Remove Shared Items</h3>
                    <div className="mt-2">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Are you sure you want to remove {selectedShares.length} shared item(s) from your view? This will only remove them from your "Shared with me" list, but won't delete the actual files.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}> 
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${isDarkMode ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-400' : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'} sm:ml-3 sm:w-auto sm:text-sm`}
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 focus:ring-mint-400' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-mint-500'} sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm`}
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
