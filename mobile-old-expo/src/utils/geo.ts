import type { RouteCoordinate, RouteProgress, RouteResponse } from '../types/navigation';

const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_STEP_REACHED_METERS = 12;
const DEFAULT_REROUTE_METERS = 45;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function getDistanceMeters(a: RouteCoordinate, b: RouteCoordinate) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return Math.round(
    EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
}

export function formatDistance(distance: number) {
  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
}

export function formatDuration(durationSeconds: number) {
  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function getNearestDistanceToPolyline(
  current: RouteCoordinate,
  coordinates: RouteCoordinate[],
) {
  if (!coordinates.length) {
    return Number.POSITIVE_INFINITY;
  }

  return coordinates.reduce((closest, point) => {
    const distance = getDistanceMeters(current, point);
    return Math.min(closest, distance);
  }, Number.POSITIVE_INFINITY);
}

export function getRouteProgress(
  route: RouteResponse,
  current: RouteCoordinate,
  activeStepIndex: number,
): RouteProgress {
  const activeStep = route.steps[activeStepIndex];
  const lastStep = route.steps[route.steps.length - 1];
  const fallbackTarget = route.geometry[route.geometry.length - 1];
  const target = activeStep
    ? { latitude: activeStep.lat, longitude: activeStep.lng }
    : lastStep
      ? { latitude: lastStep.lat, longitude: lastStep.lng }
      : fallbackTarget;

  const distanceToNextStep = target ? getDistanceMeters(current, target) : null;
  const nearestDistanceToRoute = getNearestDistanceToPolyline(current, route.geometry);

  return {
    activeStepIndex,
    hasArrived: distanceToNextStep !== null && distanceToNextStep <= DEFAULT_STEP_REACHED_METERS,
    needsReroute: nearestDistanceToRoute > DEFAULT_REROUTE_METERS,
    distanceToNextStep,
  };
}
