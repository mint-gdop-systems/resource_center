from django.urls import path
from . import views
from .views import FileUploadView, CreateFolderView, FolderContentsView, ToggleStarredView, ToggleArchivedView, ToggleFolderStarredView, logout_view

urlpatterns = [
    path( "", views.home, name="home"),
    path("files", views.files, name="files"),
    path("my-files", views.myFiles, name="myFiles"),
    path('get-categories/', views.get_categories, name='get_categories'), 
    path('file-upload/', FileUploadView.as_view(), name='file-upload'),  
    path('file-upload/<int:folder_id>/', FileUploadView.as_view(), name='folder-file-upload'),
    path('folders/', CreateFolderView.as_view(), name='create_folder'),
    path('folders/<int:parent_id>/', CreateFolderView.as_view(), name='create_subfolder'),
    path('folder-contents/', FolderContentsView.as_view(), name='folder-contents'),  # Root folder contents
    path('folder-contents/<int:folder_id>/', FolderContentsView.as_view(), name='folder_contents'),
    path('download-file/<int:file_id>/', views.download_file, name='download_file'),
    path('view-file/<int:file_id>/', views.view_file, name='view_file'),
    # path('send-email/', views.Sendmail.as_view(), name='send_email'),
    path("files/<int:file_id>/toggle-star/", ToggleStarredView.as_view(), name="toggle-star"),
    path("folders/<int:folder_id>/toggle-star/", ToggleFolderStarredView.as_view(), name="toggle-folder-star"),
    path("files/<int:file_id>/toggle-archive/", ToggleArchivedView.as_view(), name="toggle-archive"),
    path("logout/", logout_view, name="logout"),
]
