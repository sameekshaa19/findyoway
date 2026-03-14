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
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import Voice from '@react-native-voice/voice';

// Supported languages configuration
const SUPPORTED_LANGUAGES = {
  'en-IN': { name: 'English (India)', voice: 'en-IN' },
  'hi-IN': { name: 'Hindi', voice: 'hi-IN' },
  'kn-IN': { name: 'Kannada', voice: 'kn-IN' },
  'ta-IN': { name: 'Tamil', voice: 'ta-IN' },
  'te-IN': { name: 'Telugu', voice: 'te-IN' },
  'mr-IN': { name: 'Marathi', voice: 'mr-IN' },
};

// Voice commands mapping
const VOICE_COMMANDS = {
  'en-IN': {
    navigate: ['take me to', 'navigate to', 'go to', 'how do i get to'],
    location: ['where am i', 'what is my location', 'current location'],
    stop: ['stop navigation', 'cancel route', 'end navigation'],
    help: ['help', 'what can i say', 'commands'],
    repeat: ['repeat', 'say again', 'what did you say'],
  },
  'hi-IN': {
    navigate: ['मुझे ले चलो', 'रास्ता बताओ', 'कैसे जाऊं'],
    location: ['मैं कहां हूं', 'मेरी लोकेशन'],
    stop: ['रुको', 'बंद करो', 'नैविगेशन बंद'],
    help: ['मदद', 'क्या कह सकता हूं'],
    repeat: ['दोहराओ', 'फिर से बताओ'],
  },
};

// OSRM Router - Free, OpenStreetMap-based
const osrmRoute = async (origin, destination, language = 'en') => {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?steps=true&overview=false&language=${language}`
    );
    const data = await res.json();
    
    if (data.routes && data.routes[0]) {
      const steps = data.routes[0].legs[0].steps.map((s, index) => ({
        instruction: s.maneuver.instruction,
        distance: s.distance,
        duration: s.duration,
        name: s.name,
        type: s.maneuver.type,
        modifier: s.maneuver.modifier,
        index,
      }));
      
      return {
        steps,
        distance: data.routes[0].distance,
        duration: data.routes[0].duration,
        geometry: data.routes[0].geometry,
      };
    }
    return null;
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
};

// Valhalla Router - Free, multilingual support
const valhallaRoute = async (origin, destination, language = 'en-IN') => {
  try {
    const res = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [
          { lon: origin.lng, lat: origin.lat },
          { lon: destination.lng, lat: destination.lat },
        ],
        costing: 'pedestrian',
        directions_options: { 
          language: language,
          units: 'kilometers',
        },
      }),
    });
    
    const data = await res.json();
    
    if (data.trip && data.trip.legs && data.trip.legs[0]) {
      const steps = data.trip.legs[0].maneuvers.map((m, index) => ({
        instruction: m.instruction,
        distance: m.length * 1000, // convert to meters
        duration: m.time,
        type: m.type,
        verbal_pre: m.verbal_pre_transition_instruction,
        verbal_post: m.verbal_post_transition_instruction,
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

// Mock routing fallback for testing
const getMockSteps = (origin, destination) => {
  return [
    { instruction: 'Start walking straight', distance: 50, duration: 60 },
    { instruction: 'Turn right at the next intersection', distance: 100, duration: 120 },
    { instruction: 'Continue straight for 200 meters', distance: 200, duration: 180 },
    { instruction: 'Turn left', distance: 50, duration: 60 },
    { instruction: 'You have arrived at your destination', distance: 0, duration: 0 },
  ];
};

// Main VoiceNavigator Component
const VoiceNavigator = ({ language = 'en-IN', onSOSTriggered }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [routeSteps, setRouteSteps] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [lastSpokenText, setLastSpokenText] = useState('');
  
  const recordingRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  // Initialize voice recognition
  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        announce('Location permission denied');
        return null;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      
      setCurrentLocation(coords);
      return coords;
    } catch (error) {
      console.error('Location error:', error);
      announce('Unable to get current location');
      return null;
    }
  };

  // Announce with accessibility and speech
  const announce = useCallback(async (text, options = {}) => {
    const { priority = 'normal', vibration = true } = options;
    
    setLastSpokenText(text);
    
    // Screen reader announcement
    AccessibilityInfo.announceForAccessibility(text);
    
    // Voice announcement
    await Speech.stop();
    await Speech.speak(text, {
      language: SUPPORTED_LANGUAGES[language]?.voice || 'en-IN',
      pitch: 1.0,
      rate: 0.9,
      ...options.speechOptions,
    });
    
    // Vibration feedback based on priority
    if (vibration) {
      switch (priority) {
        case 'high':
          Vibration.vibrate([0, 500, 200, 500]);
          break;
        case 'warning':
          Vibration.vibrate([0, 300, 100, 300]);
          break;
        case 'turn':
          Vibration.vibrate([0, 200, 100, 200, 100, 200]);
          break;
        case 'arrival':
          Vibration.vibrate([0, 100, 50, 100, 50, 100, 50, 300]);
          break;
        default:
          Vibration.vibrate(100);
      }
    }
  }, [language]);

  // Start voice listening
  const startListening = async () => {
    try {
      setIsListening(true);
      await Voice.start(SUPPORTED_LANGUAGES[language]?.voice || 'en-IN');
      announce('Listening...', { vibration: false });
    } catch (e) {
      console.error('Voice start error:', e);
      setIsListening(false);
      announce('Could not start voice recognition. Please try again.');
    }
  };

  // Stop voice listening
  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error('Voice stop error:', e);
    }
  };

  // Handle speech results
  const onSpeechResults = useCallback((e) => {
    const text = e.value[0];
    setIsListening(false);
    processVoiceCommand(text);
  }, [currentLocation, isNavigating, language]);

  const onSpeechError = useCallback((e) => {
    console.error('Speech error:', e);
    setIsListening(false);
    announce('Sorry, I did not catch that. Please try again.', { priority: 'warning' });
  }, []);

  // Process voice commands
  const processVoiceCommand = async (text) => {
    const lowerText = text.toLowerCase().trim();
    const commands = VOICE_COMMANDS[language] || VOICE_COMMANDS['en-IN'];
    
    // Check for SOS/help
    if (lowerText.includes('help') || lowerText.includes('sos') || lowerText.includes('emergency')) {
      if (onSOSTriggered) onSOSTriggered();
      return;
    }
    
    // Navigate command
    const navigateMatch = commands.navigate.find(cmd => lowerText.includes(cmd));
    if (navigateMatch) {
      const destinationText = lowerText.replace(navigateMatch, '').trim();
      if (destinationText) {
        await startNavigation(destinationText);
      } else {
        announce('Please say a destination like: Take me to Apollo Hospital');
      }
      return;
    }
    
    // Location command
    const locationMatch = commands.location.find(cmd => lowerText.includes(cmd));
    if (locationMatch) {
      const location = await getCurrentLocation();
      if (location) {
        // Reverse geocoding with Nominatim (free)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=${language}`
          );
          const data = await res.json();
          const address = data.display_name || `${location.lat}, ${location.lng}`;
          announce(`You are at ${address}`);
        } catch (e) {
          announce(`Your current coordinates are ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
        }
      }
      return;
    }
    
    // Stop navigation
    const stopMatch = commands.stop.find(cmd => lowerText.includes(cmd));
    if (stopMatch) {
      stopNavigation();
      announce('Navigation stopped');
      return;
    }
    
    // Help command
    const helpMatch = commands.help.find(cmd => lowerText.includes(cmd));
    if (helpMatch) {
      listAvailableCommands();
      return;
    }
    
    // Repeat command
    const repeatMatch = commands.repeat.find(cmd => lowerText.includes(cmd));
    if (repeatMatch) {
      if (lastSpokenText) {
        announce(lastSpokenText, { priority: 'high' });
      } else {
        announce('Nothing to repeat');
      }
      return;
    }
    
    // Unknown command
    announce('Command not recognized. Say help for available commands.', { priority: 'warning' });
  };

  // List available commands
  const listAvailableCommands = () => {
    const commandsText = 
      'Available voice commands: ' +
      'Say "Take me to" followed by a destination name to start navigation. ' +
      'Say "Where am I" to hear your current location. ' +
      'Say "Stop navigation" to end the current route. ' +
      'Say "Repeat" to hear the last instruction again. ' +
      'Say "Help" to hear this list again.';
    announce(commandsText, { priority: 'high' });
  };

  // Start navigation
  const startNavigation = async (destinationName) => {
    announce(`Starting navigation to ${destinationName}`, { priority: 'high' });
    
    const origin = await getCurrentLocation();
    if (!origin) {
      announce('Unable to get current location. Please try again.');
      return;
    }
    
    // Geocode destination using Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationName)}&limit=1`
      );
      const data = await res.json();
      
      if (data && data[0]) {
        const dest = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name,
        };
        
        setDestination(dest);
        
        // Try Valhalla first (better multilingual support)
        let route = await valhallaRoute(origin, dest, language);
        
        // Fallback to OSRM
        if (!route) {
          route = await osrmRoute(origin, dest, language.split('-')[0]);
        }
        
        // Fallback to mock
        if (!route) {
          route = { steps: getMockSteps(origin, dest) };
        }
        
        if (route && route.steps.length > 0) {
          setRouteSteps(route.steps);
          setCurrentStep(0);
          setIsNavigating(true);
          
          const firstStep = route.steps[0];
          announce(
            `Route calculated. Total distance ${(route.distance / 1000).toFixed(1)} kilometers. ` +
            `${route.duration ? 'Estimated time ' + Math.round(route.duration / 60) + ' minutes. ' : ''}` +
            `First instruction: ${firstStep.verbal_pre || firstStep.instruction}`,
            { priority: 'high', vibration: true }
          );
          
          // Start location tracking for navigation
          startLocationTracking();
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

  // Stop navigation
  const stopNavigation = () => {
    setIsNavigating(false);
    setRouteSteps([]);
    setCurrentStep(0);
    setDestination(null);
    
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    
    announce('Navigation ended', { priority: 'arrival' });
  };

  // Start location tracking
  const startLocationTracking = async () => {
    try {
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000, // Or every 5 seconds
        },
        (location) => {
          const coords = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          setCurrentLocation(coords);
          checkStepProgress(coords);
        }
      );
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  // Check if user has progressed to next step
  const checkStepProgress = (currentCoords) => {
    if (!isNavigating || currentStep >= routeSteps.length - 1) return;
    
    const nextStep = routeSteps[currentStep + 1];
    if (!nextStep) return;
    
    // Simplified step completion check
    // In production, you'd compare against actual step coordinates
    // This is a placeholder for the logic
  };

  // Advance to next step
  const nextStep = () => {
    if (currentStep < routeSteps.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      
      const step = routeSteps[nextIndex];
      const isLast = nextIndex === routeSteps.length - 1;
      
      if (isLast) {
        announce(
          `You have arrived at ${destination?.name || 'your destination'}. Navigation complete.`,
          { priority: 'arrival', vibration: true }
        );
        setIsNavigating(false);
        
        if (locationSubscriptionRef.current) {
          locationSubscriptionRef.current.remove();
          locationSubscriptionRef.current = null;
        }
      } else {
        announce(
          step.verbal_pre || step.instruction,
          { priority: 'turn', vibration: true }
        );
      }
    }
  };

  // Add alert (for obstacle detection integration)
  const addAlert = (type, message, priority = 'normal') => {
    const alert = {
      id: Date.now(),
      type,
      message,
      priority,
      timestamp: new Date(),
    };
    
    setAlerts(prev => [...prev.slice(-4), alert]); // Keep last 5 alerts
    
    // Immediate announcement for high priority
    if (priority === 'high' || type === 'obstacle' || type === 'hazard') {
      announce(`Alert: ${message}`, { priority: 'warning' });
    }
  };

  // Render UI
  return (
    <View style={styles.container}>
      {/* Status Display */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText} accessibilityLabel={isNavigating ? 'Navigating' : 'Ready'}>
          {isNavigating ? '🧭 Navigating' : '👋 Ready'}
        </Text>
        {isNavigating && (
          <Text style={styles.stepText} accessibilityLabel={`Step ${currentStep + 1} of ${routeSteps.length}`}>
            Step {currentStep + 1} of {routeSteps.length}
          </Text>
        )}
      </View>

      {/* Current Instruction Display */}
      {isNavigating && routeSteps[currentStep] && (
        <View style={styles.instructionContainer}>
          <Text 
            style={styles.instructionText}
            accessibilityLabel={routeSteps[currentStep].verbal_pre || routeSteps[currentStep].instruction}
            accessibilityRole="header"
          >
            {routeSteps[currentStep].verbal_pre || routeSteps[currentStep].instruction}
          </Text>
          {routeSteps[currentStep].distance > 0 && (
            <Text style={styles.distanceText}>
              {Math.round(routeSteps[currentStep].distance)} meters
            </Text>
          )}
        </View>
      )}

      {/* Voice Button - Large touch target for accessibility */}
      <TouchableOpacity
        style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
        onPressIn={startListening}
        onPressOut={stopListening}
        accessible={true}
        accessibilityLabel={isListening ? 'Listening for voice command' : 'Hold to speak voice command'}
        accessibilityRole="button"
        accessibilityHint="Hold to give voice commands like Take me to Apollo Hospital"
        accessibilityState={{ selected: isListening }}
      >
        <Text style={styles.voiceButtonText}>
          {isListening ? '🔴 Listening...' : '🎤 Hold to Speak'}
        </Text>
      </TouchableOpacity>

      {/* Navigation Controls */}
      {isNavigating && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => announce(lastSpokenText, { priority: 'high' })}
            accessible={true}
            accessibilityLabel="Repeat last instruction"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>🔁 Repeat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.nextButton]}
            onPress={nextStep}
            accessible={true}
            accessibilityLabel="Next instruction"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>➡️ Next</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={stopNavigation}
            accessible={true}
            accessibilityLabel="Stop navigation"
            accessibilityRole="button"
          >
            <Text style={styles.controlButtonText}>⏹️ Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <View style={styles.alertsContainer} accessibilityLabel="Recent alerts">
          {alerts.slice(-3).map((alert, index) => (
            <Text 
              key={alert.id} 
              style={[styles.alertText, alert.priority === 'high' && styles.alertTextHigh]}
              accessibilityLabel={`${alert.type}: ${alert.message}`}
            >
              {alert.type === 'obstacle' ? '⚠️' : alert.type === 'hazard' ? '🚨' : 'ℹ️'} {alert.message}
            </Text>
          ))}
        </View>
      )}

      {/* Language Indicator */}
      <Text style={styles.languageText} accessibilityLabel={`Language set to ${SUPPORTED_LANGUAGES[language]?.name || language}`}>
        {SUPPORTED_LANGUAGES[language]?.name || language}
      </Text>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    justifyContent: 'space-between',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 18,
    color: '#aaa',
  },
  instructionContainer: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0f3460',
  },
  instructionText: {
    fontSize: 24,
    color: '#fff',
    lineHeight: 36,
    textAlign: 'center',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 18,
    color: '#e94560',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: 'bold',
  },
  voiceButton: {
    width: Math.min(width * 0.8, 280),
    height: Math.min(width * 0.8, 280),
    borderRadius: Math.min(width * 0.4, 140),
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 20,
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
    transform: [{ scale: 1.05 }],
  },
  voiceButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  controlButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#16c79a',
  },
  stopButton: {
    backgroundColor: '#e94560',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertsContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  alertText: {
    fontSize: 14,
    color: '#aaa',
    marginVertical: 4,
  },
  alertTextHigh: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  languageText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default VoiceNavigator;
