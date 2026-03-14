import React from 'react';
import ObstacleDetector from './src/components/ObstacleDetector';
import { LanguageProvider } from './src/context/LanguageContext';

/**
 * QUICK TEST
 * This renders the ObstacleDetector directly so you can verify:
 * 1. Camera permission request
 * 2. Camera feed
 * 3. Scan button functionality
 * 4. Google Vision API response (haptics/speech)
 */
export default function App() {
  return (
    <LanguageProvider>
      <ObstacleDetector mode="obstacle" language="en" />
    </LanguageProvider>
  );
}
