import { Graph, PathFinderResponse } from "../types";

export function notNil<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function flatten<T>(value: T[][]): T[] {
  return value.reduce((memo, value) => {
    return [...memo, ...value];
  }, [] as T[]);
}

export function radians(degrees: number): number {
  return degrees * (Math.PI / 180.0);
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  lat1 = radians(lat1);
  lon1 = radians(lon1);
  lat2 = radians(lat2);
  lon2 = radians(lon2);

  const lat = lat2 - lat1;
  const lon = lon2 - lon1;

  const d = Math.pow(Math.sin(lat * 0.5), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(lon * 0.5), 2);

  const earthRadiusKm = 6371.0088;
  return 2.0 * earthRadiusKm * Math.asin(Math.sqrt(d));
}

export function pathFinder(graph: Graph, source: string, destination: string, maxEdges: number = 4): PathFinderResponse {
  // Initialize distances and predecessors
  let distances: { [key: string]: number } = {};
  let predecessors: { [key: string]: string } = {};
  for (let vertex in graph) {
    distances[vertex] = Infinity;
  }
  distances[source] = 0;

  // Queue to store vertices and their distances
  let queue: [string, number, number][] = [[source, 0, 0]];

  while (queue.length > 0) {
    let [currentVertex, currentDistance, currentEdges] = queue.shift()!;

    // Check if the destination is reached with the allowed number of edges
    if (currentVertex === destination && currentEdges <= maxEdges) {
      let path = [];
      let current = destination;
      while (current) {
        path.unshift(current);
        current = predecessors[current];
      }
      return { distance: currentDistance, path: path };
    }

    // Skip vertices that are reached with more than the allowed number of edges
    if (currentEdges > maxEdges) {
      continue;
    }

    for (let neighbor in graph[currentVertex]) {
      let weight = graph[currentVertex][neighbor];
      let distance = currentDistance + weight;
      let edgesUsed = currentEdges + 1;

      // Update the distance and add the neighbor to the queue
      if (distance < distances[neighbor]) {
        distances[neighbor] = distance;
        predecessors[neighbor] = currentVertex;
        queue.push([neighbor, distance, edgesUsed]);
      }
    }
  }

  return { distance: Infinity, path: [] };  // No path found within the restrictions
}
