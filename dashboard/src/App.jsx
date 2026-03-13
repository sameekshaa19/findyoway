import React, { useState } from 'react'
import Home from './pages/Home'
import Register from './pages/Register'

export default function App() {
  const [page, setPage] = useState('home')

  return (
    <div className="app">
      <nav className="navbar">
        <span className="logo">🦯 FindYoWay</span>
        <div className="nav-links">
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>Venues</button>
          <button className={page === 'register' ? 'active' : ''} onClick={() => setPage('register')}>Register Venue</button>
        </div>
      </nav>
      <main className="main-content">
        {page === 'home' ? <Home onRegister={() => setPage('register')} /> : <Register onSuccess={() => setPage('home')} />}
      </main>
    </div>
  )
}
