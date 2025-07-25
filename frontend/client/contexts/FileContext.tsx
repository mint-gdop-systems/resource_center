import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { FileItem } from "../types";
import toast from "react-hot-toast";
import { uploadFileApi, getFiles, createFolder as createFolderApi } from "../services/api";
import { useAuth } from "../services/auth";

interface FileContextType {
  files: FileItem[];
  fetchFiles: (folderId?: string) => Promise<void>;
  uploadFile: (file: File, path: string[], categoryId?: number) => Promise<void>;
  deleteFiles: (fileIds: string[]) => void;
  renameFile: (fileId: string, newName: string) => void;
  moveFiles: (fileIds: string[], targetPath: string) => void;
  toggleStar: (fileId: string) => void;
  starFiles: (fileIds: string[], starred: boolean) => void;
  createFolder: (name: string, path: string[]) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const { initialized, authenticated } = useAuth();

  const fetchFiles = useCallback(async (folderId?: string) => {
    try {
      const data = await getFiles(folderId);
      const fetchedFiles = [...data.files, ...data.folders].map((item) => {
        const isFile = !!item.file_type;
        return {
          ...item,
          id: item.id.toString(),
          name: item.name, // Ensure name is always set
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
        };
      });
      setFiles(fetchedFiles);
      setCurrentFolderId(folderId);
    } catch (error: any) {
      toast.error(`Failed to fetch files: ${error?.message || 'Unknown error'}`);
    }
  }, []);

  useEffect(() => {
    if (initialized && authenticated) {
      fetchFiles();
    }
  }, [initialized, authenticated, fetchFiles]);

  const uploadFile = async (file: File, path: string[], categoryId?: number): Promise<void> => {
    try {
      // If path is ["/", "parentId"] or ["parentId"], get the last non-root element as folderId
      let folderId: string | undefined = undefined;
      if (path.length > 0) {
        const last = path[path.length - 1];
        folderId = last !== "/" ? last : undefined;
      }
      await uploadFileApi({ file, folderId, categoryId });
      toast.success(`${file.name} uploaded successfully!`);
      // Refresh files for the current folder
      await fetchFiles(folderId);
    } catch (error: any) {
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
    // TODO: Implement real delete logic using API
    toast.success(`${fileIds.length} file(s) deleted (mock)`);
  };

  const renameFile = (fileId: string, newName: string) => {
    // TODO: Implement real rename logic using API
    toast.success(`Renamed to "${newName}" (mock)`);
  };

  const moveFiles = (fileIds: string[], targetPath: string) => {
    // TODO: Implement real move logic using API
    toast.success(`${fileIds.length} file(s) moved to ${targetPath} (mock)`);
  };

  const toggleStar = (fileId: string) => {
    // TODO: Implement real star toggle logic using API
    toast.success(`Toggled star (mock)`);
  };

  const starFiles = (fileIds: string[], starred: boolean) => {
    // TODO: Implement real star/unstar logic using API
    toast.success(`${fileIds.length} file(s) ${starred ? "added to" : "removed from"} starred (mock)`);
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
        createFolder,
      }}
    >
      {children}
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
