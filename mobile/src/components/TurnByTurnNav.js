import { useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';

const STEP_DELAY_MS = 5000; // Pause between speaking each step

/**
 * TurnByTurnNav — receives an array of step strings from Dijkstra,
 * speaks them one by one with a delay between each.
 * No visual output — blind-user friendly audio only.
 */
export default function TurnByTurnNav({ steps, language }) {
  const stepIndex = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!steps || steps.length === 0) return;
    stepIndex.current = 0;

    const speakNext = () => {
      if (stepIndex.current >= steps.length) {
        Speech.speak("You have reached your destination.", { language });
        clearInterval(timer.current);
        return;
      }
      Speech.speak(steps[stepIndex.current], { language });
      stepIndex.current += 1;
    };

    speakNext(); // Speak first step immediately
    timer.current = setInterval(speakNext, STEP_DELAY_MS);

    return () => clearInterval(timer.current);
  }, [steps]);

  return null; // No visual output
}
