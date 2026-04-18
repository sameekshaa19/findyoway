import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

const LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'
];

export default function LanguagePickerScreen({ navigation }) {
  const { language, setLanguage } = useLanguage();

  // If language was already picked before, go straight to outdoor nav
  useEffect(() => {
    AsyncStorage.getItem('selectedLanguage').then((saved) => {
      if (saved) {
        setLanguage(saved);
        navigation.replace('OutdoorNav');
      }
    });
  }, []);

  const selectLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('selectedLanguage', lang);
    navigation.replace('OutdoorNav');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>FindYoWay</Text>
      <Text style={styles.subtitle}>Choose your language{'\n'}अपनी भाषा चुनें</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.langButton, lang === language && styles.selected]}
            onPress={() => selectLanguage(lang)}
            accessibilityLabel={`Select ${lang}`}
          >
            <Text style={styles.langText}>{lang}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', paddingTop: 80 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#e94560', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16 },
  langButton: {
    backgroundColor: '#16213e', borderRadius: 12, paddingVertical: 18, paddingHorizontal: 24,
    margin: 8, minWidth: 130, alignItems: 'center', borderWidth: 2, borderColor: '#0f3460'
  },
  selected: { borderColor: '#e94560' },
  langText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
