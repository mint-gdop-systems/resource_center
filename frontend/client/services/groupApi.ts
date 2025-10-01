/**
 * Group Management API Functions
 * Handles all group-related API calls for the frontend
 */

import { api } from './api';
import type { 
  Group, 
  GroupMembership, 
  GroupSharing, 
  UserGroupContext, 
  GroupShareRequest,
  EnhancedShareRequest,
  CombinedSharedData 
} from '../types';

// ============ GROUP MANAGEMENT ============

/**
 * Get all groups accessible to the current user
 */
export const getGroups = async (): Promise<{
  groups: Group[];
  context_type: 'all' | 'accessible';
  total_count: number;
  user_permissions: {
    can_create_groups: boolean;
    is_system_admin: boolean;
  };
}> => {
  try {
    const response = await api.get('/groups/');
    return response.data;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

/**
 * Get details for a specific group
 */
export const getGroupDetails = async (groupId: string): Promise<{
  group: Group;
  user_permissions: {
    can_manage_group: boolean;
    can_add_members: boolean;
    can_remove_members: boolean;
    is_member: boolean;
    is_admin: boolean;
    is_system_admin: boolean;
  };
}> => {
  try {
    const response = await api.get(`/groups/${groupId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group details:', error);
    throw error;
  }
};

/**
 * Create a new group (System Admin only)
 */
export const createGroup = async (data: {
  name: string;
  description?: string;
}): Promise<{
  message: string;
  group: Group;
}> => {
  try {
    const response = await api.post('/groups/', data);
    return response.data;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

/**
 * Update an existing group (System Admin only)
 */
export const updateGroup = async (groupId: string, data: {
  name?: string;
  description?: string;
  is_active?: boolean;
}): Promise<{
  message: string;
  group: Group;
}> => {
  try {
    const response = await api.put(`/groups/${groupId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
};

/**
 * Delete/deactivate a group (System Admin only)
 */
export const deleteGroup = async (groupId: string): Promise<{
  message: string;
}> => {
  try {
    const response = await api.delete(`/groups/${groupId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

// ============ GROUP MEMBERSHIP MANAGEMENT ============

/**
 * Get members of a specific group
 */
export const getGroupMembers = async (groupId: string): Promise<{
  group_id: string;
  group_name: string;
  memberships: GroupMembership[];
  admins: GroupMembership[];
  members: GroupMembership[];
  total_count: number;
  admin_count: number;
  member_count: number;
}> => {
  try {
    const response = await api.get(`/groups/${groupId}/members/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group members:', error);
    throw error;
  }
};

/**
 * Add a member to a group
 */
export const addGroupMember = async (groupId: string, data: {
  user_id?: string;
  user_email?: string;
  role?: 'ADMIN' | 'MEMBER';
  message?: string;
}): Promise<{
  message: string;
  membership: GroupMembership;
}> => {
  try {
    const response = await api.post(`/groups/${groupId}/members/`, data);
    return response.data;
  } catch (error) {
    console.error('Error adding group member:', error);
    throw error;
  }
};

/**
 * Remove a member from a group
 */
export const removeGroupMember = async (groupId: string, userId: string): Promise<{
  message: string;
}> => {
  try {
    const response = await api.delete(`/groups/${groupId}/members/`, {
      data: { user_id: userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error removing group member:', error);
    throw error;
  }
};

/**
 * Assign a user as group admin (System Admin only)
 */
export const assignGroupAdmin = async (groupId: string, userId: string): Promise<{
  message: string;
  membership: GroupMembership;
}> => {
  try {
    const response = await api.post(`/groups/${groupId}/assign-admin/`, {
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error assigning group admin:', error);
    throw error;
  }
};

/**
 * Get group statistics
 */
export const getGroupStatistics = async (groupId: string): Promise<{
  group_id: string;
  group_name: string;
  statistics: {
    members: {
      total: number;
      admins: number;
      regular_members: number;
      recent_additions: number;
    };
    shared_resources: {
      total_files: number;
      total_folders: number;
      total_items: number;
      recent_shares: number;
    };
    activity: {
      recent_shares_30d: number;
      recent_members_30d: number;
    };
  };
  user_role: {
    is_member: boolean;
    is_admin: boolean;
    is_system_admin: boolean;
  };
}> => {
  try {
    const response = await api.get(`/groups/${groupId}/statistics/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group statistics:', error);
    throw error;
  }
};

// ============ GROUP SHARING ============

/**
 * Share files/folders with groups
 */
export const shareWithGroups = async (data: GroupShareRequest): Promise<{
  message: string;
  shared_items: {
    files: string[];
    folders: string[];
  };
  shared_with_groups: string[];
  total_shares_created: number;
}> => {
  try {
    const response = await api.post('/group-share/', data);
    return response.data;
  } catch (error) {
    console.error('Error sharing with groups:', error);
    throw error;
  }
};

/**
 * Get resources shared by current user with groups
 */
export const getMyGroupShares = async (): Promise<{
  shares: GroupSharing[];
  file_shares: GroupSharing[];
  folder_shares: GroupSharing[];
  total_count: number;
}> => {
  try {
    const response = await api.get('/group-share/');
    return response.data;
  } catch (error) {
    console.error('Error fetching my group shares:', error);
    throw error;
  }
};

/**
 * Get resources shared with user through groups
 */
export const getGroupSharedWithMe = async (): Promise<{
  group_shares: GroupSharing[];
  file_shares: GroupSharing[];
  folder_shares: GroupSharing[];
  total_count: number;
  user_groups: Array<{ id: string; name: string }>;
  groups_count: number;
}> => {
  try {
    const response = await api.get('/group-shared-with-me/');
    return response.data;
  } catch (error) {
    console.error('Error fetching group shared resources:', error);
    throw error;
  }
};

// ============ USER GROUP CONTEXT ============

/**
 * Get comprehensive group context for current user
 */
export const getUserGroupContext = async (): Promise<UserGroupContext> => {
  try {
    const response = await api.get('/user/groups/');
    return response.data;
  } catch (error) {
    console.error('Error fetching user group context:', error);
    throw error;
  }
};

// ============ ENHANCED SHARING (INDIVIDUAL + GROUP) ============

/**
 * Share with both users and groups simultaneously
 */
export const enhancedShare = async (data: EnhancedShareRequest): Promise<{
  individual_sharing: {
    success: any[];
    errors: string[];
  };
  group_sharing: {
    success: any[];
    errors: string[];
  };
  total_shares_created: number;
}> => {
  try {
    const response = await api.post('/enhanced-share/', data);
    return response.data;
  } catch (error) {
    console.error('Error with enhanced sharing:', error);
    throw error;
  }
};

/**
 * Get combined view of individual and group shares
 */
export const getCombinedSharedWithMe = async (): Promise<CombinedSharedData> => {
  try {
    const response = await api.get('/combined-shared-with-me/');
    return response.data;
  } catch (error) {
    console.error('Error fetching combined shared resources:', error);
    throw error;
  }
};

/**
 * Get all resources accessible to user (owned + individually shared + group shared)
 */
export const getAllAccessibleResources = async (): Promise<{
  files: any[];
  folders: any[];
  summary: {
    total_files: number;
    total_folders: number;
    owned_files: number;
    owned_folders: number;
    individually_shared_files: number;
    individually_shared_folders: number;
    group_shared_files: number;
    group_shared_folders: number;
  };
}> => {
  try {
    const response = await api.get('/all-accessible-resources/');
    return response.data;
  } catch (error) {
    console.error('Error fetching all accessible resources:', error);
    throw error;
  }
};

/**
 * Get count of unseen shares (individual + group)
 */
export const getCombinedUnseenCount = async (): Promise<{
  individual_count: number;
  group_count: number;
  total_count: number;
}> => {
  try {
    const response = await api.get('/combined-unseen-count/');
    return response.data;
  } catch (error) {
    console.error('Error fetching combined unseen count:', error);
    return { individual_count: 0, group_count: 0, total_count: 0 };
  }
};

// ============ UTILITY FUNCTIONS ============

/**
 * Check if user can manage a specific group
 */
export const canUserManageGroup = (group: Group, userContext: UserGroupContext): boolean => {
  if (userContext.user_context.is_system_admin) {
    return true;
  }
  
  return userContext.admin_groups.some(adminGroup => adminGroup.id === group.id);
};

/**
 * Check if user is a member of a specific group
 */
export const isUserGroupMember = (group: Group, userContext: UserGroupContext): boolean => {
  return userContext.member_groups.some(memberGroup => memberGroup.id === group.id);
};

/**
 * Get user's role in a specific group
 */
export const getUserRoleInGroup = (group: Group, userContext: UserGroupContext): 'system_admin' | 'admin' | 'member' | null => {
  if (userContext.user_context.is_system_admin) {
    return 'system_admin';
  }
  
  if (userContext.admin_groups.some(adminGroup => adminGroup.id === group.id)) {
    return 'admin';
  }
  
  if (userContext.member_groups.some(memberGroup => memberGroup.id === group.id)) {
    return 'member';
  }
  
  return null;
};

/**
 * Filter groups by user's access level
 */
export const filterGroupsByAccess = (
  groups: Group[], 
  userContext: UserGroupContext, 
  accessLevel: 'all' | 'member' | 'admin' | 'manageable'
): Group[] => {
  switch (accessLevel) {
    case 'member':
      return groups.filter(group => isUserGroupMember(group, userContext));
    case 'admin':
      return groups.filter(group => 
        userContext.admin_groups.some(adminGroup => adminGroup.id === group.id)
      );
    case 'manageable':
      return groups.filter(group => canUserManageGroup(group, userContext));
    case 'all':
    default:
      return groups;
  }
};

// ============ USER SEARCH FOR GROUP MANAGEMENT ============

/**
 * Search for users to add to groups
 */
export const searchUsers = async (query: string, groupId?: string, limit: number = 10): Promise<{
  users: Array<{
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    full_display: string;
  }>;
  query: string;
  total_found: number;
  limit_reached: boolean;
}> => {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });
    
    if (groupId) {
      params.append('group_id', groupId);
    }
    
    const response = await api.get(`/users/search/?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Get available roles for a group
 */
export const getAvailableRoles = async (groupId: string): Promise<{
  available_roles: Array<{
    value: string;
    label: string;
    description: string;
  }>;
  user_role: string;
  can_assign_admin: boolean;
}> => {
  try {
    const response = await api.get(`/groups/${groupId}/available-roles/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching available roles:', error);
    throw error;
  }
};