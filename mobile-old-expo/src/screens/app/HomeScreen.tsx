import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { AppButton } from '../../components/app/AppButton';
import { AppHeader } from '../../components/app/AppHeader';
import { VoiceCTAButton } from '../../components/app/VoiceCTAButton';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <ScreenLayout navigation={navigation} currentRoute="Home">
      <AppHeader
        title="FindYoWay"
        subtitle="Person 1 foundation build: mobile shell, shared contracts, and outdoor navigation flow."
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Primary flow</Text>
        <Text style={styles.cardText}>
          Home to destination input to outdoor route is now owned by the mobile foundation layer.
        </Text>
        <AppButton label="Start Navigation" onPress={() => navigation.navigate('Destination')} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parallel team placeholders</Text>
        <Text style={styles.cardText}>
          Person 2 and Person 3 can plug their work into dedicated screens without touching the route shell.
        </Text>
        <AppButton
          label="Open Camera Placeholder"
          onPress={() => navigation.navigate('CameraPlaceholder')}
          variant="secondary"
        />
        <AppButton
          label="Open Voice Assistant Placeholder"
          onPress={() => navigation.navigate('VoiceAssistantPlaceholder')}
          variant="secondary"
        />
      </View>

      <VoiceCTAButton onPress={() => navigation.navigate('VoiceAssistantPlaceholder')} />
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
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
