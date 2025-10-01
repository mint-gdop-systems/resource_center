"""
Utility functions for permission management and testing
Provides helper functions for common permission operations
"""

from typing import Dict, List, Optional, Tuple, Any
from django.contrib.auth.models import User
from django.db.models import QuerySet
from .models import Group, GroupMembership, UploadedFile, Folder
from .permission_manager import permission_manager


class PermissionValidator:
    """
    Utility class for validating and testing permissions
    """
    
    @staticmethod
    def validate_user_action(user: User, action: str, resource=None, **context) -> Tuple[bool, str]:
        """
        Validate if user can perform action and return detailed reason
        
        Returns:
            Tuple of (is_allowed: bool, reason: str)
        """
        if not user or not user.is_authenticated:
            return False, "User is not authenticated"
        
        try:
            has_permission = permission_manager.has_permission(user, action, resource, context)
            user_role = permission_manager.get_user_role(user, context.get('group'))
            
            if has_permission:
                return True, f"User has '{user_role}' role with required permissions"
            else:
                return False, f"User role '{user_role}' does not have permission for '{action}'"
                
        except Exception as e:
            return False, f"Permission check failed: {str(e)}"
    
    @staticmethod
    def get_user_role_summary(user: User) -> Dict[str, Any]:
        """Get comprehensive role summary for user"""
        if not user or not user.is_authenticated:
            return {
                'authenticated': False,
                'system_role': None,
                'group_roles': {},
                'permissions_count': 0
            }
        
        # Get system-wide role
        system_role = permission_manager.get_user_role(user)
        
        # Get group-specific roles
        group_roles = {}
        user_groups = Group.objects.filter(
            memberships__user=user,
            memberships__is_active=True,
            is_active=True
        )
        
        for group in user_groups:
            group_role = permission_manager.get_user_role(user, group)
            group_roles[group.name] = {
                'role': group_role,
                'group_id': group.id,
                'permissions': permission_manager.get_user_permissions(user, group)
            }
        
        # Get system-wide permissions
        system_permissions = permission_manager.get_user_permissions(user)
        
        return {
            'authenticated': True,
            'system_role': system_role,
            'group_roles': group_roles,
            'system_permissions': system_permissions,
            'permissions_count': len(system_permissions),
            'groups_count': len(group_roles)
        }
    
    @staticmethod
    def check_bulk_permissions(user: User, actions: List[str], **context) -> Dict[str, bool]:
        """Check multiple permissions at once"""
        results = {}
        for action in actions:
            results[action] = permission_manager.has_permission(user, action, None, context)
        return results


class ResourceAccessHelper:
    """
    Helper class for resource access management
    """
    
    @staticmethod
    def get_accessible_groups(user: User) -> QuerySet:
        """Get all groups accessible to user"""
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
    
    @staticmethod
    def get_manageable_groups(user: User) -> QuerySet:
        """Get groups that user can manage"""
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
    
    @staticmethod
    def get_shareable_groups(user: User) -> QuerySet:
        """Get groups that user can share resources with"""
        return ResourceAccessHelper.get_accessible_groups(user)
    
    @staticmethod
    def can_access_resource(user: User, resource) -> bool:
        """Check if user can access a specific resource"""
        if not user or not user.is_authenticated:
            return False
        
        # Resource owner always has access
        if hasattr(resource, 'owner') and resource.owner == user:
            return True
        
        # System admins have access to all resources
        if permission_manager.get_user_role(user) == 'system_admin':
            return True
        
        # Check if resource is shared with user's groups
        if hasattr(resource, 'is_accessible_by'):
            return resource.is_accessible_by(user)
        
        return False


class PermissionAuditLogger:
    """
    Utility for logging permission checks and changes
    """
    
    @staticmethod
    def log_permission_check(user: User, action: str, resource=None, result: bool = None, **context):
        """Log a permission check (can be extended to use Django logging)"""
        import logging
        
        logger = logging.getLogger('permissions')
        
        log_data = {
            'user': user.username if user else 'anonymous',
            'user_id': user.id if user else None,
            'action': action,
            'resource_type': type(resource).__name__ if resource else None,
            'resource_id': getattr(resource, 'id', None),
            'result': result,
            'context': context
        }
        
        if result:
            logger.info(f"Permission granted: {log_data}")
        else:
            logger.warning(f"Permission denied: {log_data}")
    
    @staticmethod
    def log_role_change(user: User, old_role: str, new_role: str, changed_by: User, group=None):
        """Log role changes"""
        import logging
        
        logger = logging.getLogger('permissions.roles')
        
        log_data = {
            'user': user.username,
            'user_id': user.id,
            'old_role': old_role,
            'new_role': new_role,
            'changed_by': changed_by.username,
            'changed_by_id': changed_by.id,
            'group': group.name if group else 'system',
            'group_id': group.id if group else None
        }
        
        logger.info(f"Role changed: {log_data}")


# Convenience functions for common operations
def check_user_permission(user: User, action: str, resource=None, **context) -> bool:
    """Simple permission check with optional logging"""
    result = permission_manager.has_permission(user, action, resource, context)
    
    # Optional: Enable logging by setting PERMISSION_LOGGING = True in settings
    from django.conf import settings
    if getattr(settings, 'PERMISSION_LOGGING', False):
        PermissionAuditLogger.log_permission_check(user, action, resource, result, **context)
    
    return result


def get_user_accessible_resources(user: User, resource_type: str = 'all') -> Dict[str, QuerySet]:
    """Get all resources accessible to user"""
    if not user or not user.is_authenticated:
        return {'files': UploadedFile.objects.none(), 'folders': Folder.objects.none()}
    
    # Get user's accessible files
    accessible_files = UploadedFile.objects.none()
    accessible_folders = Folder.objects.none()
    
    if resource_type in ['all', 'files']:
        # Files owned by user
        owned_files = UploadedFile.objects.filter(owner=user)
        
        # Files shared with user's groups
        user_groups = ResourceAccessHelper.get_accessible_groups(user)
        group_shared_files = UploadedFile.objects.filter(
            groupsharing__group__in=user_groups
        )
        
        accessible_files = owned_files.union(group_shared_files)
    
    if resource_type in ['all', 'folders']:
        # Folders owned by user
        owned_folders = Folder.objects.filter(owner=user)
        
        # Folders shared with user's groups
        user_groups = ResourceAccessHelper.get_accessible_groups(user)
        group_shared_folders = Folder.objects.filter(
            groupsharing__group__in=user_groups
        )
        
        accessible_folders = owned_folders.union(group_shared_folders)
    
    return {
        'files': accessible_files,
        'folders': accessible_folders
    }


def validate_permission_config() -> Tuple[bool, List[str]]:
    """Validate the current permission configuration"""
    errors = []
    
    try:
        config = permission_manager.config
        
        # Check required sections
        required_sections = ['metadata', 'roles', 'actions']
        for section in required_sections:
            if section not in config:
                errors.append(f"Missing required section: {section}")
        
        # Validate roles
        if 'roles' in config:
            for role_name, role_config in config['roles'].items():
                required_fields = ['name', 'description', 'level', 'permissions']
                for field in required_fields:
                    if field not in role_config:
                        errors.append(f"Role '{role_name}' missing field: {field}")
        
        # Validate actions
        if 'actions' in config:
            for resource_type, actions in config['actions'].items():
                if not isinstance(actions, dict):
                    errors.append(f"Actions for '{resource_type}' must be a dictionary")
        
        return len(errors) == 0, errors
        
    except Exception as e:
        return False, [f"Configuration validation failed: {str(e)}"]