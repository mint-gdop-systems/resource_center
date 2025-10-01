/**
 * usePermissions Hook
 * React hook for permission checking and role management
 */

import { useState, useEffect, useCallback } from 'react';
import { permissionService, PERMISSION_ACTIONS } from '../services/permissionService';
import { getUserGroupContext } from '../services/groupApi';
import type { 
  UserGroupContext, 
  UserPermissions, 
  PermissionCheck, 
  PermissionContext 
} from '../types';

interface UsePermissionsReturn {
  // Loading state
  loading: boolean;
  error: string | null;
  
  // User context and permissions
  userContext: UserGroupContext | null;
  userPermissions: UserPermissions | null;
  
  // Permission checking functions
  hasPermission: (action: string, context?: PermissionContext) => boolean;
  checkPermission: (action: string, context?: PermissionContext) => PermissionCheck;
  checkBulkPermissions: (actions: string[], context?: PermissionContext) => Record<string, PermissionCheck>;
  
  // Convenience permission checks
  canCreateGroups: boolean;
  canManageGroup: (groupId: string) => boolean;
  canAddMembers: (groupId: string) => boolean;
  canRemoveMembers: (groupId: string, targetUserId?: string) => boolean;
  canPromoteMembers: (groupId: string) => boolean;
  canShareWithGroups: boolean;
  canViewGroupShares: (groupId?: string) => boolean;
  
  // Role and access level functions
  getUserRole: () => string;
  getUserRoleInGroup: (groupId: string) => string | null;
  getGroupAccessLevel: (groupId: string) => 'none' | 'member' | 'admin' | 'system_admin';
  
  // Utility functions
  isSystemAdmin: boolean;
  isGroupAdmin: boolean;
  isGroupMember: boolean;
  getPermissionSummary: () => any;
  
  // Refresh function
  refresh: () => Promise<void>;
}

export const usePermissions = (): UsePermissionsReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<UserGroupContext | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);

  // Load user context and initialize permission service
  const loadUserContext = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const context = await getUserGroupContext();
      setUserContext(context);
      
      // Initialize permission service with user context
      permissionService.setUserContext(context);
      const permissions = permissionService.getUserPermissions();
      setUserPermissions(permissions);
      
    } catch (err) {
      console.error('Error loading user permissions:', err);
      setError('Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load context on mount
  useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);

  // Permission checking functions
  const hasPermission = useCallback((action: string, context?: PermissionContext): boolean => {
    return permissionService.hasPermission(action, context).allowed;
  }, []);

  const checkPermission = useCallback((action: string, context?: PermissionContext): PermissionCheck => {
    return permissionService.hasPermission(action, context);
  }, []);

  const checkBulkPermissions = useCallback((actions: string[], context?: PermissionContext) => {
    return permissionService.checkBulkPermissions(actions, context);
  }, []);

  // Convenience permission checks
  const canCreateGroups = hasPermission(PERMISSION_ACTIONS.GROUPS_CREATE);
  
  const canManageGroup = useCallback((groupId: string): boolean => {
    return hasPermission(PERMISSION_ACTIONS.GROUPS_UPDATE, { group_id: groupId });
  }, [hasPermission]);

  const canAddMembers = useCallback((groupId: string): boolean => {
    return hasPermission(PERMISSION_ACTIONS.GROUP_MEMBERS_ADD, { group_id: groupId });
  }, [hasPermission]);

  const canRemoveMembers = useCallback((groupId: string, targetUserId?: string): boolean => {
    return hasPermission(PERMISSION_ACTIONS.GROUP_MEMBERS_REMOVE, { 
      group_id: groupId, 
      target_user_id: targetUserId 
    });
  }, [hasPermission]);

  const canPromoteMembers = useCallback((groupId: string): boolean => {
    return hasPermission(PERMISSION_ACTIONS.GROUP_MEMBERS_PROMOTE, { group_id: groupId });
  }, [hasPermission]);

  const canShareWithGroups = hasPermission(PERMISSION_ACTIONS.RESOURCES_SHARE_OWN) ||
                            hasPermission(PERMISSION_ACTIONS.RESOURCES_SHARE_ANY);

  const canViewGroupShares = useCallback((groupId?: string): boolean => {
    const context = groupId ? { group_id: groupId } : undefined;
    return hasPermission(PERMISSION_ACTIONS.GROUP_SHARES_VIEW, context) ||
           hasPermission(PERMISSION_ACTIONS.GROUP_SHARES_VIEW_ALL);
  }, [hasPermission]);

  // Role and access level functions
  const getUserRole = useCallback((): string => {
    return permissionService.getUserRole().display_name;
  }, []);

  const getUserRoleInGroup = useCallback((groupId: string): string | null => {
    return permissionService.getUserRoleInGroup(groupId);
  }, []);

  const getGroupAccessLevel = useCallback((groupId: string) => {
    return permissionService.getGroupAccessLevel(groupId);
  }, []);

  // Computed properties
  const isSystemAdmin = userContext?.user_context.is_system_admin || false;
  const isGroupAdmin = (userContext?.admin_groups.length || 0) > 0;
  const isGroupMember = (userContext?.member_groups.length || 0) > 0;

  const getPermissionSummary = useCallback(() => {
    return permissionService.getPermissionSummary();
  }, []);

  return {
    // Loading state
    loading,
    error,
    
    // User context and permissions
    userContext,
    userPermissions,
    
    // Permission checking functions
    hasPermission,
    checkPermission,
    checkBulkPermissions,
    
    // Convenience permission checks
    canCreateGroups,
    canManageGroup,
    canAddMembers,
    canRemoveMembers,
    canPromoteMembers,
    canShareWithGroups,
    canViewGroupShares,
    
    // Role and access level functions
    getUserRole,
    getUserRoleInGroup,
    getGroupAccessLevel,
    
    // Utility functions
    isSystemAdmin,
    isGroupAdmin,
    isGroupMember,
    getPermissionSummary,
    
    // Refresh function
    refresh: loadUserContext,
  };
};

// Hook for specific group permissions
export const useGroupPermissions = (groupId: string) => {
  const permissions = usePermissions();
  
  return {
    ...permissions,
    groupId,
    userRoleInGroup: permissions.getUserRoleInGroup(groupId),
    accessLevel: permissions.getGroupAccessLevel(groupId),
    canManage: permissions.canManageGroup(groupId),
    canAddMembers: permissions.canAddMembers(groupId),
    canRemoveMembers: (targetUserId?: string) => permissions.canRemoveMembers(groupId, targetUserId),
    canPromoteMembers: permissions.canPromoteMembers(groupId),
    canViewShares: permissions.canViewGroupShares(groupId),
  };
};

export default usePermissions;