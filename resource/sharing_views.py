from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from datetime import datetime
from django.utils.html import strip_tags


from .models import UploadedFile, FileSharing 
from .serializers import FileSharingSerializer, EmailShareSerializer

class ShareItemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_id = request.data.get("id")
        emails = request.data.get("emails", [])
        message = request.data.get("message", "")

        if not file_id or not emails:
            return Response({"error": "File ID and recipient emails are required."}, status=status.HTTP_400_BAD_REQUEST)

        file = get_object_or_404(UploadedFile, id=file_id)
        if file.owner != request.user:
            return Response({"error": "You do not own this file."}, status=status.HTTP_403_FORBIDDEN)

        shared = []
        errors = []

        for email in emails:
            try:
                recipient = User.objects.get(email=email)

                share, created = FileSharing.objects.get_or_create(
                    file=file,
                    shared_to=recipient,
                    defaults={
                        'shared_by': request.user,
                        'message': message,
                        'share_type': FileSharing.FILE,
                        'shared_at': timezone.now()
                    }
                )
                if created:
                    shared.append(email)
                else:
                    errors.append(f"{email} already has access.")
            except User.DoesNotExist:
                errors.append(f"No user found with email {email}.")
            except IntegrityError:
                errors.append(f"{email} already shared.")
            except Exception as e:
                errors.append(f"{email}: {str(e)}")

        return Response({
            "message": f"Shared with: {shared}",
            "errors": errors,
        }, status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED)



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


class SendFileEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = EmailShareSerializer(data=request.data)

        if serializer.is_valid():
            recipients = serializer.validated_data['recipients']
            message = serializer.validated_data['message']
            file_id = serializer.validated_data['file_id']

            try:
                file_instance = UploadedFile.objects.get(id=file_id)
                file_url = request.build_absolute_uri(file_instance.file.url)

                subject = "A file has been shared with you"
                sender_email = request.user.email if request.user.is_authenticated else settings.DEFAULT_FROM_EMAIL

                context = {
                    'message': message,
                    'download_url': file_url,
                    'sender': sender_email,  # or name
                    'current_year': datetime.now().year,
                }

              
                html_content = render_to_string("email_template.html", context)
                plain_text = strip_tags(html_content)


                # text_content = f"{message}\n\nDownload here: {file_url}\n\nSent by: {sender_email}"

                email = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_text,
                    from_email="MinT <passengerlunar@gmail.com>",  
                    to=recipients,
                    reply_to=[sender_email] 
                )
                email.attach_alternative(html_content, "text/html")
                email.send()

                return Response({'success': 'Email sent successfully!'}, status=status.HTTP_200_OK)

            except UploadedFile.DoesNotExist:
                return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)