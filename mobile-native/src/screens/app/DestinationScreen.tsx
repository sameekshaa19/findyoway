import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../../components/app/AppButton';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'Destination'>;

export function DestinationScreen({ navigation }: Props) {
  const [destination, setDestination] = useState('');

  return (
    <ScreenLayout navigation={navigation} currentRoute="Destination">
      <AppHeader
        title="Destination Input"
        subtitle="This screen defines the mobile-to-backend contract for destination text and launches the route engine."
      />

      <View style={styles.card}>
        <Text style={styles.label}>Where do you want to go?</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="Library, main gate, hospital..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <AppButton
          label="Build Outdoor Route"
          onPress={() => navigation.navigate('Route', { destination })}
          disabled={!destination.trim()}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
});
