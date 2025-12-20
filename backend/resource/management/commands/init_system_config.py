from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from resource.models import SystemConfiguration
import json


class Command(BaseCommand):
    help = 'Initialize system configuration with default values'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing configurations',
        )
    
    def handle(self, *args, **options):
        force_update = options['force']
        
        # Default configurations
        default_configs = [
            {
                'key': SystemConfiguration.MAX_FILE_SIZE,
                'value': json.dumps(2 * 1024 * 1024 * 1024),  # 2GB in bytes (initial default)
                'description': 'Maximum file size allowed for uploads (in bytes). This is the system-wide limit that applies to all users.'
            },
            {
                'key': SystemConfiguration.ALLOWED_FILE_CATEGORIES,
                'value': json.dumps({
                    'documents': True,
                    'images': True,
                    'audio': True,
                    'video': True,
                    'data_files': True,
                    'archives': True,
                    'web_files': True,  # Allow web files but with security restrictions
                    'markdown': True,
                }),
                'description': 'File categories that are allowed for upload. Each category can be enabled/disabled.'
            },
            {
                'key': SystemConfiguration.SECURITY_SETTINGS,
                'value': json.dumps({
                    'enable_mime_validation': True,
                    'force_secure_download_web_files': True,
                    'block_executable_files': True,
                    'log_security_events': True,
                }),
                'description': 'Security settings for file upload and serving. Controls MIME validation, web file handling, and security logging.'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        # Get or create admin user for initial setup
        admin_user = None
        try:
            admin_user = User.objects.filter(is_superuser=True).first()
        except Exception:
            pass
        
        for config_data in default_configs:
            config, created = SystemConfiguration.objects.get_or_create(
                key=config_data['key'],
                defaults={
                    'value': config_data['value'],
                    'description': config_data['description'],
                    'updated_by': admin_user
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created configuration: {config.get_key_display()}')
                )
            elif force_update:
                config.value = config_data['value']
                config.description = config_data['description']
                config.updated_by = admin_user
                config.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated configuration: {config.get_key_display()}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Configuration already exists: {config.get_key_display()} (use --force to update)')
                )
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSystem configuration initialization complete:\n'
                f'- Created: {created_count} configurations\n'
                f'- Updated: {updated_count} configurations\n'
                f'- Total configurations: {SystemConfiguration.objects.count()}'
            )
        )
        
        # Display current configuration status
        self.stdout.write('\nCurrent system configuration:')
        for config in SystemConfiguration.objects.all().order_by('key'):
            try:
                parsed_value = config.get_parsed_value()
                
                if config.key == SystemConfiguration.MAX_FILE_SIZE:
                    size_gb = int(parsed_value) / (1024 * 1024 * 1024)
                    value_display = f'{size_gb:.1f} GB'
                elif config.key == SystemConfiguration.ALLOWED_FILE_CATEGORIES:
                    enabled_count = sum(1 for v in parsed_value.values() if v)
                    total_count = len(parsed_value)
                    value_display = f'{enabled_count}/{total_count} categories enabled'
                elif config.key == SystemConfiguration.SECURITY_SETTINGS:
                    enabled_count = sum(1 for v in parsed_value.values() if v)
                    total_count = len(parsed_value)
                    value_display = f'{enabled_count}/{total_count} security features enabled'
                else:
                    value_display = str(parsed_value)[:50]
                
                self.stdout.write(f'  • {config.get_key_display()}: {value_display}')
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  • {config.get_key_display()}: ERROR - {e}')
                )