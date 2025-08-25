import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { ArchiveBoxIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Breadcrumb from "../components/layout/Breadcrumb";
import FileList from "../components/files/FileList";
import { ViewMode } from "../types";
import { getFiles } from "../services/api";
import { useFiles } from "../contexts/FileContext";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import toast from "react-hot-toast";

export default function Archive() {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  const breadcrumbItems = [
    { id: "archive", name: "Archive", path: "/archive" },
  ];
  const { toggleArchive, refreshArchiveCount, archiveFiles } = useFiles();
  const [archivedItems, setArchivedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showUnarchiveAll, setShowUnarchiveAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const confirmDeleteOne = (id: string) => setShowDeleteConfirm({ open: true, ids: [id] });
  const viewMode: ViewMode = { type: "list", sortBy: "date", sortOrder: "desc" };

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFiles(undefined, { archived: true });
      const items = data.files || [];
      setArchivedItems(items.map((i: any) => ({ 
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
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUnarchive = async (fileId: string) => {
    await toggleArchive(fileId);
    await fetchArchived();
    await refreshArchiveCount();
    setSelected((prev) => prev.filter((id) => id !== fileId));
  };

  const handleUnarchiveSelected = async () => {
    const ids = selected;
    if (ids.length === 0) return;
    let count = 0;
    for (const id of ids) {
      await toggleArchive(id);
      count++;
    }
    await fetchArchived();
    await refreshArchiveCount();
    setSelected([]);
    toast.success(`${count} item(s) unarchived`);
  };

  const handleDeleteSelected = async () => {
    const ids = showDeleteConfirm.ids;
    if (ids.length === 0) return;
    // Reuse bulk delete from FileList via context: deleteFiles expects to open modal; here we bypass and do own confirm
    try {
      const { bulkDeleteApi } = await import('../services/api');
      await bulkDeleteApi(ids, []);
      await fetchArchived();
      await refreshArchiveCount();
      setSelected([]);
    } finally {
      setShowDeleteConfirm({ open: false, ids: [] });
    }
  };

  const handleUnarchiveAll = async () => {
    const ids = archivedItems.map((f) => f.id);
    if (ids.length === 0) return;
    let count = 0;
    for (const id of ids) {
      await toggleArchive(id);
      count++;
    }
    await fetchArchived();
    await refreshArchiveCount();
    setShowUnarchiveAll(false);
    setSelected([]);
    toast.success(`${count} item(s) unarchived`);
  };

  const allSelected = archivedItems.length > 0 && archivedItems.every((f) => selected.includes(f.id));
  const someSelected = selected.length > 0 && !allSelected;

  const handleSelect = (id: string, s: boolean) => {
    setSelected((prev) => (s ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const handleSelectAll = (s: boolean) => {
    if (s) {
      setSelected(archivedItems.map((f) => f.id));
    } else {
      setSelected([]);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const archivedCount = archivedItems.length;

  return (
    <div className={`space-y-6 ${isDarkMode ? 'bg-gray-800' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className={`mt-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Archive</h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Archived files you can bring back anytime</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUnarchiveAll(true)}
            disabled={archivedCount === 0}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-mint-700 text-mint-100 hover:bg-mint-600' : 'bg-mint-600 text-white hover:bg-mint-700'}`}
            title="Unarchive all"
          >
            <ArchiveBoxIcon className="h-4 w-4 mr-2" /> Unarchive All
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

      {/* Bulk actions for selected items */}
      {selected.length > 0 && (
        <div className={`flex items-center justify-between p-3 rounded-lg border ${isDarkMode ? 'bg-mint-900 border-mint-700' : 'bg-mint-50 border-mint-200'}`}>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => { if (input) input.indeterminate = someSelected; }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className={`h-4 w-4 text-mint-600 focus:ring-mint-500 border-gray-300 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : ''}`}
            />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-mint-300' : 'text-mint-700'}`}>{selected.length} item{selected.length !== 1 ? "s" : ""} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUnarchiveSelected}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md ${isDarkMode ? 'text-mint-100 bg-mint-700 hover:bg-mint-600' : 'text-mint-700 bg-mint-100 hover:bg-mint-200'}`}
            >
              <ArchiveBoxIcon className="h-4 w-4 mr-1" /> Unarchive Selected
            </button>
            <button
              onClick={() => setShowDeleteConfirm({ open: true, ids: selected })}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md ${isDarkMode ? 'text-red-300 bg-red-900 hover:bg-red-800' : 'text-red-700 bg-red-100 hover:bg-red-200'}`}
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelected([])}
              className={`text-sm underline ${isDarkMode ? 'text-mint-300 hover:text-mint-100' : 'text-mint-600 hover:text-mint-700'}`}
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {archivedItems.length === 0 ? (
        <div className={`rounded-xl shadow-sm border text-center py-16 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <ArchiveBoxIcon className={`mx-auto h-16 w-16 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`mt-4 text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No archived files</h3>
          <p className={`mt-2 max-w-sm mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Archive old files to keep your workspace organized while preserving important documents.</p>
        </div>
      ) : (
        <div className={`rounded-xl shadow-sm border p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Archived Files</h3>
            <button
              onClick={fetchArchived}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              title="Refresh list"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2">
            <FileList
              files={archivedItems}
              selectedFiles={selected}
              onFileSelect={handleSelect}
              onSelectAll={handleSelectAll}
              viewMode={viewMode}
              onArchiveOverride={handleUnarchive}
              actionsMode="archive"
              onDeleteOverride={confirmDeleteOne}
              showBulkActions={false}
            />
          </div>
        </div>
      )}

      {/* Unarchive All confirmation */}
      <ConfirmationModal
        isOpen={showUnarchiveAll}
        onClose={() => setShowUnarchiveAll(false)}
        onConfirm={handleUnarchiveAll}
        title="Unarchive all files"
        message={`Are you sure you want to unarchive all ${archivedCount} file(s)? This will restore them to their original locations.`}
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
    </div>
  );
}
