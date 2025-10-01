/**
 * AddMemberModal Component
 * Modern, professional modal for adding new members to a group
 * Features: User search, role selection, permission validation, bulk add support
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, X, Search, Check, AlertCircle, Users, Crown, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { PermissionGate } from '../permissions/PermissionGate';
import { RoleBadge } from '../permissions/RoleBadge';
import { addGroupMember, searchUsers, getAvailableRoles } from '../../services/groupApi';
import type { Group } from '../../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onMemberAdded?: () => void;
}

interface UserSearchResult {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  full_display: string;
}

interface AvailableRole {
  value: string;
  label: string;
  description: string;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  group,
  onMemberAdded,
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('MEMBER');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Refs and hooks
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  // Load available roles when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableRoles();
      resetForm();
    }
  }, [isOpen]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAvailableRoles = async () => {
    try {
      const rolesData = await getAvailableRoles(group.id);
      setAvailableRoles(rolesData.available_roles);
      // Set default role to the first available role
      if (rolesData.available_roles.length > 0) {
        setSelectedRole(rolesData.available_roles[0].value);
      }
    } catch (error) {
      console.error('Error loading available roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available roles',
        variant: 'destructive',
      });
    }
  };

  const performSearch = async () => {
    if (searching) return;

    setSearching(true);
    setError(null);

    try {
      const results = await searchUsers(searchQuery, group.id, 10);
      setSearchResults(results.users);
      setShowDropdown(results.users.length > 0);
    } catch (error: any) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    // Check if user is already selected
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  const handleUserRemove = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select at least one user to add to the group.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = [];
      const errors = [];

      // Add users one by one (could be optimized with bulk endpoint)
      for (const user of selectedUsers) {
        try {
          const result = await addGroupMember(group.id, {
            user_id: user.id.toString(),
            role: selectedRole,
            message: welcomeMessage.trim() || undefined
          });
          results.push({ user, result });
        } catch (error: any) {
          console.error(`Error adding user ${user.display_name}:`, error);
          errors.push({
            user,
            error: error?.response?.data?.error || error?.response?.data?.detail || 'Unknown error'
          });
        }
      }

      // Show success/error feedback
      if (results.length > 0) {
        const successNames = results.map(r => r.user.display_name).join(', ');
        toast({
          title: 'Members added successfully',
          description: `${successNames} ${results.length === 1 ? 'has' : 'have'} been added to ${group.name}.`,
        });
      }

      if (errors.length > 0) {
        const errorNames = errors.map(e => e.user.display_name).join(', ');
        toast({
          title: 'Some members could not be added',
          description: `Failed to add: ${errorNames}`,
          variant: 'destructive',
        });
      }

      // If any users were added successfully, refresh and close
      if (results.length > 0) {
        onMemberAdded?.();
        handleClose();
      }

    } catch (error: any) {
      console.error('Error in bulk add:', error);
      setError('Failed to add members to group');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setSelectedRole('MEMBER');
    setWelcomeMessage('');
    setError(null);
    setShowDropdown(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case 'ADMIN':
        return <Shield className="h-3 w-3" />;
      case 'MEMBER':
        return <Users className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <span>Add Members to {group.name}</span>
          </DialogTitle>
          <DialogDescription>
            Search and select users to add to this group. You can add multiple users at once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Search Section */}
          <div className="space-y-3">
            <Label htmlFor="userSearch" className="text-sm font-medium">
              Search Users
            </Label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  id="userSearch"
                  type="text"
                  placeholder="Search by name, username, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  disabled={loading}
                  className="pl-10"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto ${isDarkMode ? 'bg-gray-800 border-gray-600' : ''}`}>
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ${isDarkMode ? 'bg-blue-900' : ''}`}>
                          <span className="text-sm font-medium text-blue-600">
                            {user.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {user.display_name}
                          </p>
                          <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Type at least 2 characters to search. Users already in the group are excluded.
            </p>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Selected Users ({selectedUsers.length})
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full bg-green-100 flex items-center justify-center ${isDarkMode ? 'bg-green-900' : ''}`}>
                        <span className="text-sm font-medium text-green-600">
                          {user.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {user.display_name}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserRemove(user.id)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Role Selection */}
          <div className="space-y-3">
            <Label htmlFor="role" className="text-sm font-medium">
              Assign Role
            </Label>
            <Select value={selectedRole} onValueChange={(value: 'ADMIN' | 'MEMBER') => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(role.value)}
                      <span>{role.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableRoles.find(r => r.value === selectedRole) && (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {availableRoles.find(r => r.value === selectedRole)?.description}
              </p>
            )}
          </div>

          {/* Welcome Message */}
          <div className="space-y-3">
            <Label htmlFor="welcomeMessage" className="text-sm font-medium">
              Welcome Message (Optional)
            </Label>
            <Textarea
              id="welcomeMessage"
              placeholder="Add a welcome note for the new members..."
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              disabled={loading}
              rows={3}
              maxLength={500}
            />
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              This message will be included when notifying users about their group membership.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <DialogFooter className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <PermissionGate
              action="group_members.add"
              context={{ group_id: group.id }}
            >
              <Button
                type="submit"
                disabled={loading || selectedUsers.length === 0}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add {selectedUsers.length > 0 ? `${selectedUsers.length} ` : ''}Member{selectedUsers.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};