import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import VoiceNavigator from './src/components/VoiceNavigator';
import ObstacleDetector from './src/components/ObstacleDetector';
import SOS from './src/components/SOS';
import { LanguageProvider } from './src/context/LanguageContext';

/**
 * Main App Component
 * Integrates VoiceNavigator for turn-by-turn navigation with OSRM/Valhalla routing
 * ObstacleDetector for real-time obstacle detection
 * SOS for emergency functionality
 */
export default function App() {
  const [language, setLanguage] = useState('en-IN');
  const [showObstacleDetector, setShowObstacleDetector] = useState(false);

  const handleSOSTriggered = () => {
    // SOS already handled by the SOS component
    console.log('SOS triggered from VoiceNavigator');
  };

  return (
    <LanguageProvider>
      <View style={styles.container}>
        {/* Main Voice Navigator - Primary navigation interface */}
        <View style={styles.navigatorContainer}>
          <VoiceNavigator 
            language={language}
            onSOSTriggered={handleSOSTriggered}
          />
        </View>

        {/* Obstacle Detection Overlay - Can be toggled on/off */}
        {showObstacleDetector && (
          <View style={styles.obstacleContainer}>
            <ObstacleDetector 
              mode="obstacle" 
              language={language}
            />
          </View>
        )}

        {/* SOS Component - Always accessible */}
        <View style={styles.sosContainer}>
          <SOS language={language} />
        </View>
      </View>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  navigatorContainer: {
    flex: 1,
  },
  obstacleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 10,
  },
  sosContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 20,
  },
});
