from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from resource.models import Group, GroupMembership


class Command(BaseCommand):
    help = 'Create sample groups for testing group sharing functionality'

    def handle(self, *args, **options):
        # Create or get superuser
        superuser, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@mint.gov.et',
                'first_name': 'System',
                'last_name': 'Admin',
                'is_superuser': True,
                'is_staff': True,
            }
        )
        if created:
            superuser.set_password('admin123')
            superuser.save()
            self.stdout.write(f"Created superuser: {superuser.username}")
        
        # Create sample groups
        groups_data = [
            {
                'name': 'IT Department',
                'description': 'Information Technology team members',
            },
            {
                'name': 'HR Department', 
                'description': 'Human Resources team members',
            },
            {
                'name': 'Finance Team',
                'description': 'Finance and accounting team members',
            },
        ]
        
        for group_data in groups_data:
            group, created = Group.objects.get_or_create(
                name=group_data['name'],
                defaults={
                    'description': group_data['description'],
                    'created_by': superuser,
                }
            )
            if created:
                self.stdout.write(f"Created group: {group.name}")
            else:
                self.stdout.write(f"Group already exists: {group.name}")
        
        self.stdout.write(
            self.style.SUCCESS('Successfully created sample groups!')
        )