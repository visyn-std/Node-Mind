import React, { useRef } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { MindNode, MindEdge, Viewport } from '../types';
import { calculateDiagramBounds, getBestConnectionPoints, generateEdgePath } from '../utils/geometry';

interface MinimapProps {
  nodes: MindNode[];
  edges: MindEdge[];
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  onPanTo: (x: number, y: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  edges,
  viewport,
  canvasWidth,
  canvasHeight,
  onPanTo,
  onZoomIn,
  onZoomOut,
  onFitView,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate diagram bounding box with padding
  const bounds = calculateDiagramBounds(nodes, 250);

  // Minimap dimensions in the panel
  const mapWidth = 240;
  const mapHeight = 150;

  // Scale diagram bounds to fit into minimap box
  const scaleX = mapWidth / bounds.width;
  const scaleY = mapHeight / bounds.height;
  const mapScale = Math.min(scaleX, scaleY);

  const offsetX = (mapWidth - bounds.width * mapScale) / 2;
  const offsetY = (mapHeight - bounds.height * mapScale) / 2;

  // Transform world coordinate to minimap coordinate
  const toMapX = (worldX: number) => (worldX - bounds.minX) * mapScale + offsetX;
  const toMapY = (worldY: number) => (worldY - bounds.minY) * mapScale + offsetY;

  // Calculate viewport box in minimap coordinates
  const viewWorldX = -viewport.x / viewport.zoom;
  const viewWorldY = -viewport.y / viewport.zoom;
  const viewWorldW = (canvasWidth || 800) / viewport.zoom;
  const viewWorldH = (canvasHeight || 600) / viewport.zoom;

  const viewMapX = toMapX(viewWorldX);
  const viewMapY = toMapY(viewWorldY);
  const viewMapW = viewWorldW * mapScale;
  const viewMapH = viewWorldH * mapScale;

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert click in minimap back to world coordinates
    const targetWorldX = (clickX - offsetX) / mapScale + bounds.minX;
    const targetWorldY = (clickY - offsetY) / mapScale + bounds.minY;

    // Pan so clicked world point is centered on screen
    const newViewportX = (canvasWidth || 800) / 2 - targetWorldX * viewport.zoom;
    const newViewportY = (canvasHeight || 600) / 2 - targetWorldY * viewport.zoom;

    onPanTo(newViewportX, newViewportY);
  };

  const nodeMap = new Map<string, MindNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  return (
    <div className="bg-transparent space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Minimap
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={onFitView}
            title="Fit View"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Minimap SVG Frame */}
      <div
        ref={containerRef}
        onClick={handleMinimapClick}
        style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
        className="relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-crosshair shadow-2xs group hover:border-[#19B5FE]/50 transition-colors mx-auto"
      >
        <svg
          width={mapWidth}
          height={mapHeight}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Render Connections */}
          {edges.map((edge) => {
            const from = nodeMap.get(edge.fromNodeId);
            const to = nodeMap.get(edge.toNodeId);
            if (!from || !to) return null;
            if (from.isCollapsed) return null;

            const fromPt = {
              x: toMapX(from.x + (from.width || 160) / 2),
              y: toMapY(from.y + (from.height || 60) / 2),
            };
            const toPt = {
              x: toMapX(to.x + (to.width || 160) / 2),
              y: toMapY(to.y + (to.height || 60) / 2),
            };

            return (
              <line
                key={edge.id}
                x1={fromPt.x}
                y1={fromPt.y}
                x2={toPt.x}
                y2={toPt.y}
                stroke="#19B5FE"
                strokeWidth="1.2"
                strokeOpacity="0.5"
              />
            );
          })}

          {/* Render Nodes as mini boxes */}
          {nodes.map((node) => {
            const nx = toMapX(node.x);
            const ny = toMapY(node.y);
            const nw = Math.max(4, (node.width || 160) * mapScale);
            const nh = Math.max(3, (node.height || 60) * mapScale);
            const isNote = node.nodeType === 'note';

            return (
              <rect
                key={node.id}
                x={nx}
                y={ny}
                width={nw}
                height={nh}
                rx={1.5}
                fill={node.color || (isNote ? '#F59E0B' : '#19B5FE')}
                stroke="#FFFFFF"
                strokeWidth="0.5"
                className="opacity-90"
              />
            );
          })}
        </svg>

        {/* Viewport Frame Box */}
        <div
          style={{
            left: `${Math.max(-20, viewMapX)}px`,
            top: `${Math.max(-20, viewMapY)}px`,
            width: `${Math.max(12, viewMapW)}px`,
            height: `${Math.max(12, viewMapH)}px`,
          }}
          className="absolute border border-[#19B5FE] bg-[#19B5FE]/10 rounded pointer-events-none transition-all shadow-xs"
        />
      </div>
    </div>
  );
};
