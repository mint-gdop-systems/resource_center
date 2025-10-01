import React from 'react';
import { Progress } from './progress';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { RefreshCw, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStorageQuota } from '../../hooks/useStorageQuota';
import { useAuth } from '../../services/auth';
import { cn } from '../../lib/utils';

interface StorageQuotaDisplayProps {
  className?: string;
  showTitle?: boolean;
  showRefreshButton?: boolean;
  compact?: boolean;
}

export const StorageQuotaDisplay: React.FC<StorageQuotaDisplayProps> = ({
  className,
  showTitle = true,
  showRefreshButton = false,
  compact = false,
}) => {
  const { authenticated } = useAuth();
  const { quota, loading, error, refreshQuota, formatBytes, getUsageColor, getUsageStatus } = useStorageQuota();

  // Don't render anything if user is not authenticated
  if (!authenticated) {
    return null;
  }

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading storage info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && error !== 'Authentication required') {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
            {showRefreshButton && (
              <Button variant="outline" size="sm" onClick={refreshQuota}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render anything if there's no quota data (including auth errors)
  if (!quota) {
    return null;
  }

  const usageStatus = getUsageStatus(quota.storage_usage_percentage);
  const usageColor = getUsageColor(quota.storage_usage_percentage);

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <Progress 
            value={quota.storage_usage_percentage} 
            className="h-2"
            style={{ 
              '--progress-foreground': usageColor 
            } as React.CSSProperties}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatBytes(quota.storage_used)} / {formatBytes(quota.storage_quota)}
        </span>
        {usageStatus !== 'normal' && (
          <Badge variant={usageStatus === 'danger' ? 'destructive' : 'secondary'} className="text-xs">
            {usageStatus === 'danger' ? 'Full' : 'Low'}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span>Storage Usage</span>
            </div>
            {showRefreshButton && (
              <Button variant="ghost" size="sm" onClick={refreshQuota}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Used</span>
            <span className="font-medium">
              {formatBytes(quota.storage_used)} of {formatBytes(quota.storage_quota)}
            </span>
          </div>
          <Progress 
            value={quota.storage_usage_percentage} 
            className="h-3"
            style={{ 
              '--progress-foreground': usageColor 
            } as React.CSSProperties}
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{quota.storage_usage_percentage.toFixed(1)}% used</span>
            <span>{formatBytes(quota.remaining_storage)} remaining</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {usageStatus === 'normal' && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">Storage OK</span>
              </>
            )}
            {usageStatus === 'warning' && (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400">Storage Low</span>
              </>
            )}
            {usageStatus === 'danger' && (
              <>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">Storage Full</span>
              </>
            )}
          </div>
          
          <Badge 
            variant={
              usageStatus === 'danger' ? 'destructive' : 
              usageStatus === 'warning' ? 'secondary' : 
              'default'
            }
          >
            {quota.storage_usage_percentage.toFixed(1)}%
          </Badge>
        </div>

        {/* Warning Messages */}
        {quota.is_over_limit && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200">Storage quota exceeded</p>
                <p className="text-red-700 dark:text-red-300">
                  You cannot upload new files until you free up space or increase your quota.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {quota.is_near_limit && !quota.is_over_limit && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Storage almost full</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Consider deleting unused files or contact your administrator for more storage.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StorageQuotaDisplay;