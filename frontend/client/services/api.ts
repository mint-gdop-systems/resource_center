
import axios from 'axios';
import keycloak from './keycloak';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use(
  (config) => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      keycloak.login();
    }
    return Promise.reject(error);
  }
);

/**
 * Get categories from the backend
 */
export const getCategories = async () => {
  try {
    const response = await api.get('/get-categories/');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Upload a file to the backend (to /file-upload/ or /file-upload/<folder_id>/)
 * @param file The file to upload
 * @param folderId Optional folder ID to upload into
 * @param categoryId Optional category ID for the file
 * @param extraData Optional extra metadata (tags, etc)
 */
export async function uploadFileApi({
  file,
  folderId,
  categoryId,
  extraData,
}: {
  file: File;
  folderId?: string;
  categoryId?: number;
  extraData?: Record<string, any>;
}) {
  const formData = new FormData();
  formData.append('files', file); // Changed from 'file' to 'files' to match backend
  
  // Add category_id if provided
  if (categoryId) {
    formData.append('category_id', categoryId.toString());
  }
  
  if (extraData) {
    Object.entries(extraData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  const url = folderId
    ? `/file-upload/${folderId}/`
    : '/file-upload/';
  const response = await api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Get files and folders from the backend
 * @param folderId Optional folder ID to get contents of specific folder
 * @param filters Optional filters (starred, archived)
 */
export const getFiles = async (folderId?: string, filters?: { starred?: boolean; archived?: boolean }) => {
  try {
    let url = folderId ? `/folder-contents/${folderId}/` : '/folder-contents/';
    
    // Add query parameters for filters
    const params = new URLSearchParams();
    if (filters?.starred) params.append('starred', 'true');
    if (filters?.archived !== undefined) params.append('archived', filters.archived.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
};

/**
 * Delete a file
 * @param fileId The ID of the file to delete
 */
export const deleteFile = async (fileId: string) => {
  const response = await api.delete(`/files/${fileId}/delete/`);
  return response.data;
};

/**
 * Toggle star status of a file
 * @param fileId The ID of the file to toggle star
 */
export const toggleFileStar = async (fileId: string) => {
  const response = await api.post(`/files/${fileId}/toggle-star/`);
  return response.data as { message: string; is_starred: boolean };
};

/**
 * Toggle star status of a folder
 * @param folderId The ID of the folder to toggle star
 */
export const toggleFolderStar = async (folderId: string) => {
  const response = await api.post(`/folders/${folderId}/toggle-star/`);
  return response.data as { message: string; is_starred: boolean };
};

/**
 * Toggle archive status of a file
 * @param fileId The ID of the file to toggle archive
 */
export const toggleFileArchive = async (fileId: string) => {
  const response = await api.post(`/files/${fileId}/toggle-archive/`);
  return response.data as { message: string; is_archived: boolean };
};

/**
 * Create a new folder
 * @param name The name of the folder
 * @param parentId Optional parent folder ID
 */
export const createFolder = async (name: string, parentId?: string) => {
  // Always POST to /folders/ with { name, parent } in the body
  const data: any = { name };
  if (parentId) data.parent = parentId;
  const response = await api.post('/folders/', data);
  return response.data;
};



/**
 * Get all root-level folders
 */
export const getFolders = async () => {
  const response = await api.get('/folders/');
  return response.data;
};

export async function deleteFileApi(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}/delete/`);
}

export async function bulkDeleteApi(fileIds: string[], folderIds: string[]): Promise<void> {
  await api.delete('/bulk-delete/', {
    data: { file_ids: fileIds, folder_ids: folderIds },
  });
}

export const getRecentFiles = async (options?: { limit?: number; includeArchived?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.includeArchived !== undefined) params.set('include_archived', String(options.includeArchived));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/recent-files/${query}`);
  return response.data as { files: any[] };
};

/**
 * View/download a file by ID
 * @param fileId The ID of the file to view
 * @returns Promise that resolves to a blob URL for viewing the file
 */
export const viewFile = async (fileId: string): Promise<string> => {
  try {
    const response = await api.get(`/view-file/${fileId}/`, {
      responseType: 'blob',
    });
    
    // Create a blob URL for the file
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'application/octet-stream' 
    });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error) {
    console.error('Error viewing file:', error);
    throw error;
  }
};

/**
 * Download a single file by ID
 * @param fileId The ID of the file to download
 * @param fileName Optional custom filename for the download
 */
export const downloadFile = async (fileId: string, fileName?: string): Promise<void> => {
  try {
    const response = await api.get(`/download-file/${fileId}/`, {
      responseType: 'blob',
    });
    
    // Get filename from response headers or use provided name
    const contentDisposition = response.headers['content-disposition'];
    let downloadFileName = fileName;
    
    if (!downloadFileName && contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        downloadFileName = filenameMatch[1];
      }
    }
    
    if (!downloadFileName) {
      downloadFileName = `file_${fileId}`;
    }
    
    // Create blob and download
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'application/octet-stream' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Download multiple files as a ZIP archive
 * @param fileIds Array of file IDs to download
 * @param zipFileName Optional custom filename for the ZIP file
 */
export const downloadMultipleFiles = async (fileIds: string[], zipFileName?: string): Promise<void> => {
  try {
    const response = await api.post('/bulk-download/', {
      file_ids: fileIds,
    }, {
      responseType: 'blob',
    });
    
    // Get filename from response headers or use provided name
    const contentDisposition = response.headers['content-disposition'];
    let downloadFileName = zipFileName;
    
    if (!downloadFileName && contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        downloadFileName = filenameMatch[1];
      }
    }
    
    if (!downloadFileName) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      downloadFileName = `files_${timestamp}.zip`;
    }
    
    // Create blob and download
    const blob = new Blob([response.data], { 
      type: 'application/zip'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
  } catch (error) {
    console.error('Error downloading files:', error);
    throw error;
  }
};

/**
 * Copy a single file to a destination folder
 * @param fileId The ID of the file to copy
 * @param destinationFolderId Optional destination folder ID (null for root)
 */
export const copyFile = async (fileId: string, destinationFolderId?: string): Promise<any> => {
  try {
    const data: any = {};
    if (destinationFolderId) {
      data.destination_folder_id = destinationFolderId;
    }
    
    const response = await api.post(`/copy-file/${fileId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error copying file:', error);
    throw error;
  }
};

/**
 * Copy multiple files and folders to a destination folder
 * @param fileIds Array of file IDs to copy
 * @param folderIds Array of folder IDs to copy
 * @param destinationFolderId Optional destination folder ID (null for root)
 */
export const copyMultipleItems = async (
  fileIds: string[], 
  folderIds: string[], 
  destinationFolderId?: string
): Promise<any> => {
  try {
    const data: any = {
      file_ids: fileIds,
      folder_ids: folderIds,
    };
    
    if (destinationFolderId) {
      data.destination_folder_id = destinationFolderId;
    }
    
    const response = await api.post('/bulk-copy/', data);
    return response.data;
  } catch (error) {
    console.error('Error copying items:', error);
    throw error;
  }
};

/**
 * Move a single file to a destination folder
 * @param fileId The ID of the file to move
 * @param destinationFolderId Optional destination folder ID (null for root)
 */
export const moveFile = async (fileId: string, destinationFolderId?: string): Promise<any> => {
  try {
    const data: any = {};
    if (destinationFolderId) {
      data.destination_folder_id = destinationFolderId;
    }
    
    const response = await api.post(`/move-file/${fileId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
};

/**
 * Move a single folder to a destination folder
 * @param folderId The ID of the folder to move
 * @param destinationFolderId Optional destination folder ID (null for root)
 */
export const moveFolder = async (folderId: string, destinationFolderId?: string): Promise<any> => {
  try {
    const data: any = {};
    if (destinationFolderId) {
      data.destination_folder_id = destinationFolderId;
    }
    
    const response = await api.post(`/move-folder/${folderId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error moving folder:', error);
    throw error;
  }
};

/**
 * Move multiple files and folders to a destination folder
 * @param fileIds Array of file IDs to move
 * @param folderIds Array of folder IDs to move
 * @param destinationFolderId Optional destination folder ID (null for root)
 */
export const moveMultipleItems = async (
  fileIds: string[], 
  folderIds: string[], 
  destinationFolderId?: string
): Promise<any> => {
  try {
    const data: any = {
      file_ids: fileIds,
      folder_ids: folderIds,
    };
    
    if (destinationFolderId) {
      data.destination_folder_id = destinationFolderId;
    }
    
    const response = await api.post('/bulk-move/', data);
    return response.data;
  } catch (error) {
    console.error('Error moving items:', error);
    throw error;
  }
};

/**
 * Get file details for editing
 * @param fileId The ID of the file to get details for
 */
export const getFileDetails = async (fileId: string): Promise<any> => {
  try {
    const response = await api.get(`/edit-file/${fileId}/`);
    return response.data;
  } catch (error) {
    console.error('Error getting file details:', error);
    throw error;
  }
};

/**
 * Update file properties
 * @param fileId The ID of the file to update
 * @param data The data to update
 */
export const updateFile = async (fileId: string, data: {
  name?: string;
  category_id?: number;
  meta_tag_names?: string[];
  is_public?: boolean;
}): Promise<any> => {
  try {
    const response = await api.patch(`/edit-file/${fileId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
};

/**
 * Get folder details for editing
 * @param folderId The ID of the folder to get details for
 */
export const getFolderDetails = async (folderId: string): Promise<any> => {
  try {
    const response = await api.get(`/edit-folder/${folderId}/`);
    return response.data;
  } catch (error) {
    console.error('Error getting folder details:', error);
    throw error;
  }
};

/**
 * Update folder properties
 * @param folderId The ID of the folder to update
 * @param data The data to update
 */
export const updateFolder = async (folderId: string, data: {
  name?: string;
  is_public?: boolean;
}): Promise<any> => {
  try {
    const response = await api.patch(`/edit-folder/${folderId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
};

/**
 * Download folder as ZIP file
 * Simple direct download approach
 */
export const downloadFolder = async (folderId: string, folderName: string): Promise<void> => {
  try {
    const response = await api.post('/bulk-download/', {
      folder_ids: [folderId]
    }, {
      responseType: 'blob',
    });

    // Create blob and download link
    const blob = new Blob([response.data], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading folder:', error);
    throw error;
  }
};

// ============ PUBLIC SHARE LINKS ============

/**
 * Create public share links for files/folders
 */
export const createShareLinks = async (data: {
  file_ids?: string[];
  folder_ids?: string[];
  expires_in_days?: number;
}): Promise<any> => {
  try {
    const response = await api.post('/create-share-links/', data);
    return response.data;
  } catch (error) {
    console.error('Error creating share links:', error);
    throw error;
  }
};

// ============ SHARING API FUNCTIONS ============

/**
 * Share files and/or folders with multiple users
 */
export const shareItems = async (data: {
  file_ids?: string[];
  folder_ids?: string[];
  emails: string[];
  message?: string;
}): Promise<any> => {
  try {
    const response = await api.post('/share/', data);
    return response.data;
  } catch (error) {
    console.error('Error sharing items:', error);
    throw error;
  }
};

/**
 * Get all shares created by the current user
 */
export const getMyShares = async (): Promise<any> => {
  try {
    const response = await api.get('/share/');
    return response.data;
  } catch (error) {
    console.error('Error getting my shares:', error);
    throw error;
  }
};

/**
 * Get items shared with the current user
 */
export const getSharedWithMe = async (): Promise<any> => {
  try {
    const response = await api.get('/shared-with-me/');
    return response.data;
  } catch (error) {
    console.error('Error getting shared items:', error);
    throw error;
  }
};

/**
 * Get count of unseen shared items
 */
export const getUnseenSharesCount = async (): Promise<{ count: number }> => {
  try {
    const response = await api.get('/shared-with-me/unseen-count/');
    return response.data;
  } catch (error) {
    console.error('Error getting unseen shares count:', error);
    throw error;
  }
};

// Note: markSharesAsSeen no longer needed with timestamp-based approach
// The SharedWithMe API automatically updates last_shared_visit when visited

/**
 * Delete shared items (remove sharing relationship)
 */
export const deleteSharedItems = async (shareIds: string[]): Promise<any> => {
  try {
    const response = await api.delete('/shared-with-me/', {
      data: { share_ids: shareIds }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting shared items:', error);
    throw error;
  }
};

/**
 * Send files via email
 */
export const sendFilesEmail = async (data: {
  file_ids: string[];
  recipients: string[];
  message?: string;
}): Promise<any> => {
  try {
    // Email sending can take time, so increase timeout to 60 seconds
    const response = await api.post('/send-email/', data, {
      timeout: 60000, // 60 seconds timeout for email operations
    });
    return response.data;
  } catch (error) {
    console.error('Error sending files via email:', error);
    throw error;
  }
};

// ============ DASHBOARD ANALYTICS ============

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (): Promise<{
  total_files: { value: number; change: number };
  total_folders: { value: number; change: number };
  starred_files: { value: number; change: number };
  storage_used: { value: number; formatted: string; change_bytes: number; change_formatted: string };
  files_this_month: { value: number; change: number };
}> => {
  try {
    const response = await api.get('/dashboard/stats/');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

/**
 * Get recent activity for dashboard
 */
export const getDashboardActivity = async (limit: number = 10): Promise<{
  activities: Array<{
    id: string;
    type: 'upload' | 'share' | 'edit' | 'download';
    user: { name: string };
    file: { name: string; id: number };
    timestamp: string;
    description: string;
  }>;
}> => {
  try {
    const response = await api.get(`/dashboard/activity/?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    throw error;
  }
};

// ============ FILE VERSION MANAGEMENT ============

/**
 * Upload a new version of an existing file
 * @param fileId The ID of the file to upload a new version for
 * @param newVersionFile The new file version to upload
 * @param changeNote Optional note describing the changes
 */
export const uploadNewVersion = async (
  fileId: string, 
  newVersionFile: File, 
  changeNote?: string
): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('new_version', newVersionFile);
    if (changeNote) {
      formData.append('change_note', changeNote);
    }
    
    const response = await api.post(`/files/${fileId}/upload-new-version/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading new version:', error);
    throw error;
  }
};

/**
 * Get version history for a file
 * @param fileId The ID of the file to get version history for
 */
export const getFileVersionHistory = async (fileId: string): Promise<{
  is_owner: boolean;
  versions: Array<{
    id: number;
    version_number: number;
    file_name: string;
    uploaded_by_name: string;
    uploaded_at: string;
    change_note: string;
    uploaded_file_url: string;
    is_current: boolean;
  }>;
}> => {
  try {
    const response = await api.get(`/files/${fileId}/version-history/`);
    return response.data;
  } catch (error) {
    console.error('Error getting version history:', error);
    throw error;
  }
};

/**
 * Revert a file to a specific version
 * @param fileId The ID of the file to revert
 * @param versionId The ID of the version to revert to
 */
export const revertFileVersion = async (fileId: string, versionId: string): Promise<any> => {
  try {
    const response = await api.post(`/files/${fileId}/revert-version/${versionId}/`);
    return response.data;
  } catch (error) {
    console.error('Error reverting file version:', error);
    throw error;
  }
};

// ============ SEARCH FUNCTIONALITY ============

/**
 * Search files and folders based on query and scope
 * @param query The search query string
 * @param scope The search scope (all, files, starred, shared, archived, recent)
 * @param filters Optional additional filters
 */
export const searchFiles = async (
  query: string, 
  scope: string = 'all',
  filters?: {
    fileType?: string;
    dateRange?: { from: string; to: string };
    owner?: string;
  }
): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('scope', scope);
    
    if (filters?.fileType) {
      params.append('file_type', filters.fileType);
    }
    if (filters?.dateRange) {
      params.append('date_from', filters.dateRange.from);
      params.append('date_to', filters.dateRange.to);
    }
    if (filters?.owner) {
      params.append('owner', filters.owner);
    }
    
    const response = await api.get(`/search/?${params.toString()}`);
    // Return the combined results array for the search dropdown
    return response.data.results || [];
  } catch (error) {
    console.error('Error searching files:', error);
    return [];
  }
};

