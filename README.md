# Resource Center

A modern file management system built with Django backend and React frontend, featuring Keycloak authentication and comprehensive file organization capabilities.

## 🚀 Features

- **🔐 Secure Authentication**: JWT-based authentication with Keycloak
- **📁 File Management**: Upload, organize, and manage files with categories
- **🏷️ Category System**: Organize files with customizable categories
- **📂 Folder Structure**: Create and navigate through folder hierarchies
- **⭐ Starring System**: Mark important files and folders
- **📦 Archiving**: Archive and unarchive files
- **🔄 Version Control**: Upload new versions of files with change notes
- **📧 Sharing**: Share files with other users via email
- **⏰ Reminders**: Set reminders for important files
- **🔍 Search**: Search through files by name, category, and date
- **📱 Responsive Design**: Modern UI built with React and Tailwind CSS

## 🏗️ Architecture

### Backend (Django)
- **Framework**: Django 5.x with Django REST Framework
- **Authentication**: Keycloak JWT authentication
- **Database**: SQLite (development) / PostgreSQL (production)
- **File Storage**: Local file system with media uploads
- **API**: RESTful API with comprehensive endpoints

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context API
- **HTTP Client**: Axios with JWT interceptors

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- Keycloak server running
- Git

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/passenger184/resource_center_new.git
cd resource_center_new
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your Keycloak configuration

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
OIDC_RP_CLIENT_ID=your_client_id
OIDC_RP_CLIENT_SECRET=your_client_secret
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=mint
OIDC_LOGOUT_REDIRECT_URL=http://localhost:8090
OIDC_LOGIN_REDIRECT_URL=http://localhost:8090
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=mint
VITE_KEYCLOAK_CLIENT_ID=resource_center
```

## 📚 API Endpoints

### Authentication
- `GET /api/get-categories/` - Get all categories
- `GET /api/folder-contents/` - Get files and folders
- `POST /api/file-upload/` - Upload files with category

### File Management
- `GET /api/folder-contents/<folder_id>/` - Get folder contents
- `POST /api/file-upload/<folder_id>/` - Upload to specific folder
- `PATCH /api/file/update/<file_id>/` - Update file metadata
- `DELETE /api/files/<file_id>/delete/` - Delete file

### Version Control
- `POST /api/files/<file_id>/upload-new-version/` - Upload new version
- `GET /api/files/<file_id>/version-history/` - Get version history
- `POST /api/files/<file_id>/revert-version/<version_id>/` - Revert to version

### Sharing & Collaboration
- `POST /api/share/` - Share file with users
- `GET /api/shared-with-me/` - Get files shared with user
- `POST /api/send-email/` - Send file via email

### Reminders
- `GET /api/reminders/upcoming/` - Get upcoming reminders
- `POST /api/reminders/` - Create reminder

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test resource.tests
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Backend Deployment
1. Set up production database (PostgreSQL recommended)
2. Configure production settings
3. Set up static file serving
4. Configure environment variables
5. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy the `dist` folder to your hosting platform
3. Configure environment variables for production

## 📁 Project Structure

```
resource_center_new/
├── backend/
│   ├── resource/
│   │   ├── models.py          # Database models
│   │   ├── views.py           # API views
│   │   ├── serializers.py     # DRF serializers
│   │   ├── api_urls.py        # API URL patterns
│   │   └── keycloak_jwt_auth.py # JWT authentication
│   ├── resource_center/
│   │   ├── settings.py        # Django settings
│   │   └── urls.py            # Main URL patterns
│   └── manage.py
├── frontend/
│   ├── client/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── contexts/         # React contexts
│   │   └── types/            # TypeScript types
│   ├── public/
│   └── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Django REST Framework for the robust API framework
- React and Vite for the modern frontend development experience
- Keycloak for secure authentication
- Tailwind CSS and shadcn/ui for the beautiful UI components

## 📞 Support

For support and questions, please open an issue on GitHub or contact the development team. 