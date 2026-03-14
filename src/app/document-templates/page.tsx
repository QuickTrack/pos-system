'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  FileText, 
  Copy, 
  Trash2, 
  Edit, 
  Save, 
  X,
  Move,
  Type,
  Image,
  Table,
  Minus,
  QrCode,
  Barcode,
  Signature,
  Square,
  Eye,
  Printer,
  Download,
  Settings,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Layers,
  Palette,
  Layout
} from 'lucide-react';

interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'divider' | 'qrcode' | 'barcode' | 'signature' | 'shape' | 'spacer';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  content?: string;
  src?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  columns?: Array<{
    key: string;
    title: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
  }>;
  source?: string;
  shapeType?: 'rectangle' | 'circle' | 'line';
}

interface Template {
  _id: string;
  name: string;
  description?: string;
  category: string;
  pageSize: string;
  pageWidth?: number;
  pageHeight?: number;
  orientation: string;
  elements: TemplateElement[];
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  isDefault?: boolean;
  isBuiltIn?: boolean;
}

const PAGE_SIZES: Record<string, { width: number; height: number; name: string }> = {
  '58mm': { width: 58, height: 300, name: '58mm Thermal' },
  '80mm': { width: 80, height: 400, name: '80mm Thermal' },
  'A4': { width: 210, height: 297, name: 'A4 Portrait' },
  'A4_LANDSCAPE': { width: 297, height: 210, name: 'A4 Landscape' },
  'HALF_PAGE': { width: 210, height: 148, name: 'Half Page' },
};

const ELEMENT_TOOLS = [
  { type: 'text', icon: Type, label: 'Text', defaultWidth: 80, defaultHeight: 20 },
  { type: 'image', icon: Image, label: 'Image/Logo', defaultWidth: 60, defaultHeight: 40 },
  { type: 'table', icon: Table, label: 'Table', defaultWidth: 170, defaultHeight: 100 },
  { type: 'divider', icon: Minus, label: 'Divider', defaultWidth: 170, defaultHeight: 5 },
  { type: 'qrcode', icon: QrCode, label: 'QR Code', defaultWidth: 30, defaultHeight: 30 },
  { type: 'barcode', icon: Barcode, label: 'Barcode', defaultWidth: 60, defaultHeight: 25 },
  { type: 'signature', icon: Signature, label: 'Signature', defaultWidth: 80, defaultHeight: 35 },
  { type: 'shape', icon: Square, label: 'Shape', defaultWidth: 50, defaultHeight: 30 },
  { type: 'spacer', icon: Move, label: 'Spacer', defaultWidth: 20, defaultHeight: 10 },
];

const SAMPLE_DATA = {
  business: {
    name: 'Your Business Name',
    address: '123 Business Street, City',
    phone: '+254 700 000000',
    email: 'info@business.com',
    kraPin: 'A123456789',
    logo: ''
  },
  invoice: {
    number: 'INV-2026-0001',
    date: formatDate(new Date()),
    dueDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    subtotal: '15,000.00',
    tax: '2,400.00',
    taxRate: '16',
    total: '17,400.00'
  },
  customer: {
    name: 'John Doe',
    phone: '+254 700 000000',
    email: 'john@example.com',
    address: '456 Customer Ave'
  },
  cashier: {
    name: 'Admin User'
  },
  payment: {
    amount: '17,400.00',
    method: 'Cash',
    reference: ''
  },
  items: [
    { name: 'Product A', quantity: 2, price: '5,000.00', total: '10,000.00' },
    { name: 'Product B', quantity: 1, price: '5,000.00', total: '5,000.00' }
  ]
};

export default function DocumentTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Editor state
  const [editorTemplate, setEditorTemplate] = useState<Template | null>(null);
  const [selectedElement, setSelectedElement] = useState<TemplateElement | null>(null);
  const [draggedElement, setDraggedElement] = useState<TemplateElement | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/document-templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      _id: '',
      name: 'New Template',
      description: '',
      category: 'invoice',
      pageSize: 'A4',
      orientation: 'portrait',
      elements: [],
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    };
    setEditorTemplate(newTemplate);
    setSelectedElement(null);
    setEditMode(true);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditorTemplate({ ...template });
    setSelectedElement(null);
    setEditMode(!template.isBuiltIn);
    setShowEditor(true);
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const response = await fetch('/api/document-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          name: `${template.name} (Copy)`,
          _id: undefined,
          isBuiltIn: false,
          isDefault: false
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch(`/api/document-templates/${templateId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editorTemplate) return;

    try {
      const method = editorTemplate._id ? 'PUT' : 'POST';
      const url = editorTemplate._id 
        ? `/api/document-templates/${editorTemplate._id}`
        : '/api/document-templates';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editorTemplate)
      });
      
      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        setShowEditor(false);
        setEditorTemplate(null);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const addElement = (type: string) => {
    if (!editorTemplate) return;
    
    const tool = ELEMENT_TOOLS.find(t => t.type === type);
    if (!tool) return;

    const newElement: TemplateElement = {
      id: `element_${Date.now()}`,
      type: type as TemplateElement['type'],
      x: 20,
      y: editorTemplate.elements.length * 30 + 20,
      width: tool.defaultWidth,
      height: tool.defaultHeight || 20,
      content: type === 'text' ? 'New Text' : undefined,
      fontSize: 12,
      color: '#000000',
      textAlign: 'left',
      backgroundColor: type === 'shape' ? '#e5e7eb' : undefined,
      shapeType: 'rectangle',
      lineStyle: 'solid',
      columns: type === 'table' ? [
        { key: 'name', title: 'Item', width: 70 },
        { key: 'quantity', title: 'Qty', width: 20, align: 'center' },
        { key: 'price', title: 'Price', width: 30, align: 'right' },
        { key: 'total', title: 'Total', width: 30, align: 'right' }
      ] : undefined,
      source: type === 'table' ? 'items' : undefined
    };

    setEditorTemplate({
      ...editorTemplate,
      elements: [...editorTemplate.elements, newElement]
    });
    setSelectedElement(newElement);
  };

  const updateElement = (elementId: string, updates: Partial<TemplateElement>) => {
    if (!editorTemplate) return;
    
    setEditorTemplate({
      ...editorTemplate,
      elements: editorTemplate.elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    });
    
    if (selectedElement?.id === elementId) {
      setSelectedElement(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteElement = (elementId: string) => {
    if (!editorTemplate) return;
    
    setEditorTemplate({
      ...editorTemplate,
      elements: editorTemplate.elements.filter(el => el.id !== elementId)
    });
    
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  };

  const duplicateElement = (element: TemplateElement) => {
    if (!editorTemplate) return;
    
    const newElement = {
      ...element,
      id: `element_${Date.now()}`,
      x: element.x + 10,
      y: element.y + 10
    };
    
    setEditorTemplate({
      ...editorTemplate,
      elements: [...editorTemplate.elements, newElement]
    });
  };

  const renderPreview = () => {
    if (!editorTemplate) return null;
    
    const pageSize = PAGE_SIZES[editorTemplate.pageSize] || PAGE_SIZES['A4'];
    const scale = 0.5;
    
    return (
      <div 
        className="bg-white shadow-lg overflow-auto"
        style={{
          width: `${pageSize.width * scale}mm`,
          minHeight: `${pageSize.height * scale}mm`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          padding: `${editorTemplate.margins.top}mm`,
          fontFamily: 'monospace',
          fontSize: '8px'
        }}
      >
        {editorTemplate.elements.map(element => {
          const sampleText = element.content || '';
          const displayContent = sampleText.replace(/\{\{(\w+\.\w+)\}\}/g, (match, key) => {
            const keys = key.split('.');
            let value: any = SAMPLE_DATA;
            for (const k of keys) {
              value = value?.[k];
            }
            return value || match;
          });

          switch (element.type) {
            case 'text':
              return (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    fontSize: `${element.fontSize}px`,
                    fontWeight: element.fontWeight,
                    color: element.color,
                    textAlign: element.textAlign,
                    fontFamily: element.fontFamily
                  }}
                >
                  {displayContent}
                </div>
              );
            case 'image':
              return (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    textAlign: element.textAlign
                  }}
                >
                  {element.src?.includes('{{') ? (
                    <div className="bg-gray-200 flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                      <Image className="w-4 h-4 text-gray-400" />
                    </div>
                  ) : (
                    <img src={element.src} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  )}
                </div>
              );
            case 'table':
              return (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`
                  }}
                >
                  <table style={{ width: '100%', fontSize: `${element.fontSize || 8}px` }}>
                    <thead>
                      <tr>
                        {element.columns?.map(col => (
                          <th key={col.key} style={{ textAlign: col.align || 'left', borderBottom: '1px solid #000' }}>
                            {col.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_DATA.items.map((item, idx) => (
                        <tr key={idx}>
                          {element.columns?.map(col => (
                            <td key={col.key} style={{ textAlign: col.align || 'left', padding: '2px 0' }}>
                              {String(item[col.key as keyof typeof item] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case 'divider':
              return (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    borderBottom: `1px ${element.lineStyle || 'solid'} #000`
                  }}
                />
              );
            case 'shape':
              return (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    backgroundColor: element.backgroundColor,
                    borderRadius: element.shapeType === 'circle' ? '50%' : `${element.borderRadius || 0}px`
                  }}
                />
              );
            case 'signature':
              return (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    borderBottom: '1px solid #000'
                  }}
                >
                  <Signature className="w-4 h-4 text-gray-400" style={{ width: '100%', height: '100%' }} />
                </div>
              );
            case 'qrcode':
            case 'barcode':
              return (
                <div
                  key={element.id}
                  style={{
                    position: 'absolute',
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6'
                  }}
                >
                  {element.type === 'qrcode' ? (
                    <QrCode className="w-6 h-6 text-gray-600" />
                  ) : (
                    <Barcode className="w-8 h-4 text-gray-600" />
                  )}
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'receipt', label: 'Receipts' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'order', label: 'Orders' },
    { value: 'quotation', label: 'Quotations' },
    { value: 'delivery', label: 'Delivery Notes' },
    { value: 'purchase', label: 'Purchase Orders' },
    { value: 'payment', label: 'Payment Receipts' }
  ];

  const pageSizeOptions = Object.entries(PAGE_SIZES).map(([key, value]) => ({
    value: key,
    label: value.name
  }));

  return (
    <div>
      <Header title="Document Templates" subtitle="Design and manage document templates" />
      
      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleCreateTemplate} className="gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template._id} className="hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{template.category}</p>
                    </div>
                  </div>
                  {template.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Default
                    </span>
                  )}
                  {template.isBuiltIn && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      Built-in
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {template.description || `A ${template.pageSize} ${template.category} template`}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>{PAGE_SIZES[template.pageSize]?.name || template.pageSize}</span>
                  <span>{template.elements.length} elements</span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setEditorTemplate({ ...template });
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {!template.isBuiltIn && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteTemplate(template._id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No templates found</p>
            <Button onClick={handleCreateTemplate} className="mt-4">
              Create your first template
            </Button>
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showEditor && editorTemplate && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
          {/* Editor Header */}
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={editorTemplate.name}
                onChange={(e) => setEditorTemplate({ ...editorTemplate, name: e.target.value })}
                className="text-lg font-medium border-none focus:outline-none focus:ring-0"
                placeholder="Template Name"
              />
              <select
                value={editorTemplate.category}
                onChange={(e) => setEditorTemplate({ ...editorTemplate, category: e.target.value })}
                className="px-3 py-1 border rounded text-sm"
              >
                {categories.filter(c => c.value !== 'all').map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={editorTemplate.pageSize}
                onChange={(e) => setEditorTemplate({ ...editorTemplate, pageSize: e.target.value })}
                className="px-3 py-1 border rounded text-sm"
              >
                {pageSizeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="w-4 h-4 mr-1" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
              <Button onClick={handleSaveTemplate}>
                <Save className="w-4 h-4 mr-1" />
                Save Template
              </Button>
              <Button variant="ghost" onClick={() => setShowEditor(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Elements Toolbar */}
            <div className="w-20 bg-white border-r overflow-y-auto py-2">
              <div className="space-y-1 px-2">
                {ELEMENT_TOOLS.map(tool => (
                  <button
                    key={tool.type}
                    onClick={() => addElement(tool.type)}
                    className="w-full p-2 flex flex-col items-center gap-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                    title={tool.label}
                  >
                    <tool.icon className="w-5 h-5" />
                    <span className="text-[10px]">{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 bg-gray-100 overflow-auto p-8">
              <div 
                ref={canvasRef}
                className="bg-white shadow-lg mx-auto relative"
                style={{
                  width: `${PAGE_SIZES[editorTemplate.pageSize]?.width || 210}mm`,
                  minHeight: `${PAGE_SIZES[editorTemplate.pageSize]?.height || 297}mm`,
                  padding: `${editorTemplate.margins.top}mm`
                }}
              >
                {editorTemplate.elements.map(element => (
                  <div
                    key={element.id}
                    className={`absolute cursor-move ${selectedElement?.id === element.id ? 'ring-2 ring-emerald-500' : ''}`}
                    style={{
                      left: `${element.x}mm`,
                      top: `${element.y}mm`,
                      width: `${element.width}mm`,
                      height: `${element.height}mm`,
                      backgroundColor: element.type === 'shape' ? element.backgroundColor : 'transparent'
                    }}
                    onClick={() => setSelectedElement(element)}
                  >
                    {element.type === 'text' && (
                      <div
                        style={{
                          fontSize: `${element.fontSize}px`,
                          fontWeight: element.fontWeight,
                          color: element.color,
                          textAlign: element.textAlign,
                          fontFamily: element.fontFamily,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {element.content || 'Text'}
                      </div>
                    )}
                    {element.type === 'image' && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Image className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    {element.type === 'divider' && (
                      <div 
                        className="w-full h-full"
                        style={{
                          borderBottom: `1px ${element.lineStyle || 'solid'} ${element.borderColor || '#000'}`
                        }}
                      />
                    )}
                    {element.type === 'table' && (
                      <div className="w-full h-full bg-gray-50 p-1 overflow-hidden">
                        <table className="w-full text-[8px]">
                          <thead>
                            <tr>
                              {element.columns?.map(col => (
                                <th key={col.key} className="border-b">{col.title}</th>
                              ))}
                            </tr>
                          </thead>
                        </table>
                      </div>
                    )}
                    {element.type === 'signature' && (
                      <div className="w-full h-full border-b border-dashed border-gray-400" />
                    )}
                    {element.type === 'qrcode' && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <QrCode className="w-5 h-5" />
                      </div>
                    )}
                    {element.type === 'barcode' && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Barcode className="w-8 h-4" />
                      </div>
                    )}
                    {element.type === 'shape' && (
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundColor: element.backgroundColor,
                          borderRadius: element.shapeType === 'circle' ? '50%' : '0'
                        }}
                      />
                    )}
                    {element.type === 'spacer' && (
                      <div className="w-full h-full border border-dashed border-gray-300 bg-gray-50" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Properties Panel */}
            {selectedElement && (
              <div className="w-64 bg-white border-l overflow-y-auto p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Element Properties
                </h3>
                
                <div className="space-y-4">
                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">X (mm)</label>
                      <input
                        type="number"
                        value={selectedElement.x}
                        onChange={(e) => updateElement(selectedElement.id, { x: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Y (mm)</label>
                      <input
                        type="number"
                        value={selectedElement.y}
                        onChange={(e) => updateElement(selectedElement.id, { y: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Width (mm)</label>
                      <input
                        type="number"
                        value={selectedElement.width}
                        onChange={(e) => updateElement(selectedElement.id, { width: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Height (mm)</label>
                      <input
                        type="number"
                        value={selectedElement.height}
                        onChange={(e) => updateElement(selectedElement.id, { height: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Text specific */}
                  {selectedElement.type === 'text' && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500">Content</label>
                        <textarea
                          value={selectedElement.content || ''}
                          onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm mt-1"
                          rows={3}
                          placeholder="Enter text or use {{variable}}"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          Use {'{{business.name}}'}, {'{{invoice.number}}'}, etc.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Font Size</label>
                          <input
                            type="number"
                            value={selectedElement.fontSize || 12}
                            onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Color</label>
                          <input
                            type="color"
                            value={selectedElement.color || '#000000'}
                            onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                            className="w-full h-8 rounded"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Alignment</label>
                        <div className="flex gap-1 mt-1">
                          {['left', 'center', 'right'].map(align => (
                            <button
                              key={align}
                              onClick={() => updateElement(selectedElement.id, { textAlign: align as any })}
                              className={`flex-1 py-1 rounded text-xs ${selectedElement.textAlign === align ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Shape specific */}
                  {selectedElement.type === 'shape' && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500">Shape Type</label>
                        <select
                          value={selectedElement.shapeType || 'rectangle'}
                          onChange={(e) => updateElement(selectedElement.id, { shapeType: e.target.value as any })}
                          className="w-full px-2 py-1 border rounded text-sm mt-1"
                        >
                          <option value="rectangle">Rectangle</option>
                          <option value="circle">Circle</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Background</label>
                        <input
                          type="color"
                          value={selectedElement.backgroundColor || '#e5e7eb'}
                          onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })}
                          className="w-full h-8 rounded mt-1"
                        />
                      </div>
                    </>
                  )}

                  {/* Divider specific */}
                  {selectedElement.type === 'divider' && (
                    <div>
                      <label className="text-xs text-gray-500">Line Style</label>
                      <select
                        value={selectedElement.lineStyle || 'solid'}
                        onChange={(e) => updateElement(selectedElement.id, { lineStyle: e.target.value as any })}
                        className="w-full px-2 py-1 border rounded text-sm mt-1"
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => duplicateElement(selectedElement)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-red-600"
                      onClick={() => deleteElement(selectedElement.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={`Preview: ${editorTemplate?.name || 'Template'}`}
        size="lg"
      >
        <div className="bg-gray-100 p-4 overflow-auto max-h-[70vh]">
          {renderPreview()}
        </div>
      </Modal>
    </div>
  );
}
