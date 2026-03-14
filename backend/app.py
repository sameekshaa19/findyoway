import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import io
from dotenv import load_dotenv

load_dotenv()  # Loads GEMINI_API_KEY from .env automatically

app = Flask(__name__)
CORS(app)

# Configure Gemini key from environment variable (set in .env or export)
api_key = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
genai.configure(api_key=api_key)

# ---------------------------------------------------------------------------
# /api/navigate  — spoken navigation queries (used by geminiService.askGemini)
# /chat          — alias kept for backward-compat
# ---------------------------------------------------------------------------
def _chat_logic(message, language="English", context=""):
    model = genai.GenerativeModel('gemini-1.5-flash')
    system_prompt = (
        f"You are a helpful indoor/outdoor navigation assistant. "
        f"Reply in {language}. Be concise — the response will be spoken aloud. "
        f"Context: {context}"
    )
    response = model.generate_content(f"{system_prompt}\n\nUser: {message}")
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
# /api/vision  — camera frame sign reading (used by geminiService.readSignsFromFrame)
# /read-signs  — alias kept for backward-compat (accepts multipart file upload)
# ---------------------------------------------------------------------------
def _vision_logic(image_bytes, goal="destination", language="English"):
    img = Image.open(io.BytesIO(image_bytes))
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = (
        f"You are a navigation assistant for a visually impaired user. "
        f"The user is looking for: '{goal}'. "
        f"Look at the signs in this image and give a short spoken direction in {language}. "
        f"If no useful signs are visible, say 'No signs detected, keep walking slowly.'"
    )
    response = model.generate_content([prompt, img])
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
    app.run(host='0.0.0.0', port=5000, debug=True)
