import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  StickyNote,
  Folder,
  File,
  FileImage,
  Download,
  Eye,
} from 'lucide-react';
import { MindNode } from '../types';

interface NodeComponentProps {
  node: MindNode;
  isSelected: boolean;
  hasChildren: boolean;
  childCount: number;
  onSelect: (nodeId: string, e: React.MouseEvent) => void;
  onStartDrag: (nodeId: string, e: React.MouseEvent) => void;
  onStartConnect: (nodeId: string, anchor: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onUpdateTitle: (nodeId: string, newTitle: string) => void;
  onUpdateNote?: (nodeId: string, newNote: string) => void;
  onAddChild: (parentNodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onContextMenu?: (nodeId: string, e: React.MouseEvent) => void;
  onOpenFileViewer?: (node: MindNode) => void;
}

export const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  isSelected,
  hasChildren,
  childCount,
  onSelect,
  onStartDrag,
  onStartConnect,
  onUpdateTitle,
  onUpdateNote,
  onAddChild,
  onToggleCollapse,
  onContextMenu,
  onOpenFileViewer,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [titleValue, setTitleValue] = useState(node.title);
  const [noteValue, setNoteValue] = useState(node.note || '');
  const [showHoverControls, setShowHoverControls] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitleValue(node.title);
  }, [node.title]);

  useEffect(() => {
    setNoteValue(node.note || '');
  }, [node.note]);

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingNote) {
      textareaRef.current?.focus();
    }
  }, [isEditingNote]);

  const handleFinishEditingTitle = () => {
    if (titleValue.trim()) {
      onUpdateTitle(node.id, titleValue.trim());
    } else {
      setTitleValue(node.title);
    }
    setIsEditingTitle(false);
  };

  const handleFinishEditingNote = () => {
    if (onUpdateNote) {
      onUpdateNote(node.id, noteValue);
    }
    setIsEditingNote(false);
  };

  const handleKeyDownTitle = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEditingTitle();
    } else if (e.key === 'Escape') {
      setTitleValue(node.title);
      setIsEditingTitle(false);
    }
  };

  const isNote = node.nodeType === 'note';
  const isFile = node.nodeType === 'file';
  const isFolder = node.nodeType === 'folder';

  const accentColor = node.color || (isNote ? '#F59E0B' : '#19B5FE');
  const bgColor = isNote
    ? node.bgColor || '#FEFCE8'
    : isFolder
    ? '#F0F9FF'
    : node.bgColor || '#FFFFFF';

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((isFile || isFolder || node.fileData) && onOpenFileViewer) {
      onOpenFileViewer(node);
    } else {
      setIsEditingTitle(true);
    }
  };

  return (
    <div
      id={`mindnode-${node.id}`}
      style={{
        transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
        width: `${node.width || (isNote ? 200 : 160)}px`,
        minHeight: `${node.height || (isNote ? 120 : 60)}px`,
      }}
      className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow group ${
        isSelected ? 'z-20' : 'z-10'
      }`}
      onMouseEnter={() => setShowHoverControls(true)}
      onMouseLeave={() => setShowHoverControls(false)}
      onMouseDown={(e) => {
        if (e.button !== 0) return; // Only trigger drag and select on left-click
        if ((e.target as HTMLElement).closest('.no-drag')) return;
        onStartDrag(node.id, e);
        onSelect(node.id, e);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(node.id, e);
        if (onContextMenu) {
          onContextMenu(node.id, e);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Connector Anchors (Top, Right, Bottom, Left) */}
      <div
        className={`transition-opacity duration-150 ${
          showHoverControls || isSelected ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Anchor */}
        <button
          title="Drag to connect"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnect(node.id, 'top', e);
          }}
          className="no-drag absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#19B5FE] hover:border-[#1499d6] hover:scale-125 shadow-xs transition-all flex items-center justify-center cursor-crosshair z-30 group/anchor"
        >
          <div className="w-1 h-1 rounded-full bg-[#19B5FE] group-hover/anchor:bg-[#1499d6]" />
        </button>

        {/* Right Anchor */}
        <button
          title="Drag to connect"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnect(node.id, 'right', e);
          }}
          className="no-drag absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#19B5FE] hover:border-[#1499d6] hover:scale-125 shadow-xs transition-all flex items-center justify-center cursor-crosshair z-30 group/anchor"
        >
          <div className="w-1 h-1 rounded-full bg-[#19B5FE] group-hover/anchor:bg-[#1499d6]" />
        </button>

        {/* Bottom Anchor */}
        <button
          title="Drag to connect"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnect(node.id, 'bottom', e);
          }}
          className="no-drag absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#19B5FE] hover:border-[#1499d6] hover:scale-125 shadow-xs transition-all flex items-center justify-center cursor-crosshair z-30 group/anchor"
        >
          <div className="w-1 h-1 rounded-full bg-[#19B5FE] group-hover/anchor:bg-[#1499d6]" />
        </button>

        {/* Left Anchor */}
        <button
          title="Drag to connect"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnect(node.id, 'left', e);
          }}
          className="no-drag absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#19B5FE] hover:border-[#1499d6] hover:scale-125 shadow-xs transition-all flex items-center justify-center cursor-crosshair z-30 group/anchor"
        >
          <div className="w-1 h-1 rounded-full bg-[#19B5FE] group-hover/anchor:bg-[#1499d6]" />
        </button>

        {/* Quick Add Child button (+) on Right */}
        <button
          title="Quick add child (+)"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(node.id);
          }}
          className="no-drag absolute -right-7 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#19B5FE] hover:bg-[#1499d6] text-white shadow-xs flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 z-30"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Main Node Card Body */}
      <div
        style={{
          backgroundColor: bgColor,
          borderColor: isSelected
            ? '#19B5FE'
            : isNote
            ? '#FEF08A'
            : node.isRoot
            ? '#19B5FE'
            : '#E2E8F0',
        }}
        className={`relative w-full h-full p-3 flex flex-col justify-between border rounded-xl transition-all shadow-2xs hover:shadow-xs ${
          isSelected
            ? 'ring-2 ring-[#19B5FE]/40 border-[#19B5FE] shadow-sm'
            : 'hover:border-slate-300'
        }`}
      >
        {/* Accent Color Indicator Bar on Left */}
        <div
          style={{ backgroundColor: accentColor }}
          className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r"
        />

        {/* Top Header info */}
        <div className="flex items-center justify-between gap-1.5 mb-1 pl-1">
          <div className="flex items-center gap-1.5">
            {isNote && (
              <span className="flex items-center text-amber-700 text-[10px] font-medium">
                <StickyNote className="w-3 h-3 mr-1 text-amber-500" /> Note
              </span>
            )}
            {isFolder && (
              <span className="flex items-center text-[#19B5FE] text-[10px] font-medium">
                <Folder className="w-3 h-3 mr-1 text-[#19B5FE]" /> Folder
              </span>
            )}
            {isFile && (
              <span className="flex items-center text-slate-600 text-[10px] font-medium">
                {node.fileData?.isImage ? (
                  <FileImage className="w-3 h-3 mr-1 text-[#19B5FE]" />
                ) : (
                  <File className="w-3 h-3 mr-1 text-slate-500" />
                )}
                <span>File</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* View full preview button for files/images */}
            {(isFile || isFolder || node.fileData) && onOpenFileViewer && (
              <button
                title="Double click to preview file"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFileViewer(node);
                }}
                className="no-drag p-0.5 text-slate-400 hover:text-[#19B5FE] rounded transition-colors cursor-pointer"
              >
                <Eye className="w-3 h-3" />
              </button>
            )}

            {/* Child collapse toggle if children exist */}
            {hasChildren && onToggleCollapse && (
              <button
                title={node.isCollapsed ? 'Expand branch' : 'Collapse branch'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(node.id);
                }}
                className="no-drag flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium text-slate-500 hover:text-[#19B5FE] bg-slate-100 rounded transition-colors cursor-pointer"
              >
                {node.isCollapsed ? (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span>+{childCount}</span>
                  </>
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Image preview thumbnail if file is an image */}
        {isFile && node.fileData?.isImage && node.fileData.previewUrl && (
          <div
            className="my-1 pl-1 pr-1 cursor-pointer group/img relative"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenFileViewer) onOpenFileViewer(node);
            }}
          >
            <img
              src={node.fileData.previewUrl}
              alt={node.fileData.name}
              className="w-full max-h-24 object-cover rounded-md border border-slate-200 bg-white"
            />
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 rounded-md flex items-center justify-center transition-opacity text-white text-[10px] font-medium gap-1">
              <Eye className="w-3 h-3" /> View
            </div>
          </div>
        )}

        {/* Node Title (Inline Editable or Display) */}
        <div className="pl-1 flex-1 flex items-center">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleFinishEditingTitle}
              onKeyDown={handleKeyDownTitle}
              className="no-drag w-full text-xs font-medium text-slate-800 bg-white border border-[#19B5FE] ring-1 ring-[#19B5FE]/30 rounded p-1 outline-none"
            />
          ) : (
            <div
              className={`text-xs font-medium leading-snug break-words text-slate-800 ${
                node.isRoot ? 'text-sm font-semibold text-slate-900' : ''
              }`}
            >
              {node.title}
            </div>
          )}
        </div>

        {/* Note direct editable text body for NOTE nodes */}
        {isNote && (
          <div className="pl-1 mt-1.5 pt-1.5 border-t border-amber-200/60 flex-1">
            {isEditingNote ? (
              <textarea
                ref={textareaRef}
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                onBlur={handleFinishEditingNote}
                placeholder="Type note content here..."
                rows={3}
                className="no-drag w-full text-[11px] text-slate-700 bg-white border border-amber-300 rounded p-1 outline-none resize-none"
              />
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingNote(true);
                }}
                className="text-[11px] text-slate-600 hover:text-slate-900 cursor-text min-h-[36px] whitespace-pre-wrap break-words leading-relaxed"
                title="Click to edit note content"
              >
                {node.note || <span className="text-slate-400 italic">Click to type note...</span>}
              </div>
            )}
          </div>
        )}

        {/* File metadata footer */}
        {isFile && node.fileData && (
          <div className="pl-1 mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>{(node.fileData.size / 1024).toFixed(1)} KB</span>
            {node.fileData.url && (
              <a
                href={node.fileData.url}
                download={node.fileData.name}
                onClick={(e) => e.stopPropagation()}
                title="Download file"
                className="no-drag text-[#19B5FE] hover:text-[#1499d6] font-medium flex items-center gap-0.5"
              >
                <Download className="w-2.5 h-2.5" />
                Download
              </a>
            )}
          </div>
        )}

        {/* Folder item count footer */}
        {isFolder && node.fileData?.itemCount !== undefined && (
          <div className="pl-1 mt-1 text-[10px] text-slate-400">
            {node.fileData.itemCount} items inside
          </div>
        )}
      </div>
    </div>
  );
};
