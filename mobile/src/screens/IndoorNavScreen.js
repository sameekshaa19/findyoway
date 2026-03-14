import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, ScrollView, Keyboard,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import VoiceBot from '../components/VoiceBot';
import TurnByTurnNav from '../components/TurnByTurnNav';
import { fetchVenueByName, fetchFloorPlan } from '../services/supabaseService';
import { getCachedFloorPlan, cacheFloorPlan } from '../utils/storageUtils';
import { dijkstra, findEntranceNodeId } from '../utils/dijkstra';

/**
 * IndoorNavScreen — Path A (venue IS registered in Supabase).
 *
 * Flow:
 * 1. App speaks "Which venue are you at?" → user says venue name
 * 2. Lookup: cache first, then Supabase
 *    - Not found → switch to VisionNav (Path B)
 *    - Found     → cache floor plan, say "Found. What are you looking for?"
 * 3. User says destination
 * 4. Dijkstra finds shortest path → TurnByTurnNav speaks steps
 * 5. User can say "repeat", "start over", or tap SOS at any time
 */

const PHASE = {
  ASK_VENUE: 'ask_venue',
  SEARCHING: 'searching',
  ASK_DEST: 'ask_dest',
  NAVIGATING: 'navigating',
  DONE: 'done',
};

export default function IndoorNavScreen({ route }) {
  const { language } = useLanguage();
  const navigation = useNavigation();

  const [phase, setPhase] = useState(PHASE.ASK_VENUE);
  const [venueName, setVenueName] = useState('');
  const [destination, setDestination] = useState('');
  const [steps, setSteps] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const floorPlanRef = useRef(null);

  // ── Step 1: Greet ───────────────────────────────────────────────────────
  useEffect(() => {
    const initialPrompt = "You're inside a building. Which venue is this?";
    Speech.speak(initialPrompt, { language });
  }, []);

  // ── Venue lookup ─────────────────────────────────────────────────────────
  const lookupVenue = useCallback(async (nameInput) => {
    setPhase(PHASE.SEARCHING);
    setVenueName(nameInput);
    setErrorMsg('');

    // 1. Try local cache
    let plan = await getCachedFloorPlan(nameInput);

    // 2. Try Supabase
    if (!plan) {
      const venue = await fetchVenueByName(nameInput);
      if (!venue) {
        // ── Path B fallback ──────────────────────────────────────────
        Speech.speak(
          `${nameInput} is not registered yet. Switching to camera sign-reading mode.`,
          { language }
        );
        setTimeout(() => navigation.replace('VisionNav'), 800);
        return;
      }
      plan = await fetchFloorPlan(venue.id);
      if (plan) {
        await cacheFloorPlan(nameInput, plan); // Save for offline use
      }
    }

    if (!plan || !plan.nodes) {
      setErrorMsg('Floor plan data is missing. Please try again.');
      setPhase(PHASE.ASK_VENUE);
      Speech.speak('Could not load the floor plan. Please say the venue name again.', { language });
      return;
    }

    floorPlanRef.current = plan;
    setPhase(PHASE.ASK_DEST);
    Speech.speak(
      `${nameInput} found. I have the floor plan. What are you looking for?`,
      { language }
    );
  }, [language, navigation]);

  // ── Path finding ─────────────────────────────────────────────────────────
  const findPath = useCallback((destInput) => {
    const plan = floorPlanRef.current;
    if (!plan) return;

    setDestination(destInput);
    setErrorMsg('');

    const entranceId = findEntranceNodeId(plan.nodes);
    const { steps: navSteps, distance } = dijkstra(
      plan.nodes,
      plan.edges,
      entranceId,
      destInput
    );

    if (!navSteps.length || navSteps[0].startsWith('Could not find')) {
      const msg = `I couldn't find "${destInput}" on this floor plan. Try a different name.`;
      setErrorMsg(msg);
      Speech.speak(msg, { language });
      return;
    }

    setSteps(navSteps);
    setTotalDistance(distance);
    setPhase(PHASE.NAVIGATING);
  }, [language]);

  // ── Voice input handler ──────────────────────────────────────────────────
  const handleVoiceInput = useCallback(async (transcript) => {
    if (!transcript?.trim()) return;
    const t = transcript.trim().toLowerCase();

    // Global commands work in any phase
    if (t.includes('start over') || t.includes('restart')) {
      setPhase(PHASE.ASK_VENUE);
      setVenueName('');
      setDestination('');
      setSteps([]);
      floorPlanRef.current = null;
      Speech.speak('Restarting. Which venue are you at?', { language });
      return;
    }

    switch (phase) {
      case PHASE.ASK_VENUE:
        await lookupVenue(transcript.trim());
        break;

      case PHASE.ASK_DEST:
        findPath(transcript.trim());
        break;

      case PHASE.NAVIGATING:
        // User can ask to repeat or ask where they're going
        if (t.includes('repeat') || t.includes('say again') || t.includes('what')) {
          Speech.speak(`You are navigating to: ${destination}.`, { language });
        } else if (t.includes('how far') || t.includes('distance')) {
          Speech.speak(`Total distance is approximately ${totalDistance} metres.`, { language });
        }
        break;

      default:
        break;
    }
  }, [phase, lookupVenue, findPath, destination, totalDistance, language]);

  // ── Phase label helper ───────────────────────────────────────────────────
  const phaseLabel = () => {
    switch (phase) {
      case PHASE.ASK_VENUE:  return 'Say the venue name';
      case PHASE.SEARCHING:  return `Searching for "${venueName}"...`;
      case PHASE.ASK_DEST:   return `${venueName} → Say your destination`;
      case PHASE.NAVIGATING: return `Navigating to ${destination}`;
      case PHASE.DONE:       return 'You have arrived!';
      default: return '';
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏢 Indoor Navigation</Text>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: '#3ddc84' }]} />
            <Text style={styles.badgeText}>Floor Plan Mode</Text>
          </View>
        </View>

        {/* Phase status */}
        <View style={styles.phaseBox}>
          <Text style={styles.phaseLabel}>{phaseLabel()}</Text>
        </View>

        {/* Error message */}
        {!!errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        {/* Loading indicator */}
        {phase === PHASE.SEARCHING && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#e94560" />
            <Text style={styles.loadingText}>Fetching floor plan from cloud...</Text>
          </View>
        )}

        {/* Venue info when found */}
        {(phase === PHASE.ASK_DEST || phase === PHASE.NAVIGATING || phase === PHASE.DONE) && (
          <View style={styles.venueTag}>
            <Text style={styles.venueTagText}>📍 {venueName}</Text>
          </View>
        )}

        {/* Distance info when navigating */}
        {phase === PHASE.NAVIGATING && totalDistance > 0 && (
          <View style={styles.distanceRow}>
            <Text style={styles.distanceText}>📏 ~{totalDistance}m to {destination}</Text>
          </View>
        )}

        {/* Turn-by-turn instructions */}
        {steps.length > 0 && (
          <TurnByTurnNav
            steps={steps}
            language={language}
            onComplete={() => setPhase(PHASE.DONE)}
          />
        )}

        {/* Done state */}
        {phase === PHASE.DONE && (
          <View style={styles.doneBox}>
            <Text style={styles.doneTitle}>✅ Arrived!</Text>
            <TouchableOpacity
              style={styles.restartBtn}
              onPress={() => {
                setPhase(PHASE.ASK_DEST);
                setSteps([]);
                Speech.speak('What else are you looking for?', { language });
              }}
            >
              <Text style={styles.restartBtnText}>Find another location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spacer so VoiceBot isn't hidden by SOS */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed bottom controls */}
      <View style={styles.bottomBar}>
        <VoiceBot onTranscript={handleVoiceInput} language={language} />
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => navigation.navigate('SOS', {})}
          accessibilityLabel="SOS emergency button"
        >
          <Text style={styles.sosBtnText}>🆘</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 24, paddingTop: 56 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#e94560' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#16213e', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#0f3460',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { color: '#ccc', fontSize: 12 },

  phaseBox: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#0f3460', marginBottom: 12,
  },
  phaseLabel: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },

  errorBox: {
    backgroundColor: '#2d0f0f', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e94560', marginBottom: 12,
  },
  errorText: { color: '#ff6b6b', fontSize: 14 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  loadingText: { color: '#aaa', fontSize: 14 },

  venueTag: {
    backgroundColor: '#0f3460', borderRadius: 10, paddingVertical: 6,
    paddingHorizontal: 14, alignSelf: 'flex-start', marginBottom: 10,
  },
  venueTagText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  distanceRow: { marginBottom: 8 },
  distanceText: { color: '#aaa', fontSize: 13 },

  doneBox: { alignItems: 'center', marginTop: 20 },
  doneTitle: { fontSize: 24, fontWeight: 'bold', color: '#3ddc84', marginBottom: 16 },
  restartBtn: {
    backgroundColor: '#16213e', borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 24, borderWidth: 1, borderColor: '#0f3460',
  },
  restartBtnText: { color: '#fff', fontWeight: '600' },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingBottom: 28,
    backgroundColor: 'rgba(13,13,27,0.97)',
    borderTopWidth: 1, borderColor: '#0f3460',
  },
  sosBtn: {
    backgroundColor: '#e94560', borderRadius: 40, width: 58, height: 58,
    alignItems: 'center', justifyContent: 'center',
  },
  sosBtnText: { fontSize: 26 },
});
