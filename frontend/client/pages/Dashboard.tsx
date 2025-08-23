import React, { useState, useEffect } from "react";
import {
  ViewColumnsIcon,
  ListBulletIcon,
  ArrowRightIcon,
  PlusIcon,
  SparklesIcon,
  ClockIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../components/layout/Breadcrumb";
import FileGrid from "../components/files/FileGrid";
import FileList from "../components/files/FileList";
import QuickStats from "../components/dashboard/QuickStats";
import RecentActivity from "../components/dashboard/RecentActivity";
import WelcomeSection from "../components/dashboard/WelcomeSection";
import QuickActions from "../components/dashboard/QuickActions";

import { ViewMode } from "../types";
import { useFiles } from "../contexts/FileContext";
import FileUpload from "../components/files/FileUpload";
import { useAuth } from "../services/auth";
import { getRecentFiles, getDashboardStats } from "../services/api";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { authenticated, user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>({
    type: "grid",
    sortBy: "date",
    sortOrder: "desc",
  });

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [starredFiles, setStarredFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const breadcrumbItems = [
    { id: "dashboard", name: "Dashboard", path: "/dashboard" },
  ];

  useEffect(() => {
    if (authenticated) {
      fetchRecentFiles();
    }
  }, [authenticated]);

  const fetchRecentFiles = async () => {
    try {
      setLoading(true);
      const data = await getRecentFiles({ limit: 8, includeArchived: false });
      setRecentFiles(data.files || []);
      
      // Filter starred files from recent files
      const starred = (data.files || []).filter((file: any) => file.is_starred);
      setStarredFiles(starred);
    } catch (error) {
      console.error('Error fetching recent files:', error);
      toast.error('Failed to load recent files');
    } finally {
      setLoading(false);
    }
  };

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
      setSelectedFiles(recentFiles.map((file) => file.id.toString()));
    } else {
      setSelectedFiles([]);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getUserName = () => {
    if (!user) return "";
    return user.firstName || user.username || "User";
  };

  const getPersonalizedMessage = () => {
    return "Welcome back to your MINT Resource Center dashboard";
  };

  // Auto-refresh dashboard data
  useEffect(() => {
    const handleRefresh = () => {
      if (authenticated) {
        fetchRecentFiles();
      }
    };

    window.addEventListener('dashboard:refresh', handleRefresh);
    return () => window.removeEventListener('dashboard:refresh', handleRefresh);
  }, [authenticated]);

  // Show welcome section for unauthenticated users
  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <Breadcrumb items={breadcrumbItems} />
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Secure document management for the Ministry of Innovation and Technology
            </p>
          </div>
        </div>
        <WelcomeSection />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-mint-50 to-blue-50 rounded-2xl p-6 border border-mint-100"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1">
            <Breadcrumb items={breadcrumbItems} />
            <div className="mt-3 flex items-center space-x-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <SparklesIcon className="h-8 w-8 text-mint-500 mr-3" />
                  {getGreeting()}, {getUserName()}!
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  {getPersonalizedMessage()}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/files')}
              className="inline-flex items-center px-4 py-2 bg-white text-mint-600 text-sm font-medium rounded-lg border border-mint-200 hover:bg-mint-50 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2 transition-colors"
            >
              <ViewColumnsIcon className="h-4 w-4 mr-2" />
              Browse Files
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center px-6 py-3 bg-mint-600 text-white text-sm font-medium rounded-lg hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Upload Files
            </button>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <QuickStats />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <QuickActions 
          onUpload={() => setShowUpload(true)}
        />
      </motion.div>

      {/* Enhanced Recent Files Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-mint-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-mint-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Files
                </h2>
                <p className="text-sm text-gray-600">
                  Files you've uploaded recently
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Enhanced View mode toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 shadow-inner">
                <button
                  onClick={() => handleViewModeChange("grid")}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode.type === "grid"
                      ? "bg-white text-mint-600 shadow-sm transform scale-105"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  title="Grid view"
                >
                  <ViewColumnsIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode.type === "list"
                      ? "bg-white text-mint-600 shadow-sm transform scale-105"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  title="List view"
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Enhanced View all button */}
              <button
                onClick={() => navigate('/recent')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-mint-600 hover:text-mint-700 hover:bg-mint-50 rounded-lg transition-all duration-200 border border-mint-200 hover:border-mint-300"
              >
                View all
                <ArrowRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-32 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recentFiles.length > 0 ? (
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
                  isAuthenticated={authenticated}
                  setShowUpload={setShowUpload}
                />
              ) : (
                <FileList
                  files={recentFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                  viewMode={viewMode}
                  isAuthenticated={authenticated}
                  setShowUpload={setShowUpload}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-mint-100 to-mint-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ViewColumnsIcon className="h-10 w-10 text-mint-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to get started?</h3>
              <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
                Upload your first file to begin organizing and managing your documents with MINT Resource Center.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center px-6 py-3 bg-mint-600 text-white text-lg font-medium rounded-xl hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Upload Your First File
                </button>
                <button
                  onClick={() => navigate('/files')}
                  className="inline-flex items-center px-6 py-3 bg-white text-mint-600 text-lg font-medium rounded-xl border-2 border-mint-200 hover:border-mint-300 hover:bg-mint-50 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2 transition-colors"
                >
                  <FolderIcon className="h-5 w-5 mr-2" />
                  Browse Files
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Two column layout for starred files and activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Starred Files */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Starred Files
                  </h2>
                  <p className="text-sm text-gray-600">Your most important files</p>
                </div>
              </div>
              {starredFiles.length > 0 && (
                <button
                  onClick={() => navigate('/starred')}
                  className="inline-flex items-center text-sm font-medium text-mint-600 hover:text-mint-700 hover:bg-mint-50 px-3 py-1 rounded-lg transition-colors"
                >
                  View all
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            {starredFiles.length > 0 ? (
              <div className="space-y-3">
                {starredFiles.slice(0, 5).map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 group"
                    onClick={() => navigate(`/files?highlight=${file.id}`)}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg flex items-center justify-center group-hover:from-yellow-200 group-hover:to-yellow-300 transition-all duration-200">
                        <span className="text-xs font-bold text-yellow-700">
                          {file.file_type?.toUpperCase().slice(0, 3) || "F"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-mint-700 transition-colors">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
                        {file.file_size ? `${Math.round(file.file_size / 1024)} KB` : ""} • 
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No starred files yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Star files to access them quickly from here
                </p>
                <button
                  onClick={() => navigate('/files')}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-mint-600 hover:text-mint-700 hover:bg-mint-50 rounded-lg transition-colors"
                >
                  Browse Files
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Enhanced Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <RecentActivity limit={6} />
        </motion.div>
      </div>



      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          currentPath={[]}
          onSuccess={() => {
            fetchRecentFiles();
            // Refresh stats
            window.dispatchEvent(new CustomEvent('dashboard:refresh'));
          }}
        />
      )}
    </div>
  );
}
