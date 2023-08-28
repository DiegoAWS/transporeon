import * as express from 'express';
import * as morgan from 'morgan';

import { pathFinder } from '../util';
import { createAirportByCode, createAirportDict, createIndexBasedGraph, loadAirportData, loadRouteData } from '../data';
import { writeFileSync } from 'fs';


export async function createApp() {
  const app = express();

  const airports = await loadAirportData();
  const airportsByCode = createAirportByCode(airports);
  const idAirportsDict = await createAirportDict();
  const routes = await loadRouteData();
  const graph = createIndexBasedGraph(airports, routes);

  writeFileSync('src/data/airports.json', JSON.stringify(airports, null, 2))
  writeFileSync('src/data/routes.json', JSON.stringify(routes, null, 2))
  writeFileSync('src/data/graph.json', JSON.stringify(graph, null, 2))

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
    const { path, distance } = pathFinder(graph, sourceAirport.id, destinationAirport.id)

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
