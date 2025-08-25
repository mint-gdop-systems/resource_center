import React, { useState, useEffect } from "react";
import {
  FolderIcon,
  DocumentIcon,
  StarIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { getDashboardStats } from "../../services/api";
import { useAuth } from "../../services/auth";

interface StatCard {
  id: string;
  name: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "neutral";
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
          change: `${data.total_files.change >= 0 ? '+' : ''}${data.total_files.change}%`,
          changeType: data.total_files.change >= 0 ? "increase" : "decrease",
          icon: DocumentIcon,
          color: "mint",
        },
        {
          id: "folders",
          name: "Folders",
          value: data.total_folders.value.toLocaleString(),
          change: `${data.total_folders.change >= 0 ? '+' : ''}${data.total_folders.change}%`,
          changeType: data.total_folders.change >= 0 ? "increase" : "decrease",
          icon: FolderIcon,
          color: "blue",
        },
        {
          id: "starred",
          name: "Starred Files",
          value: data.starred_files.value.toLocaleString(),
          change: `${data.starred_files.change >= 0 ? '+' : ''}${data.starred_files.change}%`,
          changeType: data.starred_files.change >= 0 ? "increase" : "decrease",
          icon: StarIcon,
          color: "yellow",
        },
        {
          id: "shared",
          name: "Shared Files",
          value: data.starred_files.value.toLocaleString(), // Use starred files as placeholder since shared_files doesn't exist in backend
          change: `${data.starred_files.change >= 0 ? '+' : ''}${data.starred_files.change}%`,
          changeType: data.starred_files.change >= 0 ? "increase" : "decrease",
          icon: ChartBarIcon,
          color: "purple",
        },
        {
          id: "uploads",
          name: "This Month",
          value: data.files_this_month.value.toLocaleString(),
          change: `${data.files_this_month.change >= 0 ? '+' : ''}${data.files_this_month.change}%`,
          changeType: data.files_this_month.change >= 0 ? "increase" : "decrease",
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
      change: "0%",
      changeType: "neutral",
      icon: DocumentIcon,
      color: "mint",
    },
    {
      id: "folders",
      name: "Folders",
      value: "0",
      change: "0%",
      changeType: "neutral",
      icon: FolderIcon,
      color: "blue",
    },
    {
      id: "starred",
      name: "Starred Files",
      value: "0",
      change: "0%",
      changeType: "neutral",
      icon: StarIcon,
      color: "yellow",
    },
    {
      id: "shared",
      name: "Shared Files",
      value: "0",
      change: "0%",
      changeType: "neutral",
      icon: ChartBarIcon,
      color: "purple",
    },
    {
      id: "uploads",
      name: "This Month",
      value: "0",
      change: "0%",
      changeType: "neutral",
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <div className="mt-3 flex items-center">
                  <span
                    className={`inline-flex items-center text-sm font-medium ${stat.changeType === "increase"
                      ? "text-green-600"
                      : stat.changeType === "decrease"
                        ? "text-red-600"
                        : "text-gray-600"
                      }`}
                  >
                    {stat.changeType === "increase" && (
                      <svg
                        className="mr-1 h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {stat.changeType === "decrease" && (
                      <svg
                        className="mr-1 h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    from last month
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
