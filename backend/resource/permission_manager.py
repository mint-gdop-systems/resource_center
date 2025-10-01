"""
Modern Permission Management System
Provides a flexible, configuration-driven role-based access control system
"""

import json
import os
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth.models import User

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


class PermissionManager:
    """
    Modern permission manager using external JSON configuration
    Supports caching, validation, and flexible permission checking
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or self._get_default_config_path()
        self._config = None
        self._config_loaded_at = None
        self.cache_timeout = getattr(settings, 'PERMISSION_CACHE_TIMEOUT', 300)  # 5 minutes
    
    def _get_default_config_path(self) -> str:
        """Get the default configuration file path"""
        config_dir = os.path.join(os.path.dirname(__file__), 'config')
        
        # Check for YAML first if available, then JSON
        if YAML_AVAILABLE and os.path.exists(os.path.join(config_dir, 'permissions.yaml')):
            return os.path.join(config_dir, 'permissions.yaml')
        
        return os.path.join(config_dir, 'permissions.json')
    
    @property
    def config(self) -> Dict[str, Any]:
        """Get configuration with caching and auto-reload"""
        cache_key = f"permission_config_{hash(self.config_path)}"
        
        # Try to get from cache first
        cached_config = cache.get(cache_key)
        if cached_config and self._config_loaded_at:
            # Check if file has been modified
            try:
                file_mtime = os.path.getmtime(self.config_path)
                if file_mtime <= self._config_loaded_at:
                    return cached_config
            except OSError:
                pass
        
        # Load from file
        try:
            with open(self.config_path, 'r') as f:
                if self.config_path.endswith('.yaml') or self.config_path.endswith('.yml'):
                    if not YAML_AVAILABLE:
                        raise RuntimeError("PyYAML is required for YAML configuration files")
                    self._config = yaml.safe_load(f)
                else:
                    self._config = json.load(f)
                
                self._config_loaded_at = datetime.now().timestamp()
                
                # Validate configuration
                self._validate_config(self._config)
                
                # Cache the configuration
                cache.set(cache_key, self._config, self.cache_timeout)
                
                return self._config
        except (FileNotFoundError, json.JSONDecodeError, ValueError) as e:
            raise RuntimeError(f"Failed to load permission configuration: {e}")
        except Exception as e:
            if YAML_AVAILABLE:
                raise RuntimeError(f"Failed to load permission configuration: {e}")
            else:
                raise RuntimeError(f"Failed to load permission configuration: {e}")
    
    def _validate_config(self, config: Dict[str, Any]) -> None:
        """Validate the configuration structure"""
        required_sections = ['metadata', 'roles', 'actions']
        for section in required_sections:
            if section not in config:
                raise ValueError(f"Missing required section: {section}")
        
        # Validate metadata
        metadata = config['metadata']
        required_metadata = ['version', 'last_updated']
        for field in required_metadata:
            if field not in metadata:
                raise ValueError(f"Missing required metadata field: {field}")
        
        # Validate roles structure
        for role_name, role_config in config['roles'].items():
            required_role_fields = ['name', 'description', 'level', 'permissions']
            for field in required_role_fields:
                if field not in role_config:
                    raise ValueError(f"Missing required field '{field}' in role '{role_name}'")
    
    def get_user_role(self, user: User, group=None) -> Optional[str]:
        """
        Determine user's role in the system or specific group context
        """
        if not user or not user.is_authenticated:
            return None
        
        # System admin check
        if user.is_superuser:
            return 'system_admin'
        
        # Group context checks
        if group:
            from .models import GroupMembership
            try:
                membership = GroupMembership.objects.get(
                    user=user, 
                    group=group, 
                    is_active=True
                )
                return 'group_admin' if membership.role == GroupMembership.ADMIN else 'group_member'
            except GroupMembership.DoesNotExist:
                # User is not a member of this specific group
                return None
        
        # Check if user is admin of any group
        from .models import GroupMembership
        if GroupMembership.objects.filter(
            user=user,
            role=GroupMembership.ADMIN,
            is_active=True
        ).exists():
            return 'group_admin'
        
        # Check if user is member of any group
        if GroupMembership.objects.filter(
            user=user,
            is_active=True
        ).exists():
            return 'group_member'
        
        return 'regular_user'
    
    def has_permission(self, user: User, action: str, resource=None, context: Dict = None) -> bool:
        """
        Check if user has permission to perform an action
        
        Args:
            user: The user to check permissions for
            action: The action in format 'resource_type.action_name'
            resource: Optional resource object for ownership/access checks
            context: Optional context dictionary with additional parameters
        """
        role = self.get_user_role(user, context.get('group') if context else None)
        if not role:
            return False
        
        try:
            resource_type, action_name = action.split('.', 1)
        except ValueError:
            raise ValueError(f"Invalid action format: {action}. Expected 'resource_type.action_name'")
        
        role_config = self.config['roles'].get(role, {})
        permissions = role_config.get('permissions', {})
        restrictions = role_config.get('restrictions', {})
        
        # Check if the resource type exists in permissions
        if resource_type not in permissions:
            return False
        
        resource_permissions = permissions[resource_type]
        
        # Check if action is allowed
        if action_name not in resource_permissions:
            return False
        
        permission_value = resource_permissions[action_name]
        
        # Handle boolean permissions
        if isinstance(permission_value, bool):
            if not permission_value:
                return False
        
        # Handle scoped permissions
        elif isinstance(permission_value, str):
            if not self._check_scope_permission(user, permission_value, resource, context):
                return False
        
        # Apply restrictions
        return self._check_restrictions(user, action, role_config, resource, context)
    
    def _check_scope_permission(self, user: User, scope: str, resource=None, context: Dict = None) -> bool:
        """Check if user has permission within the specified scope"""
        context = context or {}
        
        if scope == "own":
            # User can only access their own resources
            if resource and hasattr(resource, 'owner'):
                return resource.owner == user
            return True
        
        elif scope == "own_groups":
            # User can only access groups they admin
            group = context.get('group') or resource
            if group:
                return group.is_user_admin(user) if hasattr(group, 'is_user_admin') else False
            return True
        
        elif scope == "member_groups":
            # User can only access groups they're a member of
            group = context.get('group') or resource
            if group:
                return group.is_user_member(user) if hasattr(group, 'is_user_member') else False
            return True
        
        elif scope == "member":
            # User can access as a member
            group = context.get('group') or resource
            if group:
                return group.is_user_member(user) if hasattr(group, 'is_user_member') else False
            return True
        
        # Default to allowing if scope is not recognized
        return True
    
    def _check_restrictions(self, user: User, action: str, role_config: Dict, resource=None, context: Dict = None) -> bool:
        """Apply role-specific restrictions"""
        restrictions = role_config.get('restrictions', {})
        context = context or {}
        
        # Check resource ownership restrictions
        if restrictions.get('resources') == 'own_only' and resource:
            if hasattr(resource, 'owner') and resource.owner != user:
                return False
        
        # Check scope restrictions
        scope_restriction = restrictions.get('scope')
        if scope_restriction == 'own_groups_only':
            group = context.get('group') or resource
            if group and hasattr(group, 'is_user_admin'):
                if not group.is_user_admin(user):
                    return False
        
        elif scope_restriction == 'member_groups_only':
            group = context.get('group') or resource
            if group and hasattr(group, 'is_user_member'):
                if not group.is_user_member(user):
                    return False
        
        elif scope_restriction == 'own_resources_only' and resource:
            if hasattr(resource, 'owner') and resource.owner != user:
                return False
        
        # Check admin-specific restrictions
        if restrictions.get('cannot_remove_other_admins') and 'remove' in action:
            target_user = context.get('target_user')
            group = context.get('group')
            if target_user and group:
                target_role = self.get_user_role(target_user, group)
                if target_role == 'group_admin':
                    return False
        
        if restrictions.get('cannot_promote_to_admin') and 'promote' in action:
            return False
        
        return True
    
    def get_user_permissions(self, user: User, group=None) -> List[str]:
        """Get all permissions for a user"""
        role = self.get_user_role(user, group)
        if not role:
            return []
        
        role_config = self.config['roles'].get(role, {})
        permissions = role_config.get('permissions', {})
        
        # Flatten permissions into a list of action strings
        permission_list = []
        for resource_type, actions in permissions.items():
            for action_name, permission_value in actions.items():
                if permission_value:  # Only include allowed permissions
                    permission_list.append(f"{resource_type}.{action_name}")
        
        return permission_list
    
    def get_role_level(self, role: str) -> int:
        """Get the numeric level of a role for comparison"""
        role_config = self.config['roles'].get(role, {})
        return role_config.get('level', 0)
    
    def can_user_perform_action(self, user: User, action: str, **kwargs) -> bool:
        """Convenience method for checking specific actions with context"""
        return self.has_permission(user, action, kwargs.get('resource'), kwargs)
    
    # Convenience methods for common permission checks
    def can_manage_group(self, user: User, group) -> bool:
        """Check if user can manage a specific group"""
        return self.has_permission(user, 'groups.update', group, {'group': group})
    
    def can_add_members(self, user: User, group) -> bool:
        """Check if user can add members to a group"""
        return self.has_permission(user, 'group_members.add', group, {'group': group})
    
    def can_remove_members(self, user: User, group, target_user=None) -> bool:
        """Check if user can remove members from a group"""
        context = {'group': group}
        if target_user:
            context['target_user'] = target_user
        return self.has_permission(user, 'group_members.remove', group, context)
    
    def can_share_with_group(self, user: User, resource, group) -> bool:
        """Check if user can share a resource with a group"""
        context = {'group': group}
        
        # System admins can share any resource with any group
        if self.has_permission(user, 'resources.share_any', resource, context):
            return True
        
        # Regular users can share own resources with member groups
        return self.has_permission(user, 'resources.share_own', resource, context)
    
    def get_config_metadata(self) -> Dict[str, Any]:
        """Get configuration metadata"""
        return self.config.get('metadata', {})
    
    def reload_config(self) -> None:
        """Force reload of configuration"""
        cache_key = f"permission_config_{hash(self.config_path)}"
        cache.delete(cache_key)
        self._config = None
        self._config_loaded_at = None


# Global permission manager instance
permission_manager = PermissionManager()


# Backward compatibility functions
def get_user_role(user, group=None):
    """Get user's role - backward compatibility"""
    return permission_manager.get_user_role(user, group)

def has_permission(user, action, resource=None, **context):
    """Check permission - backward compatibility"""
    return permission_manager.has_permission(user, action, resource, context)

def can_user_manage_group(user, group):
    """Check group management permission - backward compatibility"""
    return permission_manager.can_manage_group(user, group)

def can_user_add_members(user, group):
    """Check member addition permission - backward compatibility"""
    return permission_manager.can_add_members(user, group)

def can_user_remove_members(user, group, target_user=None):
    """Check member removal permission - backward compatibility"""
    return permission_manager.can_remove_members(user, group, target_user)

def can_user_share_with_group(user, resource, group):
    """Check sharing permission - backward compatibility"""
    return permission_manager.can_share_with_group(user, resource, group)