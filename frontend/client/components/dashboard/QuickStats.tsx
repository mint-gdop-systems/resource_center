import React, { useState, useEffect } from "react";
import {
  FolderIcon,
  DocumentIcon,
  StarIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { getDashboardStats } from "../../services/api";
import { useAuth } from "../../services/auth";
import { useStorageQuota } from "../../hooks/useStorageQuota";

interface StatCard {
  id: string;
  name: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const colorClasses = {
  mint: {
    bg: "bg-mint-50 dark:bg-mint-900/20",
    icon: "text-mint-600 dark:text-mint-400",
    ring: "ring-mint-100 dark:ring-mint-800/50",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    icon: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-100 dark:ring-blue-800/50",
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    icon: "text-yellow-600 dark:text-yellow-400",
    ring: "ring-yellow-100 dark:ring-yellow-800/50",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    icon: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-100 dark:ring-orange-800/50",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    icon: "text-green-600 dark:text-green-400",
    ring: "ring-green-100 dark:ring-green-800/50",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    icon: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-100 dark:ring-purple-800/50",
  },
};

export default function QuickStats() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authenticated } = useAuth();
  const { quota, formatBytes, getUsageStatus } = useStorageQuota();

  useEffect(() => {
    if (authenticated) {
      fetchStats();

      // Auto-refresh stats when dashboard refreshes
      const handleRefresh = () => fetchStats();
      window.addEventListener('dashboard:refresh', handleRefresh);

      return () => window.removeEventListener('dashboard:refresh', handleRefresh);
    } else {
      // Show default stats for unauthenticated users
      setStats(getDefaultStats());
      setLoading(false);
    }
  }, [authenticated]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();

      const statsData: StatCard[] = [
        {
          id: "total-files",
          name: "Total Files",
          value: data.total_files.value.toLocaleString(),
          icon: DocumentIcon,
          color: "mint",
        },
        {
          id: "folders",
          name: "Folders",
          value: data.total_folders.value.toLocaleString(),
          icon: FolderIcon,
          color: "blue",
        },
        {
          id: "starred",
          name: "Starred Files",
          value: data.starred_files.value.toLocaleString(),
          icon: StarIcon,
          color: "yellow",
        },
        {
          id: "shared",
          name: "Shared Files",
          value: data.starred_files.value.toLocaleString(), // Use starred files as placeholder since shared_files doesn't exist in backend
          icon: ChartBarIcon,
          color: "purple",
        },
        {
          id: "uploads",
          name: "Uploads This Month",
          value: data.files_this_month.value.toLocaleString(),
          icon: CloudArrowUpIcon,
          color: "green",
        },
      ];

      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load statistics');
      // Fallback to default stats
      setStats(getDefaultStats());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStats = (): StatCard[] => [
    {
      id: "total-files",
      name: "Total Files",
      value: "0",
      icon: DocumentIcon,
      color: "mint",
    },
    {
      id: "folders",
      name: "Folders",
      value: "0",
      icon: FolderIcon,
      color: "blue",
    },
    {
      id: "starred",
      name: "Starred Files",
      value: "0",
      icon: StarIcon,
      color: "yellow",
    },
    {
      id: "shared",
      name: "Shared Files",
      value: "0",
      icon: ChartBarIcon,
      color: "purple",
    },
    {
      id: "uploads",
      name: "Uploads This Month",
      value: "0",
      icon: CloudArrowUpIcon,
      color: "green",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && !authenticated) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Welcome to MINT Resource Center</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign in to view your personalized dashboard statistics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const colors = colorClasses[stat.color as keyof typeof colorClasses];
        const IconComponent = stat.icon;

        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${colors.bg} ring-4 ${colors.ring}`}
                  >
                    <IconComponent className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Storage Quota Card */}
      {authenticated && quota && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: stats.length * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ring-4 ${
                    getUsageStatus(quota.storage_usage_percentage) === 'danger'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-100 dark:ring-red-800/50'
                      : getUsageStatus(quota.storage_usage_percentage) === 'warning'
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 ring-orange-100 dark:ring-orange-800/50'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 ring-green-100 dark:ring-green-800/50'
                  }`}
                >
                  <CircleStackIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Storage Used
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatBytes(quota.storage_used)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    of {formatBytes(quota.storage_quota)} ({quota.storage_usage_percentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getUsageStatus(quota.storage_usage_percentage) === 'danger'
                        ? 'bg-red-500'
                        : getUsageStatus(quota.storage_usage_percentage) === 'warning'
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(quota.storage_usage_percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
