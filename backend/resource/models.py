from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, null=True, 
        blank=True,)
    
    def __str__(self):
        return self.name if self.name else "Unnamed Category"

    @staticmethod
    def get_default_category():
        """ Ensure 'General' category exists and return it as default """
        category, created = Category.objects.get_or_create(name="General")
        return category.id 


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Folder(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    created_at = models.DateTimeField(auto_now_add=True)
    is_starred = models.BooleanField(default=False, blank=True, null=True) 
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='folders', null=True, blank=True) 
    is_public = models.BooleanField(default=False)


    def __str__(self):
        return self.name


# UploadedFile model stores each uploaded file along with metadata.
class UploadedFile(models.Model):
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='uploads/')  
    file_type = models.CharField(max_length=50, blank=True)  
    file_size = models.PositiveIntegerField(blank=True, null=True)
    category = models.ForeignKey(
        Category, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        default=Category.get_default_category
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    is_starred = models.BooleanField(default=False, blank=True, null=True)  
    is_archived = models.BooleanField(default=False, blank=True, null=True) 
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_files', null=True, blank=True)
    is_public = models.BooleanField(default=False)
    meta_tags = models.ManyToManyField(Tag, blank=True, related_name="files")


    def rollback_to_version(self, version: 'FileVersion'):
        self.file = version.file
        self.file_size = version.file.size
        self.file_type = version.file.name.split('.')[-1].lower()
        self.save()


    def save(self, *args, **kwargs):
        """ Extract file type and size before saving. """
        if self.file:
            self.file_size = self.file.size  # Store file size in bytes
            self.file_type = self.file.name.split(".")[-1].lower()  # Extract file extension

        # Assign default category if not provided
        if not self.category_id:  
            self.category_id = Category.get_default_category()

        super().save(*args, **kwargs)

    def is_accessible_by(self, user):
        return self.owner == user or user in self.shared_with.all()

    def __str__(self):
        return self.name if self.name else "Unnamed File"

    
class FileSharing(models.Model):
    FILE = 'FILE'
    FOLDER = 'FOLDER'

    SHARE_TYPE_CHOICES = [
        (FILE, 'File'),
        (FOLDER, 'Folder'),
    ]

    file = models.ForeignKey('UploadedFile', on_delete=models.CASCADE, null=True, blank=True)
    folder = models.ForeignKey('Folder', on_delete=models.CASCADE, null=True, blank=True)

    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_by_user')
    shared_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_to_user')

    message = models.TextField(blank=True, null=True)
    shared_at = models.DateTimeField(default=timezone.now)
    share_type = models.CharField(max_length=10, choices=SHARE_TYPE_CHOICES)
    is_seen = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['file', 'shared_to'], name='unique_file_share'),
            models.UniqueConstraint(fields=['folder', 'shared_to'], name='unique_folder_share'),
        ]

    def __str__(self):
        return f"{self.shared_by} shared {self.share_type.lower()} to {self.shared_to}"


class FileVersion(models.Model):
    uploaded_file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to='uploads/versions/')
    uploaded_at = models.DateTimeField(default=timezone.now)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    change_note = models.TextField(blank=True)
    is_current = models.BooleanField(default=False)

    file_size = models.PositiveIntegerField(blank=True, null=True)
    file_type = models.CharField(max_length=50, blank=True)
    file_name = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-version_number']

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
            self.file_type = self.file.name.split('.')[-1].lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Version {self.version_number} of {self.uploaded_file.name}"


class Reminder(models.Model):
    REPEAT_CHOICES = [
        ('none', 'Does not repeat'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
        # Add more if needed
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE, related_name='reminders')
    note = models.TextField(blank=True)
    remind_at = models.DateTimeField()
    repeat = models.CharField(max_length=20, choices=REPEAT_CHOICES, default='none')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_recurring(self):
        return self.repeat != 'none'
