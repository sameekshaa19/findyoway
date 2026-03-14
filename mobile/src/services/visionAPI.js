// Backend object detection API
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.150.131.217:5000'

export const analyzeFrame = async (base64Image) => {
  try {
    // Call backend object detection endpoint
    const response = await fetch(`${BACKEND_URL}/api/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: base64Image })
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`)
    }
    
    const data = await response.json()
    
    // Map backend response to expected format
    const objects = (data.objects || []).map(obj => ({
      name: obj.name,
      score: obj.score,
      distance: obj.distance
    }))
    
    return {
      localizedObjectAnnotations: objects,
      textAnnotations: []
    }
    
  } catch (e) {
    console.log('Detection error:', e.message)
    return null
  }
}
