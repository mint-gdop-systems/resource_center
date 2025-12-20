import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Settings, 
  HardDrive, 
  Plus, 
  Minus, 
  RefreshCw, 
  Search,
  AlertTriangle,
  CheckCircle,
  Database,
  TrendingUp,
  FileText,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../services/auth';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { getStorageStatistics, getAdminUsersStorage, getSystemFileSizeLimit, updateSystemFileSizeLimit, api } from '../services/api';
import { StorageStatistics } from '../types';
import toast from 'react-hot-toast';
import Breadcrumb from '../components/layout/Breadcrumb';

interface UserStorageInfo {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  storage_quota: number;
  storage_used: number;
  storage_usage_percentage: number;
  remaining_storage: number;
  is_near_limit: boolean;
  is_over_limit: boolean;
}

export default function AdminStorage() {
  const { authenticated, user } = useAuth();
  const { formatBytes } = useStorageQuota();
  const [statistics, setStatistics] = useState<StorageStatistics | null>(null);
  const [users, setUsers] = useState<UserStorageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserStorageInfo | null>(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // File size limit state
  const [fileSizeLimit, setFileSizeLimit] = useState<{
    max_file_size_bytes: number;
    max_file_size_mb: number;
    max_file_size_gb: number;
  } | null>(null);
  const [editingFileSize, setEditingFileSize] = useState(false);
  const [fileSizeInput, setFileSizeInput] = useState('');

  const breadcrumbItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard' },
    { id: 'admin-storage', name: 'Storage Management', path: '/admin/storage' },
  ];

  // Check if user is admin
  if (!authenticated || !user?.is_superuser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Administrator privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch storage statistics
      const stats = await getStorageStatistics();
      setStatistics(stats);
      
      // Fetch all users with storage info
      const usersData = await getAdminUsersStorage();
      setUsers(usersData);
      
      // Fetch file size limit
      const fileSizeLimitData = await getSystemFileSizeLimit();
      setFileSizeLimit(fileSizeLimitData);
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load storage data');
    } finally {
      setLoading(false);
    }
  };

  const updateUserQuota = async (userId: number, newQuotaGB: number) => {
    try {
      setUpdating(true);
      const quotaBytes = newQuotaGB * 1024 * 1024 * 1024; // Convert GB to bytes
      
      await api.patch(`/storage/quota/${userId}/`, {
        storage_quota: quotaBytes
      });
      
      toast.success('Storage quota updated successfully');
      await fetchData(); // Refresh data
      setSelectedUser(null);
      setQuotaInput('');
      
    } catch (error) {
      console.error('Error updating quota:', error);
      toast.error('Failed to update storage quota');
    } finally {
      setUpdating(false);
    }
  };

  const recalculateAllStorage = async () => {
    try {
      setUpdating(true);
      await api.post('/storage/recalculate/', { all_users: true });
      toast.success('Storage usage recalculated for all users');
      await fetchData();
    } catch (error) {
      console.error('Error recalculating storage:', error);
      toast.error('Failed to recalculate storage usage');
    } finally {
      setUpdating(false);
    }
  };

  const quickQuotaUpdate = async (userId: number, action: 'increase' | 'decrease') => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const currentQuotaGB = user.storage_quota / (1024 * 1024 * 1024);
    const increment = 1; // 1GB increment/decrement
    const newQuotaGB = action === 'increase' 
      ? currentQuotaGB + increment 
      : Math.max(0.1, currentQuotaGB - increment); // Minimum 0.1GB

    await updateUserQuota(userId, newQuotaGB);
  };

  const updateFileSizeLimit = async () => {
    try {
      setUpdating(true);
      const newLimitMB = parseFloat(fileSizeInput);
      
      if (newLimitMB < 1) {
        toast.error('File size limit must be at least 1MB');
        return;
      }
      
      if (newLimitMB > 100 * 1024) { // 100GB in MB
        toast.error('File size limit cannot exceed 100GB');
        return;
      }
      
      const result = await updateSystemFileSizeLimit(newLimitMB);
      setFileSizeLimit({
        max_file_size_bytes: result.max_file_size_bytes,
        max_file_size_mb: result.max_file_size_mb,
        max_file_size_gb: result.max_file_size_gb,
      });
      
      setEditingFileSize(false);
      setFileSizeInput('');
      toast.success('File size limit updated successfully. Changes apply immediately to new uploads.');
      
    } catch (error) {
      console.error('Error updating file size limit:', error);
      toast.error('Failed to update file size limit');
    } finally {
      setUpdating(false);
    }
  };

  const startEditingFileSize = () => {
    if (fileSizeLimit) {
      setFileSizeInput(fileSizeLimit.max_file_size_mb.toString());
      setEditingFileSize(true);
    }
  };

  const cancelEditingFileSize = () => {
    setEditingFileSize(false);
    setFileSizeInput('');
  };

  const quickFileSizeUpdate = async (action: 'increase' | 'decrease') => {
    if (!fileSizeLimit) return;
    
    try {
      setUpdating(true);
      const currentMB = fileSizeLimit.max_file_size_mb;
      const increment = 100; // 100MB increment/decrement
      const newLimitMB = action === 'increase' 
        ? currentMB + increment 
        : Math.max(1, currentMB - increment); // Minimum 1MB
      
      if (newLimitMB > 100 * 1024) { // 100GB in MB
        toast.error('File size limit cannot exceed 100GB');
        return;
      }
      
      const result = await updateSystemFileSizeLimit(newLimitMB);
      setFileSizeLimit({
        max_file_size_bytes: result.max_file_size_bytes,
        max_file_size_mb: result.max_file_size_mb,
        max_file_size_gb: result.max_file_size_gb,
      });
      
      toast.success(`File size limit ${action === 'increase' ? 'increased' : 'decreased'} by 100MB. Changes apply immediately to new uploads.`);
      
    } catch (error) {
      console.error('Error updating file size limit:', error);
      toast.error('Failed to update file size limit');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (user: UserStorageInfo) => {
    if (user.is_over_limit) return 'text-red-600 bg-red-50 border-red-200';
    if (user.is_near_limit) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = (user: UserStorageInfo) => {
    if (user.is_over_limit) return <AlertTriangle className="h-4 w-4" />;
    if (user.is_near_limit) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading storage management...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb items={breadcrumbItems} />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Storage Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage user storage quotas and monitor system usage
            </p>
          </div>
          <Button 
            onClick={recalculateAllStorage} 
            disabled={updating}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
            <span>Recalculate All</span>
          </Button>
        </div>
      </div>

      {/* System Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Database className="h-4 w-4 mr-2 text-blue-500" />
                Total Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_quota_gb.toFixed(1)} GB</div>
              <p className="text-xs text-muted-foreground">System capacity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <HardDrive className="h-4 w-4 mr-2 text-green-500" />
                Used Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_used_gb.toFixed(1)} GB</div>
              <p className="text-xs text-muted-foreground">{statistics.total_usage_percentage.toFixed(1)}% utilized</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2 text-purple-500" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_users}</div>
              <p className="text-xs text-muted-foreground">Active accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-orange-500" />
                Critical Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statistics.users_over_limit}</div>
              <p className="text-xs text-muted-foreground">Over quota limit</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* File Size Limit Management */}
      {fileSizeLimit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              File Size Limit Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Maximum file size allowed for uploads
                    </p>
                    {!editingFileSize ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-2xl font-bold text-blue-600">
                          {fileSizeLimit.max_file_size_mb >= 1024 
                            ? `${fileSizeLimit.max_file_size_gb.toFixed(1)} GB`
                            : `${fileSizeLimit.max_file_size_mb.toFixed(0)} MB`
                          }
                        </span>
                        <span className="text-sm text-gray-500">
                          ({formatBytes(fileSizeLimit.max_file_size_bytes)})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="number"
                          value={fileSizeInput}
                          onChange={(e) => setFileSizeInput(e.target.value)}
                          placeholder="Size in MB"
                          className="w-32"
                          min="1"
                          max="102400"
                          step="1"
                        />
                        <span className="text-sm text-gray-500">MB</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!editingFileSize ? (
                  <>
                    {/* Quick adjustment buttons */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => quickFileSizeUpdate('decrease')}
                      disabled={updating}
                      title="Decrease by 100MB"
                      className="flex items-center space-x-1"
                    >
                      <Minus className="h-3 w-3" />
                      <span className="text-xs">100MB</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => quickFileSizeUpdate('increase')}
                      disabled={updating}
                      title="Increase by 100MB"
                      className="flex items-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span className="text-xs">100MB</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEditingFileSize}
                      className="flex items-center space-x-2"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit Limit</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditingFileSize}
                      disabled={updating}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={updateFileSizeLimit}
                      disabled={updating || !fileSizeInput || parseFloat(fileSizeInput) <= 0}
                      className="flex items-center space-x-2"
                    >
                      <Save className="h-3 w-3" />
                      <span>{updating ? 'Saving...' : 'Save'}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editingFileSize && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> This setting affects all users globally. 
                  Valid range: 1 MB to 100 GB (102,400 MB).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Storage Management
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name} ({user.username})
                        </h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Badge className={`${getStatusColor(user)} border`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(user)}
                          <span>
                            {user.is_over_limit ? 'Over Limit' : 
                             user.is_near_limit ? 'Near Limit' : 'Normal'}
                          </span>
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Storage Usage</span>
                        <span className="font-medium">
                          {formatBytes(user.storage_used)} / {formatBytes(user.storage_quota)}
                        </span>
                      </div>
                      <Progress value={user.storage_usage_percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{user.storage_usage_percentage.toFixed(1)}% used</span>
                        <span>{formatBytes(user.remaining_storage)} available</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {/* Quick Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => quickQuotaUpdate(user.id, 'decrease')}
                      disabled={updating}
                      title="Decrease quota by 1GB"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => quickQuotaUpdate(user.id, 'increase')}
                      disabled={updating}
                      title="Increase quota by 1GB"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setQuotaInput((user.storage_quota / (1024 * 1024 * 1024)).toString());
                      }}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Quota Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-semibold mb-4">
              Update Storage Quota for {selectedUser.username}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Storage Quota (GB)
                </label>
                <Input
                  type="number"
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  placeholder="Enter quota in GB"
                  min="0.1"
                  step="0.1"
                />
              </div>
              
              <div className="text-sm text-gray-500">
                Current usage: {formatBytes(selectedUser.storage_used)}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUser(null);
                  setQuotaInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateUserQuota(selectedUser.id, parseFloat(quotaInput))}
                disabled={updating || !quotaInput || parseFloat(quotaInput) <= 0}
              >
                {updating ? 'Updating...' : 'Update Quota'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}