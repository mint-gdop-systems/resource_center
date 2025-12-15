import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  StarIcon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";
import Breadcrumb from "../components/layout/Breadcrumb";
import { ViewMode } from "../types";
import { getRecentFiles, bulkDeleteApi } from "../services/api";
import { useFiles } from "../contexts/FileContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatDate, cn } from "../lib/utils";
import BulkActions from "../components/files/BulkActions";
import { usePagination } from "../hooks/usePagination";
import PaginationComponent from "../components/ui/PaginationComponent";

// FontAwesome type icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileImage,
  faFileAlt,
  faFileArchive,
  faFile,
} from "@fortawesome/free-solid-svg-icons";

const fileTypeIconMap: Record<string, any> = {
  pdf: faFilePdf,
  doc: faFileWord,
  docx: faFileWord,
  xls: faFileExcel,
  xlsx: faFileExcel,
  ppt: faFilePowerpoint,
  pptx: faFilePowerpoint,
  jpg: faFileImage,
  jpeg: faFileImage,
  png: faFileImage,
  gif: faFileImage,
  txt: faFileAlt,
  zip: faFileArchive,
  rar: faFileArchive,
};

function TypeBadge({ ext, isDarkMode }: { ext?: string; isDarkMode: boolean }) {
  const label = (ext || "file").toUpperCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
      isDarkMode 
        ? 'bg-gray-700 text-gray-300' 
        : 'bg-gray-100 text-gray-700'
    }`}>
      {label}
    </span>
  );
}

function getTypeIcon(ext?: string) {
  const icon = fileTypeIconMap[(ext || "").toLowerCase()] || faFile;
  let colorClass = "text-blue-500";
  if (icon === faFilePdf) colorClass = "text-red-600";
  if (icon === faFileWord) colorClass = "text-blue-700";
  if (icon === faFileExcel) colorClass = "text-green-600";
  if (icon === faFilePowerpoint) colorClass = "text-orange-500";
  if (icon === faFileImage) colorClass = "text-pink-500";
  if (icon === faFileArchive) colorClass = "text-yellow-600";
  if (icon === faFileAlt) colorClass = "text-gray-500";
  return <FontAwesomeIcon icon={icon} className={`${colorClass} h-5 w-5`} />;
}

function groupByDate(items: any[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOfToday.getDate() - 7);

  const groups: Record<string, any[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Earlier: [],
  };

  for (const item of items) {
    const date = new Date(item.updatedAt || item.createdAt);
    if (date >= startOfToday) groups["Today"].push(item);
    else if (date >= startOfYesterday) groups["Yesterday"].push(item);
    else if (date >= startOf7DaysAgo) groups["Last 7 days"].push(item);
    else groups["Earlier"].push(item);
  }
  return groups;
}

export default function Recent() {
  const breadcrumbItems = [
    { id: "recent", name: "Recent", path: "/recent" },
  ];

  const { refreshRecentCount, refreshStarredCount, toggleStar, toggleArchive } = useFiles();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [starOnly, setStarOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>({ type: "list", sortBy: "date", sortOrder: "desc" });
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecentFiles({ limit: 100, includeArchived: false });
      const items = data.files || [];
      const mapped = items.map((i: any) => ({
        ...i,
        id: i.id?.toString?.() || String(i.id),
        type: 'file',
        owner: {
          id: i.owner_email,
          name: i.owner_first_name || 'Unknown User',
          email: i.owner_email,
          department: 'General',
          role: 'employee',
        },
        size: i.file_size,
        extension: i.file_type?.toLowerCase(),
        createdAt: new Date(i.uploaded_at || i.created_at),
        updatedAt: new Date(i.updated_at || i.created_at),
        starred: Boolean(i.is_starred),
        archived: Boolean(i.is_archived),
        shared: Boolean((i as any).is_shared),
      }));
      setRecentItems(mapped);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshRecentCount();
  }, [recentItems, refreshRecentCount]);

  const filtered = useMemo(() => {
    let items = recentItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((f) =>
        f.name?.toLowerCase().includes(q) ||
        f.extension?.toLowerCase().includes(q) ||
        (typeof f.category === 'object' && (f.category?.name || '').toLowerCase().includes(q))
      );
    }
    if (typeFilters.length > 0) {
      items = items.filter((f) => typeFilters.includes(f.extension || ""));
    }
    if (starOnly) {
      items = items.filter((f) => f.starred);
    }
    // Sort by date desc/asc
    const dir = viewMode.sortOrder === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => dir * ((a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt)));
    return items;
  }, [recentItems, search, typeFilters, starOnly, viewMode.sortOrder]);

  // Pagination
  const pagination = usePagination({
    totalItems: filtered.length,
    itemsPerPage,
    initialPage: 1,
  });

  const paginatedFiltered = pagination.getPageItems(filtered);
  const groups = useMemo(() => groupByDate(paginatedFiltered), [paginatedFiltered]);

  const toggleType = (ext: string) => {
    setTypeFilters((prev) => prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]);
  };

  const handleBulkDelete = async (fileIds: string[]) => {
    try {
      await bulkDeleteApi(fileIds, []);
      await refresh();
      await refreshRecentCount();
      await refreshStarredCount();
      setSelected([]);
    } catch (e) {
      // Errors will be surfaced via toast in context/API interceptors
    }
  };

  const handleBulkStar = async (fileIds: string[], starred: boolean) => {
    for (const id of fileIds) {
      await toggleStar(id);
    }
    await refresh();
    await refreshRecentCount();
    await refreshStarredCount();
    setSelected([]);
  };

  const handleSelect = (id: string, s: boolean) => {
    setSelected((prev) => s ? [...prev, id] : prev.filter((x) => x !== id));
  };

  const handleSelectAll = (s: boolean, ids: string[]) => {
    setSelected(s ? ids : []);
  };

  const Section = ({ title, items }: { title: string; items: any[] }) => {
    if (items.length === 0) return null;
    const allIds = items.map((f) => f.id);
    const allSelected = items.length > 0 && items.every((i) => selected.includes(i.id));
    const someSelected = selected.length > 0 && !allSelected && items.some((i) => selected.includes(i.id));
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>{title}</h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => { if (input) input.indeterminate = someSelected; }}
              onChange={(e) => handleSelectAll(e.target.checked, allIds)}
              className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
            />
          </div>
        </div>
        {viewMode.type === 'list' ? (
          <div className="space-y-1">
            {items.map((file, idx) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                className={cn(
                  "group flex items-center justify-between px-4 py-3 rounded-lg border transition-all",
                  selected.includes(file.id) 
                    ? `border-mint-200 ${isDarkMode ? 'bg-mint-900' : 'bg-mint-50'}` 
                    : `border ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'}`
                )}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {getTypeIcon(file.extension)}
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{file.name}</p>
                    <div className={`flex items-center gap-2 text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span>{file.owner?.name ?? "Unknown"}</span>
                      <span>•</span>
                      <span>{formatDate(new Date(file.updatedAt || file.createdAt))}</span>
                      <TypeBadge ext={file.extension} isDarkMode={isDarkMode} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label={file.starred ? 'Unstar' : 'Star'}
                    title={file.starred ? 'Unstar' : 'Star'}
                    onClick={async () => { await toggleStar(file.id); await refresh(); }}
                    className="p-2 rounded-md hover:bg-gray-100"
                  >
                    {file.starred ? (
                      <StarIconSolid className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    aria-label={file.archived ? 'Restore' : 'Archive'}
                    title={file.archived ? 'Restore' : 'Archive'}
                    onClick={async () => { await toggleArchive(file.id); await refresh(); }}
                    className={`p-2 rounded-md ${
                      isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                    }`}
                  >
                    <ArchiveBoxIcon className={cn("h-4 w-4", file.archived ? "text-mint-700" : "text-gray-400")} />
                  </button>
                  <button
                    aria-label="Download"
                    title="Download"
                    onClick={() => { /* Hook up download endpoint when available */ }}
                    className={`p-2 rounded-md ${
                      isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                    }`}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  <input
                    type="checkbox"
                    checked={selected.includes(file.id)}
                    onChange={(e) => handleSelect(file.id, e.target.checked)}
                    className="ml-2 h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((file, idx) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                className={cn(
                  "relative group rounded-xl border p-4 transition-all",
                  selected.includes(file.id) 
                    ? `border-mint-200 ${isDarkMode ? 'bg-mint-900' : 'bg-mint-50'}` 
                    : `border ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'}`
                )}
              >
                <div className="absolute top-2 right-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(file.id)}
                    onChange={(e) => handleSelect(file.id, e.target.checked)}
                    className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getTypeIcon(file.extension)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`} title={file.name}>{file.name}</p>
                    <div className={`mt-1 flex items-center gap-2 text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span>{file.owner?.name ?? "Unknown"}</span>
                      <span>•</span>
                      <span>{formatDate(new Date(file.updatedAt || file.createdAt))}</span>
                      <TypeBadge ext={file.extension} isDarkMode={isDarkMode} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    aria-label={file.starred ? 'Unstar' : 'Star'}
                    title={file.starred ? 'Unstar' : 'Star'}
                    onClick={async () => { await toggleStar(file.id); await refresh(); }}
                    className="inline-flex items-center px-2 py-1 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {file.starred ? (
                      <>
                        <StarIconSolid className="h-3.5 w-3.5 text-yellow-500 mr-1" /> Starred
                      </>
                    ) : (
                      <>
                        <StarIcon className="h-3.5 w-3.5 text-gray-400 mr-1" /> Star
                      </>
                    )}
                  </button>
                  <button
                    aria-label={file.archived ? 'Restore' : 'Archive'}
                    title={file.archived ? 'Restore' : 'Archive'}
                    onClick={async () => { await toggleArchive(file.id); await refresh(); }}
                    className={`inline-flex items-center px-2 py-1 rounded-md border text-xs ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-600' 
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ArchiveBoxIcon className={cn("h-3.5 w-3.5 mr-1", file.archived ? "text-mint-700" : "text-gray-400")} />
                    {file.archived ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    aria-label="Download"
                    title="Download"
                    onClick={() => { /* Hook up download endpoint when available */ }}
                    className={`inline-flex items-center px-2 py-1 rounded-md border text-xs ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-600' 
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                    Download
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const typeOptions = ["pdf", "docx", "xlsx", "pptx", "jpg", "png", "txt", "zip"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className={`mt-2 text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Recent</h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Your most recently updated documents, at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`hidden sm:flex items-center rounded-lg p-1 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <button
              onClick={() => setViewMode((v) => ({ ...v, type: "grid" }))}
              className={cn("p-2 rounded-md transition-colors", viewMode.type === "grid" 
                ? `text-mint-600 shadow-sm ${isDarkMode ? 'bg-gray-600' : 'bg-white'}` 
                : `${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              )}
            >
              <ViewColumnsIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode((v) => ({ ...v, type: "list" }))}
              className={cn("p-2 rounded-md transition-colors", viewMode.type === "list" 
                ? `text-mint-600 shadow-sm ${isDarkMode ? 'bg-gray-600' : 'bg-white'}` 
                : `${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              )}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>
          <select
            value={`${viewMode.sortBy}-${viewMode.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-");
              setViewMode((prev) => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any }));
            }}
            className={`text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint-500 ${
              isDarkMode 
                ? 'border-gray-600 bg-gray-700 text-white' 
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
          </select>
          <button
            onClick={refresh}
            className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm ${
              isDarkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border p-4 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Search recent files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={cn("inline-flex items-center px-3 py-2 rounded-lg text-sm", showFilters 
                ? `${isDarkMode ? 'bg-mint-900 text-mint-300' : 'bg-mint-100 text-mint-700'}` 
                : `border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
              )}
            >
              <FunnelIcon className="h-4 w-4 mr-2" /> Filters
            </button>
            <label className={`inline-flex items-center gap-2 text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <input type="checkbox" checked={starOnly} onChange={(e) => setStarOnly(e.target.checked)} className="h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded" />
              Starred only
            </label>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-4 pt-4 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((ext) => (
                  <button
                    key={ext}
                    onClick={() => toggleType(ext)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full border",
                      typeFilters.includes(ext) 
                        ? `border-mint-200 ${isDarkMode ? 'bg-mint-900 text-mint-300' : 'bg-mint-50 text-mint-700'}` 
                        : `border ${isDarkMode ? 'text-gray-300 border-gray-600 hover:bg-gray-700' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`
                    )}
                  >
                    {ext.toUpperCase()}
                  </button>
                ))}
                {(typeFilters.length > 0 || starOnly || search) && (
                  <button
                    onClick={() => { setTypeFilters([]); setStarOnly(false); setSearch(""); }}
                    className={`ml-auto px-3 py-1 text-xs rounded-full border ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <BulkActions
          selectedFiles={selected}
          onDelete={handleBulkDelete}
          onStar={handleBulkStar}
          onClearSelection={() => setSelected([])}
        />
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`animate-pulse h-16 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-100 border-gray-200'
              }`} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`rounded-xl shadow-sm border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="text-center py-16">
              <ClockIcon className={`mx-auto h-16 w-16 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <h3 className={`mt-4 text-lg font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>No recent files</h3>
              <p className={`mt-2 max-w-sm mx-auto ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Recently updated files will appear here as you and your team work.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-8">
              <Section title="Today" items={groups["Today"]} />
              <Section title="Yesterday" items={groups["Yesterday"]} />
              <Section title="Last 7 days" items={groups["Last 7 days"]} />
              <Section title="Earlier" items={groups["Earlier"]} />
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="mt-8 space-y-4">
                {/* Pagination Info and Items Per Page Selector */}
                <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Showing {pagination.startIndex + 1} to {Math.min(pagination.endIndex + 1, filtered.length)} of {filtered.length} recent files
                    </div>
                    {pagination.totalPages > 1 && (
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                      }`}>
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                      Show:
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const newItemsPerPage = Number(e.target.value);
                        setItemsPerPage(newItemsPerPage);
                        pagination.setItemsPerPage(newItemsPerPage);
                      }}
                      className={`px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                          : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                      }`}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                      per page
                    </span>
                  </div>
                </div>

                {/* Pagination Component */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center">
                    <PaginationComponent
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={pagination.goToPage}
                      showFirstLast={true}
                      showPreviousNext={true}
                      maxVisiblePages={7}
                      size="default"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 