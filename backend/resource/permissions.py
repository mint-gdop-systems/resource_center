"""
Permission classes and utilities for group-based resource sharing
Implements role-based access control using modern JSON configuration
"""

from rest_framework import permissions
from django.contrib.auth.models import User
from .models import Group, GroupMembership, GroupSharing, UploadedFile, Folder
from .permission_manager import permission_manager


class IsSystemAdminOrReadOnly(permissions.BasePermission):
    """
    Permission class that allows:
    - System Admins (superusers): Full CRUD access
    - All other users: Read-only access
    """
    
    def has_permission(self, request, view):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Write permissions only for system admins
        return permission_manager.has_permission(request.user, 'groups.create')


class IsSystemAdmin(permissions.BasePermission):
    """
    Permission class that only allows System Admins (superusers) access
    """
    
    def has_permission(self, request, view):
        return permission_manager.get_user_role(request.user) == 'system_admin'


class IsGroupAdminOrSystemAdmin(permissions.BasePermission):
    """
    Permission class that allows:
    - System Admins: Full access to all groups
    - Group Admins: Access to their managed groups only
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # For Group objects, check management permissions
        if isinstance(obj, Group):
            return permission_manager.can_manage_group(user, obj)
        
        # For GroupMembership objects, check if user can manage the group
        if isinstance(obj, GroupMembership):
            return permission_manager.can_manage_group(user, obj.group)
        
        return False


class CanManageGroupMembers(permissions.BasePermission):
    """
    Permission class for managing group members:
    - System Admins: Can manage all group memberships
    - Group Admins: Can manage memberships in their groups only
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # For GroupMembership objects
        if isinstance(obj, GroupMembership):
            return permission_manager.can_add_members(user, obj.group)
        
        # For Group objects
        if isinstance(obj, Group):
            return permission_manager.can_add_members(user, obj)
        
        return False


class CanShareWithGroup(permissions.BasePermission):
    """
    Permission class for sharing resources with groups:
    - Users can only share resources they own (unless system admin)
    - Users can only share to groups they belong to (unless system admin)
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # For sharing operations, check resource ownership and group membership
        if isinstance(obj, (UploadedFile, Folder)):
            # This will be checked in the view with specific group context
            return True
        
        # For group sharing objects, check if user created the share
        if isinstance(obj, GroupSharing):
            return obj.shared_by == user
        
        return False


class CanAccessSharedResource(permissions.BasePermission):
    """
    Permission class for accessing shared resources:
    - Resource owners: Full access
    - Group members: Access to resources shared with their groups
    - Individual shares: Access to individually shared resources
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if isinstance(obj, (UploadedFile, Folder)):
            return obj.is_accessible_by(user)
        
        return False


# Utility Functions for Permission Checking (using centralized config)

def is_system_admin(user):
    """Check if user is a system administrator"""
    return permission_manager.get_user_role(user) == 'system_admin'


def is_group_admin(user, group=None):
    """
    Check if user is a group admin
    If group is provided, check for that specific group
    If group is None, check if user is admin of any group
    """
    if group:
        role = permission_manager.get_user_role(user, group)
        return role == 'group_admin'
    
    # Check if user is admin of any group
    role = permission_manager.get_user_role(user)
    return role in ['system_admin', 'group_admin']


def is_group_member(user, group):
    """Check if user is a member of a specific group"""
    role = permission_manager.get_user_role(user, group)
    return role in ['group_admin', 'group_member']


def can_user_manage_group(user, group):
    """Check if user can manage a specific group"""
    return permission_manager.can_manage_group(user, group)


def can_user_add_members(user, group):
    """Check if user can add members to a group"""
    return permission_manager.can_add_members(user, group)


def can_user_remove_members(user, group, target_user=None):
    """Check if user can remove members from a group"""
    return permission_manager.can_remove_members(user, group, target_user)


def can_user_share_with_group(user, resource, group):
    """Check if user can share a resource with a specific group"""
    return permission_manager.can_share_with_group(user, resource, group)


def get_user_manageable_groups(user):
    """Get all groups that a user can manage"""
    if not user or not user.is_authenticated:
        return Group.objects.none()
    
    role = permission_manager.get_user_role(user)
    
    if role == 'system_admin':
        return Group.objects.filter(is_active=True)
    elif role == 'group_admin':
        return Group.objects.filter(
            memberships__user=user,
            memberships__role=GroupMembership.ADMIN,
            memberships__is_active=True,
            is_active=True
        )
    
    return Group.objects.none()


def get_user_accessible_groups(user):
    """Get all groups that a user has access to (as member or admin)"""
    if not user or not user.is_authenticated:
        return Group.objects.none()
    
    role = permission_manager.get_user_role(user)
    
    if role == 'system_admin':
        return Group.objects.filter(is_active=True)
    elif role in ['group_admin', 'group_member']:
        return Group.objects.filter(
            memberships__user=user,
            memberships__is_active=True,
            is_active=True
        ).distinct()
    
    return Group.objects.none()


def get_user_shareable_groups(user):
    """Get all groups that a user can share resources with"""
    return get_user_accessible_groups(user)