# Generated migration for archive metadata fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('resource', '0008_add_onlyoffice_document_key'),
    ]

    operations = [
        # Add archive fields to Folder model
        migrations.AddField(
            model_name='folder',
            name='is_archived',
            field=models.BooleanField(blank=True, default=False, null=True),
        ),
        migrations.AddField(
            model_name='folder',
            name='archived_at',
            field=models.DateTimeField(blank=True, help_text='When this folder was archived', null=True),
        ),
        migrations.AddField(
            model_name='folder',
            name='archived_by',
            field=models.ForeignKey(blank=True, help_text='User who archived this folder', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='archived_folders', to=settings.AUTH_USER_MODEL),
        ),
        # Add archive metadata fields to UploadedFile model
        migrations.AddField(
            model_name='uploadedfile',
            name='archived_at',
            field=models.DateTimeField(blank=True, help_text='When this file was archived', null=True),
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='archived_by',
            field=models.ForeignKey(blank=True, help_text='User who archived this file', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='archived_files', to=settings.AUTH_USER_MODEL),
        ),
    ]

