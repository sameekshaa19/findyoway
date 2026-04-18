import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { StackScreenProps } from '@react-navigation/stack';
import { AppButton } from '../../components/app/AppButton';
import { AppHeader } from '../../components/app/AppHeader';
import { ErrorState } from '../../components/app/ErrorState';
import { LoadingState } from '../../components/app/LoadingState';
import { PermissionCard } from '../../components/app/PermissionCard';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { useOutdoorRoute } from '../../hooks/useOutdoorRoute';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { formatDistance, formatDuration } from '../../utils/geo';
import { ScreenLayout } from './ScreenLayout';

type Props = StackScreenProps<RootStackParamList, 'Route'>;

export function RouteScreen({ navigation, route: routeProp }: Props) {
  const { destination } = routeProp.params;
  const { permissionGranted, location, loading: locationLoading, error: locationError } =
    useLocationTracking();
  const { route, loading, error, activeStepIndex, distanceToNextStep, hasArrived } =
    useOutdoorRoute(destination, location);

  const initialRegion = useMemo(() => {
    if (location) {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    return {
      latitude: 12.9716,
      longitude: 77.5946,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [location]);

  return (
    <ScreenLayout navigation={navigation} currentRoute="Destination" scrollable={false}>
      <AppHeader
        title="Outdoor Route"
        subtitle="Live GPS tracking, OSRM routing, step progression, and reroute detection live here."
      />

      {!permissionGranted && !locationLoading ? (
        <PermissionCard
          title="Location permission needed"
          description="Grant location access so the app can track your position and progress each route step."
        />
      ) : null}

      {locationLoading ? <LoadingState message="Acquiring live GPS coordinates..." /> : null}
      {locationError ? <ErrorState message={locationError} /> : null}
      {loading ? <LoadingState message="Geocoding destination and fetching walking route..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      <View style={styles.mapCard}>
        <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation>
          {route?.geometry?.length ? (
            <>
              <Polyline coordinates={route.geometry} strokeColor={colors.primary} strokeWidth={5} />
              <Marker coordinate={route.geometry[route.geometry.length - 1]} title={route.destinationLabel} />
            </>
          ) : null}
        </MapView>
      </View>

      {route ? (
        <View style={styles.infoCard}>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue}>{formatDistance(route.distance)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>ETA</Text>
              <Text style={styles.metricValue}>{formatDuration(route.duration)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Next Step</Text>
              <Text style={styles.metricValue}>
                {distanceToNextStep !== null ? formatDistance(distanceToNextStep) : '--'}
              </Text>
            </View>
          </View>

          <Text style={styles.stepTitle}>
            {hasArrived ? 'Arrived' : `Step ${activeStepIndex + 1} of ${route.steps.length}`}
          </Text>
          <Text style={styles.stepBody}>
            {hasArrived
              ? `You have arrived at ${route.destinationLabel}.`
              : route.steps[activeStepIndex]?.instruction || 'Preparing the first instruction...'}
          </Text>

          <AppButton label="Open SOS" onPress={() => navigation.navigate('SOS')} variant="danger" />
        </View>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    flex: 1,
    minHeight: 280,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  infoCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: colors.text,
    fontWeight: '700',
  },
  stepTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  stepBody: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
