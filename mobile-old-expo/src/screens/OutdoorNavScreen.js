import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import VoiceBot from '../components/VoiceBot';
import { askGemini } from '../services/geminiService';
import {
  createIndoorDetector,
  formatCoords,
  haversineDistance,
} from '../utils/locationUtils';

export default function OutdoorNavScreen() {
  const { language } = useLanguage();
  const navigation = useNavigation();

  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [heading, setHeading] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [botReply, setBotReply] = useState('Ask me anything — "Where is the nearest hospital?"');
  const [isQuerying, setIsQuerying] = useState(false);

  const locationSub = useRef(null);
  const headingSub = useRef(null);
  const indoorDetector = useRef(null);
  const hasNavigatedIndoor = useRef(false);

  // ── Setup location watch ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;

      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'FindYoWay needs location access to navigate for you.',
          [{ text: 'OK' }]
        );
        return;
      }
      setPermissionGranted(true);

      // Set up indoor/outdoor transition detector with hysteresis
      indoorDetector.current = createIndoorDetector(
        // onEnterIndoor
        () => {
          if (!hasNavigatedIndoor.current && mounted) {
            hasNavigatedIndoor.current = true;
            Speech.speak(
              "You're entering a building. Which venue are you at?",
              { language }
            );
            // Small delay so TTS starts before navigation transition
            setTimeout(() => {
              if (mounted) {
                navigation.navigate('IndoorNav', {
                  lastCoords: location?.coords || null,
                });
              }
            }, 500);
          }
        },
        // onEnterOutdoor
        () => {
          if (mounted) {
            hasNavigatedIndoor.current = false;
            Speech.speak('You are outdoors again. GPS navigation resumed.', { language });
          }
        }
      );

      // Watch position
      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 3,          // update every 3 metres moved
          timeInterval: 2000,           // or every 2 seconds
        },
        (loc) => {
          if (!mounted) return;
          setLocation(loc);
          setAccuracy(Math.round(loc.coords.accuracy));
          indoorDetector.current?.update(loc);
        }
      );

      // Watch compass heading
      headingSub.current = await Location.watchHeadingAsync((h) => {
        if (mounted) setHeading(Math.round(h.trueHeading));
      });

      // Announce that outdoor mode is active
      Speech.speak('Outdoor navigation ready. Hold the mic button and ask me anything.', { language });
    })();

    return () => {
      mounted = false;
      locationSub.current?.remove();
      headingSub.current?.remove();
    };
  }, []);

  // ── Voice bot query ─────────────────────────────────────────────────────
  const handleUserQuery = useCallback(async (transcript) => {
    if (!transcript || !transcript.trim()) return;

    setIsQuerying(true);
    setBotReply('Thinking...');

    const context = location
      ? `User is outdoors at coordinates ${formatCoords(location.coords)}. ` +
        `GPS accuracy: ${accuracy}m. Heading: ${heading}°.`
      : 'User location unknown.';

    const reply = await askGemini(transcript, language, context);
    setBotReply(reply);
    Speech.speak(reply, { language });
    setIsQuerying(false);
  }, [location, accuracy, heading, language]);

  // ── Render ──────────────────────────────────────────────────────────────
  const coords = location?.coords;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Map */}
      {coords ? (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          followsUserLocation
          showsCompass
          showsMyLocationButton={false}
          mapType="standard"
          customMapStyle={darkMapStyle}
          initialRegion={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.004,
            longitudeDelta: 0.004,
          }}
        >
          {/* Pulse marker at user location */}
          <Marker
            coordinate={{ latitude: coords.latitude, longitude: coords.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userDot} />
          </Marker>
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.mapPlaceholderText}>
            {permissionGranted ? 'Acquiring GPS signal...' : 'Waiting for location permission...'}
          </Text>
        </View>
      )}

      {/* Bottom overlay */}
      <View style={styles.overlay}>
        {/* Status row */}
        <View style={styles.statusRow}>
          <View style={styles.statusChip}>
            <View style={[styles.dot, { backgroundColor: accuracy && accuracy < 20 ? '#3ddc84' : '#e94560' }]} />
            <Text style={styles.statusChipText}>
              {coords ? `GPS ±${accuracy}m` : 'No GPS'}
            </Text>
          </View>
          {heading !== null && (
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>🧭 {heading}°</Text>
            </View>
          )}
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>🌍 Outdoor</Text>
          </View>
        </View>

        {/* Gemini reply bubble */}
        <View style={styles.replyBubble}>
          {isQuerying
            ? <ActivityIndicator size="small" color="#e94560" />
            : <Text style={styles.replyText} numberOfLines={4}>{botReply}</Text>
          }
        </View>

        {/* Voice bot */}
        <VoiceBot onTranscript={handleUserQuery} language={language} />

        {/* SOS */}
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => navigation.navigate('SOS', { coords: location?.coords })}
          accessibilityLabel="SOS emergency button"
        >
          <Text style={styles.sosBtnText}>🆘 SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Dark map style (Google Maps JSON) ───────────────────────────────────────
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#0f3460' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#aaa' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1c38' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#16213e' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#e94560' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  mapPlaceholderText: { color: '#aaa', fontSize: 14 },

  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(13,13,27,0.95)',
    padding: 20, paddingBottom: 32,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: '#0f3460',
  },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#16213e', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#0f3460',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { color: '#ccc', fontSize: 12 },

  replyBubble: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 14,
    minHeight: 56, justifyContent: 'center',
    borderWidth: 1, borderColor: '#0f3460', marginBottom: 12,
  },
  replyText: { color: '#fff', fontSize: 14, lineHeight: 20 },

  userDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#e94560', borderWidth: 3, borderColor: '#fff',
  },

  sosBtn: {
    backgroundColor: '#e94560', borderRadius: 14, padding: 14,
    alignItems: 'center', marginTop: 10,
  },
  sosBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
});
