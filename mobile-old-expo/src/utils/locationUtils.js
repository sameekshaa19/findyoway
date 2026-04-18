/**
 * Location utilities for FindYoWay.
 *
 * GPS accuracy in metres:
 *  < 10m  → clear outdoor signal
 * 10–30m → degraded (near a wall, under a canopy)
 *  > 30m  → very degraded — strong indicator of being inside a building
 *
 * We use a hysteresis approach: transition indoors requires accuracy to
 * stay above INDOOR_THRESHOLD for INDOOR_CONFIRM_COUNT consecutive readings.
 * This prevents false positives from a momentary GPS blip.
 */

export const OUTDOOR_THRESHOLD  = 15;  // metres — below this = clearly outdoor
export const INDOOR_THRESHOLD   = 30;  // metres — above this = likely indoor
export const INDOOR_CONFIRM_COUNT = 3; // consecutive readings needed to confirm indoor

// Keep LOW_ACCURACY_THRESHOLD as an alias used by existing screens
export const LOW_ACCURACY_THRESHOLD = INDOOR_THRESHOLD;

/**
 * Stateful indoor-transition detector.
 *
 * Usage:
 *   const detector = createIndoorDetector(onIndoor, onOutdoor);
 *   Location.watchPositionAsync(..., (loc) => detector.update(loc));
 *
 * @param {() => void} onEnterIndoor  - called once when user enters a building
 * @param {() => void} onEnterOutdoor - called once when user exits a building
 */
export function createIndoorDetector(onEnterIndoor, onEnterOutdoor) {
  let consecutiveIndoorReadings = 0;
  let consecutiveOutdoorReadings = 0;
  let currentlyIndoor = false;

  return {
    update(loc) {
      const accuracy = loc.coords.accuracy;

      if (accuracy > INDOOR_THRESHOLD) {
        consecutiveIndoorReadings++;
        consecutiveOutdoorReadings = 0;

        if (!currentlyIndoor && consecutiveIndoorReadings >= INDOOR_CONFIRM_COUNT) {
          currentlyIndoor = true;
          onEnterIndoor?.();
        }
      } else if (accuracy < OUTDOOR_THRESHOLD) {
        consecutiveOutdoorReadings++;
        consecutiveIndoorReadings = 0;

        if (currentlyIndoor && consecutiveOutdoorReadings >= INDOOR_CONFIRM_COUNT) {
          currentlyIndoor = false;
          onEnterOutdoor?.();
        }
      }
    },
    isIndoor() {
      return currentlyIndoor;
    },
    reset() {
      consecutiveIndoorReadings = 0;
      consecutiveOutdoorReadings = 0;
      currentlyIndoor = false;
    },
  };
}

/**
 * Returns true if a single accuracy reading suggests the user is indoors.
 * Use this for quick one-shot checks. For ongoing monitoring use createIndoorDetector.
 */
export function isIndoorAccuracy(accuracy) {
  return typeof accuracy === 'number' && accuracy > INDOOR_THRESHOLD;
}

/**
 * Formats GPS coordinates into a concise string for SOS messages and display.
 * e.g. "12.97160°N, 77.59460°E"
 */
export function formatCoords(coords) {
  if (!coords || coords.latitude == null) return 'Location unavailable';
  const lat = coords.latitude.toFixed(5);
  const lng = coords.longitude.toFixed(5);
  const latDir = coords.latitude >= 0 ? 'N' : 'S';
  const lngDir = coords.longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(lat)}°${latDir}, ${Math.abs(lng)}°${lngDir}`;
}

/**
 * Computes straight-line distance between two GPS coords in metres (Haversine).
 * Useful for showing how far the user is from a destination.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
