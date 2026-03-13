import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Speech from 'expo-speech';

/**
 * TurnByTurnNav — full implementation.
 *
 * Features:
 * - Speaks steps one at a time with a smart delay
 * - Waits for TTS to finish before advancing (uses Speech.speak callbacks)
 * - Shows current step text on screen (for sighted helpers)
 * - "Repeat" button re-speaks current step
 * - "Next" button manually advances a step (rescue for when auto-advance fails)
 * - Fires onComplete callback when all steps spoken
 */
export default function TurnByTurnNav({ steps, language, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [finished, setFinished] = useState(false);
  const isMounted = useRef(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Speak a step by index
  const speakStep = (index) => {
    if (!steps || index >= steps.length) {
      if (isMounted.current) {
        setFinished(true);
        onComplete?.();
      }
      return;
    }

    setSpeaking(true);
    fadeIn();

    Speech.speak(steps[index], {
      language,
      onDone: () => {
        if (!isMounted.current) return;
        setSpeaking(false);
        // Auto-advance to next step after 2 s pause
        setTimeout(() => {
          if (!isMounted.current) return;
          const nextIdx = index + 1;
          setCurrentIndex(nextIdx);
          speakStep(nextIdx);
        }, 2000);
      },
      onError: () => {
        if (isMounted.current) setSpeaking(false);
      },
    });
  };

  // Start navigation when steps arrive
  useEffect(() => {
    if (!steps || steps.length === 0) return;
    setCurrentIndex(0);
    setFinished(false);
    speakStep(0);
  }, [steps]);

  const fadeIn = () => {
    fadeAnim.setValue(0.3);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleRepeat = () => {
    Speech.stop();
    speakStep(currentIndex);
  };

  const handleNext = () => {
    Speech.stop();
    const next = currentIndex + 1;
    setCurrentIndex(next);
    speakStep(next);
  };

  if (!steps || steps.length === 0) return null;

  const currentStep = steps[currentIndex] || '';
  const progress = steps.length > 0 ? (currentIndex / steps.length) : 0;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={styles.progressText}>
        Step {Math.min(currentIndex + 1, steps.length)} of {steps.length}
      </Text>

      {/* Current instruction */}
      <Animated.View style={[styles.stepBox, { opacity: fadeAnim }]}>
        {finished ? (
          <Text style={styles.doneText}>✅ You have arrived!</Text>
        ) : (
          <Text style={styles.stepText}>{currentStep}</Text>
        )}
      </Animated.View>

      {/* Controls */}
      {!finished && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleRepeat}
            accessibilityLabel="Repeat current instruction"
          >
            <Text style={styles.controlIcon}>🔁</Text>
            <Text style={styles.controlLabel}>Repeat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleNext}
            accessibilityLabel="Skip to next step"
          >
            <Text style={styles.controlIcon}>⏭</Text>
            <Text style={styles.controlLabel}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  progressBg: {
    backgroundColor: '#0f3460', borderRadius: 4, height: 6, marginBottom: 6,
  },
  progressFill: {
    backgroundColor: '#e94560', borderRadius: 4, height: 6,
  },
  progressText: {
    color: '#aaa', fontSize: 12, textAlign: 'right', marginBottom: 12,
  },
  stepBox: {
    minHeight: 70, justifyContent: 'center',
  },
  stepText: {
    color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 26, textAlign: 'center',
  },
  doneText: {
    color: '#3ddc84', fontSize: 20, fontWeight: 'bold', textAlign: 'center',
  },
  controls: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 16,
  },
  controlBtn: {
    alignItems: 'center', padding: 12,
  },
  controlIcon: { fontSize: 26 },
  controlLabel: { color: '#aaa', fontSize: 12, marginTop: 4 },
});
