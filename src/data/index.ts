import * as parse from 'csv-parse';
import { readFile, writeFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

import { notNil, haversine } from '../util';
import { Airport, Graph, IdAirportsDict, Route } from '../types';


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

export async function createAirportDict(): Promise<IdAirportsDict> {
  const airports = await loadAirportData();

  return airports.reduce((acc, airport) => {
    const { id, iata, icao } = airport;
    acc[id] = iata || icao || id;
    return acc;
  }, {});



}

export async function createIndexBasedGraph(): Promise<Graph> {
  const routes = await loadRouteData();

  const graph = routes.reduce((graph, route) => {
    if (graph[route.source.id] === undefined) {
      graph[route.source.id] = {};
    }

    if (route.source.id !== route.destination.id) {
      graph[route.source.id][route.destination.id] = route.distance;
    }
    return graph;
  }, {});

  return graph;
}
