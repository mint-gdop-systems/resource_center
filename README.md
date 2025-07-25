# MINT Resource Center

A modern Document & Resource Management System built with Django REST Framework and React, featuring secure Keycloak authentication and comprehensive file management capabilities.

## Features

- **Secure Authentication**: Keycloak-based JWT authentication
- **File Management**: Upload, organize, and manage files with categories
- **Folder Structure**: Create and navigate through folder hierarchies
- **Version Control**: Track file versions and changes
- **File Sharing**: Share files with team members
- **Search & Filter**: Find files by name, category, or extension
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Tech Stack

### Backend
- Django 5.x + Django REST Framework
- PostgreSQL (via Docker)
- Keycloak for authentication
- Python 3.8+

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- FontAwesome icons
- Node.js 16+

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- Docker and Docker Compose
- Keycloak server

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (copy from example)
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables (copy from example)
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## Environment Variables

### Backend (.env)
```
OIDC_RP_CLIENT_ID=your_client_id
OIDC_RP_CLIENT_SECRET=your_client_secret
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=mint
OIDC_LOGOUT_REDIRECT_URL=http://localhost:8090
OIDC_LOGIN_REDIRECT_URL=http://localhost:8090
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=mint
VITE_KEYCLOAK_CLIENT_ID=resource_center
```

## Project Structure

```
resource_center/
├── backend/
│   ├── resource/           # Django app
│   │   ├── models.py      # Database models
│   │   ├── views.py       # API views
│   │   ├── serializers.py # DRF serializers
│   │   └── api_urls.py    # API endpoints
│   ├── resource_center/   # Django project settings
│   └── manage.py
├── frontend/
│   ├── client/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── contexts/     # React contexts
│   └── package.json
```

## API Endpoints

All endpoints require JWT authentication (`Authorization: Bearer <token>`).

- `POST /api/file-upload/` - Upload files
- `GET /api/folder-contents/` - List files and folders
- `POST /api/folders/` - Create folders
- `PATCH /api/files/<file_id>/toggle-star/` - Star/unstar file
- `PATCH /api/files/<file_id>/toggle-archive/` - Archive/unarchive file
- `POST /api/files/<file_id>/upload-new-version/` - Upload new version
- `GET /api/files/<file_id>/version-history/` - Get version history
- `POST /api/share/` - Share file/folder
- `GET /api/shared-with-me/` - List shared items
- `POST /api/send-email/` - Send file via email

## Production Deployment

### Backend
1. Set up PostgreSQL database
2. Configure production settings in `resource_center/settings.py`
3. Set up Gunicorn/uWSGI
4. Configure static/media file serving
5. Set production environment variables

### Frontend
1. Build the production bundle:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `dist/` directory to your static hosting
3. Configure production environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For support and questions, please contact the development team or open an issue on GitHub.

## License

Copyright © 2024 MINT. All rights reserved.