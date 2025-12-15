import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  ChartBarIcon,
  ArchiveBoxIcon,
  ClockIcon,
  ServerIcon,
  DocumentIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { formatFileSize } from "../../lib/utils";

interface ArchiveAnalyticsProps {
  archivedItems: Array<{
    id: string;
    type: 'file' | 'folder';
    size?: number;
    archivedAt: Date | null;
    archivedBy: string | null;
    archivedByName: string | null;
  }>;
}

export default function ArchiveAnalytics({ archivedItems }: ArchiveAnalyticsProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  const analytics = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const totalFiles = archivedItems.filter(item => item.type === 'file').length;
    const totalFolders = archivedItems.filter(item => item.type === 'folder').length;
    
    const totalSize = archivedItems
      .filter(item => item.type === 'file' && item.size)
      .reduce((sum, item) => sum + (item.size || 0), 0);

    const archivedThisWeek = archivedItems.filter(item => 
      item.archivedAt && item.archivedAt >= oneWeekAgo
    ).length;

    const archivedThisMonth = archivedItems.filter(item => 
      item.archivedAt && item.archivedAt >= oneMonthAgo
    ).length;

    const archivedThreeMonths = archivedItems.filter(item => 
      item.archivedAt && item.archivedAt >= threeMonthsAgo
    ).length;

    // Group by user who archived
    const archivedByUser = archivedItems.reduce((acc, item) => {
      const user = item.archivedByName || 'Unknown';
      acc[user] = (acc[user] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topArchivers = Object.entries(archivedByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Group by month for trend
    const monthlyTrend = archivedItems.reduce((acc, item) => {
      if (!item.archivedAt) return acc;
      
      const monthKey = item.archivedAt.toISOString().slice(0, 7); // YYYY-MM
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months

    return {
      totalFiles,
      totalFolders,
      totalSize,
      archivedThisWeek,
      archivedThisMonth,
      archivedThreeMonths,
      topArchivers,
      trendData,
    };
  }, [archivedItems]);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = 'mint' 
  }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: 'mint' | 'blue' | 'purple' | 'orange';
  }) => {
    const colorClasses = {
      mint: isDarkMode ? 'text-mint-400 bg-mint-900/20' : 'text-mint-600 bg-mint-100',
      blue: isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-100',
      purple: isDarkMode ? 'text-purple-400 bg-purple-900/20' : 'text-purple-600 bg-purple-100',
      orange: isDarkMode ? 'text-orange-400 bg-orange-900/20' : 'text-orange-600 bg-orange-100',
    };

    return (
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {title}
            </p>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Archive Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={DocumentIcon}
            title="Archived Files"
            value={analytics.totalFiles}
            subtitle={`${analytics.totalFolders} folders`}
            color="mint"
          />
          <StatCard
            icon={ServerIcon}
            title="Storage Saved"
            value={formatFileSize(analytics.totalSize)}
            subtitle="From archived files"
            color="blue"
          />
          <StatCard
            icon={ClockIcon}
            title="This Month"
            value={analytics.archivedThisMonth}
            subtitle={`${analytics.archivedThisWeek} this week`}
            color="purple"
          />
          <StatCard
            icon={ChartBarIcon}
            title="Last 3 Months"
            value={analytics.archivedThreeMonths}
            subtitle="Total archived"
            color="orange"
          />
        </div>
      </div>

      {/* Top Archivers and Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Archivers */}
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h4 className={`text-md font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Top Archivers
          </h4>
          <div className="space-y-3">
            {analytics.topArchivers.length > 0 ? (
              analytics.topArchivers.map(([user, count], index) => (
                <div key={user} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      index === 0 
                        ? (isDarkMode ? 'bg-mint-900 text-mint-300' : 'bg-mint-100 text-mint-700')
                        : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                    }`}>
                      {user.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {user}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {count} items
                  </span>
                </div>
              ))
            ) : (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No archive activity yet
              </p>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h4 className={`text-md font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Archive Trend (Last 6 Months)
          </h4>
          <div className="space-y-3">
            {analytics.trendData.length > 0 ? (
              analytics.trendData.map(([month, count]) => {
                const maxCount = Math.max(...analytics.trendData.map(([, c]) => c));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                return (
                  <div key={month} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {new Date(month + '-01').toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {count}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-2 rounded-full bg-mint-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No trend data available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}