import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = StackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  return (
    <ScreenLayout navigation={navigation} currentRoute="Settings">
      <AppHeader
        title="Settings"
        subtitle="Shared configuration lives here so feature teams can add toggles without changing the route flow."
      />
      <View style={styles.card}>
        <Text style={styles.title}>Foundation defaults</Text>
        <Text style={styles.text}>Language locale: en-IN</Text>
        <Text style={styles.text}>Route provider: OSRM walking</Text>
        <Text style={styles.text}>Geocoder: OpenStreetMap Nominatim</Text>
        <Text style={styles.text}>Step reached threshold: 12 meters</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  text: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
