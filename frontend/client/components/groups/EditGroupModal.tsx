/**
 * EditGroupModal Component
 * Professional modal for editing group information
 * Features: Group name/description editing, status management, permission validation
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Users, Calendar, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Separator } from '../ui/separator';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { PermissionGate } from '../permissions/PermissionGate';
import { RoleBadge } from '../permissions/RoleBadge';
import { useGroupPermissions } from '../../hooks/usePermissions';
import { updateGroup } from '../../services/groupApi';
import type { Group } from '../../types';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onGroupUpdated?: (updatedGroup: Group) => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onGroupUpdated,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Hooks
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  
  const {
    userRoleInGroup,
    loading: permissionsLoading
  } = useGroupPermissions(group.id);

  // Initialize form data when modal opens or group changes
  useEffect(() => {
    if (isOpen && group) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        is_active: group.is_active ?? true
      });
      setError(null);
      setHasChanges(false);
    }
  }, [isOpen, group]);

  // Track changes
  useEffect(() => {
    if (group) {
      let changed = 
        formData.name !== (group.name || '') ||
        formData.description !== (group.description || '');
      
      // Only track is_active changes for system admins
      if (userRoleInGroup === 'system_admin') {
        changed = changed || formData.is_active !== (group.is_active ?? true);
      }
      
      setHasChanges(changed);
    }
  }, [formData, group, userRoleInGroup]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Group name is required');
      return false;
    }

    if (formData.name.trim().length < 2) {
      setError('Group name must be at least 2 characters long');
      return false;
    }

    if (formData.name.trim().length > 100) {
      setError('Group name must be less than 100 characters');
      return false;
    }

    if (formData.description && formData.description.length > 500) {
      setError('Description must be less than 500 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!hasChanges) {
      toast({
        title: 'No changes to save',
        description: 'No modifications were made to the group.',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare update data based on user role
      const updateData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      };

      // Only system admins can update is_active status
      if (userRoleInGroup === 'system_admin') {
        updateData.is_active = formData.is_active;
      }

      const response = await updateGroup(group.id, updateData);
      
      // Notify parent component first
      onGroupUpdated?.(response.group);
      
      // Show success toast
      toast({
        title: 'Group Updated Successfully',
        description: `"${formData.name}" has been updated. Changes are now visible to all members.`,
        variant: 'default',
      });
      
      // Close modal after successful update
      handleClose();
      
    } catch (error: any) {
      console.error('Error updating group:', error);
      
      let errorMessage = 'Failed to update group.';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.name) {
        errorMessage = `Name: ${error.response.data.name[0]}`;
      } else if (error?.response?.data?.allowed_fields) {
        errorMessage = `You can only update: ${error.response.data.allowed_fields.join(', ')}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    
    // Simply close without confirmation - let user decide
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    setError(null);
    setHasChanges(false);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (permissionsLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <span>Edit Group</span>
          </DialogTitle>
          <DialogDescription>
            {userRoleInGroup === 'system_admin' 
              ? 'Update group information and settings. Changes will be visible to all group members.'
              : userRoleInGroup === 'group_admin'
              ? 'As a group administrator, you can update the group name and description. Contact a system administrator to change group status.'
              : 'Update group information and settings. Changes will be visible to all group members.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Information Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Group Information
              </h3>
              <RoleBadge role={userRoleInGroup || 'regular_user'} size="sm" />
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="groupName" className="text-sm font-medium">
                Group Name *
              </Label>
              <Input
                id="groupName"
                type="text"
                placeholder="Enter group name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={loading}
                required
                maxLength={100}
              />
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                A clear, descriptive name for your group (2-100 characters)
              </p>
            </div>

            {/* Group Description */}
            <div className="space-y-2">
              <Label htmlFor="groupDescription" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="groupDescription"
                placeholder="Describe the purpose and scope of this group..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={loading}
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between">
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Optional description to help members understand the group's purpose
                </p>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formData.description.length}/500
                </span>
              </div>
            </div>

            {/* Group Status - Only for System Admins */}
            {userRoleInGroup === 'system_admin' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Group Status</Label>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {formData.is_active ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formData.is_active 
                          ? 'Group is visible and accessible to members'
                          : 'Group is hidden and inaccessible to members'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Group Status Display for Group Admins */}
            {userRoleInGroup === 'group_admin' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Group Status</Label>
                <div className={`p-3 border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center space-x-3">
                    {group.is_active ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {group.is_active ? 'Active' : 'Inactive'}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Only system administrators can change group status
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Group Statistics */}
          <div className="space-y-4">
            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Group Statistics
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Members
                  </span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {group.member_count || 0}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Created
                  </span>
                </div>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatDate(group.created_at)}
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium">Created by:</span> {group.created_by?.first_name && group.created_by?.last_name 
                  ? `${group.created_by.first_name} ${group.created_by.last_name}` 
                  : group.created_by?.username || 'Unknown'}
              </p>
              {group.updated_at !== group.created_at && (
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">Last updated:</span> {formatDate(group.updated_at)}
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <DialogFooter className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <PermissionGate action="groups.update" context={{ group_id: group.id }}>
              <Button
                type="submit"
                disabled={loading || !hasChanges}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};