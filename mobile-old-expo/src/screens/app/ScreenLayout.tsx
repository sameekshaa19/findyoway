import React, { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';
import { BottomNav } from '../../components/app/BottomNav';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types/navigation';

type ScreenLayoutProps = PropsWithChildren<{
  navigation: NavigationProp<RootStackParamList>;
  currentRoute: 'Home' | 'Destination' | 'SOS' | 'Settings';
  scrollable?: boolean;
}>;

export function ScreenLayout({
  children,
  navigation,
  currentRoute,
  scrollable = true,
}: ScreenLayoutProps) {
  const content = scrollable ? (
    <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {content}
      <BottomNav navigation={navigation} currentRoute={currentRoute} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
});
