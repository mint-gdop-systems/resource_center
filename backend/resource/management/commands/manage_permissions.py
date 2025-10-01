"""
Management command for permission configuration management
Provides utilities to validate, update, and manage permission configurations
"""

import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from resource.permission_manager import permission_manager
from resource.models import Group, GroupMembership


class Command(BaseCommand):
    help = 'Manage permission configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['validate', 'info', 'test', 'update-metadata', 'export-legacy'],
            help='Action to perform'
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID for testing permissions'
        )
        parser.add_argument(
            '--group-id',
            type=int,
            help='Group ID for testing permissions'
        )
        parser.add_argument(
            '--action-name',
            type=str,
            help='Action name for testing permissions (e.g., groups.create)'
        )
        parser.add_argument(
            '--output-file',
            type=str,
            help='Output file for export operations'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'validate':
            self.validate_config()
        elif action == 'info':
            self.show_config_info()
        elif action == 'test':
            self.test_permissions(options)
        elif action == 'update-metadata':
            self.update_metadata()
        elif action == 'export-legacy':
            self.export_legacy_config(options)

    def validate_config(self):
        """Validate the permission configuration"""
        try:
            config = permission_manager.config
            self.stdout.write(
                self.style.SUCCESS('✓ Permission configuration is valid')
            )
            
            # Show basic stats
            roles_count = len(config.get('roles', {}))
            actions_count = sum(len(actions) for actions in config.get('actions', {}).values())
            
            self.stdout.write(f"  - Roles defined: {roles_count}")
            self.stdout.write(f"  - Actions defined: {actions_count}")
            self.stdout.write(f"  - Config version: {config.get('metadata', {}).get('version', 'Unknown')}")
            
        except Exception as e:
            raise CommandError(f'Configuration validation failed: {e}')

    def show_config_info(self):
        """Show detailed configuration information"""
        try:
            config = permission_manager.config
            metadata = config.get('metadata', {})
            
            self.stdout.write(self.style.SUCCESS('Permission Configuration Info'))
            self.stdout.write('=' * 50)
            
            # Metadata
            self.stdout.write(f"Version: {metadata.get('version', 'Unknown')}")
            self.stdout.write(f"Last Updated: {metadata.get('last_updated', 'Unknown')}")
            self.stdout.write(f"Description: {metadata.get('description', 'No description')}")
            self.stdout.write('')
            
            # Roles
            self.stdout.write('Roles:')
            for role_name, role_config in config.get('roles', {}).items():
                level = role_config.get('level', 0)
                permissions_count = sum(
                    len(actions) for actions in role_config.get('permissions', {}).values()
                )
                self.stdout.write(f"  - {role_name} (Level {level}): {permissions_count} permissions")
                self.stdout.write(f"    {role_config.get('description', 'No description')}")
            
            self.stdout.write('')
            
            # Actions by resource type
            self.stdout.write('Actions by Resource Type:')
            for resource_type, actions in config.get('actions', {}).items():
                self.stdout.write(f"  - {resource_type}: {len(actions)} actions")
                for action_name in actions.keys():
                    self.stdout.write(f"    • {action_name}")
            
        except Exception as e:
            raise CommandError(f'Failed to show config info: {e}')

    def test_permissions(self, options):
        """Test permissions for a specific user and action"""
        user_id = options.get('user_id')
        group_id = options.get('group_id')
        action_name = options.get('action_name')
        
        if not user_id:
            raise CommandError('--user-id is required for testing')
        
        if not action_name:
            raise CommandError('--action-name is required for testing')
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise CommandError(f'User with ID {user_id} not found')
        
        group = None
        if group_id:
            try:
                group = Group.objects.get(id=group_id)
            except Group.DoesNotExist:
                raise CommandError(f'Group with ID {group_id} not found')
        
        # Test permission
        context = {}
        if group:
            context['group'] = group
        
        has_perm = permission_manager.has_permission(user, action_name, None, context)
        user_role = permission_manager.get_user_role(user, group)
        
        self.stdout.write(self.style.SUCCESS('Permission Test Results'))
        self.stdout.write('=' * 30)
        self.stdout.write(f"User: {user.username} (ID: {user.id})")
        self.stdout.write(f"Action: {action_name}")
        if group:
            self.stdout.write(f"Group: {group.name} (ID: {group.id})")
        self.stdout.write(f"User Role: {user_role}")
        
        if has_perm:
            self.stdout.write(self.style.SUCCESS(f"✓ Permission GRANTED"))
        else:
            self.stdout.write(self.style.ERROR(f"✗ Permission DENIED"))
        
        # Show user's permissions
        user_permissions = permission_manager.get_user_permissions(user, group)
        self.stdout.write(f"\nUser's Permissions ({len(user_permissions)}):")
        for perm in sorted(user_permissions):
            self.stdout.write(f"  - {perm}")

    def update_metadata(self):
        """Update configuration metadata"""
        try:
            config_path = permission_manager.config_path
            
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Update metadata
            config['metadata']['last_updated'] = datetime.now().isoformat() + 'Z'
            
            # Write back to file
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            # Force reload
            permission_manager.reload_config()
            
            self.stdout.write(
                self.style.SUCCESS('✓ Configuration metadata updated')
            )
            
        except Exception as e:
            raise CommandError(f'Failed to update metadata: {e}')

    def export_legacy_config(self, options):
        """Export configuration in legacy format"""
        output_file = options.get('output_file', 'legacy_permissions.json')
        
        try:
            # Import the legacy config generator
            from resource.permissions_config import PERMISSIONS_CONFIG
            
            with open(output_file, 'w') as f:
                json.dump(PERMISSIONS_CONFIG, f, indent=2)
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Legacy configuration exported to {output_file}')
            )
            
        except Exception as e:
            raise CommandError(f'Failed to export legacy config: {e}')