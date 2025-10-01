/**
 * GroupList Component
 * Displays a list of groups with filtering and management options
 */

import React, { useState, useEffect } from 'react';
import { Users, Settings, Eye, UserPlus, MoreVertical, Search, Filter } from 'lucide-react';
import { getGroups } from '../../services/groupApi';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGate, RequireSystemAdmin } from '../permissions/PermissionGate';
import { RoleBadge } from '../permissions/RoleBadge';
import type { Group } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useTheme } from '../../contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface GroupListProps {
  onGroupSelect?: (group: Group) => void;
  onGroupManage?: (group: Group) => void;
  showActions?: boolean;
}

export const GroupList: React.FC<GroupListProps> = ({
  onGroupSelect,
  onGroupManage,
  showActions = true,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'member' | 'admin' | 'available'>('all');
  
  const { 
    userContext, 
    canCreateGroups,
    canManageGroup,
    getUserRoleInGroup,
    getGroupAccessLevel,
    loading: permissionsLoading 
  } = usePermissions();
  
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const groupsResponse = await getGroups();
      setGroups(groupsResponse.groups);
    } catch (err) {
      setError('Failed to load groups');
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(group => {
    // Search filter
    if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Role filter
    if (filterBy !== 'all' && userContext) {
      switch (filterBy) {
        case 'member':
          return userContext.member_groups.some(g => g.id === group.id);
        case 'admin':
          return userContext.admin_groups.some(g => g.id === group.id);
        case 'available':
          return !userContext.member_groups.some(g => g.id === group.id);
        default:
          return true;
      }
    }

    return true;
  });

  const getRoleDisplayName = (groupId: string): string | null => {
    const role = getUserRoleInGroup(groupId);
    
    switch (role) {
      case 'system_admin':
        return 'System Admin';
      case 'group_admin':
        return 'Admin';
      case 'group_member':
        return 'Member';
      default:
        return null;
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadData} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Groups</h2>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            {filteredGroups.length} of {groups.length} groups
          </p>
        </div>
        
        {userContext?.permissions.can_create_groups && (
          <Button onClick={() => {/* TODO: Open create group modal */}}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            <SelectItem value="member">My Groups</SelectItem>
            <SelectItem value="admin">Admin Groups</SelectItem>
            <SelectItem value="available">Available to Join</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => {
          const userRole = getUserRoleInGroup(group);
          const canManage = canManageGroup(group);
          
          return (
            <div
              key={group.id}
              className={`rounded-lg border p-6 hover:shadow-md transition-shadow cursor-pointer ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onGroupSelect?.(group)}
            >
              {/* Group Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{group.name}</h3>
                    {userRole && (
                      <Badge variant={userRole === 'Admin' ? 'default' : 'secondary'} className="text-xs">
                        {userRole}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onGroupSelect?.(group);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      
                      {canManage && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onGroupManage?.(group);
                        }}>
                          <Settings className="h-4 w-4 mr-2" />
                          Manage Group
                        </DropdownMenuItem>
                      )}
                      

                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Group Description */}
              {group.description && (
                <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {group.description}
                </p>
              )}

              {/* Group Stats */}
              <div className={`flex items-center justify-between text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center space-x-4">
                  <span>{group.member_count} members</span>
                  <span>{group.admin_count} admins</span>
                </div>
                
                <div className={`w-2 h-2 rounded-full ${group.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>

              {/* Created Info */}
              <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Created by {group.created_by.first_name || group.created_by.username}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {searchQuery || filterBy !== 'all' ? 'No groups found' : 'No groups available'}
          </h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {searchQuery || filterBy !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Groups will appear here when they are created.'
            }
          </p>
          
          {userContext?.permissions.can_create_groups && !searchQuery && filterBy === 'all' && (
            <Button onClick={() => {/* TODO: Open create group modal */}}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          )}
        </div>
      )}
    </div>
  );
};