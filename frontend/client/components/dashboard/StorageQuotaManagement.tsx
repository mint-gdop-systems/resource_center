import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  HardDrive, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp,
  Database,
  CheckCircle
} from 'lucide-react';
import { getStorageStatistics } from '../../services/api';
import { StorageStatistics } from '../../types';
import { useStorageQuota } from '../../hooks/useStorageQuota';
import { useAuth } from '../../services/auth';

interface StorageQuotaManagementProps {
  className?: string;
}

export const StorageQuotaManagement: React.FC<StorageQuotaManagementProps> = ({ className }) => {
  const { authenticated, user } = useAuth();
  const [statistics, setStatistics] = useState<StorageStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatBytes } = useStorageQuota();

  // Only show for authenticated admin users
  if (!authenticated || !user?.roles?.includes('admin')) {
    return null;
  }

  const fetchStatistics = async () => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getStorageStatistics();
      setStatistics(data);
    } catch (err: any) {
      console.error('Error fetching storage statistics:', err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('Admin access required');
      } else {
        setError('Failed to load storage statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading storage statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !statistics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{error || 'Failed to load storage statistics'}</span>
                <Button variant="outline" size="sm" onClick={fetchStatistics}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'rgb(239, 68, 68)'; // red-500
    if (percentage >= 75) return 'rgb(245, 158, 11)'; // amber-500
    if (percentage >= 50) return 'rgb(59, 130, 246)'; // blue-500
    return 'rgb(34, 197, 94)'; // green-500
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Storage Management</h2>
            <p className="text-muted-foreground">Monitor and manage system-wide storage usage</p>
          </div>
          <Button onClick={fetchStatistics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Storage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Total Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(statistics.total_quota)}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.total_quota_gb.toFixed(1)} GB allocated
              </p>
            </CardContent>
          </Card>

          {/* Used Storage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <HardDrive className="h-4 w-4 mr-2" />
                Used Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(statistics.total_used)}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.total_used_gb.toFixed(1)} GB used ({statistics.total_usage_percentage.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>

          {/* Total Users */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_users}</div>
              <p className="text-xs text-muted-foreground">
                Active user accounts
              </p>
            </CardContent>
          </Card>

          {/* Usage Efficiency */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_usage_percentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Storage utilization
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Storage Usage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2" />
              System Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used Storage</span>
                <span className="font-medium">
                  {formatBytes(statistics.total_used)} of {formatBytes(statistics.total_quota)}
                </span>
              </div>
              <Progress 
                value={statistics.total_usage_percentage} 
                className="h-3"
                style={{ 
                  '--progress-foreground': getUsageColor(statistics.total_usage_percentage)
                } as React.CSSProperties}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{statistics.total_usage_percentage.toFixed(1)}% used</span>
                <span>{formatBytes(statistics.total_quota - statistics.total_used)} available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Storage Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Normal Users */}
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-semibold text-green-800 dark:text-green-200">Normal</div>
                    <div className="text-sm text-green-600 dark:text-green-400">Under 80% usage</div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {statistics.users_normal}
                </Badge>
              </div>

              {/* Warning Users */}
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                  <div>
                    <div className="font-semibold text-amber-800 dark:text-amber-200">Warning</div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">80-99% usage</div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {statistics.users_near_limit}
                </Badge>
              </div>

              {/* Critical Users */}
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <div className="font-semibold text-red-800 dark:text-red-200">Critical</div>
                    <div className="text-sm text-red-600 dark:text-red-400">100%+ usage</div>
                  </div>
                </div>
                <Badge variant="destructive">
                  {statistics.users_over_limit}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {statistics.users_over_limit > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{statistics.users_over_limit}</strong> user{statistics.users_over_limit !== 1 ? 's have' : ' has'} exceeded their storage quota and cannot upload new files.
            </AlertDescription>
          </Alert>
        )}

        {statistics.users_near_limit > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{statistics.users_near_limit}</strong> user{statistics.users_near_limit !== 1 ? 's are' : ' is'} approaching their storage limit (80%+ usage).
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default StorageQuotaManagement;