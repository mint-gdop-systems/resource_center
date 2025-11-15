import React, { useEffect, useRef, useState } from 'react';
import { isOnlyOfficeSupported } from '../../utils/onlyoffice';

interface OnlyOfficeEditorProps {
  documentServerUrl: string;
  config: any;
  onError?: (error: string) => void;
  onReady?: () => void;
  style?: React.CSSProperties;
}

/**
 * ONLYOFFICE Document Editor Component
 * Embeds the ONLYOFFICE Document Server editor in an iframe
 */
export default function OnlyOfficeEditor({
  documentServerUrl,
  config,
  onError,
  onReady,
  style,
}: OnlyOfficeEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Generate a unique ID for each editor instance
  const editorId = useRef(`onlyoffice-editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  console.log('=== ONLYOFFICE EDITOR COMPONENT ===');
  console.log('Editor ID:', editorId.current);
  console.log('Document Server URL:', documentServerUrl);
  console.log('Config present:', !!config);

  useEffect(() => {
    if (!iframeRef.current || !documentServerUrl || !config) {
      return;
    }

    let script: HTMLScriptElement | null = null;
    let editor: any = null;

    const initializeEditor = () => {
      try {
        console.log('Attempting to initialize ONLYOFFICE editor');
        console.log('DocsAPI available:', !!window.DocsAPI);
        console.log('Iframe ref current:', !!iframeRef.current);
        console.log('Iframe ID:', iframeRef.current?.id);
        
        // Check if ONLYOFFICE API is loaded and iframe is ready
        if (window.DocsAPI && iframeRef.current) {
          // Ensure the iframe has the correct ID
          if (iframeRef.current.id !== editorId.current) {
            console.log('Setting iframe ID to:', editorId.current);
            iframeRef.current.id = editorId.current;
          }
          
          console.log('Initializing ONLYOFFICE editor with ID:', editorId.current);
          console.log('Config for editor:', config);
          
          // Add a small delay to ensure DOM is ready
          setTimeout(() => {
            try {
              // Add event handlers to the config to monitor save events
              const configWithEvents = {
                ...config,
                events: {
                  ...config.events,
                  onDocumentStateChange: (event: any) => {
                    console.log('=== ONLYOFFICE DOCUMENT STATE CHANGE ===');
                    console.log('Event:', event);
                  },
                  onSave: (event: any) => {
                    console.log('=== ONLYOFFICE SAVE EVENT ===');
                    console.log('Save event:', event);
                  },
                  onError: (event: any) => {
                    console.error('=== ONLYOFFICE ERROR EVENT ===');
                    console.error('Error event:', event);
                  },
                  onInfo: (event: any) => {
                    console.log('=== ONLYOFFICE INFO EVENT ===');
                    console.log('Info event:', event);
                  },
                  onWarning: (event: any) => {
                    console.warn('=== ONLYOFFICE WARNING EVENT ===');
                    console.warn('Warning event:', event);
                  }
                }
              };
              
              console.log('Final config with events:', configWithEvents);
              
              editor = new window.DocsAPI.DocEditor(editorId.current, configWithEvents);
              setIsLoading(false);
              if (onReady) {
                onReady();
              }
              console.log('ONLYOFFICE editor initialized successfully');
            } catch (initError: any) {
              console.error('Error during editor initialization:', initError);
              const errorMsg = `Error initializing ONLYOFFICE editor: ${initError.message}`;
              setError(errorMsg);
              setIsLoading(false);
              if (onError) {
                onError(errorMsg);
              }
            }
          }, 100);
        } else {
          const errorMsg = `ONLYOFFICE API not available (DocsAPI: ${!!window.DocsAPI}, iframe: ${!!iframeRef.current})`;
          console.error(errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          if (onError) {
            onError(errorMsg);
          }
        }
      } catch (err: any) {
        console.error('Error in initializeEditor:', err);
        const errorMsg = `Error initializing ONLYOFFICE editor: ${err.message}`;
        setError(errorMsg);
        setIsLoading(false);
        if (onError) {
          onError(errorMsg);
        }
      }
    };

    try {
      // Check if script is already loaded
      if (window.DocsAPI) {
        console.log('ONLYOFFICE API already loaded, initializing editor');
        initializeEditor();
        return;
      }
      
      console.log('ONLYOFFICE API not loaded, loading script');

      // Build the editor URL
      const editorUrl = `${documentServerUrl}/web-apps/apps/api/documents/api.js`;
      
      // Load ONLYOFFICE API script
      script = document.createElement('script');
      script.src = editorUrl;
      script.async = true;
      
      script.onload = () => {
        console.log('ONLYOFFICE API script loaded successfully');
        initializeEditor();
      };
      
      script.onerror = () => {
        const errorMsg = 'Failed to load ONLYOFFICE Document Server API. Please check if the Document Server is running and accessible.';
        setError(errorMsg);
        setIsLoading(false);
        if (onError) {
          onError(errorMsg);
        }
      };
      
      document.head.appendChild(script);
    } catch (err: any) {
      const errorMsg = `Error setting up ONLYOFFICE editor: ${err.message}`;
      setError(errorMsg);
      setIsLoading(false);
      if (onError) {
        onError(errorMsg);
      }
    }

    return () => {
      console.log('=== ONLYOFFICE EDITOR CLEANUP ===');
      console.log('Editor ID:', editorId.current);
      console.log('Editor instance exists:', !!editor);
      
      // Destroy editor instance if it exists
      if (editor && typeof editor.destroy === 'function') {
        try {
          console.log('Destroying ONLYOFFICE editor instance');
          editor.destroy();
          editor = null;
        } catch (e) {
          console.error('Error destroying ONLYOFFICE editor:', e);
        }
      }
      
      // Cleanup: remove script if component unmounts (only if we added it)
      // Note: We should NOT remove the script as it might be used by other instances
      // if (script && document.head.contains(script)) {
      //   document.head.removeChild(script);
      // }
      
      console.log('ONLYOFFICE editor cleanup completed');
    };
  }, [documentServerUrl, config, onError, onReady]);

  const defaultStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: 'none',
    minHeight: '600px',
    ...style,
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading ONLYOFFICE editor</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ONLYOFFICE editor...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        id={editorId.current}
        style={defaultStyle}
        title="ONLYOFFICE Document Editor"
      />
    </div>
  );
}

// Extend Window interface for ONLYOFFICE API
declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: any) => any;
    };
  }
}

