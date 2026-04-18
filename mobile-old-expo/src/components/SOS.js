import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, Alert
} from 'react-native';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import * as Speech from 'expo-speech';

/**
 * SOS Component — Expo-compatible
 *
 * Gets precise GPS location, then:
 *   1. Opens WhatsApp with a pre-filled emergency message + Google Maps link
 *   2. Falls back to SMS via expo-sms (no phone number pre-filled, let user choose contact)
 *   3. Final fallback: alert user to call 112 manually
 *
 * Props:
 *   language  — e.g. 'English' (for expo-speech feedback)
 */
const SOS = ({ language = 'English' }) => {
  const [loading, setLoading] = useState(false);

  const handleSOS = async () => {
    setLoading(true);
    Speech.speak('SOS activated. Getting your location.', { language });

    try {
      // 1. Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Speech.speak('Location permission denied. Sending message without coordinates.', { language });
        await _sendMessage('EMERGENCY! I need help. (Location unavailable)');
        return;
      }

      // 2. Get current position
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      const message = `🆘 FindYoWay SOS — I need assistance! My current location: ${mapsUrl}`;

      await _sendMessage(message);
    } catch (err) {
      console.error('SOS location error:', err);
      await _sendMessage('🆘 EMERGENCY! I need help. (Could not get location)');
    } finally {
      setLoading(false);
    }
  };

  const _sendMessage = async (message) => {
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encoded}`;

    // Try WhatsApp first
    try {
      const canWA = await Linking.canOpenURL(whatsappUrl);
      if (canWA) {
        await Linking.openURL(whatsappUrl);
        return;
      }
    } catch (_) { /* fall through */ }

    // Try expo-sms (SMS)
    const smsAvailable = await SMS.isAvailableAsync();
    if (smsAvailable) {
      await SMS.sendSMSAsync([], message); // user picks contact
      return;
    }

    // Final fallback
    Alert.alert(
      'SOS — Call Manually',
      'Could not send WhatsApp or SMS. Please dial 112 now.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, loading && styles.btnLoading]}
        onPress={handleSOS}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.text}>{loading ? 'SENDING...' : '🆘 SOS'}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Tap to send your location to emergency contacts</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 12 },
  btn: {
    backgroundColor: '#e94560',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    borderWidth: 4,
    borderColor: '#ff8a9b',
  },
  btnLoading: { backgroundColor: '#a0283e' },
  text: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  hint: { color: '#aaa', fontSize: 12, marginTop: 8, textAlign: 'center' },
});

export default SOS;