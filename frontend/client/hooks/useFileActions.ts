import { FileItem } from "../types";
import toast from "react-hot-toast";
import { isOnlyOfficeSupported } from "../utils/onlyoffice";

export function useFileActions() {
  const openFile = async (file: FileItem, onOpenOnlyOffice?: (file: FileItem) => void) => {
    if (file.type === "folder") {
      // This will be handled by navigation hook
      return { action: "navigate", target: file.name };
    }

    // Check if file is supported by ONLYOFFICE
    if (isOnlyOfficeSupported(file.extension)) {
      if (onOpenOnlyOffice) {
        onOpenOnlyOffice(file);
        return { action: "open_onlyoffice", target: file.id };
      } else {
        toast.error('ONLYOFFICE editor not available');
        return { action: "error", target: file.id };
      }
    }

    // For non-ONLYOFFICE files (PDFs, images, etc.), use the existing viewer
    try {
      // Import the viewFile API function
      const { viewFile } = await import('../services/api');
      
      // Use the API to get the file
      const url = await viewFile(file.id);
      window.open(url, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success(`Opening ${file.name}...`);
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to open file. Please try again.');
    }

    return { action: "open", target: file.id };
  };

  const downloadFile = async (file: FileItem) => {
    try {
      if (file.type === 'folder') {
        // Import the downloadFolder API function
        const { downloadFolder } = await import('../services/api');
        
        // Download the folder as ZIP
        await downloadFolder(file.id, file.name);
        toast.success(`Downloading ${file.name}.zip...`);
      } else {
        // Import the downloadFile API function
        const { downloadFile: downloadFileApi } = await import('../services/api');
        
        // Download the file
        await downloadFileApi(file.id, file.name);
        toast.success(`Downloading ${file.name}...`);
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error(`Failed to download ${file.type}. Please try again.`);
    }
  };

  const previewFile = (file: FileItem) => {
    // For now, just show a preview modal
    toast.success(`Preview for ${file.name} would open here`);
    // In real app, would open preview modal or new tab
  };

  return {
    openFile,
    downloadFile,
    previewFile,
  };
}
