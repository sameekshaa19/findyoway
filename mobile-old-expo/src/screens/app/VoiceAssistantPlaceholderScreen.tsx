import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = StackScreenProps<RootStackParamList, 'VoiceAssistantPlaceholder'>;

export function VoiceAssistantPlaceholderScreen({ navigation }: Props) {
  return (
    <ScreenLayout navigation={navigation} currentRoute="Home">
      <AppHeader
        title="Voice Assistant Placeholder"
        subtitle="Reserved integration point for the voice-assistant workstream."
      />
      <View style={styles.card}>
        <Text style={styles.text}>
          Person 3 can connect backend-driven voice assistant flows here while keeping the shared app shell intact.
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
