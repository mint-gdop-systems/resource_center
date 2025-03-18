from django.db import models
from django.contrib.auth.models import User

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


class Folder(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    created_at = models.DateTimeField(auto_now_add=True)
    is_starred = models.BooleanField(default=False, blank=True, null=True) 


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

    
    def save(self, *args, **kwargs):
        """ Extract file type and size before saving. """
        if self.file:
            self.file_size = self.file.size  # Store file size in bytes
            self.file_type = self.file.name.split(".")[-1].lower()  # Extract file extension

        # Assign default category if not provided
        if not self.category_id:  
            self.category_id = Category.get_default_category()

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name if self.name else "Unnamed File"
