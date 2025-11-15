/**
 * ONLYOFFICE Document Server Integration Utilities
 * 
 * This module provides utilities for detecting and handling ONLYOFFICE-supported file types
 */

export interface OnlyOfficeConfig {
  documentServerUrl: string;
  documentKey: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  editorConfig: {
    mode: 'view' | 'edit';
    callbackUrl: string;
    user: {
      id: string;
      name: string;
    };
  };
}

/**
 * File extensions supported by ONLYOFFICE Document Server
 */
export const ONLYOFFICE_SUPPORTED_EXTENSIONS = {
  // Word documents
  word: ['doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'fodt', 'ott', 'rtf', 'txt', 'html', 'htm', 'mht', 'pdf', 'djvu', 'fb2', 'epub', 'xps'],
  // Excel spreadsheets
  spreadsheet: ['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm', 'ods', 'fods', 'ots', 'csv'],
  // PowerPoint presentations
  presentation: ['pps', 'ppsx', 'ppsm', 'ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'odp', 'fodp', 'otp'],
} as const;

/**
 * Check if a file extension is supported by ONLYOFFICE
 */
export function isOnlyOfficeSupported(extension: string | undefined | null): boolean {
  if (!extension) return false;
  
  const ext = extension.toLowerCase().replace(/^\./, ''); // Remove leading dot if present
  
  return (
    ONLYOFFICE_SUPPORTED_EXTENSIONS.word.includes(ext) ||
    ONLYOFFICE_SUPPORTED_EXTENSIONS.spreadsheet.includes(ext) ||
    ONLYOFFICE_SUPPORTED_EXTENSIONS.presentation.includes(ext)
  );
}

/**
 * Get the document type for ONLYOFFICE based on file extension
 */
export function getOnlyOfficeDocumentType(extension: string | undefined | null): 'word' | 'cell' | 'slide' | null {
  if (!extension) return null;
  
  const ext = extension.toLowerCase().replace(/^\./, '');
  
  if (ONLYOFFICE_SUPPORTED_EXTENSIONS.word.includes(ext)) {
    return 'word';
  }
  if (ONLYOFFICE_SUPPORTED_EXTENSIONS.spreadsheet.includes(ext)) {
    return 'cell';
  }
  if (ONLYOFFICE_SUPPORTED_EXTENSIONS.presentation.includes(ext)) {
    return 'slide';
  }
  
  return null;
}

/**
 * Generate a unique document key for ONLYOFFICE
 * This key is used to identify the document in the Document Server
 */
export function generateDocumentKey(fileId: string, userId: string): string {
  // Create a unique key based on file ID and user ID
  // In production, you might want to use a more sophisticated approach
  return `${fileId}_${userId}_${Date.now()}`;
}

