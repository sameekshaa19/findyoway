import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import VoiceBot from '../components/VoiceBot';
import TurnByTurnNav from '../components/TurnByTurnNav';
import { fetchVenueByName, fetchFloorPlan } from '../services/supabaseService';
import { getCachedFloorPlan, cacheFloorPlan } from '../utils/storageUtils';
import { dijkstra } from '../utils/dijkstra';

/**
 * Path A — IndoorNavScreen
 * Triggered when the building IS registered in Supabase.
 * Downloads/caches floor plan, runs Dijkstra, speaks turn-by-turn.
 */
export default function IndoorNavScreen({ route }) {
  const { language } = useLanguage();
  const navigation = useNavigation();
  const [venueName, setVenueName] = useState('');
  const [destination, setDestination] = useState('');
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Listening for venue name...');

  // Step 1 — ask user for venue name
  useEffect(() => {
    Speech.speak("You're entering a building. Which venue is this?", { language });
  }, []);

  const handleVoiceInput = async (transcript) => {
    if (!venueName) {
      // First input = venue name
      setVenueName(transcript);
      setStatus(`Looking up ${transcript}...`);
      setLoading(true);

      // Try cache first, then Supabase
      let floorPlan = await getCachedFloorPlan(transcript);
      if (!floorPlan) {
        const venue = await fetchVenueByName(transcript);
        if (!venue) {
          // Not registered — switch to Vision mode (Path B)
          Speech.speak("This venue isn't in our system yet. Switching to camera mode.", { language });
          navigation.replace('VisionNav');
          return;
        }
        floorPlan = await fetchFloorPlan(venue.id);
        await cacheFloorPlan(transcript, floorPlan);
      }

      setLoading(false);
      Speech.speak(`${transcript} found. What are you looking for?`, { language });
    } else {
      // Second input = destination
      setDestination(transcript);
      setStatus(`Finding path to ${transcript}...`);

      const cachedPlan = await getCachedFloorPlan(venueName);
      if (!cachedPlan) return;

      const path = dijkstra(cachedPlan.nodes, cachedPlan.edges, 'entrance', transcript.toLowerCase());
      if (!path.length) {
        Speech.speak("I couldn't find a path to that location.", { language });
        return;
      }
      setSteps(path);
      setStatus(`Navigating to ${transcript}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏢 Indoor Navigation</Text>
      <Text style={styles.status}>{status}</Text>
      {loading && <Text style={styles.loading}>Fetching floor plan...</Text>}
      {steps.length > 0 && <TurnByTurnNav steps={steps} language={language} />}
      <VoiceBot onTranscript={handleVoiceInput} language={language} />
      <TouchableOpacity style={styles.sosBtn} onPress={() => navigation.navigate('SOS', {})}>
        <Text style={styles.sosBtnText}>🆘 SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 64 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e94560', marginBottom: 16 },
  status: { color: '#fff', fontSize: 16, marginBottom: 12 },
  loading: { color: '#aaa', fontSize: 14 },
  sosBtn: { position: 'absolute', bottom: 40, right: 24, backgroundColor: '#e94560', borderRadius: 12, padding: 16 },
  sosBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
