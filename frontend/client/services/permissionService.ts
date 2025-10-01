/**
 * Modern Permission Service
 * Handles permission checking and role management for the frontend
 * Aligns with the new backend permission system
 */

import type { 
  UserRole, 
  PermissionCheck, 
  UserPermissions, 
  PermissionContext,
  Group,
  UserGroupContext 
} from '../types';

// Permission action constants aligned with backend
export const PERMISSION_ACTIONS = {
  // Groups
  GROUPS_CREATE: 'groups.create',
  GROUPS_READ: 'groups.read',
  GROUPS_UPDATE: 'groups.update',
  GROUPS_DELETE: 'groups.delete',
  GROUPS_LIST_ALL: 'groups.list_all',
  
  // Group Members
  GROUP_MEMBERS_ADD: 'group_members.add',
  GROUP_MEMBERS_REMOVE: 'group_members.remove',
  GROUP_MEMBERS_PROMOTE: 'group_members.promote',
  GROUP_MEMBERS_DEMOTE: 'group_members.demote',
  GROUP_MEMBERS_VIEW: 'group_members.view',
  
  // Resources
  RESOURCES_SHARE_ANY: 'resources.share_any',
  RESOURCES_SHARE_OWN: 'resources.share_own',
  RESOURCES_ACCESS_ALL: 'resources.access_all',
  RESOURCES_ACCESS_SHARED: 'resources.access_shared',
  RESOURCES_MANAGE_OWN: 'resources.manage_own',
  RESOURCES_MANAGE_ANY: 'resources.manage_any',
  
  // Group Shares
  GROUP_SHARES_CREATE: 'group_shares.create',
  GROUP_SHARES_CREATE_ANY: 'group_shares.create_any',
  GROUP_SHARES_VIEW: 'group_shares.view',
  GROUP_SHARES_VIEW_ALL: 'group_shares.view_all',
  GROUP_SHARES_DELETE_ANY: 'group_shares.delete_any',
} as const;

// Role definitions aligned with backend
export const USER_ROLES: Record<string, UserRole> = {
  system_admin: {
    name: 'system_admin',
    display_name: 'System Administrator',
    level: 100,
    permissions: [
      PERMISSION_ACTIONS.GROUPS_CREATE,
      PERMISSION_ACTIONS.GROUPS_READ,
      PERMISSION_ACTIONS.GROUPS_UPDATE,
      PERMISSION_ACTIONS.GROUPS_DELETE,
      PERMISSION_ACTIONS.GROUPS_LIST_ALL,
      PERMISSION_ACTIONS.GROUP_MEMBERS_ADD,
      PERMISSION_ACTIONS.GROUP_MEMBERS_REMOVE,
      PERMISSION_ACTIONS.GROUP_MEMBERS_PROMOTE,
      PERMISSION_ACTIONS.GROUP_MEMBERS_DEMOTE,
      PERMISSION_ACTIONS.GROUP_MEMBERS_VIEW,
      PERMISSION_ACTIONS.RESOURCES_SHARE_ANY,
      PERMISSION_ACTIONS.RESOURCES_ACCESS_ALL,
      PERMISSION_ACTIONS.RESOURCES_MANAGE_ANY,
      PERMISSION_ACTIONS.RESOURCES_MANAGE_OWN,
      PERMISSION_ACTIONS.GROUP_SHARES_CREATE_ANY,
      PERMISSION_ACTIONS.GROUP_SHARES_VIEW_ALL,
      PERMISSION_ACTIONS.GROUP_SHARES_DELETE_ANY,
    ],
    restrictions: {},
  },
  group_admin: {
    name: 'group_admin',
    display_name: 'Group Administrator',
    level: 50,
    permissions: [
      PERMISSION_ACTIONS.GROUPS_READ,
      PERMISSION_ACTIONS.GROUPS_UPDATE,
      PERMISSION_ACTIONS.GROUP_MEMBERS_ADD,
      PERMISSION_ACTIONS.GROUP_MEMBERS_REMOVE,
      PERMISSION_ACTIONS.GROUP_MEMBERS_VIEW,
      PERMISSION_ACTIONS.RESOURCES_SHARE_OWN,
      PERMISSION_ACTIONS.RESOURCES_ACCESS_SHARED,
      PERMISSION_ACTIONS.RESOURCES_MANAGE_OWN,
      PERMISSION_ACTIONS.GROUP_SHARES_CREATE,
      PERMISSION_ACTIONS.GROUP_SHARES_VIEW,
    ],
    restrictions: {
      cannot_remove_other_admins: true,
      cannot_promote_to_admin: true,
      scope: 'own_groups_only',
    },
  },
  group_member: {
    name: 'group_member',
    display_name: 'Group Member',
    level: 25,
    permissions: [
      PERMISSION_ACTIONS.GROUPS_READ,
      PERMISSION_ACTIONS.GROUP_MEMBERS_VIEW,
      PERMISSION_ACTIONS.RESOURCES_SHARE_OWN,
      PERMISSION_ACTIONS.RESOURCES_ACCESS_SHARED,
      PERMISSION_ACTIONS.RESOURCES_MANAGE_OWN,
      PERMISSION_ACTIONS.GROUP_SHARES_VIEW,
    ],
    restrictions: {
      scope: 'member_groups_only',
      resources: 'own_only',
    },
  },
  regular_user: {
    name: 'regular_user',
    display_name: 'Regular User',
    level: 10,
    permissions: [
      PERMISSION_ACTIONS.RESOURCES_MANAGE_OWN,
    ],
    restrictions: {
      scope: 'own_resources_only',
    },
  },
};

class PermissionService {
  private userContext: UserGroupContext | null = null;
  
  /**
   * Set the current user context
   */
  setUserContext(context: UserGroupContext) {
    this.userContext = context;
  }
  
  /**
   * Get the user's system-wide role
   */
  getUserRole(): UserRole {
    if (!this.userContext) {
      return USER_ROLES.regular_user;
    }
    
    if (this.userContext.user_context.is_system_admin) {
      return USER_ROLES.system_admin;
    }
    
    if (this.userContext.admin_groups.length > 0) {
      return USER_ROLES.group_admin;
    }
    
    if (this.userContext.member_groups.length > 0) {
      return USER_ROLES.group_member;
    }
    
    return USER_ROLES.regular_user;
  }
  
  /**
   * Get the user's role in a specific group
   */
  getUserRoleInGroup(groupId: string): string | null {
    if (!this.userContext) return null;
    
    if (this.userContext.user_context.is_system_admin) {
      return 'system_admin';
    }
    
    if (this.userContext.admin_groups.some(g => g.id === groupId)) {
      return 'group_admin';
    }
    
    if (this.userContext.member_groups.some(g => g.id === groupId)) {
      return 'group_member';
    }
    
    return null;
  }
  
  /**
   * Check if user has a specific permission
   */
  hasPermission(action: string, context?: PermissionContext): PermissionCheck {
    const userRole = this.getUserRole();
    
    // Check if action is in user's permissions
    if (!userRole.permissions.includes(action)) {
      return {
        action,
        allowed: false,
        reason: `Role '${userRole.display_name}' does not have permission for '${action}'`,
      };
    }
    
    // Apply context-specific checks
    if (context) {
      const contextCheck = this.checkContextualPermissions(action, userRole, context);
      if (!contextCheck.allowed) {
        return contextCheck;
      }
    }
    
    return {
      action,
      allowed: true,
      context,
    };
  }
  
  /**
   * Check contextual permissions (group-specific, resource ownership, etc.)
   */
  private checkContextualPermissions(
    action: string, 
    userRole: UserRole, 
    context: PermissionContext
  ): PermissionCheck {
    // Group-specific actions
    if (context.group_id && action.startsWith('group')) {
      const groupRole = this.getUserRoleInGroup(context.group_id);
      
      if (!groupRole) {
        return {
          action,
          allowed: false,
          reason: 'User is not a member of this group',
          context,
        };
      }
      
      // Check group admin restrictions
      if (userRole.name === 'group_admin') {
        // Cannot remove other admins
        if (action === PERMISSION_ACTIONS.GROUP_MEMBERS_REMOVE && context.target_user_id) {
          const targetUserRole = this.getUserRoleInGroup(context.group_id);
          if (targetUserRole === 'group_admin') {
            return {
              action,
              allowed: false,
              reason: 'Group administrators cannot remove other administrators',
              context,
            };
          }
        }
        
        // Cannot promote to admin
        if (action === PERMISSION_ACTIONS.GROUP_MEMBERS_PROMOTE) {
          return {
            action,
            allowed: false,
            reason: 'Group administrators cannot promote members to admin',
            context,
          };
        }
      }
    }
    
    // Resource ownership checks
    if (context.resource_id && userRole.restrictions.resources === 'own_only') {
      // This would need to be checked against actual resource ownership
      // For now, we assume the frontend will handle this check
    }
    
    return {
      action,
      allowed: true,
      context,
    };
  }
  
  /**
   * Check multiple permissions at once
   */
  checkBulkPermissions(actions: string[], context?: PermissionContext): Record<string, PermissionCheck> {
    const results: Record<string, PermissionCheck> = {};
    
    for (const action of actions) {
      results[action] = this.hasPermission(action, context);
    }
    
    return results;
  }
  
  /**
   * Get all permissions for the current user
   */
  getUserPermissions(): UserPermissions {
    const role = this.getUserRole();
    const groupPermissions: Record<string, string[]> = {};
    
    // Get group-specific permissions
    if (this.userContext) {
      for (const group of this.userContext.member_groups) {
        const groupRole = this.getUserRoleInGroup(group.id);
        if (groupRole) {
          groupPermissions[group.id] = USER_ROLES[groupRole]?.permissions || [];
        }
      }
    }
    
    return {
      role,
      group_permissions: groupPermissions,
      can_perform: (action: string, context?: Record<string, any>) => {
        return this.hasPermission(action, context).allowed;
      },
      get_role_in_group: (groupId: string) => {
        return this.getUserRoleInGroup(groupId);
      },
    };
  }
  
  /**
   * Convenience methods for common permission checks
   */
  canCreateGroups(): boolean {
    return this.hasPermission(PERMISSION_ACTIONS.GROUPS_CREATE).allowed;
  }
  
  canManageGroup(groupId: string): boolean {
    return this.hasPermission(PERMISSION_ACTIONS.GROUPS_UPDATE, { group_id: groupId }).allowed;
  }
  
  canAddMembers(groupId: string): boolean {
    return this.hasPermission(PERMISSION_ACTIONS.GROUP_MEMBERS_ADD, { group_id: groupId }).allowed;
  }
  
  canRemoveMembers(groupId: string, targetUserId?: string): boolean {
    return this.hasPermission(PERMISSION_ACTIONS.GROUP_MEMBERS_REMOVE, { 
      group_id: groupId, 
      target_user_id: targetUserId 
    }).allowed;
  }
  
  canPromoteMembers(groupId: string): boolean {
    return this.hasPermission(PERMISSION_ACTIONS.GROUP_MEMBERS_PROMOTE, { group_id: groupId }).allowed;
  }
  
  canShareWithGroups(): boolean {
    return this.hasPermission(PERMISSION_ACTIONS.RESOURCES_SHARE_OWN).allowed ||
           this.hasPermission(PERMISSION_ACTIONS.RESOURCES_SHARE_ANY).allowed;
  }
  
  canViewGroupShares(groupId?: string): boolean {
    const context = groupId ? { group_id: groupId } : undefined;
    return this.hasPermission(PERMISSION_ACTIONS.GROUP_SHARES_VIEW, context).allowed ||
           this.hasPermission(PERMISSION_ACTIONS.GROUP_SHARES_VIEW_ALL).allowed;
  }
  
  /**
   * Get user's access level for a group
   */
  getGroupAccessLevel(groupId: string): 'none' | 'member' | 'admin' | 'system_admin' {
    if (!this.userContext) return 'none';
    
    if (this.userContext.user_context.is_system_admin) {
      return 'system_admin';
    }
    
    if (this.userContext.admin_groups.some(g => g.id === groupId)) {
      return 'admin';
    }
    
    if (this.userContext.member_groups.some(g => g.id === groupId)) {
      return 'member';
    }
    
    return 'none';
  }
  
  /**
   * Filter groups by user's access level
   */
  filterGroupsByAccess(
    groups: Group[], 
    accessLevel: 'all' | 'member' | 'admin' | 'manageable'
  ): Group[] {
    if (!this.userContext) return [];
    
    switch (accessLevel) {
      case 'member':
        return groups.filter(group => 
          this.userContext!.member_groups.some(g => g.id === group.id)
        );
      case 'admin':
        return groups.filter(group => 
          this.userContext!.admin_groups.some(g => g.id === group.id)
        );
      case 'manageable':
        return groups.filter(group => this.canManageGroup(group.id));
      case 'all':
      default:
        return groups;
    }
  }
  
  /**
   * Get permission summary for UI display
   */
  getPermissionSummary(): {
    role: string;
    level: number;
    groups_admin: number;
    groups_member: number;
    can_create_groups: boolean;
    can_manage_any_group: boolean;
  } {
    const role = this.getUserRole();
    
    return {
      role: role.display_name,
      level: role.level,
      groups_admin: this.userContext?.admin_groups.length || 0,
      groups_member: this.userContext?.member_groups.length || 0,
      can_create_groups: this.canCreateGroups(),
      can_manage_any_group: role.name === 'system_admin',
    };
  }
}

// Export singleton instance
export const permissionService = new PermissionService();

// Export utility functions
export const usePermissions = () => {
  return {
    hasPermission: (action: string, context?: PermissionContext) => 
      permissionService.hasPermission(action, context),
    canCreateGroups: () => permissionService.canCreateGroups(),
    canManageGroup: (groupId: string) => permissionService.canManageGroup(groupId),
    canAddMembers: (groupId: string) => permissionService.canAddMembers(groupId),
    canRemoveMembers: (groupId: string, targetUserId?: string) => 
      permissionService.canRemoveMembers(groupId, targetUserId),
    canPromoteMembers: (groupId: string) => permissionService.canPromoteMembers(groupId),
    canShareWithGroups: () => permissionService.canShareWithGroups(),
    getUserRole: () => permissionService.getUserRole(),
    getUserRoleInGroup: (groupId: string) => permissionService.getUserRoleInGroup(groupId),
    getGroupAccessLevel: (groupId: string) => permissionService.getGroupAccessLevel(groupId),
    getPermissionSummary: () => permissionService.getPermissionSummary(),
  };
};

export default permissionService;