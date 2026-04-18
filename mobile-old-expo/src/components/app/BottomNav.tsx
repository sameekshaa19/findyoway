import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types/navigation';
import { colors, radii, spacing } from '../../constants/theme';

type BottomTabRoute = 'Home' | 'Destination' | 'SOS' | 'Settings';

type BottomNavProps = {
  navigation: NavigationProp<RootStackParamList>;
  currentRoute: BottomTabRoute;
};

const tabs: Array<{ label: string; route: BottomTabRoute }> = [
  { label: 'Home', route: 'Home' },
  { label: 'Destination', route: 'Destination' },
  { label: 'SOS', route: 'SOS' },
  { label: 'Settings', route: 'Settings' },
];

export function BottomNav({ navigation, currentRoute }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentRoute === tab.route;
        return (
          <Pressable
            key={tab.route}
            onPress={() => navigation.navigate(tab.route as never)}
            style={[styles.tab, isActive ? styles.activeTab : null]}
          >
            <Text style={[styles.label, isActive ? styles.activeLabel : null]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.text,
  },
});
