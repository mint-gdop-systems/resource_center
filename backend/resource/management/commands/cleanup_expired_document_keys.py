from django.core.management.base import BaseCommand
from django.utils import timezone
from resource.models import OnlyOfficeDocumentKey


class Command(BaseCommand):
    help = 'Clean up expired ONLYOFFICE document keys'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        expired_keys = OnlyOfficeDocumentKey.objects.filter(
            expires_at__lt=now
        )
        
        count = expired_keys.count()
        
        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING(f'Would delete {count} expired document keys')
            )
            for key in expired_keys[:10]:  # Show first 10
                self.stdout.write(f'  - {key.document_key[:16]}... (expired {key.expires_at})')
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
        else:
            deleted_count, _ = expired_keys.delete()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted_count} expired document keys')
            )