import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CloudArrowUpIcon,
  ShareIcon,
  PencilIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import { getDashboardActivity } from "../../services/api";
import { useAuth } from "../../services/auth";

interface Activity {
  id: string;
  type: "upload" | "share" | "edit" | "download";
  user: {
    name: string;
    avatar?: string;
  };
  file: {
    name: string;
    id: number;
  };
  timestamp: string;
  description: string;
}

interface RecentActivityProps {
  limit?: number;
}

export default function RecentActivity({ limit = 8 }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authenticated } = useAuth();

  useEffect(() => {
    if (authenticated) {
      fetchActivity();
      
      // Auto-refresh activity when dashboard refreshes
      const handleRefresh = () => fetchActivity();
      window.addEventListener('dashboard:refresh', handleRefresh);
      
      return () => window.removeEventListener('dashboard:refresh', handleRefresh);
    } else {
      setActivities([]);
      setLoading(false);
    }
  }, [authenticated, limit]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const data = await getDashboardActivity(limit);
      setActivities(data.activities);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard activity:', err);
      setError('Failed to load recent activity');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };
  const getActivityIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "upload":
        return <CloudArrowUpIcon className={`${iconClass} text-green-600`} />;
      case "share":
        return <ShareIcon className={`${iconClass} text-blue-600`} />;
      case "edit":
        return <PencilIcon className={`${iconClass} text-orange-600`} />;
      default:
        return <DocumentIcon className={`${iconClass} text-gray-600`} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "upload":
        return "bg-green-50 border-green-200";
      case "share":
        return "bg-blue-50 border-blue-200";
      case "edit":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return "Just now";
    } else if (minutes < 60) {
      return `${minutes} min ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <p className="text-sm text-gray-600">
          Latest actions in your workspace
        </p>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-start space-x-3 animate-pulse">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <DocumentIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Failed to load activity
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {error}
            </p>
            <button
              onClick={fetchActivity}
              className="mt-3 text-sm text-mint-600 hover:text-mint-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-start space-x-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors cursor-pointer"
              >
                <div
                  className={`flex-shrink-0 p-2 rounded-lg border ${getActivityColor(activity.type)}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 flex-shrink-0">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {activity.file.name}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : authenticated ? (
          <div className="text-center py-8">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No recent activity
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Activity will appear here as you work with files.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Sign in to view activity
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Your recent file activity will appear here after signing in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
