# Backend Context: Django REST + Keycloak + React Integration

## 1. Project Overview
This project is a **document/resource management system** built with Django and Django REST Framework (DRF), using Keycloak for authentication. It is being refactored for a modern React (Vite + TypeScript + TailwindCSS) frontend, with all API endpoints under `/api/` and JWT (Bearer) authentication.

---

## 2. Architecture & Design
- **Backend:** Django 5.x, DRF, Keycloak (OIDC/JWT), PostgreSQL (via Docker), modular app structure.
- **Frontend:** React SPA (served separately, not by Django), communicates via REST API.
- **API:** All endpoints are under `/api/` (see `resource/api_urls.py`).
- **Authentication:** Keycloak JWT (Bearer) tokens, validated by a custom DRF authentication class.
- **Static/Media:** Django serves static/media for admin and legacy UI only; React will handle all new UI.
- **Dockerized:** Dockerfile and docker-compose for local/prod deployment.

---

## 3. Key Backend Files & Their Roles
- `resource/models.py`: All core models (UploadedFile, Folder, Category, Tag, FileVersion, FileSharing, Reminder).
- `resource/views.py`: API and HTML views for file/folder CRUD, upload, versioning, reminders, etc.
- `resource/sharing_views.py`: API endpoints for sharing files/folders and sending emails.
- `resource/serializers.py`: DRF serializers for all models, including nested and custom fields.
- `resource/api_urls.py`: All API endpoints, grouped under `/api/`.
- `resource/keycloak_jwt_auth.py`: Custom DRF authentication class for Keycloak JWT validation.
- `resource_center/settings.py`: All Django/DRF/Keycloak/CORS/static config.
- `static/js/base.js`: Main custom JS logic for file/folder UI, upload, sharing, reminders, etc. (to be ported to React).
- `static/js/actionHandler.js`: Utility for AJAX actions with SweetAlert2 feedback.
- `static/js/table.js`: DataTables logic for file/folder tables.
- `static/js/home.js`, `main.js`: Home/dashboard UI logic and chart rendering.

---

## 4. API Endpoints (resource/api_urls.py)
All API endpoints are under `/api/`. Key endpoints:
- `file-upload/`, `file-upload/<folder_id>/`: Upload files (POST, GET for listing).
- `folders/`, `folders/<parent_id>/`: Create folders.
- `folder-contents/`, `folder-contents/<folder_id>/`: List folder contents.
- `files/<file_id>/delete/`: Delete file.
- `files/<file_id>/toggle-star/`, `folders/<folder_id>/toggle-star/`: Star/unstar.
- `files/<file_id>/toggle-archive/`: Archive/unarchive.
- `files-update/<pk>/`: File detail/update.
- `files/<file_id>/upload-new-version/`: Upload new file version.
- `files/<file_id>/version-history/`: List file versions.
- `files/<file_id>/revert-version/<version_id>/`: Revert to version.
- `reminders/`, `reminders/upcoming/`: CRUD and upcoming reminders.
- `share/`, `shared-with-me/`, `shared-with-me/unseen-count/`, `shared-with-me/mark-seen/`: File sharing APIs.
- `send-email/`: Send file via email.

All endpoints require Bearer JWT authentication.

---

## 5. Models (resource/models.py)
- **Category**: File categories (with default 'General').
- **Tag**: File tags (many-to-many with files).
- **Folder**: Hierarchical folders (parent/child, owner, starred, public).
- **UploadedFile**: File metadata, owner, category, folder, versioning, sharing, tags, starred/archived/public.
- **FileSharing**: Tracks sharing of files/folders between users.
- **FileVersion**: Version history for files.
- **Reminder**: User reminders for files (with repeat options).

---

## 6. Authentication (Keycloak JWT)
- **Frontend**: React logs in via Keycloak, gets a JWT (access token).
- **Backend**: Custom DRF class (`KeycloakJWTAuthentication`) validates JWTs using Keycloak's JWKS endpoint, maps user claims to Django users (auto-creates if needed).
- **API Usage**: All API requests must include `Authorization: Bearer <token>`.
- **No CSRF/session required for API** (stateless JWT auth).

---

## 7. Static JS Logic (static/js/)
- **base.js**: Handles file/folder CRUD, uploads (with Dropzone), category/tag selection, starring/archiving, sharing (with SweetAlert2), reminders, versioning, and UI updates. Uses fetch API for AJAX, expects JSON responses from Django API.
- **actionHandler.js**: Utility for AJAX actions with SweetAlert2 feedback, CSRF token handling (legacy, not needed for JWT API calls).
- **table.js**: DataTables setup for file/folder tables, search/filter, row selection, and action bar logic.
- **home.js**: Home page UI effects, smooth scrolling, navbar, animations, and analytics hooks.
- **main.js**: Chart rendering for dashboard (Chart.js).

**Note:** All this logic will be ported to React components. The API contract (URLs, payloads, responses) should remain unchanged for a smooth migration.

---

## 8. Integration Guidelines (React + Django)
- **Frontend**:
  - Use Keycloak JS or OIDC client to log in and get JWT.
  - Store JWT in memory (or secure storage, not localStorage for XSS safety).
  - Send `Authorization: Bearer <token>` in all API requests.
  - Use `/api/` as the base URL for all API calls (`VITE_API_URL`).
  - Port all logic from `static/js/` to React components/hooks (file/folder CRUD, upload, sharing, reminders, etc.).
  - Use React Query or SWR for data fetching/caching if desired.
- **Backend**:
  - All API endpoints require JWT Bearer auth.
  - No CSRF/session required for API.
  - CORS is enabled for `http://localhost:5173` (Vite dev server).
  - Static/media files are served for admin/legacy only; React handles all new UI.
- **Deployment**:
  - Django and React are deployed separately (Django = API only, React = SPA/static hosting).
  - Use Docker/Docker Compose for local/prod deployment.

---

## 9. Best Practices & Recommendations
- **Keep API contract stable** during migration.
- **Write React components** that mirror the logic in `base.js` and related JS files.
- **Use environment variables** for API URLs and Keycloak config in React.
- **Test all API endpoints** with JWTs before switching frontend.
- **Document any changes** to API payloads or responses.

---

## 10. Quick Reference
- **API base:** `/api/`
- **Auth:** Bearer JWT (Keycloak)
- **Main models:** UploadedFile, Folder, FileVersion, FileSharing, Reminder
- **Legacy JS logic:** See `static/js/base.js` and related files
- **React integration:** Use Keycloak JS, send JWT in all API requests

---

This file should be kept up-to-date as the backend or integration evolves. It is the single source of truth for backend architecture, API, and integration context for AI and developers. 