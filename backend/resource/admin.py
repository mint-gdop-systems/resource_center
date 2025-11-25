from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib import messages
from django.shortcuts import render, redirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Count, Q
from django.http import HttpResponseRedirect
from django.core.exceptions import ValidationError
from .models import UploadedFile, Category, Folder, FileSharing, Tag, FileVersion, Reminder, Group, GroupMembership, GroupSharing, OnlyOfficeDocumentKey


admin.site.register(Category)
admin.site.register(FileVersion)


@admin.register(OnlyOfficeDocumentKey)
class OnlyOfficeDocumentKeyAdmin(admin.ModelAdmin):
    list_display = ('document_key_short', 'file', 'user', 'version_number', 'created_at', 'expires_at', 'is_active')
    list_filter = ('is_active', 'created_at', 'expires_at')
    search_fields = ('document_key', 'file__name', 'user__username')
    readonly_fields = ('document_key', 'created_at')
    ordering = ['-created_at']
    
    def document_key_short(self, obj):
        return f"{obj.document_key[:16]}..." if obj.document_key else ""
    document_key_short.short_description = "Document Key"


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ('name', 'file', 'category', 'uploaded_at')  # Include 'category' in the list display
    list_filter = ('category',)  # Add filter for categories in the admin page

class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'created_at')  

admin.site.register(Folder, FolderAdmin)
admin.site.register(Tag)


@admin.register(FileSharing)
class FileSharingAdmin(admin.ModelAdmin):
    list_display = ('file', 'shared_by', 'shared_to', 'get_shared_to_email', 'shared_at', 'share_type', 'message')
    search_fields = ('shared_by__username', 'shared_to__username', 'shared_to__email', 'file__name', 'message')
    list_filter = ('share_type', 'shared_at')

    def get_shared_to_email(self, obj):
        return obj.shared_to.email
    get_shared_to_email.short_description = 'Shared to (Email)'

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('file', 'remind_at', 'repeat', 'note', 'user')
    list_filter = ('repeat', 'remind_at')
    search_fields = ('note', 'file__name', 'user__username')
    ordering = ('-remind_at',)


# Enhanced Group Management Admin Classes

class GroupMembershipInline(admin.TabularInline):
    """Enhanced inline admin for managing group memberships"""
    model = GroupMembership
    extra = 0
    fields = ('user', 'role', 'added_by', 'is_active', 'added_at')
    readonly_fields = ('added_at', 'added_by')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'added_by').order_by('role', 'user__first_name')
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "user":
            # Only show users who are not already members of this group
            if hasattr(request, '_obj_'):
                group = request._obj_
                existing_members = GroupMembership.objects.filter(
                    group=group, 
                    is_active=True
                ).values_list('user_id', flat=True)
                kwargs["queryset"] = User.objects.exclude(id__in=existing_members).order_by('first_name', 'username')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class GroupSharingInline(admin.TabularInline):
    """Inline admin for viewing group shares"""
    model = GroupSharing
    extra = 0
    fields = ('get_item_display', 'shared_by', 'shared_at', 'can_download', 'can_reshare')
    readonly_fields = ('get_item_display', 'shared_by', 'shared_at')
    
    def get_item_display(self, obj):
        if obj.file:
            return format_html(
                '<span style="color: #0066cc;">📄 {}</span>',
                obj.file.name
            )
        elif obj.folder:
            return format_html(
                '<span style="color: #ff9900;">📁 {}</span>',
                obj.folder.name
            )
        return "Unknown"
    get_item_display.short_description = 'Shared Item'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('file', 'folder', 'shared_by').order_by('-shared_at')
    
    def has_add_permission(self, request, obj):
        return False  # Prevent adding shares through inline (use API instead)


@admin.register(Group)
class EnhancedGroupAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'get_status_display', 'get_member_count', 'get_admin_count', 
        'get_shared_items_count', 'created_by', 'created_at', 'get_quick_actions'
    )
    list_filter = ('is_active', 'created_at', 'created_by')
    search_fields = ('name', 'description', 'created_by__username', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at', 'get_statistics_display')
    inlines = [GroupMembershipInline, GroupSharingInline]
    actions = ['activate_groups', 'deactivate_groups', 'bulk_add_members']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Statistics', {
            'fields': ('get_statistics_display',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by').annotate(
            member_count=Count('memberships', filter=Q(memberships__is_active=True)),
            admin_count=Count('memberships', filter=Q(memberships__is_active=True, memberships__role=GroupMembership.ADMIN)),
            shared_items_count=Count('shared_items')
        )
    
    def get_status_display(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Active</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">✗ Inactive</span>'
            )
    get_status_display.short_description = 'Status'
    get_status_display.admin_order_field = 'is_active'
    
    def get_member_count(self, obj):
        count = getattr(obj, 'member_count', obj.get_member_count())
        return format_html(
            '<span style="font-weight: bold; color: #0066cc;">{}</span>',
            count
        )
    get_member_count.short_description = 'Members'
    get_member_count.admin_order_field = 'member_count'
    
    def get_admin_count(self, obj):
        count = getattr(obj, 'admin_count', obj.get_admins().count())
        return format_html(
            '<span style="font-weight: bold; color: #ff9900;">{}</span>',
            count
        )
    get_admin_count.short_description = 'Admins'
    get_admin_count.admin_order_field = 'admin_count'
    
    def get_shared_items_count(self, obj):
        count = getattr(obj, 'shared_items_count', obj.shared_items.count())
        return format_html(
            '<span style="font-weight: bold; color: #009900;">{}</span>',
            count
        )
    get_shared_items_count.short_description = 'Shared Items'
    get_shared_items_count.admin_order_field = 'shared_items_count'
    
    def get_quick_actions(self, obj):
        actions = []
        
        # View members action
        members_url = reverse('admin:resource_groupmembership_changelist') + f'?group__id__exact={obj.id}'
        actions.append(
            format_html(
                '<a href="{}" style="color: #0066cc;">👥 Members</a>',
                members_url
            )
        )
        
        # View shares action
        shares_url = reverse('admin:resource_groupsharing_changelist') + f'?group__id__exact={obj.id}'
        actions.append(
            format_html(
                '<a href="{}" style="color: #009900;">📤 Shares</a>',
                shares_url
            )
        )
        
        return mark_safe(' | '.join(actions))
    get_quick_actions.short_description = 'Quick Actions'
    
    def get_statistics_display(self, obj):
        """Display comprehensive group statistics"""
        stats = []
        
        # Member statistics
        total_members = obj.get_member_count()
        admin_count = obj.get_admins().count()
        regular_members = total_members - admin_count
        
        stats.append(f"<strong>Members:</strong> {total_members} total ({admin_count} admins, {regular_members} regular)")
        
        # Sharing statistics
        shared_files = obj.shared_items.filter(share_type=GroupSharing.FILE).count()
        shared_folders = obj.shared_items.filter(share_type=GroupSharing.FOLDER).count()
        
        stats.append(f"<strong>Shared Items:</strong> {shared_files} files, {shared_folders} folders")
        
        # Recent activity (last 30 days)
        from datetime import timedelta
        from django.utils import timezone
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        recent_shares = obj.shared_items.filter(shared_at__gte=thirty_days_ago).count()
        recent_members = obj.memberships.filter(added_at__gte=thirty_days_ago, is_active=True).count()
        
        stats.append(f"<strong>Recent Activity (30d):</strong> {recent_shares} new shares, {recent_members} new members")
        
        return mark_safe('<br>'.join(stats))
    get_statistics_display.short_description = 'Group Statistics'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by for new objects
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def get_form(self, request, obj=None, **kwargs):
        # Store the object in request for use in inline formfield_for_foreignkey
        request._obj_ = obj
        return super().get_form(request, obj, **kwargs)
    
    # Custom Admin Actions
    def activate_groups(self, request, queryset):
        """Bulk activate selected groups"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'Successfully activated {updated} group(s).',
            messages.SUCCESS
        )
    activate_groups.short_description = "Activate selected groups"
    
    def deactivate_groups(self, request, queryset):
        """Bulk deactivate selected groups"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'Successfully deactivated {updated} group(s).',
            messages.SUCCESS
        )
    deactivate_groups.short_description = "Deactivate selected groups"
    
    def bulk_add_members(self, request, queryset):
        """Bulk add members to selected groups"""
        if 'apply' in request.POST:
            # Process the form
            user_ids = request.POST.getlist('users')
            role = request.POST.get('role', GroupMembership.MEMBER)
            
            added_count = 0
            for group in queryset:
                for user_id in user_ids:
                    try:
                        user = User.objects.get(id=user_id)
                        membership, created = GroupMembership.objects.get_or_create(
                            group=group,
                            user=user,
                            defaults={
                                'role': role,
                                'added_by': request.user,
                                'is_active': True
                            }
                        )
                        if created:
                            added_count += 1
                    except User.DoesNotExist:
                        continue
            
            self.message_user(
                request,
                f'Successfully added {added_count} membership(s).',
                messages.SUCCESS
            )
            return HttpResponseRedirect(request.get_full_path())
        
        # Show the form
        users = User.objects.all().order_by('first_name', 'username')
        context = {
            'groups': queryset,
            'users': users,
            'role_choices': GroupMembership.ROLE_CHOICES,
            'title': 'Bulk Add Members to Groups'
        }
        return render(request, 'admin/bulk_add_members.html', context)
    
    bulk_add_members.short_description = "Bulk add members to selected groups"


@admin.register(GroupMembership)
class EnhancedGroupMembershipAdmin(admin.ModelAdmin):
    list_display = (
        'get_user_display', 'get_group_display', 'get_role_display', 
        'added_by', 'get_status_display', 'added_at', 'get_quick_actions'
    )
    list_filter = ('role', 'is_active', 'added_at', 'group__is_active')
    search_fields = (
        'user__username', 'user__email', 'user__first_name', 'user__last_name',
        'group__name', 'added_by__username'
    )
    readonly_fields = ('added_at', 'get_membership_info')
    actions = ['activate_memberships', 'deactivate_memberships', 'promote_to_admin', 'demote_to_member']
    
    fieldsets = (
        ('Membership Details', {
            'fields': ('group', 'user', 'role', 'is_active')
        }),
        ('Membership Information', {
            'fields': ('get_membership_info',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('added_by', 'added_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'group', 'added_by')
    
    def get_user_display(self, obj):
        user = obj.user
        display_name = f"{user.first_name} {user.last_name}".strip() or user.username
        return format_html(
            '<strong>{}</strong><br><small style="color: #666;">{}</small>',
            display_name,
            user.email
        )
    get_user_display.short_description = 'User'
    get_user_display.admin_order_field = 'user__first_name'
    
    def get_group_display(self, obj):
        group = obj.group
        status_color = 'green' if group.is_active else 'red'
        return format_html(
            '<strong>{}</strong><br><small style="color: {};">{}</small>',
            group.name,
            status_color,
            'Active' if group.is_active else 'Inactive'
        )
    get_group_display.short_description = 'Group'
    get_group_display.admin_order_field = 'group__name'
    
    def get_role_display(self, obj):
        role_colors = {
            GroupMembership.ADMIN: '#ff9900',
            GroupMembership.MEMBER: '#0066cc'
        }
        role_icons = {
            GroupMembership.ADMIN: '👑',
            GroupMembership.MEMBER: '👤'
        }
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            role_colors.get(obj.role, '#666'),
            role_icons.get(obj.role, ''),
            obj.get_role_display()
        )
    get_role_display.short_description = 'Role'
    get_role_display.admin_order_field = 'role'
    
    def get_status_display(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Active</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">✗ Inactive</span>'
            )
    get_status_display.short_description = 'Status'
    get_status_display.admin_order_field = 'is_active'
    
    def get_quick_actions(self, obj):
        actions = []
        
        # View user's other memberships
        user_memberships_url = reverse('admin:resource_groupmembership_changelist') + f'?user__id__exact={obj.user.id}'
        actions.append(
            format_html(
                '<a href="{}" style="color: #0066cc;">Other Groups</a>',
                user_memberships_url
            )
        )
        
        # View group details
        group_url = reverse('admin:resource_group_change', args=[obj.group.id])
        actions.append(
            format_html(
                '<a href="{}" style="color: #009900;">Group Details</a>',
                group_url
            )
        )
        
        return mark_safe(' | '.join(actions))
    get_quick_actions.short_description = 'Quick Actions'
    
    def get_membership_info(self, obj):
        """Display comprehensive membership information"""
        info = []
        
        # User information
        user = obj.user
        info.append(f"<strong>User:</strong> {user.get_full_name() or user.username} ({user.email})")
        
        # Group information
        group = obj.group
        info.append(f"<strong>Group:</strong> {group.name} ({group.get_member_count()} members)")
        
        # Role information
        info.append(f"<strong>Role:</strong> {obj.get_role_display()}")
        if obj.role == GroupMembership.ADMIN:
            info.append("<em>Can manage group members</em>")
        
        # Activity information
        info.append(f"<strong>Added:</strong> {obj.added_at.strftime('%Y-%m-%d %H:%M')} by {obj.added_by.username if obj.added_by else 'System'}")
        
        # Other memberships
        other_memberships = GroupMembership.objects.filter(
            user=obj.user, 
            is_active=True
        ).exclude(id=obj.id).count()
        
        if other_memberships > 0:
            info.append(f"<strong>Other Groups:</strong> Member of {other_memberships} other group(s)")
        
        return mark_safe('<br>'.join(info))
    get_membership_info.short_description = 'Membership Information'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set added_by for new memberships
            obj.added_by = request.user
        super().save_model(request, obj, form, change)
    
    # Custom Admin Actions
    def activate_memberships(self, request, queryset):
        """Bulk activate selected memberships"""
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f'Successfully activated {updated} membership(s).',
            messages.SUCCESS
        )
    activate_memberships.short_description = "Activate selected memberships"
    
    def deactivate_memberships(self, request, queryset):
        """Bulk deactivate selected memberships"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f'Successfully deactivated {updated} membership(s).',
            messages.SUCCESS
        )
    deactivate_memberships.short_description = "Deactivate selected memberships"
    
    def promote_to_admin(self, request, queryset):
        """Promote selected members to admin role"""
        updated = queryset.filter(role=GroupMembership.MEMBER).update(role=GroupMembership.ADMIN)
        self.message_user(
            request,
            f'Successfully promoted {updated} member(s) to admin.',
            messages.SUCCESS
        )
    promote_to_admin.short_description = "Promote to admin"
    
    def demote_to_member(self, request, queryset):
        """Demote selected admins to member role"""
        updated = queryset.filter(role=GroupMembership.ADMIN).update(role=GroupMembership.MEMBER)
        self.message_user(
            request,
            f'Successfully demoted {updated} admin(s) to member.',
            messages.SUCCESS
        )
    demote_to_member.short_description = "Demote to member"


@admin.register(GroupSharing)
class EnhancedGroupSharingAdmin(admin.ModelAdmin):
    list_display = (
        'get_item_display', 'get_group_display', 'get_shared_by_display', 
        'shared_at', 'get_permissions_display', 'get_quick_actions'
    )
    list_filter = ('share_type', 'shared_at', 'can_download', 'can_reshare', 'group__is_active')
    search_fields = (
        'file__name', 'folder__name', 'group__name', 
        'shared_by__username', 'shared_by__email', 'message'
    )
    readonly_fields = ('shared_at', 'get_sharing_info')
    actions = ['enable_download', 'disable_download', 'enable_reshare', 'disable_reshare']
    date_hierarchy = 'shared_at'
    
    fieldsets = (
        ('Shared Item', {
            'fields': ('file', 'folder', 'share_type')
        }),
        ('Sharing Details', {
            'fields': ('group', 'shared_by', 'message')
        }),
        ('Permissions', {
            'fields': ('can_download', 'can_reshare')
        }),
        ('Sharing Information', {
            'fields': ('get_sharing_info',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('shared_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('file', 'folder', 'group', 'shared_by')
    
    def get_item_display(self, obj):
        if obj.file:
            icon = '📄'
            name = obj.file.name
            size = f" ({obj.file.file_size} bytes)" if obj.file.file_size else ""
            color = '#0066cc'
        elif obj.folder:
            icon = '📁'
            name = obj.folder.name
            size = ""
            color = '#ff9900'
        else:
            return "Unknown Item"
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span><br><small style="color: #666;">{}</small>',
            color,
            icon,
            name,
            f"Type: {obj.get_item_type().title()}{size}"
        )
    get_item_display.short_description = 'Shared Item'
    
    def get_group_display(self, obj):
        group = obj.group
        status_color = 'green' if group.is_active else 'red'
        member_count = group.get_member_count()
        
        return format_html(
            '<strong>{}</strong><br><small style="color: {};">{} ({} members)</small>',
            group.name,
            status_color,
            'Active' if group.is_active else 'Inactive',
            member_count
        )
    get_group_display.short_description = 'Group'
    get_group_display.admin_order_field = 'group__name'
    
    def get_shared_by_display(self, obj):
        user = obj.shared_by
        display_name = f"{user.first_name} {user.last_name}".strip() or user.username
        
        return format_html(
            '<strong>{}</strong><br><small style="color: #666;">{}</small>',
            display_name,
            user.email
        )
    get_shared_by_display.short_description = 'Shared By'
    get_shared_by_display.admin_order_field = 'shared_by__first_name'
    
    def get_permissions_display(self, obj):
        permissions = []
        
        if obj.can_download:
            permissions.append('<span style="color: green;">✓ Download</span>')
        else:
            permissions.append('<span style="color: red;">✗ Download</span>')
        
        if obj.can_reshare:
            permissions.append('<span style="color: green;">✓ Reshare</span>')
        else:
            permissions.append('<span style="color: red;">✗ Reshare</span>')
        
        return format_html('<br>'.join(permissions))
    get_permissions_display.short_description = 'Permissions'
    
    def get_quick_actions(self, obj):
        actions = []
        
        # View group details
        group_url = reverse('admin:resource_group_change', args=[obj.group.id])
        actions.append(
            format_html(
                '<a href="{}" style="color: #009900;">Group</a>',
                group_url
            )
        )
        
        # View shared by user
        user_shares_url = reverse('admin:resource_groupsharing_changelist') + f'?shared_by__id__exact={obj.shared_by.id}'
        actions.append(
            format_html(
                '<a href="{}" style="color: #0066cc;">User Shares</a>',
                user_shares_url
            )
        )
        
        # View item details
        if obj.file:
            item_url = reverse('admin:resource_uploadedfile_change', args=[obj.file.id])
            actions.append(
                format_html(
                    '<a href="{}" style="color: #ff6600;">File Details</a>',
                    item_url
                )
            )
        elif obj.folder:
            item_url = reverse('admin:resource_folder_change', args=[obj.folder.id])
            actions.append(
                format_html(
                    '<a href="{}" style="color: #ff6600;">Folder Details</a>',
                    item_url
                )
            )
        
        return mark_safe(' | '.join(actions))
    get_quick_actions.short_description = 'Quick Actions'
    
    def get_sharing_info(self, obj):
        """Display comprehensive sharing information"""
        info = []
        
        # Item information
        if obj.file:
            info.append(f"<strong>File:</strong> {obj.file.name}")
            if obj.file.file_size:
                info.append(f"<strong>Size:</strong> {obj.file.file_size:,} bytes")
            if obj.file.category:
                info.append(f"<strong>Category:</strong> {obj.file.category.name}")
        elif obj.folder:
            info.append(f"<strong>Folder:</strong> {obj.folder.name}")
            # Count files in folder
            file_count = obj.folder.files.count()
            if file_count > 0:
                info.append(f"<strong>Contains:</strong> {file_count} file(s)")
        
        # Group information
        group = obj.group
        info.append(f"<strong>Shared with Group:</strong> {group.name} ({group.get_member_count()} members)")
        
        # Sharing details
        info.append(f"<strong>Shared by:</strong> {obj.shared_by.get_full_name() or obj.shared_by.username}")
        info.append(f"<strong>Shared on:</strong> {obj.shared_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if obj.message:
            info.append(f"<strong>Message:</strong> {obj.message}")
        
        # Permission details
        permissions = []
        if obj.can_download:
            permissions.append("Download")
        if obj.can_reshare:
            permissions.append("Reshare")
        
        if permissions:
            info.append(f"<strong>Permissions:</strong> {', '.join(permissions)}")
        else:
            info.append("<strong>Permissions:</strong> View only")
        
        return mark_safe('<br>'.join(info))
    get_sharing_info.short_description = 'Sharing Information'
    
    # Custom Admin Actions
    def enable_download(self, request, queryset):
        """Enable download permission for selected shares"""
        updated = queryset.update(can_download=True)
        self.message_user(
            request,
            f'Successfully enabled download for {updated} share(s).',
            messages.SUCCESS
        )
    enable_download.short_description = "Enable download permission"
    
    def disable_download(self, request, queryset):
        """Disable download permission for selected shares"""
        updated = queryset.update(can_download=False)
        self.message_user(
            request,
            f'Successfully disabled download for {updated} share(s).',
            messages.SUCCESS
        )
    disable_download.short_description = "Disable download permission"
    
    def enable_reshare(self, request, queryset):
        """Enable reshare permission for selected shares"""
        updated = queryset.update(can_reshare=True)
        self.message_user(
            request,
            f'Successfully enabled reshare for {updated} share(s).',
            messages.SUCCESS
        )
    enable_reshare.short_description = "Enable reshare permission"
    
    def disable_reshare(self, request, queryset):
        """Disable reshare permission for selected shares"""
        updated = queryset.update(can_reshare=False)
        self.message_user(
            request,
            f'Successfully disabled reshare for {updated} share(s).',
            messages.SUCCESS
        )
    disable_reshare.short_description = "Disable reshare permission"

