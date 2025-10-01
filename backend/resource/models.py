from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class UserProfile(models.Model):
    """
    Extends the built-in User model with additional fields
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    last_shared_visit = models.DateTimeField(null=True, blank=True, help_text="Last time user visited 'Shared with me' page")
    
    # Storage quota fields
    storage_quota = models.BigIntegerField(
        default=1073741824,  # 1GB in bytes (1024 * 1024 * 1024)
        help_text="Storage quota in bytes"
    )
    storage_used = models.BigIntegerField(
        default=0,
        help_text="Storage currently used in bytes"
    )
    
    def __str__(self):
        return f"{self.user.username}'s profile"
    
    def get_storage_usage_percentage(self):
        """Calculate storage usage as percentage"""
        if self.storage_quota == 0:
            return 0
        return min((self.storage_used / self.storage_quota) * 100, 100)
    
    def get_remaining_storage(self):
        """Get remaining storage in bytes"""
        return max(self.storage_quota - self.storage_used, 0)
    
    def can_upload_file(self, file_size):
        """Check if user can upload a file of given size"""
        return self.get_remaining_storage() >= file_size
    
    def update_storage_used(self):
        """Recalculate and update storage used based on owned files"""
        from django.db.models import Sum
        total_size = UploadedFile.objects.filter(
            owner=self.user
        ).aggregate(
            total=Sum('file_size')
        )['total'] or 0
        
        self.storage_used = total_size
        self.save(update_fields=['storage_used'])
        return self.storage_used
    
    @classmethod
    def get_or_create_profile(cls, user):
        """Get or create user profile"""
        profile, created = cls.objects.get_or_create(user=user)
        return profile


class Group(models.Model):
    """
    Represents a group of users for sharing resources
    Only System Admins (superusers) can create groups
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_groups',
        help_text="System Admin who created this group"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Many-to-many relationship with users through GroupMembership
    members = models.ManyToManyField(
        User, 
        through='GroupMembership', 
        through_fields=('group', 'user'),
        related_name='user_groups',
        blank=True
    )
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.name
    
    def get_admins(self):
        """Get all group admins"""
        return User.objects.filter(
            group_memberships__group=self,
            group_memberships__role=GroupMembership.ADMIN
        )
    
    def get_members(self):
        """Get all group members (including admins)"""
        return self.members.filter(group_memberships__is_active=True)
    
    def get_member_count(self):
        """Get total number of active members"""
        return self.members.filter(group_memberships__is_active=True).count()
    
    def is_user_admin(self, user):
        """Check if user is an admin of this group"""
        return GroupMembership.objects.filter(
            group=self,
            user=user,
            role=GroupMembership.ADMIN,
            is_active=True
        ).exists()
    
    def is_user_member(self, user):
        """Check if user is a member (any role) of this group"""
        return GroupMembership.objects.filter(
            group=self,
            user=user,
            is_active=True
        ).exists()


class GroupMembership(models.Model):
    """
    Represents membership of a user in a group with role-based access
    """
    MEMBER = 'MEMBER'
    ADMIN = 'ADMIN'
    
    ROLE_CHOICES = [
        (MEMBER, 'Member'),
        (ADMIN, 'Group Admin'),
    ]
    
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=MEMBER)
    
    # Membership metadata
    added_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='added_memberships',
        help_text="User who added this member to the group"
    )
    added_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['group', 'user']
        indexes = [
            models.Index(fields=['group', 'user']),
            models.Index(fields=['user', 'role']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.group.name} ({self.get_role_display()})"
    
    def can_manage_members(self):
        """Check if this membership allows managing other members"""
        return self.role == self.ADMIN and self.is_active

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
    
    def is_accessible_by(self, user):
        """Check if user can access this folder through ownership, individual sharing, or group sharing"""
        # Owner access
        if self.owner == user:
            return True
        
        # Public access
        if self.is_public:
            return True
        
        # Individual sharing access
        if FileSharing.objects.filter(folder=self, shared_to=user).exists():
            return True
        
        # Group sharing access
        user_groups = GroupMembership.objects.filter(
            user=user, 
            is_active=True
        ).values_list('group_id', flat=True)
        
        if user_groups and GroupSharing.objects.filter(
            folder=self,
            group_id__in=user_groups
        ).exists():
            return True
        
        # Parent folder inheritance
        if self.parent and self.parent.is_accessible_by(user):
            return True
        
        return False
    
    def get_shared_groups(self):
        """Get all groups this folder is shared with"""
        return Group.objects.filter(shared_items__folder=self)
    
    def is_shared_with_group(self, group):
        """Check if this folder is shared with a specific group"""
        return GroupSharing.objects.filter(folder=self, group=group).exists()
    
    def delete(self, *args, **kwargs):
        """Override delete to ensure storage usage is updated when folder and its contents are deleted"""
        owner = self.owner
        
        # The CASCADE relationship will automatically delete files, and each file's delete() method
        # will update storage usage, so we don't need to manually calculate here
        super().delete(*args, **kwargs)
        
        # Optionally recalculate storage to ensure accuracy after folder deletion
        if owner:
            profile = UserProfile.get_or_create_profile(owner)
            profile.update_storage_used()


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
        old_size = 0
        if self.pk:  # If updating existing file
            try:
                old_file = UploadedFile.objects.get(pk=self.pk)
                old_size = old_file.file_size or 0
            except UploadedFile.DoesNotExist:
                pass
        
        if self.file:
            self.file_size = self.file.size  # Store file size in bytes
            self.file_type = self.file.name.split(".")[-1].lower()  # Extract file extension

        # Assign default category if not provided
        if not self.category_id:  
            self.category_id = Category.get_default_category()

        super().save(*args, **kwargs)
        
        # Update user's storage usage
        if self.owner:
            profile = UserProfile.get_or_create_profile(self.owner)
            size_difference = (self.file_size or 0) - old_size
            profile.storage_used = max(profile.storage_used + size_difference, 0)
            profile.save(update_fields=['storage_used'])
    
    def delete(self, *args, **kwargs):
        """Override delete to update storage usage"""
        owner = self.owner
        file_size = self.file_size or 0
        
        # Log the deletion for debugging
        print(f"DEBUG: Deleting file '{self.name}' (size: {file_size} bytes) for user {owner}")
        
        super().delete(*args, **kwargs)
        
        # Update user's storage usage
        if owner:
            profile = UserProfile.get_or_create_profile(owner)
            old_usage = profile.storage_used
            profile.storage_used = max(profile.storage_used - file_size, 0)
            profile.save(update_fields=['storage_used'])
            
            print(f"DEBUG: Updated storage for user {owner}: {old_usage} -> {profile.storage_used} (reduced by {file_size})")

    def is_accessible_by(self, user):
        """Check if user can access this file through ownership, individual sharing, or group sharing"""
        # Owner access
        if self.owner == user:
            return True
        
        # Public access
        if self.is_public:
            return True
        
        # Individual sharing access
        if FileSharing.objects.filter(file=self, shared_to=user).exists():
            return True
        
        # Group sharing access
        user_groups = GroupMembership.objects.filter(
            user=user, 
            is_active=True
        ).values_list('group_id', flat=True)
        
        if user_groups and GroupSharing.objects.filter(
            file=self,
            group_id__in=user_groups
        ).exists():
            return True
        
        # Parent folder inheritance
        if self.folder and self.folder.is_accessible_by(user):
            return True
        
        return False
    
    def get_shared_groups(self):
        """Get all groups this file is shared with"""
        return Group.objects.filter(shared_items__file=self)
    
    def is_shared_with_group(self, group):
        """Check if this file is shared with a specific group"""
        return GroupSharing.objects.filter(file=self, group=group).exists()

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


class GroupSharing(models.Model):
    """
    Represents sharing of files/folders with groups
    Extends the individual sharing model to support group-based sharing
    """
    FILE = 'FILE'
    FOLDER = 'FOLDER'

    SHARE_TYPE_CHOICES = [
        (FILE, 'File'),
        (FOLDER, 'Folder'),
    ]

    # Either file OR folder (not both)
    file = models.ForeignKey('UploadedFile', on_delete=models.CASCADE, null=True, blank=True)
    folder = models.ForeignKey('Folder', on_delete=models.CASCADE, null=True, blank=True)
    
    # Group and sharing metadata
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='shared_items')
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_shares_created')
    
    message = models.TextField(blank=True, null=True)
    shared_at = models.DateTimeField(default=timezone.now)
    share_type = models.CharField(max_length=10, choices=SHARE_TYPE_CHOICES)
    
    # Permissions (future extensibility)
    can_download = models.BooleanField(default=True)
    can_reshare = models.BooleanField(default=False)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['file', 'group'], name='unique_group_file_share'),
            models.UniqueConstraint(fields=['folder', 'group'], name='unique_group_folder_share'),
            models.CheckConstraint(
                check=models.Q(file__isnull=False) | models.Q(folder__isnull=False),
                name='groupsharing_has_file_or_folder'
            )
        ]
        indexes = [
            models.Index(fields=['group', 'shared_at']),
            models.Index(fields=['shared_by', 'shared_at']),
        ]
    
    def __str__(self):
        item_name = self.file.name if self.file else self.folder.name
        return f"{self.shared_by.username} shared {self.share_type.lower()} '{item_name}' with group '{self.group.name}'"
    
    def get_item_name(self):
        """Get the name of the shared item"""
        return self.file.name if self.file else self.folder.name
    
    def get_item_type(self):
        """Get the type of shared item"""
        return "file" if self.file else "folder"
    
    def is_accessible_by_user(self, user):
        """Check if user can access this shared item through group membership"""
        return self.group.is_user_member(user)


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


class ShareLink(models.Model):
    """
    Public share links for files and folders - works without authentication
    """
    share_id = models.CharField(max_length=32, unique=True, db_index=True)
    
    # Either file OR folder (not both)
    file = models.ForeignKey('UploadedFile', on_delete=models.CASCADE, null=True, blank=True)
    folder = models.ForeignKey('Folder', on_delete=models.CASCADE, null=True, blank=True)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_share_links')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # Optional expiration
    
    # Usage tracking
    download_count = models.PositiveIntegerField(default=0)
    max_downloads = models.PositiveIntegerField(default=100)  # Limit downloads
    is_active = models.BooleanField(default=True)
    
    # Optional password protection
    password = models.CharField(max_length=128, blank=True, null=True)
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(file__isnull=False) | models.Q(folder__isnull=False),
                name='sharelink_has_file_or_folder'
            )
        ]
        indexes = [
            models.Index(fields=['share_id']),
            models.Index(fields=['created_by', 'created_at']),
        ]
    
    def __str__(self):
        item_type = "File" if self.file else "Folder"
        item_name = self.file.name if self.file else self.folder.name
        return f"Share Link: {item_type} '{item_name}'"
    
    def is_valid(self):
        """Check if share link is still valid"""
        from django.utils import timezone
        
        if not self.is_active:
            return False, "Link has been deactivated"
            
        if self.expires_at and timezone.now() > self.expires_at:
            return False, "Link has expired"
            
        if self.download_count >= self.max_downloads:
            return False, "Download limit reached"
            
        return True, "Valid"
    
    def get_item_name(self):
        """Get the name of the shared item"""
        return self.file.name if self.file else self.folder.name
    
    def get_item_type(self):
        """Get the type of shared item"""
        return "file" if self.file else "folder"
    
    @classmethod
    def generate_share_id(cls):
        """Generate a unique random share ID"""
        import secrets
        import string
        
        while True:
            # Generate 32-character random string (letters + numbers)
            share_id = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
            
            # Ensure it's unique
            if not cls.objects.filter(share_id=share_id).exists():
                return share_id
