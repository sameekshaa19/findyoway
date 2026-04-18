import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../../components/app/AppButton';
import { AppHeader } from '../../components/app/AppHeader';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';
import { speak } from '../../services/speechService';

type Props = NativeStackScreenProps<RootStackParamList, 'SOS'>;

export function SOSScreen({ navigation }: Props) {
  const { location } = useLocationTracking();

  const coordinates = location
    ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
    : 'Waiting for coordinates';

  return (
    <ScreenLayout navigation={navigation} currentRoute="SOS">
      <AppHeader
        title="SOS"
        subtitle="Emergency access stays reachable from the shared shell while route tracking continues in the background."
      />
      <View style={styles.card}>
        <Text style={styles.copy}>Current coordinates</Text>
        <Text style={styles.coordinates}>{coordinates}</Text>
        <AppButton
          label="Announce Emergency Status"
          onPress={() => speak(`Emergency mode enabled. Current coordinates ${coordinates}.`)}
          variant="danger"
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
  copy: {
    color: colors.textMuted,
  },
  coordinates: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
});
