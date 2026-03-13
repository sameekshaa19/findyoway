import React from 'react'

export default function VenueList({ venues }) {
  if (!venues || venues.length === 0) return null

  return (
    <div className="venue-grid">
      {venues.map((v) => (
        <div key={v.id} className="venue-card">
          <div className="venue-name">{v.name}</div>
          <div className="venue-city">📍 {v.city}{v.address ? ` • ${v.address}` : ''}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge">✅ Verified</span>
            <span className="badge" style={{ borderColor: '#0f346055', color: '#aaa', background: 'transparent' }}>
              {v.floors} floor{v.floors > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
