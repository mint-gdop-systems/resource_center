/**
 * GroupSharingModal Component
 * Modal for sharing files/folders with groups
 */

import React, { useState, useEffect } from 'react';
import { X, Users, FileText, Folder, Share2, Check } from 'lucide-react';
import { shareWithGroups, getUserGroupContext } from '../../services/groupApi';
import type { Group, UserGroupContext, FileItem } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';

interface GroupSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: FileItem[];
  selectedFolders: FileItem[];
  onSuccess?: () => void;
}

export const GroupSharingModal: React.FC<GroupSharingModalProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  selectedFolders,
  onSuccess,
}) => {
  const [userContext, setUserContext] = useState<UserGroupContext | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [canDownload, setCanDownload] = useState(true);
  const [canReshare, setCanReshare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadUserContext();
    }
  }, [isOpen]);

  const loadUserContext = async () => {
    try {
      const context = await getUserGroupContext();
      setUserContext(context);
    } catch (err) {
      console.error('Error loading user context:', err);
      toast({
        title: 'Error',
        description: 'Failed to load your groups.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (selectedGroups.length === 0) {
      toast({
        title: 'No groups selected',
        description: 'Please select at least one group to share with.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const shareData = {
        file_ids: selectedFiles.map(f => f.id),
        folder_ids: selectedFolders.map(f => f.id),
        group_ids: selectedGroups,
        message,
        can_download: canDownload,
        can_reshare: canReshare,
      };

      const result = await shareWithGroups(shareData);
      
      toast({
        title: 'Successfully shared!',
        description: `Shared ${result.shared_items.files.length + result.shared_items.folders.length} item(s) with ${result.shared_with_groups.length} group(s).`,
      });
      
      onSuccess?.();
      onClose();
      
      // Reset form
      setSelectedGroups([]);
      setMessage('');
      setCanDownload(true);
      setCanReshare(false);
      
    } catch (err) {
      console.error('Error sharing with groups:', err);
      toast({
        title: 'Sharing failed',
        description: 'Failed to share items with groups. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const filteredGroups = userContext?.member_groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalItems = selectedFiles.length + selectedFolders.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share with Groups</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Selected Items Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">
              Sharing {totalItems} item{totalItems !== 1 ? 's' : ''}
            </h3>
            
            <div className="space-y-2">
              {selectedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">{file.name}</span>
                </div>
              ))}
              
              {selectedFolders.map((folder) => (
                <div key={folder.id} className="flex items-center space-x-2 text-sm">
                  <Folder className="h-4 w-4 text-yellow-600" />
                  <span className="text-gray-700">{folder.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Group Selection */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Select Groups</h3>
              <Input
                placeholder="Search your groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-3"
              />
            </div>

            {filteredGroups.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedGroups.includes(group.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleGroupToggle(group.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                      />
                      
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {group.member_count} members
                      </Badge>
                      
                      {group.user_role === 'admin' && (
                        <Badge variant="default" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No groups found' : 'No groups available'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? 'Try adjusting your search criteria.'
                    : 'You need to be a member of at least one group to share resources.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Message (optional)
            </label>
            <Textarea
              placeholder="Add a message about what you're sharing..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Permissions</h3>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-download"
                  checked={canDownload}
                  onCheckedChange={setCanDownload}
                />
                <label htmlFor="can-download" className="text-sm text-gray-700">
                  Allow group members to download these items
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can-reshare"
                  checked={canReshare}
                  onCheckedChange={setCanReshare}
                />
                <label htmlFor="can-reshare" className="text-sm text-gray-700">
                  Allow group members to reshare these items
                </label>
              </div>
            </div>
          </div>

          {/* Selected Groups Summary */}
          {selectedGroups.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                Sharing with {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''}:
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedGroups.map((groupId) => {
                  const group = filteredGroups.find(g => g.id === groupId);
                  return group ? (
                    <Badge key={groupId} variant="default" className="text-xs">
                      {group.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={loading || selectedGroups.length === 0}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Share with Groups
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};