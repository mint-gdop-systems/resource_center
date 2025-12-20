# Generated migration for system configuration and security enhancements

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('resource', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SystemConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(choices=[('max_file_size', 'Maximum File Size (bytes)'), ('allowed_file_categories', 'Allowed File Categories'), ('security_settings', 'Security Settings')], max_length=50, unique=True)),
                ('value', models.TextField(help_text='JSON-encoded configuration value')),
                ('description', models.TextField(blank=True, help_text='Description of this configuration setting')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'System Configuration',
                'verbose_name_plural': 'System Configurations',
                'ordering': ['key'],
            },
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='requires_secure_download',
            field=models.BooleanField(default=False, help_text='Force secure download for web files (HTML, JS, CSS)'),
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='mime_validated',
            field=models.BooleanField(default=False, help_text='Whether MIME type validation was performed'),
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='detected_mime_type',
            field=models.CharField(blank=True, help_text='MIME type detected from file content', max_length=100, null=True),
        ),
    ]