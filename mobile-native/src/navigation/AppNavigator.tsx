import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/app/HomeScreen';
import { DestinationScreen } from '../screens/app/DestinationScreen';
import { RouteScreen } from '../screens/app/RouteScreen';
import { SOSScreen } from '../screens/app/SOSScreen';
import { SettingsScreen } from '../screens/app/SettingsScreen';
import { CameraPlaceholderScreen } from '../screens/app/CameraPlaceholderScreen';
import { VoiceAssistantPlaceholderScreen } from '../screens/app/VoiceAssistantPlaceholderScreen';
import type { RootStackParamList } from '../types/navigation';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Destination" component={DestinationScreen} />
        <Stack.Screen name="Route" component={RouteScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="CameraPlaceholder" component={CameraPlaceholderScreen} />
        <Stack.Screen
          name="VoiceAssistantPlaceholder"
          component={VoiceAssistantPlaceholderScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
