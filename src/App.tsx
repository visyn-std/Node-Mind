import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MindNode,
  MindEdge,
  Diagram,
  Viewport,
  EdgeLineStyle,
} from './types';
import {
  getSavedDiagrams,
  saveDiagrams,
  getActiveDiagramId,
  setActiveDiagramId,
  exportDiagramAsJSON,
  createNewDiagram,
} from './utils/storage';
import { calculateDiagramBounds } from './utils/geometry';
import { TopBar } from './components/TopBar';
import { Canvas } from './components/Canvas';
import { DetailPanel } from './components/DetailPanel';
import { FileViewerModal } from './components/FileViewerModal';
import { UploadJSONModal } from './components/UploadJSONModal';

export function App() {
  // Diagrams State
  const [diagrams, setDiagrams] = useState<Diagram[]>(() => getSavedDiagrams());
  const [activeDiagramIdState, setActiveDiagramIdState] = useState<string>(() =>
    getActiveDiagramId()
  );

  // Active Diagram
  const activeDiagram =
    diagrams.find((d) => d.id === activeDiagramIdState) || diagrams[0] || createNewDiagram();

  // Selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Canvas Viewport & UI Panels
  const [viewport, setViewport] = useState<Viewport>(() =>
    activeDiagram.viewport || { x: 200, y: 200, zoom: 1 }
  );
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);
  const [gridStyle, setGridStyle] = useState<'dots' | 'lines' | 'clean'>(() =>
    activeDiagram.gridStyle || 'dots'
  );
  const [lineStyle] = useState<EdgeLineStyle>(() =>
    activeDiagram.defaultLineStyle || 'curved'
  );

  // Modal states
  const [fileViewerNode, setFileViewerNode] = useState<MindNode | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1200, height: 800 });

  // Undo / Redo History stack per active diagram
  const [history, setHistory] = useState<{ nodes: MindNode[]; edges: MindEdge[] }[]>([
    { nodes: activeDiagram.nodes, edges: activeDiagram.edges },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isHistoryActionRef = useRef(false);

  // Sync active diagram changes to storage
  useEffect(() => {
    saveDiagrams(diagrams);
  }, [diagrams]);

  // Sync active diagram ID
  useEffect(() => {
    if (activeDiagram?.id) {
      setActiveDiagramId(activeDiagram.id);
    }
  }, [activeDiagram?.id]);

  // Diagram Switcher handlers
  const handleSelectDiagram = useCallback((id: string) => {
    setDiagrams((prev) => {
      const target = prev.find((d) => d.id === id);
      if (!target) return prev;
      setActiveDiagramIdState(id);
      setSelectedNodeIds([]);
      setSelectedEdgeId(null);
      setViewport(target.viewport || { x: 200, y: 200, zoom: 1 });
      setGridStyle(target.gridStyle || 'dots');
      setHistory([{ nodes: target.nodes, edges: target.edges }]);
      setHistoryIndex(0);
      return prev;
    });
  }, []);

  const handleCreateDiagram = useCallback(() => {
    const newDiag = createNewDiagram(`New Mind Map ${diagrams.length + 1}`);
    setDiagrams((prev) => [newDiag, ...prev]);
    setActiveDiagramIdState(newDiag.id);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setViewport(newDiag.viewport);
    setGridStyle('dots');
    setHistory([{ nodes: newDiag.nodes, edges: newDiag.edges }]);
    setHistoryIndex(0);
  }, [diagrams.length]);

  const handleDuplicateDiagram = useCallback((id: string) => {
    setDiagrams((prev) => {
      const source = prev.find((d) => d.id === id);
      if (!source) return prev;

      const dupDiag: Diagram = {
        ...JSON.parse(JSON.stringify(source)),
        id: `diagram-${Date.now()}`,
        title: `${source.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setActiveDiagramIdState(dupDiag.id);
      setSelectedNodeIds([]);
      setSelectedEdgeId(null);
      return [dupDiag, ...prev];
    });
  }, []);

  const handleDeleteDiagram = useCallback((id: string) => {
    setDiagrams((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((d) => d.id !== id);
      if (activeDiagramIdState === id) {
        setActiveDiagramIdState(remaining[0].id);
        setSelectedNodeIds([]);
        setViewport(remaining[0].viewport || { x: 200, y: 200, zoom: 1 });
      }
      return remaining;
    });
  }, [activeDiagramIdState]);

  const handleUpdateDiagramTitle = useCallback((title: string) => {
    setDiagrams((prev) =>
      prev.map((d) => (d.id === activeDiagramIdState ? { ...d, title, updatedAt: Date.now() } : d))
    );
  }, [activeDiagramIdState]);

  // Stable helper to update active diagram nodes / edges and push to history
  const updateCurrentDiagram = useCallback(
    (
      updater: (prev: Diagram) => Diagram,
      recordHistory = true
    ) => {
      setDiagrams((prevList) => {
        const target = prevList.find((d) => d.id === activeDiagramIdState);
        if (!target) return prevList;
        const next = updater(target);

        if (recordHistory && !isHistoryActionRef.current) {
          setHistory((hPrev) => {
            const trimmed = hPrev.slice(0, historyIndex + 1);
            return [...trimmed, { nodes: next.nodes, edges: next.edges }];
          });
          setHistoryIndex((prev) => prev + 1);
        }

        return prevList.map((d) =>
          d.id === activeDiagramIdState ? { ...next, updatedAt: Date.now() } : d
        );
      });
    },
    [activeDiagramIdState, historyIndex]
  );

  // Nodes change
  const handleNodesChange = useCallback(
    (nodes: MindNode[]) => {
      updateCurrentDiagram((prev) => ({ ...prev, nodes }));
    },
    [updateCurrentDiagram]
  );

  // Edge changes
  const handleEdgesChange = useCallback(
    (edges: MindEdge[]) => {
      updateCurrentDiagram((prev) => ({ ...prev, edges }));
    },
    [updateCurrentDiagram]
  );

  // Select node helper
  const handleSelectNode = useCallback((nodeId: string | null, isMulti = false) => {
    if (!nodeId) {
      setSelectedNodeIds([]);
      return;
    }
    if (isMulti) {
      setSelectedNodeIds((prev) =>
        prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
      );
    } else {
      setSelectedNodeIds([nodeId]);
    }
  }, []);

  const handleSelectAllNodes = useCallback(() => {
    setSelectedNodeIds(activeDiagram.nodes.map((n) => n.id));
  }, [activeDiagram.nodes]);

  const handleClearSelection = useCallback(() => {
    setSelectedNodeIds([]);
  }, []);

  // Delete multiple or single nodes & their connected edges
  const handleDeleteNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      updateCurrentDiagram((prev) => {
        const nextNodes = prev.nodes.filter((n) => !nodeIds.includes(n.id));
        const nextEdges = prev.edges.filter(
          (e) => !nodeIds.includes(e.fromNodeId) && !nodeIds.includes(e.toNodeId)
        );
        return { ...prev, nodes: nextNodes, edges: nextEdges };
      });
      setSelectedNodeIds((prev) => prev.filter((id) => !nodeIds.includes(id)));
    },
    [updateCurrentDiagram]
  );

  // Duplicate specific node
  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const sourceNode = activeDiagram.nodes.find((n) => n.id === nodeId);
      if (!sourceNode) return;

      const newId = `node-${Date.now()}`;
      const newNode: MindNode = {
        ...JSON.parse(JSON.stringify(sourceNode)),
        id: newId,
        title: `${sourceNode.title} (Copy)`,
        x: sourceNode.x + 40,
        y: sourceNode.y + 40,
        isRoot: false,
      };

      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));
      setSelectedNodeIds([newId]);
    },
    [activeDiagram.nodes, updateCurrentDiagram]
  );

  // Add child node connected to parent
  const handleAddChild = useCallback(
    (parentNodeId: string) => {
      const parentNode = activeDiagram.nodes.find((n) => n.id === parentNodeId);
      if (!parentNode) return;

      const existingChildren = activeDiagram.nodes.filter(
        (n) =>
          n.parentId === parentNodeId ||
          activeDiagram.edges.some((e) => e.fromNodeId === parentNodeId && e.toNodeId === n.id)
      );

      const childIndex = existingChildren.length;
      const isLeftSide = parentNode.x < 300 && !parentNode.isRoot;

      const offsetX = isLeftSide ? -240 : 240;
      const offsetY = (childIndex - Math.floor(existingChildren.length / 2)) * 80;

      const childId = `node-${Date.now()}`;
      const childNode: MindNode = {
        id: childId,
        title: `New Branch ${existingChildren.length + 1}`,
        note: '',
        nodeType: 'node',
        x: parentNode.x + offsetX,
        y: parentNode.y + offsetY,
        width: 170,
        height: 60,
        color: '#19B5FE',
        bgColor: '#FFFFFF',
        shape: 'rounded',
        parentId: parentNodeId,
      };

      const newEdge: MindEdge = {
        id: `e-${Date.now()}`,
        fromNodeId: parentNodeId,
        toNodeId: childId,
        color: '#19B5FE',
        style: lineStyle,
      };

      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: [...prev.nodes, childNode],
        edges: [...prev.edges, newEdge],
      }));

      setSelectedNodeIds([childId]);
    },
    [activeDiagram.edges, activeDiagram.nodes, lineStyle, updateCurrentDiagram]
  );

  // Quick add root or standalone node
  const handleAddRootNode = useCallback(() => {
    const bounds = calculateDiagramBounds(activeDiagram.nodes);
    const newId = `node-${Date.now()}`;
    const newNode: MindNode = {
      id: newId,
      title: 'New Idea',
      note: '',
      nodeType: 'node',
      x: bounds.maxX + 80,
      y: bounds.centerY - 30,
      width: 180,
      height: 60,
      color: '#19B5FE',
      bgColor: '#FFFFFF',
      shape: 'rounded',
    };

    updateCurrentDiagram((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setSelectedNodeIds([newId]);
  }, [activeDiagram.nodes, updateCurrentDiagram]);

  // Quick add node at exact world position
  const handleQuickAddNodeAt = useCallback(
    (worldX: number, worldY: number) => {
      const newId = `node-${Date.now()}`;
      const newNode: MindNode = {
        id: newId,
        title: 'New Node',
        note: '',
        nodeType: 'node',
        x: Math.round(worldX - 85),
        y: Math.round(worldY - 30),
        width: 170,
        height: 60,
        color: '#19B5FE',
        bgColor: '#FFFFFF',
        shape: 'rounded',
      };

      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));
      setSelectedNodeIds([newId]);
    },
    [updateCurrentDiagram]
  );

  // Quick add note at exact world position
  const handleQuickAddNoteAt = useCallback(
    (worldX: number, worldY: number) => {
      const newId = `node-${Date.now()}`;
      const newNoteNode: MindNode = {
        id: newId,
        title: 'Sticky Note',
        note: '',
        nodeType: 'note',
        x: Math.round(worldX - 100),
        y: Math.round(worldY - 60),
        width: 200,
        height: 120,
        color: '#F59E0B',
        bgColor: '#FEFCE8',
        shape: 'rounded',
      };

      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNoteNode],
      }));
      setSelectedNodeIds([newId]);
    },
    [updateCurrentDiagram]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 2.5),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom * 0.8, 0.25),
    }));
  }, []);

  const handleResetZoom = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: 1,
    }));
  }, []);

  const handleFitView = useCallback(() => {
    if (activeDiagram.nodes.length === 0) return;
    const bounds = calculateDiagramBounds(activeDiagram.nodes, 100);
    const scaleX = (canvasDimensions.width - 120) / bounds.width;
    const scaleY = (canvasDimensions.height - 120) / bounds.height;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.5);

    const newX = canvasDimensions.width / 2 - bounds.centerX * newZoom;
    const newY = canvasDimensions.height / 2 - bounds.centerY * newZoom;

    setViewport({
      x: newX,
      y: newY,
      zoom: newZoom,
    });
  }, [activeDiagram.nodes, canvasDimensions.height, canvasDimensions.width]);

  // Focus on a specific node
  const handleFocusNode = useCallback(
    (node: MindNode) => {
      const nodeCenterX = node.x + (node.width || 160) / 2;
      const nodeCenterY = node.y + (node.height || 60) / 2;

      setViewport((prev) => ({
        ...prev,
        x: canvasDimensions.width / 2 - nodeCenterX * prev.zoom,
        y: canvasDimensions.height / 2 - nodeCenterY * prev.zoom,
      }));
      setSelectedNodeIds([node.id]);
    },
    [canvasDimensions.height, canvasDimensions.width]
  );

  // Undo / Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    isHistoryActionRef.current = true;
    const targetSnapshot = history[historyIndex - 1];
    setHistoryIndex((prev) => prev - 1);
    updateCurrentDiagram((prev) => ({
      ...prev,
      nodes: targetSnapshot.nodes,
      edges: targetSnapshot.edges,
    }), false);
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 50);
  }, [history, historyIndex, updateCurrentDiagram]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isHistoryActionRef.current = true;
    const targetSnapshot = history[historyIndex + 1];
    setHistoryIndex((prev) => prev + 1);
    updateCurrentDiagram((prev) => ({
      ...prev,
      nodes: targetSnapshot.nodes,
      edges: targetSnapshot.edges,
    }), false);
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 50);
  }, [history, historyIndex, updateCurrentDiagram]);

  // Single Selected Node for Inspector
  const singleSelectedNode =
    selectedNodeIds.length === 1
      ? activeDiagram.nodes.find((n) => n.id === selectedNodeIds[0]) || null
      : null;

  // Inspector property updaters
  const handleUpdateNodeTitle = useCallback(
    (nodeId: string, title: string) => {
      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, title } : n)),
      }));
    },
    [updateCurrentDiagram]
  );

  const handleUpdateNodeNote = useCallback(
    (nodeId: string, note: string) => {
      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, note } : n)),
      }));
    },
    [updateCurrentDiagram]
  );

  const handleUpdateNodeColor = useCallback(
    (nodeId: string, color: string) => {
      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, color } : n)),
      }));
    },
    [updateCurrentDiagram]
  );

  const handleUpdateNodeBgColor = useCallback(
    (nodeId: string, bgColor: string) => {
      updateCurrentDiagram((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, bgColor } : n)),
      }));
    },
    [updateCurrentDiagram]
  );

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleUndo]);

  // Handle JSON Import
  const handleImportJSON = useCallback(
    (importedDiagram: Diagram, mode: 'new' | 'replace') => {
      if (mode === 'new') {
        setDiagrams((prev) => [importedDiagram, ...prev]);
        setActiveDiagramIdState(importedDiagram.id);
        setSelectedNodeIds([]);
        setViewport(importedDiagram.viewport || { x: 200, y: 200, zoom: 1 });
      } else {
        setDiagrams((prev) =>
          prev.map((d) =>
            d.id === activeDiagramIdState ? { ...importedDiagram, id: activeDiagramIdState } : d
          )
        );
        setViewport(importedDiagram.viewport || { x: 200, y: 200, zoom: 1 });
      }
    },
    [activeDiagramIdState]
  );

  // Stabilized canvas dimensions handler to prevent infinite re-renders
  const handleCanvasSizeChange = useCallback((width: number, height: number) => {
    setCanvasDimensions((prev) => {
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-slate-900 select-none">
      {/* Top Bar with diagrams switcher, toolbar, export/upload and right panel toggle */}
      <TopBar
        diagramTitle={activeDiagram.title}
        onUpdateTitle={handleUpdateDiagramTitle}
        onAddNode={handleAddRootNode}
        viewport={viewport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExportClick={() => exportDiagramAsJSON(activeDiagram)}
        onUploadClick={() => setIsUploadModalOpen(true)}
        isDetailPanelOpen={isDetailPanelOpen}
        onToggleDetailPanel={() => setIsDetailPanelOpen((prev) => !prev)}
        gridStyle={gridStyle}
        onGridStyleChange={(style) => {
          setGridStyle(style);
          updateCurrentDiagram((prev) => ({ ...prev, gridStyle: style }), false);
        }}
        diagrams={diagrams}
        activeDiagramId={activeDiagram.id}
        onSelectDiagram={handleSelectDiagram}
        onCreateDiagram={handleCreateDiagram}
        onDuplicateDiagram={handleDuplicateDiagram}
        onDeleteDiagram={handleDeleteDiagram}
      />

      {/* Main Workspace Layout (Full Canvas + Right Detail Panel) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Center: Interactive Node-based Drag-and-Drop Canvas */}
        <Canvas
          nodes={activeDiagram.nodes}
          edges={activeDiagram.edges}
          viewport={viewport}
          setViewport={setViewport}
          selectedNodeIds={selectedNodeIds}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={handleSelectNode}
          onSelectAllNodes={handleSelectAllNodes}
          onClearSelection={handleClearSelection}
          onSelectEdge={setSelectedEdgeId}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onAddChild={handleAddChild}
          onQuickAddNodeAt={handleQuickAddNodeAt}
          onAddNoteAt={handleQuickAddNoteAt}
          onDeleteNodes={handleDeleteNodes}
          onDuplicateNode={handleDuplicateNode}
          onOpenFileViewer={(node) => setFileViewerNode(node)}
          onJumpToNode={handleFocusNode}
          defaultLineStyle={lineStyle}
          gridStyle={gridStyle}
          onCanvasSizeChange={handleCanvasSizeChange}
        />

        {/* Right Detail / Inspector Panel */}
        {isDetailPanelOpen && (
          <DetailPanel
            selectedNode={singleSelectedNode}
            nodes={activeDiagram.nodes}
            edges={activeDiagram.edges}
            viewport={viewport}
            canvasWidth={canvasDimensions.width}
            canvasHeight={canvasDimensions.height}
            onClose={() => setIsDetailPanelOpen(false)}
            onUpdateTitle={handleUpdateNodeTitle}
            onUpdateNote={handleUpdateNodeNote}
            onUpdateColor={handleUpdateNodeColor}
            onUpdateBgColor={handleUpdateNodeBgColor}
            onDeleteNode={(id) => handleDeleteNodes([id])}
            onDuplicateNode={handleDuplicateNode}
            onAddChild={handleAddChild}
            onPanTo={(x, y) => setViewport((prev) => ({ ...prev, x, y }))}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
            onOpenFileViewer={(node) => setFileViewerNode(node)}
          />
        )}
      </div>

      {/* Full Preview Modal on Double Click on Files/Folders */}
      <FileViewerModal
        node={fileViewerNode}
        onClose={() => setFileViewerNode(null)}
      />

      {/* Upload JSON Modal */}
      <UploadJSONModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImport={handleImportJSON}
      />
    </div>
  );
}

export default App;
