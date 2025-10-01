# Generated manually for storage quota system

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0005_add_group_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='storage_quota',
            field=models.BigIntegerField(
                default=1073741824,  # 1GB in bytes (1024 * 1024 * 1024)
                help_text='Storage quota in bytes'
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='storage_used',
            field=models.BigIntegerField(
                default=0,
                help_text='Storage currently used in bytes'
            ),
        ),
    ]