import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import { readSignsFromFrame } from '../services/geminiService';

/**
 * SignReader — Expo-camera based sign reading component.
 *
 * Captures a photo every `intervalMs` milliseconds, sends the base64 frame
 * to the Flask /api/vision endpoint via geminiService, and speaks the result.
 *
 * Props:
 *   goal       — what the user is looking for (e.g. 'pharmacy')
 *   language   — spoken language for expo-speech
 *   intervalMs — how often to scan (default: 3000ms)
 *   onStop     — optional callback when the user taps Stop
 */
const INTERVAL_MS = 3000;

const SignReader = ({ goal = 'destination', language = 'English', intervalMs = INTERVAL_MS, onStop }) => {
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastGuidance, setLastGuidance] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    return () => stopScanning();
  }, []);

  const startScanning = () => {
    if (timerRef.current) return;
    setIsScanning(true);
    Speech.speak(`Looking for ${goal}. Scanning signs.`, { language });

    timerRef.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.4,
          skipProcessing: true,
        });
        const guidance = await readSignsFromFrame(photo.base64, goal, language);
        setLastGuidance(guidance);
        Speech.speak(guidance, { language });
      } catch (e) {
        console.warn('SignReader capture error:', e);
      }
    }, intervalMs);
  };

  const stopScanning = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsScanning(false);
    if (onStop) onStop();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e94560" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Camera permission is required to read signs.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.back}
      />

      {/* Guidance overlay */}
      <View style={styles.overlay}>
        <Text style={styles.goalText}>🎯 Looking for: {goal}</Text>
        {lastGuidance ? (
          <Text style={styles.guidanceText}>💬 {lastGuidance}</Text>
        ) : null}

        <View style={styles.btnRow}>
          {!isScanning ? (
            <TouchableOpacity style={styles.startBtn} onPress={startScanning}>
              <Text style={styles.btnText}>▶ Start Scanning</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={stopScanning}>
              <Text style={styles.btnText}>⏹ Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {isScanning && (
          <View style={styles.scanningBadge}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.scanningText}> Scanning every {intervalMs / 1000}s...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  goalText: { color: '#e0e0e0', fontSize: 14, marginBottom: 6 },
  guidanceText: { color: '#fff', fontSize: 16, marginBottom: 12, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  startBtn: {
    backgroundColor: '#25D366', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  stopBtn: {
    backgroundColor: '#e94560', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  scanningBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  scanningText: { color: '#aaa', fontSize: 13 },
  errorText: { color: '#e94560', fontSize: 15, textAlign: 'center', padding: 20 },
});

export default SignReader;
