import React, { useState, useRef } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import * as Speech from 'expo-speech'
import { analyzeFrame } from '../services/visionAPI'

/**
 * ObstacleDetector
 * ────────────────
 * Main camera component for real-time navigation assistance.
 * Features:
 *  - Interactive Scan: Tap to analyze the current frame.
 *  - Obstacle Detection: Warns about dangerous objects (people, chairs, stairs, etc.)
 *  - Sign Reading: Speaks any visible text found in the frame.
 *  - Feedback: Haptic pulses and Text-to-Speech guidance.
 */
export default function ObstacleDetector() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState('Ready to scan')
  const cameraRef = useRef(null)

  const scanSurroundings = async () => {
    if (scanning || !cameraRef.current) return
    
    setScanning(true)
    setStatus('Scanning...')
    Speech.speak('Scanning surroundings')

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      })

      const result = await analyzeFrame(photo.base64)

      if (!result) {
        Speech.speak('Could not scan. Try again.')
        setStatus('Scan failed')
        setScanning(false)
        return
      }

      // ─── Obstacle Analysis ───────────────────────────────────────────────
      const objects = result.localizedObjectAnnotations || []
      const dangerous = ['Person', 'Chair', 'Table', 'Stairs', 
                         'Door', 'Bottle', 'Bag', 'Couch']
      
      const found = objects.find(o =>
        dangerous.includes(o.name) && o.score > 0.6
      )

      // ─── Sign Analysis ───────────────────────────────────────────────────
      const signText = result.textAnnotations?.[0]?.description?.trim()

      // ─── Result Feedback ─────────────────────────────────────────────────
      if (found && signText) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        Speech.speak(`${found.name} detected ahead. I can also see a sign saying ${signText}`)
        setStatus(`⚠️ ${found.name} | Sign: ${signText}`)
      } else if (found) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        Speech.speak(`${found.name} detected ahead. Please be careful.`)
        setStatus(`⚠️ ${found.name} detected`)
      } else if (signText) {
        Speech.speak(`I can see a sign that says: ${signText}`)
        setStatus(`📋 Sign: ${signText}`)
      } else {
        Speech.speak('Path looks clear ahead.')
        setStatus('✅ Path clear')
      }

    } catch (e) {
      console.log('Scan error:', e)
      Speech.speak('Scan failed. Please try again.')
      setStatus('Scan failed')
    }

    setScanning(false)
  }

  // ─── Permissions Gate ──────────────────────────────────────────────────────
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
        <Text style={styles.text}>Camera access needed for navigation</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

      {/* Result Status Overlay */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* Main Action Button */}
      <TouchableOpacity
        style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
        onPress={scanSurroundings}
        disabled={scanning}
      >
        <Text style={styles.buttonText}>
          {scanning ? '⏳ Scanning...' : '📷 Scan Surroundings'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black' 
  },
  camera: { 
    flex: 1 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'black' 
  },
  text: { 
    color: 'white', 
    fontSize: 16, 
    marginBottom: 20 
  },
  statusBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusText: { 
    color: 'white', 
    fontSize: 15, 
    textAlign: 'center',
    fontWeight: '500'
  },
  scanButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#6200ea',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  scanButtonDisabled: { 
    backgroundColor: '#555' 
  },
  buttonText: { 
    color: 'white', 
    fontSize: 17, 
    fontWeight: 'bold' 
  },
  button: { 
    backgroundColor: '#6200ea', 
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12 
  }
})
