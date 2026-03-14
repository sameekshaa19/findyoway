// Google Vision API configuration
// EXPO_PUBLIC_ prefix is required for Expo to expose variables to the JS environment
const API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY || 'AIzaSyA1tDbDovmq1-kdWwG-dYZUQDQpf_-e6b0'

/**
 * analyzeFrame
 * ────────────
 * Sends a base64 image to Google Cloud Vision API.
 * Uses OBJECT_LOCALIZATION to detect obstacles and TEXT_DETECTION for signs.
 * 
 * @param {string} base64Image - Base64 encoded JPEG string
 * @returns {Promise<Object|null>} - First response from Vision API or null on error
 */
export const analyzeFrame = async (base64Image) => {
  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'TEXT_DETECTION', maxResults: 5 }
            ]
          }]
        })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Vision API responded with status ${response.status}`)
    }

    const data = await response.json()
    return data.responses?.[0] || null
  } catch (e) {
    console.log('Vision API error:', e)
    return null
  }
}
