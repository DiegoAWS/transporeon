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
export function pathFinder(graph: Graph, source: string, destination: string, maxFlights = 4): PathFinderResponse {

  let bestDistance = Infinity;
  let bestPath: string[] = [];

  const visited = new Set<string>();

  function dfs(at: string, path: string[], distance: number, flights: number, arrivedByGround: boolean = false) {
    visited.add(at);
    path.push(at);

    if (at === destination && distance < bestDistance && flights <= maxFlights) {
        bestDistance = distance;
        bestPath = [...path];
    }

    if (flights < maxFlights) {
        for (const neighbor in graph[at]) {
            if (visited.has(neighbor)) continue;

            const connection = graph[at][neighbor];

            if (arrivedByGround && 'ground' in connection) continue;

            visited.add(neighbor);

            if ('flight' in connection) {
                dfs(
                    neighbor,
                    path,
                    distance + connection.flight,
                    flights + 1,
                    false
                );
            }

            if ('ground' in connection) {
                dfs(
                    neighbor,
                    path,
                    distance + connection.ground,
                    flights,
                    true
                );
            }

            visited.delete(neighbor);
        }
    }

    visited.delete(at);
    path.pop();
  }

  dfs(source, [], 0, 0);

  return {
      path: bestPath,
      distance: bestDistance
  };
}
