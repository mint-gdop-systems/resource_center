import { useState, useMemo } from "react";
import { FileItem } from "../types";

export function useFileNavigation(allFiles: FileItem[]) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  // Get files for current directory
  const currentFiles = useMemo(() => {
    if (currentPath.length === 0) {
      // Root level - show files that are at root level
      return allFiles.filter((file) => file.path.length === 1);
    }

    // Show files in current folder
    const currentPathString = currentPath.join("/");
    return allFiles.filter((file) => {
      const filePathString = file.path.slice(0, -1).join("/");
      return filePathString === currentPathString;
    });
  }, [allFiles, currentPath]);

  // Navigate into a folder
  const navigateToFolder = (folderName: string) => {
    setCurrentPath((prev) => [...prev, folderName]);
  };

  // Navigate to a specific path
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
