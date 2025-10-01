/**
 * GroupDetails Component
 * Displays detailed information about a group including members and shared resources
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Calendar,
  Share2,
  FileText,
  Folder,
  ArrowLeft,
  MoreVertical
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  getGroupDetails, 
  getGroupMembers, 
  getGroupStatistics,
  addGroupMember,
  removeGroupMember,
  assignGroupAdmin
} from '../../services/groupApi';
import { PermissionGate } from '../permissions/PermissionGate';
import { RoleBadge } from '../permissions/RoleBadge';
import { useGroupPermissions } from '../../hooks/usePermissions';
import type { Group, GroupMembership, UserGroupContext } from '../../types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useToast } from '../../hooks/use-toast';
import { AddMemberModal } from './AddMemberModal';
import { GroupSharedResources } from './GroupSharedResources';
import { GroupActivity } from './GroupActivity';

interface GroupDetailsProps {
  groupId: string;
  onBack?: () => void;
  onEdit?: (group: Group) => void;
}

export const GroupDetails: React.FC<GroupDetailsProps> = ({
  groupId,
  onBack,
  onEdit,
}) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMembership[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Use modern permission system
  const {
    userContext,
    canManage,
    canAddMembers,
    canRemoveMembers,
    canPromoteMembers,
    userRoleInGroup,
    loading: permissionsLoading
  } = useGroupPermissions(groupId);

  const { toast } = useToast();
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const [detailsResponse, membersResponse, statsResponse] = await Promise.all([
        getGroupDetails(groupId),
        getGroupMembers(groupId),
        getGroupStatistics(groupId),
      ]);
      
      setGroup(detailsResponse.group);
      setMembers(membersResponse.memberships);
      setStatistics(statsResponse.statistics);
    } catch (err) {
      setError('Failed to load group details');
      console.error('Error loading group details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeGroupMember(groupId, userId);
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the group.',
      });
      loadGroupData(); // Reload data
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove member from group.',
        variant: 'destructive',
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      await assignGroupAdmin(groupId, userId);
      toast({
        title: 'Member promoted',
        description: 'The member has been promoted to group admin.',
      });
      loadGroupData(); // Reload data
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to promote member to admin.',
        variant: 'destructive',
      });
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error || 'Group not found'}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Button>
      </div>
    );
  }

  const admins = members.filter(m => m.role === 'ADMIN');
  const regularMembers = members.filter(m => m.role === 'MEMBER');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div>
            <div className="flex items-center space-x-3">
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{group.name}</h1>
              <Badge variant={group.is_active ? 'default' : 'secondary'}>
                {group.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            {group.description && (
              <p className={`mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{group.description}</p>
            )}
          </div>
        </div>

        <PermissionGate 
          action="groups.update" 
          context={{ group_id: groupId }}
        >
          <Button onClick={() => onEdit?.(group)}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Group
          </Button>
        </PermissionGate>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Members</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {statistics.members.total}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {statistics.members.admins} admins, {statistics.members.regular_members} members
            </p>
          </div>

          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              <Share2 className="h-5 w-5 text-green-600" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Shared Items</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {statistics.shared_resources.total_items}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {statistics.shared_resources.total_files} files, {statistics.shared_resources.total_folders} folders
            </p>
          </div>

          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Recent Activity</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {statistics.activity.recent_shares_30d}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              New shares in last 30 days
            </p>
          </div>

          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-orange-600" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>New Members</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {statistics.members.recent_additions}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Added in last 30 days
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="shared">Shared Resources</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Group Members</h3>
            <PermissionGate 
              action="group_members.add" 
              context={{ group_id: groupId }}
            >
              <Button size="sm" onClick={() => setShowAddMemberModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </PermissionGate>
          </div>

          {/* Admins Section */}
          {admins.length > 0 && (
            <div className="space-y-3">
              <h4 className={`font-medium flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                Administrators ({admins.length})
              </h4>
              
              <div className="space-y-2">
                {admins.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isDarkMode 
                        ? 'bg-yellow-900/20 border border-yellow-800/50' 
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.avatar} />
                        <AvatarFallback>
                          {member.user.first_name?.[0] || member.user.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user.first_name && member.user.last_name
                            ? `${member.user.first_name} ${member.user.last_name}`
                            : member.user.username
                          }
                        </p>
                        <p className="text-sm text-gray-600">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RoleBadge role="group_admin" size="sm" />
                      
                      <PermissionGate 
                        action="group_members.remove" 
                        context={{ group_id: groupId, target_user_id: member.user.id }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setRemovingMember(member.user.id)}
                              className="text-red-600"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Members Section */}
          {regularMembers.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-500" />
                Members ({regularMembers.length})
              </h4>
              
              <div className="space-y-2">
                {regularMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.avatar} />
                        <AvatarFallback>
                          {member.user.first_name?.[0] || member.user.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user.first_name && member.user.last_name
                            ? `${member.user.first_name} ${member.user.last_name}`
                            : member.user.username
                          }
                        </p>
                        <p className="text-sm text-gray-600">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RoleBadge role="group_member" size="sm" />
                      
                      <PermissionGate 
                        action="group_members.remove" 
                        context={{ group_id: groupId, target_user_id: member.user.id }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <PermissionGate 
                              action="group_members.promote" 
                              context={{ group_id: groupId, target_user_id: member.user.id }}
                            >
                              <DropdownMenuItem
                                onClick={() => handlePromoteToAdmin(member.user.id)}
                              >
                                <Crown className="h-4 w-4 mr-2" />
                                Promote to Admin
                              </DropdownMenuItem>
                            </PermissionGate>
                            <DropdownMenuItem
                              onClick={() => setRemovingMember(member.user.id)}
                              className="text-red-600"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </PermissionGate>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {members.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
              <p className="text-gray-600 mb-4">
                This group doesn't have any members yet.
              </p>
              <PermissionGate 
                action="group_members.add" 
                context={{ group_id: groupId }}
              >
                <Button onClick={() => setShowAddMemberModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              </PermissionGate>
            </div>
          )}
        </TabsContent>

        {/* Shared Resources Tab */}
        <TabsContent value="shared">
          <GroupSharedResources groupId={groupId} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <GroupActivity groupId={groupId} />
        </TabsContent>
      </Tabs>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group? 
              They will lose access to all resources shared with this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingMember && handleRemoveMember(removingMember)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Member Modal */}
      {group && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          group={group}
          onMemberAdded={loadGroupData}
        />
      )}
    </div>
  );
};