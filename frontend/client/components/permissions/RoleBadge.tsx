/**
 * RoleBadge Component
 * Displays user role with appropriate styling and icons
 */

import React from 'react';
import { Crown, Shield, Users, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useTheme } from '../../contexts/ThemeContext';

interface RoleBadgeProps {
  role: 'system_admin' | 'group_admin' | 'group_member' | 'regular_user' | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const ROLE_CONFIG = {
  system_admin: {
    label: 'System Admin',
    icon: Crown,
    variant: 'default' as const,
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    darkClassName: 'bg-purple-900/20 text-purple-300 border-purple-800',
  },
  group_admin: {
    label: 'Group Admin',
    icon: Shield,
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    darkClassName: 'bg-blue-900/20 text-blue-300 border-blue-800',
  },
  group_member: {
    label: 'Member',
    icon: Users,
    variant: 'outline' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
    darkClassName: 'bg-green-900/20 text-green-300 border-green-800',
  },
  regular_user: {
    label: 'User',
    icon: User,
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    darkClassName: 'bg-gray-800 text-gray-300 border-gray-700',
  },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';
  
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.regular_user;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  const badgeClassName = `
    ${sizeClasses[size]}
    ${isDarkMode ? config.darkClassName : config.className}
    ${className}
  `;
  
  return (
    <Badge variant={config.variant} className={badgeClassName}>
      {showIcon && (
        <Icon className={`${iconSizes[size]} mr-1`} />
      )}
      {config.label}
    </Badge>
  );
};

export default RoleBadge;