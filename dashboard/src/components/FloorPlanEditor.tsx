import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';

interface GraphData {
  nodes: Record<string, { label: string; x?: number; y?: number }>;
  edges: Array<{ from: string; to: string; weight: number; label?: string }>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FloorPlanEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [venueName, setVenueName] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeLabel, setNodeLabel] = useState('');

  // Load existing venue data
  const loadVenue = async (name) => {
    try {
      const response = await axios.get(`${API_URL}/api/venues/${name}`);
      if (response.data) {
        const graphData = response.data.graph_json;
        
        // Convert to ReactFlow format
        const flowNodes = Object.entries(graphData.nodes).map(([id, node], index) => ({
          id,
          type: 'default',
          position: { x: node.x || index * 200, y: node.y || 100 },
          data: { label: node.label }
        }));

        const flowEdges = graphData.edges.map((edge, index) => ({
          id: `e${index}`,
          source: edge.from,
          target: edge.to,
          label: `${edge.weight}m`,
          data: { weight: edge.weight }
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
        setVenueName(response.data.name);
      }
    } catch (e) {
      console.error('Failed to load venue:', e);
    }
  };

  const onConnect = useCallback(
    (connection) => {
      const edge = {
        ...connection,
        id: `e${edges.length + 1}`,
        label: '5m',
        data: { weight: 5 }
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [edges, setEdges]
  );

  const addNode = () => {
    const newNode = {
      id: `node_${nodes.length + 1}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `Room ${nodes.length + 1}` }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const updateNodeLabel = () => {
    if (selectedNode && nodeLabel) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: { ...node.data, label: nodeLabel } }
            : node
        )
      );
      setNodeLabel('');
    }
  };

  const exportGraph = () => {
    const graphNodes = {};
    nodes.forEach((node) => {
      graphNodes[node.id] = {
        label: node.data.label,
        x: node.position.x,
        y: node.position.y
      };
    });

    const graphEdges = edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
      weight: edge.data?.weight || 5,
      label: edge.label
    }));

    return { nodes: graphNodes, edges: graphEdges };
  };

  const saveToSupabase = async () => {
    try {
      const graphData = exportGraph();
      await axios.post(`${API_URL}/api/venues`, {
        name: venueName,
        graph_json: graphData
      });
      alert('Venue saved successfully!');
    } catch (e) {
      alert('Failed to save venue');
      console.error(e);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          setSelectedNode(node);
          setNodeLabel(node.data.label);
        }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        
        <Panel position="top-left">
          <div style={{ 
            background: 'white', 
            padding: '15px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minWidth: '250px'
          }}>
            <h3>Floor Plan Editor</h3>
            
            <input
              type="text"
              placeholder="Venue Name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
            />
            
            <button onClick={addNode} style={{ marginRight: '10px', marginBottom: '10px' }}>
              Add Room
            </button>
            
            <button onClick={saveToSupabase} style={{ marginBottom: '10px' }}>
              Save Venue
            </button>

            {selectedNode && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                <h4>Edit Node</h4>
                <input
                  type="text"
                  value={nodeLabel}
                  onChange={(e) => setNodeLabel(e.target.value)}
                  placeholder="Node label"
                  style={{ width: '100%', marginBottom: '5px', padding: '5px' }}
                />
                <button onClick={updateNodeLabel}>Update Label</button>
              </div>
            )}
            
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              <p>Instructions:</p>
              <ul style={{ paddingLeft: '15px' }}>
                <li>Click "Add Room" to create nodes</li>
                <li>Drag to connect rooms with hallways</li>
                <li>Click a node to edit its label</li>
                <li>Always include an "Entrance" node</li>
              </ul>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
