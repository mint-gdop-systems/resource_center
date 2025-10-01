/**
 * GroupActivity Component
 * Shows recent activity for a specific group
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Share2, FileText, Folder, UserPlus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { getGroupSharedWithMe } from '../../services/groupApi';
import type { GroupSharing } from '../../types';

interface GroupActivityProps {
  groupId: string;
}

export const GroupActivity: React.FC<GroupActivityProps> = ({ groupId }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  useEffect(() => {
    loadActivity();
  }, [groupId]);

  const loadActivity = async () => {
    try {
      const response = await getGroupSharedWithMe();
      const groupShares = response.group_shares.filter((share: GroupSharing) => share.group.id === groupId);
      
      // Convert shares to activity format
      const shareActivities = groupShares.map((share: GroupSharing) => ({
        id: share.id,
        type: 'share',
        user: share.shared_by,
        action: `shared ${share.share_type.toLowerCase()}`,
        target: share.item_name,
        timestamp: share.shared_at,
        icon: share.share_type === 'FILE' ? FileText : Folder
      }));
      
      setActivities(shareActivities.slice(0, 10)); // Show last 10 activities
    } catch (err) {
      console.error('Error loading activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          No Recent Activity
        </h3>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          No recent activity in this group.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Recent Activity
      </h3>
      
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className={`p-2 rounded-full ${
                activity.type === 'share' 
                  ? isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100'
                  : isDarkMode ? 'bg-green-900/20' : 'bg-green-100'
              }`}>
                <Icon className={`h-4 w-4 ${
                  activity.type === 'share' ? 'text-blue-600' : 'text-green-600'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {activity.user.first_name?.[0] || activity.user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`font-medium text-sm ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {activity.user.first_name && activity.user.last_name
                      ? `${activity.user.first_name} ${activity.user.last_name}`
                      : activity.user.username
                    }
                  </span>
                  <span className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {activity.action}
                  </span>
                  <span className={`font-medium text-sm ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {activity.target}
                  </span>
                </div>
                
                <p className={`text-xs mt-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {formatTime(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};