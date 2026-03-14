/**
 * Dijkstra's shortest path — full implementation.
 *
 * Floor plan graph shape (from Supabase / dashboard editor):
 * {
 *   nodes: {
 *     "node_1": { label: "Main Entrance", type: "entrance" },
 *     "node_2": { label: "Junction A",    type: "junction" },
 *     "node_3": { label: "Elevator 1",   type: "elevator" },
 *     "node_4": { label: "Pharmacy",     type: "room" },
 *   },
 *   edges: [
 *     { from: "node_1", to: "node_2", weight: 10 },  // weight = metres
 *     { from: "node_2", to: "node_3", weight: 5 },
 *     { from: "node_3", to: "node_4", weight: 8 },
 *   ]
 * }
 *
 * Returns an array of spoken instruction strings ready for TurnByTurnNav.
 */

/**
 * Finds shortest path from startId to the node whose label matches endLabel.
 * @param {Object} nodes
 * @param {Array}  edges
 * @param {string} startId  - node id to start from (usually the entrance node id)
 * @param {string} endLabel - the destination label spoken by the user (e.g. "pharmacy")
 * @returns {{ steps: string[], distance: number }}
 */
export function dijkstra(nodes, edges, startId, endLabel) {
  if (!nodes || !edges) return { steps: [], distance: 0 };

  // ── Build adjacency list ────────────────────────────────────────────────
  const graph = {};
  Object.keys(nodes).forEach((id) => {
    graph[id] = [];
  });

  edges.forEach(({ from, to, weight = 1 }) => {
    if (graph[from]) graph[from].push({ node: to, weight });
    if (graph[to])   graph[to].push({ node: from, weight }); // bidirectional
  });

  // ── Find target node ────────────────────────────────────────────────────
  // Partial match: "pharmacy" matches "Ground Floor Pharmacy" too
  const normalised = endLabel.toLowerCase().trim();
  const endId = Object.keys(nodes).find((id) =>
    nodes[id].label?.toLowerCase().includes(normalised)
  );

  if (!endId) {
    return { steps: [`Could not find "${endLabel}" on this floor plan.`], distance: 0 };
  }

  if (startId === endId) {
    return { steps: [`You are already at ${nodes[endId].label}.`], distance: 0 };
  }

  // ── Dijkstra ────────────────────────────────────────────────────────────
  const dist = {};
  const prev = {};
  const visited = new Set();

  Object.keys(nodes).forEach((id) => {
    dist[id] = Infinity;
    prev[id] = null;
  });
  dist[startId] = 0;

  // Simple priority queue — small graphs, good enough for hackathon
  const queue = [{ id: startId, cost: 0 }];

  while (queue.length > 0) {
    // Pop node with smallest cost
    queue.sort((a, b) => a.cost - b.cost);
    const { id: current } = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === endId) break;

    for (const { node: neighbor, weight } of graph[current] || []) {
      if (visited.has(neighbor)) continue;
      const newDist = dist[current] + weight;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        prev[neighbor] = current;
        queue.push({ id: neighbor, cost: newDist });
      }
    }
  }

  // ── Reconstruct path ────────────────────────────────────────────────────
  if (dist[endId] === Infinity) {
    return { steps: [`No path found to ${nodes[endId]?.label}.`], distance: 0 };
  }

  const path = [];
  let cur = endId;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }

  return {
    steps: pathToSpokenSteps(path, nodes, edges),
    distance: Math.round(dist[endId]),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Looks up the edge weight between two consecutive nodes.
 */
function getEdgeWeight(fromId, toId, edges) {
  const edge = edges.find(
    (e) =>
      (e.from === fromId && e.to === toId) ||
      (e.from === toId && e.to === fromId)
  );
  return edge?.weight ?? 1;
}

/**
 * Converts a path of node IDs into natural, spoken directions.
 * Includes distance estimates (in metres) and node-type-aware instructions.
 */
function pathToSpokenSteps(path, nodes, edges) {
  if (!path.length) return [];

  const steps = [];

  // Total distance announcement at start
  const totalDist = path.slice(1).reduce((sum, id, i) => {
    return sum + getEdgeWeight(path[i], id, edges);
  }, 0);
  steps.push(
    `Starting navigation. Your destination is ${nodes[path[path.length - 1]]?.label}. ` +
    `Total distance is approximately ${Math.round(totalDist)} metres.`
  );

  for (let i = 1; i < path.length; i++) {
    const node = nodes[path[i]];
    const prevNode = nodes[path[i - 1]];
    const nextNode = i < path.length - 1 ? nodes[path[i + 1]] : null;
    const dist = getEdgeWeight(path[i - 1], path[i], edges);
    const type = node?.type?.toLowerCase() || '';
    const label = node?.label || 'next point';

    if (i === path.length - 1) {
      // Final destination
      steps.push(`You have arrived at your destination: ${label}.`);
    } else if (type === 'elevator' || label.toLowerCase().includes('elevator')) {
      const nextLabel = nextNode?.label || 'your destination';
      steps.push(
        `In ${dist} metres, take the elevator. ` +
        `After the elevator, proceed towards ${nextLabel}.`
      );
    } else if (type === 'stairs' || label.toLowerCase().includes('stair')) {
      steps.push(`In ${dist} metres, take the stairs.`);
    } else if (type === 'junction' || label.toLowerCase().includes('junction')) {
      const nextLabel = nextNode?.label || 'your destination';
      steps.push(
        `Walk ${dist} metres to the junction at ${label}. ` +
        `Then continue towards ${nextLabel}.`
      );
    } else if (type === 'entrance' || type === 'exit') {
      steps.push(`In ${dist} metres, pass through ${label}.`);
    } else {
      // Generic room / corridor
      steps.push(`Walk ${dist} metres to ${label}.`);
    }
  }

  return steps;
}

/**
 * Finds the entrance node ID in a nodes map.
 * Falls back to the first node if none is labelled "entrance".
 */
export function findEntranceNodeId(nodes) {
  const entranceId = Object.keys(nodes).find(
    (id) =>
      nodes[id].type === 'entrance' ||
      nodes[id].label?.toLowerCase().includes('entrance') ||
      nodes[id].label?.toLowerCase().includes('main')
  );
  return entranceId || Object.keys(nodes)[0];
}
