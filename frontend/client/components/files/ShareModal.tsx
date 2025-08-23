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
  TrashIcon
} from "@heroicons/react/24/outline";
import { FileItem } from "../../types";
import { shareItems, sendFilesEmail } from "../../services/api";
import toast from "react-hot-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  files?: FileItem[];
  folders?: FileItem[];
}

type ShareMethod = 'internal' | 'email';

export default function ShareModal({
  isOpen,
  onClose,
  files = [],
  folders = []
}: ShareModalProps) {
  const [shareMethod, setShareMethod] = useState<ShareMethod>('internal');
  const [emails, setEmails] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmails(['']);
      setMessage('');
      setShareMethod('internal');
    }
  }, [isOpen]);

  const totalItems = files.length + folders.length;

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
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
    const validEmails = validateEmails();
    if (!validEmails) return;

    setLoading(true);
    try {
      const data = {
        file_ids: files.map(f => f.id),
        folder_ids: folders.map(f => f.id),
        emails: validEmails,
        message: message.trim()
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalItems === 0) {
      toast.error('No items selected to share');
      return;
    }

    if (shareMethod === 'internal') {
      handleInternalShare();
    } else {
      handleEmailShare();
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
                  Share {totalItems} Item{totalItems !== 1 ? 's' : ''}
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
              <div className="grid grid-cols-2 gap-2">
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

            {/* Email Fields */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {shareMethod === 'internal' ? 'User Email Addresses' : 'Recipient Email Addresses'}
              </label>
              <div className="space-y-2">
                {emails.map((email, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                      disabled={loading}
                    />
                    {emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailField(index)}
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
                  onClick={addEmailField}
                  className="flex items-center text-sm text-mint-600 hover:text-mint-700 transition-colors"
                  disabled={loading}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add another email
                </button>
              </div>
            </div>

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
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-mint-600 text-base font-medium text-white hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {shareMethod === 'internal' ? 'Sharing...' : 'Sending...'}
                </>
              ) : (
                shareMethod === 'internal' ? 'Share' : 'Send Email'
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
