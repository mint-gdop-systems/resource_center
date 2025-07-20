// MOCK DATA FILE: For development/demo only. Do NOT use in production after backend integration.
import { User, FileItem, NavigationItem } from "../types";

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Dr. Amare Tekle",
    email: "amare.tekle@mint.gov.et",
    avatar: "/avatars/amare.jpg",
    department: "Innovation Strategy",
    role: "admin",
  },
  {
    id: "2",
    name: "Hanan Mohammed",
    email: "hanan.mohammed@mint.gov.et",
    avatar: "/avatars/hanan.jpg",
    department: "Digital Transformation",
    role: "manager",
  },
  {
    id: "3",
    name: "Kebede Assefa",
    email: "kebede.assefa@mint.gov.et",
    avatar: "/avatars/kebede.jpg",
    department: "Technology Policy",
    role: "employee",
  },
  {
    id: "4",
    name: "Meron Tadesse",
    email: "meron.tadesse@mint.gov.et",
    avatar: "/avatars/meron.jpg",
    department: "Research & Development",
    role: "manager",
  },
];

export const currentUser = mockUsers[0];

export const mockFiles: FileItem[] = [
  // Folders
  {
    id: "f1",
    name: "Strategic Plans",
    type: "folder",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    owner: mockUsers[0],
    starred: true,
    archived: false,
    shared: true,
    permissions: [],
    path: ["Strategic Plans"],
    thumbnail: "/icons/folder-blue.svg",
  },
  {
    id: "f2",
    name: "Digital Ethiopia 2025",
    type: "folder",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-25"),
    owner: mockUsers[1],
    starred: false,
    archived: false,
    shared: true,
    permissions: [],
    path: ["Digital Ethiopia 2025"],
    thumbnail: "/icons/folder-green.svg",
  },
  {
    id: "f3",
    name: "Budget Reports",
    type: "folder",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-05"),
    owner: mockUsers[2],
    starred: false,
    archived: false,
    shared: false,
    permissions: [],
    path: ["Budget Reports"],
    thumbnail: "/icons/folder-orange.svg",
  },

  // Files
  {
    id: "file1",
    name: "MINT Annual Report 2024.pdf",
    type: "file",
    size: 2456789,
    mimeType: "application/pdf",
    extension: "pdf",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    owner: mockUsers[0],
    starred: true,
    archived: false,
    shared: true,
    permissions: [],
    path: ["Strategic Plans", "MINT Annual Report 2024.pdf"],
    thumbnail: "/icons/pdf.svg",
  },
  {
    id: "file2",
    name: "Technology Infrastructure Assessment.docx",
    type: "file",
    size: 1234567,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    createdAt: new Date("2024-01-18"),
    updatedAt: new Date("2024-01-22"),
    owner: mockUsers[1],
    starred: false,
    archived: false,
    shared: true,
    permissions: [],
    path: [
      "Digital Ethiopia 2025",
      "Technology Infrastructure Assessment.docx",
    ],
    thumbnail: "/icons/word.svg",
  },
  {
    id: "file3",
    name: "Q1 Budget Analysis.xlsx",
    type: "file",
    size: 987654,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-03"),
    owner: mockUsers[2],
    starred: false,
    archived: false,
    shared: false,
    permissions: [],
    path: ["Budget Reports", "Q1 Budget Analysis.xlsx"],
    thumbnail: "/icons/excel.svg",
  },
  {
    id: "file4",
    name: "Innovation Strategy Presentation.pptx",
    type: "file",
    size: 5678901,
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-25"),
    owner: mockUsers[3],
    starred: true,
    archived: false,
    shared: true,
    permissions: [],
    path: ["Strategic Plans", "Innovation Strategy Presentation.pptx"],
    thumbnail: "/icons/powerpoint.svg",
  },
  {
    id: "file5",
    name: "Team Photo 2024.jpg",
    type: "file",
    size: 3456789,
    mimeType: "image/jpeg",
    extension: "jpg",
    createdAt: new Date("2024-01-25"),
    updatedAt: new Date("2024-01-25"),
    owner: mockUsers[0],
    starred: false,
    archived: false,
    shared: true,
    permissions: [],
    path: ["Team Photo 2024.jpg"],
    thumbnail: "/images/team-photo-thumb.jpg",
  },
];

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: "HomeIcon",
    path: "/dashboard",
  },
  {
    id: "files",
    name: "My Files",
    icon: "FolderIcon",
    path: "/files",
    count: 42,
  },
  {
    id: "recent",
    name: "Recent",
    icon: "ClockIcon",
    path: "/recent",
    count: 12,
  },
  {
    id: "starred",
    name: "Starred",
    icon: "StarIcon",
    path: "/starred",
    count: 8,
  },
  {
    id: "shared",
    name: "Shared with me",
    icon: "UserGroupIcon",
    path: "/shared",
    count: 15,
    badge: "new",
  },
  {
    id: "archive",
    name: "Archive",
    icon: "ArchiveBoxIcon",
    path: "/archive",
    count: 5,
  },
];

export const recentFiles = mockFiles.slice(0, 4);
export const starredFiles = mockFiles.filter((file) => file.starred);
export const sharedFiles = mockFiles.filter((file) => file.shared);

export const storageStats = {
  used: 45.2, // GB
  total: 100, // GB
  usedPercentage: 45.2,
};

export const activityFeed = [
  {
    id: "a1",
    type: "upload" as const,
    user: mockUsers[1],
    file: mockFiles[1],
    timestamp: new Date("2024-01-25T14:30:00"),
    description: "uploaded Technology Infrastructure Assessment.docx",
  },
  {
    id: "a2",
    type: "share" as const,
    user: mockUsers[0],
    file: mockFiles[0],
    timestamp: new Date("2024-01-25T10:15:00"),
    description: "shared MINT Annual Report 2024.pdf with the team",
  },
  {
    id: "a3",
    type: "edit" as const,
    user: mockUsers[2],
    file: mockFiles[2],
    timestamp: new Date("2024-01-24T16:45:00"),
    description: "modified Q1 Budget Analysis.xlsx",
  },
];

export const fileTypeIcons: Record<string, string> = {
  pdf: "/icons/pdf.svg",
  doc: "/icons/word.svg",
  docx: "/icons/word.svg",
  xls: "/icons/excel.svg",
  xlsx: "/icons/excel.svg",
  ppt: "/icons/powerpoint.svg",
  pptx: "/icons/powerpoint.svg",
  jpg: "/icons/image.svg",
  jpeg: "/icons/image.svg",
  png: "/icons/image.svg",
  gif: "/icons/image.svg",
  txt: "/icons/text.svg",
  zip: "/icons/archive.svg",
  rar: "/icons/archive.svg",
  folder: "/icons/folder.svg",
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};
