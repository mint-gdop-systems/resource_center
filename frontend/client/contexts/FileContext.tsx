import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { FileItem } from "../types";
import toast from "react-hot-toast";
import { uploadFileApi, getFiles, createFolder as createFolderApi, bulkDeleteApi, toggleFileStar, toggleFolderStar, toggleFileArchive, toggleFolderArchive, getRecentFiles } from "../services/api";
import { useAuth } from "../services/auth";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { useNotifications } from "./NotificationContext";

interface FileContextType {
  files: FileItem[];
  fetchFiles: (folderId?: string) => Promise<void>;
  uploadFile: (file: File, path: string[], categoryId?: number) => Promise<void>;
  deleteFiles: (fileIds: string[]) => void;
  renameFile: (fileId: string, newName: string) => void;
  moveFiles: (fileIds: string[], targetPath: string) => void;
  toggleStar: (fileId: string) => void;
  starFiles: (fileIds: string[], starred: boolean) => void;
  toggleArchive: (fileId: string) => void;
  toggleFolderArchive?: (folderId: string) => void;
  archiveFiles?: (fileIds: string[], archived: boolean) => void;
  createFolder: (name: string, path: string[]) => void;
  archiveCount: number;
  refreshArchiveCount: () => Promise<void>;
  starredCount: number;
  refreshStarredCount: () => Promise<void>;
  recentCount: number;
  refreshRecentCount: () => Promise<void>;
  filesCount: number;
  refreshFilesCount: () => Promise<void>;
  sharedCount: number;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  // Remove currentFolderId state - let the navigation hook manage this
  const { initialized, authenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
  const [archiveCount, setArchiveCount] = useState(0);
  const [starredCount, setStarredCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);
  const [filesCount, setFilesCount] = useState(0);
  const { totalSharedCount } = useNotifications();
  const refreshStarredCount = useCallback(async () => {
    try {
      const data = await getFiles(undefined, { starred: true });
      const files = data.files || [];
      const folders = data.folders || [];
      setStarredCount(files.length + folders.length);
    } catch (error) {
      setStarredCount(0);
    }
  }, []);

  const refreshArchiveCount = useCallback(async () => {
    try {
      const data = await getFiles(undefined, { archived: true });
      const files = data.files || [];
      setArchiveCount(files.length);
    } catch (error) {
      console.error('Failed to fetch archive count:', error);
      setArchiveCount(0);
    }
  }, []);

  const refreshRecentCount = useCallback(async () => {
    try {
      const data = await getRecentFiles({ limit: 100, includeArchived: false });
      const files = data.files || [];
      setRecentCount(files.length);
    } catch (error) {
      console.error('Failed to fetch recent count:', error);
      setRecentCount(0);
    }
  }, []);

  const refreshFilesCount = useCallback(async () => {
    try {
      const data = await getFiles();
      const files = data.files || [];
      const folders = data.folders || [];
      setFilesCount(files.length + folders.length);
    } catch (error) {
      console.error('Failed to fetch files count:', error);
      setFilesCount(0);
    }
  }, []);



  useEffect(() => {
    if (initialized && authenticated) {
      refreshArchiveCount();
      refreshStarredCount();
      refreshRecentCount();
      refreshFilesCount();
    }
  }, [initialized, authenticated, refreshArchiveCount, refreshStarredCount, refreshRecentCount, refreshFilesCount]);

  const fetchFiles = useCallback(async (folderId?: string) => {
    try {
      const data = await getFiles(folderId);
      const fetchedFiles = [...data.files, ...data.folders].map((item) => {
        const isFile = !!item.file_type;
        return {
          ...item,
          id: item.id.toString(),
          name: item.name,
          parentId: isFile ? (item.folder ? item.folder.toString() : undefined) : (item.parent ? item.parent.toString() : undefined),
          type: isFile ? 'file' : 'folder',
          createdAt: new Date(item.uploaded_at || item.created_at),
          updatedAt: new Date(item.updated_at || item.created_at),
          owner: {
            id: item.owner_email,
            name: item.owner_first_name || 'Unknown User',
            email: item.owner_email,
            department: 'General',
            role: 'employee',
          },
          size: isFile ? item.file_size : undefined,
          extension: isFile ? item.file_type : undefined,
          starred: Boolean((item as any).is_starred),
          archived: Boolean((item as any).is_archived),
          shared: Boolean((item as any).is_shared),
        } as unknown as FileItem;
      });
      setFiles(fetchedFiles);
      // Don't set currentFolderId - let the navigation hook manage folder state
  // Do not call refreshStarredCount inside fetchFiles, only in useEffect and after starFiles
    } catch (error: any) {
      toast.error(`Failed to fetch files: ${error?.message || 'Unknown error'}`);
    }
  }, []);

  // Removed refresh event handling - let useFileNavigation hook handle this

  const uploadFile = async (file: File, path: string[], categoryId?: number): Promise<void> => {
    try {
      let folderId: string | undefined = undefined;
      if (path.length > 0) {
        const last = path[path.length - 1];
        folderId = last !== "/" ? last : undefined;
      }
      await uploadFileApi({ file, folderId, categoryId });
      toast.success(`${file.name} uploaded successfully!`);
      await fetchFiles(folderId);
      await refreshFilesCount();
      await refreshRecentCount();
    } catch (error: any) {
      // Check if this is a duplicate file error that should be handled by the upload component
      if (error?.response?.status === 409 && error?.response?.data?.error === "duplicate_files_found") {
        // Let duplicate errors bubble up to be handled by FileUpload component
        throw error;
      }
      
      let message = "Failed to upload file.";
      if (error?.response) {
        // Backend returned a response
        const backendError = error.response.data?.error || error.response.data?.detail || '';
        if (
          error.response.status === 409 ||
          backendError.toLowerCase().includes('already exists') ||
          backendError.toLowerCase().includes('file') && backendError.toLowerCase().includes('exists')
        ) {
          message = `A file named "${file.name}" already exists in this folder.`;
        } else if (error.response.status === 413) {
          message = `The file "${file.name}" is too large to upload.`;
        } else if (error.response.status === 400 && (error.response.data?.detail || error.response.data?.error)) {
          message = error.response.data.detail || error.response.data.error;
        } else if (error.response.status === 403) {
          message = "You do not have permission to upload files here.";
        } else if (error.response.status === 404) {
          message = "Upload location not found. Please refresh and try again.";
        } else if (typeof error.response.data === 'string') {
          message = error.response.data;
        } else if (error.response.data?.detail || error.response.data?.error) {
          message = error.response.data.detail || error.response.data.error;
        }
      } else if (error?.message) {
        message = error.message;
      }
      toast.error(message);
      throw new Error(message);
    }
  };

  const deleteFiles = (fileIds: string[]) => {
  setFilesToDelete(fileIds);
  setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const fileIdsToDelete = files.filter(f => f.type === 'file' && filesToDelete.includes(f.id)).map(f => f.id);
      const folderIdsToDelete = files.filter(f => f.type === 'folder' && filesToDelete.includes(f.id)).map(f => f.id);

      await bulkDeleteApi(fileIdsToDelete, folderIdsToDelete);
      
      toast.success(`${fileIdsToDelete.length + folderIdsToDelete.length} item(s) deleted successfully!`);
      // Dispatch refresh event instead of direct fetchFiles call
      window.dispatchEvent(new CustomEvent('files:refresh'));
      window.dispatchEvent(new CustomEvent('files:deleted'));
      await refreshFilesCount();
      await refreshRecentCount();
      await refreshArchiveCount();
      await refreshStarredCount();
    } catch (error: any) {
      toast.error(`Failed to delete item(s): ${error?.message || 'Unknown error'}`);
    } finally {
      setIsModalOpen(false);
      setFilesToDelete([]);
    }
  };

  const renameFile = (fileId: string, newName: string) => {
  // TODO: Implement real rename logic using API
  toast.success(`Renamed to "${newName}" (mock)`);
  };

  const moveFiles = (fileIds: string[], targetPath: string) => {
    // TODO: Implement real move logic using API
    toast.success(`${fileIds.length} file(s) moved to ${targetPath} (mock)`);
  };

  const toggleStar = async (itemId: string) => {
    try {
      const item = files.find(f => f.id === itemId);
      if (!item) return;

      if (item.type === 'file') {
        const res = await toggleFileStar(itemId);
        toast.success(res.message);
      } else {
        const res = await toggleFolderStar(itemId);
        toast.success(res.message);
      }
      // Dispatch refresh event instead of direct fetchFiles call
      window.dispatchEvent(new CustomEvent('files:refresh'));
      await refreshStarredCount();
      await refreshRecentCount();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to toggle star';
      toast.error(msg);
    }
  };

  const starFiles = async (itemIds: string[], starred: boolean) => {
    // Backend provides toggle endpoints, so we call per-item toggles to reach desired state
    try {
      const targetItems = files.filter(f => itemIds.includes(f.id));
      let toggled = 0;
      for (const item of targetItems) {
        // We only toggle if current state differs from desired state
        if ((item as any).is_starred !== undefined) {
          const shouldToggle = (item as any).is_starred !== starred;
          if (!shouldToggle) continue;
        }
        if (item.type === 'file') {
          await toggleFileStar(item.id);
        } else {
          await toggleFolderStar(item.id);
        }
        toggled++;
      }
      toast.success(`${toggled} item(s) ${starred ? 'starred' : 'unstarred'}`);
      // Dispatch refresh event instead of direct fetchFiles call
      window.dispatchEvent(new CustomEvent('files:refresh'));
      await refreshStarredCount();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to update starred state';
      toast.error(msg);
    }
  };

  const toggleArchive = async (fileId: string) => {
    try {
      const res = await toggleFileArchive(fileId);
      toast.success(res.is_archived ? 'Archived' : 'Restored');
      // Dispatch refresh event instead of direct fetchFiles call
      window.dispatchEvent(new CustomEvent('files:refresh'));
      window.dispatchEvent(new CustomEvent('files:modified'));
      await refreshArchiveCount();
      await refreshRecentCount();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to toggle archive';
      toast.error(msg);
    }
  };

  const toggleFolderArchiveAction = async (folderId: string) => {
    try {
      const res = await toggleFolderArchive(folderId);
      toast.success(res.is_archived ? 'Folder archived' : 'Folder restored');
      window.dispatchEvent(new CustomEvent('files:refresh'));
      window.dispatchEvent(new CustomEvent('files:modified'));
      await refreshArchiveCount();
      await refreshRecentCount();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to toggle folder archive';
      toast.error(msg);
    }
  };

  const archiveFiles = async (itemIds: string[], archived: boolean) => {
    try {
      const targetFiles = files.filter(f => f.type === 'file' && itemIds.includes(f.id));
      let toggled = 0;
      for (const item of targetFiles) {
        if ((item.archived ?? false) !== archived) {
          await toggleFileArchive(item.id);
          toggled++;
        }
      }
      toast.success(`${toggled} item(s) ${archived ? 'archived' : 'restored'}`);
      // Dispatch refresh event instead of direct fetchFiles call
      window.dispatchEvent(new CustomEvent('files:refresh'));
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to update archive state';
      toast.error(msg);
    }
  };

  const createFolder = async (name: string, path: string[]) => {
    try {
      // If path is ["/", "parentId"] or ["parentId"], get the last non-root element as parentId
      let parentId: string | undefined = undefined;
      if (path.length > 0) {
        const last = path[path.length - 1];
        parentId = last !== "/" ? last : undefined;
      }
      await createFolderApi(name, parentId);
      toast.success(`Folder "${name}" created successfully!`);
      // Refresh files for the current folder
      await fetchFiles(parentId);
      await refreshFilesCount();
    } catch (error: any) {
      toast.error(`Failed to create folder: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  };

  return (
    <FileContext.Provider
      value={{
        files,
        fetchFiles,
        uploadFile,
        deleteFiles,
        renameFile,
        moveFiles,
        toggleStar,
        starFiles,
        toggleArchive,
        toggleFolderArchive: toggleFolderArchiveAction,
        archiveFiles,
        createFolder,
        archiveCount,
        refreshArchiveCount,
        starredCount,
        refreshStarredCount,
        recentCount,
        refreshRecentCount,
        filesCount,
        refreshFilesCount,
        sharedCount: totalSharedCount
      }}
    >
      {children}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete File(s)"
        message={`Are you sure you want to delete ${filesToDelete.length} file(s)? This action cannot be undone.`}
      />
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error("useFiles must be used within a FileProvider");
  }
  return context;
}

