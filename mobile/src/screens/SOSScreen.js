import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/LanguageContext';

export default function SOSScreen({ route }) {
  const { language } = useLanguage();
  const coords = route?.params?.coords;

  const locationText = coords
    ? `Lat: ${coords.latitude.toFixed(5)}, Lng: ${coords.longitude.toFixed(5)}`
    : 'Location unavailable';

  const message = `🆘 FindYoWay SOS — I need assistance. My location: ${locationText}`;

  useEffect(() => {
    Speech.speak("SOS activated. Sending help request.", { language });
  }, []);

  const openWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('WhatsApp not installed', 'Sending SMS instead.', [
        { text: 'OK', onPress: sendSMS }
      ])
    );
  };

  const sendSMS = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS not available', 'Please call emergency services manually.');
      return;
    }
    await SMS.sendSMSAsync([], message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🆘 SOS</Text>
      <Text style={styles.location}>{locationText}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
        <Text style={styles.btnText}>Send via WhatsApp</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.smsBtn} onPress={sendSMS}>
        <Text style={styles.btnText}>Send via SMS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#e94560', marginBottom: 16 },
  location: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  message: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  whatsappBtn: { backgroundColor: '#25D366', borderRadius: 12, padding: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  smsBtn: { backgroundColor: '#0f3460', borderRadius: 12, padding: 18, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
