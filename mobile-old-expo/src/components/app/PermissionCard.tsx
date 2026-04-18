import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors, radii, spacing } from '../../constants/theme';

type PermissionCardProps = {
  title: string;
  description: string;
};

export function PermissionCard({ title, description }: PermissionCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <AppButton label="Open Settings" onPress={() => Linking.openSettings()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
