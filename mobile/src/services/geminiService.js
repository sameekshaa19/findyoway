import Constants from 'expo-constants';

// Load backend URL from .env (Expo exposes extra config via Constants.expoConfig.extra)
// For local development, update your .env BACKEND_URL to your laptop's LAN IP
const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  process.env.BACKEND_URL ||
  'http://localhost:5000';

/**
 * Sends a text query to the Gemini conversational navigation bot.
 * @param {string} message - User's spoken input
 * @param {string} language - e.g. 'Hindi', 'English'
 * @param {string} [context] - Optional context (current location, last instruction)
 * @returns {Promise<string>} Gemini spoken reply
 */
export async function askGemini(message, language, context = '') {
  try {
    const res = await fetch(`${BACKEND_URL}/api/navigate`, {
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
    const res = await fetch(`${BACKEND_URL}/api/vision`, {
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
