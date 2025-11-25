import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  XMarkIcon, 
  UserGroupIcon, 
  EnvelopeIcon,
  ShareIcon,
  DocumentIcon,
  FolderIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { FileItem } from "../../types";
import { shareItems, sendFilesEmail } from "../../services/api";
import { shareWithGroups, getUserGroupContext, searchUsers } from "../../services/groupApi";
import type { Group, UserGroupContext } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import toast from "react-hot-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  files?: FileItem[];
  folders?: FileItem[];
  isReshareMode?: boolean;
}

type ShareMethod = 'internal' | 'email' | 'groups';

export default function ShareModal({
  isOpen,
  onClose,
  files = [],
  folders = [],
  isReshareMode = false
}: ShareModalProps) {
  const [shareMethod, setShareMethod] = useState<ShareMethod>('internal');
  const [emails, setEmails] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Group sharing state
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [canDownload, setCanDownload] = useState(true);
  const [canReshare, setCanReshare] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  
  // Permission level state
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'comment'>('view');
  
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmails(['']);
      setMessage('');
      setShareMethod('internal');
      setSelectedGroups([]);
      setCanDownload(true);
      setCanReshare(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setPermissionLevel('view');
      loadUserGroups();
    }
  }, [isOpen]);

  // Search users as user types
  useEffect(() => {
    const searchUsersDebounced = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      try {
        setSearching(true);
        const response = await searchUsers(searchQuery.trim());
        setSearchResults(response.users);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsersDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadUserGroups = async () => {
    try {
      setGroupsLoading(true);
      const context = await getUserGroupContext();
      setUserGroups(context.member_groups);
    } catch (error) {
      console.error('Error loading user groups:', error);
      toast.error('Failed to load your groups');
    } finally {
      setGroupsLoading(false);
    }
  };

  const totalItems = files.length + folders.length;

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addEmail = () => {
    setEmails([...emails, '']);
  };

  const removeEmail = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index);
      setEmails(newEmails);
    }
  };

  const validateEmails = () => {
    const validEmails = emails.filter(email => {
      const trimmed = email.trim();
      return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    });
    
    if (validEmails.length === 0) {
      toast.error('Please enter at least one valid email address');
      return false;
    }
    
    return validEmails;
  };

  const handleInternalShare = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to share with');
      return;
    }

    setLoading(true);
    try {
      const userEmails = selectedUsers.map(user => user.email);
      const data = {
        file_ids: files.map(f => f.id),
        folder_ids: folders.map(f => f.id),
        emails: userEmails,
        message: message.trim(),
        is_reshare: isReshareMode,
        permission_level: permissionLevel
      };

      const response = await shareItems(data);
      
      if (response.errors && response.errors.length > 0) {
        toast.error(`Some shares failed: ${response.errors.join(', ')}`);
      } else {
        toast.success(`Successfully shared with ${response.shared.length} users`);
      }

      // Trigger immediate notification refresh
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      
      // Also trigger a files refresh in case the share affects the current view
      window.dispatchEvent(new CustomEvent('files:refresh'));
      
      onClose();
    } catch (error: any) {
      console.error('Error sharing items:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to share items';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailShare = async () => {
    const validEmails = validateEmails();
    if (!validEmails) return;

    if (files.length === 0) {
      toast.error('Email sharing is only available for files');
      return;
    }

    setLoading(true);
    try {
      const data = {
        file_ids: files.map(f => f.id),
        recipients: validEmails,
        message: message.trim()
      };

      const response = await sendFilesEmail(data);
      toast.success(`Email sent successfully to ${response.sent_to.length} recipients`);
      
      // Trigger notification refresh (though this is external sharing)
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to send email';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupShare = async () => {
    if (selectedGroups.length === 0) {
      toast.error('Please select at least one group to share with');
      return;
    }

    setLoading(true);
    try {
      const data = {
        file_ids: files.map(f => f.id),
        folder_ids: folders.map(f => f.id),
        group_ids: selectedGroups,
        message: message.trim(),
        can_download: canDownload,
        can_reshare: canReshare,
        is_reshare: isReshareMode,
        permission_level: permissionLevel
      };

      console.log('ShareModal: Sharing with groups, data:', data);
      const response = await shareWithGroups(data);
      console.log('ShareModal: Share response:', response);
      toast.success(`Successfully shared with ${response.shared_with_groups.length} group(s)`);
      
      // Trigger notification refresh
      console.log('ShareModal: Triggering refresh events');
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      
      // Also trigger a files refresh
      window.dispatchEvent(new CustomEvent('files:refresh'));
      
      onClose();
    } catch (error: any) {
      console.error('Error sharing with groups:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to share with groups';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalItems === 0) {
      toast.error('No items selected to share');
      return;
    }

    if (shareMethod === 'internal') {
      handleInternalShare();
    } else if (shareMethod === 'email') {
      handleEmailShare();
    } else if (shareMethod === 'groups') {
      handleGroupShare();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full"
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShareIcon className="h-6 w-6 text-mint-600 mr-2" />
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {isReshareMode ? 'Reshare' : 'Share'} {totalItems} Item{totalItems !== 1 ? 's' : ''}
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="bg-white px-4 pb-4 sm:p-6">
            {/* Items Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Items to share:</h4>
              <div className="space-y-1">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center text-sm text-gray-600">
                    <DocumentIcon className="h-4 w-4 mr-2 text-blue-500" />
                    {file.name}
                  </div>
                ))}
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center text-sm text-gray-600">
                    <FolderIcon className="h-4 w-4 mr-2 text-yellow-500" />
                    {folder.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Share Method Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShareMethod('internal')}
                  className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                    shareMethod === 'internal'
                      ? 'border-mint-600 bg-mint-50 text-mint-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Internal Users
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('groups')}
                  className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                    shareMethod === 'groups'
                      ? 'border-mint-600 bg-mint-50 text-mint-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Groups
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('email')}
                  className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                    shareMethod === 'email'
                      ? 'border-mint-600 bg-mint-50 text-mint-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={files.length === 0}
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Email
                </button>
              </div>
              {shareMethod === 'email' && files.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Email sharing is only available for files
                </p>
              )}
            </div>

            {/* Permission Level Selection - for internal and group sharing */}
            {(shareMethod === 'internal' || shareMethod === 'groups') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPermissionLevel('view')}
                    className={`flex flex-col items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      permissionLevel === 'view'
                        ? 'border-mint-600 bg-mint-50 text-mint-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    disabled={loading}
                  >
                    <span className="font-semibold">View Only</span>
                    <span className="text-xs mt-1 opacity-75">Read-only access</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionLevel('comment')}
                    className={`flex flex-col items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      permissionLevel === 'comment'
                        ? 'border-mint-600 bg-mint-50 text-mint-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    disabled={loading}
                  >
                    <span className="font-semibold">Comment</span>
                    <span className="text-xs mt-1 opacity-75">Can comment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissionLevel('edit')}
                    className={`flex flex-col items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      permissionLevel === 'edit'
                        ? 'border-mint-600 bg-mint-50 text-mint-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    disabled={loading}
                  >
                    <span className="font-semibold">Edit</span>
                    <span className="text-xs mt-1 opacity-75">Can edit</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {permissionLevel === 'view' && 'Recipients can view the file but cannot make changes.'}
                  {permissionLevel === 'comment' && 'Recipients can view and add comments to the file.'}
                  {permissionLevel === 'edit' && 'Recipients can view, edit, and save changes to the file.'}
                </p>
              </div>
            )}

            {/* User Search - for internal sharing */}
            {shareMethod === 'internal' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                
                {/* Search Input */}
                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, username, or email..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    disabled={loading}
                  />
                  {searching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-mint-600"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="mb-3">
                    {searchResults.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              if (!selectedUsers.find(u => u.id === user.id)) {
                                setSelectedUsers([...selectedUsers, user]);
                                setSearchQuery('');
                                setSearchResults([]);
                              }
                            }}
                            className="w-full flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                            disabled={selectedUsers.find(u => u.id === user.id)}
                          >
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {user.display_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.email}
                              </p>
                            </div>
                            {selectedUsers.find(u => u.id === user.id) && (
                              <div className="text-mint-600 text-xs">Selected</div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-sm text-gray-500 border border-gray-200 rounded-md">
                        No users found
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Users ({selectedUsers.length})
                    </label>
                    <div className="space-y-2">
                      {selectedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 bg-mint-50 border border-mint-200 rounded-md">
                          <div className="flex items-center">
                            <div className="h-6 w-6 bg-mint-200 rounded-full flex items-center justify-center mr-2">
                              <UserIcon className="h-3 w-3 text-mint-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.display_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedUsers(selectedUsers.filter(u => u.id !== user.id))}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            disabled={loading}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email Fields - for email sharing only */}
            {shareMethod === 'email' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email Addresses
                </label>
                <div className="space-y-2">
                  {emails.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="Enter email address"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                        disabled={loading}
                      />
                      {emails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmail(index)}
                          className="p-2 text-red-500 hover:text-red-700 transition-colors"
                          disabled={loading}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addEmail}
                    className="flex items-center text-sm text-mint-600 hover:text-mint-700 transition-colors"
                    disabled={loading}
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add another email
                  </button>
                </div>
              </div>
            )}

            {/* Group Selection - for group sharing */}
            {shareMethod === 'groups' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Groups
                </label>
                {groupsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-mint-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading your groups...</p>
                  </div>
                ) : userGroups.length === 0 ? (
                  <div className="text-center py-4 border border-gray-200 rounded-md bg-gray-50">
                    <UsersIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">You're not a member of any groups yet.</p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {userGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroups([...selectedGroups, group.id]);
                            } else {
                              setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                            }
                          }}
                          className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                          disabled={loading}
                        />
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {group.name}
                          </p>
                          {group.description && (
                            <p className="text-xs text-gray-500">
                              {group.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {group.member_count} members
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Permissions for group sharing */}
                {userGroups.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Permissions
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={canDownload}
                          onChange={(e) => setCanDownload(e.target.checked)}
                          className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                          disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Allow download
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={canReshare}
                          onChange={(e) => setCanReshare(e.target.checked)}
                          className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                          disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Allow re-sharing
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                placeholder="Add a message to recipients..."
                disabled={loading}
              />
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || (shareMethod === 'groups' && selectedGroups.length === 0) || (shareMethod === 'internal' && selectedUsers.length === 0)}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-mint-600 text-base font-medium text-white hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {shareMethod === 'internal' && 'Sharing...'}
                  {shareMethod === 'email' && 'Sending...'}
                  {shareMethod === 'groups' && 'Sharing...'}
                </>
              ) : (
                <>
                  {shareMethod === 'internal' && 'Share'}
                  {shareMethod === 'email' && 'Send Email'}
                  {shareMethod === 'groups' && 'Share with Groups'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
