import type { RouteCoordinate, RouteResponse, RouteStep } from '../types/navigation';

type GeocodeResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type OsrmStep = {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    location: [number, number];
    modifier?: string;
    type?: string;
  };
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
  };
  legs: Array<{
    steps: OsrmStep[];
  }>;
};

type OsrmResponse = {
  code: string;
  routes: OsrmRoute[];
};

function createInstruction(step: OsrmStep) {
  const maneuverType = step.maneuver.type || 'continue';
  const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
  const roadName = step.name ? ` onto ${step.name}` : '';
  return `${maneuverType.replace(/_/g, ' ')}${modifier}${roadName}`.replace(/\s+/g, ' ').trim();
}

function normalizeStep(step: OsrmStep, index: number): RouteStep {
  return {
    id: `step-${index}`,
    instruction: createInstruction(step),
    distance: step.distance,
    duration: step.duration,
    lat: step.maneuver.location[1],
    lng: step.maneuver.location[0],
    maneuverType: step.maneuver.type || 'continue',
  };
}

export async function geocodeDestination(query: string): Promise<{
  label: string;
  coordinate: RouteCoordinate;
}> {
  const encodedQuery = encodeURIComponent(query.trim());
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=jsonv2&limit=1`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Destination lookup failed.');
  }

  const results = (await response.json()) as GeocodeResult[];
  const topResult = results[0];

  if (!topResult) {
    throw new Error('No matching destination found.');
  }

  return {
    label: topResult.display_name,
    coordinate: {
      latitude: Number(topResult.lat),
      longitude: Number(topResult.lon),
    },
  };
}

export async function fetchWalkingRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  destinationLabel: string,
): Promise<RouteResponse> {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/walking/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Route fetch failed.');
  }

  const payload = (await response.json()) as OsrmResponse;
  const primaryRoute = payload.routes?.[0];

  if (!primaryRoute) {
    throw new Error('No walking route available.');
  }

  return {
    destinationLabel,
    distance: primaryRoute.distance,
    duration: primaryRoute.duration,
    geometry: primaryRoute.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
    steps: primaryRoute.legs.flatMap((leg) => leg.steps).map(normalizeStep),
  };
}
