import React, { useState } from "react";
import {
  ViewColumnsIcon,
  ListBulletIcon,
  PlusIcon,
  FunnelIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Breadcrumb from "../components/layout/Breadcrumb";
import FileGrid from "../components/files/FileGrid";
import FileList from "../components/files/FileList";
import QuickStats from "../components/dashboard/QuickStats";
import RecentActivity from "../components/dashboard/RecentActivity";
import { activityFeed } from "../data/mockData";
import { ViewMode } from "../types";
import { useFiles } from "../contexts/FileContext";
import FileUpload from "../components/files/FileUpload";

export default function Dashboard() {
  const { files } = useFiles();
  const [viewMode, setViewMode] = useState<ViewMode>({
    type: "grid",
    sortBy: "name",
    sortOrder: "asc",
  });

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Get recent files (last 4 files)
  const recentFiles = files.slice(0, 4);
  const starredFiles = files.filter((file) => file.starred);

  const breadcrumbItems = [
    { id: "dashboard", name: "Dashboard", path: "/dashboard" },
  ];

  const handleViewModeChange = (type: "grid" | "list") => {
    setViewMode((prev) => ({ ...prev, type }));
  };

  const handleFileSelect = (fileId: string, selected: boolean) => {
    if (selected) {
      setSelectedFiles((prev) => [...prev, fileId]);
    } else {
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedFiles(recentFiles.map((file) => file.id));
    } else {
      setSelectedFiles([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's an overview of your files and recent activity.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mint-500">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Folder
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center px-4 py-2 bg-mint-600 text-white text-sm font-medium rounded-lg hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Upload Files
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Recent Files Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Files
              </h2>
              <p className="text-sm text-gray-600">
                Files you've accessed recently
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange("grid")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode.type === "grid"
                      ? "bg-white text-mint-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <ViewColumnsIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode.type === "list"
                      ? "bg-white text-mint-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FunnelIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode.type === "grid" ? (
              <FileGrid
                files={recentFiles}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onSelectAll={handleSelectAll}
                viewMode={viewMode}
              />
            ) : (
              <FileList
                files={recentFiles}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onSelectAll={handleSelectAll}
                viewMode={viewMode}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Two column layout for starred files and activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Starred Files */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Starred Files
            </h2>
            <p className="text-sm text-gray-600">Your most important files</p>
          </div>
          <div className="p-6">
            {starredFiles.length > 0 ? (
              <div className="space-y-3">
                {starredFiles.slice(0, 5).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-medium text-yellow-700">
                          {file.extension?.toUpperCase() || "F"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {file.owner.name} •{" "}
                        {file.size ? `${Math.round(file.size / 1024)} KB` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No starred files yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Star files to access them quickly
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity activities={activityFeed} />
      </div>

      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          currentPath={[]}
        />
      )}
    </div>
  );
}
