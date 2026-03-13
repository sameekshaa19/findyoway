import React, { useState } from 'react'
import VenueForm from '../components/VenueForm'
import FloorPlanEditor from '../components/FloorPlanEditor'
import { registerVenue } from '../services/supabaseService'
import { generateVenueId } from '../utils/idGenerator'

export default function Register({ onSuccess }) {
  const [step, setStep] = useState(1) // 1 = venue info, 2 = floor plan editor
  const [venueData, setVenueData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleVenueSubmit = (formData) => {
    const id = generateVenueId(formData.name, formData.city)
    setVenueData({ ...formData, id })
    setStep(2)
  }

  const handleFloorPlanSubmit = async (graphJson) => {
    setSaving(true)
    setError('')
    try {
      await registerVenue(venueData, graphJson)
      setSuccess(true)
      setTimeout(onSuccess, 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">Register Your Venue</h1>
      <p className="page-sub">
        Step {step} of 2 — {step === 1 ? 'Venue Details' : 'Floor Plan Editor'}
      </p>

      {success && (
        <div className="success-banner">
          ✅ Venue registered successfully! Redirecting...
        </div>
      )}
      {error && <p style={{ color: '#e94560', marginBottom: 16 }}>Error: {error}</p>}

      {step === 1 && <VenueForm onSubmit={handleVenueSubmit} />}
      {step === 2 && (
        <FloorPlanEditor
          venueName={venueData?.name}
          floors={venueData?.floors}
          onSubmit={handleFloorPlanSubmit}
          saving={saving}
        />
      )}
    </div>
  )
}
