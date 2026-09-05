import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MindNode,
  MindEdge,
  Viewport,
  ConnectingState,
  DraggingNodeState,
  PanningState,
  EdgeLineStyle,
  FileAttachment,
} from '../types';
import { NodeComponent } from './NodeComponent';
import { ConnectionLines } from './ConnectionLines';
import { ContextMenu, ContextMenuPosition } from './ContextMenu';
import { UploadCloud } from 'lucide-react';

interface CanvasProps {
  nodes: MindNode[];
  edges: MindEdge[];
  viewport: Viewport;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string | null, isMulti?: boolean) => void;
  onSelectAllNodes: () => void;
  onClearSelection: () => void;
  onSelectEdge: (edgeId: string | null) => void;
  onNodesChange: (nodes: MindNode[]) => void;
  onEdgesChange: (edges: MindEdge[]) => void;
  onAddChild: (parentNodeId: string) => void;
  onQuickAddNodeAt: (worldX: number, worldY: number) => void;
  onAddNoteAt: (worldX: number, worldY: number) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  onDuplicateNode: (nodeId: string) => void;
  onOpenFileViewer: (node: MindNode) => void;
  onJumpToNode?: (node: MindNode) => void;
  defaultLineStyle: EdgeLineStyle;
  gridStyle: 'dots' | 'lines' | 'clean';
  onCanvasSizeChange: (width: number, height: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  viewport,
  setViewport,
  selectedNodeIds,
  selectedEdgeId,
  onSelectNode,
  onSelectAllNodes,
  onClearSelection,
  onSelectEdge,
  onNodesChange,
  onEdgesChange,
  onAddChild,
  onQuickAddNodeAt,
  onAddNoteAt,
  onDeleteNodes,
  onDuplicateNode,
  onOpenFileViewer,
  onJumpToNode,
  defaultLineStyle,
  gridStyle,
  onCanvasSizeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [draggingNodeState, setDraggingNodeState] = useState<DraggingNodeState | null>(null);
  const [panningState, setPanningState] = useState<PanningState | null>(null);
  const [connectingState, setConnectingState] = useState<ConnectingState | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadWorldCoords, setUploadWorldCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Measure container size with ResizeObserver and ref guarding
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const updateDimensions = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        onCanvasSizeChange(Math.round(width), Math.round(height));
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          onCanvasSizeChange(Math.round(width), Math.round(height));
        }
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [onCanvasSizeChange]);

  // Spacebar pan listener and Ctrl+A select all listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);

      if (e.code === 'Space' && !isInputFocused) {
        setIsSpacePressed(true);
      }

      // Ctrl+A / Cmd+A to select all nodes
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A') && !isInputFocused) {
        e.preventDefault();
        onSelectAllNodes();
      }

      // Delete key to delete selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused && selectedNodeIds.length > 0) {
        e.preventDefault();
        onDeleteNodes(selectedNodeIds);
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        setContextMenuPos(null);
        onClearSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSelectAllNodes, onDeleteNodes, onClearSelection, selectedNodeIds]);

  // Convert screen coordinates to world coordinates inside canvas
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = screenX - rect.left;
      const relativeY = screenY - rect.top;
      return {
        x: (relativeX - viewport.x) / viewport.zoom,
        y: (relativeY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.25), 2.5);

    const newViewportX = cursorX - (cursorX - viewport.x) * (newZoom / viewport.zoom);
    const newViewportY = cursorY - (cursorY - viewport.y) * (newZoom / viewport.zoom);

    setViewport({
      x: newViewportX,
      y: newViewportY,
      zoom: newZoom,
    });
  };

  // Start Canvas Panning (Left click on background or middle click or space+drag)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only handle left or middle click
    if (e.button !== 0 && e.button !== 1 && !isSpacePressed) {
      return;
    }

    // If clicked on node or context menu, skip
    if ((e.target as HTMLElement).closest('[id^="mindnode-"]') || (e.target as HTMLElement).closest('.context-menu-container')) {
      return;
    }

    setContextMenuPos(null);
    onClearSelection();
    onSelectEdge(null);

    setPanningState({
      startX: e.clientX,
      startY: e.clientY,
      initialViewportX: viewport.x,
      initialViewportY: viewport.y,
    });
  };

  // Right-click context menu on canvas or node
  const handleContextMenu = (e: React.MouseEvent, targetNodeId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    const worldCoords = screenToWorld(e.clientX, e.clientY);
    setContextMenuPos({
      x: e.clientX,
      y: e.clientY,
      worldX: Math.round(worldCoords.x),
      worldY: Math.round(worldCoords.y),
      targetNodeId: targetNodeId || null,
    });

    if (targetNodeId && !selectedNodeIds.includes(targetNodeId)) {
      onSelectNode(targetNodeId);
    }
  };

  // Start Node Dragging
  const handleStartNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    if (isSpacePressed || e.button !== 0) return;
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    setDraggingNodeState({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      initialNodePositions: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
    });
  };

  // Start Connection Dragging
  const handleStartConnect = (
    nodeId: string,
    anchor: 'top' | 'right' | 'bottom' | 'left',
    e: React.MouseEvent
  ) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setConnectingState({
      fromNodeId: nodeId,
      fromAnchor: anchor,
      currentX: worldPos.x,
      currentY: worldPos.y,
    });
  };

  // Global Pointer Move
  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Handling Panning
    if (panningState) {
      const dx = e.clientX - panningState.startX;
      const dy = e.clientY - panningState.startY;
      setViewport((prev) => ({
        ...prev,
        x: panningState.initialViewportX + dx,
        y: panningState.initialViewportY + dy,
      }));
      return;
    }

    // 2. Handling Node Dragging (moves all selected nodes together if dragging a selected node)
    if (draggingNodeState) {
      const dx = (e.clientX - draggingNodeState.startX) / viewport.zoom;
      const dy = (e.clientY - draggingNodeState.startY) / viewport.zoom;

      const nodesToMove = selectedNodeIds.includes(draggingNodeState.nodeId)
        ? selectedNodeIds
        : [draggingNodeState.nodeId];

      const updated = nodes.map((node) => {
        if (nodesToMove.includes(node.id)) {
          const init = draggingNodeState.initialNodePositions.find((p) => p.id === node.id);
          if (init) {
            return {
              ...node,
              x: Math.round(init.x + dx),
              y: Math.round(init.y + dy),
            };
          }
        }
        return node;
      });

      onNodesChange(updated);
      return;
    }

    // 3. Handling Connection Dragging
    if (connectingState) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setConnectingState((prev) =>
        prev
          ? {
              ...prev,
              currentX: worldPos.x,
              currentY: worldPos.y,
            }
          : null
      );
    }
  };

  // Global Pointer Up
  const handleMouseUp = (e: React.MouseEvent) => {
    // Finish Panning
    if (panningState) {
      setPanningState(null);
    }

    // Finish Node Dragging
    if (draggingNodeState) {
      setDraggingNodeState(null);
    }

    // Finish Connecting
    if (connectingState) {
      const targetElement = (e.target as HTMLElement).closest('[id^="mindnode-"]');
      if (targetElement) {
        const targetId = targetElement.id.replace('mindnode-', '');
        if (targetId && targetId !== connectingState.fromNodeId) {
          const exists = edges.some(
            (edge) =>
              (edge.fromNodeId === connectingState.fromNodeId &&
                edge.toNodeId === targetId) ||
              (edge.fromNodeId === targetId &&
                edge.toNodeId === connectingState.fromNodeId)
          );

          if (!exists) {
            const newEdge: MindEdge = {
              id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              fromNodeId: connectingState.fromNodeId,
              toNodeId: targetId,
              color: '#19B5FE',
              style: defaultLineStyle,
            };

            const updatedNodes = nodes.map((n) =>
              n.id === targetId && !n.parentId
                ? { ...n, parentId: connectingState.fromNodeId }
                : n
            );

            onNodesChange(updatedNodes);
            onEdgesChange([...edges, newEdge]);
          }
        }
      }
      setConnectingState(null);
    }
  };

  // Double Click Canvas to Quick Add Node
  const handleDoubleClickCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[id^="mindnode-"]')) return;
    const worldPos = screenToWorld(e.clientX, e.clientY);
    onQuickAddNodeAt(worldPos.x, worldPos.y);
  };

  // Collapse/Expand branch
  const handleToggleCollapse = (nodeId: string) => {
    onNodesChange(
      nodes.map((n) => (n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n))
    );
  };

  // Helper mapping of children count
  const childCountMap = new Map<string, number>();
  nodes.forEach((n) => {
    if (n.parentId) {
      childCountMap.set(n.parentId, (childCountMap.get(n.parentId) || 0) + 1);
    }
  });

  // Process and create nodes from files (either dropped or uploaded)
  const processFilesToNodes = async (files: FileList | File[], startX: number, startY: number) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newNodes: MindNode[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const isImage = file.type.startsWith('image/');
      let previewUrl: string | undefined = undefined;

      if (isImage) {
        try {
          previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        } catch {
          previewUrl = undefined;
        }
      }

      const fileData: FileAttachment = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: URL.createObjectURL(file),
        isImage,
        previewUrl,
      };

      const fileNode: MindNode = {
        id: `node-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        title: file.name,
        note: `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        nodeType: 'file',
        fileData,
        x: Math.round(startX + (i % 3) * 190),
        y: Math.round(startY + Math.floor(i / 3) * 120),
        width: 180,
        height: isImage ? 130 : 70,
        color: '#19B5FE',
        bgColor: '#FFFFFF',
      };

      newNodes.push(fileNode);
    }

    onNodesChange([...nodes, ...newNodes]);
    if (newNodes.length > 0) {
      onSelectNode(newNodes[0].id);
    }
  };

  // Process folder upload to a folder node with sub-nodes
  const processFolderToNodes = async (files: FileList | File[], startX: number, startY: number) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    let folderName = 'New Folder';
    if (fileArray[0] && (fileArray[0] as any).webkitRelativePath) {
      const pathParts = (fileArray[0] as any).webkitRelativePath.split('/');
      if (pathParts.length > 1) {
        folderName = pathParts[0];
      }
    }

    const folderNodeId = `node-folder-${Date.now()}`;
    const folderNode: MindNode = {
      id: folderNodeId,
      title: folderName,
      note: `Folder contains ${fileArray.length} items`,
      nodeType: 'folder',
      fileData: {
        name: folderName,
        size: fileArray.reduce((acc, f) => acc + f.size, 0),
        type: 'folder',
        itemCount: fileArray.length,
      },
      x: Math.round(startX),
      y: Math.round(startY),
      width: 180,
      height: 70,
      color: '#19B5FE',
      bgColor: '#F0F9FF',
    };

    const childNodes: MindNode[] = [];
    const childEdges: MindEdge[] = [];

    fileArray.slice(0, 10).forEach((file, idx) => {
      const isImg = file.type.startsWith('image/');
      const childId = `node-${Date.now()}-${idx}`;
      const childNode: MindNode = {
        id: childId,
        title: file.name,
        note: `${(file.size / 1024).toFixed(1)} KB`,
        nodeType: 'file',
        fileData: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: URL.createObjectURL(file),
          isImage: isImg,
        },
        parentId: folderNodeId,
        x: Math.round(startX + 240),
        y: Math.round(startY + (idx - Math.min(fileArray.length, 10) / 2) * 80),
        width: 160,
        height: 60,
        color: '#19B5FE',
        bgColor: '#FFFFFF',
      };
      childNodes.push(childNode);

      childEdges.push({
        id: `e-${Date.now()}-${idx}`,
        fromNodeId: folderNodeId,
        toNodeId: childId,
        color: '#19B5FE',
        style: defaultLineStyle,
      });
    });

    onNodesChange([...nodes, folderNode, ...childNodes]);
    onEdgesChange([...edges, ...childEdges]);
    onSelectNode(folderNodeId);
  };

  // Native Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      await processFilesToNodes(e.dataTransfer.files, worldPos.x, worldPos.y);
    }
  };

  // Trigger file input dialog
  const triggerUploadFile = (worldX: number, worldY: number) => {
    setUploadWorldCoords({ x: worldX, y: worldY });
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 10);
  };

  // Trigger folder input dialog
  const triggerUploadFolder = (worldX: number, worldY: number) => {
    setUploadWorldCoords({ x: worldX, y: worldY });
    setTimeout(() => {
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
        folderInputRef.current.click();
      }
    }, 10);
  };

  const targetNode = contextMenuPos?.targetNodeId
    ? nodes.find((n) => n.id === contextMenuPos.targetNodeId) || null
    : null;

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => handleContextMenu(e)}
      onDoubleClick={handleDoubleClickCanvas}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex-1 h-[calc(100vh-3.5rem)] overflow-hidden select-none outline-none ${
        gridStyle === 'dots'
          ? 'canvas-grid-dots'
          : gridStyle === 'lines'
          ? 'canvas-grid-lines'
          : 'bg-white'
      } ${isSpacePressed || panningState ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
    >
      {/* Hidden File Picker Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFilesToNodes(e.target.files, uploadWorldCoords.x, uploadWorldCoords.y);
          }
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFolderToNodes(e.target.files, uploadWorldCoords.x, uploadWorldCoords.y);
          }
        }}
      />

      {/* Drag Over Overlay Notice */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-[#19B5FE]/10 border-2 border-dashed border-[#19B5FE] z-40 flex items-center justify-center pointer-events-none backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white px-6 py-4 rounded-xl shadow-xl border border-sky-100 flex items-center gap-3 text-slate-800">
            <UploadCloud className="w-8 h-8 text-[#19B5FE] animate-bounce" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Drop files here to create nodes</p>
              <p className="text-xs text-slate-500">Automatically creates file nodes & image previews</p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-selection count indicator banner */}
      {selectedNodeIds.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-lg border border-slate-700 flex items-center gap-3 animate-in fade-in">
          <span>Selected {selectedNodeIds.length} nodes (Ctrl+A)</span>
          <button
            onClick={() => onDeleteNodes(selectedNodeIds)}
            className="text-rose-300 hover:text-white underline cursor-pointer font-semibold"
          >
            Delete all
          </button>
        </div>
      )}

      {/* Transformed Stage / Canvas Viewport */}
      <div
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 w-full h-full will-change-transform"
      >
        {/* SVG Connection Lines */}
        <ConnectionLines
          nodes={nodes}
          edges={edges}
          connectingState={connectingState}
          defaultLineStyle={defaultLineStyle}
          selectedEdgeId={selectedEdgeId}
          onSelectEdge={onSelectEdge}
        />

        {/* Nodes Layer */}
        {nodes.map((node) => {
          let isHidden = false;
          let currentParentId = node.parentId;
          while (currentParentId) {
            const pNode = nodes.find((n) => n.id === currentParentId);
            if (pNode?.isCollapsed) {
              isHidden = true;
              break;
            }
            currentParentId = pNode?.parentId;
          }

          if (isHidden) return null;

          const hasChildren = (childCountMap.get(node.id) || 0) > 0;
          const isSelected = selectedNodeIds.includes(node.id);

          return (
            <NodeComponent
              key={node.id}
              node={node}
              isSelected={isSelected}
              hasChildren={hasChildren}
              childCount={childCountMap.get(node.id) || 0}
              onSelect={(id, e) => {
                e.stopPropagation();
                onSelectNode(id, e.shiftKey || e.ctrlKey || e.metaKey);
                onSelectEdge(null);
              }}
              onStartDrag={handleStartNodeDrag}
              onStartConnect={handleStartConnect}
              onUpdateTitle={(id, title) => {
                onNodesChange(
                  nodes.map((n) => (n.id === id ? { ...n, title } : n))
                );
              }}
              onUpdateNote={(id, note) => {
                onNodesChange(
                  nodes.map((n) => (n.id === id ? { ...n, note } : n))
                );
              }}
              onAddChild={onAddChild}
              onToggleCollapse={handleToggleCollapse}
              onDeleteNode={(id) => onDeleteNodes([id])}
              onDuplicateNode={onDuplicateNode}
              onContextMenu={(nodeId, e) => handleContextMenu(e, nodeId)}
              onOpenFileViewer={onOpenFileViewer}
            />
          );
        })}
      </div>

      {/* Right-click Context Menu with quick search and reliable execution */}
      <ContextMenu
        position={contextMenuPos}
        targetNode={targetNode}
        allNodes={nodes}
        onClose={() => setContextMenuPos(null)}
        onAddNote={(worldX, worldY) => onAddNoteAt(worldX, worldY)}
        onAddNode={(worldX, worldY) => onQuickAddNodeAt(worldX, worldY)}
        onUploadFolder={(worldX, worldY) => triggerUploadFolder(worldX, worldY)}
        onUploadFile={(worldX, worldY) => triggerUploadFile(worldX, worldY)}
        onAddChild={onAddChild}
        onDuplicateNode={onDuplicateNode}
        onDeleteNode={(id) => onDeleteNodes([id])}
        onJumpToNode={onJumpToNode}
      />
    </main>
  );
};
