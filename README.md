# FindYoWay 🦯

> AI-powered navigation for the blind and visually impaired.  
> Outdoor GPS • Indoor floor-plan navigation • Live sign reading via Gemini Vision • Obstacle detection • Multilingual voice bot • SOS

---

## Project Structure

```
findyoway/
├── mobile/        # Expo (React Native) — user-facing mobile app
├── backend/       # Python Flask — Gemini API server
├── dashboard/     # React (Vite) — venue registration web dashboard
├── .env.example   # Shared env variables template (copy to .env)
└── .gitignore
```

---

## Quickstart

### 1. Set up environment variables
```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY
```

### 2. Mobile App
```bash
cd mobile
npm install
npx expo start
```

### 3. Flask Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python app.py
```

### 4. Web Dashboard
```bash
cd dashboard
npm install
npm run dev
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 50, React Native, JavaScript |
| Camera | expo-camera |
| Location | expo-location |
| Speech | expo-speech (TTS) + expo-av (recording) |
| Obstacle detection | TensorFlow.js + COCO-SSD |
| AI | Gemini API (text + vision) |
| Offline cache | AsyncStorage |
| Backend | Python + Flask |
| Database | Supabase (PostgreSQL) |
| Dashboard | React + Vite + react-flow |

---

## Team

| Person | Area |
|---|---|
| Person 1 | Navigation + Maps (GPS, Dijkstra, floor plans) |
| Person 2 | Camera + Vision (COCO-SSD, Gemini Vision) |
| Person 3 | Voice Bot + Backend (Flask, Gemini text, SOS) |
| Person 4 | Web Dashboard (venue registration, floor plan editor) |
