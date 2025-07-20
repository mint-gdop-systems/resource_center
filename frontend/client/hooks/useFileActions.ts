import { FileItem } from "../types";
import toast from "react-hot-toast";

export function useFileActions() {
  const openFile = (file: FileItem) => {
    if (file.type === "folder") {
      // This will be handled by navigation hook
      return { action: "navigate", target: file.name };
    }

    // Handle different file types
    switch (file.extension?.toLowerCase()) {
      case "pdf":
        // In a real app, this would open a PDF viewer
        toast.success(`Opening ${file.name} in PDF viewer...`);
        // Simulate opening in new tab
        window.open(`#/preview/${file.id}`, "_blank");
        break;

      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        // Open image preview
        toast.success(`Opening image preview for ${file.name}...`);
        window.open(`#/preview/${file.id}`, "_blank");
        break;

      case "doc":
      case "docx":
        toast.success(`Opening ${file.name} in document viewer...`);
        window.open(`#/preview/${file.id}`, "_blank");
        break;

      case "xls":
      case "xlsx":
        toast.success(`Opening ${file.name} in spreadsheet viewer...`);
        window.open(`#/preview/${file.id}`, "_blank");
        break;

      case "ppt":
      case "pptx":
        toast.success(`Opening ${file.name} in presentation viewer...`);
        window.open(`#/preview/${file.id}`, "_blank");
        break;

      default:
        // Default to download
        downloadFile(file);
    }

    return { action: "open", target: file.id };
  };

  const downloadFile = (file: FileItem) => {
    // In a real app, this would trigger actual download
    toast.success(`Downloading ${file.name}...`);

    // Simulate download
    const link = document.createElement("a");
    link.href = "#"; // Would be actual file URL
    link.download = file.name;
    link.click();
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
