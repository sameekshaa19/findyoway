/**
 * GPS accuracy threshold in meters.
 * When location accuracy exceeds this value the user is likely indoors
 * (building walls degrade GPS signal).
 */
export const LOW_ACCURACY_THRESHOLD = 20; // metres

/**
 * Returns true if the given location accuracy suggests the user is indoors.
 */
export function isIndoorAccuracy(accuracy) {
  return accuracy > LOW_ACCURACY_THRESHOLD;
}

/**
 * Formats GPS coordinates into a human-readable string for SOS messages.
 */
export function formatCoords(coords) {
  if (!coords) return 'Location unavailable';
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}
