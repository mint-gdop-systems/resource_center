from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, UploadedFile, Folder, FileSharing, Tag, FileVersion, Reminder, Group, GroupMembership, GroupSharing, UserProfile

User = get_user_model()

class FolderSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    subfolders = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    owner_first_name = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'created_at', 'subfolders', 'files', 'is_starred', 'owner_email', 'owner_first_name']

    def get_subfolders(self, obj):
        return FolderSerializer(obj.subfolders.all(), many=True).data

    def get_files(self, obj):
        return UploadedFileSerializer(obj.files.all(), many=True).data

    def get_owner_email(self, obj):
        if obj.owner:
            return obj.owner.email
        return None    

    def get_owner_first_name(self, obj):
        if obj.owner:
            return obj.owner.first_name
        return None      

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]  # Include 'id' for API use


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class UploadedFileSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)  # Nested representation
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True
    )  # Accept category ID in requests
    
    owner_email = serializers.SerializerMethodField()
    owner_first_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    meta_tags = TagSerializer(many=True, read_only=True)
    meta_tag_names = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = UploadedFile
        fields = ["id", "name", "file", "file_type", "file_size", "category", "category_id", "uploaded_at", 'folder', 'is_starred', 'is_archived', 'is_public', 'owner_email',  'owner_first_name', 'meta_tags', 'meta_tag_names', 'is_owner']

    def get_owner_email(self, obj):
        if obj.owner:
            return obj.owner.email
        return None

    def get_owner_first_name(self, obj):
        if obj.owner:
            return obj.owner.first_name
        return None 

    def get_is_owner(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.owner == request.user     

    def create(self, validated_data):
        tag_names = validated_data.pop('meta_tag_names', [])
        instance = super().create(validated_data)
        self._handle_tags(instance, tag_names)
        return instance

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('meta_tag_names', [])
        instance = super().update(instance, validated_data)
        self._handle_tags(instance, tag_names)
        return instance

    def _handle_tags(self, instance, tag_names):
        instance.meta_tags.clear()
        for name in tag_names:
            tag, _ = Tag.objects.get_or_create(name=name.strip())
            instance.meta_tags.add(tag)


class FileSharingSerializer(serializers.ModelSerializer):
    shared_by_email = serializers.ReadOnlyField(source='shared_by.email')
    shared_by_name = serializers.SerializerMethodField()
    shared_to_email = serializers.ReadOnlyField(source='shared_to.email')
    shared_to_name = serializers.SerializerMethodField()
    file = UploadedFileSerializer(read_only=True)
    folder = FolderSerializer(read_only=True)
    shared_at = serializers.DateTimeField(read_only=True)
    item_name = serializers.SerializerMethodField()
    item_type = serializers.SerializerMethodField()

    class Meta:
        model = FileSharing
        fields = [
            'id', 'file', 'folder', 'shared_to', 'shared_to_email', 'shared_to_name',
            'shared_by', 'shared_by_email', 'shared_by_name', 'shared_at', 
            'message', 'share_type', 'is_seen', 'item_name', 'item_type', 'permission_level'
        ]
        read_only_fields = ['shared_by', 'shared_at']

    def get_shared_by_name(self, obj):
        if obj.shared_by:
            return f"{obj.shared_by.first_name} {obj.shared_by.last_name}".strip() or obj.shared_by.email
        return "Unknown"

    def get_shared_to_name(self, obj):
        if obj.shared_to:
            return f"{obj.shared_to.first_name} {obj.shared_to.last_name}".strip() or obj.shared_to.email
        return "Unknown"

    def get_item_name(self, obj):
        if obj.share_type == FileSharing.FILE and obj.file:
            return obj.file.name
        elif obj.share_type == FileSharing.FOLDER and obj.folder:
            return obj.folder.name
        return "Unknown"

    def get_item_type(self, obj):
        if obj.share_type == FileSharing.FILE and obj.file:
            return obj.file.file_type
        elif obj.share_type == FileSharing.FOLDER:
            return "folder"
        return "unknown"

    def validate(self, data):
        if not data.get('file') and not data.get('folder'):
            raise serializers.ValidationError("Either a file or a folder must be provided.")
        if data.get('file') and data.get('folder'):
            raise serializers.ValidationError("Cannot share both file and folder at the same time.")
        return data
    

class EmailShareSerializer(serializers.Serializer):
    recipients = serializers.ListField(
        child=serializers.EmailField(),
        allow_empty=False
    )
    message = serializers.CharField(required=False, allow_blank=True)
    file_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )


class FileVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    uploaded_file_url = serializers.SerializerMethodField()

    class Meta:
        model = FileVersion
        fields = [
            'id',
            'version_number',
            'uploaded_by_name',
            'uploaded_at',
            'change_note',
            'uploaded_file_url',
        ]

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else "Unknown"

    def get_uploaded_file_url(self, obj):
        return obj.file.url if obj.file else ""
  

class ReminderSerializer(serializers.ModelSerializer):
    repeat_display = serializers.CharField(source='get_repeat_display', read_only=True)

    class Meta:
        model = Reminder
        fields = ['id', 'file', 'note', 'remind_at', 'repeat', 'repeat_display']    


# Group Management Serializers

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for group contexts"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class GroupSerializer(serializers.ModelSerializer):
    """Serializer for Group model with member information and permissions"""
    created_by = UserBasicSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    user_permissions = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'created_by', 'created_at', 'updated_at',
            'is_active', 'member_count', 'admin_count', 'user_role', 'user_permissions', 'members'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.get_member_count()
    
    def get_admin_count(self, obj):
        return obj.get_admins().count()
    
    def get_user_role(self, obj):
        """Get current user's role in this group using centralized permission system"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        from .permissions_config import permission_manager
        role = permission_manager.get_user_role(request.user, obj)
        
        # Map internal roles to frontend-friendly names
        role_mapping = {
            'system_admin': 'system_admin',
            'group_admin': 'admin', 
            'group_member': 'member'
        }
        
        return role_mapping.get(role)
    
    def get_user_permissions(self, obj):
        """Get user's permissions for this group"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return {}
        
        from .permissions_config import permission_manager
        user = request.user
        
        return {
            'can_manage_group': permission_manager.can_manage_group(user, obj),
            'can_add_members': permission_manager.can_add_members(user, obj),
            'can_remove_members': permission_manager.can_remove_members(user, obj),
            'can_view_members': permission_manager.has_permission(user, 'group_member.view_own', obj) or 
                               permission_manager.has_permission(user, 'group_member.view_all'),
            'can_share_with_group': permission_manager.has_permission(user, 'resource.share_own_with_member_groups', obj) or
                                   permission_manager.has_permission(user, 'resource.share_any_with_any_group')
        }
    
    def get_members(self, obj):
        """Get group members (only for users with appropriate permissions)"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        
        from .permissions_config import permission_manager
        user = request.user
        
        # Check if user can view members
        can_view = (permission_manager.has_permission(user, 'group_member.view_own', obj) or 
                   permission_manager.has_permission(user, 'group_member.view_all') or
                   permission_manager.has_permission(user, 'group_member.view_member', obj))
        
        if can_view:
            memberships = GroupMembership.objects.filter(
                group=obj, 
                is_active=True
            ).select_related('user').order_by('role', 'user__first_name')
            
            return GroupMembershipSerializer(
                memberships, 
                many=True, 
                context=self.context
            ).data
        
        return []


class GroupCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new groups"""
    
    class Meta:
        model = Group
        fields = ['name', 'description']
    
    def validate_name(self, value):
        """Ensure group name is unique"""
        if Group.objects.filter(name=value, is_active=True).exists():
            raise serializers.ValidationError("A group with this name already exists.")
        return value


class GroupUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing groups"""
    
    class Meta:
        model = Group
        fields = ['name', 'description', 'is_active']
    
    def validate_name(self, value):
        """Ensure group name is unique (excluding current group)"""
        instance = self.instance
        if Group.objects.filter(name=value, is_active=True).exclude(id=instance.id).exists():
            raise serializers.ValidationError("A group with this name already exists.")
        return value


class GroupMembershipSerializer(serializers.ModelSerializer):
    """Serializer for GroupMembership model with permission context"""
    user = UserBasicSerializer(read_only=True)
    added_by = UserBasicSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    can_be_removed = serializers.SerializerMethodField()
    can_be_promoted = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupMembership
        fields = [
            'id', 'user', 'role', 'role_display', 'added_by', 'added_at', 
            'is_active', 'can_be_removed', 'can_be_promoted'
        ]
        read_only_fields = ['added_at']
    
    def get_can_be_removed(self, obj):
        """Check if current user can remove this member"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        from .permissions_config import permission_manager
        return permission_manager.can_remove_members(request.user, obj.group, obj.user)
    
    def get_can_be_promoted(self, obj):
        """Check if current user can promote this member to admin"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        from .permissions_config import permission_manager
        user = request.user
        
        # Only system admins can promote to admin
        return (permission_manager.get_user_role(user) == 'system_admin' and 
                obj.role == GroupMembership.MEMBER)


class GroupMemberAddSerializer(serializers.Serializer):
    """Serializer for adding members to groups"""
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(
        choices=GroupMembership.ROLE_CHOICES,
        default=GroupMembership.MEMBER
    )
    message = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Optional welcome message for the new member"
    )
    
    def validate_user_id(self, value):
        """Validate that user exists"""
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return value


class GroupSharingSerializer(serializers.ModelSerializer):
    """Serializer for GroupSharing model"""
    group = GroupSerializer(read_only=True)
    shared_by = UserBasicSerializer(read_only=True)
    file = UploadedFileSerializer(read_only=True)
    folder = FolderSerializer(read_only=True)
    item_name = serializers.SerializerMethodField()
    item_type = serializers.SerializerMethodField()
    share_type_display = serializers.CharField(source='get_share_type_display', read_only=True)
    
    class Meta:
        model = GroupSharing
        fields = [
            'id', 'file', 'folder', 'group', 'shared_by', 'message', 
            'shared_at', 'share_type', 'share_type_display', 'can_download', 
            'can_reshare', 'item_name', 'item_type'
        ]
        read_only_fields = ['shared_at']
    
    def get_item_name(self, obj):
        return obj.get_item_name()
    
    def get_item_type(self, obj):
        return obj.get_item_type()


class GroupShareCreateSerializer(serializers.Serializer):
    """Serializer for creating group shares"""
    file_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    folder_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
    message = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    can_download = serializers.BooleanField(default=True)
    can_reshare = serializers.BooleanField(default=False)
    
    def validate(self, data):
        """Validate that at least one file or folder is provided"""
        file_ids = data.get('file_ids', [])
        folder_ids = data.get('folder_ids', [])
        
        if not file_ids and not folder_ids:
            raise serializers.ValidationError(
                "At least one file or folder must be selected for sharing."
            )
        
        return data


# Enhanced existing serializers for group context

class EnhancedFileSharingSerializer(FileSharingSerializer):
    """Enhanced file sharing serializer with group context"""
    is_group_share = serializers.SerializerMethodField()
    
    class Meta(FileSharingSerializer.Meta):
        fields = FileSharingSerializer.Meta.fields + ['is_group_share']
    
    def get_is_group_share(self, obj):
        return False  # This is for individual shares


class CombinedSharingSerializer(serializers.Serializer):
    """Serializer that combines individual and group shares"""
    individual_shares = EnhancedFileSharingSerializer(many=True, read_only=True)
    group_shares = GroupSharingSerializer(many=True, read_only=True)
    total_individual = serializers.IntegerField(read_only=True)
    total_group = serializers.IntegerField(read_only=True)
    total_all = serializers.IntegerField(read_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile with storage quota information"""
    user = UserBasicSerializer(read_only=True)
    storage_usage_percentage = serializers.SerializerMethodField()
    remaining_storage = serializers.SerializerMethodField()
    storage_quota_mb = serializers.SerializerMethodField()
    storage_used_mb = serializers.SerializerMethodField()
    remaining_storage_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'storage_quota', 'storage_used', 'storage_usage_percentage',
            'remaining_storage', 'storage_quota_mb', 'storage_used_mb', 
            'remaining_storage_mb', 'last_shared_visit'
        ]
        read_only_fields = ['storage_used', 'last_shared_visit']
    
    def get_storage_usage_percentage(self, obj):
        return round(obj.get_storage_usage_percentage(), 2)
    
    def get_remaining_storage(self, obj):
        return obj.get_remaining_storage()
    
    def get_storage_quota_mb(self, obj):
        return round(obj.storage_quota / (1024 * 1024), 2)
    
    def get_storage_used_mb(self, obj):
        return round(obj.storage_used / (1024 * 1024), 2)
    
    def get_remaining_storage_mb(self, obj):
        return round(obj.get_remaining_storage() / (1024 * 1024), 2)


class StorageQuotaSerializer(serializers.Serializer):
    """Serializer for storage quota information"""
    storage_quota = serializers.IntegerField(help_text="Storage quota in bytes")
    storage_used = serializers.IntegerField(read_only=True, help_text="Storage used in bytes")
    storage_usage_percentage = serializers.FloatField(read_only=True, help_text="Usage percentage")
    remaining_storage = serializers.IntegerField(read_only=True, help_text="Remaining storage in bytes")
    
    # Human-readable formats
    storage_quota_mb = serializers.FloatField(read_only=True, help_text="Storage quota in MB")
    storage_used_mb = serializers.FloatField(read_only=True, help_text="Storage used in MB")
    remaining_storage_mb = serializers.FloatField(read_only=True, help_text="Remaining storage in MB")
    
    # Status indicators
    is_near_limit = serializers.BooleanField(read_only=True, help_text="True if usage > 80%")
    is_over_limit = serializers.BooleanField(read_only=True, help_text="True if usage >= 100%")
    
    def to_representation(self, instance):
        """Convert UserProfile instance to storage quota representation"""
        if hasattr(instance, 'storage_quota'):
            # Instance is a UserProfile
            profile = instance
        else:
            # Instance is a User, get their profile
            profile = UserProfile.get_or_create_profile(instance)
        
        usage_percentage = profile.get_storage_usage_percentage()
        
        return {
            'storage_quota': profile.storage_quota,
            'storage_used': profile.storage_used,
            'storage_usage_percentage': round(usage_percentage, 2),
            'remaining_storage': profile.get_remaining_storage(),
            'storage_quota_mb': round(profile.storage_quota / (1024 * 1024), 2),
            'storage_used_mb': round(profile.storage_used / (1024 * 1024), 2),
            'remaining_storage_mb': round(profile.get_remaining_storage() / (1024 * 1024), 2),
            'is_near_limit': usage_percentage >= 80,
            'is_over_limit': usage_percentage >= 100,
        }