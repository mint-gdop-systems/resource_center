from rest_framework import serializers
from .models import Category, UploadedFile, Folder


class FolderSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    subfolders = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'created_at', 'subfolders', 'files', 'is_starred']

    def get_subfolders(self, obj):
        return FolderSerializer(obj.subfolders.all(), many=True).data

    def get_files(self, obj):
        return UploadedFileSerializer(obj.files.all(), many=True).data


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]  # Include 'id' for API use


class UploadedFileSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)  # Nested representation
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True
    )  # Accept category ID in requests

    class Meta:
        model = UploadedFile
        fields = ["id", "name", "file", "file_type", "file_size", "category", "category_id", "uploaded_at", 'folder', 'is_starred', 'is_archived']
