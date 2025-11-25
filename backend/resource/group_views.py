"""
API views for group management functionality
Handles group CRUD, membership management, and group sharing
"""

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import transaction, IntegrityError
from django.db.models import Q
from django.utils import timezone

from .models import Group, GroupMembership, GroupSharing, UploadedFile, Folder
from .serializers import (
    GroupSerializer, GroupMembershipSerializer, GroupSharingSerializer,
    GroupCreateSerializer, GroupUpdateSerializer, GroupMemberAddSerializer
)
from .permissions import (
    IsSystemAdmin, IsGroupAdminOrSystemAdmin, CanManageGroupMembers,
    CanShareWithGroup, get_user_manageable_groups, get_user_accessible_groups
)
from .permission_manager import permission_manager
from .mixins import (
    GroupManagementMixin, GroupMembershipMixin, GroupSharingMixin, 
    ResourceAccessMixin, GroupContextMixin
)


class GroupListCreateView(APIView, GroupManagementMixin):
    """
    List all groups (for admins) or create new groups (System Admin only)
    
    GET: List groups based on user permissions
    POST: Create new group (System Admin only)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get groups based on user permissions"""
        try:
            user = request.user
            user_role = permission_manager.get_user_role(user)
            
            if user_role == 'system_admin':
                # System admins see all groups
                groups = Group.objects.filter(is_active=True).order_by('name')
                context_type = 'all'
            else:
                # Regular users see only groups they belong to
                groups = get_user_accessible_groups(user)
                context_type = 'accessible'
            
            serializer = GroupSerializer(groups, many=True, context={'request': request})
            
            return Response({
                'groups': serializer.data,
                'context_type': context_type,
                'total_count': groups.count(),
                'user_permissions': {
                    'can_create_groups': permission_manager.has_permission(user, 'groups.create'),
                    'is_system_admin': user_role == 'system_admin'
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve groups: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Create new group (System Admin only)"""
        try:
            # Check system admin permission using permission manager
            if not permission_manager.has_permission(request.user, 'groups.create'):
                return Response(
                    {'error': 'Only system administrators can create groups'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = GroupCreateSerializer(data=request.data)
            if serializer.is_valid():
                group = serializer.save(created_by=request.user)
                
                response_serializer = GroupSerializer(group, context={'request': request})
                return Response({
                    'message': 'Group created successfully',
                    'group': response_serializer.data
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'error': 'Invalid data provided',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create group: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GroupDetailView(APIView, GroupManagementMixin):
    """
    Retrieve, update, or delete a specific group
    
    GET: Get group details (members can view, admins get full details)
    PUT: Update group (System Admin only)
    DELETE: Delete group (System Admin only)
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, group_id, user):
        """Get group with permission checking"""
        group = get_object_or_404(Group, id=group_id, is_active=True)
        
        # Check if user has access to view this group using permission manager
        user_role = permission_manager.get_user_role(user, group)
        if not user_role:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have permission to view this group")
        
        return group
    
    def get(self, request, group_id):
        """Get group details"""
        try:
            group = self.get_object(group_id, request.user)
            serializer = GroupSerializer(group, context={'request': request})
            
            # Add additional context for group members/admins using permission manager
            user_role = permission_manager.get_user_role(request.user, group)
            response_data = {
                'group': serializer.data,
                'user_permissions': {
                    'can_manage_group': permission_manager.can_manage_group(request.user, group),
                    'can_add_members': permission_manager.can_add_members(request.user, group),
                    'can_remove_members': permission_manager.can_remove_members(request.user, group),
                    'is_member': user_role in ['group_member', 'group_admin'],
                    'is_admin': user_role == 'group_admin',
                    'is_system_admin': user_role == 'system_admin'
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve group: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request, group_id):
        """Update group (System Admin or Group Admin)"""
        try:
            group = self.get_group_or_404(group_id)
            
            # Check if user has permission to update this group using permission manager
            if not permission_manager.has_permission(request.user, 'groups.update', group):
                user_role = permission_manager.get_user_role(request.user, group)
                if user_role == 'system_admin':
                    error_msg = 'System administrators can update any group'
                elif user_role == 'group_admin':
                    error_msg = 'Group administrators can only update groups they manage'
                else:
                    error_msg = 'Only system administrators and group administrators can update groups'
                
                return Response(
                    {'error': error_msg}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get user role to determine what fields can be updated
            user_role = permission_manager.get_user_role(request.user, group)
            
            # Validate update data based on user role
            allowed_fields = self.get_allowed_update_fields(user_role, request.data)
            filtered_data = {k: v for k, v in request.data.items() if k in allowed_fields}
            
            if not filtered_data:
                return Response({
                    'error': 'No valid fields provided for update',
                    'allowed_fields': list(allowed_fields)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = GroupUpdateSerializer(group, data=filtered_data, partial=True)
            if serializer.is_valid():
                group = serializer.save()
                
                response_serializer = GroupSerializer(group, context={'request': request})
                return Response({
                    'message': 'Group updated successfully',
                    'group': response_serializer.data
                }, status=status.HTTP_200_OK)
            
            return Response({
                'error': 'Invalid data provided',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to update group: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_allowed_update_fields(self, user_role, request_data):
        """Get fields that the user is allowed to update based on their role"""
        if user_role == 'system_admin':
            # System admins can update all fields
            return {'name', 'description', 'is_active'}
        elif user_role == 'group_admin':
            # Group admins can update name and description, but not is_active
            allowed = {'name', 'description'}
            
            # If they try to update is_active, we'll warn them but not fail
            if 'is_active' in request_data:
                # We could log this or add a warning to the response
                pass
            
            return allowed
        else:
            # Other roles cannot update groups
            return set()
    
    def delete(self, request, group_id):
        """Delete group (System Admin only)"""
        try:
            self.check_system_admin_permission(request.user)
            group = self.get_group_or_404(group_id)
            
            group_name = group.name
            
            # Soft delete by setting is_active to False
            group.is_active = False
            group.save()
            
            return Response({
                'message': f'Group "{group_name}" has been deactivated successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to delete group: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GroupMembershipView(APIView, GroupMembershipMixin):
    """
    Manage group memberships
    
    GET: List group members
    POST: Add member to group
    DELETE: Remove member from group
    """
    permission_classes = [IsAuthenticated, CanManageGroupMembers]
    
    def get(self, request, group_id):
        """List group members"""
        try:
            group = get_object_or_404(Group, id=group_id, is_active=True)
            
            # Check if user can view members (members can view, admins get full details)
            if not request.user.is_superuser and not group.is_user_member(request.user):
                return Response(
                    {'error': 'You must be a member of this group to view its members'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            memberships = GroupMembership.objects.filter(
                group=group, 
                is_active=True
            ).select_related('user', 'added_by').order_by('role', 'user__first_name', 'user__username')
            
            serializer = GroupMembershipSerializer(memberships, many=True, context={'request': request})
            
            # Separate members by role for easier frontend handling
            admins = [m for m in serializer.data if m['role'] == GroupMembership.ADMIN]
            members = [m for m in serializer.data if m['role'] == GroupMembership.MEMBER]
            
            return Response({
                'group_id': group.id,
                'group_name': group.name,
                'memberships': serializer.data,
                'admins': admins,
                'members': members,
                'total_count': len(serializer.data),
                'admin_count': len(admins),
                'member_count': len(members)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve group members: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request, group_id):
        """Add member to group"""
        try:
            group = get_object_or_404(Group, id=group_id, is_active=True)
            self.check_add_member_permission(request.user, group)
            
            # Validate and create membership
            user, role, message = self.validate_membership_data(request.data, group)
            membership = self.create_membership(group, user, role, request.user, message)
            
            serializer = GroupMembershipSerializer(membership, context={'request': request})
            
            return Response({
                'message': f'User {user.username} added to group {group.name} successfully',
                'membership': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to add member: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, group_id):
        """Remove member from group"""
        try:
            group = get_object_or_404(Group, id=group_id, is_active=True)
            user_id = request.data.get('user_id')
            
            if not user_id:
                return Response(
                    {'error': 'User ID is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                target_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'User not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check permission to remove this specific user
            self.check_remove_member_permission(request.user, group, target_user)
            
            # Find and deactivate membership
            try:
                membership = GroupMembership.objects.get(
                    group=group, 
                    user=target_user, 
                    is_active=True
                )
                membership.is_active = False
                membership.save()
                
                return Response({
                    'message': f'User {target_user.username} removed from group {group.name} successfully'
                }, status=status.HTTP_200_OK)
                
            except GroupMembership.DoesNotExist:
                return Response(
                    {'error': 'User is not a member of this group'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
        except Exception as e:
            return Response(
                {'error': f'Failed to remove member: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GroupSharingView(APIView, GroupSharingMixin):
    """
    Share files/folders with groups
    
    POST: Share resources with groups
    GET: List resources shared with groups (by current user)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get resources shared by current user with groups"""
        try:
            shares = GroupSharing.objects.filter(
                shared_by=request.user
            ).select_related('file', 'folder', 'group').order_by('-shared_at')
            
            serializer = GroupSharingSerializer(shares, many=True, context={'request': request})
            
            # Separate by type for easier frontend handling
            file_shares = [s for s in serializer.data if s['share_type'] == 'FILE']
            folder_shares = [s for s in serializer.data if s['share_type'] == 'FOLDER']
            
            return Response({
                'shares': serializer.data,
                'file_shares': file_shares,
                'folder_shares': folder_shares,
                'total_count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve group shares: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Share files/folders with groups"""
        try:
            # Validate sharing data
            file_ids, folder_ids, group_ids = self.validate_sharing_data(request.data)
            message = request.data.get('message', '')
            can_download = request.data.get('can_download', True)
            can_reshare = request.data.get('can_reshare', False)
            is_reshare = request.data.get('is_reshare', False)
            permission_level = request.data.get('permission_level', 'view')  # Default to view-only
            
            # Validate permission level
            valid_permissions = ['view', 'edit', 'comment', 'owner']
            if permission_level not in valid_permissions:
                permission_level = 'view'  # Default to view if invalid
            
            # Get user's resources with proper permission checks for resharing
            files, folders = self.get_user_resources(request.user, file_ids, folder_ids, is_reshare)
            
            # Get groups user can share with
            groups = self.get_user_groups(request.user, group_ids)
            
            # Validate sharing permissions for each resource-group combination
            for group in groups:
                for file in files:
                    self.check_sharing_permission(request.user, file, group, is_reshare)
                for folder in folders:
                    self.check_sharing_permission(request.user, folder, group, is_reshare)
            
            # Create group shares with permissions
            created_shares = self.create_group_shares(
                files, folders, groups, request.user, message, can_download, can_reshare, permission_level
            )
            
            # Prepare response
            response_data = {
                'message': f'Successfully shared {len(files) + len(folders)} item(s) with {len(groups)} group(s)',
                'shared_items': {
                    'files': [f.name for f in files],
                    'folders': [f.name for f in folders]
                },
                'shared_with_groups': [g.name for g in groups],
                'total_shares_created': len(created_shares),
                'permissions': {
                    'can_download': can_download,
                    'can_reshare': can_reshare
                }
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to share with groups: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GroupSharedWithMeView(APIView, ResourceAccessMixin):
    """
    Get resources shared with user through groups
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all resources shared with user through group memberships"""
        try:
            user = request.user
            
            # Get group shares where user is a member
            group_shares = GroupSharing.objects.filter(
                group__memberships__user=user,
                group__memberships__is_active=True
            ).select_related('file', 'folder', 'group', 'shared_by').order_by('-shared_at')
            
            serializer = GroupSharingSerializer(group_shares, many=True, context={'request': request})
            
            # Separate by type and add group context
            file_shares = []
            folder_shares = []
            
            for share_data in serializer.data:
                if share_data['share_type'] == 'FILE':
                    file_shares.append(share_data)
                else:
                    folder_shares.append(share_data)
            
            # Get user's groups for context
            user_groups = get_user_accessible_groups(user)
            group_context = [{'id': g.id, 'name': g.name} for g in user_groups]
            
            return Response({
                'group_shares': serializer.data,
                'file_shares': file_shares,
                'folder_shares': folder_shares,
                'total_count': len(serializer.data),
                'user_groups': group_context,
                'groups_count': len(group_context)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve group shared resources: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserGroupContextView(APIView, GroupContextMixin):
    """
    Get comprehensive group context for the current user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's group context and permissions"""
        try:
            context = self.get_user_groups_context(request.user)
            
            # Add serialized group data
            member_groups_data = GroupSerializer(
                context['member_groups'], 
                many=True, 
                context={'request': request}
            ).data
            
            admin_groups_data = GroupSerializer(
                context['admin_groups'], 
                many=True, 
                context={'request': request}
            ).data
            
            manageable_groups_data = GroupSerializer(
                context['manageable_groups'], 
                many=True, 
                context={'request': request}
            ).data
            
            return Response({
                'user_context': {
                    'is_system_admin': context['is_system_admin'],
                    'total_groups': context['total_groups'],
                    'admin_of_count': context['admin_of_count']
                },
                'member_groups': member_groups_data,
                'admin_groups': admin_groups_data,
                'manageable_groups': manageable_groups_data,
                'permissions': {
                    'can_create_groups': request.user.is_superuser,
                    'can_manage_any_group': request.user.is_superuser,
                    'managed_groups_count': len(manageable_groups_data)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve user group context: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Function-based views for specific operations

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_group_admin(request, group_id):
    """
    Assign a user as group admin (System Admin only)
    """
    try:
        # Check system admin permission
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only system administrators can assign group admins'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        group = get_object_or_404(Group, id=group_id, is_active=True)
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'User ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is already a member
        membership, created = GroupMembership.objects.get_or_create(
            group=group,
            user=user,
            defaults={
                'role': GroupMembership.ADMIN,
                'added_by': request.user,
                'is_active': True
            }
        )
        
        if not created:
            # Update existing membership to admin
            membership.role = GroupMembership.ADMIN
            membership.is_active = True
            membership.save()
            message = f'User {user.username} promoted to admin of group {group.name}'
        else:
            message = f'User {user.username} added as admin of group {group.name}'
        
        serializer = GroupMembershipSerializer(membership, context={'request': request})
        
        return Response({
            'message': message,
            'membership': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to assign group admin: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_statistics(request, group_id):
    """
    Get statistics for a specific group
    """
    try:
        group = get_object_or_404(Group, id=group_id, is_active=True)
        
        # Check if user can view group stats
        if not request.user.is_superuser and not group.is_user_member(request.user):
            return Response(
                {'error': 'You must be a member of this group to view its statistics'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate statistics
        total_members = group.get_member_count()
        admin_count = group.get_admins().count()
        
        # Shared resources statistics
        shared_files = GroupSharing.objects.filter(group=group, share_type=GroupSharing.FILE).count()
        shared_folders = GroupSharing.objects.filter(group=group, share_type=GroupSharing.FOLDER).count()
        
        # Recent activity (last 30 days)
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_shares = GroupSharing.objects.filter(
            group=group, 
            shared_at__gte=thirty_days_ago
        ).count()
        
        recent_members = GroupMembership.objects.filter(
            group=group, 
            added_at__gte=thirty_days_ago,
            is_active=True
        ).count()
        
        return Response({
            'group_id': group.id,
            'group_name': group.name,
            'statistics': {
                'members': {
                    'total': total_members,
                    'admins': admin_count,
                    'regular_members': total_members - admin_count,
                    'recent_additions': recent_members
                },
                'shared_resources': {
                    'total_files': shared_files,
                    'total_folders': shared_folders,
                    'total_items': shared_files + shared_folders,
                    'recent_shares': recent_shares
                },
                'activity': {
                    'recent_shares_30d': recent_shares,
                    'recent_members_30d': recent_members
                }
            },
            'user_role': {
                'is_member': group.is_user_member(request.user),
                'is_admin': group.is_user_admin(request.user),
                'is_system_admin': request.user.is_superuser
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to retrieve group statistics: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Search for users to add to groups
    Supports autocomplete/typeahead functionality
    """
    try:
        query = request.GET.get('q', '').strip()
        group_id = request.GET.get('group_id')
        limit = min(int(request.GET.get('limit', 10)), 50)  # Max 50 results
        
        if not query or len(query) < 2:
            return Response({
                'users': [],
                'message': 'Query must be at least 2 characters long'
            }, status=status.HTTP_200_OK)
        
        # Check permissions - user must be able to add members to the group
        if group_id:
            try:
                group = get_object_or_404(Group, id=group_id, is_active=True)
                if not permission_manager.can_add_members(request.user, group):
                    return Response(
                        {'error': 'You do not have permission to add members to this group'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Group.DoesNotExist:
                return Response(
                    {'error': 'Group not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Search users by username, email, first_name, or last_name
        users_query = User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).filter(is_active=True)
        
        # Exclude users already in the group if group_id is provided
        if group_id:
            existing_member_ids = GroupMembership.objects.filter(
                group_id=group_id,
                is_active=True
            ).values_list('user_id', flat=True)
            users_query = users_query.exclude(id__in=existing_member_ids)
        
        # Exclude the current user (they're already in the group or shouldn't add themselves)
        users_query = users_query.exclude(id=request.user.id)
        
        # Order by relevance and limit results
        users = users_query.order_by('first_name', 'last_name', 'username')[:limit]
        
        # Format user data for frontend
        user_data = []
        for user in users:
            display_name = f"{user.first_name} {user.last_name}".strip()
            if not display_name:
                display_name = user.username
            
            user_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'display_name': display_name,
                'full_display': f"{display_name} ({user.email})" if user.email else display_name
            })
        
        return Response({
            'users': user_data,
            'query': query,
            'total_found': len(user_data),
            'limit_reached': len(users) == limit
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to search users: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_roles_for_group(request, group_id):
    """
    Get available roles that the current user can assign in a group
    """
    try:
        group = get_object_or_404(Group, id=group_id, is_active=True)
        
        # Check if user can add members
        if not permission_manager.can_add_members(request.user, group):
            return Response(
                {'error': 'You do not have permission to add members to this group'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_role = permission_manager.get_user_role(request.user)
        available_roles = []
        
        # System admins can assign any role
        if user_role == 'system_admin':
            available_roles = [
                {'value': 'MEMBER', 'label': 'Member', 'description': 'Can access shared resources and participate in the group'},
                {'value': 'ADMIN', 'label': 'Admin', 'description': 'Can manage group members and settings'}
            ]
        # Group admins can only assign member role (not other admins)
        elif permission_manager.can_manage_group(request.user, group):
            available_roles = [
                {'value': 'MEMBER', 'label': 'Member', 'description': 'Can access shared resources and participate in the group'}
            ]
        
        return Response({
            'available_roles': available_roles,
            'user_role': user_role,
            'can_assign_admin': user_role == 'system_admin'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get available roles: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


