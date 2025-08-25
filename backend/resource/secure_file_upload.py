import logging
from typing import List, Dict, Any, Optional
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .file_validators import validate_uploaded_file
from .models import UploadedFile, Category, Folder
from .serializers import UploadedFileSerializer

# Set up logging
logger = logging.getLogger(__name__)


class SecureFileUploadView(APIView):
   
    
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, folder_id: Optional[str] = None, format=None) -> Response:
        """
        Handle secure file upload with comprehensive validation
        
        Args:
            request: HTTP request object
            folder_id: Optional folder ID from URL
            format: Response format
            
        Returns:
            Response: JSON response with upload results
        """
        try:
            return self._handle_upload(request, folder_id)
        except Exception as e:
            logger.error(f"Unexpected error in file upload: {str(e)}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred during file upload"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _handle_upload(self, request, folder_id: Optional[str] = None) -> Response:
        """
        Internal method to handle the upload process
        """
        # Log upload attempt
        logger.info(f"File upload attempt by user {request.user.id} ({request.user.email})")
        
        # Validate request has files
        if "files" not in request.FILES:
            logger.warning(f"Upload attempt without files by user {request.user.id}")
            return Response(
                {"error": "No files provided. Please select at least one file to upload."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        files = request.FILES.getlist("files")
        if not files:
            return Response(
                {"error": "No files provided. Please select at least one file to upload."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate folder
        folder = self._validate_folder(folder_id, request)
        if isinstance(folder, Response):  # Error response
            return folder
        
        # Validate category
        category = self._validate_category(request.data.get("category_id"))
        if isinstance(category, Response):  # Error response
            return category
        
        # Process files with transaction safety
        try:
            with transaction.atomic():
                upload_results = self._process_files(files, request, folder, category)
                
                if upload_results.get("errors"):
                    # If there are validation errors, rollback transaction
                    transaction.set_rollback(True)
                    return Response(
                        {
                            "error": "File validation failed",
                            "details": upload_results["errors"]
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Log successful upload
                logger.info(
                    f"Successful upload by user {request.user.id}: "
                    f"{len(upload_results['uploaded_files'])} files"
                )
                
                return Response(
                    {
                        "message": f"Successfully uploaded {len(upload_results['uploaded_files'])} file(s)",
                        "folder_name": folder.name if folder else "Root",
                        "uploaded_files": upload_results["uploaded_files"],
                        "upload_summary": upload_results["summary"]
                    },
                    status=status.HTTP_201_CREATED
                )
                
        except ValidationError as e:
            logger.warning(f"Validation error during upload: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Database error during upload: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to save files. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _validate_folder(self, folder_id: Optional[str], request) -> Optional[Folder]:
        """
        Validate folder access and existence
        """
        if not folder_id or folder_id in ["None", "null", ""]:
            return None
        
        try:
            folder = Folder.objects.get(id=folder_id)
            
            # Check if user has access to this folder
            if folder.owner != request.user and not folder.is_public:
                logger.warning(
                    f"User {request.user.id} attempted to upload to unauthorized folder {folder_id}"
                )
                return Response(
                    {"error": "You don't have permission to upload to this folder"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return folder
            
        except Folder.DoesNotExist:
            logger.warning(f"Upload attempt to non-existent folder {folder_id}")
            return Response(
                {"error": f"Folder with ID {folder_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {"error": "Invalid folder ID format"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _validate_category(self, category_id: Optional[str]) -> Category:
        """
        Validate and get category
        """
        if category_id:
            # Handle list input (from form data)
            if isinstance(category_id, list):
                category_id = category_id[0]
            
            try:
                return Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                logger.warning(f"Upload attempt with invalid category {category_id}")
                return Response(
                    {"error": f"Category with ID {category_id} does not exist"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except ValueError:
                return Response(
                    {"error": "Invalid category ID format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Use default category
            return Category.objects.get(id=Category.get_default_category())
    
    def _process_files(self, files: List, request, folder: Optional[Folder], category: Category) -> Dict[str, Any]:
        """
        Process and validate all uploaded files
        """
        uploaded_files = []
        errors = []
        total_size = 0
        
        for i, file_obj in enumerate(files):
            try:
                # Validate file
                validation_result = validate_uploaded_file(file_obj, add_uuid=True)
                
                # Check for duplicate files
                duplicate_check = self._check_duplicate_file(
                    validation_result['sanitized_filename'], 
                    folder, 
                    request.user
                )
                if duplicate_check:
                    errors.append({
                        "file": file_obj.name,
                        "error": duplicate_check
                    })
                    continue
                
                # Create file record
                uploaded_file = self._create_file_record(
                    file_obj, validation_result, folder, category, request
                )
                
                uploaded_files.append(UploadedFileSerializer(uploaded_file).data)
                total_size += validation_result['file_size']
                
                logger.info(
                    f"File uploaded successfully: {validation_result['sanitized_filename']} "
                    f"({validation_result['file_size_mb']}MB) by user {request.user.id}"
                )
                
            except ValidationError as e:
                logger.warning(f"File validation failed for {file_obj.name}: {str(e)}")
                errors.append({
                    "file": file_obj.name,
                    "error": str(e)
                })
            except Exception as e:
                logger.error(f"Unexpected error processing file {file_obj.name}: {str(e)}")
                errors.append({
                    "file": file_obj.name,
                    "error": "Failed to process file"
                })
        
        return {
            "uploaded_files": uploaded_files,
            "errors": errors,
            "summary": {
                "total_files_attempted": len(files),
                "successful_uploads": len(uploaded_files),
                "failed_uploads": len(errors),
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
        }
    
    def _check_duplicate_file(self, filename: str, folder: Optional[Folder], user) -> Optional[str]:
        """
        Check for duplicate files in the same folder
        """
        existing_file = UploadedFile.objects.filter(
            name=filename,
            folder=folder,
            owner=user
        ).first()
        
        if existing_file:
            folder_name = folder.name if folder else "root folder"
            return f"A file named '{filename}' already exists in {folder_name}"
        
        return None
    
    def _create_file_record(self, file_obj, validation_result: Dict, folder: Optional[Folder], 
                          category: Category, request) -> UploadedFile:
        """
        Create database record for uploaded file
        """
        # Update file object name to sanitized version
        file_obj.name = validation_result['sanitized_filename']
        
        uploaded_file = UploadedFile.objects.create(
            name=validation_result['sanitized_filename'],
            original_name=validation_result['original_filename'],
            file=file_obj,
            file_type=validation_result['extension'],
            file_size=validation_result['file_size'],
            category=category,
            folder=folder,
            owner=request.user,
            is_public=request.data.get("is_public", False),
        )
        
        # Handle shared_with if provided
        shared_with = request.data.get("shared_with", [])
        if shared_with:
            uploaded_file.shared_with.set(shared_with)
        
        return uploaded_file


# For backward compatibility, you can also create an alias
class FileUploadView(SecureFileUploadView):
    """
    Alias for SecureFileUploadView to maintain backward compatibility
    """
    pass