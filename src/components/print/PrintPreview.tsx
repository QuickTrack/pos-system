'use client';

import { useState, useEffect } from 'react';

interface PrintTemplate {
  _id: string;
  name: string;
  category: string;
  pageSize: string;
  isDefault?: boolean;
}

interface PrintPreviewProps {
  documentType: string;
  document: any;
  template?: any;
  printer?: any;
  format?: 'pdf' | 'escpos';
  onPrint?: () => void;
  onClose?: () => void;
}

export default function PrintPreview({
  documentType,
  document,
  template,
  printer,
  format = 'pdf',
  onPrint,
  onClose
}: PrintPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | null>(template || null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [documentType, document, selectedTemplate, format]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/document-templates?category=${documentType}`);
      const data = await response.json();
      
      if (data.templates && data.templates.length > 0) {
        setTemplates(data.templates);
        // Set default template if none selected
        if (!selectedTemplate) {
          const defaultTemplate = data.templates.find((t: PrintTemplate) => t.isDefault) || data.templates[0];
          setSelectedTemplate(defaultTemplate);
        }
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          document,
          templateId: selectedTemplate?._id,
          printerId: printer?._id,
          format,
          preview: true
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      if (data.preview) {
        // Create blob URL for preview
        const binary = atob(data.preview.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: data.preview.mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);

      const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          document,
          templateId: selectedTemplate?._id,
          printerId: printer?._id,
          format,
          copies: 1
        })
      });

      const data = await response.json();

      if (data.success) {
        onPrint?.();
      } else {
        setError(data.error || 'Print failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print failed');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              Print Preview - {documentType.charAt(0).toUpperCase() + documentType.slice(1)}
            </h2>
            {templates.length > 0 && (
              <select
                value={selectedTemplate?._id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t._id === e.target.value);
                  setSelectedTemplate(template || null);
                }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name} ({template.pageSize})
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          ) : previewUrl ? (
            format === 'pdf' ? (
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[500px] border-0"
                title="Print Preview"
              />
            ) : (
              <div className="bg-white p-4 rounded shadow max-w-md mx-auto font-mono text-xs whitespace-pre-wrap">
                {/* Raw ESC/POS preview - show as hex dump */}
                [ESC/POS commands - {documentType}]
              </div>
            )
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {template?.name || 'Default Template'} • {format.toUpperCase()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || printing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {printing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Printing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Print Button Component
interface PrintButtonProps {
  documentType: string;
  document: any;
  template?: any;
  printer?: any;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function PrintButton({
  documentType,
  document,
  template,
  printer,
  label = 'Print',
  variant = 'primary',
  size = 'md',
  disabled = false
}: PrintButtonProps) {
  const [showPreview, setShowPreview] = useState(false);

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        {label}
      </button>

      {showPreview && (
        <PrintPreview
          documentType={documentType}
          document={document}
          template={template}
          printer={printer}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
