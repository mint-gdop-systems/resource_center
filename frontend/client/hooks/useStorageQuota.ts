import { useState, useEffect, useCallback } from 'react';
import { getStorageQuota, checkUploadCapacity, recalculateStorageUsage } from '../services/api';
import { StorageQuota, UploadCapacityCheck } from '../types';
import { useAuth } from '../services/auth';

interface UseStorageQuotaReturn {
    quota: StorageQuota | null;
    loading: boolean;
    error: string | null;
    refreshQuota: () => Promise<void>;
    checkCanUpload: (fileSizes: number[]) => Promise<UploadCapacityCheck>;
    recalculateUsage: () => Promise<void>;
    formatBytes: (bytes: number) => string;
    getUsageColor: (percentage: number) => string;
    getUsageStatus: (percentage: number) => 'normal' | 'warning' | 'danger';
}

export const useStorageQuota = (): UseStorageQuotaReturn => {
    const { authenticated } = useAuth();
    const [quota, setQuota] = useState<StorageQuota | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshQuota = useCallback(async () => {
        if (!authenticated) {
            setLoading(false);
            setError(null);
            setQuota(null);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await getStorageQuota();
            setQuota(data);
        } catch (err: any) {
            console.error('Error fetching storage quota:', err);
            console.log('Auth status:', authenticated);
            console.log('Error details:', err?.response?.status, err?.response?.data);
            // Handle authentication errors gracefully
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                setError('Authentication required');
            } else {
                setError('Failed to load storage information');
            }
        } finally {
            setLoading(false);
        }
    }, [authenticated]);

    const checkCanUpload = useCallback(async (fileSizes: number[]): Promise<UploadCapacityCheck> => {
        if (!authenticated) {
            throw new Error('Authentication required');
        }

        try {
            const result = await checkUploadCapacity(fileSizes);
            return result;
        } catch (err: any) {
            console.error('Error checking upload capacity:', err);
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                throw new Error('Authentication required');
            }
            throw new Error('Failed to check upload capacity');
        }
    }, [authenticated]);

    const recalculateUsage = useCallback(async () => {
        if (!authenticated) {
            throw new Error('Authentication required');
        }

        try {
            await recalculateStorageUsage();
            await refreshQuota(); // Refresh quota after recalculation
        } catch (err: any) {
            console.error('Error recalculating storage usage:', err);
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                throw new Error('Authentication required');
            }
            throw new Error('Failed to recalculate storage usage');
        }
    }, [authenticated, refreshQuota]);

    const formatBytes = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }, []);

    const getUsageColor = useCallback((percentage: number): string => {
        if (percentage >= 95) return 'rgb(239, 68, 68)'; // red-500
        if (percentage >= 80) return 'rgb(245, 158, 11)'; // amber-500
        if (percentage >= 60) return 'rgb(59, 130, 246)'; // blue-500
        return 'rgb(34, 197, 94)'; // green-500
    }, []);

    const getUsageStatus = useCallback((percentage: number): 'normal' | 'warning' | 'danger' => {
        if (percentage >= 95) return 'danger';
        if (percentage >= 80) return 'warning';
        return 'normal';
    }, []);

    useEffect(() => {
        refreshQuota();
        
        // Listen for storage update events
        const handleStorageUpdate = () => {
            refreshQuota();
        };

        // Listen for various file operations that affect storage
        window.addEventListener('storage:refresh', handleStorageUpdate);
        window.addEventListener('files:uploaded', handleStorageUpdate);
        window.addEventListener('files:deleted', handleStorageUpdate);
        window.addEventListener('files:modified', handleStorageUpdate);
        
        return () => {
            window.removeEventListener('storage:refresh', handleStorageUpdate);
            window.removeEventListener('files:uploaded', handleStorageUpdate);
            window.removeEventListener('files:deleted', handleStorageUpdate);
            window.removeEventListener('files:modified', handleStorageUpdate);
        };
    }, [refreshQuota]);

    return {
        quota,
        loading,
        error,
        refreshQuota,
        checkCanUpload,
        recalculateUsage,
        formatBytes,
        getUsageColor,
        getUsageStatus,
    };
};

export default useStorageQuota;