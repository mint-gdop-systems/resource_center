/**
 * PermissionGate Component
 * Conditionally renders content based on user permissions
 */

import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionContext } from '../../types';

interface PermissionGateProps {
  children: React.ReactNode;
  action: string;
  context?: PermissionContext;
  fallback?: React.ReactNode;
  showReason?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  action,
  context,
  fallback = null,
  showReason = false,
}) => {
  const { checkPermission } = usePermissions();
  
  const permissionCheck = checkPermission(action, context);
  
  if (permissionCheck.allowed) {
    return <>{children}</>;
  }
  
  if (showReason && permissionCheck.reason) {
    return (
      <div className="text-sm text-gray-500 italic">
        {permissionCheck.reason}
      </div>
    );
  }
  
  return <>{fallback}</>;
};

// Convenience components for common permission checks
export const RequireSystemAdmin: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => (
  <PermissionGate action="groups.create" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const RequireGroupAdmin: React.FC<{ 
  children: React.ReactNode; 
  groupId: string;
  fallback?: React.ReactNode;
}> = ({ children, groupId, fallback = null }) => (
  <PermissionGate 
    action="groups.update" 
    context={{ group_id: groupId }}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export const RequireGroupMember: React.FC<{ 
  children: React.ReactNode; 
  groupId: string;
  fallback?: React.ReactNode;
}> = ({ children, groupId, fallback = null }) => (
  <PermissionGate 
    action="groups.read" 
    context={{ group_id: groupId }}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
);

export default PermissionGate;