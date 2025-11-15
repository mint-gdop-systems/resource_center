import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import OnlyOfficeEditor from './OnlyOfficeEditor';
import { api } from '../../services/api';
import { FileItem } from '../../types';
import toast from 'react-hot-toast';
import keycloak from '../../services/keycloak';

interface OnlyOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem;
}

/**
 * Modal component that displays ONLYOFFICE editor for supported file types
 */
export default function OnlyOfficeModal({
  isOpen,
  onClose,
  file,
}: OnlyOfficeModalProps) {
  const [config, setConfig] = useState<any>(null);
  const [documentServerUrl, setDocumentServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add debugging for component lifecycle
  console.log('=== ONLYOFFICE MODAL RENDER ===');
  console.log('isOpen:', isOpen);
  console.log('file:', file?.name, file?.id);
  console.log('config:', !!config);
  console.log('loading:', loading);
  console.log('error:', error);
  console.log('documentServerUrl:', documentServerUrl);

  useEffect(() => {
    console.log('=== ONLYOFFICE MODAL EFFECT ===');
    console.log('isOpen:', isOpen);
    console.log('file:', file?.name, file?.id);
    console.log('Current URL:', window.location.href);
    
    if (!isOpen || !file) {
      // Reset state when modal closes
      if (!isOpen) {
        console.log('Modal closing, resetting state');
        setConfig(null);
        setDocumentServerUrl('');
        setLoading(true);
        setError(null);
      }
      return;
    }

    // Fetch ONLYOFFICE configuration from backend
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching ONLYOFFICE config for file ${file.id}...`);
        console.log('Current Keycloak token present:', !!keycloak.token);
        console.log('Keycloak token (first 50 chars):', keycloak.token?.substring(0, 50));
        console.log('API base URL:', api.defaults.baseURL);
        console.log('Full request URL:', `${api.defaults.baseURL}/onlyoffice/config/${file.id}/`);
        
        const response = await api.get(`/onlyoffice/config/${file.id}/`);
        console.log('ONLYOFFICE Config Response status:', response.status);
        console.log('ONLYOFFICE Config Response headers:', response.headers);
        console.log('ONLYOFFICE Config Response data:', response.data);
        setDocumentServerUrl(response.data.documentServerUrl);
        const configData = response.data.config;
        console.log('ONLYOFFICE Config Data:', configData);
        console.log('JWT Token Present:', !!configData.token);
        setConfig(configData);
        setLoading(false);
      } catch (err: any) {
        console.error('ONLYOFFICE config fetch error:', err);
        console.error('Error response:', err.response);
        console.error('Error status:', err.response?.status);
        
        const errorMsg = err.response?.data?.error || err.message || 'Failed to load ONLYOFFICE configuration';
        setError(errorMsg);
        setLoading(false);
        
        // Don't show toast for 401 errors as they're handled by the interceptor
        if (err.response?.status !== 401) {
          toast.error(`Error: ${errorMsg}`);
        }
      }
    };

    fetchConfig();
  }, [isOpen, file]);

  // Add navigation listener to detect unexpected redirects
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log('=== NAVIGATION EVENT DETECTED ===');
      console.log('PopState event:', event);
      console.log('Current URL:', window.location.href);
      console.log('ONLYOFFICE modal open:', isOpen);
      console.log('File:', file?.name);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('=== BEFORE UNLOAD EVENT ===');
      console.log('ONLYOFFICE modal open:', isOpen);
      console.log('File:', file?.name);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, file]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('=== BACKDROP CLICK ===');
    console.log('Target:', e.target);
    console.log('Current target:', e.currentTarget);
    console.log('Should close:', e.target === e.currentTarget);
    
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      console.log('Closing modal via backdrop click');
      onClose();
    }
  };

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent clicks inside modal from propagating
    e.stopPropagation();
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ zIndex: 9999 }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col"
        onClick={handleModalClick}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {file.name}
            </h2>
            {loading && (
              <span className="text-sm text-gray-500">Loading editor...</span>
            )}
          </div>
          <button
            onClick={(e) => {
              console.log('=== CLOSE BUTTON CLICK ===');
              e.stopPropagation();
              console.log('Closing modal via close button');
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 relative overflow-hidden">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading ONLYOFFICE editor...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <p className="text-red-600 text-lg font-semibold mb-2">
                  Error Loading Editor
                </p>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="px-4 py-2 bg-mint-600 text-white rounded hover:bg-mint-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !error && config && documentServerUrl && (
            <OnlyOfficeEditor
              documentServerUrl={documentServerUrl}
              config={config}
              onError={(err) => {
                setError(err);
                toast.error(`Editor error: ${err}`);
              }}
              onReady={() => {
                setLoading(false);
              }}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

