import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export async function requestForegroundLocationPermission() {
  if (Platform.OS === 'android') {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return permission === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

export async function getCurrentPosition() {
  return new Promise<Geolocation.GeoPosition>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
}

export async function startLocationUpdates(
  onUpdate: (location: Geolocation.GeoPosition) => void,
) {
  const watchId = Geolocation.watchPosition(
    onUpdate,
    () => {},
    {
      enableHighAccuracy: true,
      distanceFilter: 3,
      interval: 2000,
      fastestInterval: 1000,
    },
  );

  return {
    remove: () => Geolocation.clearWatch(watchId),
  };
}
