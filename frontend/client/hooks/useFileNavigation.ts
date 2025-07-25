import { useState, useMemo, useEffect } from "react";
import { FileItem } from "../types";
import { useFiles } from "../contexts/FileContext";

export function useFileNavigation(allFiles: FileItem[]) {
  // currentPath is an array of folder IDs (as strings)
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const { fetchFiles } = useFiles();

  // Fetch files/folders for the current directory whenever currentPath changes
  useEffect(() => {
    const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
    fetchFiles(folderId);
  }, [currentPath, fetchFiles]);

  // The context now always provides the current folder's files/folders
  const currentFiles = allFiles;

  // Navigate into a folder by ID
  const navigateToFolder = (folderId: string) => {
    setCurrentPath((prev) => [...prev, folderId]);
  };

  // Navigate to a specific path (array of IDs)
  const navigateToPath = (path: string[]) => {
    setCurrentPath(path);
  };

  // Go back to parent directory
  const navigateUp = () => {
    setCurrentPath((prev) => prev.slice(0, -1));
  };

  // Go to root
  const navigateToRoot = () => {
    setCurrentPath([]);
  };

  return {
    currentPath,
    currentFiles,
    navigateToFolder,
    navigateToPath,
    navigateUp,
    navigateToRoot,
  };
}
