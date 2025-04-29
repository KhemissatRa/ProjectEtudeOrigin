// Définir un type Coordonnée plus flexible pour l'activité
// Longitude, Latitude, Altitude (optionnelle)
export type ActivityCoordinate = [number, number, number?]; // longitude, latitude, altitude (optional)

export default interface Activity {
  id: string;
  name: string;
  date: string;
  distance?: number;
  duration?: number;
  source: string;
  stravaLink?: string;
  trace?: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      geometry: {
        type: "LineString";
        coordinates: [number, number, number?][]; // longitude, latitude, altitude (optional)
      };
      properties: {};
    }[];
  };
  pointsOfInterest?: {
    startPoint?: ActivityCoordinate;
    finishPoint?: ActivityCoordinate;
    highestElevation?: ActivityCoordinate;
    lowestElevation?: ActivityCoordinate;
  };
  startCity?: string; // Add this line
  finishCity?: string; // Add this line
}