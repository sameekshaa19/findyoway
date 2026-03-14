import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, ActivityIndicator
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

/**
 * VoiceBot — Expo-compatible voice input component.
 *
 * Props:
 *  onTranscript(text)  — called with the recognised text (used by all screens)
 *  language            — e.g. 'English', 'Hindi' (passed to expo-speech)
 *
 * NOTE: Expo Go does not support speech-to-text natively.
 * This component uses expo-av to record audio, sends the WAV to a
 * Web Speech API polyfill on the backend, or — for the hackathon demo —
 * falls back to a simulated transcript so the UI stays fully functional.
 *
 * To wire up real STT, replace _transcribeAudio with a call to your
 * preferred STT service (Google Cloud STT, Azure, Whisper, etc.).
 */
const BACKEND_URL =
  process.env.BACKEND_URL || 'http://10.0.2.2:5000'; // 10.0.2.2 = localhost on Android emulator

const VoiceBot = ({ onTranscript, language = 'English' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef(null);

  // Request mic permission and start recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Speech.speak('Microphone permission is required.', { language });
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Start recording error:', err);
    }
  };

  // Stop recording, send audio to backend for transcription
  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // --- Send audio to backend STT endpoint ---
      const transcript = await _transcribeAudio(uri);

      if (transcript && onTranscript) {
        onTranscript(transcript);
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      Speech.speak('Could not process audio. Please try again.', { language });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Transcribe audio by uploading to your backend.
   * Replace with your actual STT service call.
   * For the hackathon, the backend can use Google Cloud STT or Whisper.
   *
   * DEMO FALLBACK: If the backend STT endpoint is not set up yet,
   * a placeholder transcript is returned so the navigation flow works.
   */
  const _transcribeAudio = async (audioUri) => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'voice.m4a',
        type: 'audio/m4a',
      });
      formData.append('language', language);

      const response = await fetch(`${BACKEND_URL}/api/stt`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.transcript || '';
      }
    } catch (e) {
      console.warn('STT backend not available, using demo fallback:', e.message);
    }
    // Demo fallback — remove once real STT is wired up
    return 'pharmacy';
  };

  return (
    <View style={styles.container}>
      {isProcessing && (
        <ActivityIndicator size="small" color="#e94560" style={styles.spinner} />
      )}
      <TouchableOpacity
        style={[styles.btn, isRecording && styles.btnRecording]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={isProcessing}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{isRecording ? '🔴' : '🎙'}</Text>
        <Text style={styles.label}>
          {isRecording ? 'Listening...' : 'Hold to Speak'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  spinner: { marginBottom: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 28,
    gap: 10,
  },
  btnRecording: { backgroundColor: '#e94560' },
  icon: { fontSize: 20 },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default VoiceBot;
