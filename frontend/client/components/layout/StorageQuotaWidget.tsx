import React from 'react';
import { useAuth } from '../../services/auth';
import { useStorageQuota } from '../../hooks/useStorageQuota';
import { HardDrive, AlertCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface StorageQuotaWidgetProps {
  className?: string;
}

export const StorageQuotaWidget: React.FC<StorageQuotaWidgetProps> = ({ className }) => {
  const { authenticated } = useAuth();
  const { quota, loading, formatBytes, getUsageStatus } = useStorageQuota();

  // Don't render anything if user is not authenticated
  if (!authenticated || loading || !quota) {
    return null;
  }

  const usagePercentage = quota.storage_usage_percentage;
  const usageStatus = getUsageStatus(usagePercentage);

  // Color scheme based on usage status
  const getColorScheme = () => {
    switch (usageStatus) {
      case 'danger':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-500',
          progress: 'bg-red-500',
          progressBg: 'bg-red-100 dark:bg-red-900/30'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          icon: 'text-amber-500',
          progress: 'bg-amber-500',
          progressBg: 'bg-amber-100 dark:bg-amber-900/30'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-500',
          progress: 'bg-blue-500',
          progressBg: 'bg-blue-100 dark:bg-blue-900/30'
        };
    }
  };

  const colors = getColorScheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={`${className} relative p-2 sm:p-3 mx-3 sm:mx-4 mb-2 sm:mb-3 rounded-lg border ${colors.bg} ${colors.border} transition-all duration-200 hover:shadow-sm cursor-pointer group`}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl pointer-events-none" />

      {/* Minimal Header */}
      <div className="relative flex items-center space-x-1.5 mb-1.5 sm:mb-2">
        <HardDrive className={`h-3.5 w-3.5 ${colors.icon}`} />
        <span className={`text-xs sm:text-sm font-medium ${colors.text}`}>
          Storage
        </span>
        {usageStatus !== 'normal' && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertCircle className={`h-3 w-3 ${colors.icon}`} />
          </motion.div>
        )}
      </div>

      {/* Storage Usage Info */}
      <div className="space-y-1.5 sm:space-y-2">
        {/* Usage Text - Compact Format */}
        <div className={`text-xs ${colors.text} text-center leading-tight`}>
          <div className="font-medium">{formatBytes(quota.storage_used)}</div>
          <div className="opacity-70 text-xs">of {formatBytes(quota.storage_quota)}</div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className={`w-full h-2 rounded-full ${colors.progressBg} overflow-hidden shadow-inner`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usagePercentage, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              className={`h-full ${colors.progress} rounded-full relative overflow-hidden`}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </motion.div>
          </div>
        </div>

        {/* Percentage Display */}
        <div className={`text-xs ${colors.text} text-center font-medium`}>
          {usagePercentage.toFixed(1)}%
        </div>
      </div>
    </motion.div>
  );
};

export default StorageQuotaWidget;