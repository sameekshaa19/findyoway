import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LanguageProvider } from './src/context/LanguageContext';

import LanguagePickerScreen from './src/screens/LanguagePickerScreen';
import OutdoorNavScreen from './src/screens/OutdoorNavScreen';
import IndoorNavScreen from './src/screens/IndoorNavScreen';
import VisionNavScreen from './src/screens/VisionNavScreen';
import SOSScreen from './src/screens/SOSScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="LanguagePicker"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="LanguagePicker" component={LanguagePickerScreen} />
          <Stack.Screen name="OutdoorNav" component={OutdoorNavScreen} />
          {/* Path A — venue is registered, floor plan available */}
          <Stack.Screen name="IndoorNav" component={IndoorNavScreen} />
          {/* Path B — no floor plan, Gemini reads signs live */}
          <Stack.Screen name="VisionNav" component={VisionNavScreen} />
          <Stack.Screen name="SOS" component={SOSScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
