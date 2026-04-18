import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = StackScreenProps<RootStackParamList, 'CameraPlaceholder'>;

export function CameraPlaceholderScreen({ navigation }: Props) {
  return (
    <ScreenLayout navigation={navigation} currentRoute="Home">
      <AppHeader
        title="Camera Placeholder"
        subtitle="Reserved integration point for the camera and obstacle-detection workstream."
      />
      <View style={styles.card}>
        <Text style={styles.text}>
          Person 2 can replace this screen with the camera pipeline without changing the shared navigation shell.
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
