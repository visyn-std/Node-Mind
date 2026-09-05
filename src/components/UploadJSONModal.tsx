import React, { useState, useRef } from 'react';
import { Upload, FileCode, CheckCircle2, AlertCircle, X, ArrowRight, FileUp } from 'lucide-react';
import { Diagram } from '../types';
import { parseImportedJSON } from '../utils/storage';

interface UploadJSONModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (diagram: Diagram, mode: 'new' | 'replace') => void;
}

export const UploadJSONModal: React.FC<UploadJSONModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [parsedDiagram, setParsedDiagram] = useState<Diagram | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessJSON = (content: string) => {
    setError(null);
    try {
      const diagram = parseImportedJSON(content);
      if (diagram && diagram.nodes && diagram.nodes.length > 0) {
        setParsedDiagram(diagram);
      } else {
        setError('JSON file does not contain a valid nodes list.');
        setParsedDiagram(null);
      }
    } catch {
      setError('Invalid JSON structure. Please check format.');
      setParsedDiagram(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessJSON(content);
    };
    reader.onerror = () => {
      setError('Unable to read selected file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleProcessJSON(content);
      };
      reader.readAsText(file);
    }
  };

  const handleApply = (mode: 'new' | 'replace') => {
    if (parsedDiagram) {
      onImport(parsedDiagram, mode);
      onClose();
      setParsedDiagram(null);
      setJsonText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#19B5FE] flex items-center justify-center border border-sky-100">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Upload JSON Mind Map</h3>
              <p className="text-[11px] text-slate-400">Import structured mind map data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 overflow-y-auto">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'file'
                  ? 'bg-white text-[#19B5FE] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              Select JSON File
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-white text-[#19B5FE] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Paste JSON Code
            </button>
          </div>

          {activeTab === 'file' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-[#19B5FE] bg-sky-50'
                  : 'border-slate-200 hover:border-[#19B5FE] hover:bg-slate-50 bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#19B5FE] border border-sky-100 flex items-center justify-center">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-800">
                  Click to upload or drag & drop JSON file here
                </p>
                <p className="text-[11px] text-slate-400">Supports exported .json files</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">
                JSON Code
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  if (e.target.value.trim()) {
                    handleProcessJSON(e.target.value);
                  } else {
                    setParsedDiagram(null);
                    setError(null);
                  }
                }}
                placeholder='{"title": "My Mind Map", "nodes": [...], "edges": [...]}'
                rows={5}
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#19B5FE] focus:ring-2 focus:ring-[#19B5FE]/20 bg-slate-50 resize-none text-slate-800"
              />
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Validated preview card */}
          {parsedDiagram && (
            <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#19B5FE]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valid Mind Map detected:
              </div>
              <div className="text-xs font-bold text-slate-900">{parsedDiagram.title}</div>
              <div className="flex gap-3 text-[11px] text-slate-500 font-mono">
                <span>{parsedDiagram.nodes.length} Nodes</span>
                <span>{parsedDiagram.edges.length} Connections</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-white">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>
          
          <button
            disabled={!parsedDiagram}
            onClick={() => handleApply('new')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              parsedDiagram
                ? 'bg-[#19B5FE] hover:bg-[#1499d6] text-white shadow-xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Create New Diagram</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
