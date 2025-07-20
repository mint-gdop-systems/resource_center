from django.urls import path
from . import views
from .views import HomeView, ShowResourceView

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('show-resource', ShowResourceView.as_view(), name='show-resource'),
    path("files", views.files, name="files"),
    path("my-files", views.myFiles, name="myFiles"),
    path('download-file/<int:file_id>/', views.download_file, name='download_file'),
    path('view-file/<int:file_id>/', views.view_file, name='view_file'),
    path("logout/", views.logout_view, name="logout"),
]
