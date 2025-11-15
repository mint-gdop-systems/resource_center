from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from .views import (
    FileUploadView, ResolveDuplicateFilesView, CreateFolderView, FolderContentsView, ToggleStarredView, ToggleArchivedView, ToggleFolderStarredView, EditFileView, EditFolderView, UploadNewVersionView, FileVersionHistoryView, RevertVersionView, DeleteUploadedFileView, BulkDeleteView, ReminderViewSet, UpcomingRemindersView, get_categories, TestAuthView, RecentFilesView, ViewFileView, DownloadFileView, BulkDownloadView, CopyFileView, BulkCopyView, MoveFileView, MoveFolderView, BulkMoveView, PublicShareView, ShareLinkManagementView, SearchView, DashboardStatsView, DashboardRecentActivityView, UserProfileView, OnlyOfficeConfigView, OnlyOfficeCallbackView
)
from .storage_views import (
    StorageQuotaView, UserStorageQuotaView, recalculate_storage_usage,
    check_upload_capacity, storage_statistics, admin_users_storage
)
from .sharing_views import ShareItemView, SharedWithMeView, shared_unseen_count, SendFileEmailView
from .group_views import (
    GroupListCreateView, GroupDetailView, GroupMembershipView, GroupSharingView,
    GroupSharedWithMeView, UserGroupContextView, assign_group_admin, group_statistics,
    search_users, get_user_roles_for_group
)
from .enhanced_sharing_views import (
    CombinedSharedWithMeView, AllAccessibleResourcesView, combined_unseen_count,
    EnhancedShareItemView
)

router = DefaultRouter()
router.register(r'reminders', ReminderViewSet, basename='reminder')
print("api_urls.py loaded")
urlpatterns = [
    path('test-auth/', TestAuthView.as_view(), name='test-auth'),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('recent-files/', RecentFilesView.as_view(), name='recent-files'),
    path('file-upload/', FileUploadView.as_view(), name='file-upload'),
    path('file-upload/<int:folder_id>/', FileUploadView.as_view(), name='folder-file-upload'),
    path('resolve-duplicates/', ResolveDuplicateFilesView.as_view(), name='resolve-duplicates'),

    path('folders/', CreateFolderView.as_view(), name='create_folder'),
    path('folders/<int:parent_id>/', CreateFolderView.as_view(), name='create_subfolder'),
    path('folder-contents/', FolderContentsView.as_view(), name='folder-contents'),
    path('folder-contents/<int:folder_id>/', FolderContentsView.as_view(), name='folder_contents'),
    path('files/<int:file_id>/delete/', DeleteUploadedFileView.as_view(), name='delete_uploaded_file'),
    path('bulk-delete/', BulkDeleteView.as_view(), name='bulk-delete'),
    path('send-email/', SendFileEmailView.as_view(), name='send-email'),
    path('files/<int:file_id>/toggle-star/', ToggleStarredView.as_view(), name='toggle-star'),
    path('folders/<int:folder_id>/toggle-star/', ToggleFolderStarredView.as_view(), name='toggle-folder-star'),
    path('files/<int:file_id>/toggle-archive/', ToggleArchivedView.as_view(), name='toggle-archive'),
    path('share/', ShareItemView.as_view(), name='share-item'),
    path('shared-with-me/', SharedWithMeView.as_view(), name='shared-with-me'),
    path('shared-with-me/unseen-count/', shared_unseen_count),
    path('edit-file/<int:file_id>/', EditFileView.as_view(), name='edit-file'),
    path('edit-folder/<int:folder_id>/', EditFolderView.as_view(), name='edit-folder'),
    path('files/<int:file_id>/upload-new-version/', UploadNewVersionView.as_view(), name='upload-new-version'),
    path('files/<int:file_id>/version-history/', FileVersionHistoryView.as_view(), name='version-history'),
    path('files/<int:file_id>/revert-version/<int:version_id>/', RevertVersionView.as_view(), name='revert-version'),
    path('view-file/<int:file_id>/', ViewFileView.as_view(), name='view-file'),
    path('download-file/<int:file_id>/', DownloadFileView.as_view(), name='download-file'),
    path('bulk-download/', BulkDownloadView.as_view(), name='bulk-download'),
    
    # ONLYOFFICE Document Server integration
    path('onlyoffice/config/<int:file_id>/', OnlyOfficeConfigView.as_view(), name='onlyoffice-config'),
    path('onlyoffice/callback/<int:file_id>/', OnlyOfficeCallbackView.as_view(), name='onlyoffice-callback'),
    path('onlyoffice/test-callback/', lambda request: JsonResponse({"status": "ok", "message": "Callback endpoint is reachable"}), name='onlyoffice-test-callback'),
    path('copy-file/<int:file_id>/', CopyFileView.as_view(), name='copy-file'),
    path('bulk-copy/', BulkCopyView.as_view(), name='bulk-copy'),
    path('move-file/<int:file_id>/', MoveFileView.as_view(), name='move-file'),
    path('move-folder/<int:folder_id>/', MoveFolderView.as_view(), name='move-folder'),
    path('bulk-move/', BulkMoveView.as_view(), name='bulk-move'),
    path('reminders/upcoming/', UpcomingRemindersView.as_view(), name='upcoming-reminders'),
    path('get-categories/', get_categories, name='get_categories'),
    
    # Public Share Links (no authentication required)
    path('share/<str:share_id>/', PublicShareView.as_view(), name='public-share'),
    
    # Share Link Management (authentication required)
    path('create-share-links/', ShareLinkManagementView.as_view(), name='create-share-links'),
    
    # Search functionality
    path('search/', SearchView.as_view(), name='search'),
    
    # Dashboard analytics
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/activity/', DashboardRecentActivityView.as_view(), name='dashboard-activity'),
    
    # Group Management APIs
    path('groups/', GroupListCreateView.as_view(), name='groups-list-create'),
    path('groups/<int:group_id>/', GroupDetailView.as_view(), name='group-detail'),
    path('groups/<int:group_id>/members/', GroupMembershipView.as_view(), name='group-members'),
    path('groups/<int:group_id>/assign-admin/', assign_group_admin, name='assign-group-admin'),
    path('groups/<int:group_id>/statistics/', group_statistics, name='group-statistics'),
    
    # Group Sharing APIs
    path('group-share/', GroupSharingView.as_view(), name='group-share'),
    path('group-shared-with-me/', GroupSharedWithMeView.as_view(), name='group-shared-with-me'),
    
    # User Group Context
    path('user/groups/', UserGroupContextView.as_view(), name='user-groups'),
    
    # User Search for Group Management
    path('users/search/', search_users, name='search-users'),
    path('groups/<int:group_id>/available-roles/', get_user_roles_for_group, name='group-available-roles'),
    
    # Enhanced Sharing APIs (combines individual + group sharing)
    path('combined-shared-with-me/', CombinedSharedWithMeView.as_view(), name='combined-shared-with-me'),
    path('all-accessible-resources/', AllAccessibleResourcesView.as_view(), name='all-accessible-resources'),
    path('combined-unseen-count/', combined_unseen_count, name='combined-unseen-count'),
    path('enhanced-share/', EnhancedShareItemView.as_view(), name='enhanced-share'),
    
    # Storage Quota APIs
    path('storage/quota/', StorageQuotaView.as_view(), name='storage-quota'),
    path('storage/quota/<int:user_id>/', UserStorageQuotaView.as_view(), name='user-storage-quota'),
    path('storage/recalculate/', recalculate_storage_usage, name='recalculate-storage'),
    path('storage/check-capacity/', check_upload_capacity, name='check-upload-capacity'),
    path('storage/statistics/', storage_statistics, name='storage-statistics'),
    
    # Admin user management
    path('admin/users/storage/', admin_users_storage, name='admin-users-storage'),
    
    path('', include(router.urls)),
] 