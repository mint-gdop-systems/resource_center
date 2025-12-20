import os
import re
import uuid
import mimetypes
import magic
from django.core.exceptions import ValidationError
from django.conf import settings
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class FileValidator:
    # Allowed file extensions - expanded to support more common types
    ALLOWED_EXTENSIONS = [
        # Documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
        'odt', 'ods', 'odp',  # OpenDocument formats
        
        # Images
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg',
        'ico', 'psd',  # Additional image formats
        
        # Audio files
        'mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma',
        
        # Video files
        'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v',
        
        # Data files
        'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'sql',
        
        # Archives
        'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
        
        # Additional common formats
        'md', 'markdown', 'html', 'htm', 'css', 'js', 'ts',
    ]
    
    # Web files that require special security handling (force download, never render)
    WEB_FILES_SECURE = [
        'html', 'htm', 'js', 'css', 'ts'
    ]
    
    # Dangerous executable file extensions to explicitly block
    BLOCKED_EXTENSIONS = [
        'exe', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'vbe', 'jse',
        'wsf', 'wsh', 'msi', 'msp', 'hta', 'cpl', 'jar', 'app', 'deb', 'rpm',
        'dmg', 'pkg', 'run', 'bin', 'sh', 'bash', 'ps1', 'psm1', 'psd1',
    ]
    
    # Maximum file size - dynamically retrieved from admin settings
    # No hardcoded default - always use SystemConfiguration
    
    # MIME type mappings for content validation
    EXPECTED_MIME_TYPES = {
        # Documents
        'pdf': ['application/pdf'],
        'doc': ['application/msword'],
        'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'xls': ['application/vnd.ms-excel'],
        'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'ppt': ['application/vnd.ms-powerpoint'],
        'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        'txt': ['text/plain'],
        'rtf': ['application/rtf', 'text/rtf'],
        'odt': ['application/vnd.oasis.opendocument.text'],
        'ods': ['application/vnd.oasis.opendocument.spreadsheet'],
        'odp': ['application/vnd.oasis.opendocument.presentation'],
        
        # Images
        'jpg': ['image/jpeg'],
        'jpeg': ['image/jpeg'],
        'png': ['image/png'],
        'gif': ['image/gif'],
        'bmp': ['image/bmp'],
        'tiff': ['image/tiff'],
        'tif': ['image/tiff'],
        'webp': ['image/webp'],
        'svg': ['image/svg+xml'],
        'ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
        
        # Audio
        'mp3': ['audio/mpeg'],
        'wav': ['audio/wav', 'audio/x-wav'],
        'aac': ['audio/aac'],
        'flac': ['audio/flac'],
        'ogg': ['audio/ogg'],
        'm4a': ['audio/mp4'],
        'wma': ['audio/x-ms-wma'],
        
        # Video
        'mp4': ['video/mp4'],
        'mkv': ['video/x-matroska'],
        'avi': ['video/x-msvideo'],
        'mov': ['video/quicktime'],
        'wmv': ['video/x-ms-wmv'],
        'flv': ['video/x-flv'],
        'webm': ['video/webm'],
        'm4v': ['video/x-m4v'],
        
        # Data files
        'csv': ['text/csv'],
        'json': ['application/json'],
        'xml': ['application/xml', 'text/xml'],
        'yaml': ['application/x-yaml', 'text/yaml'],
        'yml': ['application/x-yaml', 'text/yaml'],
        'log': ['text/plain'],
        'sql': ['application/sql', 'text/plain'],
        
        # Archives
        'zip': ['application/zip'],
        'rar': ['application/x-rar-compressed'],
        '7z': ['application/x-7z-compressed'],
        'tar': ['application/x-tar'],
        'gz': ['application/gzip'],
        'bz2': ['application/x-bzip2'],
        'xz': ['application/x-xz'],
        
        # Web files (secure handling required)
        'html': ['text/html'],
        'htm': ['text/html'],
        'css': ['text/css'],
        'js': ['application/javascript', 'text/javascript'],
        'ts': ['application/typescript', 'text/plain'],
        
        # Markdown
        'md': ['text/markdown', 'text/plain'],
        'markdown': ['text/markdown', 'text/plain'],
    }
    

    
    @classmethod
    def validate_mime_type(cls, file_obj, expected_extension: str) -> bool:
        """
        Validate file content using MIME type detection (magic bytes)
        
        Args:
            file_obj: Django uploaded file object
            expected_extension: Expected file extension
            
        Returns:
            bool: True if MIME type matches expected extension
            
        Raises:
            ValidationError: If MIME type validation fails
        """
        try:
            # Get expected MIME types for this extension
            expected_mimes = cls.EXPECTED_MIME_TYPES.get(expected_extension, [])
            if not expected_mimes:
                # If no MIME types defined, skip validation (backward compatibility)
                logger.warning(f"No MIME types defined for extension: {expected_extension}")
                return True
            
            # Read file content for MIME detection
            file_obj.seek(0)  # Reset file pointer
            file_content = file_obj.read(8192)  # Read first 8KB for detection
            file_obj.seek(0)  # Reset file pointer again
            
            # Detect MIME type using python-magic
            try:
                detected_mime = magic.from_buffer(file_content, mime=True)
            except Exception as e:
                logger.warning(f"Magic MIME detection failed: {e}")
                # Fallback to mimetypes module
                detected_mime, _ = mimetypes.guess_type(file_obj.name)
            
            if not detected_mime:
                logger.warning(f"Could not detect MIME type for file: {file_obj.name}")
                return True  # Allow if detection fails (backward compatibility)
            
            # Check if detected MIME type matches expected types
            if detected_mime.lower() in [mime.lower() for mime in expected_mimes]:
                return True
            
            # Special cases for common mismatches
            if cls._is_acceptable_mime_mismatch(detected_mime, expected_extension, expected_mimes):
                return True
            
            # Log security concern for potential file type spoofing
            logger.warning(
                f"MIME type mismatch detected: file '{file_obj.name}' "
                f"has extension '.{expected_extension}' but MIME type '{detected_mime}'. "
                f"Expected: {expected_mimes}"
            )
            
            raise ValidationError(
                f"File content does not match the file extension. "
                f"The file appears to be '{detected_mime}' but has extension '.{expected_extension}'. "
                f"This could indicate a security risk or file corruption."
            )
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error during MIME type validation: {e}")
            # Don't block upload if validation fails due to technical issues
            return True
    
    @classmethod
    def _is_acceptable_mime_mismatch(cls, detected_mime: str, extension: str, expected_mimes: List[str]) -> bool:
        """
        Check if a MIME type mismatch is acceptable (common edge cases)
        
        Args:
            detected_mime: Detected MIME type
            extension: File extension
            expected_mimes: Expected MIME types
            
        Returns:
            bool: True if mismatch is acceptable
        """
        # Common acceptable mismatches
        acceptable_cases = {
            # Text files often detected as plain text
            ('text/plain', 'csv'): True,
            ('text/plain', 'log'): True,
            ('text/plain', 'sql'): True,
            ('text/plain', 'md'): True,
            ('text/plain', 'markdown'): True,
            ('text/plain', 'ts'): True,
            
            # Office documents sometimes have generic MIME types
            ('application/octet-stream', 'docx'): True,
            ('application/octet-stream', 'xlsx'): True,
            ('application/octet-stream', 'pptx'): True,
            
            # Archives
            ('application/octet-stream', 'rar'): True,
            ('application/octet-stream', '7z'): True,
        }
        
        return acceptable_cases.get((detected_mime.lower(), extension.lower()), False)
    
    @classmethod
    def is_web_file_secure(cls, extension: str) -> bool:
        """
        Check if file extension requires secure handling (force download)
        
        Args:
            extension: File extension
            
        Returns:
            bool: True if file requires secure handling
        """
        return extension.lower() in cls.WEB_FILES_SECURE
    
    @classmethod
    def get_allowed_extensions_by_category(cls) -> dict:
        """Get allowed extensions organized by category"""
        return {
            'documents': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'],
            'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'psd'],
            'audio': ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma'],
            'video': ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
            'data_files': ['csv', 'json', 'xml', 'yaml', 'yml', 'log', 'sql'],
            'archives': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
            'web_files': ['html', 'htm', 'css', 'js', 'ts'],
            'markdown': ['md', 'markdown'],
        }
    
    @classmethod
    def get_currently_allowed_extensions(cls) -> List[str]:
        """Get currently allowed extensions based on admin configuration"""
        allowed_categories = cls.get_allowed_categories()
        extensions_by_category = cls.get_allowed_extensions_by_category()
        
        allowed_extensions = []
        for category, enabled in allowed_categories.items():
            if enabled and category in extensions_by_category:
                allowed_extensions.extend(extensions_by_category[category])
        
        return allowed_extensions
    
    @classmethod
    def validate_file_extension(cls, filename: str) -> str:
        """
        Validate file extension against allowed types and block dangerous executables
        
        Args:
            filename: The original filename
            
        Returns:
            str: The validated extension
            
        Raises:
            ValidationError: If extension is not allowed or is blocked
        """
        if not filename:
            raise ValidationError("Filename cannot be empty")
            
        # Extract extension
        extension = filename.lower().split('.')[-1] if '.' in filename else ''
        
        if not extension:
            raise ValidationError("File must have an extension")
        
        # Get security settings
        security_settings = cls.get_security_settings()
        
        # Check if executable files should be blocked
        if security_settings.get('block_executable_files', True):
            if extension in cls.BLOCKED_EXTENSIONS:
                if security_settings.get('log_security_events', True):
                    logger.warning(f"Blocked executable file upload attempt: {filename}")
                raise ValidationError(
                    f"File type '{extension}' is not allowed for security reasons. "
                    f"Executable files are blocked to protect system security."
                )
        
        # Get currently allowed extensions based on admin configuration
        allowed_extensions = cls.get_currently_allowed_extensions()
        
        # Check if extension is allowed
        if extension not in allowed_extensions:
            # Get category information for better error messages
            extensions_by_category = cls.get_allowed_extensions_by_category()
            allowed_categories = cls.get_allowed_categories()
            
            enabled_categories = []
            for category, enabled in allowed_categories.items():
                if enabled and category in extensions_by_category:
                    category_exts = extensions_by_category[category][:4]  # Show first 4 extensions
                    enabled_categories.append(f"{category.replace('_', ' ').title()} ({', '.join(category_exts)}...)")
            
            raise ValidationError(
                f"File type '{extension}' is not supported. "
                f"Currently allowed categories: {', '.join(enabled_categories)}"
            )
            
        return extension
    
    @classmethod
    def get_max_file_size(cls) -> int:
        """Get maximum file size from admin configuration"""
        try:
            from .models import SystemConfiguration
            return SystemConfiguration.get_max_file_size()
        except ImportError:
            # Fallback to 2GB if models not available (should not happen in production)
            return 2 * 1024 * 1024 * 1024
    
    @classmethod
    def get_allowed_categories(cls) -> dict:
        """Get allowed file categories from admin configuration"""
        try:
            from .models import SystemConfiguration
            return SystemConfiguration.get_allowed_file_categories()
        except ImportError:
            # Fallback to all categories allowed
            return {
                'documents': True,
                'images': True,
                'audio': True,
                'video': True,
                'data_files': True,
                'archives': True,
                'web_files': True,
                'markdown': True,
            }
    
    @classmethod
    def get_security_settings(cls) -> dict:
        """Get security settings from admin configuration"""
        try:
            from .models import SystemConfiguration
            return SystemConfiguration.get_security_settings()
        except ImportError:
            # Fallback to secure defaults
            return {
                'enable_mime_validation': True,
                'force_secure_download_web_files': True,
                'block_executable_files': True,
                'log_security_events': True,
            }
    
    @classmethod
    def validate_file_size(cls, file_size: int) -> None:
        """
        Validate file size against maximum limit with better formatting
        
        Args:
            file_size: Size of the file in bytes
            
        Raises:
            ValidationError: If file size exceeds limit
        """
        max_size = cls.get_max_file_size()
        if file_size > max_size:
            # Format sizes appropriately (MB for smaller, GB for larger)
            if max_size >= 1024 * 1024 * 1024:  # >= 1GB
                max_size_gb = max_size / (1024 * 1024 * 1024)
                current_size_gb = file_size / (1024 * 1024 * 1024)
                raise ValidationError(
                    f"File size ({current_size_gb:.2f}GB) exceeds maximum allowed size ({max_size_gb:.0f}GB)"
                )
            else:
                max_size_mb = max_size / (1024 * 1024)
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
        Comprehensive file validation including MIME type checking
        
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
        
        # Validate MIME type against file content (security enhancement)
        security_settings = cls.get_security_settings()
        mime_validated = False
        detected_mime_type = ''
        
        if security_settings.get('enable_mime_validation', True):
            cls.validate_mime_type(file_obj, extension)
            mime_validated = True
            # Get detected MIME type for storage
            try:
                file_obj.seek(0)
                file_content = file_obj.read(8192)
                file_obj.seek(0)
                detected_mime_type = magic.from_buffer(file_content, mime=True) or ''
            except Exception:
                detected_mime_type = ''
        
        # Generate clean display name and unique storage name
        display_filename = cls.sanitize_filename_for_display(file_obj.name)
        storage_filename = cls.generate_storage_filename(file_obj.name)
        
        # Check if file requires secure handling
        requires_secure_download = False
        if security_settings.get('force_secure_download_web_files', True):
            requires_secure_download = cls.is_web_file_secure(extension)
        
        return {
            'original_filename': file_obj.name,
            'display_filename': display_filename,  # Clean name for UI display
            'storage_filename': storage_filename,  # Unique name for file storage
            'extension': extension,
            'file_size': file_obj.size,
            'file_size_mb': round(file_obj.size / (1024 * 1024), 2),
            'requires_secure_download': requires_secure_download,  # Security flag for web files
            'mime_validated': mime_validated,  # Indicates MIME validation was performed
            'detected_mime_type': detected_mime_type,  # Detected MIME type
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