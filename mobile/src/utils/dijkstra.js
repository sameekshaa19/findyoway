/**
 * Dijkstra's shortest path algorithm
 *
 * @param {Object} nodes - { id: { label: string } }
 * @param {Array}  edges - [{ from: string, to: string, weight: number }]
 * @param {string} startId - ID of start node (e.g. 'entrance')
 * @param {string} endLabel - Label to search for (e.g. 'pharmacy')
 * @returns {string[]} Array of human-readable direction steps
 */
export function dijkstra(nodes, edges, startId, endLabel) {
  // Build adjacency list
  const graph = {};
  Object.keys(nodes).forEach((id) => { graph[id] = []; });
  edges.forEach(({ from, to, weight = 1 }) => {
    graph[from]?.push({ node: to, weight });
    graph[to]?.push({ node: from, weight }); // bidirectional
  });

  // Find the target node by label (case-insensitive)
  const endId = Object.keys(nodes).find(
    (id) => nodes[id].label?.toLowerCase() === endLabel.toLowerCase()
  );
  if (!endId) return [];

  // Priority queue (simple array-based for hackathon)
  const dist = {};
  const prev = {};
  const visited = new Set();
  Object.keys(nodes).forEach((id) => { dist[id] = Infinity; prev[id] = null; });
  dist[startId] = 0;

  const queue = [{ id: startId, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const { id: current } = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === endId) break;

    for (const { node: neighbor, weight } of graph[current] || []) {
      const newDist = dist[current] + weight;
      if (newDist < dist[neighbor]) {
        dist[neighbor] = newDist;
        prev[neighbor] = current;
        queue.push({ id: neighbor, cost: newDist });
      }
    }
  }

  // Reconstruct path
  const path = [];
  let cur = endId;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }

  if (path[0] !== startId) return []; // No path found

  // Convert node IDs to spoken directions
  return pathToSteps(path, nodes);
}

/**
 * Converts a path of node IDs into spoken turn-by-turn instructions.
 */
function pathToSteps(path, nodes) {
  const steps = [];
  for (let i = 0; i < path.length; i++) {
    const node = nodes[path[i]];
    if (!node) continue;

    if (i === 0) {
      steps.push(`Starting at ${node.label}.`);
    } else if (i === path.length - 1) {
      steps.push(`You have arrived at ${node.label}.`);
    } else {
      const label = node.label?.toLowerCase();
      if (label?.includes('elevator')) {
        steps.push(`Take the elevator at ${node.label}.`);
      } else if (label?.includes('junction') || label?.includes('turn')) {
        steps.push(`At the junction, continue towards ${nodes[path[i + 1]]?.label || 'the next area'}.`);
      } else {
        steps.push(`Pass through ${node.label}.`);
      }
    }
  }
  return steps;
}
