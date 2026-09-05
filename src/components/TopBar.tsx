import React, { useState, useEffect, useRef } from 'react';
import {
  GitGraph,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  RotateCw,
  Sliders,
  ChevronDown,
  Copy,
  Trash2,
  FileUp,
  Download,
} from 'lucide-react';
import { Viewport, Diagram } from '../types';

interface TopBarProps {
  diagramTitle: string;
  onUpdateTitle: (title: string) => void;
  onAddNode: () => void;
  viewport: Viewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExportClick: () => void;
  onUploadClick: () => void;
  isDetailPanelOpen: boolean;
  onToggleDetailPanel: () => void;
  gridStyle: 'dots' | 'lines' | 'clean';
  onGridStyleChange: (style: 'dots' | 'lines' | 'clean') => void;
  diagrams: Diagram[];
  activeDiagramId: string;
  onSelectDiagram: (id: string) => void;
  onCreateDiagram: () => void;
  onDuplicateDiagram: (id: string) => void;
  onDeleteDiagram: (id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  diagramTitle,
  onUpdateTitle,
  onAddNode,
  viewport,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExportClick,
  onUploadClick,
  isDetailPanelOpen,
  onToggleDetailPanel,
  gridStyle,
  onGridStyleChange,
  diagrams,
  activeDiagramId,
  onSelectDiagram,
  onCreateDiagram,
  onDuplicateDiagram,
  onDeleteDiagram,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(diagramTitle);
  const [isDiagramsMenuOpen, setIsDiagramsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleInput(diagramTitle);
  }, [diagramTitle]);

  // Click outside to close diagrams menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDiagramsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    } else {
      setTitleInput(diagramTitle);
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-20 shrink-0 select-none shadow-xs">
      {/* Left section: Diagrams Menu, Brand & Title */}
      <div className="flex items-center gap-3 min-w-0" ref={dropdownRef}>
        {/* Brand logo in #19B5FE */}
        <div className="w-8 h-8 rounded-lg bg-[#19B5FE] flex items-center justify-center text-white shadow-xs shrink-0">
          <GitGraph className="w-4 h-4" />
        </div>

        {/* Diagram selector & Title editor */}
        <div className="relative flex items-center">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(diagramTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="text-sm font-semibold text-slate-800 bg-white border border-[#19B5FE] ring-2 ring-[#19B5FE]/20 rounded-md px-2 py-0.5 outline-none max-w-[180px] sm:max-w-xs"
            />
          ) : (
            <div className="flex items-center gap-1.5 group">
              <h1
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename diagram"
                className="text-sm font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-xs cursor-pointer hover:text-[#19B5FE] transition-colors"
              >
                {diagramTitle}
              </h1>

              {/* Diagram Switcher dropdown button */}
              <button
                onClick={() => setIsDiagramsMenuOpen((prev) => !prev)}
                title="Saved Mind Maps"
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Diagrams Dropdown Menu */}
          {isDiagramsMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Mind Maps ({diagrams.length})
                </span>
                <button
                  onClick={() => {
                    onCreateDiagram();
                    setIsDiagramsMenuOpen(false);
                  }}
                  className="text-xs text-[#19B5FE] hover:text-[#1499d6] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Diagram
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto py-1 px-1 space-y-0.5">
                {diagrams.map((d) => {
                  const isActive = d.id === activeDiagramId;
                  return (
                    <div
                      key={d.id}
                      className={`px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer text-xs group transition-colors ${
                        isActive
                          ? 'bg-sky-50 font-semibold text-[#19B5FE]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className="flex-1 truncate mr-2"
                        onClick={() => {
                          onSelectDiagram(d.id);
                          setIsDiagramsMenuOpen(false);
                        }}
                      >
                        {d.title}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateDiagram(d.id);
                          }}
                          title="Duplicate"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {diagrams.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDiagram(d.id);
                            }}
                            title="Delete"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Clean Toolbar controls with Monochrome & #19B5FE */}
      <div className="flex items-center gap-2">
        {/* Add Node Button */}
        <button
          onClick={onAddNode}
          title="Add a new node to mind map"
          className="px-3.5 py-1.5 bg-[#19B5FE] text-white rounded-lg text-xs font-semibold hover:bg-[#1499d6] active:bg-[#0f80b5] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Node</span>
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white shadow-2xs">
          <button
            onClick={onZoomOut}
            title="Zoom Out (-)"
            className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            title="Reset to 100%"
            className="px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            title="Zoom In (+)"
            className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            title="Fit View"
            className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer ml-0.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid Background Switcher */}
        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white shadow-2xs hidden md:flex">
          <button
            onClick={() => onGridStyleChange('dots')}
            title="Dot Grid Pattern"
            className={`px-2.5 py-0.5 text-xs rounded-md transition-colors cursor-pointer ${
              gridStyle === 'dots'
                ? 'bg-sky-50 text-[#19B5FE] font-semibold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Dots
          </button>
          <button
            onClick={() => onGridStyleChange('lines')}
            title="Line Grid Pattern"
            className={`px-2.5 py-0.5 text-xs rounded-md transition-colors cursor-pointer ${
              gridStyle === 'lines'
                ? 'bg-sky-50 text-[#19B5FE] font-semibold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => onGridStyleChange('clean')}
            title="Minimal Plain Canvas"
            className={`px-2.5 py-0.5 text-xs rounded-md transition-colors cursor-pointer ${
              gridStyle === 'clean'
                ? 'bg-sky-50 text-[#19B5FE] font-semibold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Clean
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white shadow-2xs hidden sm:flex">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1 rounded transition-colors cursor-pointer ${
              canUndo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`p-1 rounded transition-colors cursor-pointer ${
              canRedo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right section: Upload JSON, Export JSON & Toggle Right Panel */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Upload JSON button */}
        <button
          onClick={onUploadClick}
          title="Upload JSON Mind Map"
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 text-slate-700 transition-colors cursor-pointer shadow-2xs"
        >
          <FileUp className="w-3.5 h-3.5 text-[#19B5FE]" />
          <span className="hidden sm:inline">Upload JSON</span>
        </button>

        {/* Export JSON button */}
        <button
          onClick={onExportClick}
          title="Export current mind map as JSON"
          className="px-3 py-1.5 bg-white border border-[#19B5FE] text-[#19B5FE] hover:bg-sky-50 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#19B5FE]" />
          <span className="hidden sm:inline">Export JSON</span>
        </button>

        {/* Toggle Right Inspector / Detail Panel */}
        <button
          onClick={onToggleDetailPanel}
          title={isDetailPanelOpen ? 'Close Inspector Panel' : 'Open Inspector & Minimap'}
          className={`p-2 border rounded-lg transition-colors cursor-pointer shadow-2xs ${
            isDetailPanelOpen
              ? 'bg-sky-50 border-sky-200 text-[#19B5FE]'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
