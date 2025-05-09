from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.utils import timezone



from .models import UploadedFile, FileSharing
from .serializers import FileSharingSerializer

class ShareItemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_id = request.data.get("id")      # ID of the file to share
        email = request.data.get("email")     # Recipient's email
        message = request.data.get("message") # Optional message

        if not all([file_id, email]):
            return Response({"error": "File ID and recipient email are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup recipient
        try:
            recipient = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "No user found with that email."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup file and verify ownership
        file = get_object_or_404(UploadedFile, id=file_id)
        if file.owner != request.user:
            return Response({"error": "You do not own this file."}, status=status.HTTP_403_FORBIDDEN)

        # Prevent duplicate sharing
        try:
            share = FileSharing.objects.create(
                file=file,
                shared_by=request.user,
                shared_to=recipient,
                message=message,
                share_type=FileSharing.FILE,
                shared_at=timezone.now()
            )
        except IntegrityError:
            return Response({"error": "This file is already shared with this user."}, status=status.HTTP_400_BAD_REQUEST)

        # Optional: return the created share info
        serializer = FileSharingSerializer(share)
        return Response({
            "message": "File shared successfully.",
            "shared": serializer.data
        }, status=status.HTTP_201_CREATED)



class SharedWithMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shares = FileSharing.objects.filter(shared_to=request.user, share_type=FileSharing.FILE).select_related('file', 'shared_by').order_by('-shared_at') 
        serializer = FileSharingSerializer(shares, many=True, context={'request': request})
        return Response({"files": serializer.data}, status=status.HTTP_200_OK)


# views.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shared_unseen_count(request):
    count = FileSharing.objects.filter(shared_to=request.user, is_seen=False, share_type=FileSharing.FILE).count()
    return Response({'count': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_shared_as_seen(request):
    FileSharing.objects.filter(shared_to=request.user, is_seen=False).update(is_seen=True)
    return Response({'status': 'marked_as_seen'})
