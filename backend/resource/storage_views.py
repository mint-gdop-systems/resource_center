from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db.models import Sum
from django.shortcuts import get_object_or_404

from .models import UserProfile, UploadedFile
from .serializers import StorageQuotaSerializer, UserProfileSerializer


class StorageQuotaView(APIView):
    """
    API view for managing user storage quotas
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's storage quota information"""
        profile = UserProfile.get_or_create_profile(request.user)
        serializer = StorageQuotaSerializer(profile)
        return Response(serializer.data)
    
    def patch(self, request):
        """Update current user's storage quota (admin only)"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only administrators can modify storage quotas'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        profile = UserProfile.get_or_create_profile(request.user)
        
        # Only allow updating storage_quota
        if 'storage_quota' in request.data:
            new_quota = request.data['storage_quota']
            if new_quota < 0:
                return Response(
                    {'error': 'Storage quota cannot be negative'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            profile.storage_quota = new_quota
            profile.save(update_fields=['storage_quota'])
        
        serializer = StorageQuotaSerializer(profile)
        return Response(serializer.data)


class UserStorageQuotaView(APIView):
    """
    API view for managing other users' storage quotas (admin only)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        """Get specific user's storage quota information"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only administrators can view other users\' storage quotas'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = get_object_or_404(User, id=user_id)
        profile = UserProfile.get_or_create_profile(user)
        serializer = StorageQuotaSerializer(profile)
        return Response(serializer.data)
    
    def patch(self, request, user_id):
        """Update specific user's storage quota (admin only)"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only administrators can modify storage quotas'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = get_object_or_404(User, id=user_id)
        profile = UserProfile.get_or_create_profile(user)
        
        # Only allow updating storage_quota
        if 'storage_quota' in request.data:
            new_quota = request.data['storage_quota']
            if new_quota < 0:
                return Response(
                    {'error': 'Storage quota cannot be negative'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            profile.storage_quota = new_quota
            profile.save(update_fields=['storage_quota'])
        
        serializer = StorageQuotaSerializer(profile)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recalculate_storage_usage(request):
    """
    Recalculate storage usage for current user or all users (admin only)
    """
    user_id = request.data.get('user_id')
    
    if user_id:
        # Recalculate for specific user (admin only)
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only administrators can recalculate other users\' storage'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        user = get_object_or_404(User, id=user_id)
        profile = UserProfile.get_or_create_profile(user)
        new_usage = profile.update_storage_used()
        
        return Response({
            'message': f'Storage usage recalculated for user {user.username}',
            'user_id': user.id,
            'new_storage_used': new_usage,
            'storage_used_mb': round(new_usage / (1024 * 1024), 2)
        })
    
    elif request.data.get('all_users') and request.user.is_superuser:
        # Recalculate for all users (admin only)
        updated_count = 0
        for profile in UserProfile.objects.all():
            profile.update_storage_used()
            updated_count += 1
        
        return Response({
            'message': f'Storage usage recalculated for {updated_count} users'
        })
    
    else:
        # Recalculate for current user
        profile = UserProfile.get_or_create_profile(request.user)
        new_usage = profile.update_storage_used()
        
        return Response({
            'message': 'Storage usage recalculated',
            'new_storage_used': new_usage,
            'storage_used_mb': round(new_usage / (1024 * 1024), 2)
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_upload_capacity(request):
    """
    Check if user can upload files of given sizes
    """
    file_sizes = request.GET.getlist('file_size')
    
    if not file_sizes:
        return Response(
            {'error': 'file_size parameter is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        file_sizes = [int(size) for size in file_sizes]
    except ValueError:
        return Response(
            {'error': 'file_size must be integers'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    profile = UserProfile.get_or_create_profile(request.user)
    total_size = sum(file_sizes)
    
    can_upload = profile.can_upload_file(total_size)
    remaining_storage = profile.get_remaining_storage()
    
    return Response({
        'can_upload': can_upload,
        'total_file_size': total_size,
        'total_file_size_mb': round(total_size / (1024 * 1024), 2),
        'remaining_storage': remaining_storage,
        'remaining_storage_mb': round(remaining_storage / (1024 * 1024), 2),
        'storage_quota': profile.storage_quota,
        'storage_used': profile.storage_used,
        'usage_percentage': round(profile.get_storage_usage_percentage(), 2)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def storage_statistics(request):
    """
    Get storage statistics for admin dashboard
    """
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only administrators can view storage statistics'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all user profiles
    profiles = UserProfile.objects.all()
    
    # Calculate statistics
    total_users = profiles.count()
    total_quota = profiles.aggregate(Sum('storage_quota'))['storage_quota__sum'] or 0
    total_used = profiles.aggregate(Sum('storage_used'))['storage_used__sum'] or 0
    
    # Users near limit (>80%)
    near_limit_count = 0
    over_limit_count = 0
    
    for profile in profiles:
        usage_percentage = profile.get_storage_usage_percentage()
        if usage_percentage >= 100:
            over_limit_count += 1
        elif usage_percentage >= 80:
            near_limit_count += 1
    
    return Response({
        'total_users': total_users,
        'total_quota': total_quota,
        'total_quota_gb': round(total_quota / (1024 * 1024 * 1024), 2),
        'total_used': total_used,
        'total_used_gb': round(total_used / (1024 * 1024 * 1024), 2),
        'total_usage_percentage': round((total_used / total_quota * 100) if total_quota > 0 else 0, 2),
        'users_near_limit': near_limit_count,
        'users_over_limit': over_limit_count,
        'users_normal': total_users - near_limit_count - over_limit_count
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users_storage(request):
    """
    Get all users with their storage information for admin management
    """
    if not request.user.is_superuser:
        return Response(
            {'error': 'Only administrators can view users storage information'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    users_data = []
    users = User.objects.all().order_by('username')
    
    for user in users:
        profile = UserProfile.get_or_create_profile(user)
        usage_percentage = profile.get_storage_usage_percentage()
        remaining_storage = profile.get_remaining_storage()
        
        users_data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'storage_quota': profile.storage_quota,
            'storage_used': profile.storage_used,
            'storage_usage_percentage': round(usage_percentage, 2),
            'remaining_storage': remaining_storage,
            'is_near_limit': usage_percentage >= 80 and usage_percentage < 100,
            'is_over_limit': usage_percentage >= 100,
        })
    
    return Response(users_data)