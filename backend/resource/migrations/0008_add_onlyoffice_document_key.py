# Generated manually for ONLYOFFICE document key mapping

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('resource', '0007_add_permission_levels'),
    ]

    operations = [
        migrations.AddField(
            model_name='uploadedfile',
            name='current_document_key',
            field=models.CharField(blank=True, help_text='Current ONLYOFFICE document key for collaborative editing', max_length=64, null=True),
        ),
        migrations.CreateModel(
            name='OnlyOfficeDocumentKey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_key', models.CharField(db_index=True, max_length=64, unique=True)),
                ('version_number', models.PositiveIntegerField(help_text='Version number when key was generated')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(help_text='When this document key expires')),
                ('is_active', models.BooleanField(default=True)),
                ('file', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='document_keys', to='resource.uploadedfile')),
                ('user', models.ForeignKey(help_text='User who initiated the editing session', on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='onlyofficedocumentkey',
            index=models.Index(fields=['document_key'], name='resource_onl_documen_b8c8a5_idx'),
        ),
        migrations.AddIndex(
            model_name='onlyofficedocumentkey',
            index=models.Index(fields=['file', 'is_active'], name='resource_onl_file_id_a8b9c6_idx'),
        ),
    ]