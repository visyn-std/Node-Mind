import { MindNode, MindEdge, EdgeLineStyle, LayoutAlgorithm } from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface NodeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Get anchors for a node (top, right, bottom, left centers)
 */
export function getNodeAnchors(node: MindNode) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  return {
    top: { x: cx, y: node.y },
    right: { x: node.x + node.width, y: cy },
    bottom: { x: cx, y: node.y + node.height },
    left: { x: node.x, y: cy },
    center: { x: cx, y: cy },
  };
}

/**
 * Determine best anchor points between fromNode and toNode
 */
export function getBestConnectionPoints(fromNode: MindNode, toNode: MindNode) {
  const fromAnchors = getNodeAnchors(fromNode);
  const toAnchors = getNodeAnchors(toNode);

  const dx = (toNode.x + toNode.width / 2) - (fromNode.x + fromNode.width / 2);
  const dy = (toNode.y + toNode.height / 2) - (fromNode.y + fromNode.height / 2);

  // If mostly horizontal displacement
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { from: fromAnchors.right, to: toAnchors.left, fromDir: 'right', toDir: 'left' };
    } else {
      return { from: fromAnchors.left, to: toAnchors.right, fromDir: 'left', toDir: 'right' };
    }
  } else {
    // Mostly vertical displacement
    if (dy >= 0) {
      return { from: fromAnchors.bottom, to: toAnchors.top, fromDir: 'bottom', toDir: 'top' };
    } else {
      return { from: fromAnchors.top, to: toAnchors.bottom, fromDir: 'top', toDir: 'bottom' };
    }
  }
}

/**
 * Generate SVG Path string for edge line
 */
export function generateEdgePath(
  from: Point,
  to: Point,
  style: EdgeLineStyle | string = 'curved',
  fromDir: string = 'right',
  toDir: string = 'left'
): string {
  if (style === 'straight') {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  if (style === 'step') {
    const midX = from.x + (to.x - from.x) / 2;
    return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
  }

  // Smooth Bezier Curve (Default)
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(Math.max(distance * 0.45, 40), 200);

  let cp1x = from.x;
  let cp1y = from.y;
  let cp2x = to.x;
  let cp2y = to.y;

  if (fromDir === 'right') cp1x += curvature;
  else if (fromDir === 'left') cp1x -= curvature;
  else if (fromDir === 'top') cp1y -= curvature;
  else if (fromDir === 'bottom') cp1y += curvature;

  if (toDir === 'left') cp2x -= curvature;
  else if (toDir === 'right') cp2x += curvature;
  else if (toDir === 'top') cp2y -= curvature;
  else if (toDir === 'bottom') cp2y += curvature;

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
}

/**
 * Calculate bounding box of all nodes in diagram
 */
export function calculateDiagramBounds(nodes: MindNode[], padding = 100): NodeBounds {
  if (!nodes || nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 800, width: 1000, height: 800, centerX: 500, centerY: 400 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = Math.max(maxX - minX, 200);
  const height = Math.max(maxY - minY, 200);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Auto-layout algorithm: Clean Tree / Mindmap layout
 */
export function applyAutoLayout(
  nodes: MindNode[],
  edges: MindEdge[],
  layoutType: LayoutAlgorithm = 'tree-right'
): MindNode[] {
  if (nodes.length === 0) return nodes;

  const nodeMap = new Map<string, MindNode>();
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  nodes.forEach((n) => {
    nodeMap.set(n.id, { ...n });
    childrenMap.set(n.id, []);
  });

  // Find parent-child relationships from edges and parentId
  edges.forEach((edge) => {
    if (nodeMap.has(edge.fromNodeId) && nodeMap.has(edge.toNodeId)) {
      childrenMap.get(edge.fromNodeId)?.push(edge.toNodeId);
      if (!parentMap.has(edge.toNodeId)) {
        parentMap.set(edge.toNodeId, edge.fromNodeId);
      }
    }
  });

  nodes.forEach((n) => {
    if (n.parentId && nodeMap.has(n.parentId)) {
      const list = childrenMap.get(n.parentId) || [];
      if (!list.includes(n.id)) {
        list.push(n.id);
        childrenMap.set(n.parentId, list);
      }
      if (!parentMap.has(n.id)) {
        parentMap.set(n.id, n.parentId);
      }
    }
  });

  // Identify root nodes (nodes with no incoming parent)
  let rootNodes = nodes.filter((n) => n.isRoot || !parentMap.has(n.id));
  if (rootNodes.length === 0) {
    rootNodes = [nodes[0]];
  }

  const updatedNodes = new Map<string, MindNode>();
  nodes.forEach((n) => updatedNodes.set(n.id, { ...n }));

  if (layoutType === 'radial') {
    // Radial distribution around first root node
    const root = rootNodes[0];
    const rootX = 500;
    const rootY = 400;
    const rootNode = updatedNodes.get(root.id)!;
    rootNode.x = rootX - rootNode.width / 2;
    rootNode.y = rootY - rootNode.height / 2;

    const children = childrenMap.get(root.id) || [];
    const radius = 280;
    const angleStep = (2 * Math.PI) / Math.max(children.length, 1);

    children.forEach((childId, idx) => {
      const childNode = updatedNodes.get(childId);
      if (childNode) {
        const angle = idx * angleStep;
        childNode.x = rootX + Math.cos(angle) * radius - childNode.width / 2;
        childNode.y = rootY + Math.sin(angle) * radius - childNode.height / 2;

        // Grandchildren
        const grandChildren = childrenMap.get(childId) || [];
        const grandRadius = radius + 220;
        const subAngleSpread = 0.5;
        grandChildren.forEach((gId, gIdx) => {
          const gNode = updatedNodes.get(gId);
          if (gNode) {
            const subOffset = (gIdx - (grandChildren.length - 1) / 2) * (subAngleSpread / Math.max(grandChildren.length, 1));
            const gAngle = angle + subOffset;
            gNode.x = rootX + Math.cos(gAngle) * grandRadius - gNode.width / 2;
            gNode.y = rootY + Math.sin(gAngle) * grandRadius - gNode.height / 2;
          }
        });
      }
    });

    return Array.from(updatedNodes.values());
  }

  // Default: Smart Mindmap Tree (Horizontal bidirectional or right-facing tree)
  const root = rootNodes[0];
  const startX = 450;
  let currentY = 150;
  const hGap = 280;
  const vGap = 80;

  // Split direct children into Right side (and Left side if symmetrical)
  const directChildren = childrenMap.get(root.id) || [];
  const rightChildren = directChildren.slice(0, Math.ceil(directChildren.length / 2));
  const leftChildren = directChildren.slice(Math.ceil(directChildren.length / 2));

  // Layout Right Subtree
  let rightY = currentY;
  function layoutSubtreeRight(nodeId: string, depth: number): number {
    const node = updatedNodes.get(nodeId);
    if (!node) return rightY;
    const children = childrenMap.get(nodeId) || [];

    node.x = startX + depth * hGap;

    if (children.length === 0) {
      node.y = rightY;
      rightY += node.height + vGap;
      return node.y;
    }

    const firstY = rightY;
    const childYs: number[] = [];
    children.forEach((cId) => {
      childYs.push(layoutSubtreeRight(cId, depth + 1));
    });

    // Center parent relative to children
    const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;
    node.y = avgY;
    return avgY;
  }

  // Layout Left Subtree
  let leftY = currentY;
  function layoutSubtreeLeft(nodeId: string, depth: number): number {
    const node = updatedNodes.get(nodeId);
    if (!node) return leftY;
    const children = childrenMap.get(nodeId) || [];

    node.x = startX - depth * hGap - node.width;

    if (children.length === 0) {
      node.y = leftY;
      leftY += node.height + vGap;
      return node.y;
    }

    const childYs: number[] = [];
    children.forEach((cId) => {
      childYs.push(layoutSubtreeLeft(cId, depth + 1));
    });

    const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;
    node.y = avgY;
    return avgY;
  }

  rightChildren.forEach((cId) => layoutSubtreeRight(cId, 1));
  leftChildren.forEach((cId) => layoutSubtreeLeft(cId, 1));

  // Position root node in vertical center
  const rootNode = updatedNodes.get(root.id);
  if (rootNode) {
    rootNode.x = startX - rootNode.width / 2;
    const maxY = Math.max(rightY, leftY, 400);
    rootNode.y = (currentY + maxY) / 2 - rootNode.height / 2;
  }

  return Array.from(updatedNodes.values());
}
