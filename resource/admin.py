from django.contrib import admin
from .models import UploadedFile, Category, Folder


admin.site.register(Category)


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ('name', 'file', 'category', 'uploaded_at')  # Include 'category' in the list display
    list_filter = ('category',)  # Add filter for categories in the admin page

class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'created_at')  

admin.site.register(Folder, FolderAdmin)