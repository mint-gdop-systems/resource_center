"""
Authorization mixins for group-based resource sharing views
Provides reusable authorization logic for DRF views and viewsets
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from .models import Group, GroupMembership, GroupSharing, UploadedFile, Folder
from .permissions import (
    can_user_manage_group, 
    can_user_add_members, 
    can_user_remove_members,
    can_user_share_with_group,
    is_system_admin,
    is_group_admin
)
from .permission_manager import permission_manager


class GroupManagementMixin:
    """
    Mixin for views that manage groups
    Provides common authorization logic for group operations
    """
    
    def check_group_management_permission(self, user, group):
        """Check if user can manage the specified group"""
        if not permission_manager.can_manage_group(user, group):
            raise PermissionDenied(
                "You don't have permission to manage this group. "
                "Only system administrators and group administrators can manage groups."
            )
    
    def check_system_admin_permission(self, user):
        """Check if user is a system administrator"""
        if not permission_manager.get_user_role(user) == 'system_admin':
            raise PermissionDenied(
                "Only system administrators can perform this action."
            )
    
    def get_group_or_404(self, group_id):
        """Get group by ID or raise 404"""
        return get_object_or_404(Group, id=group_id, is_active=True)


class GroupMembershipMixin:
    """
    Mixin for views that manage group memberships
    Provides authorization logic for adding/removing members
    """
    
    def check_add_member_permission(self, user, group):
        """Check if user can add members to the group"""
        if not permission_manager.can_add_members(user, group):
            raise PermissionDenied(
                "You don't have permission to add members to this group. "
                "Only system administrators and group administrators can add members."
            )
    
    def check_remove_member_permission(self, user, group, target_user=None):
        """Check if user can remove members from the group"""
        if not permission_manager.can_remove_members(user, group, target_user):
            role_context = ""
            if target_user and permission_manager.get_user_role(target_user, group) == 'group_admin':
                role_context = " Group administrators cannot remove other administrators."
            
            raise PermissionDenied(
                "You don't have permission to remove members from this group. "
                "Only system administrators and group administrators can remove members."
                + role_context
            )
    
    def validate_membership_data(self, data, group):
        """Validate membership creation/update data"""
        user_id = data.get('user_id') or data.get('user')
        user_email = data.get('user_email') or data.get('email')
        role = data.get('role', GroupMembership.MEMBER)
        message = data.get('message', '')
        
        # Support both user_id and email lookup
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                raise ValueError("User not found")
        elif user_email:
            try:
                user = User.objects.get(email=user_email)
            except User.DoesNotExist:
                raise ValueError(f"No user found with email: {user_email}")
        else:
            raise ValueError("Either user ID or email is required")
        
        # Check if user is already a member
        if GroupMembership.objects.filter(group=group, user=user, is_active=True).exists():
            raise ValueError(f"User {user.username} is already a member of this group")
        
        return user, role, message
    
    def create_membership(self, group, user, role, added_by, message=None):
        """Create a new group membership"""
        membership = GroupMembership.objects.create(
            group=group,
            user=user,
            role=role,
            added_by=added_by,
            is_active=True
        )
        
        # TODO: If message is provided, we could send a notification email
        # or store it in a notification system
        if message:
            # For now, we'll just log it or could extend to send notifications
            print(f"Welcome message for {user.username}: {message}")
        
        return membership


class GroupSharingMixin:
    """
    Mixin for views that handle group sharing
    Provides authorization logic for sharing resources with groups
    """
    
    def check_sharing_permission(self, user, resource, group, is_reshare=False):
        """Check if user can share resource with group"""
        if is_reshare:
            # For resharing, check if user has access and reshare permission
            if not (resource.owner == user or resource.is_accessible_by(user)):
                raise PermissionDenied(
                    "You don't have access to this resource and cannot reshare it."
                )
        else:
            # For regular sharing, user must own the resource
            if not permission_manager.can_share_with_group(user, resource, group):
                if resource.owner != user:
                    raise PermissionDenied(
                        "You can only share resources that you own."
                    )
                else:
                    raise PermissionDenied(
                        "You can only share resources with groups you belong to. "
                        "Please join the group first or contact a group administrator."
                    )
    
    def validate_sharing_data(self, data):
        """Validate group sharing request data"""
        file_ids = data.get('file_ids', [])
        folder_ids = data.get('folder_ids', [])
        group_ids = data.get('group_ids', [])
        
        if not file_ids and not folder_ids:
            raise ValueError("At least one file or folder must be selected for sharing")
        
        if not group_ids:
            raise ValueError("At least one group must be selected for sharing")
        
        return file_ids, folder_ids, group_ids
    
    def get_user_resources(self, user, file_ids, folder_ids, is_reshare=False):
        """Get user's files and folders with proper permission checks"""
        files = []
        folders = []
        
        if file_ids:
            all_files = UploadedFile.objects.filter(id__in=file_ids)
            for file in all_files:
                if is_reshare:
                    # For reshare, check if user has access and reshare permission
                    if file.owner == user or file.is_accessible_by(user):
                        files.append(file)
                    else:
                        raise ValueError(f"You don't have permission to reshare '{file.name}'")
                else:
                    # For regular share, user must be owner
                    if file.owner == user:
                        files.append(file)
                    else:
                        raise ValueError(f"You don't own '{file.name}' and cannot share it")
            
            if len(files) != len(file_ids):
                raise ValueError("Some files not found or you don't have permission to share them")
        
        if folder_ids:
            all_folders = Folder.objects.filter(id__in=folder_ids)
            for folder in all_folders:
                if is_reshare:
                    # For reshare, check if user has access and reshare permission
                    if folder.owner == user or folder.is_accessible_by(user):
                        folders.append(folder)
                    else:
                        raise ValueError(f"You don't have permission to reshare '{folder.name}'")
                else:
                    # For regular share, user must be owner
                    if folder.owner == user:
                        folders.append(folder)
                    else:
                        raise ValueError(f"You don't own '{folder.name}' and cannot share it")
            
            if len(folders) != len(folder_ids):
                raise ValueError("Some folders not found or you don't have permission to share them")
        
        return files, folders
    
    def get_user_groups(self, user, group_ids):
        """Get groups that user can share with"""
        if permission_manager.get_user_role(user) == 'system_admin':
            # System admins can share with any group
            groups = Group.objects.filter(id__in=group_ids, is_active=True)
        else:
            # Regular users can only share with groups they belong to
            groups = Group.objects.filter(
                id__in=group_ids,
                is_active=True,
                memberships__user=user,
                memberships__is_active=True
            )
        
        if len(groups) != len(group_ids):
            raise ValueError("Some groups not found or you don't have permission to share with them")
        
        return groups
    
    def create_group_shares(self, files, folders, groups, user, message="", can_download=True, can_reshare=False, permission_level='view'):
        """Create group sharing records"""
        created_shares = []
        
        for group in groups:
            # Share files
            for file in files:
                share, created = GroupSharing.objects.get_or_create(
                    file=file,
                    group=group,
                    defaults={
                        'shared_by': user,
                        'message': message,
                        'share_type': GroupSharing.FILE,
                        'can_download': can_download,
                        'can_reshare': can_reshare,
                        'permission_level': permission_level,
                    }
                )
                # Update permission level if share already exists
                if not created and share.permission_level != permission_level:
                    share.permission_level = permission_level
                    share.save(update_fields=['permission_level'])
                
                if created:
                    created_shares.append(share)
            
            # Share folders
            for folder in folders:
                share, created = GroupSharing.objects.get_or_create(
                    folder=folder,
                    group=group,
                    defaults={
                        'shared_by': user,
                        'message': message,
                        'share_type': GroupSharing.FOLDER,
                        'can_download': can_download,
                        'can_reshare': can_reshare,
                        'permission_level': permission_level,
                    }
                )
                # Update permission level if share already exists
                if not created and share.permission_level != permission_level:
                    share.permission_level = permission_level
                    share.save(update_fields=['permission_level'])
                
                if created:
                    created_shares.append(share)
        
        return created_shares


class ResourceAccessMixin:
    """
    Mixin for views that provide access to shared resources
    Handles authorization for viewing group-shared content
    """
    
    def get_user_accessible_files(self, user):
        """Get all files accessible to user (owned + individually shared + group shared)"""
        # Files owned by user
        owned_files = UploadedFile.objects.filter(owner=user)
        
        # Files shared individually with user
        individually_shared = UploadedFile.objects.filter(
            filesharing__shared_to=user
        )
        
        # Files shared with user's groups
        group_shared = UploadedFile.objects.filter(
            groupsharing__group__memberships__user=user,
            groupsharing__group__memberships__is_active=True
        )
        
        # Combine all accessible files (remove duplicates)
        accessible_files = owned_files.union(individually_shared, group_shared)
        return accessible_files
    
    def get_user_accessible_folders(self, user):
        """Get all folders accessible to user (owned + individually shared + group shared)"""
        # Folders owned by user
        owned_folders = Folder.objects.filter(owner=user)
        
        # Folders shared individually with user
        individually_shared = Folder.objects.filter(
            filesharing__shared_to=user
        )
        
        # Folders shared with user's groups
        group_shared = Folder.objects.filter(
            groupsharing__group__memberships__user=user,
            groupsharing__group__memberships__is_active=True
        )
        
        # Combine all accessible folders (remove duplicates)
        accessible_folders = owned_folders.union(individually_shared, group_shared)
        return accessible_folders
    
    def check_resource_access(self, user, resource):
        """Check if user has access to a specific resource"""
        if not resource.is_accessible_by(user):
            raise PermissionDenied(
                "You don't have permission to access this resource. "
                "It may not be shared with you or your groups."
            )


class GroupContextMixin:
    """
    Mixin that provides group context for views
    Adds helper methods for getting user's group relationships
    """
    
    def get_user_groups_context(self, user):
        """Get comprehensive group context for user"""
        if not user or not user.is_authenticated:
            return {
                'member_groups': [],
                'admin_groups': [],
                'manageable_groups': [],
                'is_system_admin': False
            }
        
        # Get groups where user is a member
        member_groups = Group.objects.filter(
            memberships__user=user,
            memberships__is_active=True,
            is_active=True
        ).distinct()
        
        # Get groups where user is an admin
        admin_groups = Group.objects.filter(
            memberships__user=user,
            memberships__role=GroupMembership.ADMIN,
            memberships__is_active=True,
            is_active=True
        )
        
        # Get groups user can manage (admin groups + all groups if system admin)
        if user.is_superuser:
            manageable_groups = Group.objects.filter(is_active=True)
        else:
            manageable_groups = admin_groups
        
        return {
            'member_groups': member_groups,
            'admin_groups': admin_groups,
            'manageable_groups': manageable_groups,
            'is_system_admin': user.is_superuser,
            'total_groups': member_groups.count(),
            'admin_of_count': admin_groups.count()
        }