import * as Location from 'expo-location';

export async function requestForegroundLocationPermission() {
  const permission = await Location.requestForegroundPermissionsAsync();
  return permission.status === 'granted';
}

export async function getCurrentPosition() {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });
}

export async function startLocationUpdates(
  onUpdate: (location: Location.LocationObject) => void,
) {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 3,
      timeInterval: 2000,
    },
    onUpdate,
  );
}
