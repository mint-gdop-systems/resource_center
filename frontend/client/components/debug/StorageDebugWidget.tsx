import React, { useState, useEffect } from 'react';
import { useStorageQuota } from '../../hooks/useStorageQuota';

/**
 * Debug widget to test storage quota real-time updates
 * This component shows storage information and logs when it updates
 */
export const StorageDebugWidget: React.FC = () => {
  const { quota, loading, error, refreshQuota, formatBytes } = useStorageQuota();
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);

  // Log storage updates
  useEffect(() => {
    if (quota && !loading) {
      setUpdateCount(prev => prev + 1);
      setLastUpdate(new Date());
      
      const logEntry = `${new Date().toLocaleTimeString()}: Storage updated - ${formatBytes(quota.used_bytes)} / ${formatBytes(quota.total_bytes)} (${quota.usage_percentage.toFixed(1)}%)`;
      setEventLog(prev => [logEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
    }
  }, [quota, loading, formatBytes]);

  // Listen for storage events and log them
  useEffect(() => {
    const logEvent = (eventType: string) => {
      const logEntry = `${new Date().toLocaleTimeString()}: Event received - ${eventType}`;
      setEventLog(prev => [logEntry, ...prev.slice(0, 9)]);
    };

    const handleStorageRefresh = () => logEvent('storage:refresh');
    const handleFilesUploaded = () => logEvent('files:uploaded');
    const handleFilesDeleted = () => logEvent('files:deleted');
    const handleFilesModified = () => logEvent('files:modified');

    window.addEventListener('storage:refresh', handleStorageRefresh);
    window.addEventListener('files:uploaded', handleFilesUploaded);
    window.addEventListener('files:deleted', handleFilesDeleted);
    window.addEventListener('files:modified', handleFilesModified);

    return () => {
      window.removeEventListener('storage:refresh', handleStorageRefresh);
      window.removeEventListener('files:uploaded', handleFilesUploaded);
      window.removeEventListener('files:deleted', handleFilesDeleted);
      window.removeEventListener('files:modified', handleFilesModified);
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Storage Debug</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-red-200 rounded-lg shadow-lg p-4 w-80">
        <h3 className="text-sm font-semibold text-red-900 mb-2">Storage Debug</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Storage Debug</h3>
        <button
          onClick={refreshQuota}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>
      
      {quota && (
        <div className="space-y-2 mb-4">
          <div className="text-xs">
            <span className="font-medium">Usage:</span> {formatBytes(quota.used_bytes)} / {formatBytes(quota.total_bytes)}
          </div>
          <div className="text-xs">
            <span className="font-medium">Percentage:</span> {quota.usage_percentage.toFixed(1)}%
          </div>
          <div className="text-xs">
            <span className="font-medium">Updates:</span> {updateCount}
          </div>
          {lastUpdate && (
            <div className="text-xs">
              <span className="font-medium">Last Update:</span> {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Event Log:</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {eventLog.length === 0 ? (
            <p className="text-xs text-gray-500">No events yet...</p>
          ) : (
            eventLog.map((entry, index) => (
              <div key={index} className="text-xs text-gray-600 font-mono">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Upload, delete, or move files to test real-time updates
        </p>
      </div>
    </div>
  );
};

export default StorageDebugWidget;