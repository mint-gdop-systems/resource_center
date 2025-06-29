from django.contrib.postgres.search import SearchVector
from django.shortcuts import render, get_object_or_404, redirect
from rest_framework.response import Response
from rest_framework import status, generics, viewsets
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView
from .models import UploadedFile, Category, Folder, FileVersion, Reminder
from .serializers import UploadedFileSerializer, FolderSerializer, FileVersionSerializer, ReminderSerializer
from django.http import JsonResponse, FileResponse, Http404
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.mail import EmailMessage
from rest_framework.permissions import IsAuthenticated
import json
from django.contrib.auth import logout
from urllib.parse import urlencode
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.timezone import now
from datetime import timedelta
from django.utils import timezone
from decouple import config


# Create your views here.
class HomeView(TemplateView):
    template_name = 'home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        if self.request.user.is_authenticated:
            context['first_name'] = self.request.user.first_name
        else:
            context['first_name'] = None

        return context

@login_required
def files(request):
  return render(request, 't_files.html')


def myFiles(request, folder_id=None):
    if not request.user.is_authenticated:
        return redirect('/oidc/authenticate/') 

    if folder_id:
        files = UploadedFile.objects.filter(folder_id=folder_id).order_by("-uploaded_at")  # Get files in the folder
        folders = Folder.objects.filter(parent_id=folder_id).order_by("-created_at")  
        # print("folder id exist", files, folders)
    else:
        files = UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")  # Get root-level files
        folders = Folder.objects.filter(parent__isnull=True).order_by("-created_at")  # Get root-level folders
        # print("folder id DOESNOT exist", files, folders)
    files_exist = files.exists()
    folders_exist = folders.exists()

    
    return render(request, 'myFiles.html', {
        "files": files,
        "folders": folders,
        "files_exist": files_exist,
        "folders_exist": folders_exist
    })




class FileUploadView(APIView):
    permission_classes = [IsAuthenticated] 

    def post(self, request, folder_id=None, format=None):
        if "files" not in request.FILES:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        files = request.FILES.getlist("files")  # Handle multiple files

        folder_id = request.data.get("folder_id")
        if folder_id in [None, "None", "null", ""]:
            folder_id = None

        folder = Folder.objects.filter(id=folder_id).first() if folder_id else None
        if folder_id and not folder:
            return Response({"error": "Invalid folder ID"}, status=status.HTTP_400_BAD_REQUEST)

        folder_name = folder.name if folder else "Root"

        category_id = request.data.get("category_id")
        category = Category.objects.filter(id=category_id).first() if category_id else Category.get_default_category()

        uploaded_files = []
        for file_obj in files:
            file_name = file_obj.name
            file_type = file_obj.name.split(".")[-1].lower()
            file_size = file_obj.size

            if UploadedFile.objects.filter(name=file_name, folder=folder).exists():
                return Response({"error": f"File '{file_name}' already exists in this folder"}, status=status.HTTP_400_BAD_REQUEST)  

            uploaded_file = UploadedFile(
                name=file_name,
                file=file_obj,
                file_type=file_type,
                file_size=file_size,
                category=category,
                folder=folder,
                owner=request.user, 
                is_public=request.data.get("is_public", False),
            )
            uploaded_file.save()
            uploaded_files.append(uploaded_file)

            shared_with = request.data.get("shared_with", [])
            if shared_with:
                uploaded_file.shared_with.set(shared_with)

        all_files = folder.files.order_by("-uploaded_at") if folder else UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")
        uploaded_files_serializer = UploadedFileSerializer(uploaded_files, many=True)
        all_files_serializer = UploadedFileSerializer(all_files, many=True)

        return Response(
            {
                "message": "Files uploaded successfully",
                "folder_name": folder_name,
                "uploaded_files": uploaded_files_serializer.data,
                "files": all_files_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


    # def get(self, request, format=None):
    def get(self, request, folder_id=None):
        current_email = request.user.email
        current_first_name = request.user.first_name


        all_files = UploadedFile.objects.order_by("-uploaded_at")
        all_folders = Folder.objects.order_by("-created_at")

        search_query = request.GET.get("search", "").strip().lower()

        # file_serializer = UploadedFileSerializer(all_files, many=True)
        # folder_serializer = FolderSerializer(all_folders, many=True)
        
        # return Response(
        #     {
        #         "files": file_serializer.data,
        #         "folders": folder_serializer.data
        #     },
        #     status=status.HTTP_200_OK
        #     )
        is_starred = request.GET.get("starred") == "true"
        is_archived = request.GET.get("archived") == "true" 


        if is_archived:
            files = UploadedFile.objects.filter(is_archived=True).order_by("-uploaded_at")
            file_serializer = UploadedFileSerializer(files, many=True)
            return Response({
                "files": file_serializer.data,
                "folders": [],  
                "current_folder": None  
            })


        if folder_id:
            files = UploadedFile.objects.filter(folder_id=folder_id)  
            folders = Folder.objects.filter(parent_id=folder_id)  # Get subfolders
            # print("For Folder Id Exist",files, folders)
        else:
            files = UploadedFile.objects.filter(folder__isnull=True)  # Root-level files
            folders = Folder.objects.filter(parent__isnull=True)  # Root-level folders
            # print("For Folder Id Doesnot Exist",files, folders)

        if is_starred:  
            files = files.filter(is_starred=True)

        
        files = files.order_by("-uploaded_at")  
        folders = folders.order_by("-created_at")  

        file_serializer = UploadedFileSerializer(files, many=True, context={'request': request})
        folder_serializer = FolderSerializer(folders, many=True, context={'request': request})
        # print(file_serializer.data)

        return Response({
            "files": file_serializer.data,
            "folders": folder_serializer.data,
            "current_folder": folder_id,
            "current_email": current_email,
            "current_first_name": current_first_name
        })


    def patch(self, request, file_id=None, format=None):
        try:
            # Retrieve the file by ID
            file = UploadedFile.objects.get(id=file_id)

            # Ensure the file belongs to the authenticated user
            if file.owner != request.user:
                return Response({"error": "You don't have permission to update this file."}, status=status.HTTP_403_FORBIDDEN)

            # Update the fields provided in the request data
            file.name = request.data.get("name", file.name)
            file.is_public = request.data.get("is_public", file.is_public)
            category_id = request.data.get("category_id")
            if category_id:
                category = Category.objects.filter(id=category_id).first()
                if category:
                    file.category = category

            # Update tags (assuming 'meta_tag_names' is the key sent in the request)
            tags = request.data.get("meta_tag_names", [])


            # Serialize the updated file and return the response
            file_serializer = UploadedFileSerializer(file, data=request.data, partial=True)

            if file_serializer.is_valid():
                file_serializer.save()
                return Response({
                    "message": "File updated successfully",
                    "file": file_serializer.data
                }, status=status.HTTP_200_OK)
                
            else:
                return Response(file_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except UploadedFile.DoesNotExist:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)


# Fetch Categories
def get_categories(request):
    categories = Category.objects.all()
    categories_list = [{"id": category.id, "name": category.name} for category in categories]
    return JsonResponse({"categories": categories_list})


class FileDetailView(RetrieveUpdateAPIView):
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    permission_classes = [IsAuthenticated]


# Create a Folder
class CreateFolderView(generics.CreateAPIView):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer

    def perform_create(self, serializer):
        folder = serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        parent_id = request.data.get('parent') or self.kwargs.get('parent_id')
        name = request.data.get('name')
        parent_id = request.data.get('parent')

        # --- NEW: Check for duplicate folder in the same parent ---
        parent = Folder.objects.filter(id=parent_id).first() if parent_id else None

        duplicate_folder = Folder.objects.filter(
            name=name,
            parent=parent  # Check in the same parent (or None for root)
        ).exists()

        if duplicate_folder:
            return Response(
                {"error": f"A folder named '{name}' already exists in this location."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)    


# Get Folder Contents
class FolderContentsView(generics.RetrieveAPIView):
    # queryset = Folder.objects.all()
    # serializer_class = FolderSerializer    

    def get(self, request, folder_id=None):
        try:
            current_email = request.user.email
            current_first_name = request.user.first_name
            

            # print(current_email)
            is_starred = request.GET.get("starred") == "true"
            is_archived = request.GET.get("archived") == "true"

            
            if folder_id:
                # Fetch files and subfolders for the given folder
                files = UploadedFile.objects.filter(
                    Q(folder_id=folder_id) & (Q(owner=request.user) | Q(is_public=True))
                ).order_by("-uploaded_at")

                subfolders = Folder.objects.filter(
                    Q(parent_id=folder_id) & (Q(owner=request.user) | Q(is_public=True))
                ).order_by("-created_at")
            else:
                # Fetch root-level files and folders
                files = UploadedFile.objects.filter(
                    Q(folder__isnull=True) & (Q(owner=request.user) | Q(is_public=True))
                ).order_by("-uploaded_at")

                subfolders = Folder.objects.filter(
                    Q(parent__isnull=True) & (Q(owner=request.user) | Q(is_public=True))
                ).order_by("-created_at")

            if is_starred:
                files = files.filter(is_starred=True)
                subfolders = subfolders.filter(is_starred=True)

            if is_archived is not None:  
                files = files.filter(is_archived=is_archived)    

            files = files.order_by("-uploaded_at")
            subfolders = subfolders.order_by("-created_at")    

            files_serializer = UploadedFileSerializer(files, many=True, context={'request': request})
            folders_serializer = FolderSerializer(subfolders, many=True, context={'request': request})

            return Response({
                "files": files_serializer.data,
                "folders": folders_serializer.data,
                "current_folder": folder_id,
                "current_email": current_email,
                "current_first_name": current_first_name
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Download  file
def download_file(request, file_id):
    file_instance = get_object_or_404(UploadedFile, id=file_id)

    # Get the file path
    file_path = file_instance.file.path  # Correct field reference

    try:
        response = FileResponse(open(file_path, 'rb'), as_attachment=True)
        response["Content-Disposition"] = f'attachment; filename="{file_instance.name}"'
        return response
    except FileNotFoundError:
        raise Http404("File not found.")


def view_file(request, file_id):
    # Retrieve the file instance from the database
    file_instance = get_object_or_404(UploadedFile, id=file_id)
    
    # Get the file path
    file_path = file_instance.file.path  # Assuming 'file' is the FileField in the model
    
    # Open and serve the file directly to the user
    response = FileResponse(open(file_path, 'rb'))
    return response


# def send_email(request):
#     if request.method == "POST":
#         try:
#             # Parse the JSON data
#             data = json.loads(request.body)
            
#             email = data.get('email')
#             message = data.get('message')
#             file_id = data.get('file_id')

#             if not email or not message:
#                 return JsonResponse({"error": "Email and message are required."}, status=400)

#             # Send the email (modify the logic as per your needs)
#             send_mail(
#                 'Subject - Your transfer',  # The email subject
#                  message,  # The message body
#                 'passengerlunar@gmail.com',  # From email
#                  [email],  # To email
#                  fail_silently=False,
#             )

#             return JsonResponse({"message": "Email sent successfully!"}, status=200)

#         except Exception as e:
#             return JsonResponse({"error": str(e)}, status=400)
#     return JsonResponse({"error": "Invalid request method."}, status=400)
                                                  
                                                    
# class Sendmail(APIView):
#     def post(self, request):
#         email = data.get('email')
#         message = data.get('message')
#         # file_id = data.get('file_id')


#         # email = request.data['d']
#         emailw = EmailMessage(
#             'Test email Subject',
#             'Test emal body, this msg is from python', 
#             setting.EMAIL_HOST_USER, 
#             [email]
#         )

#         # emailw.attach_file('')
#         emailw.send(fail_silently=False)
#         return Response({'status': True, 'message': 'Email Sent Successfully' })


class DeleteUploadedFileView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, file_id):
        try:
            uploaded_file = UploadedFile.objects.get(id=file_id)

           
            if uploaded_file.owner != request.user:
                return Response({'error': 'You do not have permission to delete this file.'}, status=403)

            uploaded_file.delete()
            return Response({'message': 'File deleted successfully.'})

        except UploadedFile.DoesNotExist:
            return Response({'error': 'File not found.'}, status=404)




class ToggleStarredView(APIView):
    """
    View to toggle the 'is_starred' status of a file.
    """
    def post(self, request, file_id):
        try:
            file = UploadedFile.objects.get(id=file_id)
            file.is_starred = not file.is_starred  # Toggle the status
            file.save()
            return Response(
                {"message": "File starred status updated", "is_starred": file.is_starred},
                status=status.HTTP_200_OK,
            )
        except UploadedFile.DoesNotExist:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class ToggleFolderStarredView(APIView):
    """
    View to toggle the 'is_starred' status of a folder.
    """
    def post(self, request, folder_id):
        try:
            folder = Folder.objects.get(id=folder_id)
            folder.is_starred = not folder.is_starred  # Toggle the status
            folder.save()
            return Response(
                {"message": "Folder starred status updated", "is_starred": folder.is_starred},
                status=status.HTTP_200_OK,
            )
        except Folder.DoesNotExist:
            return Response(
                {"error": "Folder not found"},
                status=status.HTTP_404_NOT_FOUND
            )



class ToggleArchivedView(APIView):
    """
    View to toggle the 'is_archived' status of a file.
    """
    def post(self, request, file_id):
        try:
            file = UploadedFile.objects.get(id=file_id)
            file.is_archived = not file.is_archived  # Toggle the status
            file.save()
            return Response(
                {"message": "File archived status updated", "is_archived": file.is_archived},
                status=status.HTTP_200_OK,
            )
        except UploadedFile.DoesNotExist:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )        


def logout_view(request):
    logout(request)
    redirect_uri = config("REDIRCET_URI")  
    logout_url = f"{settings.OIDC_OP_LOGOUT_ENDPOINT}?{urlencode({'post_logout_redirect_uri': redirect_uri, 'client_id': settings.OIDC_RP_CLIENT_ID})}"
    return redirect(logout_url)


class UploadNewVersionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, file_id):
        try:
            uploaded_file = UploadedFile.objects.get(id=file_id)

            if uploaded_file.owner != request.user:
                return Response(
                    {"error": "You are not authorized to upload a new version of this file."},
                    status=403
                )

            new_file = request.FILES['new_version']
            file_name = new_file.name.split('/')[-1]
            file_type = file_name.split('.')[-1].lower()
            file_size = new_file.size

            # If no versions exist, this is the base version
            if not FileVersion.objects.filter(uploaded_file=uploaded_file).exists():
                FileVersion.objects.create(
                    uploaded_file=uploaded_file,
                    version_number=0,
                    file=uploaded_file.file,
                    file_name=uploaded_file.file.name.split("/")[-1],
                    file_size=uploaded_file.file_size,
                    file_type=uploaded_file.file_type,
                    uploaded_by=uploaded_file.owner,
                    change_note="Base version",
                    is_current=False  # Base version is not current anymore
                )
                version_number = 1
            else:
                latest_version = FileVersion.objects.filter(uploaded_file=uploaded_file).order_by('-version_number').first()
                version_number = latest_version.version_number + 1 if latest_version else 1

            # Set all previous versions to not current
            FileVersion.objects.filter(uploaded_file=uploaded_file).update(is_current=False)

            # Create new version as current
            FileVersion.objects.create(
                uploaded_file=uploaded_file,
                version_number=version_number,
                file=new_file,
                file_name=file_name,
                file_size=file_size,
                file_type=file_type,
                uploaded_by=request.user,
                change_note=request.data.get('change_note', ''),
                is_current=True  # ✅ This is the current version now
            )

            # Update current file in UploadedFile
            uploaded_file.file = new_file
            uploaded_file.name = file_name
            uploaded_file.file_size = file_size
            uploaded_file.file_type = file_type
            uploaded_file.save()

            return Response({'message': 'New version uploaded'})

        except UploadedFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=404)


class FileVersionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            uploaded_file = UploadedFile.objects.get(id=file_id)

            
            if not FileVersion.objects.filter(uploaded_file=uploaded_file, version_number=0).exists():
                FileVersion.objects.create(
                    uploaded_file=uploaded_file,
                    version_number=0,
                    file=uploaded_file.file,
                    file_name=uploaded_file.file.name.split("/")[-1],
                    file_size=uploaded_file.file_size,
                    file_type=uploaded_file.file_type,
                    uploaded_by=uploaded_file.owner,
                    change_note="Base version",
                    uploaded_at=uploaded_file.uploaded_at,
                    is_current=True 
                )

            versions = uploaded_file.versions.order_by("uploaded_at")

            version_history = []

            is_owner = request.user == uploaded_file.owner
            current_file_path = uploaded_file.file.name

            for version in versions:
                version_history.append({
                    "id": version.id,
                    "version_number": version.version_number,
                    "file_name": version.file.name.split("/")[-1],
                    "uploaded_by_name": version.uploaded_by.get_full_name() if version.uploaded_by else "Unknown",
                    "uploaded_at": version.uploaded_at.isoformat(),
                    "change_note": version.change_note or "",
                    "uploaded_file_url": version.file.url,
                    "is_current": version.is_current,
                })
            return Response({
                "is_owner": is_owner,
                "versions": sorted(version_history, key=lambda x: x["uploaded_at"], reverse=True)
            })

        except UploadedFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=404)




class RevertVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id, version_id):
        try:
            version = FileVersion.objects.get(id=version_id, uploaded_file__id=file_id)
            uploaded_file = version.uploaded_file

            # Update uploaded_file to match selected version
            uploaded_file.file = version.file
            uploaded_file.name = version.file.name.split("/")[-1]
            uploaded_file.file_size = version.file_size
            uploaded_file.file_type = version.file_type
            uploaded_file.save()

            # Update all other versions to is_current=False
            FileVersion.objects.filter(uploaded_file=uploaded_file).exclude(id=version.id).update(is_current=False)

            # Mark this version as current
            version.is_current = True
            version.uploaded_at = now()
            version.save(update_fields=["is_current", "uploaded_at"])

            return Response({'message': 'Reverted successfully'})

        except FileVersion.DoesNotExist:
            return Response({'error': 'Version not found'}, status=404)


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return reminders for the current user
        return Reminder.objects.filter(user=self.request.user).order_by('-remind_at')

    def perform_create(self, serializer):
        # Automatically assign the user to the reminder
        serializer.save(user=self.request.user)


class UpcomingRemindersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        start = now - timedelta(minutes=10)
        end = now + timedelta(hours=1)

        reminders = Reminder.objects.filter(
            user=request.user,
            remind_at__range=(start, end)
        ).order_by("remind_at")

        serializer = ReminderSerializer(reminders, many=True)
        return Response(serializer.data)