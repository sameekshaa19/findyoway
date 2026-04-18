import React, { useState, useRef } from 'react'
import {
  View, TouchableOpacity, Text,
  StyleSheet, ActivityIndicator
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import * as Speech from 'expo-speech'

// ── UPDATE THIS TO YOUR LAPTOP'S WIFI IP ──────────────────────────────────────
// Run `ipconfig` → look for "Wireless LAN adapter Wi-Fi" → IPv4 Address
const BACKEND_URL = 'http://10.150.131.217:5000'
  // ← change this

// ── API callers matching your actual Flask endpoints ──────────────────────────

// POST /api/detect  — MobileNet-SSD object detection
async function detectObjects(base64Image) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: base64Image }),
    })
    const data = await res.json()
    // Returns: { objects: [{name, score, distance, isDangerous, bbox}], count }
    return data
  } catch (e) {
    console.warn('detectObjects error:', e)
    return null
  }
}

// POST /api/vision  — EasyOCR sign reading
async function readSigns(base64Image, language = 'English') {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frame: base64Image,
        goal: 'destination',
        language,
      }),
    })
    const data = await res.json()
    // Returns: { guidance: "Sign detected: EXIT | STAIRS" }
    return data.guidance || null
  } catch (e) {
    console.warn('readSigns error:', e)
    return null
  }
}

// GET /health — connectivity check
async function checkBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { method: 'GET' })
    const data = await res.json()
    return data.status === 'healthy'
  } catch (e) {
    return false
  }
}

// ── Language map for Speech ───────────────────────────────────────────────────
const LANG_MAP = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'kn-IN': 'Kannada',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'mr-IN': 'Marathi',
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ObstacleDetector({ language = 'en-IN' }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning]         = useState(false)
  const [mode, setMode]                 = useState('obstacle')
  const [status, setStatus]             = useState('Ready to scan')
  const [detections, setDetections]     = useState([])
  const [backendOk, setBackendOk]       = useState(null) // null=unknown, true/false
  const cameraRef = useRef(null)

  const langLabel = LANG_MAP[language] || 'English'

  // ── Check backend connectivity ─────────────────────────────────────────────
  const testBackend = async () => {
    setStatus('Checking backend connection…')
    const ok = await checkBackend()
    setBackendOk(ok)
    if (ok) {
      setStatus('✅ Backend connected — ready to scan')
      Speech.speak('Backend connected')
    } else {
      setStatus(`❌ Cannot reach ${BACKEND_URL}\nCheck IP and WiFi`)
      Speech.speak('Backend not reachable. Check your IP address.')
    }
  }

  // ── Main scan handler ──────────────────────────────────────────────────────
  const scanSurroundings = async () => {
    if (scanning || !cameraRef.current) return

    setScanning(true)
    setDetections([])
    setStatus(mode === 'obstacle' ? 'Scanning for obstacles…' : 'Reading signs…')
    Speech.speak(mode === 'obstacle' ? 'Scanning surroundings' : 'Reading signs')

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
        skipProcessing: true,
      })

      if (!photo.base64) {
        setStatus('Failed to capture image')
        setScanning(false)
        return
      }

      // ── Sign reading mode ────────────────────────────────────────────────
      if (mode === 'sign') {
        const guidance = await readSigns(photo.base64, langLabel)
        if (!guidance) {
          Speech.speak('Could not read signs. Check backend connection.')
          setStatus('❌ Sign reading failed — backend unreachable')
        } else {
          Speech.speak(guidance)
          setStatus(`📋 ${guidance}`)
        }
        setScanning(false)
        return
      }

      // ── Obstacle detection mode ──────────────────────────────────────────
      const result = await detectObjects(photo.base64)

      if (!result) {
        Speech.speak('Could not scan. Check your backend connection.')
        setStatus(`❌ Scan failed\nBackend: ${BACKEND_URL}`)
        setScanning(false)
        return
      }

      const { objects = [], count = 0 } = result
      setDetections(objects)

      if (count === 0) {
        Speech.speak('Path looks clear ahead.')
        setStatus('✅ Path clear')
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setScanning(false)
        return
      }

      // Find the most dangerous / closest object
      const dangerous = objects.find(o => o.isDangerous)
      const primary   = dangerous || objects[0]

      if (primary.isDangerous) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        const pct = Math.round(primary.score * 100)
        Speech.speak(`Warning. ${primary.name} detected, ${primary.distance}.`)
        setStatus(`⚠️ ${primary.name} — ${primary.distance} (${pct}%)`)
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        const pct = Math.round(primary.score * 100)
        Speech.speak(`${primary.name} detected, ${primary.distance}.`)
        setStatus(`${primary.name} — ${primary.distance} (${pct}%)`)
      }

    } catch (e) {
      console.warn('Scan error:', e)
      Speech.speak('Scan failed. Please try again.')
      setStatus('Scan failed — see console')
    }

    setScanning(false)
  }

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200ea" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera access needed for obstacle detection.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Camera feed */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Status overlay */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* Detection results list */}
      {detections.length > 0 && (
        <View style={styles.detectionList}>
          <Text style={styles.detectionHeader}>
            Detected ({detections.length})
          </Text>
          {detections.slice(0, 4).map((obj, i) => (
            <View key={i} style={styles.detectionRow}>
              <Text style={[
                styles.detectionName,
                obj.isDangerous && styles.detectionDanger,
              ]}>
                {obj.isDangerous ? '⚠️' : '•'} {obj.name}
              </Text>
              <Text style={styles.detectionMeta}>
                {obj.distance} · {Math.round(obj.score * 100)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Mode toggle */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'obstacle' && styles.modeButtonActive]}
          onPress={() => setMode('obstacle')}
        >
          <Text style={[styles.modeButtonText, mode === 'obstacle' && styles.modeButtonTextActive]}>
            🚧 Obstacles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'sign' && styles.modeButtonActive]}
          onPress={() => setMode('sign')}
        >
          <Text style={[styles.modeButtonText, mode === 'sign' && styles.modeButtonTextActive]}>
            📋 Read Signs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom row: Test Connection + Scan */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={[
            styles.testButton,
            backendOk === true  && styles.testButtonOk,
            backendOk === false && styles.testButtonFail,
          ]}
          onPress={testBackend}
        >
          <Text style={styles.testButtonText}>
            {backendOk === null  ? '🔌 Test'
           : backendOk === true  ? '✅ OK'
           :                       '❌ Retry'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scanButton,
            scanning        && styles.scanButtonDisabled,
            mode === 'sign' && styles.signButton,
          ]}
          onPress={scanSurroundings}
          disabled={scanning}
        >
          <Text style={styles.buttonText}>
            {scanning
              ? (mode === 'obstacle' ? '⏳ Scanning…' : '⏳ Reading…')
              : (mode === 'obstacle' ? '📷 Scan'      : '📋 Read Signs')}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', backgroundColor: 'black', padding: 24,
  },
  text: { color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 20 },

  // Status
  statusBar: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statusText: {
    color: 'white', fontSize: 14,
    textAlign: 'center', fontWeight: '500',
  },

  // Detection list
  detectionList: {
    position: 'absolute', top: 140, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  detectionHeader: {
    color: '#aaa', fontSize: 12,
    fontWeight: 'bold', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  detectionRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detectionName: { color: 'white', fontSize: 14, fontWeight: '600' },
  detectionDanger: { color: '#ff6b6b' },
  detectionMeta: { color: '#aaa', fontSize: 13 },

  // Mode toggle
  modeBar: {
    position: 'absolute', bottom: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25, padding: 4, gap: 6,
  },
  modeButton: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20,
  },
  modeButtonActive: { backgroundColor: '#6200ea' },
  modeButtonText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  modeButtonTextActive: { color: 'white' },

  // Bottom row
  bottomRow: {
    position: 'absolute', bottom: 50,
    left: 20, right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  testButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  testButtonOk:   { backgroundColor: 'rgba(22,199,154,0.3)', borderColor: '#16c79a' },
  testButtonFail: { backgroundColor: 'rgba(233,69,96,0.3)',  borderColor: '#e94560' },
  testButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

  scanButton: {
    flex: 1,
    backgroundColor: '#6200ea',
    paddingVertical: 18, paddingHorizontal: 20,
    borderRadius: 35, elevation: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5,
  },
  signButton:         { backgroundColor: '#00bfa5' },
  scanButtonDisabled: { backgroundColor: '#555' },
  buttonText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  button: {
    backgroundColor: '#6200ea',
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12,
  },
})