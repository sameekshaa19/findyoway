import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';

type VoiceCTAButtonProps = {
  onPress: () => void;
  label?: string;
};

export function VoiceCTAButton({
  onPress,
  label = 'Voice assistant placeholder',
}: VoiceCTAButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  label: {
    color: colors.textDark,
    fontWeight: '800',
    fontSize: 15,
  },
});
