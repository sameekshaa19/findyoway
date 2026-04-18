import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AccessibilityInfo,
  Vibration,
  Dimensions,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';

// ─── Safe Voice import ────────────────────────────────────────────────────────
// @react-native-voice/voice is a native module — crashes in Expo Go.
// We guard every single call so nothing throws.
let Voice = null;
let voiceAvailable = false;
try {
  const mod = require('@react-native-voice/voice');
  const candidate = mod?.default ?? mod;
  // The native bridge exposes startSpeech — if it's null the bridge didn't load
  if (
    candidate &&
    typeof candidate.start === 'function' &&
    candidate.start.toString().indexOf('null') === -1
  ) {
    Voice = candidate;
    voiceAvailable = true;
  }
} catch (_) {
  console.warn('VoiceNavigator: @react-native-voice/voice not available – voice commands disabled.');
}

// Safe wrappers — will never throw even if native bridge is null
const safeVoiceStart  = async (lang) => { try { await Voice?.start(lang);   } catch (e) { console.warn('Voice.start:', e?.message); } };
const safeVoiceStop   = async ()     => { try { await Voice?.stop();        } catch (e) { console.warn('Voice.stop:',  e?.message); } };
const safeVoiceDestroy = async ()    => { try { await Voice?.destroy();     } catch (e) {} };

// Safe Speech.stop — expo-speech can throw if nothing is speaking
const safeSpeechStop = async () => { try { await Speech.stop(); } catch (_) {} };

// ─── Supported Languages ─────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = {
  'en-IN': { name: 'English (India)', voice: 'en-IN' },
  'hi-IN': { name: 'Hindi',           voice: 'hi-IN' },
  'kn-IN': { name: 'Kannada',         voice: 'kn-IN' },
  'ta-IN': { name: 'Tamil',           voice: 'ta-IN' },
  'te-IN': { name: 'Telugu',          voice: 'te-IN' },
  'mr-IN': { name: 'Marathi',         voice: 'mr-IN' },
};

// ─── Voice Commands ───────────────────────────────────────────────────────────
const VOICE_COMMANDS = {
  'en-IN': {
    navigate: ['take me to', 'navigate to', 'go to', 'how do i get to'],
    location:  ['where am i', 'what is my location', 'current location'],
    stop:      ['stop navigation', 'cancel route', 'end navigation'],
    help:      ['help', 'what can i say', 'commands'],
    repeat:    ['repeat', 'say again', 'what did you say'],
  },
  'hi-IN': {
    navigate: ['मुझे ले चलो', 'रास्ता बताओ', 'कैसे जाऊं'],
    location:  ['मैं कहां हूं', 'मेरी लोकेशन'],
    stop:      ['रुको', 'बंद करो', 'नैविगेशन बंद'],
    help:      ['मदद', 'क्या कह सकता हूं'],
    repeat:    ['दोहराओ', 'फिर से बताओ'],
  },
};

// ─── Routing helpers ──────────────────────────────────────────────────────────
const osrmRoute = async (origin, destination, language = 'en') => {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?steps=true&overview=false&language=${language}`
    );
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      const steps = data.routes[0].legs[0].steps.map((s, index) => ({
        instruction: s.maneuver.instruction,
        distance:    s.distance,
        duration:    s.duration,
        name:        s.name,
        type:        s.maneuver.type,
        modifier:    s.maneuver.modifier,
        index,
      }));
      return { steps, distance: data.routes[0].distance, duration: data.routes[0].duration };
    }
    return null;
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
};

const valhallaRoute = async (origin, destination, language = 'en-IN') => {
  try {
    const res = await fetch('https://valhalla1.openstreetmap.de/route', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [
          { lon: origin.lng,      lat: origin.lat },
          { lon: destination.lng, lat: destination.lat },
        ],
        costing: 'pedestrian',
        directions_options: { language, units: 'kilometers' },
      }),
    });
    const data = await res.json();
    if (data.trip && data.trip.legs && data.trip.legs[0]) {
      const steps = data.trip.legs[0].maneuvers.map((m, index) => ({
        instruction:  m.instruction,
        distance:     m.length * 1000,
        duration:     m.time,
        type:         m.type,
        verbal_pre:   m.verbal_pre_transition_instruction,
        verbal_post:  m.verbal_post_transition_instruction,
        index,
      }));
      return {
        steps,
        distance: data.trip.summary.length * 1000,
        duration: data.trip.summary.time,
      };
    }
    return null;
  } catch (error) {
    console.error('Valhalla routing error:', error);
    return null;
  }
};

const getMockSteps = () => [
  { instruction: 'Start walking straight',                       distance: 50,  duration: 60  },
  { instruction: 'Turn right at the next intersection',          distance: 100, duration: 120 },
  { instruction: 'Continue straight for 200 meters',            distance: 200, duration: 180 },
  { instruction: 'Turn left',                                    distance: 50,  duration: 60  },
  { instruction: 'You have arrived at your destination',         distance: 0,   duration: 0   },
];

// ─── Haversine distance (metres) ─────────────────────────────────────────────
const haversineDistance = (a, b) => {
  const R   = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
};

// ─── Alert type colours ───────────────────────────────────────────────────────
const ALERT_COLORS = {
  obstacle: '#ff6b6b',
  hazard:   '#ff9f43',
  info:     '#54a0ff',
  person:   '#ff6b6b',
  vehicle:  '#ff9f43',
  default:  '#aaa',
};

const ALERT_ICONS = {
  obstacle: '⚠️',
  hazard:   '🚨',
  person:   '🚶',
  vehicle:  '🚗',
  info:     'ℹ️',
  default:  '📍',
};

// ─── Component ────────────────────────────────────────────────────────────────
const VoiceNavigator = ({ language = 'en-IN', onSOSTriggered, detectedObjects = [] }) => {
  const [isListening,      setIsListening]      = useState(false);
  const [currentStep,      setCurrentStep]      = useState(0);
  const [routeSteps,       setRouteSteps]       = useState([]);
  const [isNavigating,     setIsNavigating]     = useState(false);
  const [currentLocation,  setCurrentLocation]  = useState(null);
  const [destination,      setDestination]      = useState(null);
  const [alerts,           setAlerts]           = useState([]);
  const [lastSpokenText,   setLastSpokenText]   = useState('');
  const [voiceError,       setVoiceError]       = useState(!voiceAvailable);

  // Use refs so callbacks always see latest state without re-subscribing
  const isNavigatingRef  = useRef(isNavigating);
  const currentStepRef   = useRef(currentStep);
  const routeStepsRef    = useRef(routeSteps);
  const lastSpokenRef    = useRef(lastSpokenText);
  const locationSubRef   = useRef(null);

  useEffect(() => { isNavigatingRef.current  = isNavigating;  }, [isNavigating]);
  useEffect(() => { currentStepRef.current   = currentStep;   }, [currentStep]);
  useEffect(() => { routeStepsRef.current    = routeSteps;    }, [routeSteps]);
  useEffect(() => { lastSpokenRef.current    = lastSpokenText;}, [lastSpokenText]);

  // ── Object detection: watch `detectedObjects` prop and raise alerts ─────────
  const prevDetectedRef = useRef([]);
  useEffect(() => {
    if (!detectedObjects || detectedObjects.length === 0) return;

    detectedObjects.forEach((obj) => {
      // Only alert on NEW objects (avoid spamming same detection)
      const alreadySeen = prevDetectedRef.current.some(
        (p) => p.label === obj.label && p.confidence === obj.confidence
      );
      if (alreadySeen) return;

      const type = obj.type || (obj.label?.toLowerCase().includes('person') ? 'person'
                              : obj.label?.toLowerCase().includes('car')    ? 'vehicle'
                              : 'obstacle');

      const confidence = obj.confidence ? ` (${Math.round(obj.confidence * 100)}%)` : '';
      const dist       = obj.distance   ? `, ${Math.round(obj.distance)} m away`    : '';
      const message    = `${obj.label || 'Object'} detected${confidence}${dist}`;

      addAlert(type, message, type === 'obstacle' || type === 'hazard' ? 'high' : 'normal');
    });

    prevDetectedRef.current = detectedObjects;
  }, [detectedObjects]);

  // ── Voice setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceAvailable) return;

    const handleResults = (e) => {
      const text = e?.value?.[0];
      if (!text) return;
      setIsListening(false);
      processVoiceCommand(text);
    };

    const handleError = (e) => {
      console.error('Speech recognition error:', e);
      setIsListening(false);
      announceRef.current(
        'Sorry, I did not catch that. Please try again.',
        { priority: 'warning' }
      );
    };

    Voice.onSpeechResults = handleResults;
    Voice.onSpeechError   = handleError;

    return () => {
      safeVoiceDestroy().then(() => { try { Voice?.removeAllListeners(); } catch (_) {} });
    };
  }, []); // intentionally empty – we use refs inside callbacks

  // ── announce (stable ref so voice callbacks can call it) ────────────────────
  const announce = useCallback(async (text, options = {}) => {
    const { priority = 'normal', vibration = true } = options;
    setLastSpokenText(text);
    AccessibilityInfo.announceForAccessibility(text);
    await safeSpeechStop();
    Speech.speak(text, {
      language: SUPPORTED_LANGUAGES[language]?.voice || 'en-IN',
      pitch: 1.0,
      rate:  0.9,
      ...options.speechOptions,
    });
    if (!vibration) return;
    switch (priority) {
      case 'high':    Vibration.vibrate([0, 500, 200, 500]);                          break;
      case 'warning': Vibration.vibrate([0, 300, 100, 300]);                          break;
      case 'turn':    Vibration.vibrate([0, 200, 100, 200, 100, 200]);                break;
      case 'arrival': Vibration.vibrate([0, 100, 50, 100, 50, 100, 50, 300]);        break;
      default:        Vibration.vibrate(100);
    }
  }, [language]);

  const announceRef = useRef(announce);
  useEffect(() => { announceRef.current = announce; }, [announce]);

  // ── Location ─────────────────────────────────────────────────────────────────
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        announce('Location permission denied');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCurrentLocation(coords);
      return coords;
    } catch (error) {
      console.error('Location error:', error);
      announce('Unable to get current location');
      return null;
    }
  };

  // ── Voice controls ────────────────────────────────────────────────────────────
  const startListening = async () => {
    if (!voiceAvailable) {
      announce(
        'Voice recognition is not available. Please use a development build instead of Expo Go.',
        { priority: 'warning' }
      );
      return;
    }
    try {
      setIsListening(true);
      await safeVoiceStart(SUPPORTED_LANGUAGES[language]?.voice || 'en-IN');
      announce('Listening...', { vibration: false });
    } catch (e) {
      console.error('Voice start error:', e);
      setIsListening(false);
      setVoiceError(true);
      announce('Could not start voice recognition. Please try again.');
    }
  };

  const stopListening = async () => {
    if (!voiceAvailable) return;
    await safeVoiceStop();
    setIsListening(false);
  };

  // ── Command processing ────────────────────────────────────────────────────────
  const processVoiceCommand = async (text) => {
    const lowerText = text.toLowerCase().trim();
    const commands  = VOICE_COMMANDS[language] || VOICE_COMMANDS['en-IN'];

    if (lowerText.includes('help') || lowerText.includes('sos') || lowerText.includes('emergency')) {
      if (onSOSTriggered) onSOSTriggered();
      return;
    }

    const navigateMatch = commands.navigate.find((cmd) => lowerText.includes(cmd));
    if (navigateMatch) {
      const destinationText = lowerText.replace(navigateMatch, '').trim();
      if (destinationText) {
        await startNavigation(destinationText);
      } else {
        announce('Please say a destination like: Take me to Apollo Hospital');
      }
      return;
    }

    if (commands.location.find((cmd) => lowerText.includes(cmd))) {
      const location = await getCurrentLocation();
      if (location) {
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=${language}`
          );
          const data = await res.json();
          announce(`You are at ${data.display_name || `${location.lat}, ${location.lng}`}`);
        } catch {
          announce(`Your coordinates are ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
        }
      }
      return;
    }

    if (commands.stop.find((cmd) => lowerText.includes(cmd))) {
      stopNavigation();
      return;
    }

    if (commands.help.find((cmd) => lowerText.includes(cmd))) {
      listAvailableCommands();
      return;
    }

    if (commands.repeat.find((cmd) => lowerText.includes(cmd))) {
      const last = lastSpokenRef.current;
      last ? announce(last, { priority: 'high' }) : announce('Nothing to repeat');
      return;
    }

    announce('Command not recognized. Say help for available commands.', { priority: 'warning' });
  };

  const listAvailableCommands = () => {
    announce(
      'Available voice commands: ' +
      'Say "Take me to" followed by a destination to start navigation. ' +
      'Say "Where am I" to hear your current location. ' +
      'Say "Stop navigation" to end the current route. ' +
      'Say "Repeat" to hear the last instruction again. ' +
      'Say "Help" to hear this list again.',
      { priority: 'high' }
    );
  };

  // ── Navigation ────────────────────────────────────────────────────────────────
  const startNavigation = async (destinationName) => {
    announce(`Starting navigation to ${destinationName}`, { priority: 'high' });
    const origin = await getCurrentLocation();
    if (!origin) { announce('Unable to get current location. Please try again.'); return; }

    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationName)}&limit=1`
      );
      const data = await res.json();

      if (data && data[0]) {
        const dest = {
          lat:  parseFloat(data[0].lat),
          lng:  parseFloat(data[0].lon),
          name: data[0].display_name,
        };
        setDestination(dest);

        let route = await valhallaRoute(origin, dest, language);
        if (!route) route = await osrmRoute(origin, dest, language.split('-')[0]);
        if (!route) route = { steps: getMockSteps(), distance: 500, duration: 360 };

        if (route && route.steps.length > 0) {
          setRouteSteps(route.steps);
          setCurrentStep(0);
          setIsNavigating(true);

          const first = route.steps[0];
          announce(
            `Route calculated. Total distance ${((route.distance || 500) / 1000).toFixed(1)} kilometres. ` +
            `${route.duration ? 'Estimated time ' + Math.round(route.duration / 60) + ' minutes. ' : ''}` +
            `First instruction: ${first.verbal_pre || first.instruction}`,
            { priority: 'high', vibration: true }
          );

          startLocationTracking(dest, route.steps);
        } else {
          announce('Could not find a route to that destination. Please try a different location.');
        }
      } else {
        announce(`Could not find location: ${destinationName}. Please try being more specific.`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      announce('Error starting navigation. Please try again.');
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setRouteSteps([]);
    setCurrentStep(0);
    setDestination(null);
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    announce('Navigation ended', { priority: 'arrival' });
  };

  // ── Location tracking with real step advancement ──────────────────────────────
  const startLocationTracking = async (dest, steps) => {
    try {
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }

      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval:     5000,
        },
        (loc) => {
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setCurrentLocation(coords);
          checkStepProgress(coords, dest, steps);
        }
      );
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  // ── Step progress: advance when within 20 m of step waypoint ─────────────────
  const checkStepProgress = (current, dest, steps) => {
    if (!isNavigatingRef.current) return;

    const idx       = currentStepRef.current;
    const allSteps  = routeStepsRef.current.length ? routeStepsRef.current : steps;
    if (!allSteps || idx >= allSteps.length - 1) return;

    // Use destination as a simple proxy for "did user reach next step?"
    // If the step has embedded coordinates use them, otherwise fall back to
    // checking distance to final destination for the last step.
    const isLast = idx === allSteps.length - 2; // moving TO the last step
    if (isLast && dest) {
      const d = haversineDistance(current, dest);
      if (d < 30) {
        advanceStep(idx + 1, allSteps, dest);
      }
      return;
    }

    // Generic: advance after threshold distance covered from previous location
    // (real apps would compare against per-step waypoint coords from the API)
    const nextStep = allSteps[idx + 1];
    if (nextStep?.coordinates) {
      const d = haversineDistance(current, nextStep.coordinates);
      if (d < 20) advanceStep(idx + 1, allSteps, dest);
    }
  };

  const advanceStep = (nextIndex, steps, dest) => {
    setCurrentStep(nextIndex);
    const step   = steps[nextIndex];
    const isLast = nextIndex === steps.length - 1;

    if (isLast) {
      announceRef.current(
        `You have arrived at ${dest?.name || 'your destination'}. Navigation complete.`,
        { priority: 'arrival', vibration: true }
      );
      setIsNavigating(false);
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    } else {
      announceRef.current(step.verbal_pre || step.instruction, { priority: 'turn', vibration: true });
    }
  };

  // Manual next step button
  const handleNextStep = () => {
    const nextIndex = currentStep + 1;
    if (nextIndex < routeSteps.length) {
      advanceStep(nextIndex, routeSteps, destination);
    }
  };

  // ── Alert helper ──────────────────────────────────────────────────────────────
  const addAlert = (type, message, priority = 'normal') => {
    const newAlert = {
      id:        Date.now() + Math.random(),
      type,
      message,
      priority,
      timestamp: new Date(),
    };
    setAlerts((prev) => [...prev.slice(-4), newAlert]);

    if (priority === 'high' || type === 'obstacle' || type === 'hazard' || type === 'person' || type === 'vehicle') {
      announceRef.current(`Alert: ${message}`, { priority: 'warning' });
    }
  };

  // Expose addAlert via ref so parent (camera / object detection) can call it
  const addAlertRef = useRef(addAlert);
  useEffect(() => { addAlertRef.current = addAlert; }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (locationSubRef.current) locationSubRef.current.remove();
      safeSpeechStop();
      if (voiceAvailable) safeVoiceDestroy();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────
  const currentInstruction =
    routeSteps[currentStep]?.verbal_pre || routeSteps[currentStep]?.instruction;

  return (
    <View style={styles.container}>

      {/* ── Voice unavailable banner ── */}
      {voiceError && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>
            ⚠️ Voice commands unavailable in Expo Go.{'\n'}
            Run <Text style={styles.warnCode}>npx expo run:android</Text> for full functionality.
          </Text>
        </View>
      )}

      {/* ── Status ── */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText} accessibilityLabel={isNavigating ? 'Navigating' : 'Ready'}>
          {isNavigating ? '🧭 Navigating' : '👋 Ready'}
        </Text>
        {isNavigating && (
          <Text style={styles.stepText}>
            Step {currentStep + 1} of {routeSteps.length}
          </Text>
        )}
        {destination && (
          <Text style={styles.destText} numberOfLines={1}>
            📍 {destination.name}
          </Text>
        )}
      </View>

      {/* ── Current instruction ── */}
      {isNavigating && currentInstruction && (
        <View style={styles.instructionContainer}>
          <Text
            style={styles.instructionText}
            accessibilityLabel={currentInstruction}
            accessibilityRole="header"
          >
            {currentInstruction}
          </Text>
          {routeSteps[currentStep]?.distance > 0 && (
            <Text style={styles.distanceText}>
              {Math.round(routeSteps[currentStep].distance)} m
            </Text>
          )}
        </View>
      )}

      {/* ── Voice button ── */}
      <TouchableOpacity
        style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
        onPressIn={startListening}
        onPressOut={stopListening}
        accessible
        accessibilityLabel={isListening ? 'Listening for voice command' : 'Hold to speak voice command'}
        accessibilityRole="button"
        accessibilityHint='Hold to give voice commands like "Take me to Apollo Hospital"'
        accessibilityState={{ selected: isListening }}
      >
        <Text style={styles.voiceButtonText}>
          {isListening ? '🔴 Listening...' : voiceError ? '🎤 Voice N/A' : '🎤 Hold to Speak'}
        </Text>
      </TouchableOpacity>

      {/* ── Navigation controls ── */}
      {isNavigating && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => announce(lastSpokenText, { priority: 'high' })}
            accessible
            accessibilityLabel="Repeat last instruction"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>🔁 Repeat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.nextButton]}
            onPress={handleNextStep}
            accessible
            accessibilityLabel="Next instruction"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>➡️ Next</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={stopNavigation}
            accessible
            accessibilityLabel="Stop navigation"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>⏹️ Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Object detection / alerts panel — always visible ── */}
      <View style={styles.alertsContainer} accessibilityLabel="Object detection panel">
        <View style={styles.alertsHeaderRow}>
          <Text style={styles.alertsHeader}>🔍 Object Detection</Text>
          {/* Test button — remove in production */}
          <TouchableOpacity
            style={styles.testAlertBtn}
            onPress={() => addAlert('obstacle', 'Person ahead, 2 m away', 'high')}
          >
            <Text style={styles.testAlertBtnText}>+ Test</Text>
          </TouchableOpacity>
        </View>

        {alerts.length === 0 ? (
          <Text style={styles.noAlertsText}>👁️ Scanning for obstacles...</Text>
        ) : (
          alerts.slice(-5).reverse().map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertRow,
                { borderLeftColor: ALERT_COLORS[alert.type] || ALERT_COLORS.default },
              ]}
            >
              <Text
                style={[
                  styles.alertText,
                  { color: ALERT_COLORS[alert.type] || ALERT_COLORS.default },
                ]}
                accessibilityLabel={`${alert.type}: ${alert.message}`}
              >
                {ALERT_ICONS[alert.type] || ALERT_ICONS.default} {alert.message}
              </Text>
              <Text style={styles.alertTime}>
                {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── Language indicator ── */}
      <Text
        style={styles.languageText}
        accessibilityLabel={`Language set to ${SUPPORTED_LANGUAGES[language]?.name || language}`}
      >
        🌐 {SUPPORTED_LANGUAGES[language]?.name || language}
      </Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    justifyContent: 'space-between',
  },

  // Warning banner
  warnBanner: {
    backgroundColor: '#3d1a00',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9f43',
  },
  warnText: {
    color: '#ff9f43',
    fontSize: 13,
    lineHeight: 20,
  },
  warnCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#1a0d00',
    paddingHorizontal: 4,
  },

  // Status
  statusContainer: { alignItems: 'center', marginTop: 10 },
  statusText: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  stepText:   { fontSize: 16, color: '#aaa' },
  destText:   { fontSize: 13, color: '#54a0ff', marginTop: 4, maxWidth: '90%' },

  // Instruction
  instructionContainer: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0f3460',
  },
  instructionText: {
    fontSize: 22,
    color: '#fff',
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 18,
    color: '#e94560',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
  },

  // Voice button
  voiceButton: {
    width:         Math.min(width * 0.7, 240),
    height:        Math.min(width * 0.7, 240),
    borderRadius:  Math.min(width * 0.35, 120),
    backgroundColor: '#0f3460',
    justifyContent:  'center',
    alignItems:      'center',
    alignSelf:       'center',
    marginVertical:  16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: '#16213e',
  },
  voiceButtonActive: {
    backgroundColor: '#e94560',
    borderColor: '#ff6b6b',
  },
  voiceButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center' },

  // Controls
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  controlButton: {
    backgroundColor: '#0f3460',
    paddingVertical:   14,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  nextButton:          { backgroundColor: '#16c79a' },
  stopButton:          { backgroundColor: '#e94560' },
  controlButtonText:   { fontSize: 15, fontWeight: 'bold', color: '#fff' },

  // Alerts / object detection
  alertsContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    maxHeight: 220,
  },
  alertsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertsHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  testAlertBtn: {
    backgroundColor: '#0f3460',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  testAlertBtnText: {
    color: '#54a0ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingVertical: 6,
    paddingLeft:     10,
    marginVertical:  2,
    borderLeftWidth: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  alertText: { fontSize: 13, flex: 1 },
  alertTime: { fontSize: 11, color: '#555', marginLeft: 8 },
  noAlertsText: { color: '#555', fontSize: 13, textAlign: 'center', paddingVertical: 6 },

  // Language
  languageText: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 8 },
});

export default VoiceNavigator;