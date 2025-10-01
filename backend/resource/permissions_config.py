"""
DEPRECATED: Legacy permission configuration
This module is maintained for backward compatibility only.
New code should use the modern permission_manager module.
"""

import warnings
from typing import Dict
from .permission_manager import permission_manager

# Issue deprecation warning
warnings.warn(
    "permissions_config module is deprecated. Use permission_manager instead.",
    DeprecationWarning,
    stacklevel=2
)

# Legacy configuration for backward compatibility
# This is now generated from the modern JSON configuration
def _generate_legacy_config():
    """Generate legacy configuration format from modern config"""
    modern_config = permission_manager.config
    
    legacy_config = {
        "roles": {},
        "actions": {}
    }
    
    # Convert modern roles to legacy format
    for role_name, role_config in modern_config['roles'].items():
        permissions = []
        
        # Flatten modern permissions to legacy format
        for resource_type, actions in role_config.get('permissions', {}).items():
            for action_name, permission_value in actions.items():
                if permission_value:
                    if isinstance(permission_value, bool) and permission_value:
                        permissions.append(f"{resource_type}.{action_name}")
                    elif isinstance(permission_value, str):
                        permissions.append(f"{resource_type}.{action_name}_{permission_value}")
        
        legacy_config["roles"][role_name] = {
            "name": role_config["name"],
            "description": role_config["description"],
            "permissions": permissions,
            "restrictions": role_config.get("restrictions", {})
        }
    
    # Convert modern actions to legacy format
    for resource_type, actions in modern_config.get('actions', {}).items():
        legacy_config["actions"][resource_type] = {}
        for action_name, action_config in actions.items():
            legacy_config["actions"][resource_type][action_name] = action_config.get("description", "")
    
    return legacy_config

# Generate legacy configuration
PERMISSIONS_CONFIG = _generate_legacy_config()


# Legacy PermissionManager class for backward compatibility
class LegacyPermissionManager:
    """
    DEPRECATED: Legacy permission manager
    Use the modern permission_manager from permission_manager module instead
    """
    
    def __init__(self, config: Dict = None):
        warnings.warn(
            "LegacyPermissionManager is deprecated. Use permission_manager instead.",
            DeprecationWarning,
            stacklevel=2
        )
        self.config = config or PERMISSIONS_CONFIG
    
    def get_user_role(self, user, group=None):
        return permission_manager.get_user_role(user, group)
    
    def has_permission(self, user, action: str, group=None, resource=None):
        # Convert legacy action format to modern format
        context = {}
        if group:
            context['group'] = group
        return permission_manager.has_permission(user, action, resource, context)
    
    def get_user_permissions(self, user, group=None):
        return permission_manager.get_user_permissions(user, group)
    
    def can_manage_group(self, user, group):
        return permission_manager.can_manage_group(user, group)
    
    def can_add_members(self, user, group):
        return permission_manager.can_add_members(user, group)
    
    def can_remove_members(self, user, group, target_user=None):
        return permission_manager.can_remove_members(user, group, target_user)
    
    def can_share_with_group(self, user, resource, group):
        return permission_manager.can_share_with_group(user, resource, group)


# Legacy global instance - redirects to modern permission manager
class PermissionManagerProxy:
    """Proxy to redirect legacy calls to modern permission manager"""
    
    def __getattr__(self, name):
        return getattr(permission_manager, name)

# Create proxy instance for backward compatibility
legacy_permission_manager = PermissionManagerProxy()

# Convenience functions for backward compatibility
def get_user_role(user, group=None):
    return permission_manager.get_user_role(user, group)

def has_permission(user, action, group=None, resource=None):
    context = {}
    if group:
        context['group'] = group
    return permission_manager.has_permission(user, action, resource, context)

def can_user_manage_group(user, group):
    return permission_manager.can_manage_group(user, group)

def can_user_add_members(user, group):
    return permission_manager.can_add_members(user, group)

def can_user_remove_members(user, group, target_user=None):
    return permission_manager.can_remove_members(user, group, target_user)

def can_user_share_with_group(user, resource, group):
    return permission_manager.can_share_with_group(user, resource, group)