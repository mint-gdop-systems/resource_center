/**
 * Groups Page
 * Main page for group management and group-shared resources
 */

import React, { useState } from 'react';
import { Users, Share2, Settings } from 'lucide-react';
import { GroupList } from '../components/groups/GroupList';
import { GroupDetails } from '../components/groups/GroupDetails';
import { GroupSharedResources } from '../components/groups/GroupSharedResources';
import { EditGroupModal } from '../components/groups/EditGroupModal';
import type { Group } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useTheme } from '../contexts/ThemeContext';

export const Groups: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'shared' | 'manage'>('browse');
  const [refreshKey, setRefreshKey] = useState(0);
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setActiveTab('manage');
  };

  const handleBackToList = () => {
    setSelectedGroup(null);
    setActiveTab('browse');
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
  };

  const handleGroupUpdated = (updatedGroup: Group) => {
    // Update the selected group if it's the one being edited
    if (selectedGroup && selectedGroup.id === updatedGroup.id) {
      setSelectedGroup(updatedGroup);
    }
    // Close the edit modal
    setEditingGroup(null);
    // Refresh the group list by incrementing the key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedGroup ? (
          // Group Details View
          <GroupDetails
            key={`details-${selectedGroup.id}-${refreshKey}`}
            groupId={selectedGroup.id}
            onBack={handleBackToList}
            onEdit={handleEditGroup}
          />
        ) : (
          // Main Groups Interface
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <div className="mb-8">
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Groups</h1>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Manage your groups and access shared resources
              </p>
              
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="browse" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Browse Groups</span>
                </TabsTrigger>
                <TabsTrigger value="shared" className="flex items-center space-x-2">
                  <Share2 className="h-4 w-4" />
                  <span>Shared with Me</span>
                </TabsTrigger>
                <TabsTrigger value="manage" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>My Groups</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="browse" className="space-y-6">
              <GroupList
                key={`browse-${refreshKey}`}
                onGroupSelect={handleGroupSelect}
                onGroupManage={handleGroupSelect}
                showActions={true}
              />
            </TabsContent>

            <TabsContent value="shared" className="space-y-6">
              <GroupSharedResources />
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              <GroupList
                key={`manage-${refreshKey}`}
                onGroupSelect={handleGroupSelect}
                onGroupManage={handleGroupSelect}
                showActions={true}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Edit Group Modal */}
        {editingGroup && (
          <EditGroupModal
            isOpen={!!editingGroup}
            onClose={() => setEditingGroup(null)}
            group={editingGroup}
            onGroupUpdated={handleGroupUpdated}
          />
        )}
      </div>
    </div>
  );
};