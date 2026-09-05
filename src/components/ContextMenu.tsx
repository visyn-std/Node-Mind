import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  FolderUp,
  FileUp,
  Trash2,
  Copy,
  GitFork,
  Search,
  X,
  CornerDownLeft,
  Navigation,
} from 'lucide-react';
import { MindNode } from '../types';

export interface ContextMenuPosition {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetNodeId?: string | null;
}

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  targetNode: MindNode | null;
  allNodes?: MindNode[];
  onClose: () => void;
  onAddNote: (worldX: number, worldY: number) => void;
  onAddNode: (worldX: number, worldY: number) => void;
  onUploadFolder: (worldX: number, worldY: number) => void;
  onUploadFile: (worldX: number, worldY: number) => void;
  onAddChild?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onJumpToNode?: (node: MindNode) => void;
}

interface ActionItem {
  id: string;
  label: string;
  category: 'node' | 'create' | 'upload';
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  targetNode,
  allNodes = [],
  onClose,
  onAddNote,
  onAddNode,
  onUploadFolder,
  onUploadFile,
  onAddChild,
  onDuplicateNode,
  onDeleteNode,
  onJumpToNode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Focus search input when menu opens
  useEffect(() => {
    if (position) {
      setSearchQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [position]);

  // Click outside or ESC to close
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [position, onClose]);

  // Define action list based on whether targetNode is present
  const actions = useMemo<ActionItem[]>(() => {
    if (!position) return [];
    const list: ActionItem[] = [];

    if (targetNode) {
      if (onAddChild) {
        list.push({
          id: 'add-child',
          label: 'Add Child Branch',
          category: 'node',
          icon: <GitFork className="w-3.5 h-3.5 text-[#19B5FE]" />,
          shortcut: 'Tab',
          run: () => onAddChild(targetNode.id),
        });
      }
      if (onDuplicateNode) {
        list.push({
          id: 'duplicate-node',
          label: 'Duplicate Node',
          category: 'node',
          icon: <Copy className="w-3.5 h-3.5 text-slate-500" />,
          run: () => onDuplicateNode(targetNode.id),
        });
      }
      if (onDeleteNode) {
        list.push({
          id: 'delete-node',
          label: 'Delete Node',
          category: 'node',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
          shortcut: 'Del',
          run: () => onDeleteNode(targetNode.id),
        });
      }
    }

    list.push({
      id: 'add-node',
      label: 'Add Node',
      category: 'create',
      icon: <Plus className="w-3.5 h-3.5 text-[#19B5FE]" />,
      run: () => onAddNode(position.worldX, position.worldY),
    });

    list.push({
      id: 'add-note',
      label: 'Add Sticky Note',
      category: 'create',
      icon: <StickyNote className="w-3.5 h-3.5 text-amber-500" />,
      run: () => onAddNote(position.worldX, position.worldY),
    });

    list.push({
      id: 'upload-file',
      label: 'Upload File / Image',
      category: 'upload',
      icon: <FileUp className="w-3.5 h-3.5 text-[#19B5FE]" />,
      run: () => onUploadFile(position.worldX, position.worldY),
    });

    list.push({
      id: 'upload-folder',
      label: 'Upload Folder',
      category: 'upload',
      icon: <FolderUp className="w-3.5 h-3.5 text-slate-600" />,
      run: () => onUploadFolder(position.worldX, position.worldY),
    });

    return list;
  }, [
    position,
    targetNode,
    onAddChild,
    onDuplicateNode,
    onDeleteNode,
    onAddNode,
    onAddNote,
    onUploadFile,
    onUploadFolder,
  ]);

  // Filter actions by search query
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actions;
    const q = searchQuery.toLowerCase();
    return actions.filter((act) => act.label.toLowerCase().includes(q));
  }, [actions, searchQuery]);

  // Search existing diagram nodes for quick jump
  const matchingNodes = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allNodes
      .filter((n) => n.title.toLowerCase().includes(q) || (n.note && n.note.toLowerCase().includes(q)))
      .slice(0, 4);
  }, [allNodes, searchQuery]);

  const totalInteractiveItems = filteredActions.length + matchingNodes.length;

  // Handle keyboard navigation inside context menu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalInteractiveItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(1, totalInteractiveItems)) % Math.max(1, totalInteractiveItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredActions.length) {
        const act = filteredActions[selectedIndex];
        if (act) {
          act.run();
          onClose();
        }
      } else {
        const nodeIndex = selectedIndex - filteredActions.length;
        const node = matchingNodes[nodeIndex];
        if (node && onJumpToNode) {
          onJumpToNode(node);
          onClose();
        }
      }
    }
  };

  if (!position) return null;

  // Prevent menu overflow off screen
  const menuWidth = 230;
  const menuHeight = 310;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 16);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 16);

  return (
    <div
      ref={menuRef}
      style={{
        left: `${Math.max(12, adjustedX)}px`,
        top: `${Math.max(12, adjustedY)}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed z-50 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 select-none text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-100 ring-1 ring-slate-900/5"
    >
      {/* Target Node Title Badge if right clicked directly on a node */}
      {targetNode && (
        <div className="px-3 py-1.5 mb-1 mx-1.5 rounded-lg bg-sky-50/70 border border-sky-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#19B5FE] uppercase tracking-wider truncate">
            {targetNode.title}
          </span>
          <span className="text-[9px] text-slate-400 font-mono">Node</span>
        </div>
      )}

      {/* Quick Search Input */}
      <div className="px-2 pb-1.5 pt-0.5">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search actions..."
            className="w-full pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#19B5FE] focus:ring-2 focus:ring-[#19B5FE]/20 focus:bg-white transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto px-1 space-y-0.5">
        {/* Filtered Actions */}
        {filteredActions.map((act, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={act.id}
              onClick={() => {
                act.run();
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-2.5 py-1.5 rounded-md text-left font-medium flex items-center justify-between cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-sky-50 text-[#19B5FE]'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {act.icon}
                <span className={isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                  {act.label}
                </span>
              </div>
              {act.shortcut && (
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 py-0.5 rounded">
                  {act.shortcut}
                </span>
              )}
            </button>
          );
        })}

        {filteredActions.length === 0 && matchingNodes.length === 0 && (
          <div className="py-3 text-center text-xs text-slate-400">
            No matching actions found
          </div>
        )}

        {/* Matching Diagram Nodes Jump Section */}
        {matchingNodes.length > 0 && (
          <div className="pt-1.5 mt-1 border-t border-slate-100">
            <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Navigation className="w-3 h-3 text-[#19B5FE]" />
              <span>Jump to Node</span>
            </div>
            {matchingNodes.map((node, i) => {
              const itemIndex = filteredActions.length + i;
              const isSelected = itemIndex === selectedIndex;
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    if (onJumpToNode) onJumpToNode(node);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-50 text-[#19B5FE]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate pr-2">{node.title}</span>
                  <CornerDownLeft className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
