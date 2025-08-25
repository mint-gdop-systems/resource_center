import { useState, useMemo, useEffect, useCallback } from "react";
import { FileItem } from "../types";
import { useFiles } from "../contexts/FileContext";

export function useFileNavigation(allFiles: FileItem[]) {
  // currentPath is an array of folder IDs (as strings)
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const { fetchFiles } = useFiles();
  const [folderNameById, setFolderNameById] = useState<Record<string, string>>({});

  // Helper to record known folder names from the current listing
  const indexCurrentFolderNames = useCallback(() => {
    const mapUpdate: Record<string, string> = {};
    for (const item of allFiles) {
      if (item.type === 'folder' && item.id && item.name) {
        mapUpdate[item.id] = item.name;
      }
    }
    if (Object.keys(mapUpdate).length > 0) {
      setFolderNameById((prev) => ({ ...prev, ...mapUpdate }));
    }
  }, [allFiles]);

  useEffect(() => {
    indexCurrentFolderNames();
  }, [indexCurrentFolderNames]);

  // Fetch files/folders for the current directory whenever currentPath changes
  useEffect(() => {
    const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
    fetchFiles(folderId);
  }, [currentPath, fetchFiles]);

  // Listen for refresh events and refresh current folder
  useEffect(() => {
    const handleRefresh = () => {
      // Use a ref or callback to get the current path without dependency
      setCurrentPath(currentPath => {
        const folderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;
        fetchFiles(folderId);
        return currentPath; // Don't change the path, just trigger refresh
      });
    };

    window.addEventListener('files:refresh', handleRefresh);
    return () => window.removeEventListener('files:refresh', handleRefresh);
  }, [fetchFiles]); // Remove currentPath dependency

  // The context now always provides the current folder's files/folders
  const currentFiles = allFiles;

  // Navigate into a folder by ID, and record its name from the current listing if available
  const navigateToFolder = (folderId: string) => {
    const folder = allFiles.find(f => f.type === 'folder' && f.id === folderId);
    if (folder?.name) {
      setFolderNameById((prev) => ({ ...prev, [folderId]: folder.name }));
    }
    setCurrentPath((prev) => {
      // Prevent duplicate folder IDs in the path
      if (prev.length > 0 && prev[prev.length - 1] === folderId) {
        return prev;
      }
      const newPath = [...prev, folderId];
      return newPath;
    });
  };

  // Navigate to a specific path (array of IDs)
  const navigateToPath = (path: string[]) => {
    // Remove any duplicate IDs from the path
    const uniquePath = path.filter((id, index) => path.indexOf(id) === index);
    setCurrentPath(uniquePath);
  };

  // Go back to parent directory
  const navigateUp = () => {
    setCurrentPath((prev) => prev.slice(0, -1));
  };

  // Go to root
  const navigateToRoot = () => {
    setCurrentPath([]);
  };

  const getFolderName = (id: string): string | undefined => folderNameById[id];

  return {
    currentPath,
    currentFiles,
    navigateToFolder,
    navigateToPath,
    navigateUp,
    navigateToRoot,
    getFolderName,
  };
}
