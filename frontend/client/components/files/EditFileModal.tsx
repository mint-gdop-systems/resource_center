import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { FileItem } from "../../types";
import { getFileDetails, updateFile, getCategories } from "../../services/api";
import toast from "react-hot-toast";

interface Category {
  id: number;
  name: string;
}

interface FileDetails {
  id: string;
  name: string;
  category: Category | null;
  meta_tags: Array<{ name: string }>;
  is_public: boolean;
}

interface EditFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem;
  onUpdate?: (updatedFile: any) => void;
}

export default function EditFileModal({
  isOpen,
  onClose,
  file,
  onUpdate,
}: EditFileModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Load file details and categories when modal opens
  useEffect(() => {
    if (isOpen && file.type === 'file') {
      loadData();
    }
  }, [isOpen, file.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load file details and categories in parallel
      const [fileResponse, categoriesResponse] = await Promise.all([
        getFileDetails(file.id),
        getCategories(),
      ]);

      const details = fileResponse.file;
      setFileDetails(details);
      setCategories(categoriesResponse.categories);

      // Populate form with current values
      setName(details.name);
      setSelectedCategoryId(details.category?.id || null);
      setTags(details.meta_tags?.map((tag: any) => tag.name).join(", ") || "");
      setIsPublic(details.is_public || false);
    } catch (error) {
      console.error("Error loading file details:", error);
      toast.error("Failed to load file details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("File name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      // Prepare update data
      const updateData = {
        name: name.trim(),
        category_id: selectedCategoryId,
        meta_tag_names: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        is_public: isPublic,
      };

      // Update the file
      const response = await updateFile(file.id, updateData);
      
      toast.success("File updated successfully");
      
      // Notify parent component of update
      onUpdate?.(response.file);
      
      // Refresh the file list and counts
      window.dispatchEvent(new CustomEvent('files:refresh'));
      
      onClose();
    } catch (error: any) {
      console.error("Error updating file:", error);
      const errorMessage = 
        error?.response?.data?.error || 
        error?.message || 
        "Failed to update file";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  // Handle file extension preservation
  const getFileNameParts = (fullName: string) => {
    const lastDotIndex = fullName.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return { baseName: fullName, extension: "" };
    }
    return {
      baseName: fullName.substring(0, lastDotIndex),
      extension: fullName.substring(lastDotIndex),
    };
  };

  const handleNameChange = (value: string) => {
    // Preserve the original extension
    if (fileDetails) {
      const { extension } = getFileNameParts(fileDetails.name);
      setName(value + extension);
    } else {
      setName(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
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
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Edit File
              </h3>
              <button
                onClick={handleClose}
                disabled={saving}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pb-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-600"></div>
                <span className="ml-2 text-gray-600">Loading file details...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Name */}
                <div>
                  <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
                    File Name
                  </label>
                  <input
                    id="fileName"
                    type="text"
                    value={fileDetails ? getFileNameParts(name).baseName : name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    placeholder="Enter file name"
                    disabled={saving}
                    required
                  />
                  {fileDetails && getFileNameParts(fileDetails.name).extension && (
                    <p className="text-sm text-gray-500 mt-1">
                      Extension: <span className="font-mono">{getFileNameParts(fileDetails.name).extension}</span>
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={selectedCategoryId || ""}
                    onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    disabled={saving}
                  >
                    <option value="">No Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <input
                    id="tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    placeholder="Enter tags separated by commas"
                    disabled={saving}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Separate multiple tags with commas
                  </p>
                </div>

                {/* Visibility */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                      disabled={saving}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Make this file public
                    </span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    Public files can be accessed by anyone with the link
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          {!loading && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !name.trim()}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-mint-600 text-base font-medium text-white hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
