import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { AlertTriangle, CheckCircle, Upload, X } from 'lucide-react';
import { useStorageQuota } from '../../hooks/useStorageQuota';
import { useAuth } from '../../services/auth';
import { UploadCapacityCheck } from '../../types';

interface UploadValidationProps {
  files: File[];
  onValidationComplete: (canUpload: boolean, validationResult?: UploadCapacityCheck) => void;
  onCancel?: () => void;
  className?: string;
}

export const UploadValidation: React.FC<UploadValidationProps> = ({
  files,
  onValidationComplete,
  onCancel,
  className,
}) => {
  const { authenticated } = useAuth();
  const { checkCanUpload, formatBytes } = useStorageQuota();
  const [validationResult, setValidationResult] = useState<UploadCapacityCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateUpload = async () => {
      if (!authenticated) {
        setError('Authentication required');
        onValidationComplete(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const fileSizes = files.map(file => file.size);
        const result = await checkCanUpload(fileSizes);
        
        setValidationResult(result);
        onValidationComplete(result.can_upload, result);
      } catch (err: any) {
        console.error('Upload validation error:', err);
        if (err?.message?.includes('Authentication required')) {
          setError('Authentication required');
        } else {
          setError('Failed to validate upload capacity');
        }
        onValidationComplete(false);
      } finally {
        setLoading(false);
      }
    };

    if (files.length > 0) {
      validateUpload();
    }
  }, [files, authenticated, checkCanUpload, onValidationComplete]);

  if (loading) {
    return (
      <Alert className={className}>
        <Upload className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Validating upload capacity...</span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>{error}</span>
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!validationResult) {
    return null;
  }

  const totalFiles = files.length;
  const totalSize = validationResult.total_file_size;
  const canUpload = validationResult.can_upload;

  return (
    <div className={className}>
      {/* Upload Summary */}
      <Alert variant={canUpload ? "default" : "destructive"}>
        <div className="flex items-start space-x-2">
          {canUpload ? (
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
          )}
          <div className="flex-1 space-y-2">
            <div className="font-medium">
              {canUpload ? 'Upload Ready' : 'Upload Not Possible'}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalFiles} file{totalFiles !== 1 ? 's' : ''} • {formatBytes(totalSize)}
            </div>
            
            {/* Storage Usage After Upload */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>After upload:</span>
                <span>
                  {formatBytes(validationResult.storage_used + totalSize)} / {formatBytes(validationResult.storage_quota)}
                </span>
              </div>
              <Progress 
                value={((validationResult.storage_used + totalSize) / validationResult.storage_quota) * 100} 
                className="h-2"
              />
            </div>

            {!canUpload && (
              <div className="text-sm text-red-600 dark:text-red-400">
                <p>Insufficient storage space.</p>
                <p>
                  Available: {formatBytes(validationResult.remaining_storage)} • 
                  Required: {formatBytes(totalSize)}
                </p>
              </div>
            )}
          </div>
        </div>
      </Alert>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-sm font-medium text-muted-foreground">Files to upload:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded">
                <span className="truncate flex-1 mr-2">{file.name}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadValidation;