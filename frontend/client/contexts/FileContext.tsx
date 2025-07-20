import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { FileItem } from "../types";
import toast from "react-hot-toast";
import { uploadFileApi, getFiles } from "../services/api";
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
  const { initialized, authenticated } = useAuth();

  const fetchFiles = async (folderId?: string) => {
    try {
      const data = await getFiles(folderId);
      const fetchedFiles = [...data.files, ...data.folders].map((file) => ({ ...file, id: file.id.toString() }));
      setFiles(fetchedFiles);
    } catch (error: any) {
      toast.error(`Failed to fetch files: ${error?.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (initialized && authenticated) {
      fetchFiles();
    }
  }, [initialized, authenticated]);

  const uploadFile = async (file: File, path: string[], categoryId?: number): Promise<void> => {
    try {
      const folderId = path.length > 0 ? path[path.length - 1] : undefined;
      await uploadFileApi({ file, folderId, categoryId });
      toast.success(`${file.name} uploaded successfully!`);
      fetchFiles(folderId);
    } catch (error: any) {
      toast.error(`Failed to upload ${file.name}: ${error?.message || 'Unknown error'}`);
      throw error;
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

  const createFolder = (name: string, path: string[]) => {
    // TODO: Implement real create folder logic using API
    toast.success(`Folder "${name}" created (mock)`);
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
