# Frontend Context Guide

This file provides essential context for AI tools and developers working on this frontend project. It describes the project's purpose, structure, integration plan, environment configuration, and workflow rules. **Update this file as integration with the backend progresses.**

---

## 1. 🧠 Project Purpose

This is a **React-based frontend UI** (TypeScript, Vite, Tailwind) designed to connect to a Django REST Framework (DRF) backend. The frontend provides a modern, component-driven user experience for a Resource Center or Document Management System, handling file management, user actions, and dashboard features. All persistent data and authentication will be managed by the backend.

---

## 2. 🏗️ Project Structure Overview

**Main App Directory: `client/`**
- **main.tsx**: App entry point, bootstraps React and providers.
- **App.tsx**: Main app component, sets up routing (React Router), context providers, and global UI (toasts, error boundaries).

**Key Subfolders:**
- **components/**: Modular UI components, grouped by feature:
  - **dashboard/**: Dashboard widgets (e.g., `QuickStats.tsx`, `RecentActivity.tsx`)
  - **files/**: File management UI (e.g., `FileGrid.tsx`, `FileList.tsx`, `FileUpload.tsx`, `BulkActions.tsx`)
  - **layout/**: Layout and navigation (e.g., `Header.tsx`, `Sidebar.tsx`, `Breadcrumb.tsx`, `Layout.tsx`)
  - **ui/**: Reusable atomic UI components (buttons, dialogs, forms, tables, etc.)
  - **ErrorBoundary.tsx**: Global error handling component
- **contexts/**: React Contexts for state management (e.g., `FileContext.tsx` for file state and actions)
- **data/**: Mock/demo data for development only (e.g., `mockData.ts`)
- **hooks/**: Custom React hooks (e.g., `useFileActions.ts`, `useFileNavigation.ts`, `use-toast.ts`)
- **lib/**: Utility functions and helpers (e.g., `utils.ts`)
- **pages/**: Route-level components (e.g., `Dashboard.tsx`, `Files.tsx`, `Login.tsx`, `NotFound.tsx`, `Shared.tsx`, `Starred.tsx`, `Archive.tsx`, `Index.tsx`)
- **types/**: TypeScript type definitions (e.g., `index.ts`)
- **global.css**: Global styles

**Other Important Folders:**
- **public/**: Static assets (favicon, robots.txt, etc.)
- **shared/**: Shared types/utilities (e.g., `api.ts` for shared API types)
- **server/**: Express server for local dev/demo only (not used in production)
  - **routes/**: Demo/dev endpoints (e.g., `demo.ts`)
- **netlify/functions/**: Netlify serverless functions (e.g., `api.ts`)

**Configuration:**
- **vite.config.ts**: Vite build and dev server config (aliases, plugins, etc.)
- **tailwind.config.ts**: Tailwind CSS config
- **tsconfig.json**: TypeScript config

---

## 3. 🔌 Backend Integration Plan

- The frontend communicates with the Django DRF backend via **REST API calls**.
- All API requests should use the base URL defined in the environment variable `VITE_API_URL=http://localhost:8000/api/`.
- **API logic should be centralized** in a `services/` or `api/` directory (e.g., `client/services/api.ts` or `client/api/`). Do **not** put API logic directly in components or contexts.
- Use `fetch` or `axios` for HTTP requests.
- All file/data actions (upload, delete, rename, etc.) should call the backend, not mutate local state directly.
- **Mock/demo data** (`client/data/mockData.ts`) is for development only and should be removed or isolated before production.
- **Demo server code** (`server/`) is for local development and should not be used in production.

---

## 4. 🔐 Authentication (Optional/Future)

- The frontend **may later be integrated with Keycloak or OIDC** for authentication and authorization.
- This is **not yet implemented**. Add a note or TODO in code where auth logic will be needed (e.g., login, token storage, protected routes).

---

## 5. ⚙️ Environment Configuration

The following environment variables are expected (in a `.env` file at the project root):

```
VITE_API_URL=http://localhost:8000/api/
```

Add more as needed for future features (e.g., auth endpoints, feature flags).

---

## 6. ✅ Development Workflow Rules for AI

- **Always keep code modular and reusable.**
- **Follow component-driven architecture.**
- **Use `services/` to define API functions, not inside components or contexts.**
- **Write clean, readable, minimal code**—avoid unnecessary abstraction unless justified.
- **If unsure, leave a comment and wait for user confirmation.**
- **Update this file as integration progresses.**
- This file is meant to be read by Cursor AI, ChatGPT, and future developers for context.

---

## 7. 🗂️ Detailed Directory Reference

- **client/components/dashboard/**: Dashboard widgets and analytics.
- **client/components/files/**: File management UI (grid, list, upload, actions).
- **client/components/layout/**: App layout, navigation, and structure.
- **client/components/ui/**: Atomic UI elements (buttons, dialogs, forms, etc.).
- **client/contexts/FileContext.tsx**: File state and actions (to be refactored to use backend).
- **client/pages/**: Main app views/routes.
- **client/hooks/**: Custom hooks for navigation, actions, and UI logic.
- **client/data/mockData.ts**: Mock data for development only.
- **client/lib/**: Utility functions.
- **client/types/**: TypeScript types for all app entities.
- **shared/api.ts**: Shared API types (for demo/dev).
- **server/**: Local dev server (not for production).
- **netlify/functions/**: Serverless functions for Netlify deployments.

---

**This file is a living document. Update it as the project evolves and as integration with the backend progresses.**

--- 