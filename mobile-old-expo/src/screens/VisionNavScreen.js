import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import VoiceBot from '../components/VoiceBot';
import ObstacleDetector from '../components/ObstacleDetector';
import { readSignsFromFrame } from '../services/geminiService';

const SIGN_READ_INTERVAL_MS = 3000; // Read signs every 3 seconds

/**
 * Path B — VisionNavScreen
 * Building NOT registered. Camera stays on full-screen.
 * Gemini Vision reads signs in real time and gives spoken guidance.
 * Obstacle detection runs in parallel.
 */
export default function VisionNavScreen() {
  const { language } = useLanguage();
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [goal, setGoal] = useState('');
  const [listening, setListening] = useState(true);
  const signReadTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    Speech.speak("Camera mode on. Say where you want to go.", { language });
    return () => clearInterval(signReadTimer.current);
  }, []);

  const startSignReading = useCallback((userGoal) => {
    if (signReadTimer.current) clearInterval(signReadTimer.current);
    signReadTimer.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.4, skipProcessing: true
        });
        const guidance = await readSignsFromFrame(photo.base64, userGoal, language);
        Speech.speak(guidance, { language });
      } catch (e) {
        console.log('Vision read error:', e);
      }
    }, SIGN_READ_INTERVAL_MS);
  }, [language]);

  const handleVoiceInput = (transcript) => {
    if (!goal && transcript) {
      setGoal(transcript);
      setListening(false);
      Speech.speak(`Looking for ${transcript}. Follow my guidance.`, { language });
      startSignReading(transcript);
    } else if (transcript?.toLowerCase().includes('repeat')) {
      Speech.speak(`You're trying to reach: ${goal}. Please follow the camera guidance.`, { language });
    }
  };

  if (hasPermission === null) return <View style={styles.container} />;
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Camera permission is required for this mode.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera ref={cameraRef} style={styles.camera} type={Camera.Constants.Type.back}>
        <ObstacleDetector cameraRef={cameraRef} language={language} />
        <View style={styles.overlay}>
          <Text style={styles.goalText}>{goal ? `🎯 Goal: ${goal}` : '🎙 Say your destination...'}</Text>
          <VoiceBot onTranscript={handleVoiceInput} language={language} />
          <TouchableOpacity style={styles.sosBtn} onPress={() => navigation.navigate('SOS', {})}>
            <Text style={styles.sosBtnText}>🆘 SOS</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 24,
  },
  goalText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  error: { color: '#e94560', fontSize: 16, textAlign: 'center', marginTop: 80 },
  sosBtn: { backgroundColor: '#e94560', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  sosBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
