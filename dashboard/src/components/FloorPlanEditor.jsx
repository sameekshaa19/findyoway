import React, { useState, useCallback } from 'react'
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

const NODE_TYPES = ['entrance', 'junction', 'elevator', 'room', 'exit']

let nodeIdCounter = 1

function newNode(label, position) {
  const id = `node_${nodeIdCounter++}`
  return { id, data: { label }, position, style: { background: '#16213e', color: '#fff', border: '1px solid #e94560', borderRadius: 8, padding: '8px 12px' } }
}

/**
 * FloorPlanEditor — react-flow based node editor.
 * Person 4 can extend with drag-and-drop palettes, label editing etc.
 * On submit, converts nodes/edges to the graph_json format expected by Dijkstra.
 */
export default function FloorPlanEditor({ venueName, floors, onSubmit, saving }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    newNode('Main Entrance', { x: 100, y: 100 }),
  ])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [newLabel, setNewLabel] = useState('')

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#e94560' } }, eds)),
    [setEdges]
  )

  const addNode = () => {
    if (!newLabel.trim()) return
    setNodes((nds) => [
      ...nds,
      newNode(newLabel.trim(), { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 }),
    ])
    setNewLabel('')
  }

  const handleSubmit = () => {
    // Convert react-flow format → Dijkstra graph_json
    const graphJson = {
      nodes: Object.fromEntries(
        nodes.map((n) => [n.id, { label: n.data.label }])
      ),
      edges: edges.map((e) => ({ from: e.source, to: e.target, weight: 1 })),
    }
    onSubmit(graphJson)
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          className="form-group"
          style={{ margin: 0 }}
          placeholder="Node label (e.g. Pharmacy, Elevator 1)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNode()}
        />
        <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={addNode}>+ Add Node</button>
      </div>

      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>
        🖱 Drag nodes to position • Connect nodes by dragging from one handle to another • Submit when done
      </p>

      <div style={{ height: 500, border: '1px solid #0f3460', borderRadius: 16, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap style={{ background: '#0d0d1b' }} />
          <Controls />
          <Background color="#1a1a2e" gap={16} />
        </ReactFlow>
      </div>

      <button
        className="btn-primary"
        style={{ marginTop: 24 }}
        onClick={handleSubmit}
        disabled={saving || nodes.length < 2}
      >
        {saving ? 'Saving...' : '✅ Submit Floor Plan'}
      </button>
    </div>
  )
}
