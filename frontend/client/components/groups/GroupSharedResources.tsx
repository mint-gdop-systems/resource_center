/**
 * GroupSharedResources Component
 * Displays resources shared with the user through group memberships
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Folder,
  Download,
  Share2,
  Calendar,
  User,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { getGroupSharedWithMe } from '../../services/groupApi';
import { downloadFile, viewFile, api } from '../../services/api';
import type { GroupSharing } from '../../types';
import { Button } from '../ui/button';
import { useTheme } from '../../contexts/ThemeContext';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { useToast } from '../../hooks/use-toast';
import { usePagination } from '../../hooks/usePagination';
import PaginationComponent from '../ui/PaginationComponent';

interface GroupSharedResourcesProps {
  groupId?: string; // Optional: if provided, filter by this group only
}

export const GroupSharedResources: React.FC<GroupSharedResourcesProps> = ({ groupId }) => {
  const [shares, setShares] = useState<GroupSharing[]>([]);
  const [filteredShares, setFilteredShares] = useState<GroupSharing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'files' | 'folders'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [userGroups, setUserGroups] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  // Pagination
  const pagination = usePagination({
    totalItems: filteredShares.length,
    itemsPerPage: 10
  });

  const paginatedShares = pagination.getPageItems(filteredShares);

  useEffect(() => {
    loadSharedResources();
    
    // Listen for refresh events
    const handleRefresh = () => {
      console.log('GroupSharedResources: Refreshing due to event');
      loadSharedResources();
    };
    
    window.addEventListener('notifications:refresh', handleRefresh);
    window.addEventListener('files:refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('notifications:refresh', handleRefresh);
      window.removeEventListener('files:refresh', handleRefresh);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [shares, searchQuery, filterBy, groupFilter, groupId]);

  const loadSharedResources = async () => {
    try {
      setLoading(true);
      console.log('GroupSharedResources: Loading shared resources...');
      const response = await getGroupSharedWithMe();
      console.log('GroupSharedResources: API response:', response);
      setShares(response.group_shares);
      setUserGroups(response.user_groups);
      console.log('GroupSharedResources: Set shares:', response.group_shares.length);
    } catch (err) {
      setError('Failed to load shared resources');
      console.error('Error loading shared resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...shares];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(share =>
        share.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        share.group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        share.shared_by.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(share =>
        filterBy === 'files' ? share.share_type === 'FILE' : share.share_type === 'FOLDER'
      );
    }

    // Group filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter(share => share.group.id === groupFilter);
    }
    
    // Specific group filter (when used as tab in group details)
    if (groupId) {
      filtered = filtered.filter(share => share.group.id === groupId);
    }

    setFilteredShares(filtered);
  };

  const handleDownload = async (share: GroupSharing) => {
    if (!share.can_download) {
      toast({
        title: 'Download not allowed',
        description: 'You do not have permission to download this item.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (share.file) {
        await downloadFile(share.file.id, share.file.name);
        toast({
          title: 'Download started',
          description: `Downloading ${share.file.name}`,
        });
      } else if (share.folder) {
        // Use the existing bulk download API for folders
        const response = await api.post('/bulk-download/', {
          folder_ids: [share.folder.id]
        }, {
          responseType: 'blob',
        });

        // Create blob and download link
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${share.folder.name}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: 'Download started',
          description: `Downloading ${share.folder.name} as ZIP file`,
        });
      }
    } catch (err) {
      toast({
        title: 'Download failed',
        description: 'Failed to download the item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleView = async (share: GroupSharing) => {
    try {
      if (share.file) {
        const url = await viewFile(share.file.id);
        window.open(url, '_blank');
      }
      // Note: Folders don't have view functionality - only download
    } catch (err) {
      toast({
        title: 'View failed',
        description: 'Failed to view the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReshare = (share: GroupSharing) => {
    // Create file/folder objects in the format expected by ShareModal
    const files = share.share_type === 'FILE' && share.file ? [{
      id: share.file.id,
      name: share.file.name,
      file_type: share.file.file_type || '',
      file_size: share.file.file_size || 0,
      uploaded_at: share.file.uploaded_at || '',
      folder: share.file.folder,
      is_starred: share.file.is_starred || false,
      is_archived: share.file.is_archived || false,
      is_public: share.file.is_public || false,
      owner_email: share.file.owner_email || '',
      owner_first_name: share.file.owner_first_name || '',
      meta_tags: share.file.meta_tags || [],
      is_owner: false
    }] : [];
    
    const folders = share.share_type === 'FOLDER' && share.folder ? [{
      id: share.folder.id,
      name: share.folder.name,
      parent: share.folder.parent,
      created_at: share.folder.created_at || '',
      subfolders: share.folder.subfolders || [],
      files: share.folder.files || [],
      is_starred: share.folder.is_starred || false,
      owner_email: share.folder.owner_email || '',
      owner_first_name: share.folder.owner_first_name || ''
    }] : [];
    
    // Dispatch event to open existing share modal with proper data
    window.dispatchEvent(new CustomEvent('open-share-modal', {
      detail: {
        files,
        folders,
        isReshare: true,
        originalShare: share
      }
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadSharedResources} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Group Shared Resources</h2>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            Resources shared with you through your group memberships
          </p>
        </div>
        <Button onClick={loadSharedResources} variant="outline" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search resources, groups, or sharers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="files">Files</SelectItem>
            <SelectItem value="folders">Folders</SelectItem>
          </SelectContent>
        </Select>

        {!groupId && (
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {userGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Debug Info */}
      {!groupId && userGroups.length > 0 && (
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Your Groups ({userGroups.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {userGroups.map((group) => (
              <Badge key={group.id} variant="secondary" className="text-xs">
                {group.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Shares</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{filteredShares.length}</p>
        </div>

        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Files</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {filteredShares.filter(s => s.share_type === 'FILE').length}
          </p>
        </div>

        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <Folder className="h-5 w-5 text-yellow-600" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Folders</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {filteredShares.filter(s => s.share_type === 'FOLDER').length}
          </p>
        </div>
      </div>

      {/* Resources Table */}
      {filteredShares.length > 0 ? (
        <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Shared By</TableHead>
                <TableHead>Shared Date</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedShares.map((share) => (
                <TableRow key={share.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {share.share_type === 'FILE' ? (
                        <FileText className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Folder className="h-5 w-5 text-yellow-600" />
                      )}

                      <div>
                        <p className="font-medium text-gray-900">{share.item_name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Badge variant="outline" className="text-xs">
                            {share.item_type}
                          </Badge>
                          {share.file?.size && (
                            <span>{formatFileSize(share.file.size)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{share.group.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={share.shared_by.avatar} />
                        <AvatarFallback className="text-xs">
                          {share.shared_by.first_name?.[0] || share.shared_by.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-900">
                        {share.shared_by.first_name && share.shared_by.last_name
                          ? `${share.shared_by.first_name} ${share.shared_by.last_name}`
                          : share.shared_by.username
                        }
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(share.shared_at)}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex space-x-1">
                      {share.can_download && (
                        <Badge variant="secondary" className="text-xs">
                          Download
                        </Badge>
                      )}
                      {share.can_reshare && (
                        <Badge variant="secondary" className="text-xs">
                          Reshare
                        </Badge>
                      )}
                      {!share.can_download && !share.can_reshare && (
                        <Badge variant="outline" className="text-xs">
                          View Only
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Only show view button for files */}
                      {share.share_type === 'FILE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(share)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      {share.can_download && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(share)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}

                      {share.can_reshare && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReshare(share)}
                          title="Reshare this item"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Info and Controls */}
          {filteredShares.length > 0 && (
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Showing {pagination.startIndex + 1} to {Math.min(pagination.endIndex + 1, filteredShares.length)} of {filteredShares.length} items
                </div>
                {pagination.totalPages > 1 && (
                  <div className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Show:
                </span>
                <select
                  value={pagination.itemsPerPage}
                  onChange={(e) => pagination.setItemsPerPage(Number(e.target.value))}
                  className={`px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors ${isDarkMode
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
          )}
          
          {/* Pagination Component */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center py-4">
              <PaginationComponent
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                size="sm"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {searchQuery || filterBy !== 'all' || groupFilter !== 'all'
              ? 'No resources found'
              : 'No shared resources'
            }
          </h3>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            {searchQuery || filterBy !== 'all' || groupFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Resources shared with your groups will appear here.'
            }
          </p>
        </div>
      )}
    </div>
  );
};