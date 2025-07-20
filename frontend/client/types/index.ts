export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department: string;
  role: "admin" | "manager" | "employee";
}

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  extension?: string;
  createdAt: Date;
  updatedAt: Date;
  owner: User;
  parentId?: string;
  starred: boolean;
  archived: boolean;
  shared: boolean;
  permissions: FilePermission[];
  versions?: FileVersion[];
  reminders?: FileReminder[];
  thumbnail?: string;
  path: string[];
}

export interface FilePermission {
  id: string;
  fileId: string;
  userId: string;
  user: User;
  level: "view" | "edit" | "admin";
  createdAt: Date;
  createdBy: User;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  createdAt: Date;
  createdBy: User;
  changeNote?: string;
  downloadUrl: string;
}

export interface FileReminder {
  id: string;
  fileId: string;
  userId: string;
  title: string;
  description?: string;
  reminderDate: Date;
  completed: boolean;
  createdAt: Date;
}

export interface Breadcrumb {
  id: string;
  name: string;
  path: string;
}

export interface NavigationItem {
  id: string;
  name: string;
  icon: string;
  path: string;
  count?: number;
  badge?: "new" | "urgent";
}

export interface ViewMode {
  type: "grid" | "list";
  sortBy: "name" | "date" | "size" | "type";
  sortOrder: "asc" | "desc";
  filterBy?: string;
}

export interface ShareSettings {
  fileId: string;
  users: string[];
  permissions: "view" | "edit" | "admin";
  message?: string;
  expiresAt?: Date;
  requireSignIn: boolean;
  allowDownload: boolean;
}

export interface SearchFilters {
  type?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  owner?: string[];
  starred?: boolean;
  shared?: boolean;
  archived?: boolean;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

// --- Auth Types ---
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  roles?: string[];
}

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  user: AuthUser;
}
