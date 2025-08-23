from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileUploadView, CreateFolderView, FolderContentsView, ToggleStarredView, ToggleArchivedView, ToggleFolderStarredView, EditFileView, EditFolderView, UploadNewVersionView, FileVersionHistoryView, RevertVersionView, DeleteUploadedFileView, BulkDeleteView, ReminderViewSet, UpcomingRemindersView, get_categories, TestAuthView, RecentFilesView, ViewFileView, DownloadFileView, BulkDownloadView, CopyFileView, BulkCopyView, MoveFileView, MoveFolderView, BulkMoveView, PublicShareView, ShareLinkManagementView, SearchView, DashboardStatsView, DashboardRecentActivityView
)
from .sharing_views import ShareItemView, SharedWithMeView, shared_unseen_count, SendFileEmailView

router = DefaultRouter()
router.register(r'reminders', ReminderViewSet, basename='reminder')
print("api_urls.py loaded")
urlpatterns = [
    path('test-auth/', TestAuthView.as_view(), name='test-auth'),
    path('recent-files/', RecentFilesView.as_view(), name='recent-files'),
    path('file-upload/', FileUploadView.as_view(), name='file-upload'),
    path('file-upload/<int:folder_id>/', FileUploadView.as_view(), name='folder-file-upload'),

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
    
    path('', include(router.urls)),
] 