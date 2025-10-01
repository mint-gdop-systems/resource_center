from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from datetime import datetime
from django.utils.html import strip_tags


from .models import UploadedFile, FileSharing, Folder, ShareLink, UserProfile
from .serializers import FileSharingSerializer, EmailShareSerializer

class ShareItemView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all shares created by the current user"""
        try:
            shares = FileSharing.objects.filter(shared_by=request.user).select_related(
                'file', 'folder', 'shared_to'
            ).order_by('-shared_at')
            
            serializer = FileSharingSerializer(shares, many=True, context={'request': request})
            return Response({"shares": serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Share multiple files and/or folders with multiple users"""
        file_ids = request.data.get("file_ids", [])
        folder_ids = request.data.get("folder_ids", [])
        emails = request.data.get("emails", [])
        message = request.data.get("message", "")
        is_reshare = request.data.get("is_reshare", False)
        
        # Validate input
        if not emails:
            return Response({"error": "At least one recipient email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file_ids and not folder_ids:
            return Response({"error": "At least one file or folder must be selected."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate and get files with proper permission checks
        files = []
        if file_ids:
            all_files = UploadedFile.objects.filter(id__in=file_ids)
            for file in all_files:
                if is_reshare:
                    # For reshare, check if user has access and reshare permission
                    if file.owner == request.user or file.is_accessible_by(request.user):
                        files.append(file)
                    else:
                        return Response({"error": f"You don't have permission to reshare '{file.name}'."}, status=status.HTTP_403_FORBIDDEN)
                else:
                    # For regular share, user must be owner
                    if file.owner == request.user:
                        files.append(file)
                    else:
                        return Response({"error": f"You don't own '{file.name}' and cannot share it."}, status=status.HTTP_403_FORBIDDEN)
            
            if len(files) != len(file_ids):
                return Response({"error": "Some files not found or you don't have permission."}, status=status.HTTP_403_FORBIDDEN)

        # Validate and get folders with proper permission checks
        folders = []
        if folder_ids:
            all_folders = Folder.objects.filter(id__in=folder_ids)
            for folder in all_folders:
                if is_reshare:
                    # For reshare, check if user has access and reshare permission
                    if folder.owner == request.user or folder.is_accessible_by(request.user):
                        folders.append(folder)
                    else:
                        return Response({"error": f"You don't have permission to reshare '{folder.name}'."}, status=status.HTTP_403_FORBIDDEN)
                else:
                    # For regular share, user must be owner
                    if folder.owner == request.user:
                        folders.append(folder)
                    else:
                        return Response({"error": f"You don't own '{folder.name}' and cannot share it."}, status=status.HTTP_403_FORBIDDEN)
            
            if len(folders) != len(folder_ids):
                return Response({"error": "Some folders not found or you don't have permission."}, status=status.HTTP_403_FORBIDDEN)

        # Process sharing
        shared = []
        errors = []
        created_shares = []

        for email in emails:
            try:
                recipient = User.objects.get(email=email)
                user_shared = []
                user_errors = []

                # Share files
                for file in files:
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
                        user_shared.append(f"File: {file.name}")
                        created_shares.append(share)
                    else:
                        user_errors.append(f"File '{file.name}' already shared with {email}")

                # Share folders
                for folder in folders:
                    share, created = FileSharing.objects.get_or_create(
                        folder=folder,
                        shared_to=recipient,
                        defaults={
                            'shared_by': request.user,
                            'message': message,
                            'share_type': FileSharing.FOLDER,
                            'shared_at': timezone.now()
                        }
                    )
                    if created:
                        user_shared.append(f"Folder: {folder.name}")
                        created_shares.append(share)
                    else:
                        user_errors.append(f"Folder '{folder.name}' already shared with {email}")

                if user_shared:
                    shared.append({
                        "email": email,
                        "items": user_shared
                    })
                
                if user_errors:
                    errors.extend(user_errors)

            except User.DoesNotExist:
                errors.append(f"No user found with email {email}")
            except Exception as e:
                errors.append(f"Error sharing with {email}: {str(e)}")

        # Prepare response
        response_data = {
            "message": f"Successfully shared with {len(shared)} users",
            "shared": shared,
            "total_shares_created": len(created_shares)
        }

        if errors:
            response_data["errors"] = errors
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        
        return Response(response_data, status=status.HTTP_201_CREATED)



class SharedWithMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all files and folders shared with the current user"""
        try:
            # Update last_shared_visit timestamp when user visits this page
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            profile.last_shared_visit = timezone.now()
            profile.save()
            
            shares = FileSharing.objects.filter(
                shared_to=request.user
            ).select_related('file', 'folder', 'shared_by').order_by('-shared_at')
            
            serializer = FileSharingSerializer(shares, many=True, context={'request': request})
            
            # Separate files and folders for easier frontend handling
            files = [share for share in serializer.data if share.get('share_type') == 'FILE']
            folders = [share for share in serializer.data if share.get('share_type') == 'FOLDER']
            
            return Response({
                "shares": serializer.data,
                "files": files,
                "folders": folders,
                "total_count": len(serializer.data)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        """Delete shared items - this removes the sharing relationship"""
        share_ids = request.data.get('share_ids', [])
        
        if not share_ids:
            return Response({"error": "No share IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Only allow deletion of shares where the current user is the recipient
            shares_to_delete = FileSharing.objects.filter(
                id__in=share_ids,
                shared_to=request.user
            )
            
            deleted_count = shares_to_delete.count()
            if deleted_count == 0:
                return Response({"error": "No valid shares found to delete."}, status=status.HTTP_404_NOT_FOUND)
            
            shares_to_delete.delete()
            
            return Response({
                "message": f"Successfully removed {deleted_count} shared item(s) from your view.",
                "deleted_count": deleted_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shared_unseen_count(request):
    """Get count of shared items newer than last visit (simple timestamp-based)"""
    try:
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # If user has never visited shared page, count all shares
        if not profile.last_shared_visit:
            count = FileSharing.objects.filter(shared_to=request.user).count()
        else:
            # Count shares newer than last visit
            count = FileSharing.objects.filter(
                shared_to=request.user,
                shared_at__gt=profile.last_shared_visit
            ).count()
        
        return Response({'count': count})
    except Exception as e:
        return Response({'count': 0, 'error': str(e)})


# Note: mark_shared_as_seen is no longer needed with timestamp-based approach
# The SharedWithMeView.get() method automatically updates last_shared_visit timestamp


class SendFileEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Send multiple files via email to multiple recipients"""
        file_ids = request.data.get('file_ids', [])
        recipients = request.data.get('recipients', [])
        message = request.data.get('message', '')
        
        # Validate input
        if not file_ids or not recipients:
            return Response({
                'error': 'File IDs and recipient emails are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate email format
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        
        for email in recipients:
            try:
                validate_email(email)
            except ValidationError:
                return Response({
                    'error': f'Invalid email format: {email}'
                }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get files and validate ownership
            files = UploadedFile.objects.filter(id__in=file_ids, owner=request.user)
            if len(files) != len(file_ids):
                return Response({
                    'error': 'Some files not found or you don\'t have permission'
                }, status=status.HTTP_403_FORBIDDEN)

            # Prepare email content
            sender_email = request.user.email if request.user.is_authenticated else settings.DEFAULT_FROM_EMAIL
            sender_name = f"{request.user.first_name} {request.user.last_name}".strip() or sender_email
            
            # Create PUBLIC share links for email (no authentication required)
            file_list = []
            for file in files:
                # Create or get existing share link
                share_link, created = ShareLink.objects.get_or_create(
                    file=file,
                    created_by=request.user,
                    is_active=True,
                    defaults={
                        'share_id': ShareLink.generate_share_id(),
                        'expires_at': timezone.now() + timedelta(days=30)  # 30 days expiry
                    }
                )
                
                # Generate public download URL (works from any device)
                download_url = request.build_absolute_uri(f'/api/share/{share_link.share_id}/')
                
                file_list.append({
                    'name': file.name,
                    'download_url': download_url,
                    'size': file.file_size,
                    'type': file.file_type,
                    'share_id': share_link.share_id
                })

            subject = f"{sender_name} shared {len(files)} file{'s' if len(files) > 1 else ''} with you"
            
            context = {
                'message': message,
                'files': file_list,
                'sender': sender_name,
                'sender_name': sender_name,
                'sender_email': sender_email,
                'file_count': len(files),
                'current_year': datetime.now().year,
                'is_multiple': len(files) > 1,
                # For single files, provide download_url for template compatibility
                'download_url': file_list[0]['download_url'] if len(file_list) == 1 else None
            }

            # Render email templates
            try:
                html_content = render_to_string("email_template.html", context)
                plain_text = strip_tags(html_content)
            except Exception:
                # Fallback to simple text if template fails
                file_links = '\n'.join([f"- {f['name']}: {f['download_url']}" for f in file_list])
                plain_text = f"""
{message}

Files shared with you:
{file_links}

Shared by: {sender_name} ({sender_email})
"""
                html_content = plain_text.replace('\n', '<br>')

            # Send email
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=f"MinT <{settings.DEFAULT_FROM_EMAIL}>",
                to=recipients,
                reply_to=[sender_email] if sender_email else None
            )
            email.attach_alternative(html_content, "text/html")
            email.send()

            return Response({
                'success': 'Email sent successfully!',
                'sent_to': recipients,
                'file_count': len(files),
                'files_sent': [f.name for f in files]
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to send email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        