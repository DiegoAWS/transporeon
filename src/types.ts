
export interface Airport {
    id: string;
    icao: string | null;
    iata: string | null;
    name: string;
    location: {
      latitude: number;
      longitude: number;
    };
  }
  
  export interface Route {
    source: Airport;
    destination: Airport;
    distance: number;
  }
  
  export interface Graph {
    [sourceId: string]: {
      [destinationId: string]: number;
    }
  }

  export interface PathFinderResponse {
    distance: number;
    path: string[];
  }
  
  export interface IdAirportsDict {
    [key: string]: string // IATA CODE or ICAO CODE or ID
  }
