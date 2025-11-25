# Generated migration for adding permission levels to FileSharing and GroupSharing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0006_add_storage_quota_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='filesharing',
            name='permission_level',
            field=models.CharField(
                choices=[
                    ('view', 'View Only'),
                    ('edit', 'Edit'),
                    ('comment', 'Comment'),
                    ('owner', 'Owner'),
                ],
                default='view',
                help_text='Permission level: view (read-only), edit (can modify), comment (can comment), owner (full control)',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='groupsharing',
            name='permission_level',
            field=models.CharField(
                choices=[
                    ('view', 'View Only'),
                    ('edit', 'Edit'),
                    ('comment', 'Comment'),
                    ('owner', 'Owner'),
                ],
                default='view',
                help_text='Permission level: view (read-only), edit (can modify), comment (can comment), owner (full control)',
                max_length=10,
            ),
        ),
    ]

