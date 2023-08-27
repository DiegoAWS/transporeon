import * as express from 'express';
import * as morgan from 'morgan';

import { notNil, flatten, pathFinder } from '../util';
import { createAirportDict, createIndexBasedGraph, loadAirportData } from '../data';
import { Airport } from '../types';
import { writeFileSync } from 'fs';


export async function createApp() {
  const app = express();

  const airports = await loadAirportData();
  const airportsByCode = new Map<string, Airport>(
    flatten(airports.map((airport) => [
      airport.iata !== null ? [airport.iata.toLowerCase(), airport] as const : null,
      airport.icao !== null ? [airport.icao.toLowerCase(), airport] as const : null,
    ].filter(notNil)))
  );

  const idAirportsDict = await createAirportDict();
  const graph = await createIndexBasedGraph()


  app.use(morgan('tiny'));

  app.get('/health', (_, res) => res.send('OK'));
  app.get('/airports/:code', (req, res) => {
    const code = req.params['code'];
    if (code === undefined) {
      return res.status(400).send('Must provide airport code');
    }

    const airport = airportsByCode.get(code.toLowerCase());
    if (airport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO code');
    }

    return res.status(200).send(airport);
  });

  app.get('/routes/:source/:destination', (req, res) => {
    const source = req.params['source'];
    const destination = req.params['destination'];
    if (source === undefined || destination === undefined) {
      return res.status(400).send('Must provide source and destination airports');
    }

    const sourceAirport = airportsByCode.get(source.toLowerCase());
    const destinationAirport = airportsByCode.get(destination.toLowerCase());
    if (sourceAirport === undefined || destinationAirport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO codes');
    }

    // Due to some iata/icao codes missing, we I'll use an airport's id based graph:
    
    const { path, distance} = pathFinder(graph, sourceAirport.id, destinationAirport.id)

    const hops = path.map((id) => idAirportsDict[id]);

    const response = {
      source: idAirportsDict[path[0]],
      destination: idAirportsDict[path[path.length - 1]],
      distance,
      hops,
    }

    return res.status(200).send(response);
  });

  return app;
}
