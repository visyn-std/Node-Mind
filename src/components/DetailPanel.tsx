import React from 'react';
import {
  X,
  Trash2,
  Copy,
  GitFork,
  File,
  FileImage,
  Download,
  Eye,
  Palette,
  AlignLeft,
  Sliders,
} from 'lucide-react';
import { MindNode, MindEdge, Viewport } from '../types';
import { Minimap } from './Minimap';

interface DetailPanelProps {
  selectedNode: MindNode | null;
  nodes: MindNode[];
  edges: MindEdge[];
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  onClose: () => void;
  onUpdateTitle: (nodeId: string, title: string) => void;
  onUpdateNote: (nodeId: string, note: string) => void;
  onUpdateColor: (nodeId: string, color: string) => void;
  onUpdateBgColor: (nodeId: string, bgColor: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onAddChild: (parentNodeId: string) => void;
  onPanTo: (x: number, y: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onOpenFileViewer: (node: MindNode) => void;
}

const ACCENT_COLORS = [
  '#19B5FE', // Sky Blue Primary
  '#0284C7', // Ocean Blue
  '#0D9488', // Teal
  '#10B981', // Emerald Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#64748B', // Slate
];

const BG_COLORS = [
  '#FFFFFF', // Pure White
  '#F0F9FF', // Sky 50 Light
  '#FEFCE8', // Yellow Note
  '#F8FAFC', // Slate 50
  '#F0FDF4', // Green 50
  '#FAF5FF', // Purple 50
];

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedNode,
  nodes,
  edges,
  viewport,
  canvasWidth,
  canvasHeight,
  onClose,
  onUpdateTitle,
  onUpdateNote,
  onUpdateColor,
  onUpdateBgColor,
  onDeleteNode,
  onDuplicateNode,
  onAddChild,
  onPanTo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onOpenFileViewer,
}) => {
  return (
    <aside className="w-72 bg-white border-l border-slate-200 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none overflow-hidden z-20 shadow-xs">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#19B5FE]" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {selectedNode ? 'Node Details' : 'Diagram Overview'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {selectedNode ? (
          <>
            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg">
              <button
                onClick={() => onAddChild(selectedNode.id)}
                title="Add child branch"
                className="flex-1 py-1.5 px-2 bg-white hover:bg-sky-50 text-slate-800 hover:text-[#19B5FE] rounded-md text-xs font-medium shadow-2xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <GitFork className="w-3.5 h-3.5 text-[#19B5FE]" />
                <span>Child</span>
              </button>

              <button
                onClick={() => onDuplicateNode(selectedNode.id)}
                title="Duplicate node"
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md text-xs transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                title="Delete node"
                className="p-1.5 hover:bg-white text-slate-600 hover:text-rose-600 rounded-md text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title / Label Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Node Title
              </label>
              <input
                type="text"
                value={selectedNode.title}
                onChange={(e) => onUpdateTitle(selectedNode.id, e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:border-[#19B5FE] focus:ring-2 focus:ring-[#19B5FE]/20 outline-none text-slate-800 font-medium transition-all"
                placeholder="Enter title..."
              />
            </div>

            {/* Note / Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <AlignLeft className="w-3 h-3 text-slate-400" />
                <span>Content / Notes</span>
              </label>
              <textarea
                value={selectedNode.note || ''}
                onChange={(e) => onUpdateNote(selectedNode.id, e.target.value)}
                rows={4}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:border-[#19B5FE] focus:ring-2 focus:ring-[#19B5FE]/20 outline-none text-slate-700 resize-none leading-relaxed transition-all"
                placeholder="Add detailed notes..."
              />
            </div>

            {/* File Attachment Information */}
            {selectedNode.fileData && (
              <div className="p-3 bg-sky-50/40 border border-sky-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedNode.fileData.isImage ? (
                      <FileImage className="w-4 h-4 text-[#19B5FE] shrink-0" />
                    ) : (
                      <File className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {selectedNode.fileData.name}
                    </span>
                  </div>
                </div>

                {selectedNode.fileData.previewUrl && (
                  <div
                    onClick={() => onOpenFileViewer(selectedNode)}
                    className="relative cursor-pointer rounded-lg border border-slate-200 overflow-hidden group bg-white"
                  >
                    <img
                      src={selectedNode.fileData.previewUrl}
                      alt={selectedNode.fileData.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity gap-1">
                      <Eye className="w-3.5 h-3.5" /> Full View
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>{(selectedNode.fileData.size / 1024).toFixed(1)} KB</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenFileViewer(selectedNode)}
                      className="text-[#19B5FE] hover:text-[#1499d6] font-medium cursor-pointer"
                    >
                      Preview
                    </button>
                    {selectedNode.fileData.url && (
                      <a
                        href={selectedNode.fileData.url}
                        download={selectedNode.fileData.name}
                        className="text-[#19B5FE] hover:text-[#1499d6] font-medium flex items-center gap-0.5"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Accent Color Palette */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3 text-slate-400" />
                <span>Accent Color</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ACCENT_COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => onUpdateColor(selectedNode.id, col)}
                    style={{ backgroundColor: col }}
                    className={`h-6 rounded-md transition-transform cursor-pointer border ${
                      selectedNode.color === col
                        ? 'ring-2 ring-[#19B5FE] scale-105 border-white'
                        : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Background Color Palette */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Card Background
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BG_COLORS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => onUpdateBgColor(selectedNode.id, bg)}
                    style={{ backgroundColor: bg }}
                    className={`h-6 rounded-md border text-[10px] font-mono text-slate-600 transition-transform cursor-pointer ${
                      selectedNode.bgColor === bg
                        ? 'ring-2 ring-[#19B5FE] border-sky-400 font-bold scale-105'
                        : 'border-slate-200 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Diagram Stats & Overview */
          <div className="space-y-4">
            <div className="p-3.5 bg-sky-50/50 border border-sky-100 rounded-xl space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Diagram Statistics
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-400">Total Nodes</div>
                  <div className="text-base font-bold text-slate-900">{nodes.length}</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="text-[10px] text-slate-400">Connections</div>
                  <div className="text-base font-bold text-slate-900">{edges.length}</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Click any node on the canvas to inspect its properties, notes, colors, or attachments.
            </p>
          </div>
        )}

        {/* Interactive Minimap Section at Bottom */}
        <div className="pt-3 border-t border-slate-200">
          <Minimap
            nodes={nodes}
            edges={edges}
            viewport={viewport}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onPanTo={onPanTo}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onFitView={onFitView}
          />
        </div>
      </div>
    </aside>
  );
};
