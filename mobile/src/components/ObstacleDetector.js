import { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const DANGER_CLASSES = ['person', 'chair', 'stairs', 'potted plant', 'dog', 'bicycle', 'car'];
const DETECT_INTERVAL_MS = 1500;

/**
 * ObstacleDetector — runs TensorFlow COCO-SSD on live camera frames.
 * Does NOT render anything — it's a logic-only component.
 * When a dangerous object is detected it:
 *   1. Fires double haptic buzz
 *   2. Speaks the obstacle warning in the user's language
 */
export default function ObstacleDetector({ cameraRef, language }) {
  const model = useRef(null);
  const timer = useRef(null);
  const lastSpoken = useRef('');

  useEffect(() => {
    let mounted = true;

    const loadAndDetect = async () => {
      await tf.ready();
      model.current = await cocoSsd.load();

      timer.current = setInterval(async () => {
        if (!cameraRef?.current || !model.current || !mounted) return;
        try {
          const photo = await cameraRef.current.takePictureAsync({
            base64: true, quality: 0.3, skipProcessing: true,
          });

          // Convert base64 to tensor
          const imgB64 = photo.base64;
          const raw = Uint8Array.from(atob(imgB64), (c) => c.charCodeAt(0));
          const imageTensor = tf.tidy(() => {
            const decoded = tf.node ? tf.node.decodeImage(raw, 3) : null;
            return decoded;
          });

          if (!imageTensor) return;

          const predictions = await model.current.detect(imageTensor);
          imageTensor.dispose();

          const obstacles = predictions.filter(
            (p) => DANGER_CLASSES.includes(p.class) && p.score > 0.55
          );

          if (obstacles.length > 0) {
            const topObstacle = obstacles[0].class;
            if (topObstacle !== lastSpoken.current) {
              lastSpoken.current = topObstacle;
              // Double haptic buzz
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
              Speech.speak(`Obstacle ahead: ${topObstacle}. Move slightly.`, { language });
            }
          }
        } catch (e) {
          console.log('Obstacle detection error:', e);
        }
      }, DETECT_INTERVAL_MS);
    };

    loadAndDetect();
    return () => {
      mounted = false;
      clearInterval(timer.current);
    };
  }, []);

  return null; // No visual output — audio + haptics only
}
