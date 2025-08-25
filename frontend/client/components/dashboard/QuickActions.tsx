import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PlusIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  StarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { createFolder } from "../../services/api";
import FolderModal from "../ui/FolderModal";

interface QuickActionsProps {
  onUpload: () => void;
}

const actions = [
  {
    id: "upload",
    name: "Upload Files",
    description: "Add new files to your workspace",
    icon: PlusIcon,
    color: "mint",
    action: "upload",
  },
  {
    id: "create-folder",
    name: "Create Folder",
    description: "Organize files in folders",
    icon: FolderPlusIcon,
    color: "blue",
    action: "create-folder",
  },
  {
    id: "search",
    name: "Search Files",
    description: "Find files quickly",
    icon: MagnifyingGlassIcon,
    color: "purple",
    path: "/files",
  },
  {
    id: "recent",
    name: "Recent Files",
    description: "View recently uploaded files",
    icon: ClockIcon,
    color: "green",
    path: "/recent",
  },
  {
    id: "starred",
    name: "Starred Files",
    description: "Access your important files",
    icon: StarIcon,
    color: "yellow",
    path: "/files?filter=starred",
  },
  {
    id: "shared",
    name: "Shared Files",
    description: "Files shared with you",
    icon: ShareIcon,
    color: "orange",
    path: "/shared-with-me",
  },
];

const colorClasses = {
  mint: {
    bg: "bg-mint-50 hover:bg-mint-100 dark:bg-mint-900/20 dark:hover:bg-mint-900/30",
    icon: "text-mint-600 dark:text-mint-400",
    border: "border-mint-200 hover:border-mint-300 dark:border-mint-800 dark:hover:border-mint-700",
  },
  blue: {
    bg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-700",
  },
  purple: {
    bg: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 hover:border-purple-300 dark:border-purple-800 dark:hover:border-purple-700",
  },
  green: {
    bg: "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30",
    icon: "text-green-600 dark:text-green-400",
    border: "border-green-200 hover:border-green-300 dark:border-green-800 dark:hover:border-green-700",
  },
  yellow: {
    bg: "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30",
    icon: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-200 hover:border-yellow-300 dark:border-yellow-800 dark:hover:border-yellow-700",
  },
  orange: {
    bg: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30",
    icon: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 hover:border-orange-300 dark:border-orange-800 dark:hover:border-orange-700",
  },
};

export default function QuickActions({ onUpload }: QuickActionsProps) {
  const navigate = useNavigate();
  const [showFolderModal, setShowFolderModal] = useState(false);

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name);
      // Refresh the current view
      window.dispatchEvent(new CustomEvent('files:refresh'));
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error; // Let FolderModal handle the error display
    }
  };

  const handleActionClick = (action: typeof actions[0]) => {
    if (action.action === "upload") {
      onUpload();
    } else if (action.action === "create-folder") {
      setShowFolderModal(true);
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Quick Actions</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Common tasks to help you get things done faster
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => {
          const colors = colorClasses[action.color as keyof typeof colorClasses];
          const IconComponent = action.icon;

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => handleActionClick(action)}
              className={`group p-4 rounded-xl border-2 ${colors.bg} ${colors.border} transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mint-500`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-lg ${colors.bg} group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                    {action.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    {action.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Folder Creation Modal */}
      <FolderModal 
        open={showFolderModal} 
        onClose={() => setShowFolderModal(false)} 
        onCreate={handleCreateFolder} 
      />
    </div>
  );
}