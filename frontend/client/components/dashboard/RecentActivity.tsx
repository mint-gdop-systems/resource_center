import React from "react";
import { motion } from "framer-motion";
import {
  CloudArrowUpIcon,
  ShareIcon,
  PencilIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";

interface Activity {
  id: string;
  type: "upload" | "share" | "edit" | "download";
  user: {
    name: string;
    avatar?: string;
  };
  file: {
    name: string;
  };
  timestamp: Date;
  description: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
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

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
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
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-start space-x-3"
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
        ) : (
          <div className="text-center py-8">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No recent activity
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Activity will appear here as you and your team work with files.
            </p>
          </div>
        )}
        {/* Removed 'View all activity' button for now */}
      </div>
    </div>
  );
}
