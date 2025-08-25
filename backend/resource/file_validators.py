import os
import re
import uuid
from django.core.exceptions import ValidationError
from django.conf import settings
from typing import List, Optional


class FileValidator:
    # Allowed file extensions
    ALLOWED_EXTENSIONS = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 
        'tiff', 'zip', 'rar', '7z'
    ]
    
    # Maximum file size (100MB in bytes)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    

    
    @classmethod
    def validate_file_extension(cls, filename: str) -> str:
        """
        Validate file extension against allowed types
        
        Args:
            filename: The original filename
            
        Returns:
            str: The validated extension
            
        Raises:
            ValidationError: If extension is not allowed
        """
        if not filename:
            raise ValidationError("Filename cannot be empty")
            
        # Extract extension
        extension = filename.lower().split('.')[-1] if '.' in filename else ''
        
        if not extension:
            raise ValidationError("File must have an extension")
            
        if extension not in cls.ALLOWED_EXTENSIONS:
            allowed_extensions_str = ', '.join(cls.ALLOWED_EXTENSIONS)
            raise ValidationError(
                f"File type '{extension}' is not allowed. "
                f"Allowed types: {allowed_extensions_str}"
            )
            
        return extension
    
    @classmethod
    def validate_file_size(cls, file_size: int) -> None:
        """
        Validate file size against maximum limit
        
        Args:
            file_size: Size of the file in bytes
            
        Raises:
            ValidationError: If file size exceeds limit
        """
        if file_size > cls.MAX_FILE_SIZE:
            max_size_mb = cls.MAX_FILE_SIZE / (1024 * 1024)
            current_size_mb = file_size / (1024 * 1024)
            raise ValidationError(
                f"File size ({current_size_mb:.1f}MB) exceeds maximum allowed size ({max_size_mb:.0f}MB)"
            )
    

    @classmethod
    def sanitize_filename_for_display(cls, filename: str) -> str:
        """
        Sanitize filename for display purposes (no UUID, keep original name clean)
        
        Args:
            filename: Original filename
            
        Returns:
            str: Clean sanitized filename for display
        """
        if not filename:
            return "untitled.txt"
        
        # Split filename and extension
        name_parts = filename.rsplit('.', 1)
        name = name_parts[0]
        extension = name_parts[1] if len(name_parts) > 1 else ''
        
        # Remove only the most dangerous characters, keep spaces and most punctuation
        # Only remove: / \ : * ? " < > |
        safe_name = re.sub(r'[/\\:*?"<>|]', '_', name)
        
        # Remove multiple consecutive underscores
        safe_name = re.sub(r'_+', '_', safe_name)
        
        # Remove leading/trailing underscores and dots
        safe_name = safe_name.strip('_.')
        
        # Ensure name is not empty
        if not safe_name:
            safe_name = 'untitled'
        
        # Limit name length
        max_name_length = 200
        if len(safe_name) > max_name_length:
            safe_name = safe_name[:max_name_length]
        
        # Reconstruct filename with extension
        if extension:
            return f"{safe_name}.{extension.lower()}"
        else:
            return safe_name
    
    @classmethod
    def generate_storage_filename(cls, filename: str) -> str:
        """
        Generate unique filename for storage (with UUID to prevent conflicts)
        
        Args:
            filename: Original filename
            
        Returns:
            str: Unique filename for storage
        """
        if not filename:
            return f"{uuid.uuid4().hex}.txt"
        
        # Split filename and extension
        name_parts = filename.rsplit('.', 1)
        name = name_parts[0]
        extension = name_parts[1] if len(name_parts) > 1 else ''
        
        # Remove unsafe characters for filesystem
        safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', name)
        
        # Remove multiple consecutive underscores
        safe_name = re.sub(r'_+', '_', safe_name)
        
        # Remove leading/trailing underscores and dots
        safe_name = safe_name.strip('_.')
        
        # Ensure name is not empty
        if not safe_name:
            safe_name = 'file'
        
        # Limit name length (keeping room for UUID and extension)
        max_name_length = 60  # Leave room for UUID
        if len(safe_name) > max_name_length:
            safe_name = safe_name[:max_name_length]
        
        # Add UUID prefix for uniqueness
        unique_id = uuid.uuid4().hex[:8]  # Use first 8 chars of UUID
        safe_name = f"{unique_id}_{safe_name}"
        
        # Reconstruct filename with extension
        if extension:
            return f"{safe_name}.{extension.lower()}"
        else:
            return safe_name
    
    @classmethod
    def validate_file(cls, file_obj) -> dict:
        """
        Comprehensive file validation
        
        Args:
            file_obj: Django uploaded file object
            
        Returns:
            dict: Validation results with filenames and metadata
            
        Raises:
            ValidationError: If any validation fails
        """
        # Validate file size
        cls.validate_file_size(file_obj.size)
        
        # Validate and get extension
        extension = cls.validate_file_extension(file_obj.name)
        
        # Generate clean display name and unique storage name
        display_filename = cls.sanitize_filename_for_display(file_obj.name)
        storage_filename = cls.generate_storage_filename(file_obj.name)
        
        return {
            'original_filename': file_obj.name,
            'display_filename': display_filename,  # Clean name for UI display
            'storage_filename': storage_filename,  # Unique name for file storage
            'extension': extension,
            'file_size': file_obj.size,
            'file_size_mb': round(file_obj.size / (1024 * 1024), 2),
        }


def validate_uploaded_file(file_obj) -> dict:
    """
    Convenience function for file validation
    
    Args:
        file_obj: Django uploaded file object
        
    Returns:
        dict: Validation results
        
    Raises:
        ValidationError: If validation fails
    """
    return FileValidator.validate_file(file_obj)