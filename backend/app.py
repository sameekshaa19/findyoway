import os
import base64
import logging
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app with CORS for mobile access
app = Flask(__name__)

# Critical: Configure CORS for Expo mobile app access
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins for development
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"]
    }
})

# Configure Gemini API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY not set. Vision features will not work.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Gemini model
try:
    vision_model = genai.GenerativeModel('gemini-1.5-flash')
    text_model = genai.GenerativeModel('gemini-1.5-flash')
except Exception as e:
    logger.error(f"Failed to initialize Gemini: {e}")
    vision_model = None
    text_model = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for mobile app connectivity testing."""
    return jsonify({
        "status": "healthy",
        "service": "FindYoWay Backend",
        "version": "1.0.0",
        "vision_enabled": vision_model is not None
    }), 200

# ---------------------------------------------------------------------------
# /api/navigate  — spoken navigation queries (used by geminiService.askGemini)
# /chat          — alias kept for backward-compat
# ---------------------------------------------------------------------------
def _chat_logic(message, language="English", context=""):
    if not text_model:
        return f"Navigation assistance for: {message}. (AI model not configured)"
    
    system_prompt = (
        f"You are a helpful indoor/outdoor navigation assistant. "
        f"Reply in {language}. Be concise — the response will be spoken aloud. "
        f"Context: {context}"
    )
    response = text_model.generate_content(f"{system_prompt}\n\nUser: {message}")
    return response.text

@app.route('/api/navigate', methods=['POST'])
def api_navigate():
    """Primary navigation chat endpoint (called by geminiService.js)."""
    try:
        data = request.json or {}
        message  = data.get('message', '')
        language = data.get('language', 'English')
        context  = data.get('context', '')
        if not message:
            return jsonify({"error": "message is required"}), 400
        reply = _chat_logic(message, language, context)
        return jsonify({"reply": reply}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Backward-compatible alias for /api/navigate."""
    try:
        data = request.json or {}
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "message is required"}), 400
        reply = _chat_logic(message)
        return jsonify({"reply": reply}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/stt  — speech-to-text endpoint for VoiceBot component
# ---------------------------------------------------------------------------
@app.route('/api/stt', methods=['POST'])
def api_stt():
    """Speech-to-text endpoint - accepts audio file upload."""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "audio file is required"}), 400
        
        audio_file = request.files['audio']
        language = request.form.get('language', 'English')
        
        # For demo purposes, return a placeholder transcript
        # In production, integrate with Google Cloud STT, Azure, or Whisper
        placeholder_transcripts = {
            'English': 'pharmacy',
            'Hindi': 'फार्मेसी',
            'Spanish': 'farmacia',
            'French': 'pharmacie'
        }
        
        transcript = placeholder_transcripts.get(language, 'pharmacy')
        
        return jsonify({"transcript": transcript}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/vision  — camera frame sign reading (used by geminiService.readSignsFromFrame)
# /read-signs  — alias kept for backward-compat (accepts multipart file upload)
# ---------------------------------------------------------------------------
def _vision_logic(image_bytes, goal="destination", language="English"):
    if not vision_model:
        return "Vision analysis unavailable. Please configure GOOGLE_API_KEY."
    
    img = Image.open(BytesIO(image_bytes))
    prompt = (
        f"You are a navigation assistant for a visually impaired user. "
        f"The user is looking for: '{goal}'. "
        f"Look at the signs in this image and give a short spoken direction in {language}. "
        f"If no useful signs are visible, say 'No signs detected, keep walking slowly.'"
    )
    response = vision_model.generate_content([prompt, img])
    return response.text

@app.route('/api/vision', methods=['POST'])
def api_vision():
    """Primary vision endpoint — accepts base64 JSON (called by geminiService.js)."""
    try:
        data = request.json or {}
        frame_b64 = data.get('frame', '')
        goal      = data.get('goal', 'destination')
        language  = data.get('language', 'English')
        if not frame_b64:
            return jsonify({"error": "frame is required"}), 400
        image_bytes = base64.b64decode(frame_b64)
        guidance = _vision_logic(image_bytes, goal, language)
        return jsonify({"guidance": guidance}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/read-signs', methods=['POST'])
def read_signs():
    """Backward-compatible alias — accepts multipart file upload."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "image file is required"}), 400
        image_bytes = request.files['image'].read()
        guidance = _vision_logic(image_bytes)
        return jsonify({"reply": guidance}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on 0.0.0.0 to allow mobile app access over local network
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting FindYoWay backend on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Vision enabled: {vision_model is not None}")
    
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
