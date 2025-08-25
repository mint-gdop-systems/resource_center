# MINT Resource Center 🚀

A modern, enterprise-grade document management system built for the Ministry of Innovation and Technology (MINT). This comprehensive platform provides secure file storage, organization, and collaboration features with a professional user interface.

## ✨ Features

### 🎨 **Modern Dashboard**
- **Dual Experience Design**: Tailored interfaces for authenticated and unauthenticated users
- **Real-time Statistics**: Live data from backend including file counts, storage usage, and activity metrics
- **Professional Welcome Section**: Gradient backgrounds, feature showcases, and trust indicators
- **Quick Actions**: One-click access to common tasks (upload, create folder, search, etc.)
- **Activity Feed**: Real-time tracking of user actions and file operations

### 📁 **File Management**
- **Multiple View Modes**: Grid and list views with sorting and filtering
- **Drag & Drop Upload**: Modern file upload with progress tracking
- **Version Control**: Track file versions, see change history, and revert to previous versions
- **Folder Organization**: Create, organize, and manage folder structures
- **Bulk Operations**: Select multiple files for batch operations (delete, move, share, etc.)

### 🔐 **Security & Sharing**
- **Keycloak Integration**: Enterprise-grade authentication and authorization
- **Secure File Sharing**: Share files and folders with granular permissions
- **Public Share Links**: Generate time-limited public access links
- **Email Integration**: Send files directly via email with attachments
- **Access Control**: Role-based permissions and audit trails

### 🔍 **Advanced Features**
- **Powerful Search**: Find files instantly with advanced filtering
- **File Categories**: Organize files with custom categories and tags
- **Starred Files**: Mark important files for quick access
- **Archive System**: Archive old files while maintaining accessibility
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

## 🏗️ **Architecture**

### **Backend (Django + PostgreSQL)**
- **Django REST Framework**: Robust API with comprehensive endpoints
- **PostgreSQL Database**: Reliable data storage with advanced querying
- **Keycloak Authentication**: Enterprise SSO integration
- **File Storage**: Secure file handling with metadata management
- **Email Services**: Integrated email functionality for notifications and sharing

### **Frontend (React + TypeScript)**
- **React 18**: Modern React with hooks and context API
- **TypeScript**: Type-safe development with comprehensive interfaces
- **Tailwind CSS**: Utility-first styling with custom MINT theme
- **Framer Motion**: Smooth animations and transitions
- **FontAwesome Icons**: Professional iconography throughout the application

### **DevOps & Deployment**
- **Docker Containerization**: Multi-stage builds for development and production
- **Docker Compose**: Orchestrated services for easy deployment
- **Nginx**: High-performance web server and reverse proxy
- **Environment Configuration**: Flexible configuration for different environments

## 🚀 **Quick Start**

### **Prerequisites**
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### **Development Setup**

1. **Clone the repository**
   ```bash
   git clone https://github.com/passenger184/resource.git
   cd resource
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Configure your environment variables
   # Update database credentials, Keycloak settings, etc.
   ```

3. **Start with Docker Compose**
   ```bash
   # Development environment
   docker-compose up -d
   
   # The application will be available at:
   # Frontend: http://localhost:3000
   # Backend API: http://localhost:8000
   # Database: localhost:5432
   ```

4. **Database Setup**
   ```bash
   # Run migrations
   docker-compose exec backend python manage.py migrate
   
   # Create superuser (optional)
   docker-compose exec backend python manage.py createsuperuser
   ```

### **Local Development**

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend Setup:**
```bash
cd frontend
npm install  # or pnpm install
npm run dev  # or pnpm dev
```

## 📚 **API Documentation**

### **Key Endpoints**

#### **Authentication**
- `POST /api/auth/login/` - User authentication
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/user/` - Get current user info

#### **File Management**
- `GET /api/files/` - List files and folders
- `POST /api/file-upload/` - Upload files
- `GET /api/files/{id}/` - Get file details
- `DELETE /api/files/{id}/delete/` - Delete file
- `POST /api/files/{id}/toggle-star/` - Toggle file star status

#### **Dashboard Analytics**
- `GET /api/dashboard/stats/` - Get dashboard statistics
- `GET /api/dashboard/activity/` - Get recent activity feed

#### **Sharing & Collaboration**
- `POST /api/share/` - Share files with users
- `GET /api/shared-with-me/` - Get files shared with current user
- `POST /api/create-share-links/` - Create public share links

## 🎨 **UI/UX Features**

### **Design System**
- **MINT Color Scheme**: Professional mint green theme with complementary colors
- **Consistent Typography**: Clear hierarchy with proper font weights and sizes
- **Interactive Elements**: Hover effects, smooth transitions, and micro-animations
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### **User Experience**
- **Progressive Disclosure**: Show relevant information based on user context
- **Loading States**: Skeleton animations for better perceived performance
- **Error Handling**: Graceful error messages with retry functionality
- **Empty States**: Helpful guidance when no content is available

## 🔧 **Configuration**

### **Environment Variables**

**Backend (.env):**
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/resource_center
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8000/api
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=your-realm
VITE_KEYCLOAK_CLIENT_ID=your-client-id
```

## 📱 **Mobile Responsiveness**

The application is fully responsive and optimized for:
- **Desktop**: Full-featured experience with sidebar navigation
- **Tablet**: Adaptive layout with collapsible sidebar
- **Mobile**: Touch-optimized interface with mobile-first navigation

## 🧪 **Testing**

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm run test

# E2E tests
npm run test:e2e
```

## 📈 **Performance**

### **Optimization Features**
- **Code Splitting**: Lazy loading of components and routes
- **Image Optimization**: Automatic image compression and format conversion
- **Caching**: Strategic caching of API responses and static assets
- **Bundle Analysis**: Webpack bundle analyzer for optimization insights

### **Monitoring**
- **Error Tracking**: Comprehensive error logging and reporting
- **Performance Metrics**: Real-time performance monitoring
- **User Analytics**: Usage patterns and feature adoption tracking

## 🤝 **Contributing**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### **Development Guidelines**
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Maintain consistent code formatting (Prettier + ESLint)
- Update documentation for API changes
- Follow semantic versioning for releases


## 🙏 **Acknowledgments**

- **Ministry of Innovation and Technology (MINT)** - Project sponsorship and requirements
- **Django Community** - Robust backend framework
- **React Community** - Modern frontend development
- **Tailwind CSS** - Utility-first CSS framework
- **Keycloak** - Identity and access management

## 📞 **Support**

For support and questions:
- **Email**: support@mint.gov.et
- **Issues**: [GitHub Issues](https://github.com/passenger184/resource/issues)

---

**Built with ❤️ for the Ministry of Innovation and Technology**