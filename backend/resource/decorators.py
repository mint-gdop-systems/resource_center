"""
Decorators for group-based authorization
Provides function-based view decorators for permission checking
"""

from functools import wraps
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from .models import Group, GroupMembership
from .permissions import (
    is_system_admin,
    is_group_admin,
    can_user_manage_group,
    can_user_add_members,
    can_user_remove_members
)


def require_system_admin(view_func):
    """
    Decorator that requires the user to be a system administrator
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not is_system_admin(request.user):
            return JsonResponse(
                {'error': 'System administrator privileges required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        return view_func(request, *args, **kwargs)
    return wrapper


def require_group_admin_or_system_admin(group_param='group_id'):
    """
    Decorator that requires the user to be either:
    - A system administrator, or
    - An administrator of the specified group
    
    Args:
        group_param: Name of the parameter containing the group ID
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get group ID from URL parameters
            group_id = kwargs.get(group_param)
            if not group_id:
                return JsonResponse(
                    {'error': 'Group ID required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the group
            try:
                group = Group.objects.get(id=group_id, is_active=True)
            except Group.DoesNotExist:
                return JsonResponse(
                    {'error': 'Group not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check permissions
            if not can_user_manage_group(request.user, group):
                return JsonResponse(
                    {'error': 'You do not have permission to manage this group'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Add group to kwargs for convenience
            kwargs['group'] = group
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_group_membership(group_param='group_id', admin_only=False):
    """
    Decorator that requires the user to be a member of the specified group
    
    Args:
        group_param: Name of the parameter containing the group ID
        admin_only: If True, requires admin role in the group
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get group ID from URL parameters
            group_id = kwargs.get(group_param)
            if not group_id:
                return JsonResponse(
                    {'error': 'Group ID required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the group
            try:
                group = Group.objects.get(id=group_id, is_active=True)
            except Group.DoesNotExist:
                return JsonResponse(
                    {'error': 'Group not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check membership
            if admin_only:
                if not (is_system_admin(request.user) or group.is_user_admin(request.user)):
                    return JsonResponse(
                        {'error': 'Group administrator privileges required'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                if not (is_system_admin(request.user) or group.is_user_member(request.user)):
                    return JsonResponse(
                        {'error': 'Group membership required'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Add group to kwargs for convenience
            kwargs['group'] = group
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_resource_ownership(resource_model, resource_param='resource_id'):
    """
    Decorator that requires the user to own the specified resource
    
    Args:
        resource_model: The model class (UploadedFile or Folder)
        resource_param: Name of the parameter containing the resource ID
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get resource ID from URL parameters
            resource_id = kwargs.get(resource_param)
            if not resource_id:
                return JsonResponse(
                    {'error': 'Resource ID required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the resource
            try:
                resource = resource_model.objects.get(id=resource_id)
            except resource_model.DoesNotExist:
                return JsonResponse(
                    {'error': 'Resource not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check ownership
            if resource.owner != request.user:
                return JsonResponse(
                    {'error': 'You can only manage resources that you own'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Add resource to kwargs for convenience
            kwargs['resource'] = resource
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_resource_access(resource_model, resource_param='resource_id'):
    """
    Decorator that requires the user to have access to the specified resource
    (through ownership, individual sharing, or group sharing)
    
    Args:
        resource_model: The model class (UploadedFile or Folder)
        resource_param: Name of the parameter containing the resource ID
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get resource ID from URL parameters
            resource_id = kwargs.get(resource_param)
            if not resource_id:
                return JsonResponse(
                    {'error': 'Resource ID required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the resource
            try:
                resource = resource_model.objects.get(id=resource_id)
            except resource_model.DoesNotExist:
                return JsonResponse(
                    {'error': 'Resource not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check access
            if not resource.is_accessible_by(request.user):
                return JsonResponse(
                    {'error': 'You do not have access to this resource'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Add resource to kwargs for convenience
            kwargs['resource'] = resource
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


# Class-based view decorators (for DRF APIView classes)

class PermissionRequiredMixin:
    """
    Mixin that adds permission checking to class-based views
    """
    
    def check_permissions(self, request):
        """Override to add custom permission checks"""
        super().check_permissions(request)
        
        # Add any additional permission checks here
        if hasattr(self, 'required_permissions'):
            for permission_check in self.required_permissions:
                if not permission_check(request.user):
                    self.permission_denied(
                        request, 
                        message="You do not have the required permissions"
                    )


def method_permission_required(permission_func, message=None):
    """
    Decorator for individual methods in class-based views
    
    Args:
        permission_func: Function that takes a user and returns True/False
        message: Custom error message
    """
    def decorator(method):
        @wraps(method)
        def wrapper(self, request, *args, **kwargs):
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if not permission_func(request.user):
                error_message = message or "You do not have permission to perform this action"
                return Response(
                    {'error': error_message}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return method(self, request, *args, **kwargs)
        return wrapper
    return decorator


# Utility decorators for common patterns

def api_view_with_group_context(allowed_methods=['GET']):
    """
    Decorator that combines DRF's api_view with group context
    Automatically adds user's group information to the response context
    """
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.permissions import IsAuthenticated
    from .mixins import GroupContextMixin
    
    def decorator(view_func):
        @api_view(allowed_methods)
        @permission_classes([IsAuthenticated])
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Add group context mixin functionality
            mixin = GroupContextMixin()
            group_context = mixin.get_user_groups_context(request.user)
            
            # Add group context to request for use in view
            request.group_context = group_context
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator