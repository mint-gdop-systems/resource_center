from django.contrib.postgres.search import SearchVector
from django.shortcuts import render, get_object_or_404, redirect
from django.core.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status, generics, viewsets
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView
from .models import UploadedFile, Category, Folder, FileVersion, Reminder, ShareLink, Tag, FileSharing
from .serializers import UploadedFileSerializer, FolderSerializer, FileVersionSerializer, ReminderSerializer
from django.http import JsonResponse, FileResponse, Http404, HttpResponse
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.mail import EmailMessage
from rest_framework.permissions import IsAuthenticated
import json
from django.contrib.auth import logout
from urllib.parse import urlencode
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.timezone import now
from datetime import timedelta
from django.utils import timezone
from decouple import config
from django.db import transaction
import zipfile
import tempfile
import os
import mimetypes
import logging


print("Resource views.py loaded")
# Create your views here.
class HomeView(TemplateView):
    template_name = 'home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        if self.request.user.is_authenticated:
            context['first_name'] = self.request.user.first_name
        else:
            context['first_name'] = None

        return context



class ShowResourceView(TemplateView):
    template_name = 'show-resource.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        if self.request.user.is_authenticated:
            context['first_name'] = self.request.user.first_name
        else:
            context['first_name'] = None

        return context

@login_required
def files(request):
  return render(request, 't_files.html')


def myFiles(request, folder_id=None):
    if not request.user.is_authenticated:
        return redirect('/oidc/authenticate/') 

    if folder_id:
        files = UploadedFile.objects.filter(folder_id=folder_id).order_by("-uploaded_at")  # Get files in the folder
        folders = Folder.objects.filter(parent_id=folder_id).order_by("-created_at")  
        # print("folder id exist", files, folders)
    else:
        files = UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")  # Get root-level files
        folders = Folder.objects.filter(parent__isnull=True).order_by("-created_at")  # Get root-level folders
        # print("folder id DOESNOT exist", files, folders)
    files_exist = files.exists()
    folders_exist = folders.exists()

    
    return render(request, 'myFiles.html', {
        "files": files,
        "folders": folders,
        "files_exist": files_exist,
        "folders_exist": folders_exist
    })




class FileUploadView(APIView):
    
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, folder_id=None, format=None):
        """
        Handle secure file upload with comprehensive validation
        """
        import logging
        from .file_validators import validate_uploaded_file
        
        logger = logging.getLogger(__name__)
        
        try:
            return self._handle_upload(request, folder_id, logger)
        except Exception as e:
            logger.error(f"Unexpected error in file upload: {str(e)}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred during file upload"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _handle_upload(self, request, folder_id, logger):
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
        folder = self._validate_folder(folder_id, request, logger)
        if isinstance(folder, Response):  # Error response
            return folder
        
        # Validate category
        category = self._validate_category(request.data.get("category_id"), logger)
        if isinstance(category, Response):  # Error response
            return category
        
        # Process files with transaction safety
        try:
            with transaction.atomic():
                upload_results = self._process_files(files, request, folder, category, logger)
                
                if upload_results.get("errors"):
                    # Check if all errors are duplicate file errors
                    duplicate_errors = [e for e in upload_results["errors"] if e.get("error_type") == "duplicate"]
                    other_errors = [e for e in upload_results["errors"] if e.get("error_type") != "duplicate"]
                    
                    # If we have duplicate errors and user hasn't specified how to handle them
                    if duplicate_errors and not other_errors:
                        # Don't rollback transaction for duplicate-only scenarios
                        return Response(
                            {
                                "error": "duplicate_files_found",
                                "message": f"Found {len(duplicate_errors)} duplicate file(s)",
                                "duplicates": duplicate_errors,
                                "uploaded_files": upload_results["uploaded_files"],
                                "summary": upload_results["summary"]
                            },
                            status=status.HTTP_409_CONFLICT  # 409 Conflict for duplicates
                        )
                    
                    # If there are validation or system errors, rollback transaction
                    if other_errors:
                        transaction.set_rollback(True)
                    
                    # If only one file and one non-duplicate error, show the specific error directly
                    if len(other_errors) == 1 and len(files) == 1:
                        error_detail = other_errors[0]
                        return Response(
                            {"error": error_detail["error"]},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # For multiple files or errors, show detailed breakdown
                    return Response(
                        {
                            "error": f"Upload failed for {len(other_errors)} file(s)",
                            "details": other_errors,
                            "duplicates": duplicate_errors,
                            "uploaded_files": upload_results["uploaded_files"],
                            "summary": f"{upload_results['summary']['successful_uploads']} succeeded, {len(other_errors)} failed, {len(duplicate_errors)} duplicates"
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Log successful upload
                logger.info(
                    f"Successful upload by user {request.user.id}: "
                    f"{len(upload_results['uploaded_files'])} files"
                )
                
                # Get all files for response (maintaining backward compatibility)
                all_files = folder.files.order_by("-uploaded_at") if folder else UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")
                all_files_serializer = UploadedFileSerializer(all_files, many=True)
                
                return Response(
                    {
                        "message": f"Successfully uploaded {len(upload_results['uploaded_files'])} file(s)",
                        "folder_name": folder.name if folder else "Root",
                        "uploaded_files": upload_results["uploaded_files"],
                        "files": all_files_serializer.data,  # For backward compatibility
                        "upload_summary": upload_results["summary"]
                    },
                    status=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            logger.error(f"Database error during upload: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to save files. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _validate_folder(self, folder_id, request, logger):
        """
        Validate folder access and existence
        """
        # Use folder_id from URL if present, else from form data
        folder_id = folder_id or request.data.get("folder_id")
        if folder_id in [None, "None", "null", ""]:
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
    
    def _validate_category(self, category_id, logger):
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
    
    def _process_files(self, files, request, folder, category, logger):
        """
        Process and validate all uploaded files
        """
        from .file_validators import validate_uploaded_file
        
        uploaded_files = []
        errors = []
        total_size = 0
        
        # Get duplicate handling preference from request
        handle_duplicates = request.data.get("handle_duplicates", "ask")  # "ask", "rename", "skip"
        
        for i, file_obj in enumerate(files):
            try:
                # Validate file
                validation_result = validate_uploaded_file(file_obj)
                
                # Check for duplicate files using the display filename
                duplicate_check = self._check_duplicate_file(
                    validation_result['display_filename'], 
                    folder, 
                    request.user
                )
                
                final_filename = validation_result['display_filename']
                
                if duplicate_check["is_duplicate"]:
                    if handle_duplicates == "ask":
                        # Return duplicate info for frontend to handle
                        errors.append({
                            "file": file_obj.name,
                            "error": f"A file named '{validation_result['display_filename']}' already exists in {duplicate_check['folder_name']}",
                            "error_type": "duplicate",
                            "duplicate_info": {
                                "original_name": validation_result['display_filename'],
                                "folder_name": duplicate_check['folder_name'],
                                "existing_file_id": duplicate_check['existing_file_id']
                            }
                        })
                        continue
                    elif handle_duplicates == "rename":
                        # Auto-generate unique filename
                        final_filename = self._generate_unique_filename(
                            validation_result['display_filename'],
                            folder,
                            request.user
                        )
                        logger.info(f"Renamed duplicate file from '{validation_result['display_filename']}' to '{final_filename}'")
                    elif handle_duplicates == "skip":
                        # Skip this file
                        logger.info(f"Skipped duplicate file: {validation_result['display_filename']}")
                        continue
                
                # Update validation result with final filename
                validation_result['display_filename'] = final_filename
                
                # Create file record
                uploaded_file = self._create_file_record(
                    file_obj, validation_result, folder, category, request
                )
                
                uploaded_files.append(UploadedFileSerializer(uploaded_file).data)
                total_size += validation_result['file_size']
                
                logger.info(
                    f"File uploaded successfully: {final_filename} "
                    f"({validation_result['file_size_mb']}MB) by user {request.user.id}"
                )
                
            except ValidationError as e:
                # Handle validation errors with clear messages
                error_message = str(e)
                logger.warning(f"File validation failed for {file_obj.name}: {error_message}")
                errors.append({
                    "file": file_obj.name,
                    "error": error_message,
                    "error_type": "validation"
                })
            except Exception as e:
                # Handle unexpected errors
                logger.error(f"Unexpected error processing file {file_obj.name}: {str(e)}")
                errors.append({
                    "file": file_obj.name,
                    "error": "An unexpected error occurred while processing this file. Please try again.",
                    "error_type": "system"
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
    
    def _check_duplicate_file(self, filename, folder, user):
        """
        Check for duplicate files and return duplicate info
        """
        existing_file = UploadedFile.objects.filter(
            name=filename,
            folder=folder,
            owner=user
        ).first()
        
        if existing_file:
            folder_name = folder.name if folder else "root folder"
            return {
                "is_duplicate": True,
                "folder_name": folder_name,
                "existing_file_id": existing_file.id
            }
        
        return {"is_duplicate": False}
    
    def _generate_unique_filename(self, base_filename, folder, user):
        """
        Generate a unique filename by appending numbers if duplicates exist
        Format: filename(1).ext, filename(2).ext, etc.
        """
        # Split filename and extension
        name_parts = base_filename.rsplit('.', 1)
        name = name_parts[0]
        extension = f".{name_parts[1]}" if len(name_parts) > 1 else ""
        
        counter = 1
        while True:
            # Generate numbered filename
            numbered_filename = f"{name}({counter}){extension}"
            
            # Check if this numbered version exists
            existing = UploadedFile.objects.filter(
                name=numbered_filename,
                folder=folder,
                owner=user
            ).exists()
            
            if not existing:
                return numbered_filename
            
            counter += 1
            
            # Safety check to prevent infinite loop
            if counter > 1000:
                # Fallback to UUID-based naming
                import uuid
                unique_id = uuid.uuid4().hex[:8]
                return f"{name}_{unique_id}{extension}"
    
    def _create_file_record(self, file_obj, validation_result, folder, category, request):
        """
        Create database record for uploaded file
        """
        # Update file object name to unique storage filename for filesystem
        file_obj.name = validation_result['storage_filename']
        
        uploaded_file = UploadedFile.objects.create(
            name=validation_result['display_filename'],  # Store clean display name in database
            file=file_obj,  # File stored with unique storage filename
            file_type=validation_result['extension'],
            file_size=validation_result['file_size'],
            category=category,
            folder=folder,
            owner=request.user,
            is_public=request.data.get("is_public", False),
        )
        
        # Handle shared_with if provided (if the model supports it)
        shared_with = request.data.get("shared_with", [])
        if shared_with and hasattr(uploaded_file, 'shared_with'):
            uploaded_file.shared_with.set(shared_with)
        
        return uploaded_file


class ResolveDuplicateFilesView(APIView):
    """
    API endpoint to resolve duplicate file conflicts
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        """
        Resolve duplicate files based on user choice
        
        Expected payload:
        {
            "files": [file objects],
            "folder_id": "optional",
            "category_id": "optional", 
            "resolution": "rename" | "skip",
            "duplicate_files": [list of duplicate file info]
        }
        """
        import logging
        from .file_validators import validate_uploaded_file
        
        logger = logging.getLogger(__name__)
        
        try:
            resolution = request.data.get("resolution")  # "rename" or "skip"
            
            if resolution not in ["rename", "skip"]:
                return Response(
                    {"error": "Invalid resolution. Must be 'rename' or 'skip'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Re-process the files with the user's choice
            files = request.FILES.getlist("files")
            if not files:
                return Response(
                    {"error": "No files provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the duplicate handling preference
            request.data._mutable = True
            request.data["handle_duplicates"] = resolution
            request.data._mutable = False
            
            # Use the existing upload logic with the resolution preference
            file_upload_view = FileUploadView()
            return file_upload_view.post(request, request.data.get("folder_id"))
            
        except Exception as e:
            logger.error(f"Error resolving duplicate files: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while resolving duplicate files"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


    # def get(self, request, format=None):
    def get(self, request, folder_id=None):
        current_email = request.user.email
        current_first_name = request.user.first_name


        all_files = UploadedFile.objects.order_by("-uploaded_at")
        all_folders = Folder.objects.order_by("-created_at")

        search_query = request.GET.get("search", "").strip().lower()

        # file_serializer = UploadedFileSerializer(all_files, many=True)
        # folder_serializer = FolderSerializer(all_folders, many=True)
        
        # return Response(
        #     {
        #         "files": file_serializer.data,
        #         "folders": folder_serializer.data
        #     },
        #     status=status.HTTP_200_OK
        #     )
        is_starred = request.GET.get("starred") == "true"
        is_archived = request.GET.get("archived") == "true" 


        if is_archived:
            files = UploadedFile.objects.filter(is_archived=True).order_by("-uploaded_at")
            file_serializer = UploadedFileSerializer(files, many=True)
            return Response({
                "files": file_serializer.data,
                "folders": [],  
                "current_folder": None  
            })


        if folder_id:
            files = UploadedFile.objects.filter(folder_id=folder_id)  
            folders = Folder.objects.filter(parent_id=folder_id)  # Get subfolders
            # print("For Folder Id Exist",files, folders)
        else:
            files = UploadedFile.objects.filter(folder__isnull=True)  # Root-level files
            folders = Folder.objects.filter(parent__isnull=True)  # Root-level folders
            # print("For Folder Id Doesnot Exist",files, folders)

        if is_starred:  
            files = files.filter(is_starred=True)

        
        files = files.order_by("-uploaded_at")  
        folders = folders.order_by("-created_at")  

        file_serializer = UploadedFileSerializer(files, many=True, context={'request': request})
        folder_serializer = FolderSerializer(folders, many=True, context={'request': request})
        # print(file_serializer.data)

        return Response({
            "files": file_serializer.data,
            "folders": folder_serializer.data,
            "current_folder": folder_id,
            "current_email": current_email,
            "current_first_name": current_first_name
        })


    def patch(self, request, file_id=None, format=None):
        try:
            # Retrieve the file by ID
            file = UploadedFile.objects.get(id=file_id)

            # Ensure the file belongs to the authenticated user
            if file.owner != request.user:
                return Response({"error": "You don't have permission to update this file."}, status=status.HTTP_403_FORBIDDEN)

            # Update the fields provided in the request data
            file.name = request.data.get("name", file.name)
            file.is_public = request.data.get("is_public", file.is_public)
            category_id = request.data.get("category_id")
            if category_id:
                category = Category.objects.filter(id=category_id).first()
                if category:
                    file.category = category

            # Update tags (assuming 'meta_tag_names' is the key sent in the request)
            tags = request.data.get("meta_tag_names", [])


            # Serialize the updated file and return the response
            file_serializer = UploadedFileSerializer(file, data=request.data, partial=True)

            if file_serializer.is_valid():
                file_serializer.save()
                return Response({
                    "message": "File updated successfully",
                    "file": file_serializer.data
                }, status=status.HTTP_200_OK)
                
            else:
                return Response(file_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except UploadedFile.DoesNotExist:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)


# Simple test view for debugging
class TestAuthView(APIView):
    authentication_classes = []
    permission_classes = []
    
    def get(self, request):
        return Response({"message": "Test view working", "user": str(request.user)})


class UserProfileView(APIView):
    """
    Get current user's profile information including Django-specific fields
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_superuser": user.is_superuser,
            "is_staff": user.is_staff,
            "is_active": user.is_active,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
        })

class RecentFilesView(APIView):
    """
    Return a list of recent files accessible to the current user, ordered by most recent upload.
    Query params:
      - limit: optional int (1..100), default 25
      - include_archived: optional bool, default false
    """
    permission_classes = []

    def get(self, request):
        try:
            try:
                limit = int(request.GET.get("limit", 25))
            except (TypeError, ValueError):
                limit = 25
            limit = max(1, min(100, limit))

            include_archived = request.GET.get("include_archived", "false").lower() == "true"

            if request.user.is_authenticated:
                files = UploadedFile.objects.filter(
                    Q(owner=request.user) | Q(is_public=True)
                )
            else:
                files = UploadedFile.objects.filter(is_public=True)

            if not include_archived:
                files = files.filter(is_archived=False)

            files = files.order_by("-uploaded_at")[:limit]

            serializer = UploadedFileSerializer(files, many=True, context={"request": request})
            return Response({"files": serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Fetch Categories
def get_categories(request):
    categories = Category.objects.all()
    categories_list = [{"id": category.id, "name": category.name} for category in categories]
    return JsonResponse({"categories": categories_list})


class EditFileView(APIView):
    """
    API view to edit file properties (name, category, tags, visibility)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, file_id):
        """
        Get file details for editing
        """
        try:
            file_instance = get_object_or_404(UploadedFile, id=file_id)
            
            # Check permissions - user must be owner
            if file_instance.owner != request.user:
                return Response({"error": "Permission denied"}, status=403)
            
            # Serialize file data
            serializer = UploadedFileSerializer(file_instance, context={'request': request})
            
            return Response({
                "file": serializer.data
            }, status=200)
            
        except Exception as e:
            return Response({"error": f"Error retrieving file: {str(e)}"}, status=500)
    
    def patch(self, request, file_id):
        """
        Update file properties
        """
        try:
            file_instance = get_object_or_404(UploadedFile, id=file_id)
            
            # Check permissions - user must be owner
            if file_instance.owner != request.user:
                return Response({"error": "Permission denied"}, status=403)
            
            # Get update data
            name = request.data.get('name')
            category_id = request.data.get('category_id')
            meta_tag_names = request.data.get('meta_tag_names', [])
            is_public = request.data.get('is_public')
            
            # Validate and update name
            if name is not None:
                name = name.strip()
                if not name:
                    return Response({"error": "File name cannot be empty"}, status=400)
                
                # Check if file with same name already exists in the same folder
                existing_file = UploadedFile.objects.filter(
                    name=name,
                    folder=file_instance.folder,
                    owner=request.user
                ).exclude(id=file_instance.id).first()
                
                if existing_file:
                    return Response({
                        "error": f"A file named '{name}' already exists in this folder"
                    }, status=409)
                
                file_instance.name = name
            
            # Validate and update category
            if category_id is not None:
                try:
                    category = Category.objects.get(id=category_id)
                    file_instance.category = category
                except Category.DoesNotExist:
                    return Response({"error": "Invalid category"}, status=400)
            
            # Update visibility
            if is_public is not None:
                file_instance.is_public = bool(is_public)
            
            # Save file changes
            file_instance.save()
            
            # Update tags
            if meta_tag_names is not None:
                file_instance.meta_tags.clear()
                for tag_name in meta_tag_names:
                    tag_name = tag_name.strip()
                    if tag_name:
                        tag, created = Tag.objects.get_or_create(name=tag_name)
                        file_instance.meta_tags.add(tag)
            
            # Serialize updated file
            serializer = UploadedFileSerializer(file_instance, context={'request': request})
            
            return Response({
                "message": "File updated successfully",
                "file": serializer.data
            }, status=200)
            
        except Exception as e:
            return Response({"error": f"Error updating file: {str(e)}"}, status=500)


class EditFolderView(APIView):
    """
    API view to edit folder properties (name, visibility)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, folder_id):
        """
        Get folder details for editing
        """
        try:
            folder_instance = get_object_or_404(Folder, id=folder_id)
            
            # Check permissions - user must be owner
            if folder_instance.owner != request.user:
                return Response({"error": "Permission denied"}, status=403)
            
            # Serialize folder data
            serializer = FolderSerializer(folder_instance, context={'request': request})
            
            return Response({
                "folder": serializer.data
            }, status=200)
            
        except Exception as e:
            return Response({"error": f"Error retrieving folder: {str(e)}"}, status=500)
    
    def patch(self, request, folder_id):
        """
        Update folder properties
        """
        try:
            folder_instance = get_object_or_404(Folder, id=folder_id)
            
            # Check permissions - user must be owner
            if folder_instance.owner != request.user:
                return Response({"error": "Permission denied"}, status=403)
            
            # Get update data
            name = request.data.get('name')
            is_public = request.data.get('is_public')
            
            # Validate and update name
            if name is not None:
                name = name.strip()
                if not name:
                    return Response({"error": "Folder name cannot be empty"}, status=400)
                
                # Check if folder with same name already exists in the same parent
                existing_folder = Folder.objects.filter(
                    name=name,
                    parent=folder_instance.parent,
                    owner=request.user
                ).exclude(id=folder_instance.id).first()
                
                if existing_folder:
                    return Response({
                        "error": f"A folder named '{name}' already exists in this location"
                    }, status=409)
                
                folder_instance.name = name
            
            # Update visibility
            if is_public is not None:
                folder_instance.is_public = bool(is_public)
            
            # Save folder changes
            folder_instance.save()
            
            # Serialize updated folder
            serializer = FolderSerializer(folder_instance, context={'request': request})
            
            return Response({
                "message": "Folder updated successfully",
                "folder": serializer.data
            }, status=200)
            
        except Exception as e:
            return Response({"error": f"Error updating folder: {str(e)}"}, status=500)


# Create a Folder
class CreateFolderView(generics.CreateAPIView):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer

    def perform_create(self, serializer):
        folder = serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        parent_id = request.data.get('parent') or self.kwargs.get('parent_id')
        name = request.data.get('name')
        parent_id = request.data.get('parent')

        # Check for duplicate folder in the same parent, considering ownership
        parent = Folder.objects.filter(id=parent_id).first() if parent_id else None

        duplicate_folder = Folder.objects.filter(
            name=name,
            parent=parent,  # Check in the same parent (or None for root)
            owner=request.user  # Only check folders owned by the current user
        ).exists()

        if duplicate_folder:
            return Response(
                {"error": f"You already have a folder named '{name}' in this location."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)    


# Get Folder Contents
class FolderContentsView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    # queryset = Folder.objects.all()
    # serializer_class = FolderSerializer    
    def dispatch(self, request, *args, **kwargs):
        print("DISPATCH CALLED")
        return super().dispatch(request, *args, **kwargs)


    def get(self, request, folder_id=None):
        # print('Authorization:', request.headers.get('Authorization'))
        # print('User:', request.user)
        # print('User is authenticated:', getattr(request.user, 'is_authenticated', None))
        # print('User email:', getattr(request.user, 'email', None))
        # print("FILES QUERYSET COUNT:", files.count())
        # print("FILES OWNERS:", list(files.values_list("owner__email", flat=True)))
        # print("FILES PUBLIC:", list(files.values_list("is_public", flat=True)))
        try:
            # Handle AnonymousUser properly
            if request.user.is_authenticated:
                current_email = request.user.email
                current_first_name = request.user.first_name
            else:
                current_email = None
                current_first_name = None
            

            # print(current_email)
            is_starred = request.GET.get("starred") == "true"
            is_archived = request.GET.get("archived") == "true"

            
            if folder_id:
                # Fetch files and subfolders for the given folder
                if request.user.is_authenticated:
                    files = UploadedFile.objects.filter(
                        Q(folder_id=folder_id) & (Q(owner=request.user) | Q(is_public=True))
                    ).order_by("-uploaded_at")
                    print("if file first executed")
                    print("FILES QUERYSET COUNT:", files.count())
                    print("FILES OWNERS:", list(files.values_list("owner__email", flat=True)))
                    print("FILES PUBLIC:", list(files.values_list("is_public", flat=True)))

                    subfolders = Folder.objects.filter(
                        Q(parent_id=folder_id) & (Q(owner=request.user) | Q(is_public=True))
                    ).order_by("-created_at")
                else:
                    # For anonymous users, only show public files
                    files = UploadedFile.objects.filter(
                        Q(folder_id=folder_id) & Q(is_public=True)
                    ).order_by("-uploaded_at")
                    print("if file else executed")
                    subfolders = Folder.objects.filter(
                        Q(parent_id=folder_id) & Q(is_public=True)
                    ).order_by("-created_at")
            else:
                # Fetch root-level files and folders
                if request.user.is_authenticated:
                    files = UploadedFile.objects.filter(
                        Q(folder__isnull=True) & (Q(owner=request.user) | Q(is_public=True))
                    ).order_by("-uploaded_at")
                    print("if file or last executed")
                    print("FILES QUERYSET COUNT:", files.count())
                    print("FILES OWNERS:", list(files.values_list("owner__email", flat=True)))
                    print("FILES PUBLIC:", list(files.values_list("is_public", flat=True)))
                    subfolders = Folder.objects.filter(
                        Q(parent__isnull=True) & (Q(owner=request.user) | Q(is_public=True))
                    ).order_by("-created_at")
                else:
                    # For anonymous users, only show public files
                    files = UploadedFile.objects.filter(
                        Q(folder__isnull=True) & Q(is_public=True)
                    ).order_by("-uploaded_at")
                    print("if file else executed")
                    print("FILES QUERYSET COUNT:", files.count())
                    print("FILES OWNERS:", list(files.values_list("owner__email", flat=True)))
                    print("FILES PUBLIC:", list(files.values_list("is_public", flat=True)))

                    subfolders = Folder.objects.filter(
                        Q(parent__isnull=True) & Q(is_public=True)
                    ).order_by("-created_at")

            if is_starred:
                files = files.filter(is_starred=True)
                subfolders = subfolders.filter(is_starred=True)

            if is_archived is not None:  
                files = files.filter(is_archived=is_archived)    

            files = files.order_by("-uploaded_at")
            subfolders = subfolders.order_by("-created_at")    

            files_serializer = UploadedFileSerializer(files, many=True, context={'request': request})
            folders_serializer = FolderSerializer(subfolders, many=True, context={'request': request})

            return Response({
                "files": files_serializer.data,
                "folders": folders_serializer.data,
                "current_folder": folder_id,
                "current_email": current_email,
                "current_first_name": current_first_name
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DownloadFileView(APIView):
    """
    API view to download files with proper authentication and headers
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, file_id):
        try:
            # Get the file instance
            file_instance = get_object_or_404(UploadedFile, id=file_id)
            
            # Check permissions using the model's comprehensive access check
            has_access = (
                file_instance.owner == request.user or 
                file_instance.is_public or
                file_instance.is_accessible_by(request.user)
            )
            
            if not has_access:
                return HttpResponse("Permission denied", status=403)
            
            # Get file path and verify it exists
            import mimetypes
            import os
            
            # Check if file object exists
            if not file_instance.file:
                return HttpResponse("File data not found", status=404)
            
            try:
                file_path = file_instance.file.path
            except ValueError as e:
                return HttpResponse(f"File path error: {str(e)}", status=500)
            
            if not os.path.exists(file_path):
                return HttpResponse("File not found on the server", status=404)
            
            # Determine content type
            file_name = os.path.basename(file_path)
            content_type, encoding = mimetypes.guess_type(file_name)
            
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Open and serve the file for download
            file_handle = open(file_path, 'rb')
            response = FileResponse(file_handle, content_type=content_type, as_attachment=True)
            
            # Set headers for proper file download
            response['Content-Disposition'] = f'attachment; filename="{file_instance.name}"'
            response['Content-Length'] = os.path.getsize(file_path)
            response['X-Content-Type-Options'] = 'nosniff'
            
            return response
            
        except FileNotFoundError:
            raise Http404("File not found on the server.")
        except Exception as e:
            return HttpResponse(f"Error downloading file: {str(e)}", status=500)


class BulkDownloadView(APIView):
    """
    API view to download multiple files as a ZIP archive
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            file_ids = request.data.get('file_ids', [])
            folder_ids = request.data.get('folder_ids', [])
            
            if not file_ids and not folder_ids:
                return Response({"error": "No files or folders selected for download"}, status=400)
            
            # Get files that user has access to
            files = []
            if file_ids:
                all_files = UploadedFile.objects.filter(id__in=file_ids)
                files = [f for f in all_files if f.owner == request.user or f.is_public or f.is_accessible_by(request.user)]
            
            # Get folders that user has access to
            folders = []
            if folder_ids:
                all_folders = Folder.objects.filter(id__in=folder_ids)
                folders = [f for f in all_folders if f.owner == request.user or f.is_public or f.is_accessible_by(request.user)]
            
            if not files and not folders:
                return Response({"error": "No accessible files or folders found"}, status=404)
            
            import zipfile
            import tempfile
            import os
            from django.utils import timezone
            
            # Create a temporary zip file
            temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
            
            try:
                with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    # Add individual files
                    for file_obj in files:
                        if file_obj.file and os.path.exists(file_obj.file.path):
                            # Add file to zip with its original name
                            zip_file.write(file_obj.file.path, file_obj.name)
                    
                    # Add folders and their contents
                    for folder in folders:
                        self._add_folder_to_zip(zip_file, folder, folder.name, request.user)
                
                # Prepare response
                zip_file_size = os.path.getsize(temp_zip.name)
                response = FileResponse(
                    open(temp_zip.name, 'rb'),
                    content_type='application/zip',
                    as_attachment=True
                )
                
                # Generate a meaningful filename
                timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
                zip_filename = f"files_{timestamp}.zip"
                
                response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
                response['Content-Length'] = zip_file_size
                
                # Clean up temp file after response is sent
                def cleanup():
                    try:
                        os.unlink(temp_zip.name)
                    except:
                        pass
                
                # Schedule cleanup (Django will handle this after response)
                response.close = cleanup
                
                return response
                
            except Exception as e:
                # Clean up on error
                try:
                    os.unlink(temp_zip.name)
                except:
                    pass
                raise e
                
        except Exception as e:
            return Response({"error": f"Error creating download: {str(e)}"}, status=500)
    
    def _add_folder_to_zip(self, zip_file, folder, folder_path, user):
        """Recursively add folder contents to ZIP with proper permission checks"""
        import os
        
        # Add files in this folder with permission checks
        all_files = UploadedFile.objects.filter(folder=folder)
        
        for file in all_files:
            if file.owner == user or file.is_public or file.is_accessible_by(user):
                try:
                    if file.file and os.path.exists(file.file.path):
                        arcname = os.path.join(folder_path, file.name)
                        zip_file.write(file.file.path, arcname)
                except Exception as e:
                    print(f"Error adding file {file.name} to zip: {str(e)}")
                    continue
        
        # Add subfolders recursively with permission checks
        all_subfolders = Folder.objects.filter(parent=folder)
        
        for subfolder in all_subfolders:
            if subfolder.owner == user or subfolder.is_public or subfolder.is_accessible_by(user):
                try:
                    subfolder_path = os.path.join(folder_path, subfolder.name)
                    self._add_folder_to_zip(zip_file, subfolder, subfolder_path, user)
                except Exception as e:
                    print(f"Error adding folder {subfolder.name} to zip: {str(e)}")
                    continue


class CopyFileView(APIView):
    """
    API view to copy a single file to a destination folder
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, file_id):
        try:
            # Get the source file
            source_file = get_object_or_404(UploadedFile, id=file_id)
            
            # Check permissions - user must be owner or file must be public
            if not (source_file.owner == request.user or source_file.is_public):
                return Response({"error": "Permission denied"}, status=403)
            
            # Get destination folder (optional)
            destination_folder_id = request.data.get('destination_folder_id')
            destination_folder = None
            
            if destination_folder_id:
                try:
                    destination_folder = Folder.objects.get(
                        id=destination_folder_id,
                        owner=request.user
                    )
                except Folder.DoesNotExist:
                    return Response({"error": "Destination folder not found or access denied"}, status=404)
            
            # Check if file with same name already exists in destination
            existing_file = UploadedFile.objects.filter(
                name=source_file.name,
                folder=destination_folder,
                owner=request.user
            ).first()
            
            if existing_file:
                return Response({
                    "error": f"A file named '{source_file.name}' already exists in the destination folder"
                }, status=409)
            
            # Create a copy of the file
            import shutil
            from django.core.files import File
            from django.core.files.base import ContentFile
            
            # Read the original file content
            with source_file.file.open('rb') as original_file:
                file_content = original_file.read()
            
            # Create new file instance
            copied_file = UploadedFile(
                name=source_file.name,
                file_type=source_file.file_type,
                file_size=source_file.file_size,
                category=source_file.category,
                folder=destination_folder,
                owner=request.user,
                is_public=False,  # Copied files are private by default
            )
            
            # Save the file content
            copied_file.file.save(
                source_file.file.name.split('/')[-1],
                ContentFile(file_content),
                save=False
            )
            
            # Copy tags
            copied_file.save()
            copied_file.meta_tags.set(source_file.meta_tags.all())
            
            # Serialize and return the copied file
            serializer = UploadedFileSerializer(copied_file, context={'request': request})
            
            return Response({
                "message": f"File '{source_file.name}' copied successfully",
                "copied_file": serializer.data
            }, status=201)
            
        except Exception as e:
            return Response({"error": f"Error copying file: {str(e)}"}, status=500)


class BulkCopyView(APIView):
    """
    API view to copy multiple files to a destination folder
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            file_ids = request.data.get('file_ids', [])
            folder_ids = request.data.get('folder_ids', [])
            destination_folder_id = request.data.get('destination_folder_id')
            
            if not file_ids and not folder_ids:
                return Response({"error": "No items selected for copying"}, status=400)
            
            # Get destination folder (optional)
            destination_folder = None
            if destination_folder_id:
                try:
                    destination_folder = Folder.objects.get(
                        id=destination_folder_id,
                        owner=request.user
                    )
                except Folder.DoesNotExist:
                    return Response({"error": "Destination folder not found or access denied"}, status=404)
            
            copied_files = []
            copied_folders = []
            errors = []
            
            # Copy files
            if file_ids:
                all_files = UploadedFile.objects.filter(id__in=file_ids)
                files = [f for f in all_files if f.owner == request.user or f.is_public or f.is_accessible_by(request.user)]
                
                for source_file in files:
                    try:
                        # Check if file with same name already exists in destination
                        existing_file = UploadedFile.objects.filter(
                            name=source_file.name,
                            folder=destination_folder,
                            owner=request.user
                        ).first()
                        
                        if existing_file:
                            errors.append(f"File '{source_file.name}' already exists in destination")
                            continue
                        
                        # Create a copy of the file
                        from django.core.files.base import ContentFile
                        
                        # Read the original file content
                        with source_file.file.open('rb') as original_file:
                            file_content = original_file.read()
                        
                        # Create new file instance
                        copied_file = UploadedFile(
                            name=source_file.name,
                            file_type=source_file.file_type,
                            file_size=source_file.file_size,
                            category=source_file.category,
                            folder=destination_folder,
                            owner=request.user,
                            is_public=False,  # Copied files are private by default
                        )
                        
                        # Save the file content
                        copied_file.file.save(
                            source_file.file.name.split('/')[-1],
                            ContentFile(file_content),
                            save=False
                        )
                        
                        # Copy tags
                        copied_file.save()
                        copied_file.meta_tags.set(source_file.meta_tags.all())
                        
                        copied_files.append(copied_file)
                        
                    except Exception as e:
                        errors.append(f"Error copying '{source_file.name}': {str(e)}")
            
            # Copy folders (recursive)
            if folder_ids:
                folders = Folder.objects.filter(
                    id__in=folder_ids,
                    owner=request.user
                )
                
                for source_folder in folders:
                    try:
                        copied_folder = self._copy_folder_recursive(source_folder, destination_folder, request.user)
                        copied_folders.append(copied_folder)
                    except Exception as e:
                        errors.append(f"Error copying folder '{source_folder.name}': {str(e)}")
            
            # Prepare response
            response_data = {
                "message": f"Successfully copied {len(copied_files)} file(s) and {len(copied_folders)} folder(s)",
                "copied_files": len(copied_files),
                "copied_folders": len(copied_folders),
            }
            
            if errors:
                response_data["errors"] = errors
                response_data["message"] += f" with {len(errors)} error(s)"
            
            return Response(response_data, status=201)
            
        except Exception as e:
            return Response({"error": f"Error copying items: {str(e)}"}, status=500)
    
    def _copy_folder_recursive(self, source_folder, destination_parent, user):
        """
        Recursively copy a folder and all its contents
        """
        # Check if folder with same name already exists in destination
        existing_folder = Folder.objects.filter(
            name=source_folder.name,
            parent=destination_parent,
            owner=user
        ).first()
        
        if existing_folder:
            raise Exception(f"Folder '{source_folder.name}' already exists in destination")
        
        # Create new folder
        copied_folder = Folder.objects.create(
            name=source_folder.name,
            parent=destination_parent,
            owner=user,
            is_public=False,  # Copied folders are private by default
        )
        
        # Copy all files in the folder
        for file_obj in source_folder.files.all():
            if file_obj.owner == user or file_obj.is_public:
                try:
                    from django.core.files.base import ContentFile
                    
                    # Read the original file content
                    with file_obj.file.open('rb') as original_file:
                        file_content = original_file.read()
                    
                    # Create new file instance
                    copied_file = UploadedFile(
                        name=file_obj.name,
                        file_type=file_obj.file_type,
                        file_size=file_obj.file_size,
                        category=file_obj.category,
                        folder=copied_folder,
                        owner=user,
                        is_public=False,
                    )
                    
                    # Save the file content
                    copied_file.file.save(
                        file_obj.file.name.split('/')[-1],
                        ContentFile(file_content),
                        save=False
                    )
                    
                    # Copy tags
                    copied_file.save()
                    copied_file.meta_tags.set(file_obj.meta_tags.all())
                    
                except Exception as e:
                    # Log error but continue with other files
                    print(f"Error copying file '{file_obj.name}': {str(e)}")
        
        # Recursively copy subfolders
        for subfolder in source_folder.subfolders.filter(owner=user):
            try:
                self._copy_folder_recursive(subfolder, copied_folder, user)
            except Exception as e:
                # Log error but continue with other subfolders
                print(f"Error copying subfolder '{subfolder.name}': {str(e)}")
        
        return copied_folder


class MoveFileView(APIView):
    """
    API view to move a single file to a destination folder
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, file_id):
        try:
            # Get the source file
            source_file = get_object_or_404(UploadedFile, id=file_id)
            
            # Check permissions - user must be owner
            if source_file.owner != request.user:
                return Response({"error": "Permission denied"}, status=403)
            
            # Get destination folder (optional)
            destination_folder_id = request.data.get('destination_folder_id')
            destination_folder = None
            
            if destination_folder_id:
                try:
                    destination_folder = Folder.objects.get(
                        id=destination_folder_id,
                        owner=request.user
                    )
                except Folder.DoesNotExist:
                    return Response({"error": "Destination folder not found or access denied"}, status=404)
            
            # Check if file with same name already exists in destination
            existing_file = UploadedFile.objects.filter(
                name=source_file.name,
                folder=destination_folder,
                owner=request.user
            ).exclude(id=source_file.id).first()
            
            if existing_file:
                return Response({
                    "error": f"A file named '{source_file.name}' already exists in the destination folder"
                }, status=409)
            
            # Move the file by updating its folder
            old_folder_name = source_file.folder.name if source_file.folder else "Root"
            new_folder_name = destination_folder.name if destination_folder else "Root"
            
            source_file.folder = destination_folder
            source_file.save()
            
            # Serialize and return the moved file
            serializer = UploadedFileSerializer(source_file, context={'request': request})
            
            return Response({
                "message": f"File '{source_file.name}' moved from '{old_folder_name}' to '{new_folder_name}'",
                "moved_file": serializer.data
            }, status=200)
            
        except Exception as e:
            return Response({"error": f"Error moving file: {str(e)}"}, status=500)


class MoveFolderView(APIView):
    """
    API view to move a single folder to a destination folder
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, folder_id):
        try:
            # Get the source folder
            source_folder = get_object_or_404(Folder, id=folder_id)
            
            # Check permissions - user must be owner
            if source_folder.owner != request.user:
                return Response({"error": "Permission denied"}, status=403)
            
            # Get destination folder (optional)
            destination_folder_id = request.data.get('destination_folder_id')
            destination_folder = None
            
            if destination_folder_id:
                try:
                    destination_folder = Folder.objects.get(
                        id=destination_folder_id,
                        owner=request.user
                    )
                except Folder.DoesNotExist:
                    return Response({"error": "Destination folder not found or access denied"}, status=404)
                
                # Check if trying to move folder into itself or its descendants
                if self._is_descendant_or_self(source_folder, destination_folder):
                    return Response({
                        "error": "Cannot move folder into itself or its descendants"
                    }, status=400)
            
            # Check if folder with same name already exists in destination
            existing_folder = Folder.objects.filter(
                name=source_folder.name,
                parent=destination_folder,
                owner=request.user
            ).exclude(id=source_folder.id).first()
            
            if existing_folder:
                return Response({
                    "error": f"A folder named '{source_folder.name}' already exists in the destination"
                }, status=409)
            
            # Move the folder by updating its parent
            old_parent_name = source_folder.parent.name if source_folder.parent else "Root"
            new_parent_name = destination_folder.name if destination_folder else "Root"
            
            source_folder.parent = destination_folder
            source_folder.save()
            
            # Serialize and return the moved folder
            serializer = FolderSerializer(source_folder, context={'request': request})
            
            return Response({
                "message": f"Folder '{source_folder.name}' moved from '{old_parent_name}' to '{new_parent_name}'",
                "moved_folder": serializer.data
            }, status=200)
            
        except Exception as e:
            return Response({"error": f"Error moving folder: {str(e)}"}, status=500)
    
    def _is_descendant_or_self(self, source_folder, potential_parent):
        """
        Check if potential_parent is the same as source_folder or a descendant of it
        """
        if source_folder.id == potential_parent.id:
            return True
        
        current = potential_parent.parent
        while current:
            if current.id == source_folder.id:
                return True
            current = current.parent
        
        return False


class BulkMoveView(APIView):
    """
    API view to move multiple files and folders to a destination folder
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            file_ids = request.data.get('file_ids', [])
            folder_ids = request.data.get('folder_ids', [])
            destination_folder_id = request.data.get('destination_folder_id')
            
            if not file_ids and not folder_ids:
                return Response({"error": "No items selected for moving"}, status=400)
            
            # Get destination folder (optional)
            destination_folder = None
            if destination_folder_id:
                try:
                    destination_folder = Folder.objects.get(
                        id=destination_folder_id,
                        owner=request.user
                    )
                except Folder.DoesNotExist:
                    return Response({"error": "Destination folder not found or access denied"}, status=404)
            
            moved_files = []
            moved_folders = []
            errors = []
            
            # Move files
            if file_ids:
                files = UploadedFile.objects.filter(
                    id__in=file_ids,
                    owner=request.user
                )
                
                for source_file in files:
                    try:
                        # Check if file with same name already exists in destination
                        existing_file = UploadedFile.objects.filter(
                            name=source_file.name,
                            folder=destination_folder,
                            owner=request.user
                        ).exclude(id=source_file.id).first()
                        
                        if existing_file:
                            errors.append(f"File '{source_file.name}' already exists in destination")
                            continue
                        
                        # Move the file
                        source_file.folder = destination_folder
                        source_file.save()
                        moved_files.append(source_file)
                        
                    except Exception as e:
                        errors.append(f"Error moving '{source_file.name}': {str(e)}")
            
            # Move folders
            if folder_ids:
                folders = Folder.objects.filter(
                    id__in=folder_ids,
                    owner=request.user
                )
                
                for source_folder in folders:
                    try:
                        # Check if trying to move folder into itself or its descendants
                        if destination_folder and self._is_descendant_or_self(source_folder, destination_folder):
                            errors.append(f"Cannot move '{source_folder.name}' into itself or its descendants")
                            continue
                        
                        # Check if folder with same name already exists in destination
                        existing_folder = Folder.objects.filter(
                            name=source_folder.name,
                            parent=destination_folder,
                            owner=request.user
                        ).exclude(id=source_folder.id).first()
                        
                        if existing_folder:
                            errors.append(f"Folder '{source_folder.name}' already exists in destination")
                            continue
                        
                        # Move the folder
                        source_folder.parent = destination_folder
                        source_folder.save()
                        moved_folders.append(source_folder)
                        
                    except Exception as e:
                        errors.append(f"Error moving folder '{source_folder.name}': {str(e)}")
            
            # Prepare response
            destination_name = destination_folder.name if destination_folder else "Root"
            response_data = {
                "message": f"Successfully moved {len(moved_files)} file(s) and {len(moved_folders)} folder(s) to '{destination_name}'",
                "moved_files": len(moved_files),
                "moved_folders": len(moved_folders),
            }
            
            if errors:
                response_data["errors"] = errors
                response_data["message"] += f" with {len(errors)} error(s)"
            
            return Response(response_data, status=200)
            
        except Exception as e:
            return Response({"error": f"Error moving items: {str(e)}"}, status=500)
    
    def _is_descendant_or_self(self, source_folder, potential_parent):
        """
        Check if potential_parent is the same as source_folder or a descendant of it
        """
        if source_folder.id == potential_parent.id:
            return True
        
        current = potential_parent.parent
        while current:
            if current.id == source_folder.id:
                return True
            current = current.parent
        
        return False


class ViewFileView(APIView):
    """
    API view to serve files with proper authentication and headers
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, file_id):
        try:
            # Get the file instance
            file_instance = get_object_or_404(UploadedFile, id=file_id)
            
            # Check permissions using the model's comprehensive access check
            has_access = (
                file_instance.owner == request.user or 
                file_instance.is_public or
                file_instance.is_accessible_by(request.user)
            )
            
            if not has_access:
                return HttpResponse("Permission denied", status=403)
            
            # Get file path and verify it exists
            if not file_instance.file:
                return HttpResponse("File data not found", status=404)
            
            try:
                file_path = file_instance.file.path
            except ValueError as e:
                return HttpResponse(f"File path error: {str(e)}", status=500)
            
            import mimetypes
            import os
            
            if not os.path.exists(file_path):
                raise Http404("File not found on the server.")
            
            # Determine content type
            file_name = os.path.basename(file_path)
            content_type, encoding = mimetypes.guess_type(file_name)
            
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Open and serve the file
            file_handle = open(file_path, 'rb')
            response = FileResponse(file_handle, content_type=content_type)
            
            # Set headers for proper file display
            response['Content-Disposition'] = f'inline; filename="{file_instance.name}"'
            response['X-Content-Type-Options'] = 'nosniff'
            
            return response
            
        except FileNotFoundError:
            raise Http404("File not found on the server.")
        except Exception as e:
            return HttpResponse(f"Error serving file: {str(e)}", status=500)


# def send_email(request):
#     if request.method == "POST":
#         try:
#             # Parse the JSON data
#             data = json.loads(request.body)
            
#             email = data.get('email')
#             message = data.get('message')
#             file_id = data.get('file_id')

#             if not email or not message:
#                 return JsonResponse({"error": "Email and message are required."}, status=400)

#             # Send the email (modify the logic as per your needs)
#             send_mail(
#                 'Subject - Your transfer',  # The email subject
#                  message,  # The message body
#                 'passengerlunar@gmail.com',  # From email
#                  [email],  # To email
#                  fail_silently=False,
#             )

#             return JsonResponse({"message": "Email sent successfully!"}, status=200)

#         except Exception as e:
#             return JsonResponse({"error": str(e)}, status=400)
#     return JsonResponse({"error": "Invalid request method."}, status=400)
                                                  
                                                    
# class Sendmail(APIView):
#     def post(self, request):
#         email = data.get('email')
#         message = data.get('message')
#         # file_id = data.get('file_id')


#         # email = request.data['d']
#         emailw = EmailMessage(
#             'Test email Subject',
#             'Test emal body, this msg is from python', 
#             setting.EMAIL_HOST_USER, 
#             [email]
#         )

#         # emailw.attach_file('')
#         emailw.send(fail_silently=False)
#         return Response({'status': True, 'message': 'Email Sent Successfully' })


class DeleteUploadedFileView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, file_id):
        try:
            uploaded_file = UploadedFile.objects.get(id=file_id)

           
            if uploaded_file.owner != request.user:
                return Response({'error': 'You do not have permission to delete this file.'}, status=403)

            uploaded_file.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except UploadedFile.DoesNotExist:
            return Response({'error': 'File not found.'}, status=404)


class BulkDeleteView(APIView):
    """
    View to handle bulk deletion of files and folders.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        return self.delete(request, *args, **kwargs)
    
    @transaction.atomic
    def delete(self, request, *args, **kwargs):
        file_ids = request.data.get('file_ids', [])
        folder_ids = request.data.get('folder_ids', [])

        if not file_ids and not folder_ids:
            return Response({"error": "No items selected for deletion."}, status=status.HTTP_400_BAD_REQUEST)

        # Filter and delete files owned by the user
        # Use individual delete() calls to trigger storage usage updates
        files_to_delete = UploadedFile.objects.filter(id__in=file_ids, owner=request.user)
        deleted_files_count = 0
        
        print(f"DEBUG: BulkDeleteView - About to delete {files_to_delete.count()} files for user {request.user}")
        
        for file_obj in files_to_delete:
            print(f"DEBUG: Deleting file {file_obj.id}: {file_obj.name} ({file_obj.file_size} bytes)")
            file_obj.delete()  # This triggers the model's delete() method which updates storage
            deleted_files_count += 1

        # Filter and delete folders owned by the user
        folders_to_delete = Folder.objects.filter(id__in=folder_ids, owner=request.user)
        deleted_folders_count = 0
        for folder_obj in folders_to_delete:
            folder_obj.delete()  # This triggers the model's delete() method
            deleted_folders_count += 1

        return Response({
            "message": f"Successfully deleted {deleted_files_count} file(s) and {deleted_folders_count} folder(s)."
        }, status=status.HTTP_200_OK)


class ToggleStarredView(APIView):
    """
    View to toggle the 'is_starred' status of a file.
    """
    def post(self, request, file_id):
        try:
            file = UploadedFile.objects.get(id=file_id)
            file.is_starred = not file.is_starred  # Toggle the status
            file.save()
            return Response(
                {"message": "File starred status updated", "is_starred": file.is_starred},
                status=status.HTTP_200_OK,
            )
        except UploadedFile.DoesNotExist:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class ToggleFolderStarredView(APIView):
    """
    View to toggle the 'is_starred' status of a folder.
    """
    def post(self, request, folder_id):
        try:
            folder = Folder.objects.get(id=folder_id)
            folder.is_starred = not folder.is_starred  # Toggle the status
            folder.save()
            return Response(
                {"message": "Folder starred status updated", "is_starred": folder.is_starred},
                status=status.HTTP_200_OK,
            )
        except Folder.DoesNotExist:
            return Response(
                {"error": "Folder not found"},
                status=status.HTTP_404_NOT_FOUND
            )



class ToggleArchivedView(APIView):
    """
    View to toggle the 'is_archived' status of a file.
    """
    def post(self, request, file_id):
        try:
            file = UploadedFile.objects.get(id=file_id)
            file.is_archived = not file.is_archived  # Toggle the status
            file.save()
            return Response(
                {"message": "File archived status updated", "is_archived": file.is_archived},
                status=status.HTTP_200_OK,
            )
        except UploadedFile.DoesNotExist:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )        


def logout_view(request):
    logout(request)
    redirect_uri = config("REDIRECT_URL_PATH")  
    logout_url = f"{settings.OIDC_OP_LOGOUT_ENDPOINT}?{urlencode({'post_logout_redirect_uri': redirect_uri, 'client_id': settings.OIDC_RP_CLIENT_ID})}"
    return redirect(logout_url)


class UploadNewVersionView(APIView):
    permission_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, file_id):
        try:
            uploaded_file = UploadedFile.objects.get(id=file_id)

            if uploaded_file.owner != request.user:
                return Response(
                    {"error": "You are not authorized to upload a new version of this file."},
                    status=403
                )

            new_file = request.FILES['new_version']
            file_name = new_file.name.split('/')[-1]
            file_type = file_name.split('.')[-1].lower()
            file_size = new_file.size

            # If no versions exist, this is the base version
            if not FileVersion.objects.filter(uploaded_file=uploaded_file).exists():
                FileVersion.objects.create(
                    uploaded_file=uploaded_file,
                    version_number=0,
                    file=uploaded_file.file,
                    file_name=uploaded_file.file.name.split("/")[-1],
                    file_size=uploaded_file.file_size,
                    file_type=uploaded_file.file_type,
                    uploaded_by=uploaded_file.owner,
                    change_note="Base version",
                    is_current=False  # Base version is not current anymore
                )
                version_number = 1
            else:
                latest_version = FileVersion.objects.filter(uploaded_file=uploaded_file).order_by('-version_number').first()
                version_number = latest_version.version_number + 1 if latest_version else 1

            # Set all previous versions to not current
            FileVersion.objects.filter(uploaded_file=uploaded_file).update(is_current=False)

            # Create new version as current
            FileVersion.objects.create(
                uploaded_file=uploaded_file,
                version_number=version_number,
                file=new_file,
                file_name=file_name,
                file_size=file_size,
                file_type=file_type,
                uploaded_by=request.user,
                change_note=request.data.get('change_note', ''),
                is_current=True  # ✅ This is the current version now
            )

            # Update current file in UploadedFile
            uploaded_file.file = new_file
            uploaded_file.name = file_name
            uploaded_file.file_size = file_size
            uploaded_file.file_type = file_type
            uploaded_file.save()

            return Response({'message': 'New version uploaded'})

        except UploadedFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=404)


class FileVersionHistoryView(APIView):
    permission_classes = []

    def get(self, request, file_id):
        try:
            uploaded_file = UploadedFile.objects.get(id=file_id)

            
            if not FileVersion.objects.filter(uploaded_file=uploaded_file, version_number=0).exists():
                FileVersion.objects.create(
                    uploaded_file=uploaded_file,
                    version_number=0,
                    file=uploaded_file.file,
                    file_name=uploaded_file.file.name.split("/")[-1],
                    file_size=uploaded_file.file_size,
                    file_type=uploaded_file.file_type,
                    uploaded_by=uploaded_file.owner,
                    change_note="Base version",
                    uploaded_at=uploaded_file.uploaded_at,
                    is_current=True 
                )

            versions = uploaded_file.versions.order_by("uploaded_at")

            version_history = []

            is_owner = request.user == uploaded_file.owner
            current_file_path = uploaded_file.file.name

            for version in versions:
                version_history.append({
                    "id": version.id,
                    "version_number": version.version_number,
                    "file_name": version.file.name.split("/")[-1],
                    "uploaded_by_name": version.uploaded_by.get_full_name() if version.uploaded_by else "Unknown",
                    "uploaded_at": version.uploaded_at.isoformat(),
                    "change_note": version.change_note or "",
                    "uploaded_file_url": version.file.url,
                    "is_current": version.is_current,
                })
            return Response({
                "is_owner": is_owner,
                "versions": sorted(version_history, key=lambda x: x["uploaded_at"], reverse=True)
            })

        except UploadedFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=404)




class RevertVersionView(APIView):
    permission_classes = []

    def post(self, request, file_id, version_id):
        try:
            version = FileVersion.objects.get(id=version_id, uploaded_file__id=file_id)
            uploaded_file = version.uploaded_file

            # Update uploaded_file to match selected version
            uploaded_file.file = version.file
            uploaded_file.name = version.file.name.split("/")[-1]
            uploaded_file.file_size = version.file_size
            uploaded_file.file_type = version.file_type
            uploaded_file.save()

            # Update all other versions to is_current=False
            FileVersion.objects.filter(uploaded_file=uploaded_file).exclude(id=version.id).update(is_current=False)

            # Mark this version as current
            version.is_current = True
            version.uploaded_at = now()
            version.save(update_fields=["is_current", "uploaded_at"])

            return Response({'message': 'Reverted successfully'})

        except FileVersion.DoesNotExist:
            return Response({'error': 'Version not found'}, status=404)


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = []

    def get_queryset(self):
        # Only return reminders for the current user
        return Reminder.objects.filter(user=self.request.user).order_by('-remind_at')

    def perform_create(self, serializer):
        # Automatically assign the user to the reminder
        serializer.save(user=self.request.user)


class UpcomingRemindersView(APIView):
    permission_classes = []

    def get(self, request):
        now = timezone.now()
        start = now - timedelta(minutes=10)
        end = now + timedelta(hours=1)

        reminders = Reminder.objects.filter(
            user=request.user,
            remind_at__range=(start, end)
        ).order_by("remind_at")

        serializer = ReminderSerializer(reminders, many=True)
        return Response(serializer.data)


# ============ PUBLIC SHARE LINK VIEWS ============

class PublicShareView(APIView):
    """
    Public share endpoint - NO authentication required
    URL: /share/{share_id}/
    Works like Google Drive/Dropbox public links
    """
    permission_classes = []  # No authentication required
    
    def get(self, request, share_id):
        """Download file or folder via public share link"""
        try:
            # Get the share link
            share_link = get_object_or_404(ShareLink, share_id=share_id)
            
            # Check if link is valid
            is_valid, message = share_link.is_valid()
            if not is_valid:
                return HttpResponse(f"Share link error: {message}", status=403)
            
            # Handle password protection (if implemented later)
            # password = request.GET.get('password')
            # if share_link.password and password != share_link.password:
            #     return HttpResponse("Password required", status=401)
            
            # Increment download count
            share_link.download_count += 1
            share_link.save()
            
            # Handle file download
            if share_link.file:
                return self._serve_file(share_link.file)
            
            # Handle folder download (as ZIP)
            elif share_link.folder:
                return self._serve_folder_zip(share_link.folder)
                
        except Exception as e:
            return HttpResponse(f"Error accessing shared item: {str(e)}", status=500)
    
    def _serve_file(self, file_instance):
        """Serve a single file for download"""
        import mimetypes
        import os
        
        file_path = file_instance.file.path
        
        if not os.path.exists(file_path):
            raise Http404("File not found on server")
        
        # Determine content type
        content_type, encoding = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Serve file
        file_handle = open(file_path, 'rb')
        response = FileResponse(file_handle, content_type=content_type, as_attachment=True)
        response['Content-Disposition'] = f'attachment; filename="{file_instance.name}"'
        response['Content-Length'] = os.path.getsize(file_path)
        
        return response
    
    def _serve_folder_zip(self, folder_instance):
        """Serve folder contents as ZIP file"""
        import zipfile
        import tempfile
        import os
        
        # Create temporary ZIP file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        
        try:
            with zipfile.ZipFile(temp_file.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                self._add_folder_to_zip(folder_instance, zip_file, "")
            
            # Read ZIP data
            with open(temp_file.name, 'rb') as f:
                zip_data = f.read()
            
            # Create response
            response = HttpResponse(zip_data, content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{folder_instance.name}.zip"'
            response['Content-Length'] = len(zip_data)
            
            return response
            
        finally:
            # Cleanup
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
    
    def _add_folder_to_zip(self, folder, zip_file, folder_path):
        """Recursively add folder contents to ZIP"""
        import os
        
        # Add files in this folder
        files = UploadedFile.objects.filter(folder=folder)
        for file in files:
            if file.file and os.path.exists(file.file.path):
                arcname = os.path.join(folder_path, file.name)
                zip_file.write(file.file.path, arcname)
        
        # Add subfolders recursively
        subfolders = Folder.objects.filter(parent=folder)
        for subfolder in subfolders:
            subfolder_path = os.path.join(folder_path, subfolder.name)
            self._add_folder_to_zip(subfolder, zip_file, subfolder_path)


class ShareLinkManagementView(APIView):
    """
    Manage share links - CREATE new links for email sharing
    Requires authentication (only for creating links)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create new share links for files/folders"""
        file_ids = request.data.get('file_ids', [])
        folder_ids = request.data.get('folder_ids', [])
        expires_in_days = request.data.get('expires_in_days', 30)  # Default 30 days
        
        if not file_ids and not folder_ids:
            return Response({'error': 'No files or folders specified'}, status=400)
        
        created_links = []
        
        try:
            # Create links for files
            for file_id in file_ids:
                file_instance = get_object_or_404(UploadedFile, id=file_id, owner=request.user)
                
                # Check if link already exists
                existing_link = ShareLink.objects.filter(
                    file=file_instance, 
                    created_by=request.user,
                    is_active=True
                ).first()
                
                if existing_link:
                    created_links.append({
                        'type': 'file',
                        'name': file_instance.name,
                        'share_id': existing_link.share_id,
                        'url': request.build_absolute_uri(f'/share/{existing_link.share_id}/'),
                        'created': False  # Already existed
                    })
                else:
                    # Create new link
                    from django.utils import timezone
                    from datetime import timedelta
                    
                    share_link = ShareLink.objects.create(
                        share_id=ShareLink.generate_share_id(),
                        file=file_instance,
                        created_by=request.user,
                        expires_at=timezone.now() + timedelta(days=expires_in_days) if expires_in_days else None
                    )
                    
                    created_links.append({
                        'type': 'file',
                        'name': file_instance.name,
                        'share_id': share_link.share_id,
                        'url': request.build_absolute_uri(f'/share/{share_link.share_id}/'),
                        'created': True
                    })
            
            # Create links for folders
            for folder_id in folder_ids:
                folder_instance = get_object_or_404(Folder, id=folder_id, owner=request.user)
                
                # Check if link already exists
                existing_link = ShareLink.objects.filter(
                    folder=folder_instance, 
                    created_by=request.user,
                    is_active=True
                ).first()
                
                if existing_link:
                    created_links.append({
                        'type': 'folder',
                        'name': folder_instance.name,
                        'share_id': existing_link.share_id,
                        'url': request.build_absolute_uri(f'/share/{existing_link.share_id}/'),
                        'created': False
                    })
                else:
                    from django.utils import timezone
                    from datetime import timedelta
                    
                    share_link = ShareLink.objects.create(
                        share_id=ShareLink.generate_share_id(),
                        folder=folder_instance,
                        created_by=request.user,
                        expires_at=timezone.now() + timedelta(days=expires_in_days) if expires_in_days else None
                    )
                    
                    created_links.append({
                        'type': 'folder',
                        'name': folder_instance.name,
                        'share_id': share_link.share_id,
                        'url': request.build_absolute_uri(f'/share/{share_link.share_id}/'),
                        'created': True
                    })
            
            return Response({
                'success': True,
                'message': f'Created {len(created_links)} share links',
                'links': created_links
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ============ SEARCH FUNCTIONALITY ============

class SearchView(APIView):
    """
    Search files and folders based on query and scope
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.GET.get('q', '').strip()
        scope = request.GET.get('scope', 'all')
        file_type = request.GET.get('file_type', '')
        date_from = request.GET.get('date_from', '')
        date_to = request.GET.get('date_to', '')
        owner = request.GET.get('owner', '')
        
        if not query:
            return Response({'files': [], 'folders': [], 'total': 0})
        
        # Base querysets
        files_qs = UploadedFile.objects.filter(owner=request.user)
        folders_qs = Folder.objects.filter(owner=request.user)
        
        # Apply scope filters
        if scope == 'starred':
            files_qs = files_qs.filter(is_starred=True)
            folders_qs = folders_qs.filter(is_starred=True)
        elif scope == 'archived':
            files_qs = files_qs.filter(is_archived=True)
            folders_qs = folders_qs.filter(is_archived=True)
        elif scope == 'shared':
            # Files shared with the user
            shared_file_ids = FileSharing.objects.filter(
                shared_with=request.user
            ).values_list('file_id', flat=True)
            files_qs = UploadedFile.objects.filter(id__in=shared_file_ids)
            folders_qs = Folder.objects.none()  # No shared folders for now
        elif scope == 'recent':
            # Files uploaded in the last 30 days
            from datetime import timedelta
            recent_date = timezone.now() - timedelta(days=30)
            files_qs = files_qs.filter(uploaded_at__gte=recent_date)
            folders_qs = folders_qs.filter(created_at__gte=recent_date)
        elif scope == 'files':
            # Only files, no additional filtering
            pass
        # 'all' scope uses base querysets without additional filtering
        
        # Apply text search
        files_qs = files_qs.filter(
            Q(name__icontains=query) | 
            Q(file_type__icontains=query)
        )
        folders_qs = folders_qs.filter(name__icontains=query)
        
        # Apply additional filters
        if file_type:
            files_qs = files_qs.filter(file_type__icontains=file_type)
        
        if date_from:
            try:
                from datetime import datetime
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                files_qs = files_qs.filter(uploaded_at__gte=date_from_obj)
                folders_qs = folders_qs.filter(created_at__gte=date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                from datetime import datetime
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                files_qs = files_qs.filter(uploaded_at__lte=date_to_obj)
                folders_qs = folders_qs.filter(created_at__lte=date_to_obj)
            except ValueError:
                pass
        
        # Limit results for performance
        files_qs = files_qs.order_by('-uploaded_at')[:20]
        folders_qs = folders_qs.order_by('-created_at')[:10]
        
        # Serialize results
        files_data = []
        for file in files_qs:
            files_data.append({
                'id': file.id,
                'name': file.name,
                'type': 'file',
                'file_type': file.file_type,
                'size': file.file_size,
                'uploaded_at': file.uploaded_at.isoformat(),
                'is_starred': file.is_starred,
                'is_archived': file.is_archived,
                'folder_id': file.folder.id if file.folder else None,
                'folder_name': file.folder.name if file.folder else None,
            })
        
        folders_data = []
        for folder in folders_qs:
            folders_data.append({
                'id': folder.id,
                'name': folder.name,
                'type': 'folder',
                'created_at': folder.created_at.isoformat(),
                'is_starred': folder.is_starred,
                'parent_id': folder.parent.id if folder.parent else None,
                'parent_name': folder.parent.name if folder.parent else None,
            })
        
        # Combine and sort results by relevance/date
        all_results = files_data + folders_data
        
        return Response({
            'files': files_data,
            'folders': folders_data,
            'results': all_results,  # Combined for frontend convenience
            'total': len(all_results)
        })


# ============ DASHBOARD ANALYTICS ============

class DashboardStatsView(APIView):
    """
    Get dashboard statistics for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get current month and previous month for comparison
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        
        # Total files count
        total_files = UploadedFile.objects.filter(owner=user).count()
        total_files_prev = UploadedFile.objects.filter(
            owner=user, 
            uploaded_at__lt=current_month_start
        ).count()
        
        # Total folders count
        total_folders = Folder.objects.filter(owner=user).count()
        total_folders_prev = Folder.objects.filter(
            owner=user, 
            created_at__lt=current_month_start
        ).count()
        
        # Starred files count
        starred_files = UploadedFile.objects.filter(owner=user, is_starred=True).count()
        starred_files_prev = UploadedFile.objects.filter(
            owner=user, 
            is_starred=True,
            uploaded_at__lt=current_month_start
        ).count()
        
        # Storage used (sum of file sizes)
        from django.db.models import Sum
        storage_used = UploadedFile.objects.filter(owner=user).aggregate(
            total_size=Sum('file_size')
        )['total_size'] or 0
        
        storage_used_prev = UploadedFile.objects.filter(
            owner=user,
            uploaded_at__lt=current_month_start
        ).aggregate(total_size=Sum('file_size'))['total_size'] or 0
        
        # Files uploaded this month
        files_this_month = UploadedFile.objects.filter(
            owner=user,
            uploaded_at__gte=current_month_start,
            uploaded_at__lt=now
        ).count()
        
        files_prev_month = UploadedFile.objects.filter(
            owner=user,
            uploaded_at__gte=previous_month_start,
            uploaded_at__lt=current_month_start
        ).count()
        
        # Calculate percentage changes
        def calculate_change(current, previous):
            if previous == 0:
                return 100 if current > 0 else 0
            return round(((current - previous) / previous) * 100, 1)
        
        # Format storage size
        def format_storage_size(bytes_size):
            if bytes_size < 1024:
                return f"{bytes_size} B"
            elif bytes_size < 1024 * 1024:
                return f"{round(bytes_size / 1024, 1)} KB"
            elif bytes_size < 1024 * 1024 * 1024:
                return f"{round(bytes_size / (1024 * 1024), 1)} MB"
            else:
                return f"{round(bytes_size / (1024 * 1024 * 1024), 1)} GB"
        
        return Response({
            'total_files': {
                'value': total_files,
                'change': calculate_change(total_files, total_files_prev)
            },
            'total_folders': {
                'value': total_folders,
                'change': calculate_change(total_folders, total_folders_prev)
            },
            'starred_files': {
                'value': starred_files,
                'change': calculate_change(starred_files, starred_files_prev)
            },
            'storage_used': {
                'value': storage_used,
                'formatted': format_storage_size(storage_used),
                'change_bytes': storage_used - storage_used_prev,
                'change_formatted': format_storage_size(abs(storage_used - storage_used_prev))
            },
            'files_this_month': {
                'value': files_this_month,
                'change': calculate_change(files_this_month, files_prev_month)
            }
        })


class DashboardRecentActivityView(APIView):
    """
    Get recent activity for dashboard
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user = request.user
            limit = int(request.GET.get('limit', 10))
            
            # Get recent files (uploaded in last 30 days)
            from datetime import timedelta
            recent_date = timezone.now() - timedelta(days=30)
            
            recent_files = UploadedFile.objects.filter(
                owner=user,
                uploaded_at__gte=recent_date
            ).order_by('-uploaded_at')[:limit]
            
            activities = []
            for file in recent_files:
                activities.append({
                    'id': f"upload_{file.id}",
                    'type': 'upload',
                    'user': {
                        'name': file.owner.get_full_name() or file.owner.username,
                    },
                    'file': {
                        'name': file.name,
                        'id': file.id
                    },
                    'timestamp': file.uploaded_at.isoformat(),
                    'description': 'uploaded'
                })
            
            # Get recent folders created
            recent_folders = Folder.objects.filter(
                owner=user,
                created_at__gte=recent_date
            ).order_by('-created_at')[:5]
            
            for folder in recent_folders:
                activities.append({
                    'id': f"folder_{folder.id}",
                    'type': 'upload',
                    'user': {
                        'name': folder.owner.get_full_name() or folder.owner.username,
                    },
                    'file': {
                        'name': folder.name,
                        'id': folder.id
                    },
                    'timestamp': folder.created_at.isoformat(),
                    'description': 'created folder'
                })
            
            # Sort all activities by timestamp
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return Response({
                'activities': activities[:limit]
            })
            
        except Exception as e:
            # Return empty activities on error to prevent 500
            return Response({
                'activities': []
            })