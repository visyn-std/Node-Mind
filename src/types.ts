export type NodeShape = 'rounded' | 'rectangle' | 'pill' | 'diamond' | 'hexagon';
export type NodePriority = 'none' | 'low' | 'medium' | 'high';
export type NodeStatus = 'none' | 'todo' | 'in_progress' | 'done';
export type EdgeLineStyle = 'curved' | 'straight' | 'step';
export type NodeType = 'node' | 'note' | 'file' | 'folder';

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  url?: string;
  isImage?: boolean;
  previewUrl?: string;
  itemCount?: number;
}

export interface MindNode {
  id: string;
  title: string;
  note?: string;
  nodeType?: NodeType;
  fileData?: FileAttachment;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // Accent color hex
  bgColor?: string; // Card background hex
  textColor?: string;
  borderColor?: string;
  shape?: NodeShape;
  parentId?: string | null;
  tags?: string[];
  priority?: NodePriority;
  status?: NodeStatus;
  icon?: string;
  isCollapsed?: boolean;
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  url?: string;
  isRoot?: boolean;
}

export interface MindEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style?: EdgeLineStyle;
  color?: string;
  animated?: boolean;
  arrow?: boolean;
  strokeWidth?: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Diagram {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  nodes: MindNode[];
  edges: MindEdge[];
  viewport: Viewport;
  category?: string;
  tags?: string[];
  gridStyle?: 'dots' | 'lines' | 'clean';
  defaultLineStyle?: EdgeLineStyle;
}

export interface ConnectingState {
  fromNodeId: string;
  fromAnchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  currentX: number;
  currentY: number;
}

export interface DraggingNodeState {
  nodeId: string;
  startX: number;
  startY: number;
  initialNodePositions: { id: string; x: number; y: number }[];
  isGroupDrag?: boolean;
}

export interface PanningState {
  startX: number;
  startY: number;
  initialViewportX: number;
  initialViewportY: number;
}

export type LayoutAlgorithm = 'tree-right' | 'tree-left' | 'radial' | 'vertical-tree' | 'grid';
