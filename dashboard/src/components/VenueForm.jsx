import React, { useState } from 'react'

const FLOOR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function VenueForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', city: '', address: '', floors: 1 })

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!form.name || !form.city) return
    onSubmit(form)
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Venue Name *</label>
          <input name="name" placeholder="e.g. City Hospital Bengaluru" value={form.name} onChange={handle} required />
        </div>
        <div className="form-group">
          <label>City *</label>
          <input name="city" placeholder="e.g. Bengaluru" value={form.city} onChange={handle} required />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input name="address" placeholder="Full street address" value={form.address} onChange={handle} />
        </div>
        <div className="form-group">
          <label>Number of Floors</label>
          <select name="floors" value={form.floors} onChange={handle}>
            {FLOOR_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary">Next: Draw Floor Plan →</button>
      </form>
    </div>
  )
}
