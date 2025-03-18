from django.contrib.postgres.search import SearchVector
from django.shortcuts import render, get_object_or_404
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.views import APIView
from .models import UploadedFile, Category, Folder
from .serializers import UploadedFileSerializer, FolderSerializer
from django.http import JsonResponse, FileResponse, Http404
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.mail import send_mail
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.mail import EmailMessage
import json

# Create your views here.
def home(request):
    return render(request, 'home.html')

def files(request):
    return render(request, 't_files.html')


def myFiles(request, folder_id=None):
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
    permission_classes = []  # No authentication required

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
                folder=folder
            )
            uploaded_file.save()
            uploaded_files.append(uploaded_file)

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
        """Return all uploaded files sorted by latest."""
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
                "folders": [],  # ✅ Send an empty list for folders
                "current_folder": None  # No specific folder
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

        file_serializer = UploadedFileSerializer(files, many=True)
        folder_serializer = FolderSerializer(folders, many=True)
        # print(file_serializer.data)

        return Response({
            "files": file_serializer.data,
            "folders": folder_serializer.data,
            "current_folder": folder_id
        })

# Fetch Categories
def get_categories(request):
    categories = Category.objects.all()
    categories_list = [{"id": category.id, "name": category.name} for category in categories]
    return JsonResponse({"categories": categories_list})


# Create a Folder
class CreateFolderView(generics.CreateAPIView):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer

    def perform_create(self, serializer):
        folder = serializer.save()

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

            is_starred = request.GET.get("starred") == "true"
            is_archived = request.GET.get("archived") == "true"
            
            if folder_id:
                # Fetch files and subfolders for the given folder
                files = UploadedFile.objects.filter(folder_id=folder_id).order_by("-uploaded_at")
                subfolders = Folder.objects.filter(parent_id=folder_id).order_by("-created_at")
            else:
                # Fetch root-level files and folders
                files = UploadedFile.objects.filter(folder__isnull=True).order_by("-uploaded_at")
                subfolders = Folder.objects.filter(parent__isnull=True).order_by("-created_at")

            if is_starred:
                files = files.filter(is_starred=True)
                subfolders = subfolders.filter(is_starred=True)

            if is_archived is not None:  
                files = files.filter(is_archived=is_archived)    

            files = files.order_by("-uploaded_at")
            subfolders = subfolders.order_by("-created_at")    

            files_serializer = UploadedFileSerializer(files, many=True)
            folders_serializer = FolderSerializer(subfolders, many=True)

            return Response({
                "files": files_serializer.data,
                "folders": folders_serializer.data,
                "current_folder": folder_id  # If None, it means root
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
                                                  
                                                    
class Sendmail(APIView):
    def post(self, request):
        email = data.get('email')
        message = data.get('message')
        # file_id = data.get('file_id')


        # email = request.data['d']
        emailw = EmailMessage(
            'Test email Subject',
            'Test emal body, this msg is from python', 
            setting.EMAIL_HOST_USER, 
            [email]
        )

        # emailw.attach_file('')
        emailw.send(fail_silently=False)
        return Response({'status': True, 'message': 'Email Sent Successfully' })


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