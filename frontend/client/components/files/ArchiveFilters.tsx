import React, { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
    FunnelIcon,
    CalendarIcon,
    UserIcon,
    DocumentIcon,
    XMarkIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";

export interface ArchiveFilters {
    dateRange?: {
        from: string;
        to: string;
    };
    archivedBy?: string;
    fileType?: string;
    sortBy: 'archived_date' | 'name' | 'size' | 'original_location';
    sortOrder: 'asc' | 'desc';
    groupBy: 'none' | 'date' | 'type' | 'archived_by';
}

interface ArchiveFiltersProps {
    filters: ArchiveFilters;
    onFiltersChange: (filters: ArchiveFilters) => void;
    archivedUsers: Array<{ id: string; name: string; email: string }>;
    fileTypes: string[];
}

export default function ArchiveFilters({
    filters,
    onFiltersChange,
    archivedUsers,
    fileTypes,
}: ArchiveFiltersProps) {
    const { actualTheme } = useTheme();
    const isDarkMode = actualTheme === 'dark';
    const [showFilters, setShowFilters] = useState(false);

    const updateFilters = (updates: Partial<ArchiveFilters>) => {
        onFiltersChange({ ...filters, ...updates });
    };

    const clearFilters = () => {
        onFiltersChange({
            sortBy: 'archived_date',
            sortOrder: 'desc',
            groupBy: 'date',
        });
    };

    const hasActiveFilters = filters.dateRange || filters.archivedBy || filters.fileType;

    return (
        <div className={`border rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Filter Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode
                            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                    >
                        <FunnelIcon className="h-4 w-4" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 px-2 py-0.5 text-xs bg-mint-500 text-white rounded-full">
                                {[filters.dateRange, filters.archivedBy, filters.fileType].filter(Boolean).length}
                            </span>
                        )}
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${isDarkMode
                                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <XMarkIcon className="h-3 w-3" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Sort and Group Controls */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Sort by:
                        </label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                            className={`text-sm border rounded-md px-2 py-1 ${isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                                }`}
                        >
                            <option value="archived_date">Archive Date</option>
                            <option value="name">Name</option>
                            <option value="size">Size</option>
                            <option value="original_location">Original Location</option>
                        </select>
                        <button
                            onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                            className={`p-1 rounded-md transition-colors ${isDarkMode
                                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {filters.sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Group by:
                        </label>
                        <select
                            value={filters.groupBy}
                            onChange={(e) => updateFilters({ groupBy: e.target.value as any })}
                            className={`text-sm border rounded-md px-2 py-1 ${isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                                }`}
                        >
                            <option value="none">None</option>
                            <option value="date">Date</option>
                            <option value="type">File Type</option>
                            <option value="archived_by">Archived By</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Date Range Filter */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <CalendarIcon className="h-4 w-4 inline mr-1" />
                                Archive Date Range
                            </label>
                            <div className="space-y-2">
                                <input
                                    type="date"
                                    value={filters.dateRange?.from || ''}
                                    onChange={(e) => updateFilters({
                                        dateRange: { ...filters.dateRange, from: e.target.value, to: filters.dateRange?.to || '' }
                                    })}
                                    className={`w-full text-sm border rounded-md px-3 py-2 ${isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                    placeholder="From date"
                                />
                                <input
                                    type="date"
                                    value={filters.dateRange?.to || ''}
                                    onChange={(e) => updateFilters({
                                        dateRange: { ...filters.dateRange, from: filters.dateRange?.from || '', to: e.target.value }
                                    })}
                                    className={`w-full text-sm border rounded-md px-3 py-2 ${isDarkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                        }`}
                                    placeholder="To date"
                                />
                            </div>
                        </div>

                        {/* Archived By Filter */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <UserIcon className="h-4 w-4 inline mr-1" />
                                Archived By
                            </label>
                            <select
                                value={filters.archivedBy || ''}
                                onChange={(e) => updateFilters({ archivedBy: e.target.value || undefined })}
                                className={`w-full text-sm border rounded-md px-3 py-2 ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                            >
                                <option value="">All users</option>
                                {archivedUsers.map((user) => (
                                    <option key={user.id} value={user.email}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* File Type Filter */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <DocumentIcon className="h-4 w-4 inline mr-1" />
                                File Type
                            </label>
                            <select
                                value={filters.fileType || ''}
                                onChange={(e) => updateFilters({ fileType: e.target.value || undefined })}
                                className={`w-full text-sm border rounded-md px-3 py-2 ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                            >
                                <option value="">All types</option>
                                <option value="folder">Folders</option>
                                {fileTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type.toUpperCase()} files
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}