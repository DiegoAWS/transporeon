import * as parse from 'csv-parse';
import { readFile, writeFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

import { notNil, haversine, flatten } from '../util';
import { Airport, Graph, GraphDistances, IdAirportsDict, Route } from '../types';


function parseCSV<T extends Readonly<string[]>>(filePath: string, columns: T): Promise<{ [key in T[number]]: string }[]> {
  return new Promise((resolve, reject) => {
    readFile(filePath, (err, data) => {
      if (err) {
        return reject(err);
      }

      parse(data, { columns: Array.from(columns), skip_empty_lines: true, relax_column_count: true }, (err, rows) => {
        if (err) {
          return reject(err);
        }

        resolve(rows);
      });
    });
  });
}

export async function loadAirportData(): Promise<Airport[]> {
  const columns = ['airportID', 'name', 'city', 'country', 'iata', 'icao', 'latitude', 'longitude'] as const;
  const rows = await parseCSV(resolvePath(__dirname, './airports.dat'), columns);

  return rows.map((row) => ({
    id: row.airportID,
    icao: row.icao === '\\N' ? null : row.icao,
    iata: row.iata === '\\N' ? null : row.iata,
    name: row.name,
    location: {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    },
  }));
}

export async function loadRouteData(): Promise<Route[]> {
  const airports = await loadAirportData();
  const airportsById = new Map<string, Airport>(airports.map((airport) => [airport.id, airport] as const));

  const columns = ['airline', 'airlineID', 'source', 'sourceID', 'destination', 'destinationID', 'codeshare', 'stops'] as const;
  const rows = await parseCSV(resolvePath(__dirname, './routes.dat'), columns);

  return rows.filter((row) => row.stops === '0').map((row) => {
    const source = airportsById.get(row.sourceID);
    const destination = airportsById.get(row.destinationID);

    if (source === undefined || destination === undefined) {
      return null;
    }

    return {
      source,
      destination,
      distance: haversine(
        source.location.latitude, source.location.longitude,
        destination.location.latitude, destination.location.longitude,
      ),
    }
  }).filter(notNil);
}

export function createAirportByCode(airports: Airport[]): Map<string, Airport> {
  return new Map<string, Airport>(
    flatten(airports.map((airport) => [
      airport.iata !== null ? [airport.iata.toLowerCase(), airport] as const : null,
      airport.icao !== null ? [airport.icao.toLowerCase(), airport] as const : null,
    ].filter(notNil)))
  );
}

export async function createAirportDict(): Promise<IdAirportsDict> {
  const airports = await loadAirportData();

  return airports.reduce((acc, airport) => {
    const { id, iata, icao } = airport;
    acc[id] = iata || icao || id;
    return acc;
  }, {});



}

export function createIndexBasedGraph(airports: Airport[], routes: Route[]): Graph {
  const graph = {};

  // Add flight connections from routes
  for (const route of routes) {
    const sourceId = route.source.id;
    const destinationId = route.destination.id;
    const distance = route.distance;

    if (!graph[sourceId]) {
      graph[sourceId] = {};
    }

    if (sourceId !== destinationId) {
      graph[sourceId][destinationId] = {
        flight: distance,
      };
    }
  }

  // Add ground connections
  for (const airport1 of airports) {
    for (const airport2 of airports) {
      if (airport1.id !== airport2.id) {
        const distance = haversine(airport1.location.latitude, airport1.location.longitude, airport2.location.latitude, airport2.location.longitude);

        if (distance <= 100) {
          if (!graph[airport1.id]) {
            graph[airport1.id] = {};
          }
          graph[airport1.id][airport2.id] = { ground: distance };
        }
      }
    }
  }

  return graph;
}
