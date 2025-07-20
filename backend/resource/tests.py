from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import UploadedFile, Category
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

# Create your tests here.

class FileUploadTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass', email='test@example.com')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create a test category
        self.category = Category.objects.create(name="Test Category")

    def test_file_upload_with_category(self):
        # Create a test file
        file_content = b'test content for upload'
        file = SimpleUploadedFile('test_file.txt', file_content, content_type='text/plain')
        
        # Upload file with category
        response = self.client.post('/api/file-upload/', {
            'files': file,
            'category_id': self.category.id
        }, format='multipart')
        
        # Check response
        self.assertEqual(response.status_code, 201)
        self.assertIn('Files uploaded successfully', response.json().get('message', ''))
        
        # Check file was created with correct category
        uploaded_file = UploadedFile.objects.filter(name='test_file.txt').first()
        self.assertIsNotNone(uploaded_file)
        self.assertEqual(uploaded_file.category, self.category)
        self.assertEqual(uploaded_file.file_type, 'txt')
        self.assertEqual(uploaded_file.file_size, len(file_content))

    def test_file_upload_without_category(self):
        # Create a test file
        file_content = b'test content for upload'
        file = SimpleUploadedFile('test_file2.txt', file_content, content_type='text/plain')
        
        # Upload file without category (should use default)
        response = self.client.post('/api/file-upload/', {
            'files': file
        }, format='multipart')
        
        # Check response
        self.assertEqual(response.status_code, 201)
        
        # Check file was created with default category
        uploaded_file = UploadedFile.objects.filter(name='test_file2.txt').first()
        self.assertIsNotNone(uploaded_file)
        self.assertIsNotNone(uploaded_file.category)  # Should have default category
