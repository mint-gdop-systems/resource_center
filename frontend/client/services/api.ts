
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
  const response = await api.patch(`/files/${fileId}/toggle-star/`);
  return response.data;
};

/**
 * Toggle star status of a folder
 * @param folderId The ID of the folder to toggle star
 */
export const toggleFolderStar = async (folderId: string) => {
  const response = await api.patch(`/folders/${folderId}/toggle-star/`);
  return response.data;
};

/**
 * Toggle archive status of a file
 * @param fileId The ID of the file to toggle archive
 */
export const toggleFileArchive = async (fileId: string) => {
  const response = await api.patch(`/files/${fileId}/toggle-archive/`);
  return response.data;
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
 * Update file details
 * @param fileId The ID of the file to update
 * @param data The data to update
 */
export const updateFile = async (fileId: string, data: { name?: string; category?: string; tags?: string[] }) => {
  const response = await api.patch(`/files-update/${fileId}/`, data);
  return response.data;
};

/**
 * Get all root-level folders
 */
export const getFolders = async () => {
  const response = await api.get('/folders/');
  return response.data;
};

