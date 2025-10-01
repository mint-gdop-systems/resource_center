export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string; // For backward compatibility
  avatar?: string;
  department?: string;
  role?: "admin" | "manager" | "employee";
}

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  extension?: string;
  category?: string;
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
  fileUrl?: string;
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

export interface FileVersionHistoryItem {
  id: number;
  version_number: number;
  file_name: string;
  uploaded_by_name: string;
  uploaded_at: string;
  change_note: string;
  uploaded_file_url: string;
  is_current: boolean;
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
  adminOnly?: boolean;
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

// --- Group Management Types ---
export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: User;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  member_count: number;
  admin_count: number;
  user_role?: 'system_admin' | 'group_admin' | 'group_member' | 'regular_user' | null;
  members?: GroupMembership[];
}

export interface GroupMembership {
  id: string;
  user: User;
  role: 'ADMIN' | 'MEMBER';
  role_display: string;
  added_by: User;
  added_at: string;
  is_active: boolean;
  can_manage_members: boolean;
}

export interface GroupSharing {
  id: string;
  file?: FileItem;
  folder?: FileItem;
  group: Group;
  shared_by: User;
  message?: string;
  shared_at: string;
  share_type: 'FILE' | 'FOLDER';
  share_type_display: string;
  can_download: boolean;
  can_reshare: boolean;
  item_name: string;
  item_type: string;
}

export interface UserGroupContext {
  user_context: {
    is_system_admin: boolean;
    total_groups: number;
    admin_of_count: number;
  };
  member_groups: Group[];
  admin_groups: Group[];
  manageable_groups: Group[];
  permissions: {
    can_create_groups: boolean;
    can_manage_any_group: boolean;
    managed_groups_count: number;
  };
}

// --- Modern Permission System Types ---
export interface UserRole {
  name: 'system_admin' | 'group_admin' | 'group_member' | 'regular_user';
  display_name: string;
  level: number;
  permissions: string[];
  restrictions: Record<string, any>;
}

export interface PermissionCheck {
  action: string;
  allowed: boolean;
  reason?: string;
  context?: Record<string, any>;
}

export interface UserPermissions {
  role: UserRole;
  group_permissions: Record<string, string[]>;
  can_perform: (action: string, context?: Record<string, any>) => boolean;
  get_role_in_group: (groupId: string) => string | null;
}

export interface PermissionContext {
  user_id?: string;
  group_id?: string;
  resource_id?: string;
  resource_type?: 'file' | 'folder' | 'group';
  target_user_id?: string;
}

export interface GroupShareRequest {
  file_ids?: string[];
  folder_ids?: string[];
  group_ids: string[];
  message?: string;
  can_download?: boolean;
  can_reshare?: boolean;
}

export interface EnhancedShareRequest {
  file_ids?: string[];
  folder_ids?: string[];
  user_emails?: string[];
  group_ids?: string[];
  message?: string;
}

export interface CombinedSharedData {
  individual_shares: {
    all: any[];
    files: any[];
    folders: any[];
    count: number;
  };
  group_shares: {
    all: GroupSharing[];
    files: GroupSharing[];
    folders: GroupSharing[];
    count: number;
  };
  combined: {
    total_files: number;
    total_folders: number;
    total_all: number;
  };
}

// --- Storage Quota Types ---
export interface StorageQuota {
  storage_quota: number;
  storage_used: number;
  storage_usage_percentage: number;
  remaining_storage: number;
  storage_quota_mb: number;
  storage_used_mb: number;
  remaining_storage_mb: number;
  is_near_limit: boolean;
  is_over_limit: boolean;
}

export interface UploadCapacityCheck {
  can_upload: boolean;
  total_file_size: number;
  total_file_size_mb: number;
  remaining_storage: number;
  remaining_storage_mb: number;
  storage_quota: number;
  storage_used: number;
  usage_percentage: number;
}

export interface StorageStatistics {
  total_users: number;
  total_quota: number;
  total_quota_gb: number;
  total_used: number;
  total_used_gb: number;
  total_usage_percentage: number;
  users_near_limit: number;
  users_over_limit: number;
  users_normal: number;
}
