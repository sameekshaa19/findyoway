import { useEffect, useState } from 'react';
import type { CurrentLocation } from '../types/navigation';
import {
  getCurrentPosition,
  requestForegroundLocationPermission,
  startLocationUpdates,
} from '../services/locationService';

export function useLocationTracking() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let subscription: { remove: () => void } | null = null;

    async function setupLocationTracking() {
      try {
        setLoading(true);
        const granted = await requestForegroundLocationPermission();

        if (!granted) {
          if (isMounted) {
            setPermissionGranted(false);
            setError('Location permission is required for route guidance.');
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setPermissionGranted(true);
        }

        const currentPosition = await getCurrentPosition();
        if (isMounted) {
          setLocation({
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude,
            accuracy: currentPosition.coords.accuracy,
            heading: currentPosition.coords.heading,
            speed: currentPosition.coords.speed,
          });
          setError(null);
          setLoading(false);
        }

        subscription = await startLocationUpdates((nextLocation) => {
          if (!isMounted) {
            return;
          }

          setLocation({
            latitude: nextLocation.coords.latitude,
            longitude: nextLocation.coords.longitude,
            accuracy: nextLocation.coords.accuracy,
            heading: nextLocation.coords.heading,
            speed: nextLocation.coords.speed,
          });
        });
      } catch (nextError) {
        if (isMounted) {
          setError('Unable to read live GPS updates.');
          setLoading(false);
        }
      }
    }

    setupLocationTracking();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return {
    permissionGranted,
    location,
    loading,
    error,
  };
}
