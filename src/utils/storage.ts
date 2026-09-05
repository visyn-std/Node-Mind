import { Diagram, MindNode, MindEdge } from '../types';
import { INITIAL_DIAGRAMS } from './sampleData';

const STORAGE_KEY = 'nodemind_diagrams_v2';
const ACTIVE_DIAGRAM_KEY = 'nodemind_active_diagram_id_v2';

export function getSavedDiagrams(): Diagram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading diagrams from storage', e);
  }
  // Default to samples
  saveDiagrams(INITIAL_DIAGRAMS);
  return INITIAL_DIAGRAMS;
}

export function saveDiagrams(diagrams: Diagram[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
  } catch (e) {
    console.error('Error saving diagrams to storage', e);
  }
}

export function getActiveDiagramId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_DIAGRAM_KEY);
    if (id) return id;
  } catch (e) {
    console.error(e);
  }
  return INITIAL_DIAGRAMS[0].id;
}

export function setActiveDiagramId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_DIAGRAM_KEY, id);
  } catch (e) {
    console.error(e);
  }
}

export function exportDiagramAsJSON(diagram: Diagram): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(diagram, null, 2));
  const downloadAnchor = document.createElement('a');
  const filename = `${diagram.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_mindmap.json`;
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseImportedJSON(jsonString: string): Diagram | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.title && !data.nodes) {
      throw new Error('Invalid mind map JSON structure.');
    }

    const diagram: Diagram = {
      id: data.id || `diagram-${Date.now()}`,
      title: data.title || 'New Mind Map',
      description: data.description || '',
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now(),
      gridStyle: data.gridStyle || 'dots',
      defaultLineStyle: data.defaultLineStyle || 'curved',
      viewport: data.viewport || { x: 200, y: 200, zoom: 1 },
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
      category: data.category || 'Uploaded',
      tags: data.tags || [],
    };

    // Validate node geometry sanity
    diagram.nodes = diagram.nodes.map((node: MindNode, index: number) => ({
      ...node,
      id: node.id || `node-${Date.now()}-${index}`,
      title: node.title || `Node ${index + 1}`,
      x: typeof node.x === 'number' ? node.x : 200 + (index % 4) * 180,
      y: typeof node.y === 'number' ? node.y : 200 + Math.floor(index / 4) * 120,
      width: node.width || 180,
      height: node.height || 64,
      color: node.color || '#19B5FE',
      bgColor: node.bgColor || '#FFFFFF',
      shape: node.shape || 'rounded',
    }));

    return diagram;
  } catch (err) {
    console.error('Error parsing JSON file:', err);
    return null;
  }
}

export function createNewDiagram(title = 'New Mind Map'): Diagram {
  const rootId = `root-${Date.now()}`;
  return {
    id: `diagram-${Date.now()}`,
    title,
    description: 'Created with NodeMind',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    gridStyle: 'dots',
    defaultLineStyle: 'curved',
    viewport: { x: 300, y: 250, zoom: 1 },
    nodes: [
      {
        id: rootId,
        title: '💡 Central Idea',
        note: 'Double-click to edit or drag anchors to connect ideas.',
        x: 400,
        y: 280,
        width: 220,
        height: 76,
        color: '#19B5FE',
        bgColor: '#FFFFFF',
        shape: 'rounded',
        isRoot: true,
        priority: 'high',
        status: 'in_progress',
        tags: ['Root'],
        fontWeight: 'bold',
      },
      {
        id: `node-${Date.now()}-1`,
        title: '📌 Sub-Topic 1',
        note: 'Details for sub-topic 1.',
        x: 720,
        y: 200,
        width: 190,
        height: 60,
        color: '#19B5FE',
        parentId: rootId,
        tags: ['Idea'],
      },
      {
        id: `node-${Date.now()}-2`,
        title: '📌 Sub-Topic 2',
        note: 'Details for sub-topic 2.',
        x: 720,
        y: 360,
        width: 190,
        height: 60,
        color: '#19B5FE',
        parentId: rootId,
        tags: ['Idea'],
      }
    ],
    edges: [
      { id: `e-${Date.now()}-1`, fromNodeId: rootId, toNodeId: `node-${Date.now()}-1`, color: '#19B5FE', style: 'curved' },
      { id: `e-${Date.now()}-2`, fromNodeId: rootId, toNodeId: `node-${Date.now()}-2`, color: '#19B5FE', style: 'curved' },
    ]
  };
}
