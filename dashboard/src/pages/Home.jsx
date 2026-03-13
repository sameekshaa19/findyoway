import React, { useEffect, useState } from 'react'
import VenueList from '../components/VenueList'
import { getAllVenues } from '../services/supabaseService'

export default function Home({ onRegister }) {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAllVenues()
      .then(setVenues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Registered Venues</h1>
          <p className="page-sub">Buildings supporting blind navigation via FindYoWay</p>
        </div>
        <button className="btn-primary" onClick={onRegister}>+ Register Venue</button>
      </div>

      {loading && <p style={{ color: '#aaa' }}>Loading venues...</p>}
      {error && <p style={{ color: '#e94560' }}>Error: {error}</p>}
      {!loading && venues.length === 0 && (
        <p style={{ color: '#aaa', marginTop: 40, textAlign: 'center' }}>
          No venues yet. Be the first to register one!
        </p>
      )}
      {!loading && <VenueList venues={venues} />}
    </div>
  )
}
