import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import VoiceBot from '../components/VoiceBot';
import { askGemini } from '../services/geminiService';
import { LOW_ACCURACY_THRESHOLD } from '../utils/locationUtils';

export default function OutdoorNavScreen() {
  const { language } = useLanguage();
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [isIndoor, setIsIndoor] = useState(false);
  const locationSub = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed for navigation.');
        return;
      }

      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        (loc) => {
          setLocation(loc.coords);
          // Detect indoor transition: GPS accuracy degrades when entering a building
          if (loc.coords.accuracy > LOW_ACCURACY_THRESHOLD) {
            if (!isIndoor) {
              setIsIndoor(true);
              Speech.speak("You're entering a building. What are you looking for?", { language });
              navigation.navigate('IndoorNav', { lastCoords: loc.coords });
            }
          }
        }
      );
    })();

    return () => locationSub.current?.remove();
  }, []);

  const handleUserQuery = async (transcript) => {
    if (!transcript) return;
    const reply = await askGemini(transcript, language);
    Speech.speak(reply, { language });
  };

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          showsUserLocation
          followsUserLocation
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        />
      )}
      <View style={styles.overlay}>
        <Text style={styles.statusText}>🌍 Outdoor Mode</Text>
        <VoiceBot onTranscript={handleUserQuery} language={language} />
        <TouchableOpacity style={styles.sosBtn} onPress={() => navigation.navigate('SOS', { coords: location })}>
          <Text style={styles.sosBtnText}>🆘 SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(26,26,46,0.92)', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24
  },
  statusText: { color: '#aaa', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  sosBtn: { backgroundColor: '#e94560', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  sosBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
