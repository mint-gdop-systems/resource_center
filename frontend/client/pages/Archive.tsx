import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { 
  ArchiveBoxIcon, 
  ArrowPathIcon, 
  ClockIcon, 
  UserIcon, 
  FolderIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import Breadcrumb from "../components/layout/Breadcrumb";
import FileList from "../components/files/FileList";
import ArchiveFilters, { ArchiveFilters as ArchiveFiltersType } from "../components/files/ArchiveFilters";
import ArchiveSearch from "../components/files/ArchiveSearch";
import ArchiveGroupedList from "../components/files/ArchiveGroupedList";
import ArchiveAnalytics from "../components/files/ArchiveAnalytics";
import ArchiveBulkActions from "../components/files/ArchiveBulkActions";
import ArchiveSettings, { ArchiveSettings as ArchiveSettingsType } from "../components/files/ArchiveSettings";
import { ViewMode } from "../types";
import { getFiles } from "../services/api";
import { useFiles } from "../contexts/FileContext";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { formatDate, exportToCSV } from "../lib/utils";
import toast from "react-hot-toast";

export default function Archive() {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const breadcrumbItems = [
    { id: "archive", name: "Archive", path: "/archive" },
  ];
  const { toggleArchive, toggleFolderArchive, refreshArchiveCount, archiveFiles } = useFiles();
  
  // State management
  const [archivedItems, setArchivedItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showRestoreAll, setShowRestoreAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Today', 'Yesterday', 'This Week']));
  
  // Filter and view state
  const [filters, setFilters] = useState<ArchiveFiltersType>({
    sortBy: 'archived_date',
    sortOrder: 'desc',
    groupBy: 'date',
  });
  
  const confirmDeleteOne = (id: string) => setShowDeleteConfirm({ open: true, ids: [id] });
  const viewMode: ViewMode = { type: "list", sortBy: "date", sortOrder: "desc" };

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFiles(undefined, { archived: true });
      const files = (data.files || []).map((i: any) => ({ 
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
        archived: true,
        archivedAt: i.archived_at ? new Date(i.archived_at) : null,
        archivedBy: i.archived_by_email || null,
        archivedByName: i.archived_by_name || null,
        folderId: i.folder || null,
        folderName: i.folder_name || null,
      }));
      
      const folders = (data.folders || []).map((f: any) => ({
        ...f,
        id: f.id?.toString?.() || String(f.id),
        type: 'folder',
        owner: {
          id: f.owner_email,
          name: f.owner_first_name || 'Unknown User',
          email: f.owner_email,
          department: 'General',
          role: 'employee',
        },
        size: 0,
        extension: 'folder',
        createdAt: new Date(f.created_at),
        updatedAt: new Date(f.created_at),
        archived: true,
        archivedAt: f.archived_at ? new Date(f.archived_at) : null,
        archivedBy: f.archived_by_email || null,
        archivedByName: f.archived_by_name || null,
        folderId: f.parent || null,
      }));
      
      const allItems = [...folders, ...files];
      setArchivedItems(allItems);
      setFilteredItems(allItems);
    } catch (error: any) {
      console.error('Error fetching archived items:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to load archived items';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRestore = async (itemId: string, itemType: 'file' | 'folder') => {
    try {
      if (itemType === 'file') {
        await toggleArchive(itemId);
      } else {
        if (toggleFolderArchive) {
          await toggleFolderArchive(itemId);
        } else {
          toast.error('Folder archive functionality not available');
          return;
        }
      }
      await fetchArchived();
      await refreshArchiveCount();
      setSelected((prev) => prev.filter((id) => id !== itemId));
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to restore item';
      toast.error(errorMsg);
    }
  };

  const handleRestoreSelected = async () => {
    const ids = selected;
    if (ids.length === 0) return;
    let count = 0;
    let errors = 0;
    try {
      for (const id of ids) {
        try {
          const item = archivedItems.find(i => i.id === id);
          if (item?.type === 'folder' && toggleFolderArchive) {
            await toggleFolderArchive(id);
          } else {
            await toggleArchive(id);
          }
          count++;
        } catch (error: any) {
          errors++;
          console.error(`Error restoring item ${id}:`, error);
        }
      }
      await fetchArchived();
      await refreshArchiveCount();
      setSelected([]);
      if (errors > 0) {
        toast.error(`${errors} item(s) failed to restore. ${count} item(s) restored successfully.`);
      } else {
        toast.success(`${count} item(s) restored`);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to restore items';
      toast.error(errorMsg);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = showDeleteConfirm.ids;
    if (ids.length === 0) return;
    try {
      const { bulkDeleteApi } = await import('../services/api');
      await bulkDeleteApi(ids, []);
      toast.success(`${ids.length} item(s) deleted permanently`);
      await fetchArchived();
      await refreshArchiveCount();
      setSelected([]);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to delete items';
      toast.error(errorMsg);
    } finally {
      setShowDeleteConfirm({ open: false, ids: [] });
    }
  };

  const handleRestoreAll = async () => {
    const ids = archivedItems.map((f) => f.id);
    if (ids.length === 0) return;
    let count = 0;
    let errors = 0;
    try {
      for (const id of ids) {
        try {
          const item = archivedItems.find(i => i.id === id);
          if (item?.type === 'folder' && toggleFolderArchive) {
            await toggleFolderArchive(id);
          } else {
            await toggleArchive(id);
          }
          count++;
        } catch (error: any) {
          errors++;
          console.error(`Error restoring item ${id}:`, error);
        }
      }
      await fetchArchived();
      await refreshArchiveCount();
      setShowRestoreAll(false);
      setSelected([]);
      if (errors > 0) {
        toast.error(`${errors} item(s) failed to restore. ${count} item(s) restored successfully.`);
      } else {
        toast.success(`${count} item(s) restored`);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to restore items';
      toast.error(errorMsg);
      setShowRestoreAll(false);
    }
  };

  // Computed values
  const sortedAndFilteredItems = useMemo(() => {
    let items = [...filteredItems];

    // Apply date range filter
    if (filters.dateRange?.from || filters.dateRange?.to) {
      items = items.filter(item => {
        if (!item.archivedAt) return false;
        const archivedDate = new Date(item.archivedAt).toISOString().split('T')[0];
        
        if (filters.dateRange?.from && archivedDate < filters.dateRange.from) return false;
        if (filters.dateRange?.to && archivedDate > filters.dateRange.to) return false;
        
        return true;
      });
    }

    // Apply archived by filter
    if (filters.archivedBy) {
      items = items.filter(item => item.archivedBy === filters.archivedBy);
    }

    // Apply file type filter
    if (filters.fileType) {
      if (filters.fileType === 'folder') {
        items = items.filter(item => item.type === 'folder');
      } else {
        items = items.filter(item => item.type === 'file' && item.extension === filters.fileType);
      }
    }

    // Apply sorting
    items.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'archived_date':
          aValue = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
          bValue = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'original_location':
          aValue = a.folderName || 'Root';
          bValue = b.folderName || 'Root';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [filteredItems, filters]);

  // Get unique values for filters
  const archivedUsers = useMemo(() => {
    const users = new Map();
    archivedItems.forEach(item => {
      if (item.archivedBy && item.archivedByName) {
        users.set(item.archivedBy, {
          id: item.archivedBy,
          name: item.archivedByName,
          email: item.archivedBy,
        });
      }
    });
    return Array.from(users.values());
  }, [archivedItems]);

  const fileTypes = useMemo(() => {
    const types = new Set<string>();
    archivedItems.forEach(item => {
      if (item.type === 'file' && item.extension) {
        types.add(item.extension);
      }
    });
    return Array.from(types).sort();
  }, [archivedItems]);

  const allSelected = sortedAndFilteredItems.length > 0 && sortedAndFilteredItems.every((f) => selected.includes(f.id));
  const someSelected = selected.length > 0 && !allSelected;
  const selectedItems = sortedAndFilteredItems.filter(item => selected.includes(item.id));

  const handleSelect = (id: string, s: boolean) => {
    setSelected((prev) => (s ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleSelectAll = (s: boolean) => {
    if (s) {
      setSelected(sortedAndFilteredItems.map((f) => f.id));
    } else {
      setSelected([]);
    }
  };

  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const handleExportList = () => {
    const exportData = selectedItems.map(item => ({
      name: item.name,
      type: item.type,
      size: item.size || 0,
      archived_date: item.archivedAt ? formatDate(new Date(item.archivedAt)) : '',
      archived_by: item.archivedByName || '',
      original_location: item.folderName || 'Root',
      owner: item.owner.name,
    }));

    const headers = ['Name', 'Type', 'Size', 'Archived Date', 'Archived By', 'Original Location', 'Owner'];
    const filename = `archive-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    exportToCSV(exportData, filename, headers);
    toast.success(`Exported ${selectedItems.length} items to CSV`);
  };

  const handleSaveSettings = (settings: ArchiveSettingsType) => {
    // TODO: Save settings to backend or localStorage
    console.log('Archive settings saved:', settings);
    toast.success('Archive settings saved successfully');
  };

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const archivedCount = archivedItems.length;

  return (
    <div className={`space-y-6 ${isDarkMode ? 'bg-gray-800' : ''}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className={`mt-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Archive</h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Manage and restore your archived files and folders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              isDarkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            Settings
          </button>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              showAnalytics
                ? (isDarkMode ? 'bg-mint-700 text-mint-100' : 'bg-mint-600 text-white')
                : (isDarkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200')
            }`}
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setShowRestoreAll(true)}
            disabled={archivedCount === 0}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-mint-700 text-mint-100 hover:bg-mint-600' : 'bg-mint-600 text-white hover:bg-mint-700'}`}
            title="Restore all"
          >
            <ArchiveBoxIcon className="h-4 w-4 mr-2" /> Restore All
          </button>
          <button
            onClick={() => setShowDeleteConfirm({ open: true, ids: archivedItems.map(f => f.id) })}
            disabled={archivedCount === 0}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-red-900 text-red-300 hover:bg-red-800' : 'bg-red-600 text-white hover:bg-red-700'}`}
            title="Delete all"
          >
            Delete All
          </button>
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <ArchiveAnalytics archivedItems={archivedItems} />
      )}

      {/* Search */}
      <ArchiveSearch
        archivedItems={archivedItems}
        onSearchResults={setFilteredItems}
        placeholder="Search archived files and folders..."
      />

      {/* Filters */}
      <ArchiveFilters
        filters={filters}
        onFiltersChange={setFilters}
        archivedUsers={archivedUsers}
        fileTypes={fileTypes}
      />

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <ArchiveBulkActions
          selectedItems={selectedItems}
          onRestoreSelected={handleRestoreSelected}
          onDeleteSelected={() => setShowDeleteConfirm({ open: true, ids: selected })}
          onExportList={handleExportList}
          onClearSelection={() => setSelected([])}
          isLoading={loading}
        />
      )}

      {/* Main Content */}
      {loading ? (
        <div className={`rounded-xl shadow-sm border text-center py-16 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <ArrowPathIcon className={`mx-auto h-8 w-8 animate-spin ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading archived items...</p>
        </div>
      ) : archivedItems.length === 0 ? (
        <div className={`rounded-xl shadow-sm border text-center py-16 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <ArchiveBoxIcon className={`mx-auto h-16 w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`mt-4 text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No archived items</h3>
          <p className={`mt-2 max-w-sm mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Archive old files and folders to keep your workspace organized while preserving important documents.
          </p>
        </div>
      ) : sortedAndFilteredItems.length === 0 ? (
        <div className={`rounded-xl shadow-sm border text-center py-16 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <ArchiveBoxIcon className={`mx-auto h-16 w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`mt-4 text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No items match your filters</h3>
          <p className={`mt-2 max-w-sm mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      ) : (
        <div className={`rounded-xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Content Header */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Archived Items ({sortedAndFilteredItems.length})
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {sortedAndFilteredItems.filter(i => i.type === 'file').length} files, {sortedAndFilteredItems.filter(i => i.type === 'folder').length} folders
                  {sortedAndFilteredItems.length !== archivedItems.length && (
                    <span> • Filtered from {archivedItems.length} total</span>
                  )}
                </p>
              </div>
              <button
                onClick={fetchArchived}
                disabled={loading}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} disabled:opacity-50`}
                title="Refresh list"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4">
            <ArchiveGroupedList
              files={sortedAndFilteredItems}
              selectedFiles={selected}
              onFileSelect={handleSelect}
              onSelectAll={handleSelectAll}
              viewMode={viewMode}
              groupBy={filters.groupBy}
              onArchiveOverride={(id) => {
                const item = sortedAndFilteredItems.find(i => i.id === id);
                handleRestore(id, item?.type === 'folder' ? 'folder' : 'file');
              }}
              onDeleteOverride={confirmDeleteOne}
              expandedGroups={expandedGroups}
              onToggleGroup={handleToggleGroup}
            />
          </div>
        </div>
      )}

      {/* Restore All confirmation */}
      <ConfirmationModal
        isOpen={showRestoreAll}
        onClose={() => setShowRestoreAll(false)}
        onConfirm={handleRestoreAll}
        title="Restore all items"
        message={`Are you sure you want to restore all ${archivedCount} item(s)? This will restore them to their original locations.`}
        confirmLabel="Yes"
        cancelLabel="Cancel"
        confirmStyle="primary"
      />
      <ConfirmationModal
        isOpen={showDeleteConfirm.open}
        onClose={() => setShowDeleteConfirm({ open: false, ids: [] })}
        onConfirm={handleDeleteSelected}
        title="Delete files"
        message={`Are you sure you want to permanently delete ${showDeleteConfirm.ids.length} file(s)? This cannot be undone.`}
        confirmLabel="Yes"
        cancelLabel="Cancel"
        confirmStyle="danger"
      />

      {/* Archive Settings Modal */}
      <ArchiveSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
