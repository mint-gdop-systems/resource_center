"""
Enhanced sharing views that combine individual and group sharing
Extends existing sharing functionality to include group-based sharing
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone

from .models import UploadedFile, FileSharing, Folder, GroupSharing, UserProfile
from .serializers import (
    FileSharingSerializer, GroupSharingSerializer, CombinedSharingSerializer,
    UploadedFileSerializer, FolderSerializer
)


class CombinedSharedWithMeView(APIView):
    """
    Enhanced view that shows both individual and group shares
    Combines resources shared individually and through groups
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all files and folders shared with the current user (individual + group)"""
        try:
            user = request.user
            
            # Update last_shared_visit timestamp
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.last_shared_visit = timezone.now()
            profile.save()
            
            # Get individual shares
            individual_shares = FileSharing.objects.filter(
                shared_to=user
            ).select_related('file', 'folder', 'shared_by').order_by('-shared_at')
            
            # Get group shares
            group_shares = GroupSharing.objects.filter(
                group__memberships__user=user,
                group__memberships__is_active=True
            ).select_related('file', 'folder', 'group', 'shared_by').order_by('-shared_at')
            
            # Serialize data
            individual_serializer = FileSharingSerializer(
                individual_shares, 
                many=True, 
                context={'request': request}
            )
            group_serializer = GroupSharingSerializer(
                group_shares, 
                many=True, 
                context={'request': request}
            )
            
            # Separate by type for easier frontend handling
            individual_files = [s for s in individual_serializer.data if s.get('share_type') == 'FILE']
            individual_folders = [s for s in individual_serializer.data if s.get('share_type') == 'FOLDER']
            
            group_files = [s for s in group_serializer.data if s.get('share_type') == 'FILE']
            group_folders = [s for s in group_serializer.data if s.get('share_type') == 'FOLDER']
            
            return Response({
                'individual_shares': {
                    'all': individual_serializer.data,
                    'files': individual_files,
                    'folders': individual_folders,
                    'count': len(individual_serializer.data)
                },
                'group_shares': {
                    'all': group_serializer.data,
                    'files': group_files,
                    'folders': group_folders,
                    'count': len(group_serializer.data)
                },
                'combined': {
                    'total_files': len(individual_files) + len(group_files),
                    'total_folders': len(individual_folders) + len(group_folders),
                    'total_all': len(individual_serializer.data) + len(group_serializer.data)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to retrieve shared resources: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AllAccessibleResourcesView(APIView):
    """
    Get all resources accessible to the user
    Includes owned, individually shared, and group shared resources
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all accessible files and folders"""
        try:
            user = request.user
            
            # Get owned files and folders
            owned_files = UploadedFile.objects.filter(owner=user)
            owned_folders = Folder.objects.filter(owner=user)
            
            # Get individually shared files and folders
            individually_shared_files = UploadedFile.objects.filter(
                filesharing__shared_to=user
            ).exclude(owner=user)  # Exclude owned files to avoid duplicates
            
            individually_shared_folders = Folder.objects.filter(
                filesharing__shared_to=user
            ).exclude(owner=user)  # Exclude owned folders to avoid duplicates
            
            # Get group shared files and folders
            group_shared_files = UploadedFile.objects.filter(
                groupsharing__group__memberships__user=user,
                groupsharing__group__memberships__is_active=True
            ).exclude(owner=user)  # Exclude owned files to avoid duplicates
            
            group_shared_folders = Folder.objects.filter(
                groupsharing__group__memberships__user=user,
                groupsharing__group__memberships__is_active=True
            ).exclude(owner=user)  # Exclude owned folders to avoid duplicates
            
            # Combine and remove duplicates
            all_files = owned_files.union(individually_shared_files, group_shared_files)
            all_folders = owned_folders.union(individually_shared_folders, group_shared_folders)
            
            # Serialize data
            files_serializer = UploadedFileSerializer(
                all_files, 
                many=True, 
                context={'request': request}
            )
            folders_serializer = FolderSerializer(
                all_folders, 
                many=True, 
                context={'request': request}
            )
            
            # Add access context to each item
            files_data = []
            for file_data in files_serializer.data:
                file_obj = UploadedFile.objects.get(id=file_data['id'])
                access_type = self._get_access_type(user, file_obj)
                file_data['access_type'] = access_type
                files_data.append(file_data)
            
            folders_data = []
            for folder_data in folders_serializer.data:
                folder_obj = Folder.objects.get(id=folder_data['id'])
                access_type = self._get_access_type(user, folder_obj)
                folder_data['access_type'] = access_type
                folders_data.append(folder_data)
            
            return Response({
                'files': files_data,
                'folders': folders_data,
                'summary': {
                    'total_files': len(files_data),
                    'total_folders': len(folders_data),
                    'owned_files': owned_files.count(),
                    'owned_folders': owned_folders.count(),
                    'individually_shared_files': individually_shared_files.count(),
                    'individually_shared_folders': individually_shared_folders.count(),
                    'group_shared_files': group_shared_files.count(),
                    'group_shared_folders': group_shared_folders.count()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to retrieve accessible resources: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_access_type(self, user, resource):
        """Determine how user has access to this resource"""
        if resource.owner == user:
            return 'owned'
        
        # Check individual sharing
        if hasattr(resource, 'filesharing_set'):
            if resource.filesharing_set.filter(shared_to=user).exists():
                return 'individually_shared'
        
        # Check group sharing
        if hasattr(resource, 'groupsharing_set'):
            if resource.groupsharing_set.filter(
                group__memberships__user=user,
                group__memberships__is_active=True
            ).exists():
                return 'group_shared'
        
        return 'unknown'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def combined_unseen_count(request):
    """
    Get count of unseen shared items (both individual and group shares)
    """
    try:
        user = request.user
        
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        individual_count = 0
        group_count = 0
        
        if not profile.last_shared_visit:
            # If user has never visited, count all shares
            individual_count = FileSharing.objects.filter(shared_to=user).count()
            group_count = GroupSharing.objects.filter(
                group__memberships__user=user,
                group__memberships__is_active=True
            ).count()
        else:
            # Count shares newer than last visit
            individual_count = FileSharing.objects.filter(
                shared_to=user,
                shared_at__gt=profile.last_shared_visit
            ).count()
            
            group_count = GroupSharing.objects.filter(
                group__memberships__user=user,
                group__memberships__is_active=True,
                shared_at__gt=profile.last_shared_visit
            ).count()
        
        total_count = individual_count + group_count
        
        return Response({
            'individual_count': individual_count,
            'group_count': group_count,
            'total_count': total_count
        })
        
    except Exception as e:
        return Response({
            'individual_count': 0,
            'group_count': 0,
            'total_count': 0,
            'error': str(e)
        })


class EnhancedShareItemView(APIView):
    """
    Enhanced sharing view that supports both individual and group sharing
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Share files/folders with users and/or groups"""
        try:
            file_ids = request.data.get("file_ids", [])
            folder_ids = request.data.get("folder_ids", [])
            user_emails = request.data.get("user_emails", [])  # Individual sharing
            group_ids = request.data.get("group_ids", [])      # Group sharing
            message = request.data.get("message", "")
            
            # Validate input
            if not user_emails and not group_ids:
                return Response(
                    {"error": "At least one recipient (user email or group) is required."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not file_ids and not folder_ids:
                return Response(
                    {"error": "At least one file or folder must be selected."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            results = {
                'individual_sharing': {'success': [], 'errors': []},
                'group_sharing': {'success': [], 'errors': []},
                'total_shares_created': 0
            }
            
            # Handle individual sharing (existing logic)
            if user_emails:
                from .sharing_views import ShareItemView
                individual_view = ShareItemView()
                individual_data = {
                    'file_ids': file_ids,
                    'folder_ids': folder_ids,
                    'emails': user_emails,
                    'message': message
                }
                individual_request = request
                individual_request.data = individual_data
                individual_response = individual_view.post(individual_request)
                
                if individual_response.status_code in [201, 207]:
                    results['individual_sharing'] = individual_response.data
                    results['total_shares_created'] += individual_response.data.get('total_shares_created', 0)
                else:
                    results['individual_sharing']['errors'].append(individual_response.data.get('error', 'Unknown error'))
            
            # Handle group sharing (new logic)
            if group_ids:
                from .group_views import GroupSharingView
                group_view = GroupSharingView()
                group_data = {
                    'file_ids': file_ids,
                    'folder_ids': folder_ids,
                    'group_ids': group_ids,
                    'message': message
                }
                group_request = request
                group_request.data = group_data
                group_response = group_view.post(group_request)
                
                if group_response.status_code == 201:
                    results['group_sharing'] = group_response.data
                    results['total_shares_created'] += group_response.data.get('total_shares_created', 0)
                else:
                    results['group_sharing']['errors'].append(group_response.data.get('error', 'Unknown error'))
            
            # Determine overall status
            has_errors = (
                results['individual_sharing']['errors'] or 
                results['group_sharing']['errors']
            )
            
            if has_errors and results['total_shares_created'] == 0:
                return Response(results, status=status.HTTP_400_BAD_REQUEST)
            elif has_errors:
                return Response(results, status=status.HTTP_207_MULTI_STATUS)
            else:
                return Response(results, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to process sharing request: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )