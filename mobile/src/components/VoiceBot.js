import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100, numberOfChannels: 1, bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100, numberOfChannels: 1, bitRate: 128000,
  },
  web: {},
};

/**
 * VoiceBot component
 * - Hold the mic button to record
 * - On release, sends audio to backend /api/navigate for transcription + Gemini reply
 * - Calls onTranscript(text) so parent screen can handle the response
 *
 * For hackathon simplicity we do basic voice recording with expo-av.
 * Person 3 can wire up Whisper or Gemini audio transcription on the backend.
 */
export default function VoiceBot({ onTranscript, language }) {
  const recording = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(RECORDING_OPTIONS);
      await rec.startAsync();
      recording.current = rec;
      setIsRecording(true);
    } catch (e) {
      console.error('Recording start error:', e);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;
      // TODO Person 3: Send audio URI to Whisper or Gemini transcription endpoint
      // For now, emit a placeholder so UI is testable
      if (onTranscript) onTranscript('');
      console.log('Audio saved to:', uri);
    } catch (e) {
      console.error('Recording stop error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.micBtn, isRecording && styles.recording]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        accessibilityLabel="Hold to speak"
        accessibilityHint="Hold to record your voice command, release to send"
      >
        <Text style={styles.micIcon}>{isRecording ? '🔴' : '🎙'}</Text>
        <Text style={styles.micText}>{isRecording ? 'Listening...' : 'Hold to speak'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  micBtn: {
    backgroundColor: '#0f3460', borderRadius: 50, width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#e94560'
  },
  recording: { backgroundColor: '#e94560' },
  micIcon: { fontSize: 32 },
  micText: { color: '#fff', fontSize: 10, marginTop: 4 },
});
