from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, UploadedFile, Folder, FileSharing, Tag, FileVersion, Reminder

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
            'message', 'share_type', 'is_seen', 'item_name', 'item_type'
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