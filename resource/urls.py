from django.urls import path, include
from . import views
from .views import HomeView, FileUploadView, CreateFolderView, FolderContentsView, ToggleStarredView, ToggleArchivedView, ToggleFolderStarredView, logout_view, FileDetailView, UploadNewVersionView, FileVersionHistoryView, RevertVersionView, DeleteUploadedFileView, ReminderViewSet, UpcomingRemindersView
from .sharing_views import ShareItemView, SharedWithMeView, shared_unseen_count, mark_shared_as_seen, SendFileEmailView
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register(r'reminders', ReminderViewSet, basename='reminder')


urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path("files", views.files, name="files"),
    path("my-files", views.myFiles, name="myFiles"),
    path('get-categories/', views.get_categories, name='get_categories'), 
    path('file-upload/', FileUploadView.as_view(), name='file-upload'),  
    path('file-upload/<int:folder_id>/', FileUploadView.as_view(), name='folder-file-upload'),
    path('file/update/<int:file_id>/', FileUploadView.as_view(), name='file-upload-update'),
    path('folders/', CreateFolderView.as_view(), name='create_folder'),
    path('folders/<int:parent_id>/', CreateFolderView.as_view(), name='create_subfolder'),
    path('folder-contents/', FolderContentsView.as_view(), name='folder-contents'),  # Root folder contents
    path('folder-contents/<int:folder_id>/', FolderContentsView.as_view(), name='folder_contents'),
    path('download-file/<int:file_id>/', views.download_file, name='download_file'),
    path('view-file/<int:file_id>/', views.view_file, name='view_file'),
    path('files/<int:file_id>/delete/', DeleteUploadedFileView.as_view(), name='delete_uploaded_file'),
    path('send-email/', SendFileEmailView.as_view(), name='send-email'),
    path("files/<int:file_id>/toggle-star/", ToggleStarredView.as_view(), name="toggle-star"),
    path("folders/<int:folder_id>/toggle-star/", ToggleFolderStarredView.as_view(), name="toggle-folder-star"),
    path("files/<int:file_id>/toggle-archive/", ToggleArchivedView.as_view(), name="toggle-archive"),
    path("logout/", logout_view, name="logout"),
    path('api/share/', ShareItemView.as_view(), name='share-item'),
    path('api/shared-with-me/', SharedWithMeView.as_view(), name='shared-with-me'),
    path("api/shared-with-me/unseen-count/", shared_unseen_count),
    path("api/shared-with-me/mark-seen/", mark_shared_as_seen),
    path("files-update/<int:pk>/", FileDetailView.as_view(), name="file-detail"),
    path('files/<int:file_id>/upload-new-version/', UploadNewVersionView.as_view(), name='upload-new-version'),
    path('files/<int:file_id>/version-history/', FileVersionHistoryView.as_view(), name='version-history'),
    path('files/<int:file_id>/revert-version/<int:version_id>/', RevertVersionView.as_view(), name='revert-version'),
    path('api/', include(router.urls)),
    path("reminders/upcoming/", UpcomingRemindersView.as_view(), name="upcoming-reminders"),
]
