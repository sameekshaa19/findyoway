import { useEffect, useRef, useState } from 'react';
import { fetchWalkingRoute, geocodeDestination } from '../services/navigationApi';
import { speak } from '../services/speechService';
import { getRouteProgress } from '../utils/geo';
import type { CurrentLocation, RouteResponse } from '../types/navigation';

export function useOutdoorRoute(destination: string, location: CurrentLocation | null) {
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const lastRerouteRef = useRef(0);
  const spokenStepRef = useRef<number | null>(null);

  useEffect(() => {
    setRoute(null);
    setError(null);
    setHasArrived(false);
    setActiveStepIndex(0);
    setDistanceToNextStep(null);
    spokenStepRef.current = null;
  }, [destination]);

  useEffect(() => {
    if (!location || !destination.trim() || route || loading) {
      return;
    }

    let isMounted = true;
    const origin = { latitude: location.latitude, longitude: location.longitude };

    async function buildRoute() {
      try {
        setLoading(true);
        setError(null);

        const destinationResult = await geocodeDestination(destination);
        const nextRoute = await fetchWalkingRoute(
          origin,
          destinationResult.coordinate,
          destinationResult.label,
        );

        if (!isMounted) {
          return;
        }

        setRoute(nextRoute);
        setLoading(false);
      } catch (nextError) {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to build route.');
          setLoading(false);
        }
      }
    }

    buildRoute();

    return () => {
      isMounted = false;
    };
  }, [destination, loading, location, route]);

  useEffect(() => {
    if (!route || !route.steps.length || spokenStepRef.current === activeStepIndex) {
      return;
    }

    const step = route.steps[activeStepIndex];
    if (step) {
      speak(step.instruction);
      spokenStepRef.current = activeStepIndex;
    }
  }, [activeStepIndex, route]);

  useEffect(() => {
    if (!route || !location || hasArrived) {
      return;
    }

    const progress = getRouteProgress(route, location, activeStepIndex);
    setDistanceToNextStep(progress.distanceToNextStep);

    if (progress.hasArrived) {
      const nextIndex = activeStepIndex + 1;
      if (nextIndex >= route.steps.length) {
        setHasArrived(true);
        speak(`You have arrived at ${route.destinationLabel}.`);
      } else {
        setActiveStepIndex(nextIndex);
      }
      return;
    }

    if (progress.needsReroute) {
      const now = Date.now();
      if (now - lastRerouteRef.current > 20000) {
        lastRerouteRef.current = now;
        setRoute(null);
      }
    }
  }, [activeStepIndex, hasArrived, location, route]);

  return {
    route,
    loading,
    error,
    activeStepIndex,
    distanceToNextStep,
    hasArrived,
  };
}
