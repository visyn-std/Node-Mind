import React from 'react';
import { MindNode, MindEdge, ConnectingState, EdgeLineStyle } from '../types';
import { getNodeAnchors, getBestConnectionPoints, generateEdgePath, Point } from '../utils/geometry';

interface ConnectionLinesProps {
  nodes: MindNode[];
  edges: MindEdge[];
  connectingState: ConnectingState | null;
  defaultLineStyle?: EdgeLineStyle;
  selectedEdgeId?: string | null;
  onSelectEdge?: (edgeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  nodes,
  edges,
  connectingState,
  defaultLineStyle = 'curved',
  selectedEdgeId,
  onSelectEdge,
  onDeleteEdge,
}) => {
  const nodeMap = new Map<string, MindNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Determine hidden/collapsed nodes to hide their edges
  const collapsedParentIds = new Set<string>();
  nodes.forEach((n) => {
    if (n.isCollapsed) {
      collapsedParentIds.add(n.id);
    }
  });

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
      <defs>
        {/* Arrow Marker */}
        <marker
          id="arrowhead-primary"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#19B5FE" />
        </marker>
        <marker
          id="arrowhead-slate"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
        </marker>
        {/* Glow filter for active lines */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Render All Existing Edges */}
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.fromNodeId);
        const toNode = nodeMap.get(edge.toNodeId);

        if (!fromNode || !toNode) return null;

        // If fromNode is collapsed, skip rendering child lines
        if (fromNode.isCollapsed) return null;

        const { from, to, fromDir, toDir } = getBestConnectionPoints(fromNode, toNode);
        const style = edge.style || defaultLineStyle;
        const pathData = generateEdgePath(from, to, style, fromDir, toDir);
        const strokeColor = edge.color || fromNode.color || '#19B5FE';
        const isSelected = selectedEdgeId === edge.id;

        return (
          <g key={edge.id} className="group pointer-events-auto cursor-pointer">
            {/* Wider transparent hit-area for clicking / hovering */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEdge?.(edge.id);
              }}
            />

            {/* Background halo for contrast */}
            <path
              d={pathData}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
              className="opacity-70"
            />

            {/* Actual visible connection path */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? '#0284C7' : strokeColor}
              strokeWidth={isSelected ? 3.5 : edge.strokeWidth || 2.5}
              strokeLinecap="round"
              strokeDasharray={edge.animated ? '5,5' : 'none'}
              className="transition-all group-hover:stroke-[#0284C7] group-hover:stroke-[3.5px]"
            />

            {/* Small center dot or connector accent */}
            <circle
              cx={(from.x + to.x) / 2}
              cy={(from.y + to.y) / 2}
              r={isSelected ? 4 : 3}
              fill={strokeColor}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </g>
        );
      })}

      {/* Active Connecting Line (When user is dragging an anchor to create a connection) */}
      {connectingState && (() => {
        const fromNode = nodeMap.get(connectingState.fromNodeId);
        if (!fromNode) return null;

        const anchors = getNodeAnchors(fromNode);
        const fromPoint =
          connectingState.fromAnchor === 'top'
            ? anchors.top
            : connectingState.fromAnchor === 'right'
            ? anchors.right
            : connectingState.fromAnchor === 'bottom'
            ? anchors.bottom
            : anchors.left;

        const toPoint: Point = {
          x: connectingState.currentX,
          y: connectingState.currentY,
        };

        const activePath = generateEdgePath(
          fromPoint,
          toPoint,
          defaultLineStyle || 'curved',
          connectingState.fromAnchor,
          'left'
        );

        return (
          <g>
            <path
              d={activePath}
              fill="none"
              stroke="#19B5FE"
              strokeWidth="3"
              strokeDasharray="6,4"
              className="animate-pulse"
            />
            <circle cx={toPoint.x} cy={toPoint.y} r="5" fill="#19B5FE" />
          </g>
        );
      })()}
    </svg>
  );
};
