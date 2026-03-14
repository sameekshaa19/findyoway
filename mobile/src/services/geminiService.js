import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Network configuration for different environments
const getBaseUrl = () => {
  const BACKEND_URL = Constants.expoConfig?.extra?.flaskApiUrl ||
                     process.env.EXPO_PUBLIC_FLASK_API_URL ||
                     'http://localhost:5000';
  
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host localhost
    return BACKEND_URL.replace('localhost', '10.0.2.2');
  }
  if (Platform.OS === 'ios' && !Platform.isPad) {
    // iOS simulator can use localhost
    return BACKEND_URL;
  }
  // Physical device - use your computer's local IP
  return BACKEND_URL.replace('localhost', '192.168.137.1'); // Your laptop IP
};

/**
 * Sends a text query to the Gemini conversational navigation bot.
 * @param {string} message - User's spoken input
 * @param {string} language - e.g. 'Hindi', 'English'
 * @param {string} [context] - Optional context (current location, last instruction)
 * @returns {Promise<string>} Gemini spoken reply
 */
export async function askGemini(message, language, context = '') {
  try {
    const res = await fetch(`${getBaseUrl()}/api/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language, context }),
    });
    const data = await res.json();
    return data.reply || 'No response received.';
  } catch (e) {
    console.error('Gemini text error:', e);
    return 'Unable to connect to navigation service. Please check your connection.';
  }
}

/**
 * Sends a base64 camera frame to the Flask vision endpoint.
 * Gemini reads signs in the frame and returns spoken guidance.
 *
 * @param {string} base64Frame - Base64-encoded JPEG from expo-camera
 * @param {string} goal - What the user is looking for (e.g. 'pharmacy')
 * @param {string} language - User's language
 * @returns {Promise<string>} Spoken guidance string
 */
export async function readSignsFromFrame(base64Frame, goal, language) {
  try {
    const res = await fetch(`${getBaseUrl()}/api/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: base64Frame, goal, language }),
    });
    const data = await res.json();
    return data.guidance || 'No signs detected. Keep walking.';
  } catch (e) {
    console.error('Gemini vision error:', e);
    return 'Cannot read signs at the moment. Please keep walking slowly.';
  }
}
