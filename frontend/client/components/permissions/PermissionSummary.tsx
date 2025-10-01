/**
 * PermissionSummary Component
 * Displays a comprehensive overview of user permissions and roles
 */

import React from 'react';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Plus, 
  Share2,
  Crown,
  Info
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RoleBadge } from './RoleBadge';
import { Separator } from '../ui/separator';

interface PermissionSummaryProps {
  showDetails?: boolean;
  className?: string;
}

export const PermissionSummary: React.FC<PermissionSummaryProps> = ({
  showDetails = true,
  className = '',
}) => {
  const {
    loading,
    userContext,
    getUserRole,
    getPermissionSummary,
    isSystemAdmin,
    isGroupAdmin,
    isGroupMember,
    canCreateGroups,
    canShareWithGroups,
  } = usePermissions();
  
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!userContext) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load permission information</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const summary = getPermissionSummary();
  const userRole = getUserRole();
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Your Permissions</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Role Badge */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Current Role:
          </span>
          <RoleBadge 
            role={isSystemAdmin ? 'system_admin' : isGroupAdmin ? 'group_admin' : isGroupMember ? 'group_member' : 'regular_user'} 
          />
        </div>
        
        {showDetails && (
          <>
            <Separator />
            
            {/* Group Memberships */}
            <div className="space-y-3">
              <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Group Memberships
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Admin of</span>
                  </div>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {summary.groups_admin}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    groups
                  </p>
                </div>
                
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Member of</span>
                  </div>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {summary.groups_member}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    groups
                  </p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Key Permissions */}
            <div className="space-y-3">
              <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Key Permissions
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Create Groups</span>
                  </div>
                  <Badge variant={canCreateGroups ? 'default' : 'secondary'}>
                    {canCreateGroups ? 'Allowed' : 'Not Allowed'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Manage Any Group</span>
                  </div>
                  <Badge variant={summary.can_manage_any_group ? 'default' : 'secondary'}>
                    {summary.can_manage_any_group ? 'Allowed' : 'Not Allowed'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Share2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Share with Groups</span>
                  </div>
                  <Badge variant={canShareWithGroups ? 'default' : 'secondary'}>
                    {canShareWithGroups ? 'Allowed' : 'Not Allowed'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Admin Groups List */}
            {userContext.admin_groups.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Groups You Manage
                  </h4>
                  <div className="space-y-2">
                    {userContext.admin_groups.slice(0, 3).map((group) => (
                      <div 
                        key={group.id}
                        className={`flex items-center justify-between p-2 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}
                      >
                        <span className="text-sm font-medium">{group.name}</span>
                        <Badge variant="outline" size="sm">
                          {group.member_count} members
                        </Badge>
                      </div>
                    ))}
                    {userContext.admin_groups.length > 3 && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        +{userContext.admin_groups.length - 3} more groups
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionSummary;