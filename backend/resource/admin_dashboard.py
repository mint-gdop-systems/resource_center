"""
Custom admin dashboard widgets for group management
Provides overview statistics and quick actions for administrators
"""

from django.contrib import admin
from django.contrib.admin import AdminSite
from django.shortcuts import render
from django.urls import path
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Group, GroupMembership, GroupSharing, UploadedFile, Folder


class GroupManagementDashboard:
    """Dashboard widget for group management overview"""
    
    @staticmethod
    def get_dashboard_stats():
        """Get comprehensive dashboard statistics"""
        # Basic counts
        total_groups = Group.objects.filter(is_active=True).count()
        total_memberships = GroupMembership.objects.filter(is_active=True).count()
        total_group_shares = GroupSharing.objects.count()
        
        # Group statistics
        groups_with_members = Group.objects.filter(
            is_active=True,
            memberships__is_active=True
        ).distinct().count()
        
        empty_groups = total_groups - groups_with_members
        
        # Member statistics
        total_admins = GroupMembership.objects.filter(
            is_active=True,
            role=GroupMembership.ADMIN
        ).count()
        
        total_regular_members = GroupMembership.objects.filter(
            is_active=True,
            role=GroupMembership.MEMBER
        ).count()
        
        # Sharing statistics
        shared_files = GroupSharing.objects.filter(share_type=GroupSharing.FILE).count()
        shared_folders = GroupSharing.objects.filter(share_type=GroupSharing.FOLDER).count()
        
        # Recent activity (last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        
        recent_groups = Group.objects.filter(created_at__gte=seven_days_ago).count()
        recent_memberships = GroupMembership.objects.filter(added_at__gte=seven_days_ago).count()
        recent_shares = GroupSharing.objects.filter(shared_at__gte=seven_days_ago).count()
        
        # Top groups by member count
        top_groups = Group.objects.filter(is_active=True).annotate(
            member_count=Count('memberships', filter=Q(memberships__is_active=True))
        ).order_by('-member_count')[:5]
        
        # Most active sharers
        top_sharers = GroupSharing.objects.values(
            'shared_by__username', 
            'shared_by__first_name', 
            'shared_by__last_name'
        ).annotate(
            share_count=Count('id')
        ).order_by('-share_count')[:5]
        
        return {
            'totals': {
                'groups': total_groups,
                'memberships': total_memberships,
                'group_shares': total_group_shares,
                'empty_groups': empty_groups
            },
            'members': {
                'admins': total_admins,
                'regular': total_regular_members,
                'total': total_admins + total_regular_members
            },
            'sharing': {
                'files': shared_files,
                'folders': shared_folders,
                'total': shared_files + shared_folders
            },
            'recent_activity': {
                'groups': recent_groups,
                'memberships': recent_memberships,
                'shares': recent_shares
            },
            'top_groups': top_groups,
            'top_sharers': top_sharers
        }
    
    @staticmethod
    def get_group_health_metrics():
        """Get group health and usage metrics"""
        # Groups by size
        group_sizes = Group.objects.filter(is_active=True).annotate(
            member_count=Count('memberships', filter=Q(memberships__is_active=True))
        ).values('member_count').annotate(
            count=Count('id')
        ).order_by('member_count')
        
        # Groups by activity (shares in last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        active_groups = Group.objects.filter(
            is_active=True,
            shared_items__shared_at__gte=thirty_days_ago
        ).distinct().count()
        
        inactive_groups = Group.objects.filter(is_active=True).count() - active_groups
        
        # Average members per group
        total_groups = Group.objects.filter(is_active=True).count()
        total_members = GroupMembership.objects.filter(is_active=True).count()
        avg_members = round(total_members / total_groups, 1) if total_groups > 0 else 0
        
        return {
            'group_sizes': list(group_sizes),
            'activity': {
                'active_groups': active_groups,
                'inactive_groups': inactive_groups,
                'activity_rate': round((active_groups / total_groups * 100), 1) if total_groups > 0 else 0
            },
            'averages': {
                'members_per_group': avg_members
            }
        }


def dashboard_view(request):
    """Custom dashboard view for group management"""
    if not request.user.is_superuser:
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied("Only system administrators can access this dashboard")
    
    stats = GroupManagementDashboard.get_dashboard_stats()
    health_metrics = GroupManagementDashboard.get_group_health_metrics()
    
    context = {
        'title': 'Group Management Dashboard',
        'stats': stats,
        'health_metrics': health_metrics,
        'has_permission': True,
    }
    
    return render(request, 'admin/group_dashboard.html', context)


# Custom AdminSite to add dashboard
class EnhancedAdminSite(AdminSite):
    """Enhanced admin site with group management dashboard"""
    
    site_header = "MINT Resource Center Administration"
    site_title = "MINT Admin"
    index_title = "Resource Center Administration"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('group-dashboard/', dashboard_view, name='group_dashboard'),
        ]
        return custom_urls + urls
    
    def index(self, request, extra_context=None):
        """Enhanced admin index with group statistics"""
        extra_context = extra_context or {}
        
        if request.user.is_superuser:
            # Add group statistics to admin index
            stats = GroupManagementDashboard.get_dashboard_stats()
            extra_context['group_stats'] = stats
        
        return super().index(request, extra_context)


# Create enhanced admin site instance
enhanced_admin_site = EnhancedAdminSite(name='enhanced_admin')

# Register all models with enhanced admin site
from django.contrib.auth.models import User, Group as DjangoGroup
from django.contrib.auth.admin import UserAdmin, GroupAdmin as DjangoGroupAdmin

enhanced_admin_site.register(User, UserAdmin)
enhanced_admin_site.register(DjangoGroup, DjangoGroupAdmin)